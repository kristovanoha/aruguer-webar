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

type AnimationName = "Running" | "Walking" | "run_fast_7";

const animationOptions: Array<{ name: AnimationName; label: string; description: string }> = [
  { name: "Running", label: "Běh", description: "Plynulý běh vpřed." },
  { name: "Walking", label: "Chůze", description: "Pomalejší a klidnější pohyb." },
  { name: "run_fast_7", label: "Rychlý běh", description: "Výrazně rychlejší běh." },
];

const ModelViewer = "model-viewer" as unknown as React.ComponentType<ModelViewerProps>;

export default function ARModelViewer() {
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const [libraryReady, setLibraryReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [arMessage, setArMessage] = useState<string | null>(null);
  const [modelError, setModelError] = useState(false);
  const [selectedAnimation, setSelectedAnimation] = useState<AnimationName>("Running");

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
            animation-name={selectedAnimation}
            camera-controls
            className="h-[360px] w-full sm:h-[480px]"
            exposure="1"
            shadow-intensity="1"
            src="/models/netvorBeh.glb"
            touch-action="pan-y"
          />
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-3">
          <p className="font-medium text-slate-200">Vyberte animaci</p>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Kliknutím na tlačítko okamžitě změníte pohyb modelu.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Výběr animace">
          {animationOptions.map((animation) => (
            <button
              key={animation.name}
              type="button"
              onClick={() => setSelectedAnimation(animation.name)}
              disabled={!libraryReady || !modelLoaded || modelError}
              aria-pressed={selectedAnimation === animation.name}
              className={
                selectedAnimation === animation.name
                  ? "rounded-xl border border-blue-300/70 bg-blue-300/20 px-3 py-2 text-left text-sm text-blue-100"
                  : "rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-slate-300 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              <span className="block font-semibold">{animation.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{animation.description}</span>
            </button>
          ))}
        </div>
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
