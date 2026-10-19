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
           src/app/ar/object-tracking/demo/page.tsx nebo
           src/app/ar/spaceship/page.tsx nebo src/app/ar/sky/page.tsx
          -> UI a client komponenty
            -> @google/model-viewer nebo MindAR + Three.js
              -> public/models/netvorBeh.glb, public/models/vesmirnaLod.glb
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
- Route /ar/sky: experimentální camera overlay s orientačními senzory a více
  instancemi stejného modelu.
- ARModelViewer: client komponenta, dynamické načtení knihovny, viewer,
  loading/error stav a aktivace AR.
- ImageTrackingDemo: client komponenta s dynamickým načtením MindAR, Three.js
  a GLTFLoader; řídí camera session, anchor a cleanup.
- ObjectTrackingDemo: client komponenta s dynamickým načtením Google MediaPipe
  Tasks Vision a Object Detectoru; řídí kameru, lokální detekci hodin, EMA
  stabilizaci, překryv a cleanup.
- SpaceshipARDemo: client komponenta s dynamickým načtením @google/model-viewer;
  používá stejný WebXR/Scene Viewer mechanismus jako ARModelViewer.
- SkyARDemo: client komponenta s dynamickým načtením Three.js a GLTFLoaderu;
  vlastní camera stream, orientační listener, transparentní renderer a cleanup.
- netvorBeh.glb: uživatelský demonstrační model pro Surface AR a Image Tracking.
- vesmirnaLod.glb: uživatelský demonstrační model pro Spaceship AR demo.
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
