"use client";
/* eslint-disable @next/next/no-img-element -- Object URLs and dynamically positioned diagnostic overlays require native img elements. */

import { useCallback, useEffect, useRef, useState } from "react";
import type * as Ort from "onnxruntime-web";
import { COCO_CLOCK_CLASS_ID, type DetectionBox, decodeYoloXOutput, letterboxImage, YOLOX_INPUT_SIZE } from "./yolox";
import { loadOpenCv } from "./loadOpenCv";
import { OpenCvMotionTracker, type OpenCvRuntime } from "./openCvMotionTracker";
import { YoloXMotionTracker, type MotionTrackingResult } from "./yoloxMotionTracker";

type CameraState = "idle" | "starting" | "running" | "error";
type ModelState = "idle" | "loading" | "ready" | "error";
type SourceInfo = { width: number; height: number };
type ManualSelection = { endX: number; endY: number; startX: number; startY: number };

const MODEL_PATH = "/models/ai/yolox_nano.onnx";
const OVERLAY_PATH = "/ar/overlays/clock-overlay.png";

type YoloXClockDetectionDemoProps = {
  inputSize?: number;
  modelName?: string;
  modelPath?: string;
  motionTracking?: boolean;
  trackingMode?: "correlation" | "opencv";
  showPhotoTest?: boolean;
};

type MotionTracker = {
  currentBox: DetectionBox | null;
  isActive: boolean;
  initialize(video: HTMLVideoElement, sourceWidth: number, sourceHeight: number, box: DetectionBox): void;
  reset(): void;
  update(video: HTMLVideoElement, sourceWidth: number, sourceHeight: number): MotionTrackingResult | null;
};

function coverBox(box: DetectionBox, source: SourceInfo, viewport: SourceInfo) {
  const scale = Math.max(viewport.width / source.width, viewport.height / source.height);
  const renderedWidth = source.width * scale;
  const renderedHeight = source.height * scale;
  const offsetX = (viewport.width - renderedWidth) / 2;
  const offsetY = (viewport.height - renderedHeight) / 2;
  return { left: offsetX + box.x * scale, top: offsetY + box.y * scale, width: box.width * scale, height: box.height * scale };
}

function getPointerSourcePosition(event: React.PointerEvent<HTMLDivElement>, source: SourceInfo) {
  const bounds = event.currentTarget.getBoundingClientRect();
  const scale = Math.max(bounds.width / source.width, bounds.height / source.height);
  const renderedWidth = source.width * scale;
  const renderedHeight = source.height * scale;
  const offsetX = (bounds.width - renderedWidth) / 2;
  const offsetY = (bounds.height - renderedHeight) / 2;
  return {
    x: Math.max(0, Math.min(source.width, (event.clientX - bounds.left - offsetX) / scale)),
    y: Math.max(0, Math.min(source.height, (event.clientY - bounds.top - offsetY) / scale)),
  };
}

function createManualClock(selection: ManualSelection): DetectionBox | null {
  const x = Math.min(selection.startX, selection.endX);
  const y = Math.min(selection.startY, selection.endY);
  const width = Math.abs(selection.endX - selection.startX);
  const height = Math.abs(selection.endY - selection.startY);
  if (width < 24 || height < 24) return null;
  return { classId: COCO_CLOCK_CLASS_ID, label: "clock", score: 1, x, y, width, height, rawX: x, rawY: y, rawWidth: width, rawHeight: height };
}

function topDetections(detections: DetectionBox[]) {
  return [...detections].sort((a, b) => b.score - a.score).slice(0, 5);
}

export default function YoloXClockDetectionDemo({
  inputSize = YOLOX_INPUT_SIZE,
  modelName = "YOLOX Nano",
  modelPath = MODEL_PATH,
  motionTracking = false,
  trackingMode = "correlation",
  showPhotoTest = true,
}: YoloXClockDetectionDemoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraHostRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<Ort.InferenceSession | null>(null);
  const ortRef = useRef<typeof Ort | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inferenceBusyRef = useRef(false);
  const runningRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const smoothedClockRef = useRef<DetectionBox | null>(null);
  const runCameraDetectionRef = useRef<() => void>(() => undefined);
  const motionTrackerRef = useRef<MotionTracker | null>(motionTracking && trackingMode === "correlation" ? new YoloXMotionTracker() : null);
  const openCvRef = useRef<OpenCvRuntime | null>(null);
  const motionTrackingFrameRef = useRef<number | null>(null);
  const lastMotionTrackingAtRef = useRef(0);
  const lastMotionTrackingVideoTimeRef = useRef(-1);

  const [modelState, setModelState] = useState<ModelState>("idle");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [backend, setBackend] = useState("WASM (výchozí)");
  const [message, setMessage] = useState("Nejprve nahrajte fotografii hodin nebo spusťte kameru.");
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0.25);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [manualOverlay, setManualOverlay] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoSource, setPhotoSource] = useState<SourceInfo | null>(null);
  const [photoDetections, setPhotoDetections] = useState<DetectionBox[]>([]);
  const [cameraDetections, setCameraDetections] = useState<DetectionBox[]>([]);
  const [cameraSource, setCameraSource] = useState<SourceInfo | null>(null);
  const [cameraViewport, setCameraViewport] = useState<SourceInfo>({ width: 0, height: 0 });
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [lastRawBox, setLastRawBox] = useState<DetectionBox | null>(null);
  const [motionTrackingQuality, setMotionTrackingQuality] = useState<number | null>(null);
  const [motionTrackingUpdates, setMotionTrackingUpdates] = useState(0);
  const [manualSelection, setManualSelection] = useState<ManualSelection | null>(null);
  const [manualSelectionMode, setManualSelectionMode] = useState(false);

  const createMotionTracker = useCallback((): MotionTracker | null => {
    if (trackingMode === "opencv") return openCvRef.current ? new OpenCvMotionTracker(openCvRef.current) : null;
    return new YoloXMotionTracker();
  }, [trackingMode]);

  const loadModel = useCallback(async () => {
    if (sessionRef.current && ortRef.current) return { session: sessionRef.current, ort: ortRef.current };
    setModelState("loading");
    setError(null);
    try {
      const ort = await import("onnxruntime-web");
      ort.env.wasm.numThreads = 1;
      const session = await ort.InferenceSession.create(modelPath, { executionProviders: ["wasm"] });
      sessionRef.current = session;
      ortRef.current = ort;
      setBackend("WASM");
      setModelState("ready");
      return { session, ort };
    } catch (loadError) {
      setModelState("error");
      const text = loadError instanceof Error ? loadError.message : "neznámá chyba";
      setError(`ONNX Runtime nebo model se nepodařilo načíst: ${text}`);
      throw loadError;
    }
  }, [modelPath]);

  const runInference = useCallback(async (source: CanvasImageSource, dimensions: SourceInfo) => {
    const { session, ort } = await loadModel();
    const { tensor, transform } = letterboxImage(source, dimensions.width, dimensions.height, inputSize);
    const startedAt = performance.now();
    let output: Record<string, Ort.Tensor>;
    try {
      output = await session.run({ images: new ort.Tensor("float32", tensor, [1, 3, inputSize, inputSize]) });
    } catch (runError) {
      const text = runError instanceof Error ? runError.message : String(runError);
      if (/invalid session id/i.test(text)) {
        if (sessionRef.current === session) {
          sessionRef.current = null;
          ortRef.current = null;
          setModelState("idle");
        }
        void session.release().catch(() => undefined);
        throw new Error("ONNX relace byla zneplatněna. Model se při dalším snímku automaticky načte znovu.");
      }
      throw runError;
    }
    const elapsed = performance.now() - startedAt;
    const result = output.output;
    const predictionCount = [8, 16, 32].reduce((total, stride) => total + (inputSize / stride) ** 2, 0);
    if (!(result.data instanceof Float32Array) || result.data.length !== predictionCount * 85) throw new Error(`Neočekávaný výstup ${modelName}: ${result.data.length} hodnot.`);
    const detections = decodeYoloXOutput(result.data, transform, confidence, inputSize);
    setInferenceMs(elapsed);
    setLastRawBox(detections[0] ?? null);
    return detections;
  }, [confidence, inputSize, loadModel, modelName]);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    inferenceBusyRef.current = false;
    if (motionTrackingFrameRef.current !== null) cancelAnimationFrame(motionTrackingFrameRef.current);
    motionTrackingFrameRef.current = null;
    motionTrackerRef.current?.reset();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setCameraState("idle");
    setCameraDetections([]);
    setMotionTrackingQuality(null);
    setMotionTrackingUpdates(0);
    setManualSelection(null);
    setManualSelectionMode(false);
    smoothedClockRef.current = null;
  }, []);

  const runCameraDetection = useCallback(async () => {
    const video = videoRef.current;
    if (!runningRef.current || !video) return;
    if (inferenceBusyRef.current || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.currentTime === lastVideoTimeRef.current) {
      timerRef.current = setTimeout(() => runCameraDetectionRef.current(), 220);
      return;
    }
    inferenceBusyRef.current = true;
    try {
      const dimensions = { width: video.videoWidth, height: video.videoHeight };
      const detections = await runInference(video, dimensions);
      setError(null);
      lastVideoTimeRef.current = video.currentTime;
      const clock = detections.filter((item) => item.classId === COCO_CLOCK_CLASS_ID).sort((a, b) => b.score - a.score)[0] ?? null;
      if (clock) {
        const previous = smoothedClockRef.current;
        const smoothed = previous ? { ...clock, x: previous.x + (clock.x - previous.x) * 0.35, y: previous.y + (clock.y - previous.y) * 0.35, width: previous.width + (clock.width - previous.width) * 0.35, height: previous.height + (clock.height - previous.height) * 0.35 } : clock;
        smoothedClockRef.current = smoothed;
        if (motionTracking) {
          if (!motionTrackerRef.current) motionTrackerRef.current = createMotionTracker();
          if (motionTrackerRef.current) {
            motionTrackerRef.current.initialize(video, dimensions.width, dimensions.height, smoothed);
            setMotionTrackingQuality(1);
          }
        }
        setCameraDetections([smoothed, ...detections.filter((item) => item.classId !== COCO_CLOCK_CLASS_ID)]);
      } else {
        const trackedClock = motionTracking ? motionTrackerRef.current?.currentBox ?? null : null;
        smoothedClockRef.current = trackedClock;
        setCameraDetections(trackedClock ? [trackedClock, ...detections.filter((item) => item.classId !== COCO_CLOCK_CLASS_ID)] : detections);
      }
      setCameraSource(dimensions);
    } catch (inferenceError) {
      setError(inferenceError instanceof Error ? inferenceError.message : "Inference z kamery selhala.");
    } finally {
      inferenceBusyRef.current = false;
      if (runningRef.current) timerRef.current = setTimeout(() => runCameraDetectionRef.current(), Math.max(200, (inferenceMs ?? 0) * 1.25));
    }
  }, [createMotionTracker, inferenceMs, motionTracking, runInference]);

  useEffect(() => {
    runCameraDetectionRef.current = () => void runCameraDetection();
  }, [runCameraDetection]);

  const startMotionTracking = useCallback(() => {
    if (!motionTracking) return;
    const update = () => {
      const video = videoRef.current;
      if (!runningRef.current || !video) return;
      const now = performance.now();
      if (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.currentTime !== lastMotionTrackingVideoTimeRef.current &&
        now - lastMotionTrackingAtRef.current >= 45
      ) {
        lastMotionTrackingVideoTimeRef.current = video.currentTime;
        lastMotionTrackingAtRef.current = now;
        try {
          const result = motionTrackerRef.current?.update(video, video.videoWidth, video.videoHeight);
          if (result) {
            smoothedClockRef.current = result.box;
            setCameraDetections((detections) => [result.box, ...detections.filter((item) => item.classId !== COCO_CLOCK_CLASS_ID)]);
            setMotionTrackingQuality(result.quality);
            setMotionTrackingUpdates((count) => count + 1);
          } else if (!motionTrackerRef.current?.isActive) {
            setMotionTrackingQuality(null);
          }
        } catch (trackingError) {
          motionTrackerRef.current?.reset();
          setMotionTrackingQuality(null);
          setError(`OpenCV tracker selhal: ${trackingError instanceof Error ? trackingError.message : "neznámá chyba"}`);
        }
      }
      motionTrackingFrameRef.current = requestAnimationFrame(update);
    };
    motionTrackingFrameRef.current = requestAnimationFrame(update);
  }, [motionTracking]);

  const finishManualSelection = useCallback((selection: ManualSelection) => {
    const video = videoRef.current;
    const source = cameraSource;
    const manualClock = createManualClock(selection);
    setManualSelection(null);
    setManualSelectionMode(false);
    if (!video || !source || !manualClock) {
      setMessage("Označení je příliš malé. Obtáhněte celé hodiny větším rámečkem.");
      return;
    }
    if (!motionTrackerRef.current) motionTrackerRef.current = createMotionTracker();
    if (!motionTrackerRef.current) {
      setMessage("OpenCV se ještě nenačetlo. Zastavte a znovu spusťte kameru.");
      return;
    }
    motionTrackerRef.current.initialize(video, source.width, source.height, manualClock);
    smoothedClockRef.current = manualClock;
    setCameraDetections((detections) => [manualClock, ...detections.filter((item) => item.classId !== COCO_CLOCK_CLASS_ID)]);
    setMotionTrackingQuality(motionTrackerRef.current.isActive ? 1 : null);
    setMessage(motionTrackerRef.current.isActive ? "Hodiny byly označené ručně. Tracker nyní sleduje obraz uvnitř rámečku." : "Tracker se z označené oblasti nepodařilo inicializovat. Zkuste rámeček obtáhnout znovu.");
  }, [cameraSource, createMotionTracker]);

  const startCamera = async () => {
    if (cameraState === "starting" || cameraState === "running") return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setError("Kamera vyžaduje HTTPS nebo localhost a MediaDevices API.");
      return;
    }
    setCameraState("starting");
    setError(null);
    try {
      if (motionTracking && trackingMode === "opencv") {
        setMessage("Načítám OpenCV pro optický tok…");
        openCvRef.current = await loadOpenCv();
        motionTrackerRef.current = new OpenCvMotionTracker(openCvRef.current);
      }
      await loadModel();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      const video = videoRef.current;
      if (!video) throw new Error("Video element není dostupný.");
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      runningRef.current = true;
      setCameraState("running");
      setMessage(`Kamera běží. ${modelName} analyzuje nové snímky bez překrývání inferencí.${motionTracking && trackingMode === "opencv" ? " OpenCV sleduje body mezi AI detekcemi." : ""}`);
      startMotionTracking();
      void runCameraDetection();
    } catch (cameraError) {
      stopCamera();
      setCameraState("error");
      setError(cameraError instanceof DOMException && cameraError.name === "NotAllowedError" ? "Přístup ke kameře byl zamítnut." : cameraError instanceof Error ? cameraError.message : "Kameru se nepodařilo spustit.");
    }
  };

  const selectPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoSource(null);
    setPhotoDetections([]);
    setManualOverlay(false);
    setMessage("Fotografie je připravená. Klikněte na „Spustit test fotografie“.");
  };

  const testPhoto = async () => {
    const image = document.querySelector<HTMLImageElement>("#yolox-photo-preview");
    if (!image || !image.naturalWidth || !image.naturalHeight) return;
    setError(null);
    try {
      const source = { width: image.naturalWidth, height: image.naturalHeight };
      const detections = await runInference(image, source);
      setPhotoSource(source);
      setPhotoDetections(detections);
      const hasClock = detections.some((item) => item.classId === COCO_CLOCK_CLASS_ID);
      setMessage(hasClock ? `${modelName} rozpoznal kategorii clock.` : `${modelName} dokončil inferenci, ale kategorii clock nenašel. Zkontrolujte všechny rámečky a confidence.`);
    } catch (inferenceError) {
      setError(inferenceError instanceof Error ? inferenceError.message : "Test fotografie selhal.");
    }
  };

  useEffect(() => {
    const host = cameraHostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(() => setCameraViewport({ width: host.clientWidth, height: host.clientHeight }));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    stopCamera();
    void sessionRef.current?.release();
  }, [stopCamera]);

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const photoClock = photoDetections.find((item) => item.classId === COCO_CLOCK_CLASS_ID) ?? null;
  const cameraClock = cameraDetections.find((item) => item.classId === COCO_CLOCK_CLASS_ID) ?? null;
  const visibleCameraBox = cameraClock && cameraSource ? coverBox(cameraClock, cameraSource, cameraViewport) : null;
  const diagnosticDetections = cameraState === "running" ? cameraDetections : photoDetections;

  return (
    <section className="space-y-5" aria-labelledby="yolox-heading">
      {showPhotoTest && <><div className="rounded-3xl border border-violet-300/30 bg-slate-900 p-4">
        <label className="block text-sm font-bold text-white">Fotografie hodin nebo scény<input className="mt-3 block w-full text-sm text-slate-200" type="file" accept="image/*" onChange={selectPhoto} /></label>
        <button type="button" onClick={() => void testPhoto()} disabled={!photoUrl || modelState === "loading"} className="mt-4 w-full rounded-2xl bg-violet-300 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">Spustit test fotografie</button>
      </div>

      {photoUrl && <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-black"><img id="yolox-photo-preview" src={photoUrl} alt="Nahraná fotografie pro YOLOX test" className="block h-auto w-full" onLoad={(event) => setPhotoSource({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />{photoSource && photoDetections.map((box, index) => <div key={`${box.classId}-${index}`} className={`pointer-events-none absolute border-2 ${box.classId === COCO_CLOCK_CLASS_ID ? "border-violet-300" : "border-emerald-300"}`} style={{ left: `${box.x / photoSource.width * 100}%`, top: `${box.y / photoSource.height * 100}%`, width: `${box.width / photoSource.width * 100}%`, height: `${box.height / photoSource.height * 100}%` }}><span className="absolute left-0 top-0 -translate-y-full whitespace-nowrap bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold text-white">{box.label} {Math.round(box.score * 100)} %</span></div>)}</div>}</>}

      <div ref={cameraHostRef} onPointerDown={(event) => { if (!manualSelectionMode || !cameraSource) return; event.currentTarget.setPointerCapture(event.pointerId); const point = getPointerSourcePosition(event, cameraSource); setManualSelection({ startX: point.x, startY: point.y, endX: point.x, endY: point.y }); }} onPointerMove={(event) => { if (!manualSelectionMode || !cameraSource || !manualSelection) return; const point = getPointerSourcePosition(event, cameraSource); setManualSelection({ ...manualSelection, endX: point.x, endY: point.y }); }} onPointerUp={(event) => { if (!manualSelectionMode || !cameraSource || !manualSelection) return; event.currentTarget.releasePointerCapture(event.pointerId); const point = getPointerSourcePosition(event, cameraSource); finishManualSelection({ ...manualSelection, endX: point.x, endY: point.y }); }} className={`relative aspect-[3/4] min-h-[420px] overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 sm:aspect-video ${manualSelectionMode ? "cursor-crosshair touch-none" : ""}`}><video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover" aria-label="Živá zadní kamera pro YOLOX" />{cameraState !== "running" && <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-300">{showPhotoTest ? "Nejprve můžete otestovat fotografii, nebo rovnou spusťte živou kameru." : "Kliknutím na tlačítko spusťte zadní kameru."}</div>}{manualSelectionMode && <div className="pointer-events-none absolute inset-x-4 top-16 rounded-xl bg-cyan-300/90 px-3 py-2 text-center text-xs font-bold text-slate-950">Prstem obtáhněte celé hodiny.</div>}{cameraSource && cameraDetections.map((box, index) => { const geometry = coverBox(box, cameraSource, cameraViewport); return <div key={`${box.classId}-${index}`} className={`pointer-events-none absolute border-2 ${box.classId === COCO_CLOCK_CLASS_ID ? "border-violet-300" : "border-emerald-300"}`} style={geometry}><span className="absolute left-0 top-0 -translate-y-full whitespace-nowrap bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold text-white">{box.label} {Math.round(box.score * 100)} %</span></div>; })}{cameraSource && manualSelection && (() => { const draft = createManualClock(manualSelection); if (!draft) return null; const geometry = coverBox(draft, cameraSource, cameraViewport); return <div className="pointer-events-none absolute border-2 border-dashed border-cyan-200 bg-cyan-200/10" style={geometry} />; })()}{overlayEnabled && visibleCameraBox && <img src={OVERLAY_PATH} alt="Překryv hodin" className="pointer-events-none absolute object-contain" style={{ left: visibleCameraBox.left - visibleCameraBox.width * (scaleFactor - 1) / 2, top: visibleCameraBox.top - visibleCameraBox.height * (scaleFactor - 1) / 2, width: visibleCameraBox.width * scaleFactor, height: visibleCameraBox.height * scaleFactor }} />}{manualOverlay && <img src={OVERLAY_PATH} alt="Ruční test překryvu" className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 object-contain" />}</div>

      <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => void startCamera()} disabled={cameraState === "starting" || cameraState === "running"} className="rounded-2xl bg-violet-300 px-5 py-3.5 font-bold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{cameraState === "starting" ? "Spouštím…" : "Spustit živou kameru"}</button><button type="button" onClick={stopCamera} disabled={cameraState !== "running"} className="rounded-2xl border border-slate-500 bg-slate-900 px-5 py-3.5 font-bold text-white disabled:cursor-not-allowed disabled:text-slate-500">Zastavit kameru</button></div>

      <div className="grid gap-3 rounded-3xl border border-slate-700 bg-slate-900 p-4 sm:grid-cols-2"><label className="text-sm font-semibold text-white">Minimum confidence: {confidence.toFixed(2)}<input className="mt-2 w-full accent-violet-300" type="range" min="0.1" max="0.8" step="0.05" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /></label><label className="text-sm font-semibold text-white">Scale překryvu: {scaleFactor.toFixed(1)}<input className="mt-2 w-full accent-violet-300" type="range" min="0.5" max="1.8" step="0.1" value={scaleFactor} onChange={(event) => setScaleFactor(Number(event.target.value))} /></label><button type="button" onClick={() => setOverlayEnabled((value) => !value)} className="rounded-xl border border-slate-500 px-3 py-2 font-bold text-white">Překrytí: {overlayEnabled ? "zapnuté" : "vypnuté"}</button><button type="button" onClick={() => setManualOverlay((value) => !value)} className="rounded-xl border border-violet-300 px-3 py-2 font-bold text-violet-100">Testovat překrytí</button>{motionTracking && <button type="button" disabled={cameraState !== "running"} onClick={() => { setManualSelection(null); setManualSelectionMode((value) => !value); }} className="rounded-xl border border-cyan-300 bg-cyan-300/10 px-3 py-2 font-bold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">{manualSelectionMode ? "Zrušit ruční označení" : "Ručně označit hodiny"}</button>}</div>

      <div className="rounded-3xl border border-violet-300/30 bg-violet-300/10 p-4 text-sm leading-6 text-violet-50"><p id="yolox-heading" className="font-bold">{modelName} diagnostika</p><p>Model: {modelState} · backend: {backend} · kamera: {cameraState} · AI vstup: {inputSize} × {inputSize} · kamera: {cameraSource ? `${cameraSource.width} × ${cameraSource.height}` : "–"} · inference: {inferenceMs ? `${inferenceMs.toFixed(0)} ms` : "–"}</p><p>Objekty: {diagnosticDetections.length} · nejlepší clock: {cameraClock?.score ?? photoClock?.score ? `${Math.round((cameraClock?.score ?? photoClock?.score ?? 0) * 100)} %` : "nenalezena"}</p>{motionTracking && <p>Obrazový tracker: {motionTrackingQuality === null ? "čeká na clock" : `${Math.round(motionTrackingQuality * 100)} % shoda`} · průběžné posuny: {motionTrackingUpdates}{trackingMode === "opencv" ? " · OpenCV Lucas–Kanade + afinní transformace" : ""}</p>}<p>Top 5: {topDetections(diagnosticDetections).map((item) => `${item.label} ${Math.round(item.score * 100)} %`).join(" · ") || "–"}</p>{lastRawBox && <p>Box před přepočtem: {lastRawBox.rawX.toFixed(1)}, {lastRawBox.rawY.toFixed(1)}, {lastRawBox.rawWidth.toFixed(1)} × {lastRawBox.rawHeight.toFixed(1)} · po přepočtu: {lastRawBox.x.toFixed(1)}, {lastRawBox.y.toFixed(1)}, {lastRawBox.width.toFixed(1)} × {lastRawBox.height.toFixed(1)}</p>}{error && <p className="mt-2 font-semibold text-red-200">Chyba: {error}</p>}<p className="mt-2">{message}</p></div>
    </section>
  );
}
