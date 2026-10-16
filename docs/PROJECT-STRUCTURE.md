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

## Technologie a závislosti

Verze odpovídají package.json a package-lock.json:

- Next.js 16.4.2 s App Routerem.
- React a react-dom 19.3.0.
- TypeScript 5.9.3 v devDependencies.
- Tailwind CSS 4.3.3 a @tailwindcss/turbopack.
- ESLint 9 a eslint-config-next 16.4.2.
- @google/model-viewer 4.4.0 pro 3D viewer a Surface AR.

Další AR frameworky, Three.js, MindAR a Supabase SDK nejsou v současných
závislostech implementované.

## Aplikace

| Cesta | Odpovědnost | Stav |
| --- | --- | --- |
| src/app/layout.tsx | Root layout, fonty a globální metadata | Implementováno |
| src/app/globals.css | Globální CSS a Tailwind import | Implementováno |
| src/app/page.tsx | Úvodní landing page a odkaz na AR demo | Implementováno |
| src/app/ar/demo/page.tsx | Route /ar/demo a kontext Surface AR | Implementováno |
| src/features/ar/surface-tracking/ARModelViewer.tsx | Client-only 3D viewer a AR aktivace | Implementováno |

## Assety

| Cesta | Odpovědnost | Stav |
| --- | --- | --- |
| public/models/demo-house.glb | Lokální GLB model domu pro demo | Implementováno |
| public/*.svg | Výchozí statické assety z bootstrapu | Implementováno, bez AR odpovědnosti |
| src/app/favicon.ico | Favicon aplikace | Implementováno |

## Budoucí adresáře

Vytvářejte je až při skutečné potřebě:

    src/features/ar/core/
    src/features/ar/image-tracking/
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
