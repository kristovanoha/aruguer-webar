export const YOLOX_INPUT_SIZE = 416;
export const COCO_CLOCK_CLASS_ID = 74;

export type DetectionBox = {
  classId: number;
  label: string;
  score: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rawX: number;
  rawY: number;
  rawWidth: number;
  rawHeight: number;
};

export type LetterboxTransform = {
  scale: number;
  padX: number;
  padY: number;
  sourceWidth: number;
  sourceHeight: number;
};

export const COCO_LABELS = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush",
] as const;

export function letterboxImage(
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  inputSize = YOLOX_INPUT_SIZE,
) {
  const canvas = document.createElement("canvas");
  canvas.width = inputSize;
  canvas.height = inputSize;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D context is unavailable.");
  const scale = Math.min(inputSize / sourceWidth, inputSize / sourceHeight);
  const renderedWidth = Math.round(sourceWidth * scale);
  const renderedHeight = Math.round(sourceHeight * scale);
  const padX = Math.floor((inputSize - renderedWidth) / 2);
  const padY = Math.floor((inputSize - renderedHeight) / 2);
  context.fillStyle = "rgb(114, 114, 114)";
  context.fillRect(0, 0, inputSize, inputSize);
  context.drawImage(image, 0, 0, sourceWidth, sourceHeight, padX, padY, renderedWidth, renderedHeight);
  const pixels = context.getImageData(0, 0, inputSize, inputSize).data;
  const planeSize = inputSize * inputSize;
  const tensor = new Float32Array(planeSize * 3);
  for (let index = 0; index < planeSize; index += 1) {
    const pixelOffset = index * 4;
    // YOLOX's OpenCV preprocessing receives BGR pixels and does not normalize them.
    tensor[index] = pixels[pixelOffset + 2];
    tensor[planeSize + index] = pixels[pixelOffset + 1];
    tensor[planeSize * 2 + index] = pixels[pixelOffset];
  }
  return { tensor, transform: { scale, padX, padY, sourceWidth, sourceHeight } satisfies LetterboxTransform };
}

function intersectionOverUnion(a: DetectionBox, b: DetectionBox) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

export function nonMaximumSuppression(boxes: DetectionBox[], iouThreshold = 0.45) {
  const pending = [...boxes].sort((a, b) => b.score - a.score);
  const accepted: DetectionBox[] = [];
  while (pending.length) {
    const candidate = pending.shift();
    if (!candidate) break;
    accepted.push(candidate);
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      if (pending[index].classId === candidate.classId && intersectionOverUnion(candidate, pending[index]) > iouThreshold) pending.splice(index, 1);
    }
  }
  return accepted;
}

export function decodeYoloXOutput(
  output: Float32Array,
  transform: LetterboxTransform,
  minimumConfidence: number,
  inputSize = YOLOX_INPUT_SIZE,
) {
  const boxes: DetectionBox[] = [];
  const strides = [8, 16, 32];
  let predictionIndex = 0;
  for (const stride of strides) {
    const gridSize = inputSize / stride;
    for (let gridY = 0; gridY < gridSize; gridY += 1) {
      for (let gridX = 0; gridX < gridSize; gridX += 1) {
        const offset = predictionIndex * 85;
        const objectness = output[offset + 4];
        let bestClassId = 0;
        let bestClassProbability = 0;
        for (let classId = 0; classId < 80; classId += 1) {
          const probability = output[offset + 5 + classId];
          if (probability > bestClassProbability) {
            bestClassProbability = probability;
            bestClassId = classId;
          }
        }
        const score = objectness * bestClassProbability;
        if (score >= minimumConfidence) {
          const centerX = (output[offset] + gridX) * stride;
          const centerY = (output[offset + 1] + gridY) * stride;
          const rawWidth = Math.exp(Math.min(output[offset + 2], 10)) * stride;
          const rawHeight = Math.exp(Math.min(output[offset + 3], 10)) * stride;
          const rawX = centerX - rawWidth / 2;
          const rawY = centerY - rawHeight / 2;
          const x = Math.max(0, (rawX - transform.padX) / transform.scale);
          const y = Math.max(0, (rawY - transform.padY) / transform.scale);
          const right = Math.min(transform.sourceWidth, (rawX + rawWidth - transform.padX) / transform.scale);
          const bottom = Math.min(transform.sourceHeight, (rawY + rawHeight - transform.padY) / transform.scale);
          if (right > x && bottom > y) boxes.push({ classId: bestClassId, label: COCO_LABELS[bestClassId], score, x, y, width: right - x, height: bottom - y, rawX, rawY, rawWidth, rawHeight });
        }
        predictionIndex += 1;
      }
    }
  }
  return nonMaximumSuppression(boxes);
}
