# Vývoj

## Požadavky

- Ubuntu WSL2 podle pravidel projektu.
- Node.js kompatibilní s Next.js 16; doporučen je Node.js 20.9 nebo novější.
- npm.
- Pro AR testy fyzický Android telefon, Android Chrome a podporu Google Play
  Services for AR.

## Lokální spuštění

Projekt používá Node.js 24.x, jak je uvedeno v `package.json` a `.nvmrc`.
MindAR 1.2.5 deklaruje starší `canvas`, který může na Node.js 24 spouštět
`node-gyp`. Projekt proto přes npm `overrides` používá `canvas@3.2.3`, která
Node.js 24 podporuje.

V kořeni projektu:

~~~bash
nvm use
npm ci
npm run dev
~~~

Vývojový server je na http://localhost:3000. AR demonstrace je na
http://localhost:3000/ar/demo.

## Kontrola změn

Před předáním změny spusťte:

~~~bash
npm run lint
npx tsc --noEmit
npm run build
~~~

Při změně AR komponenty ověřte také dostupnost modelu:

~~~bash
curl -I http://localhost:3000/models/demo-house.glb
~~~

Při změně Image Tracking targetu znovu vytvořte .mind soubor:

~~~bash
node scripts/compile-mind-target.mjs
~~~

Compiler používá offline API MindAR a nativní balíček canvas. Verze
`canvas@3.2.3` je v projektu vynucená kvůli kompatibilitě s Node.js 24.
Výstup patří do public/targets/house-target.mind.

## Vývojové zásady

- Nejprve načtěte AGENTS.md a relevantní dokumentaci v docs/.
- Nemíchejte změny aplikačního kódu s nevyžádanými změnami konfigurace nebo
  závislostí.
- Nové browser-only knihovny načítejte dynamicky v client komponentě.
- Nepovažujte build za důkaz kompatibility AR na fyzickém zařízení.
- Každé tvrzení o podpoře zařízení musí být podloženo device testem nebo
  jasně označeno jako předpoklad.
- Po významné změně aktualizujte relevantní dokumentaci a označení
  implementovaných/plánovaných funkcí.

## Testovací mezery

Projekt nemá automatizovanou testovací sadu. Zbývá ověřit zejména povolení
kamery, odmítnutí kamery, rozpoznání targetu, návrat z AR session, opakovanou
aktivaci, rotaci displeje, throttling a chování při pomalé síti.
