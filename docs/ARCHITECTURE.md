# Architektura

## Účel

ARuguer Reality je jedna Next.js aplikace s App Routerem. Aktuální verze je
frontendový WebAR prototyp bez API, databáze, autentizace a serverové
business logiky.

## Současné vrstvy

Tok požadavku:

    Browser
      -> Next.js App Router
        -> src/app/page.tsx, src/app/ar/demo/page.tsx,
           src/app/ar/image/demo/page.tsx nebo
           src/app/ar/object-tracking/demo/page.tsx, src/app/ar/object-tracking/yolox-demo/page.tsx nebo
           src/app/ar/spaceship/page.tsx, src/app/ar/focke-wolf-190/page.tsx,
           src/app/ar/demo/infinite-wall/page.tsx nebo src/app/ar/sky/page.tsx
          -> UI a client komponenty
            -> @google/model-viewer, MindAR + Three.js, MediaPipe nebo ONNX Runtime Web
              -> public/models/netvorBeh.glb, public/models/vesmirnaLod.glb, public/models/fockeWolf190.glb, public/models/ai/yolox_nano.onnx
                 nebo public/targets/house-target.mind
              -> WebXR, Android Scene Viewer nebo camera-based image tracking

Odpovědnosti:

- src/app – routing, metadata a stránky.
- src/features/ar – implementace konkrétních AR režimů.
- public – statické assety dostupné přes URL.
- package.json – runtime a vývojové závislosti.
- next.config.ts – Next.js runtime konfigurace.

## Implementované části

- Route /: prezentační úvodní stránka s přehledem plánovaných režimů.
- Route /ar/demo: demonstrace Surface AR.
- Route /ar/image/demo: demonstrace Image Tracking s referenčním obrázkem.
- Route /ar/spaceship: samostatné AR demo vesmírné lodi přes @google/model-viewer.
- Route /ar/focke-wolf-190: samostatné Surface AR demo letounu přes @google/model-viewer.
- Route /ar/demo/infinite-wall: procedurální Three.js ledová zeď s WebXR hit-testem.
- Route /ar/object-tracking/yolox-demo: nezávislá foto/kamera diagnostika hodin přes YOLOX Nano a ONNX Runtime Web.
- Route /ar/sky: experimentální camera overlay s relativní orientací po
  kalibraci a více instancemi stejného modelu; funguje i jako Screen AR bez
  senzorů.
- ARModelViewer: client komponenta, dynamické načtení knihovny, viewer,
  loading/error stav a aktivace AR.
- ImageTrackingDemo: client komponenta s dynamickým načtením MindAR, Three.js
  a GLTFLoader; řídí camera session, anchor a cleanup.
- ObjectTrackingDemo: client komponenta s dynamickým načtením Google MediaPipe
  Tasks Vision a Object Detectoru s EfficientDet-Lite2 int8; řídí kameru,
  lokální detekci hodin, EMA stabilizaci, překryv a cleanup.
- YoloXClockDetectionDemo: client komponenta s dynamickým načtením ONNX Runtime Web;
  provádí lokální YOLOX Nano inferenci, NMS, diagnostiku a volitelný image overlay.
- SpaceshipARDemo: client komponenta s dynamickým načtením @google/model-viewer;
  používá stejný WebXR/Scene Viewer mechanismus jako ARModelViewer.
- FockeWolf190ARDemo: client komponenta s dynamickým načtením @google/model-viewer;
  umístí model letounu na plochu přes WebXR/Scene Viewer.
- InfiniteIceWallDemo: client komponenta s instancovaným procedurálním fallbackem,
  mlhou, 3D viewerem a volitelným WebXR hit-testem.
- SkyARDemo: client komponenta s dynamickým načtením Three.js a GLTFLoaderu;
  vlastní camera stream, relativní orientační listener, Screen AR fallback,
  transparentní renderer a cleanup.
- netvorBeh.glb: uživatelský demonstrační model pro Surface AR a Image Tracking.
- vesmirnaLod.glb: uživatelský demonstrační model pro Spaceship AR demo.
- fockeWolf190.glb: uživatelský demonstrační model pro Surface AR demo letounu.
- house-target.png a house-target.mind: přiložený obrázek a jeho MindAR
  feature data.

## Plánované hranice

Každý další AR režim má být samostatný feature modul. Nesmí přímo záviset na
implementaci jiného tracking enginu. Sdílené kontrakty patří do společné
vrstvy pouze tehdy, pokud skutečně sjednocují lifecycle nebo business data.

Budoucí backendové vrstvy mají být odděleny od UI:

    UI -> services -> lib/supabase nebo API route -> Supabase

Tato vrstva zatím neexistuje a nesmí být považována za implementovanou.

## Lifecycle a bezpečnost

Browser-only knihovny se načítají pouze v client komponentách. Kamera a AR
session musí být aktivovány akcí uživatele, pokud to vyžaduje prohlížeč.
Nové AR moduly musí při ukončení uvolnit camera streamy, event listenery,
animation frames, WebGL prostředky a tracking session.

Do klientského bundle nikdy nepatří service-role klíče, databázová hesla ani
jiné tajné údaje. Autorizace musí být vynucena serverově a pomocí RLS.

## Známé architektonické mezery

- Neexistuje sdílený AR lifecycle kontrakt ani společný error model.
- Neexistují API routes, services, typy doménových dat ani Supabase klient.
- UI a AR stav jsou zatím lokální v jednotlivých demo komponentách.
- Chybí automatizované testy a fyzické device testy.
- MindAR 1.2.5 má starší dependency strom a je nutné sledovat jeho údržbu;
  současné řešení používá cílený alias fs kvůli jeho Node-only compiler větvi.
- Dopad cacheComponents a partialPrefetching na produkční WebAR je ověřen
  pouze buildem, nikoli provozním monitoringem.
