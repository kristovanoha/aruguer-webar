"use client";

import { useEffect, useRef, useState } from "react";

type Quality = "low" | "medium" | "high";
type DisplayMode = "viewer" | "ar";

const ICE_WALL_MODEL = "/models/ice-wall.glb";
const WALL_HEIGHTS = [100, 300, 500] as const;
const QUALITY_SEGMENTS: Record<Quality, number> = { low: 7, medium: 11, high: 17 };
const QUALITY_SNOW: Record<Quality, number> = { low: 160, medium: 380, high: 720 };

export default function InfiniteIceWallDemo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<{ reset: () => void; startAr: () => Promise<void>; setHeight: (height: number) => void; setFog: (density: number) => void; setSnow: (enabled: boolean) => void; setQuality: (quality: Quality) => void; dispose: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Načítám scénu ledové zdi…");
  const [height, setHeight] = useState<(typeof WALL_HEIGHTS)[number]>(300);
  const [fogDensity, setFogDensity] = useState(0.008);
  const [snowEnabled, setSnowEnabled] = useState(true);
  const [quality, setQuality] = useState<Quality>("medium");
  const [debugVisible, setDebugVisible] = useState(false);
  const [debug, setDebug] = useState("Připravuji diagnostiku…");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("viewer");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;

    void (async () => {
      const [THREE, { OrbitControls }, { GLTFLoader }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/controls/OrbitControls.js"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
      ]);
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x95b7c9, 1);
      renderer.xr.enabled = true;
      renderer.domElement.className = "h-full w-full touch-none";
      host.append(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0xb7d5e2, 0.008);
      const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1200);
      camera.position.set(16, 5, 25);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.maxPolarAngle = Math.PI * 0.49;
      controls.target.set(0, 24, 0);

      scene.add(new THREE.HemisphereLight(0xdaf4ff, 0x172634, 2.1));
      const keyLight = new THREE.DirectionalLight(0xe4f8ff, 2.3);
      keyLight.position.set(-40, 90, 30);
      scene.add(keyLight);

      const wallAnchor = new THREE.Group();
      wallAnchor.visible = true;
      scene.add(wallAnchor);
      const topHaze = new THREE.Mesh(
        new THREE.PlaneGeometry(760, 120),
        new THREE.MeshBasicMaterial({ color: 0xe4f6fb, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }),
      );
      topHaze.rotation.y = Math.PI;
      topHaze.position.set(0, 250, 1.5);
      wallAnchor.add(topHaze);

      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.22, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x98eaff, transparent: true, opacity: 0.9 }),
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      const snowGeometry = new THREE.BufferGeometry();
      const snowMaterial = new THREE.PointsMaterial({ color: 0xf5fdff, size: 0.045, transparent: true, opacity: 0.72, depthWrite: false });
      const snow = new THREE.Points(snowGeometry, snowMaterial);
      scene.add(snow);

      let currentHeight = 300;
      let currentFogDensity = 0.008;
      let currentQuality: Quality = "medium";
      let currentSnowEnabled = true;
      let modelDimensions: { width: number; height: number; depth: number } | null = null;
      let wallMesh: import("three").Object3D | null = null;
      let usingModel = false;
      let wallPlaced = true;
      let arSession: XRSession | null = null;
      let hitTestSource: XRHitTestSource | null = null;
      let localSpace: XRReferenceSpace | null = null;
      let lastDebug = 0;
      let frames = 0;
      let fps = 0;

      const disposeWall = () => {
        if (!wallMesh) return;
        wallAnchor.remove(wallMesh);
        wallMesh.traverse((child) => {
          const mesh = child as import("three").Object3D & { geometry?: import("three").BufferGeometry; material?: import("three").Material | import("three").Material[] };
          mesh.geometry?.dispose();
          const materials = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
          materials.forEach((material) => material.dispose());
        });
        wallMesh = null;
      };

      const createPlaceholderWall = () => {
        const group = new THREE.Group();
        const segmentCount = QUALITY_SEGMENTS[currentQuality];
        const segmentWidth = 38;
        const columnWidth = 3.8;
        const columnCount = segmentCount * 10;
        const iceGeometry = new THREE.BoxGeometry(columnWidth * 0.94, 1, 3.2);
        const iceMaterial = new THREE.MeshStandardMaterial({ color: 0x8ac7dc, roughness: 0.38, metalness: 0.04, transparent: true, opacity: 0.92 });
        const ice = new THREE.InstancedMesh(iceGeometry, iceMaterial, columnCount);
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        for (let index = 0; index < columnCount; index += 1) {
          const row = Math.floor(index / 10);
          const column = index % 10;
          const x = (row - (segmentCount - 1) / 2) * segmentWidth + (column - 4.5) * columnWidth;
          const variation = 0.78 + ((row * 17 + column * 11) % 19) / 55;
          position.set(x, currentHeight * 0.5, ((row + column) % 3 - 1) * 0.28);
          scale.set(1, currentHeight * variation, 1);
          matrix.compose(position, quaternion, scale);
          ice.setMatrixAt(index, matrix);
        }
        ice.instanceMatrix.needsUpdate = true;
        group.add(ice);

        const rockGeometry = new THREE.BoxGeometry(3.2, 1, 4.4);
        const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x34556b, roughness: 0.9 });
        const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, segmentCount * 2);
        for (let index = 0; index < segmentCount * 2; index += 1) {
          const x = (index - (segmentCount * 2 - 1) / 2) * (segmentWidth / 2);
          position.set(x, 1.6, 1.6);
          scale.set(1, 3 + (index % 3), 1);
          matrix.compose(position, quaternion, scale);
          rocks.setMatrixAt(index, matrix);
        }
        rocks.instanceMatrix.needsUpdate = true;
        group.add(rocks);
        modelDimensions = { width: segmentWidth, height: 1, depth: 4.4 };
        return group;
      };

      const rebuildWall = () => {
        disposeWall();
        wallMesh = createPlaceholderWall();
        wallAnchor.add(wallMesh);
        topHaze.position.y = currentHeight * 0.83;
        topHaze.scale.y = Math.max(1, currentHeight / 120);
      };

      const rebuildSnow = () => {
        const count = currentSnowEnabled ? QUALITY_SNOW[currentQuality] : 0;
        const positions = new Float32Array(count * 3);
        for (let index = 0; index < count; index += 1) {
          const seed = (index * 37) % 997;
          positions[index * 3] = (seed % 85) - 42;
          positions[index * 3 + 1] = ((seed * 13) % 100) / 100 * Math.min(currentHeight, 80);
          positions[index * 3 + 2] = ((seed * 29) % 46) - 22;
        }
        snowGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        snow.visible = currentSnowEnabled;
      };

      const tryLoadModel = async () => {
        try {
          const response = await fetch(ICE_WALL_MODEL, { method: "HEAD" });
          if (!response.ok) return;
          const gltf = await new GLTFLoader().loadAsync(ICE_WALL_MODEL);
          if (disposed) return;
          const bounds = new THREE.Box3().setFromObject(gltf.scene);
          const size = bounds.getSize(new THREE.Vector3());
          if (size.x <= 0 || size.y <= 0 || size.z <= 0) return;
          modelDimensions = { width: size.x, height: size.y, depth: size.z };
          usingModel = true;
          disposeWall();
          const group = new THREE.Group();
          const segments = QUALITY_SEGMENTS[currentQuality];
          const scale = currentHeight / size.y;
          for (let index = 0; index < segments; index += 1) {
            const segment = gltf.scene.clone(true);
            segment.position.set((index - (segments - 1) / 2) * size.x * scale, -bounds.min.y * scale, 0);
            segment.scale.setScalar(scale);
            group.add(segment);
          }
          wallMesh = group;
          wallAnchor.add(group);
          topHaze.position.y = currentHeight * 0.83;
          topHaze.scale.y = Math.max(1, currentHeight / 120);
          setMessage("Načten model ledové zdi. Segmenty jsou zarovnané podle skutečné šířky modelu.");
        } catch {
          // The procedural placeholder remains available if the optional asset cannot load.
        }
      };

      const resize = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      const resizeObserver = new ResizeObserver(resize);
      resize();
      resizeObserver.observe(host);
      rebuildWall();
      rebuildSnow();
      void tryLoadModel();

      const reset = () => {
        wallAnchor.visible = true;
        wallAnchor.position.set(0, 0, 0);
        wallAnchor.quaternion.identity();
        wallPlaced = false;
        setMessage(arSession ? "Najděte plochu a klepnutím zeď umístěte." : "Zeď je resetovaná do 3D náhledu.");
      };

      const placeWall = () => {
        if (!reticle.visible) return;
        wallAnchor.position.setFromMatrixPosition(reticle.matrix);
        wallAnchor.quaternion.setFromRotationMatrix(reticle.matrix);
        wallAnchor.visible = true;
        reticle.visible = false;
        wallPlaced = true;
        setMessage("Ledová zeď je umístěná. Můžete podél ní chodit a dívat se vzhůru.");
      };

      const onSelect = () => placeWall();
      const startAr = async () => {
        if (!navigator.xr) {
          setMessage("Tento prohlížeč nepodporuje WebXR AR. Zůstává přesný 3D náhled; iOS Safari nepodporuje tuto procedurální scénu.");
          return;
        }
        const supported = await navigator.xr.isSessionSupported("immersive-ar");
        if (!supported) {
          setMessage("WebXR AR není na tomto zařízení podporované. Zůstává 3D náhled bez předstírání ukotvení.");
          return;
        }
        try {
          const session = await navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["hit-test"] });
          if (!session.requestHitTestSource) throw new Error("WebXR hit-test is unavailable.");
          arSession = session;
          session.addEventListener("select", onSelect);
          session.addEventListener("end", () => {
            arSession = null;
            hitTestSource?.cancel();
            hitTestSource = null;
            localSpace = null;
            reticle.visible = false;
            controls.enabled = true;
            setDisplayMode("viewer");
            setMessage("AR relace byla ukončena. Pokračujete v 3D náhledu.");
          }, { once: true });
          await renderer.xr.setSession(session);
          const viewerSpace = await session.requestReferenceSpace("viewer");
          localSpace = await session.requestReferenceSpace("local");
          const source = await session.requestHitTestSource({ space: viewerSpace });
          if (!source) throw new Error("WebXR hit-test source is unavailable.");
          hitTestSource = source;
          controls.enabled = false;
          wallAnchor.visible = false;
          wallPlaced = false;
          setDisplayMode("ar");
          setMessage("Namiřte kameru na vodorovnou plochu a klepnutím umístěte zeď.");
        } catch {
          setMessage("AR relaci se nepodařilo spustit. Zkontrolujte oprávnění kamery a podporu ARCore.");
        }
      };

      const render = (time: number, frame?: XRFrame) => {
        frames += 1;
        if (arSession && frame && hitTestSource && localSpace && !wallPlaced) {
          const hit = frame.getHitTestResults(hitTestSource)[0];
          const pose = hit?.getPose(localSpace);
          reticle.visible = Boolean(pose);
          if (pose) reticle.matrix.fromArray(pose.transform.matrix);
        } else if (!arSession) {
          controls.update();
        }
        if (currentSnowEnabled) snow.position.x = Math.sin(time / 4500) * 1.2;
        renderer.render(scene, camera);
        if (time - lastDebug > 1000) {
          fps = frames * 1000 / Math.max(time - lastDebug, 1);
          frames = 0;
          lastDebug = time;
          const triangles = renderer.info.render.triangles;
          const calls = renderer.info.render.calls;
          const dimensions = modelDimensions ? `${modelDimensions.width.toFixed(1)} × ${modelDimensions.height.toFixed(1)} × ${modelDimensions.depth.toFixed(1)} m` : "nezjištěno";
          setDebug(`${fps.toFixed(0)} FPS · ${QUALITY_SEGMENTS[currentQuality]} segmentů · ${triangles.toLocaleString("cs-CZ")} trojúhelníků · ${calls} draw calls · GLB: ${dimensions} · výška: ${currentHeight} m · režim: ${arSession ? "WebXR hit-test" : "3D viewer"} · zdroj: ${usingModel ? "GLB" : "procedurální placeholder"}`);
        }
      };
      renderer.setAnimationLoop(render);

      runtimeRef.current = {
        reset,
        startAr,
        setHeight: (value) => {
          currentHeight = value;
          rebuildWall();
          rebuildSnow();
          controls.target.y = Math.min(value * 0.08, 45);
        },
        setFog: (value) => {
          currentFogDensity = value;
          (scene.fog as import("three").FogExp2).density = currentFogDensity;
        },
        setSnow: (enabled) => {
          currentSnowEnabled = enabled;
          rebuildSnow();
        },
        setQuality: (value) => {
          currentQuality = value;
          rebuildWall();
          rebuildSnow();
        },
        dispose: () => {
          renderer.setAnimationLoop(null);
          hitTestSource?.cancel();
          void arSession?.end();
          resizeObserver.disconnect();
          disposeWall();
          snowGeometry.dispose();
          snowMaterial.dispose();
          topHaze.geometry.dispose();
          (topHaze.material as import("three").Material).dispose();
          reticle.geometry.dispose();
          (reticle.material as import("three").Material).dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          host.replaceChildren();
        },
      };
      setReady(true);
      setMessage("Procedurální ledová zeď je připravená. Pro skutečný Meshy model nahrajte public/models/ice-wall.glb.");
    })().catch(() => setMessage("3D scénu se nepodařilo načíst. Zkuste stránku obnovit."));

    return () => {
      disposed = true;
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, []);

  const updateHeight = (value: (typeof WALL_HEIGHTS)[number]) => {
    setHeight(value);
    runtimeRef.current?.setHeight(value);
  };
  const updateFog = (value: number) => {
    setFogDensity(value);
    runtimeRef.current?.setFog(value);
  };
  const updateSnow = (enabled: boolean) => {
    setSnowEnabled(enabled);
    runtimeRef.current?.setSnow(enabled);
  };
  const updateQuality = (value: Quality) => {
    setQuality(value);
    runtimeRef.current?.setQuality(value);
  };

  return (
    <section className="space-y-4" aria-labelledby="infinite-wall-heading">
      <div className="relative min-h-[500px] overflow-hidden rounded-3xl border border-cyan-100/30 bg-slate-950 shadow-2xl shadow-cyan-950/30">
        <div ref={hostRef} className="absolute inset-0" aria-label="3D náhled nekonečné ledové zdi" />
        {!ready && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90 px-6 text-center font-medium text-white">{message}</div>}
        {ready && <p className="pointer-events-none absolute left-4 top-4 rounded-full border border-cyan-100/40 bg-slate-950/80 px-3 py-2 text-xs font-bold uppercase tracking-wider text-cyan-50">{displayMode === "ar" ? "WebXR AR · hit-test" : "3D viewer"}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => void runtimeRef.current?.startAr()} disabled={!ready} className="rounded-2xl bg-cyan-200 px-5 py-4 text-base font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">Spustit AR</button>
        <button type="button" onClick={() => runtimeRef.current?.reset()} disabled={!ready} className="rounded-2xl border-2 border-slate-500 bg-slate-900 px-5 py-4 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500">Resetovat umístění</button>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-300">Výška zdi</p>
        <div className="grid grid-cols-3 gap-2">{WALL_HEIGHTS.map((value) => <button key={value} type="button" onClick={() => updateHeight(value)} aria-pressed={height === value} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${height === value ? "bg-cyan-200 text-slate-950" : "border border-slate-600 text-white hover:bg-slate-800"}`}>{value} m</button>)}</div>
        <label className="mt-4 block text-sm font-semibold text-slate-100">Hustota mlhy: {fogDensity.toFixed(3)}<input className="mt-2 h-2 w-full accent-cyan-200" type="range" min="0.002" max="0.02" step="0.001" value={fogDensity} onChange={(event) => updateFog(Number(event.target.value))} /></label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => updateSnow(!snowEnabled)} className="rounded-2xl border border-slate-600 bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800">Sněžení: {snowEnabled ? "zapnuté" : "vypnuté"}</button>
        <select aria-label="Kvalita vykreslení" value={quality} onChange={(event) => updateQuality(event.target.value as Quality)} className="rounded-2xl border border-slate-600 bg-slate-900 px-4 py-3 font-bold text-white"><option value="low">Kvalita: Low</option><option value="medium">Kvalita: Medium</option><option value="high">Kvalita: High</option></select>
        <button type="button" onClick={() => setDebugVisible((value) => !value)} className="rounded-2xl border border-slate-600 bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800">Debug: {debugVisible ? "skrýt" : "zobrazit"}</button>
      </div>

      <div className="rounded-2xl border border-cyan-200/30 bg-cyan-200/10 px-4 py-3 text-sm leading-6 text-cyan-50" role="status"><p id="infinite-wall-heading" className="font-bold">Nekonečná ledová zeď</p><p>{message}</p></div>
      {debugVisible && <p className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 text-cyan-100">{debug}</p>}
    </section>
  );
}
