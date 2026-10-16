# Architektura

## Účel

ARuguer Reality je jedna Next.js aplikace s App Routerem. Aktuální verze je
frontendový WebAR prototyp bez API, databáze, autentizace a serverové
business logiky.

## Současné vrstvy

Tok požadavku:

    Browser
      -> Next.js App Router
        -> src/app/page.tsx nebo src/app/ar/demo/page.tsx
          -> UI a client komponenty
            -> @google/model-viewer
              -> public/models/demo-house.glb
              -> WebXR nebo Android Scene Viewer

Odpovědnosti:

- src/app – routing, metadata a stránky.
- src/features/ar – implementace konkrétních AR režimů.
- public – statické assety dostupné přes URL.
- package.json – runtime a vývojové závislosti.
- next.config.ts – Next.js runtime konfigurace.

## Implementované části

- Route /: prezentační úvodní stránka s přehledem plánovaných režimů.
- Route /ar/demo: demonstrace Surface AR.
- ARModelViewer: client komponenta, dynamické načtení knihovny, viewer,
  loading/error stav a aktivace AR.
- demo-house.glb: lokální vlastní demonstrační model bez externího assetu.

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
- UI a AR stav jsou zatím lokální v jediné komponentě.
- Chybí automatizované testy a fyzické device testy.
- Dopad cacheComponents a partialPrefetching na produkční WebAR je ověřen
  pouze buildem, nikoli provozním monitoringem.
