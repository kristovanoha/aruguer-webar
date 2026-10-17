"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Group, Material, Object3D, WebGLRenderer } from "three";
import type { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js";

type TrackingState = "idle" | "loading" | "running" | "error";

type TrackingRuntime = {
  mindar: MindARThree;
  model: Object3D;
  renderer: WebGLRenderer;
  started: boolean;
};

const targetPath = "/targets/house-target.mind";

function disposeModel(model: Object3D) {
  model.traverse((object) => {
    const mesh = object as Object3D & {
      geometry?: { dispose: () => void };
      material?: Material | Material[];
    };

    mesh.geometry?.dispose();
    const materials = mesh.material
      ? Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]
      : [];

    materials.forEach((material) => material.dispose());
  });
}

function configureSeeThroughLayers(mindar: MindARThree, stage: HTMLDivElement) {
  const { renderer, video, cssRenderer } = mindar;

  // MindAR owns this stream. Only adjust presentation layers; do not create a
  // second getUserMedia stream or replace the video source.
  stage.style.background = "transparent";
  if (video) {
    video.style.zIndex = "0";
    video.style.pointerEvents = "none";
    video.style.objectFit = "cover";
    video.style.transform = "none";
  }

  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.zIndex = "1";
  renderer.domElement.style.pointerEvents = "none";
  renderer.domElement.style.background = "transparent";

  cssRenderer.domElement.style.zIndex = "2";
  cssRenderer.domElement.style.pointerEvents = "none";
  cssRenderer.domElement.style.background = "transparent";
}

export default function ImageTrackingDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<TrackingRuntime | null>(null);
  const [state, setState] = useState<TrackingState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isSupported] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    return (
      window.isSecureContext &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      "WebGLRenderingContext" in window
    );
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
        // MindAR can reject stop when camera initialization failed early.
      }
    }
    runtime.mindar.video?.pause();
    if (runtime.mindar.video) {
      runtime.mindar.video.srcObject = null;
      runtime.mindar.video.remove();
    }
    runtime.renderer.setAnimationLoop(null);
    disposeModel(runtime.model);
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
      setMessage("Image Tracking vyžaduje HTTPS nebo localhost, kameru a podporu WebGL.");
      return;
    }

    setState("loading");
    setMessage(null);

    try {
      const [three, { GLTFLoader }, { MindARThree }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("mind-ar/dist/mindar-image-three.prod.js"),
      ]);

      const mindar = new MindARThree({
        container: stageRef.current,
        imageTargetSrc: targetPath,
        maxTrack: 1,
        uiError: "no",
        uiLoading: "no",
        uiScanning: "no",
      });
      const anchor = mindar.addAnchor(0);
      const model = new three.Group() as Group;
      const runtime: TrackingRuntime = {
        mindar,
        model,
        renderer: mindar.renderer,
        started: false,
      };
      runtimeRef.current = runtime;

      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync("/models/robot.glb");

      model.scale.setScalar(0.1);
      model.position.set(0, 0, 0.05);
      model.add(gltf.scene);
      model.traverse((object) => {
        const mesh = object as Object3D & {
          castShadow?: boolean;
          receiveShadow?: boolean;
        };
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
      anchor.group.add(model);

      const ambientLight = new three.AmbientLight(0xffffff, 1.8);
      const keyLight = new three.DirectionalLight(0xffffff, 2.5);
      keyLight.position.set(1, 2, 2);
      mindar.scene.add(ambientLight, keyLight);

      runtime.started = true;
      await mindar.start();
      configureSeeThroughLayers(mindar, stageRef.current);
      mindar.renderer.setAnimationLoop(() => {
        mindar.renderer.render(mindar.scene, mindar.camera);
      });
      setState("running");
    } catch {
      stopTracking();
      setState("error");
      setMessage(
        "Image Tracking se nepodařilo spustit. Zkontrolujte oprávnění kamery, HTTPS a dostupnost target souboru.",
      );
    }
  };

  const statusText =
    state === "loading"
      ? "Inicializuji kameru a Image Tracking…"
      : state === "running"
        ? "Zaměřte kameru na referenční obrázek."
        : "Kamera je vypnutá.";
  const isRunning = state === "running";

  return (
    <section className="space-y-4" aria-labelledby="image-tracking-heading">
      <div
        className={
          isRunning
            ? "fixed inset-0 z-40 overflow-hidden bg-transparent"
            : "relative h-[min(68vh,560px)] min-h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-blue-950/30"
        }
      >
        <div
          ref={stageRef}
          className="absolute inset-0 overflow-hidden bg-transparent"
          aria-label="Kamera pro Image Tracking"
        />
        {state !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 px-6 text-center">
            <p className="text-sm font-medium text-slate-200">{statusText}</p>
            {state === "idle" && (
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                Po spuštění namiřte kameru na referenční obrázek domu.
              </p>
            )}
            {state === "error" && message && (
              <p className="mt-3 max-w-sm text-sm leading-6 text-red-200" role="alert">
                {message}
              </p>
            )}
          </div>
        )}
        {state === "running" && (
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
            <p className="pointer-events-none rounded-full bg-slate-950/75 px-4 py-2 text-center text-xs text-white backdrop-blur">
              {statusText}
            </p>
            <button
              type="button"
              onClick={stopTracking}
              className="rounded-full bg-slate-950/80 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-slate-800"
            >
              Zastavit
            </button>
          </div>
        )}
      </div>

      {!isRunning && <div className="flex gap-3">
        <button
          type="button"
          onClick={startTracking}
          disabled={state === "loading" || isSupported === false}
          className="flex-1 rounded-2xl bg-blue-400 px-4 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Spustit Image Tracking
        </button>
        <button
          type="button"
          onClick={stopTracking}
          disabled={state !== "loading"}
          className="rounded-2xl border border-white/15 px-4 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Zastavit
        </button>
      </div>}

      {isSupported === false && (
        <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100" role="status">
          Toto prostředí nemá potřebné zabezpečené připojení, kameru nebo WebGL. Použijte HTTPS na podporovaném mobilním zařízení.
        </p>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-slate-400">
        <p id="image-tracking-heading" className="font-medium text-slate-200">Jak demo použít</p>
        <p>Stiskněte spuštění, povolte kameru a namiřte ji na referenční obrázek. Model domu se objeví nad jeho plochou.</p>
      </div>
    </section>
  );
}
