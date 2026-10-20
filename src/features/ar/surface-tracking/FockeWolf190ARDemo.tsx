"use client";

import { useEffect, useRef, useState } from "react";

type ModelViewerProps = React.HTMLAttributes<HTMLElement> & {
  alt: string;
  ar?: boolean;
  "ar-modes"?: string;
  "camera-controls"?: boolean;
  exposure?: string;
  "shadow-intensity"?: string;
  src: string;
  "touch-action"?: string;
  ref?: React.Ref<ModelViewerElement>;
};

type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void>;
};

const ModelViewer = "model-viewer" as unknown as React.ComponentType<ModelViewerProps>;

export default function FockeWolf190ARDemo() {
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void import("@google/model-viewer")
      .then(() => {
        if (active) setViewerReady(true);
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
    if (!viewer || !viewerReady) return;

    const handleLoad = () => {
      setModelLoaded(true);
      setModelError(false);
    };
    const handleError = () => setModelError(true);
    const handleArStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status?: string }>).detail?.status;
      if (status === "object-placed") setMessage("Letoun byl umístěn na plochu.");
      if (status === "failed") setMessage("AR se nepodařilo spustit. Zkontrolujte oprávnění kamery a podporu ARCore.");
    };

    viewer.addEventListener("load", handleLoad);
    viewer.addEventListener("error", handleError);
    viewer.addEventListener("ar-status", handleArStatus);
    return () => {
      viewer.removeEventListener("load", handleLoad);
      viewer.removeEventListener("error", handleError);
      viewer.removeEventListener("ar-status", handleArStatus);
    };
  }, [viewerReady]);

  const activateAr = async () => {
    setMessage(null);
    const viewer = viewerRef.current;
    if (!viewer?.activateAR) {
      setMessage("Tento prohlížeč nepodporuje AR. 3D náhled zůstává k dispozici.");
      return;
    }
    try {
      await viewer.activateAR();
    } catch {
      setMessage("AR není na tomto zařízení dostupné. Použijte Android Chrome s podporou ARCore.");
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="focke-wolf-ar-heading">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl shadow-amber-950/30">
        {!viewerReady && !modelError && <div className="absolute inset-0 z-10 flex min-h-[420px] items-center justify-center bg-slate-950/90 px-6 text-center text-base font-medium text-white">Načítám 3D prohlížeč…</div>}
        {modelError && <div className="absolute inset-0 z-10 flex min-h-[420px] items-center justify-center bg-slate-950 px-6 text-center text-base font-medium text-red-200">Model Focke-Wulf 190 se nepodařilo načíst.</div>}
        {viewerReady && <ModelViewer ref={viewerRef} alt="3D model letounu Focke-Wulf 190" ar ar-modes="webxr scene-viewer" camera-controls className="h-[420px] w-full sm:h-[520px]" exposure="1" shadow-intensity="1" src="/models/fockeWolf190.glb" touch-action="pan-y" />}
      </div>

      <button type="button" onClick={activateAr} disabled={!viewerReady || !modelLoaded || modelError} className="w-full rounded-2xl bg-amber-300 px-5 py-4 text-base font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-300/40 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none">
        Zobrazit na ploše v AR
      </button>

      {message && <p className="rounded-2xl border border-amber-300/40 bg-amber-300/15 px-4 py-3 text-base font-medium leading-6 text-amber-50" role="status">{message}</p>}

      <div className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base leading-6 text-slate-200">
        <p id="focke-wolf-ar-heading" className="font-bold text-white">Focke-Wulf 190</p>
        <p className="mt-1">Model můžete otáčet prstem a přibližovat dvěma prsty. V AR režimu jej položíte na nalezenou plochu.</p>
      </div>
    </section>
  );
}
