# ARuguer Reality – WebAR

První funkční verze platformy ARuguer Reality postavená na Next.js. Aktuální verze obsahuje responzivní úvodní stránku a přehled plánovaných WebAR režimů. Skutečná AR funkcionalita, databáze ani přihlašování zatím nejsou součástí projektu.

## Technologie

- Next.js 16.4.2 s App Router
- React 19.3.0
- TypeScript 5
- Tailwind CSS 4
- ESLint 9
- npm

## Lokální spuštění

Požadavky: Node.js kompatibilní s Next.js 16 (Node.js 20.9 nebo novější) a npm.

~~~bash
npm install
npm run dev
~~~

Otevřete [http://localhost:3000](http://localhost:3000).

Pro produkční kontrolu spusťte `npm run lint`, `npx tsc --noEmit` a `npm run build`.

Projekt používá `next/font` pro optimalizaci písma Geist.

## Další vývoj

Plánované režimy jsou Image Tracking, Surface AR, Location AR a Face Tracking.

## AR demo

Ukázka Surface AR je dostupná na `/ar/demo`. Obsahuje lokální GLB model netvora (`public/models/netvorBeh.glb`) s automaticky přehrávanou animací běhu, ovládáním otáčení a přiblížení a tlačítkem **Zobrazit v AR** přes `@google/model-viewer`.

Image Tracking demonstrace je dostupná na `/ar/image/demo`. Používá přiložený
target obrázek a zkompilovaný soubor `public/targets/house-target.mind`.

Skutečné umístění modelu je nutné ověřit na fyzickém Android telefonu s Android Chrome a podporou Google Play Services for AR. Na nepodporovaných zařízeních zůstává funkční 3D prohlížeč.

## Nasazení na Vercel
Nasazení nevyžaduje vlastní `vercel.json`.

Vercel vytvoří Preview deployment pro další větve a produkční deployment z větve `main`. Tajné proměnné zatím nejsou potřeba.

### Postup propojení

1. Nahrajte změny do GitHubu.
2. Ve Vercelu zvolte **Add New → Project**.
3. Importujte repozitář `kristovanoha/aruguer-webar`.
4. Ponechte automaticky rozpoznaný framework **Next.js** a výchozí build nastavení.
5. Klikněte na **Deploy**.
