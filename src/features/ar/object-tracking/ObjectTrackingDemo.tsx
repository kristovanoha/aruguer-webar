"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

type CameraState = "idle" | "starting" | "running" | "error";
type ModelState = "idle" | "loading" | "ready" | "error";

type Detection = {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
};

type DetectionModel = {
  detect: (
    input: HTMLVideoElement,
    maxNumBoxes?: number,
    minScore?: number,
  ) => Promise<Array<{ class: string; score: number; bbox: [number, number, number, number] }>>;
  dispose?: () => void;
};

type Viewport = { width: number; height: number };

const overlayPath = "/ar/overlays/clock-overlay.png";
const detectionIntervalMs = 200;
const smoothingFactor = 0.38;
const lostDetectionGraceMs = 700;

function smoothDetection(previous: Detection | null, next: Detection): Detection {
  if (!previous) return next;

  return {
    x: previous.x + (next.x - previous.x) * smoothingFactor,
    y: previous.y + (next.y - previous.y) * smoothingFactor,
    width: previous.width + (next.width - previous.width) * smoothingFactor,
    height: previous.height + (next.height - previous.height) * smoothingFactor,
    score: next.score,
  };
}

function getCoverGeometry(
  detection: Detection,
  sourceWidth: number,
  sourceHeight: number,
  viewport: Viewport,
  overlayAspectRatio: number,
  scaleFactor: number,
) {
  if (!sourceWidth || !sourceHeight || !viewport.width || !viewport.height) return null;

  const coverScale = Math.max(viewport.width / sourceWidth, viewport.height / sourceHeight);
  const renderedWidth = sourceWidth * coverScale;
  const renderedHeight = sourceHeight * coverScale;
  const offsetX = (viewport.width - renderedWidth) / 2;
  const offsetY = (viewport.height - renderedHeight) / 2;
  const centerX = offsetX + (detection.x + detection.width / 2) * coverScale;
  const centerY = offsetY + (detection.y + detection.height / 2) * coverScale;
  const width = detection.width * coverScale * scaleFactor;
  const height = width / overlayAspectRatio;

  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    width,
    height,
    boxLeft: offsetX + detection.x * coverScale,
    boxTop: offsetY + detection.y * coverScale,
    boxWidth: detection.width * coverScale,
    boxHeight: detection.height * coverScale,
  };
}

export default function ObjectTrackingDemo() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<DetectionModel | null>(null);
  const inferenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inferenceBusyRef = useRef(false);
  const runningRef = useRef(false);
  const sessionRef = useRef(0);
  const confidenceRef = useRef(0.55);
  const smoothedDetectionRef = useRef<Detection | null>(null);
  const lostDetectionAtRef = useRef<number | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [lastDetectedAt, setLastDetectedAt] = useState<number | null>(null);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0.55);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 });
  const [overlayAspectRatio, setOverlayAspectRatio] = useState(1);

  const stopCamera = useCallback(() => {
    sessionRef.current += 1;
    runningRef.current = false;
    if (inferenceTimerRef.current) clearTimeout(inferenceTimerRef.current);
    inferenceTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    modelRef.current?.dispose?.();
    modelRef.current = null;
    smoothedDetectionRef.current = null;
    lostDetectionAtRef.current = null;
    setDetection(null);
    setLastDetectedAt(null);
    setCameraState("idle");
    setModelState("idle");
  }, []);

  const runDetection = useCallback(async () => {
    if (!runningRef.current || !modelRef.current || !videoRef.current) return;
    if (inferenceBusyRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      inferenceTimerRef.current = setTimeout(() => void runDetection(), detectionIntervalMs);
      return;
    }

    inferenceBusyRef.current = true;
    try {
      const results = await modelRef.current.detect(videoRef.current, 10, confidenceRef.current);
      const clock = results
        .filter((result) => result.class.toLowerCase() === "clock")
        .sort((a, b) => b.score - a.score)[0];

      if (clock) {
        const [x, y, width, height] = clock.bbox;
        const nextDetection = smoothDetection(smoothedDetectionRef.current, {
          x,
          y,
          width,
          height,
          score: clock.score,
        });
        smoothedDetectionRef.current = nextDetection;
        lostDetectionAtRef.current = null;
        setDetection(nextDetection);
        setLastDetectedAt(Date.now());
      } else if (smoothedDetectionRef.current) {
        const lostAt = lostDetectionAtRef.current ?? Date.now();
        lostDetectionAtRef.current = lostAt;
        if (Date.now() - lostAt > lostDetectionGraceMs) {
          smoothedDetectionRef.current = null;
          setDetection(null);
        }
      }
    } catch {
      setMessage("AI detekce se nepodařila dokončit. Zkuste kameru zastavit a spustit znovu.");
    } finally {
      inferenceBusyRef.current = false;
      if (runningRef.current) {
        inferenceTimerRef.current = setTimeout(() => void runDetection(), detectionIntervalMs);
      }
    }
  }, []);

  const startCamera = async () => {
    if (cameraState === "starting" || cameraState === "running") return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setMessage("Kamera vyžaduje HTTPS nebo localhost a podporu MediaDevices API.");
      return;
    }

    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    setCameraState("starting");
    setMessage(null);
    setDetection(null);
    setLastDetectedAt(null);
    setModelState("loading");

    try {
      const [tf, cocoSsd] = await Promise.all([
        import("@tensorflow/tfjs"),
        import("@tensorflow-models/coco-ssd"),
      ]);

      try {
        await tf.setBackend("webgl");
      } catch {
        await tf.setBackend("cpu");
      }
      await tf.ready();
      const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });

      if (sessionRef.current !== sessionId) {
        model.dispose?.();
        return;
      }
      modelRef.current = model;
      setModelState("ready");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          height: { ideal: 720 },
          width: { ideal: 1280 },
        },
      });
      if (sessionRef.current !== sessionId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (!videoRef.current) throw new Error("Video element is unavailable.");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      runningRef.current = true;
      setCameraState("running");
      void runDetection();
    } catch (error) {
      stopCamera();
      setCameraState("error");
      setModelState("error");
      setMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Přístup ke kameře byl zamítnut. Povolte kameru v nastavení prohlížeče."
          : "Kameru nebo AI model se nepodařilo spustit. Zkontrolujte oprávnění a připojení.",
      );
    }
  };

  useEffect(() => {
    confidenceRef.current = minConfidence;
  }, [minConfidence]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateViewport = () => setViewport({ width: container.clientWidth, height: container.clientHeight });
    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(container);
    window.addEventListener("orientationchange", updateViewport);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const geometry = useMemo(() => {
    if (!detection || !videoRef.current) return null;
    return getCoverGeometry(
      detection,
      videoRef.current.videoWidth,
      videoRef.current.videoHeight,
      viewport,
      overlayAspectRatio,
      scaleFactor,
    );
  }, [detection, overlayAspectRatio, scaleFactor, viewport]);

  const modelLabel =
    modelState === "loading" ? "Načítám AI model…" : modelState === "ready" ? "AI model připraven" : "AI model není spuštěn";
  const cameraLabel =
    cameraState === "starting" ? "Spouštím kameru…" : cameraState === "running" ? "Kamera běží" : "Kamera je vypnutá";

  return (
    <section className="space-y-4" aria-labelledby="object-tracking-heading">
      <div
        ref={containerRef}
        className="relative aspect-[3/4] min-h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-blue-950/30 sm:aspect-video"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          aria-label="Živý obraz zadní kamery"
        />
        {overlayEnabled && geometry && detection && (
          <Image
            src={overlayPath}
            alt="Překryv hodin"
            width={320}
            height={320}
            unoptimized
            className="pointer-events-none absolute max-w-none object-contain"
            style={{ left: geometry.left, top: geometry.top, width: geometry.width, height: geometry.height }}
          />
        )}
        {debugEnabled && geometry && (
          <div
            className="pointer-events-none absolute border-2 border-amber-300"
            style={{ left: geometry.boxLeft, top: geometry.boxTop, width: geometry.boxWidth, height: geometry.boxHeight }}
          >
            <span className="absolute left-0 top-0 -translate-y-full bg-amber-300 px-1.5 py-0.5 text-[11px] font-semibold text-slate-950">
              {Math.round((detection?.score ?? 0) * 100)} %
            </span>
          </div>
        )}
        {cameraState !== "running" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 px-6 text-center text-sm text-slate-300">
            {cameraState === "error" ? message : "Spusťte kameru a namiřte ji na nástěnné hodiny."}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between gap-2 p-3 text-xs">
          <span className="rounded-full bg-slate-950/75 px-3 py-1.5 text-slate-200 backdrop-blur">{cameraLabel}</span>
          <span className="rounded-full bg-slate-950/75 px-3 py-1.5 text-slate-200 backdrop-blur">{modelLabel}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void startCamera()}
          disabled={cameraState === "starting" || cameraState === "running"}
          className="rounded-2xl bg-blue-400 px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Spustit kameru
        </button>
        <button
          type="button"
          onClick={stopCamera}
          disabled={cameraState !== "running" && cameraState !== "starting"}
          className="rounded-2xl border border-white/15 px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Zastavit kameru
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setOverlayEnabled((enabled) => !enabled)}
          className="rounded-2xl border border-blue-300/30 bg-blue-300/10 px-5 py-3 text-left text-sm font-semibold text-blue-100 transition hover:bg-blue-300/20"
        >
          Překrytí: {overlayEnabled ? "zapnuté" : "vypnuté"}
        </button>
        <button
          type="button"
          onClick={() => setDebugEnabled((enabled) => !enabled)}
          className="rounded-2xl border border-white/15 px-5 py-3 text-left text-sm font-semibold text-slate-200 transition hover:border-white/30"
        >
          Debug rámeček: {debugEnabled ? "zapnutý" : "vypnutý"}
        </button>
      </div>

      {debugEnabled && (
        <div className="grid gap-4 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-slate-300 sm:grid-cols-2">
          <label className="block">
            <span className="flex justify-between gap-4"><span>Minimální confidence</span><span>{minConfidence.toFixed(2)}</span></span>
            <input
              className="mt-2 w-full accent-amber-300"
              type="range"
              min="0.3"
              max="0.9"
              step="0.05"
              value={minConfidence}
              onChange={(event) => setMinConfidence(Number(event.target.value))}
            />
          </label>
          <label className="block">
            <span className="flex justify-between gap-4"><span>Velikost překryvu</span><span>{scaleFactor.toFixed(1)}×</span></span>
            <input
              className="mt-2 w-full accent-amber-300"
              type="range"
              min="1"
              max="1.5"
              step="0.05"
              value={scaleFactor}
              onChange={(event) => setScaleFactor(Number(event.target.value))}
            />
          </label>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-slate-400">
        <p id="object-tracking-heading" className="font-medium text-slate-200">AI Object Tracking</p>
        <p>Detekce probíhá přímo v zařízení. Překryv se zobrazí pouze při rozpoznání hodin s confidence alespoň {minConfidence.toFixed(2)}.</p>
        <p className="mt-1">Poslední detekce: {lastDetectedAt ? new Date(lastDetectedAt).toLocaleTimeString("cs-CZ") : "zatím žádná"}.</p>
      </div>

      <Image
        src={overlayPath}
        alt=""
        width={320}
        height={320}
        unoptimized
        className="hidden"
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth && image.naturalHeight) setOverlayAspectRatio(image.naturalWidth / image.naturalHeight);
        }}
      />
    </section>
  );
}
