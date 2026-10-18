"use client";

import { useEffect, useRef, useState } from "react";

type ModelViewerProps = React.HTMLAttributes<HTMLElement> & {
  alt: string;
  autoplay?: boolean;
  ar?: boolean;
  "ar-modes"?: string;
  "animation-name"?: string;
  "camera-controls"?: boolean;
  exposure?: string;
  poster?: string;
  "shadow-intensity"?: string;
  src: string;
  "touch-action"?: string;
  ref?: React.Ref<ModelViewerElement>;
};

type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void>;
};

const ModelViewer = "model-viewer" as unknown as React.ComponentType<ModelViewerProps>;

export default function ARModelViewer() {
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const [libraryReady, setLibraryReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [arMessage, setArMessage] = useState<string | null>(null);
  const [modelError, setModelError] = useState(false);

  useEffect(() => {
    let active = true;
    void import("@google/model-viewer")
      .then(() => {
        if (active) setLibraryReady(true);
      })
      .catch(() => {
        if (active) setModelError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !libraryReady) return;

    const handleLoad = () => {
      setModelLoaded(true);
      setModelError(false);
    };
    const handleError = () => {
      setModelError(true);
    };
    const handleARStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status?: string }>).detail?.status;
      if (status === "failed") {
        setArMessage("AR se nepodařilo spustit. Zkontrolujte oprávnění kamery a podporu Google Play Services for AR.");
      } else if (status === "object-placed") {
        setArMessage("Model netvora byl umístěn do prostoru.");
      }
    };

    viewer.addEventListener("load", handleLoad);
    viewer.addEventListener("error", handleError);
    viewer.addEventListener("ar-status", handleARStatus);

    return () => {
      viewer.removeEventListener("load", handleLoad);
      viewer.removeEventListener("error", handleError);
      viewer.removeEventListener("ar-status", handleARStatus);
    };
  }, [libraryReady]);

  const activateAR = async () => {
    setArMessage(null);
    const viewer = viewerRef.current;
    if (!viewer?.activateAR) {
      setArMessage("Toto zařízení nebo prohlížeč nepodporuje spuštění AR. 3D prohlížeč zůstává k dispozici.");
      return;
    }

    try {
      await viewer.activateAR();
    } catch {
      setArMessage("AR není na tomto zařízení dostupné. Zůstaňte v 3D prohlížeči nebo použijte podporovaný Android telefon.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl shadow-blue-950/30">
        {!libraryReady && !modelError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 text-sm text-slate-300">
            Načítám 3D prohlížeč…
          </div>
        )}
        {modelError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-red-200">
            Model se nepodařilo načíst. Zkontrolujte dostupnost souboru netvorBeh.glb.
          </div>
        )}
        {libraryReady && (
          <ModelViewer
            ref={viewerRef}
            alt="3D model netvora"
            autoplay
            ar
            ar-modes="webxr scene-viewer"
            animation-name="Running"
            camera-controls
            className="h-[360px] w-full sm:h-[480px]"
            exposure="1"
            shadow-intensity="1"
            src="/models/netvorBeh.glb"
            touch-action="pan-y"
          />
        )}
      </div>

      <button
        type="button"
        onClick={activateAR}
        disabled={!libraryReady || !modelLoaded || modelError}
        className="w-full rounded-2xl bg-blue-400 px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Zobrazit v AR
      </button>

      {arMessage && (
        <p className="rounded-2xl border border-blue-300/20 bg-blue-300/10 px-4 py-3 text-sm leading-6 text-blue-100" role="status">
          {arMessage}
        </p>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-slate-400">
        <p className="font-medium text-slate-200">Ovládání</p>
        <p>Model otáčejte prstem a přibližujte dvěma prsty. AR režim funguje na podporovaných telefonech s Android Chrome.</p>
      </div>
    </div>
  );
}
