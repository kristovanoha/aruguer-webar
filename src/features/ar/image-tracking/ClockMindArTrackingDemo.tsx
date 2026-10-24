"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Material, Mesh, Texture, WebGLRenderer } from "three";
import type { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js";

type TrackingState = "idle" | "loading" | "running" | "error";

type TrackingRuntime = {
  material: Material;
  mindar: MindARThree;
  overlay: Mesh;
  renderer: WebGLRenderer;
  started: boolean;
  texture: Texture;
};

function configureSeeThroughLayers(mindar: MindARThree, stage: HTMLDivElement) {
  stage.style.background = "transparent";
  if (mindar.video) {
    mindar.video.style.zIndex = "0";
    mindar.video.style.pointerEvents = "none";
    mindar.video.style.objectFit = "cover";
  }
  mindar.renderer.setClearColor(0x000000, 0);
  mindar.renderer.domElement.style.zIndex = "1";
  mindar.renderer.domElement.style.pointerEvents = "none";
  mindar.renderer.domElement.style.background = "transparent";
  mindar.cssRenderer.domElement.style.zIndex = "2";
  mindar.cssRenderer.domElement.style.pointerEvents = "none";
  mindar.cssRenderer.domElement.style.background = "transparent";
}

export default function ClockMindArTrackingDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<TrackingRuntime | null>(null);
  const [state, setState] = useState<TrackingState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isSupported] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    return window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia) && "WebGLRenderingContext" in window;
  });

  const stopTracking = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      setState("idle");
      return;
    }
    if (runtime.started) {
      try {
        runtime.mindar.stop();
      } catch {
        // MindAR can reject stop after an incomplete startup.
      }
    }
    runtime.mindar.video?.pause();
    if (runtime.mindar.video) {
      runtime.mindar.video.srcObject = null;
      runtime.mindar.video.remove();
    }
    runtime.renderer.setAnimationLoop(null);
    runtime.overlay.geometry.dispose();
    runtime.material.dispose();
    runtime.texture.dispose();
    runtime.renderer.dispose();
    runtime.renderer.forceContextLoss();
    runtime.renderer.domElement.remove();
    stageRef.current?.replaceChildren();
    runtimeRef.current = null;
    setState("idle");
  }, []);

  useEffect(() => stopTracking, [stopTracking]);

  const startTracking = async () => {
    if (!stageRef.current || runtimeRef.current || state === "loading") return;
    if (!isSupported) {
      setState("error");
      setMessage("MindAR vyžaduje HTTPS nebo localhost, kameru a WebGL.");
      return;
    }
    setState("loading");
    setMessage(null);
    try {
      const [three, { MindARThree }] = await Promise.all([
        import("three"),
        import("mind-ar/dist/mindar-image-three.prod.js"),
      ]);
      const mindar = new MindARThree({
        container: stageRef.current,
        imageTargetSrc: "/targets/hodiny.mind",
        maxTrack: 1,
        uiError: "no",
        uiLoading: "no",
        uiScanning: "no",
      });
      const texture = await new three.TextureLoader().loadAsync("/ar/overlays/clock-overlay.png");
      texture.colorSpace = three.SRGBColorSpace;
      const material = new three.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
      // The compiled reference image is 448 × 446, almost square.
      const overlay = new three.Mesh(new three.PlaneGeometry(1, 446 / 448), material);
      overlay.position.z = 0.01;
      mindar.addAnchor(0).group.add(overlay);
      const runtime: TrackingRuntime = { mindar, overlay, material, renderer: mindar.renderer, started: false, texture };
      runtimeRef.current = runtime;
      runtime.started = true;
      await mindar.start();
      configureSeeThroughLayers(mindar, stageRef.current);
      mindar.renderer.setAnimationLoop(() => mindar.renderer.render(mindar.scene, mindar.camera));
      setState("running");
    } catch (startError) {
      stopTracking();
      setState("error");
      setMessage(startError instanceof Error ? startError.message : "MindAR tracking se nepodařilo spustit.");
    }
  };

  const running = state === "running";
  return (
    <section className="space-y-4" aria-labelledby="clock-mindar-heading">
      <div className={running ? "fixed inset-0 z-40 overflow-hidden bg-transparent" : "relative h-[min(68vh,560px)] min-h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950"}>
        <div ref={stageRef} className="absolute inset-0 overflow-hidden bg-transparent" aria-label="Kamera pro stabilní tracking hodin" />
        {!running && <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 px-6 text-center"><p className="text-sm font-medium text-slate-200">{state === "loading" ? "Inicializuji kameru a MindAR…" : "Spusťte kameru a namiřte ji na stejné hodiny jako na referenční fotografii."}</p>{state === "error" && message && <p className="mt-3 max-w-sm text-sm leading-6 text-red-200" role="alert">{message}</p>}</div>}
        {running && <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4"><p className="pointer-events-none rounded-full bg-slate-950/75 px-4 py-2 text-xs text-white backdrop-blur">Target hodin je aktivní. Překrytí je ukotveno k referenčnímu obrázku.</p><button type="button" onClick={stopTracking} className="rounded-full bg-slate-950/80 px-4 py-2 text-xs font-semibold text-white backdrop-blur">Zastavit</button></div>}
      </div>
      {!running && <button type="button" onClick={() => void startTracking()} disabled={state === "loading" || isSupported === false} className="w-full rounded-2xl bg-emerald-300 px-4 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50">{state === "loading" ? "Spouštím…" : "Spustit stabilní tracking hodin"}</button>}
      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm leading-6 text-emerald-50"><p id="clock-mindar-heading" className="font-bold">Použití tohoto testu</p><p>Funguje pouze pro stejné hodiny a podobný pohled, který je na referenční fotografii. Nejde o univerzální rozpoznání libovolných hodin.</p></div>
    </section>
  );
}
