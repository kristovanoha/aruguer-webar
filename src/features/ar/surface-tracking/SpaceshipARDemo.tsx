"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Mesh, MeshStandardMaterial, Object3D } from "three";

type LoadState = "loading" | "ready" | "error";
type ArState = "preview" | "starting" | "placing" | "placed" | "unsupported" | "error";

type LightPosition = {
  position: readonly [number, number, number];
  doubleBlink?: boolean;
};

type BlinkLight = {
  material: MeshStandardMaterial;
  mesh: Mesh;
  nextBlinkAt: number;
  blinkStartedAt: number;
  duration: number;
  doubleBlink: boolean;
};

type SpaceshipRuntime = {
  dispose: () => void;
  endAr: () => void;
  preparePlacement: () => void;
  reset: () => void;
  setBlinking: (enabled: boolean) => void;
  setHovering: (enabled: boolean) => void;
  setModelScale: (scale: number) => void;
  startAr: () => Promise<void>;
};

const spaceshipModelPath = "/models/vesmirnaLod.glb";
const warningLightPositions: LightPosition[] = [
  { position: [-0.42, 0.32, 0.08], doubleBlink: true },
  { position: [0.42, 0.32, 0.08] },
  { position: [-0.48, 0.16, -0.22] },
  { position: [0.48, 0.16, -0.22], doubleBlink: true },
  { position: [-0.28, 0.53, -0.05] },
  { position: [0.28, 0.53, -0.05] },
  { position: [-0.1, 0.65, 0.2], doubleBlink: true },
  { position: [0.1, 0.65, 0.2] },
  { position: [-0.5, 0.08, 0.26] },
  { position: [0.5, 0.08, 0.26] },
];

const engineLightPositions: ReadonlyArray<readonly [number, number, number]> = [
  [-0.18, 0.17, -0.53],
  [0.18, 0.17, -0.53],
];

function createSeededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

export default function SpaceshipARDemo() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<SpaceshipRuntime | null>(null);
  const modelScaleRef = useRef(0.8);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadProgress, setLoadProgress] = useState(0);
  const [arState, setArState] = useState<ArState>("preview");
  const [message, setMessage] = useState("Načítám model vesmírné lodi…");
  const [blinking, setBlinking] = useState(true);
  const [hovering, setHovering] = useState(true);
  const [modelScale, setModelScale] = useState(0.8);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    let session: XRSession | null = null;

    void (async () => {
      const [three, { GLTFLoader }, { OrbitControls }] = await Promise.all([
        import("three"),
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/controls/OrbitControls.js"),
      ]);
      if (disposed) return;

      const renderer = new three.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x020617, 1);
      renderer.xr.enabled = true;
      renderer.outputColorSpace = three.SRGBColorSpace;
      renderer.domElement.className = "h-full w-full touch-none";
      host.appendChild(renderer.domElement);

      const previewScene = new three.Scene();
      previewScene.background = new three.Color(0x020617);
      const arScene = new three.Scene();
      const camera = new three.PerspectiveCamera(38, 1, 0.01, 100);
      camera.position.set(1.9, 1.35, 2.4);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(0, 0.28, 0);
      controls.minDistance = 1.35;
      controls.maxDistance = 4;

      const previewLight = new three.HemisphereLight(0x9fd9ff, 0x07111f, 2.4);
      const keyLight = new three.DirectionalLight(0xffffff, 3.2);
      keyLight.position.set(2, 3, 2);
      previewScene.add(previewLight, keyLight);

      const shipRoot = new three.Group();
      shipRoot.visible = false;
      const visualGroup = new three.Group();
      shipRoot.add(visualGroup);
      previewScene.add(shipRoot);

      const reticleMaterial = new three.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.9 });
      const reticle = new three.Mesh(
        new three.RingGeometry(0.08, 0.11, 32).rotateX(-Math.PI / 2),
        reticleMaterial,
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      arScene.add(reticle);

      const clock = new three.Clock();
      const random = createSeededRandom(95837);
      const blinkLights: BlinkLight[] = [];
      const engineMaterials: MeshStandardMaterial[] = [];
      let blinkingEnabled = true;
      let hoveringEnabled = true;
      let hitTestSource: XRHitTestSource | null = null;
      let referenceSpace: XRReferenceSpace | null = null;
      let arActive = false;
      let placementAllowed = true;
      let modelReady = false;

      const resize = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      const updateLights = (elapsed: number) => {
        for (const light of blinkLights) {
          if (!blinkingEnabled) {
            light.material.emissiveIntensity = 0.08;
            light.mesh.scale.setScalar(0.72);
            continue;
          }
          if (elapsed >= light.nextBlinkAt) {
            light.blinkStartedAt = elapsed;
            light.duration = 0.13 + random() * 0.11;
            light.doubleBlink = random() < 0.2 || light.doubleBlink;
            light.nextBlinkAt = elapsed + 0.7 + random() * 2.3;
          }
          const pulse = (offset: number) => {
            const phase = (elapsed - light.blinkStartedAt - offset) / light.duration;
            return phase > 0 && phase < 1 ? Math.sin(phase * Math.PI) : 0;
          };
          const brightness = Math.max(pulse(0), light.doubleBlink ? pulse(light.duration * 1.45) : 0);
          light.material.emissiveIntensity = 0.12 + brightness * 5.6;
          light.mesh.scale.setScalar(0.7 + brightness * 0.65);
        }
        for (const material of engineMaterials) {
          material.emissiveIntensity = 1.1 + Math.sin(elapsed * 5.5) * 0.2;
        }
      };

      const render = (_time: number, frame?: XRFrame) => {
        const elapsed = clock.getElapsedTime();
        updateLights(elapsed);
        if (hoveringEnabled && shipRoot.visible) {
          visualGroup.position.y = 0.028 + Math.sin(elapsed * 1.05) * 0.012;
          visualGroup.rotation.z = Math.sin(elapsed * 0.65) * 0.018;
          visualGroup.rotation.x = Math.sin(elapsed * 0.52) * 0.012;
        } else {
          visualGroup.position.y = 0;
          visualGroup.rotation.set(0, 0, 0);
        }

        if (arActive && frame && hitTestSource && referenceSpace) {
          const hit = frame.getHitTestResults(hitTestSource)[0];
          const pose = hit?.getPose(referenceSpace);
          if (pose) {
            reticle.visible = placementAllowed;
            reticle.matrix.fromArray(pose.transform.matrix);
          } else {
            reticle.visible = false;
          }
          renderer.render(arScene, camera);
        } else {
          controls.update();
          renderer.render(previewScene, camera);
        }
      };
      renderer.setAnimationLoop(render);

      const placeAtReticle = () => {
        if (!arActive || !placementAllowed || !reticle.visible) return;
        shipRoot.position.setFromMatrixPosition(reticle.matrix);
        shipRoot.quaternion.setFromRotationMatrix(reticle.matrix);
        shipRoot.scale.setScalar(modelScaleRef.current);
        shipRoot.visible = true;
        placementAllowed = false;
        reticle.visible = false;
        setArState("placed");
        setMessage("Loď je ukotvená. Pro přesun zvolte Přemístit loď.");
      };
      renderer.domElement.addEventListener("click", placeAtReticle);

      const restorePreview = () => {
        arActive = false;
        hitTestSource = null;
        referenceSpace = null;
        reticle.visible = false;
        renderer.setClearAlpha(1);
        previewScene.background = new three.Color(0x020617);
        if (shipRoot.parent !== previewScene) previewScene.add(shipRoot);
        shipRoot.visible = modelReady;
        controls.enabled = true;
        session = null;
        setArState("preview");
        setMessage("AR relace byla ukončena. Pokračujte v 3D náhledu.");
      };

      const runtime: SpaceshipRuntime = {
        dispose: () => {
          renderer.domElement.removeEventListener("click", placeAtReticle);
          renderer.setAnimationLoop(null);
          controls.dispose();
          reticle.geometry.dispose();
          reticleMaterial.dispose();
          blinkLights.forEach(({ mesh, material }) => {
            mesh.geometry.dispose();
            material.dispose();
          });
          engineMaterials.forEach((material) => material.dispose());
          shipRoot.traverse((object: Object3D) => {
            const mesh = object as Mesh;
            if (!mesh.isMesh) return;
            mesh.geometry.dispose();
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((material) => material.dispose());
          });
          renderer.dispose();
          renderer.domElement.remove();
          if (session) void session.end();
        },
        endAr: () => {
          if (session) void session.end();
        },
        preparePlacement: () => {
          if (!arActive) return;
          shipRoot.visible = false;
          placementAllowed = true;
          setArState("placing");
          setMessage("Pohybujte telefonem nad rovnou plochou a klepněte na modrý indikátor.");
        },
        reset: () => {
          shipRoot.visible = false;
          placementAllowed = true;
          if (arActive) {
            setArState("placing");
            setMessage("Scéna je resetovaná. Najděte znovu rovnou plochu.");
          }
        },
        setBlinking: (enabled) => {
          blinkingEnabled = enabled;
        },
        setHovering: (enabled) => {
          hoveringEnabled = enabled;
        },
        setModelScale: (scale) => {
          shipRoot.scale.setScalar(scale);
        },
        startAr: async () => {
          const xrNavigator = navigator as Navigator & {
            xr?: {
              isSessionSupported: (mode: string) => Promise<boolean>;
              requestSession: (mode: string, options: object) => Promise<XRSession>;
            };
          };
          if (!modelReady || !xrNavigator.xr || !(await xrNavigator.xr.isSessionSupported("immersive-ar"))) {
            setArState("unsupported");
            setMessage("Tento prohlížeč nepodporuje WebXR hit-test. Interaktivní 3D náhled zůstává dostupný; iOS vyžaduje samostatný USDZ asset pro AR Quick Look.");
            return;
          }
          setArState("starting");
          setMessage("Spouštím AR a hledám vodorovnou plochu…");
          try {
            const nextSession = await xrNavigator.xr.requestSession("immersive-ar", {
              requiredFeatures: ["hit-test"],
              optionalFeatures: ["local-floor", "dom-overlay"],
              domOverlay: { root: document.body },
            });
            if (!nextSession.requestHitTestSource) throw new Error("WebXR hit-test is unavailable.");
            session = nextSession;
            nextSession.addEventListener("end", restorePreview);
            const viewerSpace = await nextSession.requestReferenceSpace("viewer");
            referenceSpace = await nextSession.requestReferenceSpace("local");
            const nextHitTestSource = await nextSession.requestHitTestSource({ space: viewerSpace });
            if (!nextHitTestSource) throw new Error("WebXR hit-test source is unavailable.");
            hitTestSource = nextHitTestSource;
            renderer.setClearAlpha(0);
            previewScene.background = null;
            previewScene.remove(shipRoot);
            arScene.add(shipRoot);
            shipRoot.visible = false;
            controls.enabled = false;
            arActive = true;
            placementAllowed = true;
            await renderer.xr.setSession(nextSession);
            setArState("placing");
            setMessage("Namiřte kameru na zem. Modrý indikátor označí nalezenou plochu.");
          } catch {
            restorePreview();
            setArState("error");
            setMessage("AR relaci se nepodařilo spustit. Zkontrolujte HTTPS, oprávnění kamery a podporu ARCore.");
          }
        },
      };
      runtimeRef.current = runtime;

      const loader = new GLTFLoader();
      loader.load(
        spaceshipModelPath,
        (gltf) => {
          if (disposed) return;
          const box = new three.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new three.Vector3());
          const center = box.getCenter(new three.Vector3());
          const largestDimension = Math.max(size.x, size.y, size.z);
          if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
            setLoadState("error");
            setMessage("Model nemá platné rozměry.");
            return;
          }
          gltf.scene.position.set(-center.x, -box.min.y, -center.z);
          gltf.scene.scale.setScalar(1 / largestDimension);
          visualGroup.add(gltf.scene);

          for (const [index, light] of warningLightPositions.entries()) {
            const material = new three.MeshStandardMaterial({
              color: 0xff3b30,
              emissive: 0xff0000,
              emissiveIntensity: 0.2,
              roughness: 0.25,
            });
            const mesh = new three.Mesh(new three.SphereGeometry(0.018, 12, 12), material);
            mesh.position.fromArray(light.position);
            visualGroup.add(mesh);
            blinkLights.push({
              material,
              mesh,
              nextBlinkAt: random() * 2.3,
              blinkStartedAt: -1,
              duration: 0.16,
              doubleBlink: light.doubleBlink ?? index % 4 === 0,
            });
          }
          for (const position of engineLightPositions) {
            const material = new three.MeshStandardMaterial({
              color: 0x38bdf8,
              emissive: 0x0284c7,
              emissiveIntensity: 1.2,
              roughness: 0.2,
            });
            const mesh = new three.Mesh(new three.SphereGeometry(0.034, 14, 14), material);
            mesh.position.fromArray(position);
            visualGroup.add(mesh);
            engineMaterials.push(material);
          }

          modelReady = true;
          shipRoot.visible = true;
          shipRoot.scale.setScalar(modelScaleRef.current);
          setLoadProgress(100);
          setLoadState("ready");
          setMessage("3D náhled je připraven. Model můžete otáčet a přibližovat.");
        },
        (event) => {
          if (event.lengthComputable) setLoadProgress(Math.round((event.loaded / event.total) * 100));
        },
        () => {
          if (disposed) return;
          setLoadState("error");
          setMessage("Model vesmírné lodi se nepodařilo načíst.");
        },
      );
    })().catch(() => {
      setLoadState("error");
      setMessage("3D renderer se nepodařilo inicializovat.");
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, []);

  const startAr = useCallback(() => void runtimeRef.current?.startAr(), []);
  const preparePlacement = useCallback(() => runtimeRef.current?.preparePlacement(), []);
  const reset = useCallback(() => runtimeRef.current?.reset(), []);
  const endAr = useCallback(() => runtimeRef.current?.endAr(), []);

  const updateBlinking = (enabled: boolean) => {
    setBlinking(enabled);
    runtimeRef.current?.setBlinking(enabled);
  };
  const updateHovering = (enabled: boolean) => {
    setHovering(enabled);
    runtimeRef.current?.setHovering(enabled);
  };
  const updateScale = (value: number) => {
    modelScaleRef.current = value;
    setModelScale(value);
    runtimeRef.current?.setModelScale(value);
  };

  const arAvailable = arState === "placing" || arState === "placed";

  return (
    <section className="space-y-4" aria-labelledby="spaceship-ar-heading">
      <div className="relative aspect-[3/4] min-h-[460px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-blue-950/30 sm:aspect-video">
        <div ref={hostRef} className="absolute inset-0" />
        {loadState !== "ready" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/85 px-6 text-center text-sm text-slate-300">
            <span>{loadState === "error" ? message : "Načítám model vesmírné lodi…"}</span>
            {loadState === "loading" && <span className="text-xs text-blue-200">{loadProgress} %</span>}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between gap-2 p-3 text-xs">
          <span className="rounded-full bg-slate-950/75 px-3 py-1.5 text-slate-200 backdrop-blur">
            {arAvailable ? "WebXR hit-test" : "3D náhled"}
          </span>
          <span className="rounded-full bg-slate-950/75 px-3 py-1.5 text-slate-200 backdrop-blur">{modelScale.toFixed(1)} m</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={startAr}
          disabled={loadState !== "ready" || arAvailable || arState === "starting"}
          className="rounded-2xl bg-blue-400 px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Spustit AR
        </button>
        <button
          type="button"
          onClick={preparePlacement}
          disabled={!arAvailable}
          className="rounded-2xl border border-white/15 px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {arState === "placed" ? "Přemístit loď" : "Umístit loď"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button type="button" onClick={() => updateBlinking(!blinking)} className="rounded-2xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-300/20">
          Světla: {blinking ? "zapnutá" : "vypnutá"}
        </button>
        <button type="button" onClick={() => updateHovering(!hovering)} className="rounded-2xl border border-blue-300/30 bg-blue-300/10 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-300/20">
          Vznášení: {hovering ? "zapnuté" : "vypnuté"}
        </button>
        <button type="button" onClick={reset} disabled={!arAvailable} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40">
          Resetovat scénu
        </button>
        <button type="button" onClick={endAr} disabled={!arAvailable} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40">
          Ukončit AR
        </button>
      </div>

      <label className="block rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-300">
        <span className="flex justify-between gap-4"><span>Velikost lodi</span><span>{modelScale.toFixed(1)} m</span></span>
        <input className="mt-2 w-full accent-blue-300" type="range" min="0.4" max="1.4" step="0.1" value={modelScale} onChange={(event) => updateScale(Number(event.target.value))} />
      </label>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-slate-400" role="status">
        <p id="spaceship-ar-heading" className="font-medium text-slate-200">Vesmírná loď – AR demo</p>
        <p>{message}</p>
        <p className="mt-1 text-slate-500">iOS Safari WebXR hit-test nepodporuje; bez samostatného USDZ assetu nelze nabídnout AR Quick Look. V tomto případě zůstává 3D náhled.</p>
      </div>
    </section>
  );
}
