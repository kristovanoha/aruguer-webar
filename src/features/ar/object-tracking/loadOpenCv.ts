import type { OpenCvRuntime } from "./openCvMotionTracker";

let runtimePromise: Promise<OpenCvRuntime> | null = null;

/** Loads the 13 MB OpenCV.js runtime only in a browser route that needs it. */
export function loadOpenCv() {
  if (!runtimePromise) {
    runtimePromise = import("@techstark/opencv-js").then((module) => {
      const imported = module as unknown as { default?: unknown; "module.exports"?: unknown };
      // OpenCV.js exports an actual Promise. Do not pass its export through
      // Promise.resolve(): Turbopack's CJS interop can expose an unbound then.
      const candidate = imported.default instanceof Promise ? imported.default : imported["module.exports"];
      if (!(candidate instanceof Promise)) throw new Error("OpenCV.js nevrátil inicializační Promise.");
      return candidate.then((runtime) => {
        const cv = runtime as OpenCvRuntime;
        if (!cv.Mat || !cv.calcOpticalFlowPyrLK) throw new Error("OpenCV.js se nespustilo správně.");
        return cv;
      });
    });
  }
  return runtimePromise;
}
