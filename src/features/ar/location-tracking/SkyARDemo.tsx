"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Material, Object3D, WebGLRenderer } from "three";

type SkyState = "idle" | "loading" | "running" | "error";

type SkyRuntime = {
  renderer: WebGLRenderer;
  stream: MediaStream;
  stop: () => void;
};

const shipPositions: ReadonlyArray<readonly [number, number, number]> = [
  [-6, 3.8, -12],
  [0, 6.2, -18],
  [7, 4.5, -14],
  [-11, 7.8, -21],
];

function disposeModel(model: Object3D) {
  model.traverse((object) => {
    const mesh = object as Object3D & { geometry?: { dispose: () => void }; material?: Material | Material[] };
    mesh.geometry?.dispose();
    const materials = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    materials.forEach((material) => material.dispose());
  });
}

export default function SkyARDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<SkyRuntime | null>(null);
  const [state, setState] = useState<SkyState>("idle");
  const [message, setMessage] = useState("Kamera je vypnutá.");

  const stop = useCallback(() => {
    const runtime = runtimeRef.current;
    if (runtime) runtime.stop();
    runtimeRef.current = null;
    stageRef.current?.replaceChildren();
    setState("idle");
    setMessage("Kamera je vypnutá.");
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    const stage = stageRef.current;
    if (!stage || runtimeRef.current || state === "loading") return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setMessage("Sky AR vyžaduje HTTPS nebo localhost a povolení kamery.");
      return;
    }

    setState("loading");
    setMessage("Načítám kameru, kompas a lodě…");
    let acquiredStream: MediaStream | null = null;
    try {
      const orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<PermissionState>;
      };
      if (orientation.requestPermission && (await orientation.requestPermission()) !== "granted") {
        throw new Error("orientation-denied");
      }

      const [three, { GLTFLoader }, stream] = await Promise.all([
        import("three"),
        import("three/addons/loaders/GLTFLoader.js"),
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        }),
      ]);
      acquiredStream = stream;
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.className = "absolute inset-0 h-full w-full object-cover";
      video.srcObject = stream;
      await video.play();

      const renderer = new three.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.className = "pointer-events-none absolute inset-0 h-full w-full";
      const scene = new three.Scene();
      const camera = new three.PerspectiveCamera(62, 1, 0.1, 100);
      scene.add(new three.HemisphereLight(0xbfe8ff, 0x101827, 3));
      const keyLight = new three.DirectionalLight(0xffffff, 2.6);
      keyLight.position.set(3, 8, 4);
      scene.add(keyLight);

      const gltf = await new GLTFLoader().loadAsync("/models/vesmirnaLod.glb");
      const box = new three.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new three.Vector3());
      const size = box.getSize(new three.Vector3());
      const largestDimension = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(largestDimension) || largestDimension <= 0) throw new Error("invalid-model");
      gltf.scene.position.sub(center);
      gltf.scene.scale.setScalar(1 / largestDimension);

      shipPositions.forEach((position, index) => {
        const ship = gltf.scene.clone(true);
        ship.position.fromArray(position);
        ship.scale.multiplyScalar(1.8 - index * 0.16);
        ship.rotation.y = (index - 1.5) * 0.22;
        scene.add(ship);
      });

      stage.replaceChildren(video, renderer.domElement);
      const resize = () => {
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize);

      const updateOrientation = (event: DeviceOrientationEvent) => {
        const heading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading ?? event.alpha ?? 0;
        const beta = event.beta ?? 0;
        const gamma = event.gamma ?? 0;
        camera.quaternion.setFromEuler(new three.Euler(
          three.MathUtils.degToRad(beta),
          three.MathUtils.degToRad(heading),
          three.MathUtils.degToRad(-gamma),
          "YXZ",
        ));
        camera.quaternion.multiply(new three.Quaternion().setFromAxisAngle(new three.Vector3(1, 0, 0), -Math.PI / 2));
      };
      window.addEventListener("deviceorientation", updateOrientation, true);
      renderer.setAnimationLoop(() => renderer.render(scene, camera));

      const runtime: SkyRuntime = {
        renderer,
        stream,
        stop: () => {
          window.removeEventListener("resize", resize);
          window.removeEventListener("deviceorientation", updateOrientation, true);
          renderer.setAnimationLoop(null);
          stream.getTracks().forEach((track) => track.stop());
          video.pause();
          video.srcObject = null;
          disposeModel(gltf.scene);
          renderer.dispose();
          renderer.forceContextLoss();
        },
      };
      runtimeRef.current = runtime;
      acquiredStream = null;
      setState("running");
      setMessage("Namiřte telefon na oblohu a pomalu se otáčejte. Lodě reagují na orientaci telefonu.");
    } catch (error) {
      acquiredStream?.getTracks().forEach((track) => track.stop());
      stop();
      setState("error");
      setMessage(error instanceof Error && error.message === "orientation-denied" ? "Přístup ke kompasu byl zamítnut." : "Sky AR se nepodařilo spustit. Zkontrolujte oprávnění kamery a kompasu.");
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="sky-ar-heading">
      <div className="relative aspect-[3/4] min-h-[460px] overflow-hidden rounded-3xl border border-slate-600 bg-slate-950 shadow-2xl shadow-blue-950/40 sm:aspect-video">
        <div ref={stageRef} className="absolute inset-0" aria-label="Kamera Sky AR" />
        {state !== "running" && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 px-6 text-center text-base font-medium text-white">{message}</div>}
        {state === "running" && <div className="pointer-events-none absolute inset-x-0 top-0 p-4"><p className="inline-block rounded-full border border-slate-600 bg-slate-950/90 px-4 py-2 text-sm font-semibold text-white">Sky AR · 4 lodě</p></div>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => void start()} disabled={state === "loading" || state === "running"} className="rounded-2xl bg-cyan-300 px-5 py-4 text-base font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{state === "loading" ? "Spouštím Sky AR…" : "Spustit Sky AR"}</button>
        <button type="button" onClick={stop} disabled={state !== "running" && state !== "loading"} className="rounded-2xl border-2 border-slate-500 bg-slate-900 px-5 py-4 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500">Zastavit kameru</button>
      </div>
      <div className="rounded-2xl border border-cyan-300/40 bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-100">
        <p id="sky-ar-heading" className="font-bold text-white">Sky AR test</p>
        <p className="mt-1">Experimentální vizuální overlay: lodě jsou orientované podle senzorů telefonu, nejsou geolokačně ani persistentně ukotvené ke skutečné obloze.</p>
      </div>
    </section>
  );
}
