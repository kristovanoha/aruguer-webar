"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as Ort from "onnxruntime-web";
import type { Group, OrthographicCamera, Scene, WebGLRenderer } from "three";
import type { DetectionBox } from "./yolox";
import { decodeYolo26ClockOutput, letterboxYolo26Image, YOLO26_INPUT_SIZE } from "./yolo26";

type CameraState = "idle" | "starting" | "running" | "error";
type ModelState = "idle" | "loading" | "ready" | "error";
type SourceInfo = { height: number; width: number };
type OverlayRuntime = { camera: OrthographicCamera; object: Group; renderer: WebGLRenderer; scene: Scene };

const MODEL_PATH = "/models/ai/yolo26n.onnx";
const REQUIRED_STABLE_DETECTIONS = 3;
const LOST_DETECTION_GRACE_MS = 500;

function coverBox(box: DetectionBox, source: SourceInfo, viewport: SourceInfo) {
  const scale = Math.max(viewport.width / source.width, viewport.height / source.height);
  const renderedWidth = source.width * scale;
  const renderedHeight = source.height * scale;
  return { left: (viewport.width - renderedWidth) / 2 + box.x * scale, top: (viewport.height - renderedHeight) / 2 + box.y * scale, width: box.width * scale, height: box.height * scale };
}

function blendBox(previous: DetectionBox | null, next: DetectionBox) {
  if (!previous) return next;
  const weight = 0.28;
  return { ...next, x: previous.x + (next.x - previous.x) * weight, y: previous.y + (next.y - previous.y) * weight, width: previous.width + (next.width - previous.width) * weight, height: previous.height + (next.height - previous.height) * weight };
}

export default function Yolo26ClockDetectionDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<Ort.InferenceSession | null>(null);
  const ortRef = useRef<typeof Ort | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const busyRef = useRef(false);
  const detectRef = useRef<() => void>(() => undefined);
  const lastVideoTimeRef = useRef(-1);
  const stableCountRef = useRef(0);
  const lastOverlayAtRef = useRef(0);
  const overlayBoxRef = useRef<DetectionBox | null>(null);
  const overlayRuntimeRef = useRef<OverlayRuntime | null>(null);
  const sourceRef = useRef<SourceInfo | null>(null);
  const viewportRef = useRef<SourceInfo>({ width: 0, height: 0 });
  const horizontalRotationRef = useRef(0);
  const verticalRotationRef = useRef(0);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [runtime, setRuntime] = useState("–");
  const [confidence, setConfidence] = useState(0.35);
  const [message, setMessage] = useState("Spusťte kameru. Model se načte až při prvním použití.");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<SourceInfo | null>(null);
  const [viewport, setViewport] = useState<SourceInfo>({ width: 0, height: 0 });
  const [clock, setClock] = useState<DetectionBox | null>(null);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [stableDetections, setStableDetections] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [horizontalRotation, setHorizontalRotation] = useState(0);
  const [verticalRotation, setVerticalRotation] = useState(0);
  const lastInferenceAtRef = useRef(0);

  const releaseModel = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    ortRef.current = null;
    if (session) void session.release().catch(() => undefined);
  }, []);

  const loadModel = useCallback(async () => {
    if (sessionRef.current && ortRef.current) return { ort: ortRef.current, session: sessionRef.current };
    setModelState("loading");
    const ort = await import("onnxruntime-web");
    ort.env.wasm.numThreads = 1;
    let session: Ort.InferenceSession;
    try {
      session = await ort.InferenceSession.create(MODEL_PATH, { executionProviders: ["webgpu"] });
      setRuntime("WebGPU");
    } catch {
      session = await ort.InferenceSession.create(MODEL_PATH, { executionProviders: ["wasm"] });
      setRuntime("WASM");
    }
    if (session.inputNames[0] !== "images" || session.outputNames[0] !== "output0") {
      await session.release();
      throw new Error(`Neočekávaná rozhraní modelu: vstup ${session.inputNames.join(", ")}, výstup ${session.outputNames.join(", ")}.`);
    }
    sessionRef.current = session;
    ortRef.current = ort;
    setModelState("ready");
    return { ort, session };
  }, []);

  const updateOverlay = useCallback(() => {
    const overlay = overlayRuntimeRef.current;
    const tracked = overlayBoxRef.current;
    const videoSource = sourceRef.current;
    if (!overlay || !tracked || !videoSource) return;
    const geometry = coverBox(tracked, videoSource, viewportRef.current);
    const centerX = geometry.left + geometry.width / 2;
    const centerY = geometry.top + geometry.height / 2;
    const size = Math.max(20, Math.min(geometry.width, geometry.height) * 0.88);
    overlay.object.position.set(centerX, centerY, 0);
    overlay.object.lookAt(centerX, centerY, overlay.camera.position.z);
    overlay.object.rotateY(horizontalRotationRef.current * Math.PI / 180);
    overlay.object.rotateX(verticalRotationRef.current * Math.PI / 180);
    overlay.object.scale.set(size, size, size);
    overlay.object.visible = performance.now() - lastOverlayAtRef.current <= LOST_DETECTION_GRACE_MS;
  }, []);

  const createOverlay = useCallback(async () => {
    const host = hostRef.current;
    if (!host || overlayRuntimeRef.current) return;
    const [three, { GLTFLoader }] = await Promise.all([
      import("three"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
    ]);
    const renderer = new three.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "pointer-events-none absolute inset-0 h-full w-full";
    host.append(renderer.domElement);
    const scene = new three.Scene();
    // The overlay uses CSS-pixel coordinates. A normalized GLB is scaled to the
    // detection box, so its depth can be hundreds of those units as well.
    // Keep the camera depth proportional to the canvas to avoid clipping deep models.
    const camera = new three.OrthographicCamera(0, 1, 1, 0, 0.1, 4);
    camera.position.z = 2;
    renderer.outputColorSpace = three.SRGBColorSpace;
    const object = new three.Group();
    const gltf = await new GLTFLoader().loadAsync("/models/vesmirnaLod.glb");
    const model = gltf.scene;
    const bounds = new three.Box3().setFromObject(model);
    const size = bounds.getSize(new three.Vector3());
    const center = bounds.getCenter(new three.Vector3());
    const largestDimension = Math.max(size.x, size.y, size.z, 0.001);
    model.position.sub(center);
    model.scale.setScalar(1 / largestDimension);
    object.add(model);
    object.visible = false;
    const keyLight = new three.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(1, 1, 2);
    scene.add(object, new three.AmbientLight(0xffffff, 2), keyLight);
    overlayRuntimeRef.current = { camera, object, renderer, scene };
    const render = () => {
      const current = overlayRuntimeRef.current;
      if (!current || !runningRef.current) return;
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width > 0 && height > 0) {
        const cameraDepth = Math.max(width, height) * 2;
        current.renderer.setSize(width, height, false);
        current.camera.right = width;
        current.camera.bottom = height;
        current.camera.position.z = cameraDepth;
        current.camera.far = cameraDepth * 2;
        current.camera.updateProjectionMatrix();
        updateOverlay();
        current.renderer.render(current.scene, current.camera);
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };
    animationFrameRef.current = requestAnimationFrame(render);
  }, [updateOverlay]);

  const disposeOverlay = useCallback(() => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    const overlay = overlayRuntimeRef.current;
    if (!overlay) return;
    overlay.object.traverse((node) => {
      const mesh = node as typeof node & { geometry?: { dispose(): void }; material?: { dispose(): void } | { dispose(): void }[] };
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose()); else mesh.material?.dispose();
    });
    overlay.renderer.dispose();
    overlay.renderer.forceContextLoss();
    overlay.renderer.domElement.remove();
    overlayRuntimeRef.current = null;
  }, []);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    busyRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; }
    disposeOverlay();
    releaseModel();
    overlayBoxRef.current = null;
    stableCountRef.current = 0;
    setStableDetections(0);
    setOverlayVisible(false);
    setClock(null);
    setCameraState("idle");
  }, [disposeOverlay, releaseModel]);

  const detect = useCallback(async () => {
    const video = videoRef.current;
    if (!runningRef.current || !video) return;
    if (busyRef.current || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.currentTime === lastVideoTimeRef.current) {
      timerRef.current = setTimeout(() => detectRef.current(), 80);
      return;
    }
    busyRef.current = true;
    try {
      const dimensions = { width: video.videoWidth, height: video.videoHeight };
      const { ort, session } = await loadModel();
      const { tensor, transform } = letterboxYolo26Image(video, dimensions.width, dimensions.height);
      const startedAt = performance.now();
      const output = await session.run({ images: new ort.Tensor("float32", tensor, [1, 3, YOLO26_INPUT_SIZE, YOLO26_INPUT_SIZE]) });
      const elapsed = performance.now() - startedAt;
      const result = output.output0;
      if (!(result.data instanceof Float32Array) || result.dims.join(",") !== "1,300,6") throw new Error(`Neočekávaný tensor YOLO26n: [${result.dims.join(",")}].`);
      const detection = decodeYolo26ClockOutput(result.data, transform, confidence);
      lastVideoTimeRef.current = video.currentTime;
      setInferenceMs(elapsed);
      if (lastInferenceAtRef.current > 0) setFps(1000 / (performance.now() - lastInferenceAtRef.current));
      lastInferenceAtRef.current = performance.now();
      sourceRef.current = dimensions;
      setSource(dimensions);
      setError(null);
      if (detection) {
        stableCountRef.current += 1;
        setStableDetections(stableCountRef.current);
        const smoothed = blendBox(overlayBoxRef.current, detection);
        setClock(smoothed);
        if (stableCountRef.current >= REQUIRED_STABLE_DETECTIONS) {
          overlayBoxRef.current = smoothed;
          lastOverlayAtRef.current = performance.now();
          setOverlayVisible(true);
        }
      } else {
        stableCountRef.current = 0;
        setStableDetections(0);
        setClock(overlayBoxRef.current);
        if (performance.now() - lastOverlayAtRef.current > LOST_DETECTION_GRACE_MS) setOverlayVisible(false);
      }
    } catch (detectionError) {
      setError(detectionError instanceof Error ? detectionError.message : "Inference selhala.");
    } finally {
      busyRef.current = false;
      if (runningRef.current) timerRef.current = setTimeout(() => detectRef.current(), Math.max(80, (inferenceMs ?? 0) * 0.35));
    }
  }, [confidence, inferenceMs, loadModel]);

  useEffect(() => {
    detectRef.current = () => void detect();
  }, [detect]);

  const startCamera = async () => {
    if (cameraState === "starting" || cameraState === "running") return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setCameraState("error"); setError("Kamera vyžaduje HTTPS nebo localhost."); return; }
    setCameraState("starting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      const video = videoRef.current;
      if (!video) throw new Error("Video element není dostupný.");
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      runningRef.current = true;
      await createOverlay();
      setCameraState("running");
      setMessage("Kamera běží. Vesmírná loď se zobrazí až po třech po sobě jdoucích detekcích hodin.");
      detectRef.current();
    } catch (startError) {
      stopCamera();
      setCameraState("error");
      setError(startError instanceof DOMException && startError.name === "NotAllowedError" ? "Přístup ke kameře byl zamítnut." : startError instanceof Error ? startError.message : "Kameru se nepodařilo spustit.");
    }
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(() => {
      const nextViewport = { width: host.clientWidth, height: host.clientHeight };
      viewportRef.current = nextViewport;
      setViewport(nextViewport);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  useEffect(() => stopCamera, [stopCamera]);

  const visibleBox = clock && source ? coverBox(clock, source, viewport) : null;
  return <section className="space-y-4" aria-labelledby="yolo26-heading">
    <div ref={hostRef} className="relative aspect-[3/4] min-h-[420px] overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 sm:aspect-video"><video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover" aria-label="Živá zadní kamera pro YOLO26" />{cameraState !== "running" && <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-300">Klikněte na spuštění živé kamery.</div>}{visibleBox && <div className="pointer-events-none absolute border-2 border-emerald-300" style={visibleBox}><span className="absolute left-0 top-0 -translate-y-full whitespace-nowrap bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold text-white">clock {Math.round((clock?.score ?? 0) * 100)} %</span></div>}</div>
    <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => void startCamera()} disabled={cameraState === "starting" || cameraState === "running"} className="rounded-2xl bg-emerald-300 px-5 py-3.5 font-bold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700">{cameraState === "starting" ? "Spouštím…" : "Spustit živou kameru"}</button><button type="button" onClick={stopCamera} disabled={cameraState !== "running"} className="rounded-2xl border border-slate-500 bg-slate-900 px-5 py-3.5 font-bold text-white disabled:cursor-not-allowed disabled:text-slate-500">Zastavit kameru</button></div>
    <div className="grid gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:grid-cols-3"><label className="text-sm font-semibold text-white">Minimum confidence: {confidence.toFixed(2)}<input className="mt-3 w-full accent-emerald-300" type="range" min="0.2" max="0.8" step="0.05" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /></label><label className="text-sm font-semibold text-white">Horizontální otočení: {horizontalRotation}°<input className="mt-3 w-full accent-emerald-300" type="range" min="-180" max="180" step="5" value={horizontalRotation} onChange={(event) => { const value = Number(event.target.value); horizontalRotationRef.current = value; setHorizontalRotation(value); }} /></label><label className="text-sm font-semibold text-white">Vertikální náklon: {verticalRotation}°<input className="mt-3 w-full accent-emerald-300" type="range" min="-180" max="180" step="5" value={verticalRotation} onChange={(event) => { const value = Number(event.target.value); verticalRotationRef.current = value; setVerticalRotation(value); }} /></label></div>
    <div className="rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-50"><p id="yolo26-heading" className="font-bold">YOLO26n diagnostika</p><p>Model: {modelState} · runtime: {runtime} · kamera: {cameraState} · vstup: 640 × 640 · inference: {inferenceMs ? `${inferenceMs.toFixed(0)} ms` : "–"} · FPS: {fps ? fps.toFixed(1) : "–"}</p><p>Clock: {clock ? `${Math.round(clock.score * 100)} %` : "nenalezena"} · stabilní detekce: {stableDetections}/{REQUIRED_STABLE_DETECTIONS} · 3D overlay: {overlayVisible ? "viditelný" : "čeká"}</p>{error && <p className="mt-2 font-semibold text-red-200">Chyba: {error}</p>}<p className="mt-2">{message}</p><p className="mt-2 text-emerald-100/80">Jde o 2D ukotvení podle obrázku kamery, nikoli o skutečný prostorový AR anchor.</p></div>
  </section>;
}
