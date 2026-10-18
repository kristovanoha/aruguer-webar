# Dokumentace ARuguer Reality

Tento adresář je zdrojem pravdy pro architekturu a vývoj projektu. Stav
funkcí je v dokumentaci vždy označen jako **implementovaný** nebo
**plánovaný**.

## Dokumenty

- [Architektura](ARCHITECTURE.md) – vrstvy aplikace, tok dat, hranice modulů a mezery.
- [Struktura projektu](PROJECT-STRUCTURE.md) – odpovědnosti důležitých cest.
- [Vývoj](DEVELOPMENT.md) – lokální spuštění, kontroly a vývojová pravidla.
- [AR režimy](AR-MODES.md) – Surface AR, plánované režimy a kompatibilita.
- [Databáze a storage](DATABASE.md) – současný stav bez backendu a plán Supabase.
- [Nasazení](DEPLOYMENT.md) – Vercel, prostředí a provozní kontrola.

## Aktuální stav

Implementováno:

- Next.js App Router aplikace s úvodní stránkou.
- Route /ar/demo s lokálním GLB modelem netvora.
- Route /ar/image/demo s Image Tracking targetem z přiloženého obrázku a modelem netvora.
- Route /ar/object-tracking/demo s lokální AI detekcí hodin a 2D image overlay.
- Interaktivní prohlížení přes @google/model-viewer.
- Image Tracking přes MindAR a Three.js v client-only modulu.
- Pokus o Android AR přes WebXR nebo Scene Viewer.
- Fallback pro zařízení, která AR nepodporují.

Plánováno:

- Location AR a Face Tracking.
- Správa nemovitostí a assetů.
- Autentizace, databáze a uploady do Supabase Storage.
- Administrace, autorizace a produkční monitoring.
