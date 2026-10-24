import type { OpenCvRuntime } from "./openCvMotionTracker";

let runtimePromise: Promise<OpenCvRuntime> | null = null;

/** Loads the 13 MB OpenCV.js runtime only in a browser route that needs it. */
export function loadOpenCv() {
  if (!runtimePromise) {
    runtimePromise = import("@techstark/opencv-js").then(async (module) => {
      const candidate = (module as unknown as { default?: unknown }).default ?? module;
      const runtime = await Promise.resolve(candidate) as OpenCvRuntime;
      if (!runtime.Mat || !runtime.calcOpticalFlowPyrLK) throw new Error("OpenCV.js se nespustilo správně.");
      return runtime;
    });
  }
  return runtimePromise;
}
