import type { DetectionBox } from "./yolox";
import type { MotionTrackingResult } from "./yoloxMotionTracker";

type CvMat = {
  cols: number;
  data: Uint8Array;
  data32F: Float32Array;
  data64F: Float64Array;
  delete(): void;
  empty(): boolean;
  roi(rectangle: unknown): CvMat;
};

export type OpenCvRuntime = {
  COLOR_RGBA2GRAY: number;
  CV_32FC2: number;
  RANSAC: number;
  TERM_CRITERIA_COUNT: number;
  TERM_CRITERIA_EPS: number;
  Mat: new () => CvMat;
  Rect: new (x: number, y: number, width: number, height: number) => unknown;
  Size: new (width: number, height: number) => unknown;
  TermCriteria: new (type: number, maxCount: number, epsilon: number) => unknown;
  cvtColor(source: CvMat, destination: CvMat, code: number): void;
  goodFeaturesToTrack(source: CvMat, corners: CvMat, maxCorners: number, qualityLevel: number, minDistance: number): void;
  calcOpticalFlowPyrLK(previous: CvMat, next: CvMat, previousPoints: CvMat, nextPoints: CvMat, status: CvMat, error: CvMat, windowSize: unknown, maxLevel: number, criteria: unknown): void;
  estimateAffinePartial2D(source: CvMat, destination: CvMat, inliers: CvMat, method: number, threshold: number): CvMat;
  imread(source: HTMLCanvasElement): CvMat;
  matFromArray(rows: number, columns: number, type: number, values: Float32Array): CvMat;
};

type Frame = { gray: CvMat; height: number; width: number };

const MAX_FRAME_WIDTH = 480;
const MINIMUM_POINTS = 3;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Optical-flow tracker used only between detector inferences. YOLOX remains
 * the authority for object class and periodically corrects its position.
 */
export class OpenCvMotionTracker {
  private box: DetectionBox | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private previousGray: CvMat | null = null;
  private previousPoints: CvMat | null = null;
  private frameHeight = 0;
  private frameWidth = 0;
  private updatesSinceReseed = 0;

  constructor(private readonly cv: OpenCvRuntime) {}

  get currentBox() {
    return this.box;
  }

  get isActive() {
    return this.box !== null && this.previousGray !== null && this.previousPoints !== null;
  }

  reset() {
    this.box = null;
    this.previousGray?.delete();
    this.previousPoints?.delete();
    this.previousGray = null;
    this.previousPoints = null;
    this.updatesSinceReseed = 0;
  }

  initialize(video: HTMLVideoElement, sourceWidth: number, sourceHeight: number, box: DetectionBox) {
    this.reset();
    const frame = this.captureFrame(video, sourceWidth, sourceHeight);
    if (!frame) return;
    const points = this.findFeatures(frame.gray, box, sourceWidth, sourceHeight, frame.width, frame.height);
    if (!points) {
      frame.gray.delete();
      return;
    }
    this.box = box;
    this.previousGray = frame.gray;
    this.previousPoints = points;
    this.frameWidth = frame.width;
    this.frameHeight = frame.height;
  }

  update(video: HTMLVideoElement, sourceWidth: number, sourceHeight: number): MotionTrackingResult | null {
    if (!this.box || !this.previousGray || !this.previousPoints) return null;
    const frame = this.captureFrame(video, sourceWidth, sourceHeight);
    if (!frame || frame.width !== this.frameWidth || frame.height !== this.frameHeight) {
      frame?.gray.delete();
      this.reset();
      return null;
    }

    const nextPoints = new this.cv.Mat();
    const status = new this.cv.Mat();
    const error = new this.cv.Mat();
    try {
      this.cv.calcOpticalFlowPyrLK(
        this.previousGray,
        frame.gray,
        this.previousPoints,
        nextPoints,
        status,
        error,
        new this.cv.Size(21, 21),
        3,
        new this.cv.TermCriteria(this.cv.TERM_CRITERIA_COUNT + this.cv.TERM_CRITERIA_EPS, 20, 0.03),
      );
      const matched = this.collectMatches(this.previousPoints, nextPoints, status, error);
      if (matched.count < MINIMUM_POINTS) {
        frame.gray.delete();
        this.reset();
        return null;
      }
      const nextBox = this.estimateNextBox(this.box, matched, sourceWidth, sourceHeight);
      const quality = clamp(matched.count / Math.max(1, Math.floor(this.previousPoints.data32F.length / 2)), 0, 1);
      if (!nextBox || quality < 0.2) {
        frame.gray.delete();
        this.reset();
        return null;
      }

      this.previousGray.delete();
      this.previousPoints.delete();
      this.previousGray = frame.gray;
      this.previousPoints = this.cv.matFromArray(matched.count, 1, this.cv.CV_32FC2, matched.newPoints);
      this.box = nextBox;
      this.updatesSinceReseed += 1;
      if (this.updatesSinceReseed >= 12 || matched.count < 12) this.reseed(nextBox, sourceWidth, sourceHeight);
      return { box: nextBox, quality };
    } finally {
      nextPoints.delete();
      status.delete();
      error.delete();
    }
  }

  private captureFrame(video: HTMLVideoElement, sourceWidth: number, sourceHeight: number): Frame | null {
    const width = Math.min(MAX_FRAME_WIDTH, sourceWidth);
    const height = Math.max(1, Math.round(sourceHeight * (width / sourceWidth)));
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.context = this.canvas.getContext("2d", { willReadFrequently: true });
    }
    if (!this.context || !this.canvas) return null;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.context.drawImage(video, 0, 0, width, height);
    const rgba = this.cv.imread(this.canvas);
    const gray = new this.cv.Mat();
    this.cv.cvtColor(rgba, gray, this.cv.COLOR_RGBA2GRAY);
    rgba.delete();
    return { gray, width, height };
  }

  private findFeatures(gray: CvMat, box: DetectionBox, sourceWidth: number, sourceHeight: number, frameWidth: number, frameHeight: number) {
    const scaleX = frameWidth / sourceWidth;
    const scaleY = frameHeight / sourceHeight;
    const x = clamp(Math.floor(box.x * scaleX), 0, frameWidth - 1);
    const y = clamp(Math.floor(box.y * scaleY), 0, frameHeight - 1);
    const width = clamp(Math.ceil(box.width * scaleX), 1, frameWidth - x);
    const height = clamp(Math.ceil(box.height * scaleY), 1, frameHeight - y);
    if (width < 12 || height < 12) return null;
    const roi = gray.roi(new this.cv.Rect(x, y, width, height));
    const corners = new this.cv.Mat();
    try {
      this.cv.goodFeaturesToTrack(roi, corners, 64, 0.003, 3);
      if (corners.data32F.length < MINIMUM_POINTS * 2) return null;
      const points = new Float32Array(corners.data32F.length);
      for (let index = 0; index < corners.data32F.length; index += 2) {
        points[index] = corners.data32F[index] + x;
        points[index + 1] = corners.data32F[index + 1] + y;
      }
      return this.cv.matFromArray(points.length / 2, 1, this.cv.CV_32FC2, points);
    } finally {
      roi.delete();
      corners.delete();
    }
  }

  private collectMatches(previous: CvMat, next: CvMat, status: CvMat, error: CvMat) {
    const oldValues: number[] = [];
    const newValues: number[] = [];
    const count = Math.min(status.data.length, Math.floor(previous.data32F.length / 2), Math.floor(next.data32F.length / 2));
    for (let index = 0; index < count; index += 1) {
      if (status.data[index] === 0 || (error.data32F[index] ?? Number.POSITIVE_INFINITY) > 45) continue;
      oldValues.push(previous.data32F[index * 2], previous.data32F[index * 2 + 1]);
      newValues.push(next.data32F[index * 2], next.data32F[index * 2 + 1]);
    }
    return { count: oldValues.length / 2, oldPoints: new Float32Array(oldValues), newPoints: new Float32Array(newValues) };
  }

  private estimateNextBox(box: DetectionBox, matched: { count: number; oldPoints: Float32Array; newPoints: Float32Array }, sourceWidth: number, sourceHeight: number) {
    const oldPoints = this.cv.matFromArray(matched.count, 1, this.cv.CV_32FC2, matched.oldPoints);
    const newPoints = this.cv.matFromArray(matched.count, 1, this.cv.CV_32FC2, matched.newPoints);
    const inliers = new this.cv.Mat();
    let affine: CvMat | null = null;
    try {
      affine = this.cv.estimateAffinePartial2D(oldPoints, newPoints, inliers, this.cv.RANSAC, 4);
      if (!affine.empty() && affine.data64F.length >= 6) {
        const transformed = this.transformBox(box, affine.data64F, sourceWidth, sourceHeight);
        if (transformed) return transformed;
      }
      return this.translateBoxByMedianFlow(box, matched, sourceWidth, sourceHeight);
    } catch {
      return this.translateBoxByMedianFlow(box, matched, sourceWidth, sourceHeight);
    } finally {
      oldPoints.delete();
      newPoints.delete();
      affine?.delete();
      inliers.delete();
    }
  }

  private translateBoxByMedianFlow(box: DetectionBox, matched: { count: number; oldPoints: Float32Array; newPoints: Float32Array }, sourceWidth: number, sourceHeight: number) {
    const deltaX: number[] = [];
    const deltaY: number[] = [];
    for (let index = 0; index < matched.count; index += 1) {
      deltaX.push(matched.newPoints[index * 2] - matched.oldPoints[index * 2]);
      deltaY.push(matched.newPoints[index * 2 + 1] - matched.oldPoints[index * 2 + 1]);
    }
    const median = (values: number[]) => {
      const sorted = [...values].sort((first, second) => first - second);
      return sorted[Math.floor(sorted.length / 2)] ?? 0;
    };
    const moveX = median(deltaX) * sourceWidth / this.frameWidth;
    const moveY = median(deltaY) * sourceHeight / this.frameHeight;
    const x = clamp(box.x + moveX, 0, sourceWidth - box.width);
    const y = clamp(box.y + moveY, 0, sourceHeight - box.height);
    return { ...box, x, y };
  }

  private transformBox(box: DetectionBox, affine: Float64Array, sourceWidth: number, sourceHeight: number) {
    const scaleX = this.frameWidth / sourceWidth;
    const scaleY = this.frameHeight / sourceHeight;
    const corners = [[box.x * scaleX, box.y * scaleY], [(box.x + box.width) * scaleX, box.y * scaleY], [box.x * scaleX, (box.y + box.height) * scaleY], [(box.x + box.width) * scaleX, (box.y + box.height) * scaleY]];
    const transformed = corners.map(([x, y]) => [affine[0] * x + affine[1] * y + affine[2], affine[3] * x + affine[4] * y + affine[5]]);
    const xs = transformed.map(([x]) => x / scaleX);
    const ys = transformed.map(([, y]) => y / scaleY);
    const left = clamp(Math.min(...xs), 0, sourceWidth);
    const top = clamp(Math.min(...ys), 0, sourceHeight);
    const right = clamp(Math.max(...xs), 0, sourceWidth);
    const bottom = clamp(Math.max(...ys), 0, sourceHeight);
    if (right - left < 12 || bottom - top < 12) return null;
    return { ...box, x: left, y: top, width: right - left, height: bottom - top };
  }

  private reseed(box: DetectionBox, sourceWidth: number, sourceHeight: number) {
    if (!this.previousGray) return;
    const points = this.findFeatures(this.previousGray, box, sourceWidth, sourceHeight, this.frameWidth, this.frameHeight);
    if (!points) return;
    this.previousPoints?.delete();
    this.previousPoints = points;
    this.updatesSinceReseed = 0;
  }
}
