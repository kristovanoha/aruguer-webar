import type { DetectionBox } from "./yolox";

type Frame = {
  data: Uint8ClampedArray;
  height: number;
  sourceHeight: number;
  sourceWidth: number;
  width: number;
};

export type MotionTrackingResult = {
  box: DetectionBox;
  quality: number;
};

const templateSize = 12;
const minimumQuality = 0.7;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Tracks the visual detail inside a detector box between the more expensive
 * YOLOX inferences. The detector always remains the source of truth.
 */
export class YoloXMotionTracker {
  private box: DetectionBox | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private failures = 0;
  private template: Float32Array | null = null;

  get currentBox() {
    return this.box;
  }

  get isActive() {
    return this.box !== null && this.template !== null;
  }

  reset() {
    this.box = null;
    this.template = null;
    this.failures = 0;
  }

  initialize(video: HTMLVideoElement, sourceWidth: number, sourceHeight: number, box: DetectionBox) {
    const frame = this.captureFrame(video, sourceWidth, sourceHeight);
    if (!frame) return this.reset();
    const scaleX = frame.width / sourceWidth;
    const scaleY = frame.height / sourceHeight;
    const template = this.sample(
      frame,
      box.x * scaleX,
      box.y * scaleY,
      box.width * scaleX,
      box.height * scaleY,
    );
    if (!template) return this.reset();
    this.box = box;
    this.template = template;
    this.failures = 0;
  }

  update(video: HTMLVideoElement, sourceWidth: number, sourceHeight: number): MotionTrackingResult | null {
    if (!this.box || !this.template) return null;
    const frame = this.captureFrame(video, sourceWidth, sourceHeight);
    if (!frame) return null;

    const scaleX = frame.width / frame.sourceWidth;
    const scaleY = frame.height / frame.sourceHeight;
    const previous = this.box;
    const previousWidth = previous.width * scaleX;
    const previousHeight = previous.height * scaleY;
    const previousX = previous.x * scaleX;
    const previousY = previous.y * scaleY;
    const searchRadius = clamp(Math.round(Math.max(previousWidth, previousHeight) * 0.11), 3, 7);
    const scales = [0.93, 1, 1.07];
    let best: { values: Float32Array; quality: number; x: number; y: number; width: number; height: number } | null = null;

    for (const scale of scales) {
      const width = previousWidth * scale;
      const height = previousHeight * scale;
      for (let offsetY = -searchRadius; offsetY <= searchRadius; offsetY += 1) {
        for (let offsetX = -searchRadius; offsetX <= searchRadius; offsetX += 1) {
          const values = this.sample(frame, previousX + offsetX, previousY + offsetY, width, height);
          if (!values) continue;
          const quality = this.correlation(this.template, values);
          if (!best || quality > best.quality) {
            best = { values, quality, x: previousX + offsetX, y: previousY + offsetY, width, height };
          }
        }
      }
    }

    if (!best || best.quality < minimumQuality) {
      this.failures += 1;
      if (this.failures >= 4) this.reset();
      return null;
    }

    this.failures = 0;
    this.template = this.blendTemplate(this.template, best.values, best.quality);
    const x = clamp(best.x / scaleX, 0, sourceWidth);
    const y = clamp(best.y / scaleY, 0, sourceHeight);
    const right = clamp((best.x + best.width) / scaleX, 0, sourceWidth);
    const bottom = clamp((best.y + best.height) / scaleY, 0, sourceHeight);
    if (right <= x || bottom <= y) return null;

    this.box = {
      ...previous,
      x,
      y,
      width: right - x,
      height: bottom - y,
    };
    return { box: this.box, quality: best.quality };
  }

  private captureFrame(video: HTMLVideoElement, sourceWidth: number, sourceHeight: number): Frame | null {
    const maxWidth = 256;
    const width = Math.min(maxWidth, sourceWidth);
    const height = Math.max(1, Math.round(sourceHeight * (width / sourceWidth)));
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.context = this.canvas.getContext("2d", { willReadFrequently: true });
    }
    if (!this.context) return null;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.context.drawImage(video, 0, 0, width, height);
    return {
      data: this.context.getImageData(0, 0, width, height).data,
      width,
      height,
      sourceWidth,
      sourceHeight,
    };
  }

  private sample(frame: Frame, sourceX: number, sourceY: number, sourceWidth: number, sourceHeight: number) {
    if (sourceWidth < 3 || sourceHeight < 3) return null;
    const result = new Float32Array(templateSize * templateSize);
    for (let row = 0; row < templateSize; row += 1) {
      const y = Math.round(sourceY + ((row + 0.5) / templateSize) * sourceHeight);
      if (y < 0 || y >= frame.height) return null;
      for (let column = 0; column < templateSize; column += 1) {
        const x = Math.round(sourceX + ((column + 0.5) / templateSize) * sourceWidth);
        if (x < 0 || x >= frame.width) return null;
        const offset = (y * frame.width + x) * 4;
        result[row * templateSize + column] = (frame.data[offset] * 77 + frame.data[offset + 1] * 150 + frame.data[offset + 2] * 29) / 256;
      }
    }
    return result;
  }

  private correlation(template: Float32Array, sample: Float32Array) {
    let templateMean = 0;
    let sampleMean = 0;
    for (let index = 0; index < template.length; index += 1) {
      templateMean += template[index];
      sampleMean += sample[index];
    }
    templateMean /= template.length;
    sampleMean /= sample.length;
    let covariance = 0;
    let templateVariance = 0;
    let sampleVariance = 0;
    for (let index = 0; index < template.length; index += 1) {
      const templateValue = template[index] - templateMean;
      const sampleValue = sample[index] - sampleMean;
      covariance += templateValue * sampleValue;
      templateVariance += templateValue ** 2;
      sampleVariance += sampleValue ** 2;
    }
    return covariance / Math.sqrt(templateVariance * sampleVariance + 0.0001);
  }

  private blendTemplate(template: Float32Array, sample: Float32Array, quality: number) {
    const blend = quality > 0.87 ? 0.16 : 0.06;
    const next = new Float32Array(template.length);
    for (let index = 0; index < template.length; index += 1) {
      next[index] = template[index] * (1 - blend) + sample[index] * blend;
    }
    return next;
  }
}
