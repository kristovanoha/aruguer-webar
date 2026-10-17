# Nasazení

## Současný stav

Projekt je standardní Next.js aplikace připravená pro Vercel. Nepoužívá
vlastní vercel.json, custom server ani dlouho běžící backend. Produkční
deployment nebyl z tohoto repozitáře proveden.

Vercel používá Node.js 24.x, což je vynuceno přes `engines` v `package.json`.
MindAR 1.2.5 deklaruje starší `canvas`; npm `overrides` proto vynucuje
`canvas@3.2.3`, která podporuje Node.js 24 a zabraňuje použití starého
`canvas@2.11.2` při instalaci.

Build výstup obsahuje mimo jiné route /ar/demo. Veřejný model robota je dostupný
z /models/robot.glb.

## Vercel workflow

1. Importujte GitHub repository kristovanoha/aruguer-webar do Vercelu.
2. Ponechte detekovaný framework Next.js a výchozí build command.
3. Nastavujte Development, Preview a Production proměnné odděleně, až budou
   potřeba.
4. Preview používejte pro fyzické testy zařízení před produkcí.
5. Produkci publikujte z main po kontrole změn.

## Environment variables

Současná aplikace žádné environment variables nepotřebuje. Při přidání
Supabase nebo jiných služeb dokumentujte název, účel, rozsah a prostředí
každé proměnné. Tajné hodnoty necommitujte a nevkládejte do client bundle.

## Provozní omezení

- WebAR je citlivé na HTTPS, oprávnění kamery, výkon telefonu a dostupnost
  Google Play Services for AR.
- Vercel není vhodné místo pro dlouhé uploady nebo dlouho běžící tracking.
- Assety musí být optimalizované pro mobilní síť a paměť.
- Úspěšný npm build nepotvrzuje funkčnost kamery ani umístění objektu.

## Kontrolní seznam před deploymentem

- Prošly lint, TypeScript a production build.
- Veřejné assety mají správný Content-Type a existující URL.
- Byla ověřena route /ar/demo v Preview deploymentu.
- Android Chrome test ověřil kameru, umístění, návrat z AR a opakované
  spuštění.
- Jsou známé a zdokumentované fallbacky pro nepodporovaná zařízení.
