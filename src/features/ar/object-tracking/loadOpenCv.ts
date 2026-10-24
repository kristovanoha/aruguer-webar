import type { OpenCvRuntime } from "./openCvMotionTracker";

const OPEN_CV_SCRIPT = "/vendor/opencv-5.0.0-release.1.js";

let runtimePromise: Promise<OpenCvRuntime> | null = null;

function asRuntime(value: unknown) {
  const runtime = value as OpenCvRuntime;
  if (!runtime.Mat || !runtime.calcOpticalFlowPyrLK) throw new Error("OpenCV.js se nespustilo správně.");
  return runtime;
}

/**
 * Loads OpenCV as a classic, versioned browser script. This intentionally
 * bypasses Turbopack's CJS interop, which breaks the Promise export in Brave.
 */
export function loadOpenCv() {
  if (!runtimePromise) {
    runtimePromise = new Promise<OpenCvRuntime>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${OPEN_CV_SCRIPT}"]`);
      const finish = () => {
        const candidate = (window as Window & { cv?: unknown }).cv;
        if (candidate instanceof Promise) {
          candidate.then((runtime) => resolve(asRuntime(runtime)), reject);
          return;
        }
        try {
          resolve(asRuntime(candidate));
        } catch (error) {
          reject(error);
        }
      };
      if (existing) {
        finish();
        return;
      }
      const script = document.createElement("script");
      script.src = OPEN_CV_SCRIPT;
      script.async = true;
      script.onload = finish;
      script.onerror = () => reject(new Error("Lokální OpenCV.js se nepodařilo načíst."));
      document.head.append(script);
    });
  }
  return runtimePromise;
}
