import { COCO_CLOCK_CLASS_ID, type DetectionBox, type LetterboxTransform } from "./yolox";

export const YOLO26_INPUT_SIZE = 640;

export function letterboxYolo26Image(image: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
  const canvas = document.createElement("canvas");
  canvas.width = YOLO26_INPUT_SIZE;
  canvas.height = YOLO26_INPUT_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D context is unavailable.");
  const scale = Math.min(YOLO26_INPUT_SIZE / sourceWidth, YOLO26_INPUT_SIZE / sourceHeight);
  const renderedWidth = Math.round(sourceWidth * scale);
  const renderedHeight = Math.round(sourceHeight * scale);
  const padX = Math.floor((YOLO26_INPUT_SIZE - renderedWidth) / 2);
  const padY = Math.floor((YOLO26_INPUT_SIZE - renderedHeight) / 2);
  context.fillStyle = "rgb(114, 114, 114)";
  context.fillRect(0, 0, YOLO26_INPUT_SIZE, YOLO26_INPUT_SIZE);
  context.drawImage(image, 0, 0, sourceWidth, sourceHeight, padX, padY, renderedWidth, renderedHeight);
  const pixels = context.getImageData(0, 0, YOLO26_INPUT_SIZE, YOLO26_INPUT_SIZE).data;
  const planeSize = YOLO26_INPUT_SIZE * YOLO26_INPUT_SIZE;
  const tensor = new Float32Array(planeSize * 3);
  for (let index = 0; index < planeSize; index += 1) {
    const pixelOffset = index * 4;
    // Ultralytics ONNX exports use normalized RGB NCHW input.
    tensor[index] = pixels[pixelOffset] / 255;
    tensor[planeSize + index] = pixels[pixelOffset + 1] / 255;
    tensor[planeSize * 2 + index] = pixels[pixelOffset + 2] / 255;
  }
  return { tensor, transform: { scale, padX, padY, sourceWidth, sourceHeight } satisfies LetterboxTransform };
}

/** Decodes the verified YOLO26n NMS-free output: [1, 300, 6] = xyxy, score, class ID. */
export function decodeYolo26ClockOutput(output: Float32Array, transform: LetterboxTransform, minimumConfidence: number) {
  if (output.length !== 300 * 6) throw new Error(`Neočekávaný výstup YOLO26n: ${output.length} hodnot.`);
  const clocks: DetectionBox[] = [];
  for (let index = 0; index < 300; index += 1) {
    const offset = index * 6;
    const classId = Math.round(output[offset + 5]);
    const score = output[offset + 4];
    if (classId !== COCO_CLOCK_CLASS_ID || score < minimumConfidence) continue;
    const rawX = output[offset];
    const rawY = output[offset + 1];
    const rawRight = output[offset + 2];
    const rawBottom = output[offset + 3];
    const x = Math.max(0, (rawX - transform.padX) / transform.scale);
    const y = Math.max(0, (rawY - transform.padY) / transform.scale);
    const right = Math.min(transform.sourceWidth, (rawRight - transform.padX) / transform.scale);
    const bottom = Math.min(transform.sourceHeight, (rawBottom - transform.padY) / transform.scale);
    if (right <= x || bottom <= y) continue;
    clocks.push({ classId, label: "clock", score, x, y, width: right - x, height: bottom - y, rawX, rawY, rawWidth: rawRight - rawX, rawHeight: rawBottom - rawY });
  }
  return clocks.sort((first, second) => second.score - first.score)[0] ?? null;
}
