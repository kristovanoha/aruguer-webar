# Struktura projektu

## Kořen

| Cesta | Odpovědnost | Stav |
| --- | --- | --- |
| AGENTS.md | Pravidla pro Codex a vývojové workflow | Implementováno |
| README.md | Krátký onboarding a nasazení | Implementováno |
| package.json | Skripty a závislosti | Implementováno |
| package-lock.json | Reprodukovatelný npm strom | Implementováno |
| next.config.ts | Konfigurace Next.js | Implementováno |
| tsconfig.json | Strict TypeScript a alias @/* | Implementováno |
| eslint.config.mjs | ESLint pravidla Next.js | Implementováno |
| src/empty-module.ts | Browser placeholder pro MindAR Node-only fs větev | Implementováno |

## Technologie a závislosti

Verze odpovídají package.json a package-lock.json:

- Next.js 16.4.2 s App Routerem.
- React a react-dom 19.3.0.
- TypeScript 5.9.3 v devDependencies.
- Tailwind CSS 4.3.3 a @tailwindcss/turbopack.
- ESLint 9 a eslint-config-next 16.4.2.
- @google/model-viewer 3.4.0 pro 3D viewer a Surface AR; verze je sladěná s
  Three.js 0.160.0 kvůli kompatibilitě s MindAR 1.2.5.
- @mediapipe/tasks-vision 0.10.35 (Apache-2.0) pro lokální Object Detector.

Další AR frameworky a Supabase SDK nejsou v současných závislostech
implementované.

## Aplikace

| Cesta | Odpovědnost | Stav |
| --- | --- | --- |
| src/app/layout.tsx | Root layout, fonty a globální metadata | Implementováno |
| src/app/globals.css | Globální CSS a Tailwind import | Implementováno |
| src/app/page.tsx | Úvodní landing page a odkaz na AR demo | Implementováno |
| src/app/ar/demo/page.tsx | Route /ar/demo a kontext Surface AR | Implementováno |
| src/app/ar/image/demo/page.tsx | Route /ar/image/demo a Image Tracking UI | Implementováno |
| src/app/ar/spaceship/page.tsx | Route /ar/spaceship a kontext WebXR dema vesmírné lodi | Implementováno |
| src/app/ar/sky/page.tsx | Route /ar/sky a kontext experimentálního Sky AR | Implementováno |
| src/features/ar/surface-tracking/ARModelViewer.tsx | Client-only 3D viewer a AR aktivace | Implementováno |
| src/features/ar/image-tracking/ImageTrackingDemo.tsx | Client-only MindAR lifecycle a anchor | Implementováno |
| src/features/ar/image-tracking/mind-ar.d.ts | TypeScript kontrakt pro MindAR runtime | Implementováno |
| src/features/ar/object-tracking/ObjectTrackingDemo.tsx | Client-only AI detekce hodin, kamera a image overlay | Implementováno jako demo |
| src/features/ar/surface-tracking/SpaceshipARDemo.tsx | Client-only @google/model-viewer 3D náhled a aktivace AR vesmírné lodi | Implementováno jako demo |
| src/features/ar/location-tracking/SkyARDemo.tsx | Client-only kamera, orientační senzory a více lodí ve Sky AR overlay | Implementováno jako experiment |

## Assety

| Cesta | Odpovědnost | Stav |
| --- | --- | --- |
| public/models/netvorBeh.glb | Lokální GLB model netvora pro Surface AR a Image Tracking | Implementováno |
| public/models/vesmirnaLod.glb | Lokální GLB model vesmírné lodi (přibližně 83 MB) | Implementováno jako demo |
| public/ar/overlays/clock-overlay.png | Dočasný image overlay pro AI Object Tracking | Implementováno jako placeholder |
| public/targets/house-target.png | Referenční obrázek dodaný uživatelem | Implementováno |
| public/targets/house-target.mind | Zkompilovaná MindAR data targetu | Implementováno |
| public/*.svg | Výchozí statické assety z bootstrapu | Implementováno, bez AR odpovědnosti |
| src/app/favicon.ico | Favicon aplikace | Implementováno |

## Budoucí adresáře

Vytvářejte je až při skutečné potřebě:

    src/features/ar/core/
    src/features/ar/location-tracking/
    src/features/ar/face-tracking/
    src/features/properties/
    src/services/
    src/lib/supabase/
    src/lib/storage/
    src/types/
    supabase/migrations/
    tests/

Tyto adresáře jsou plánované, nikoli současná implementace.

Pomocný scripts/compile-mind-target.mjs je výjimka: slouží k reprodukování
house-target.mind po změně referenčního obrázku.
