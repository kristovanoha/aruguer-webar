# AR režimy a kompatibilita

## Přehled stavu

| Režim | Stav | Technologie | Aktuální vstup |
| --- | --- | --- | --- |
| Surface AR | Implementováno jako demo | @google/model-viewer, WebXR, Scene Viewer | public/models/demo-house.glb |
| Image Tracking | Plánováno | MindAR nebo jiný ověřený image tracker | Není |
| Location AR | Plánováno | Ověřená location AR technologie | Není |
| Face Tracking | Plánováno | MindAR nebo jiný ověřený face tracker | Není |

## Surface AR demo

Route /ar/demo renderuje ARModelViewer jako client komponentu. Knihovna
@google/model-viewer se načítá dynamickým importem až v prohlížeči. Viewer má
camera-controls pro otáčení a přiblížení a ar-modes nastavené na
webxr scene-viewer.

Tlačítko Zobrazit v AR volá activateAR(). Komponenta sleduje load, error a
ar-status eventy. Při chybě zobrazuje uživatelskou zprávu a 3D viewer zůstává
fallbackem, pokud se načtení modelu podaří.

## Android Chrome

Android Chrome je současný primární cíl. Funkce závisí na:

- HTTPS nebo localhost secure contextu.
- Oprávnění ke kameře.
- Kompatibilitě telefonu s ARCore / Google Play Services for AR.
- Dostupnosti WebXR nebo schopnosti otevřít Android Scene Viewer.
- Dostatečném výkonu, světle a stabilním povrchu pro tracking.

Podpora musí být ověřena na fyzických telefonech. Desktopový build ani
emulátor nepotvrzuje správné umístění modelu.

## iOS Safari

iOS Safari není současným cílem implementace Surface AR. Aktuální
ar-modes obsahuje webxr scene-viewer a projekt nemá Apple Quick Look USDZ
asset, iOS-specific fallback ani device test. iOS proto dokumentujte jako
neověřený/neimplementovaný cíl, nikoli jako podporovanou platformu.

## Obecný lifecycle pro budoucí režimy

Každý AR engine musí být inicializován až při použití konkrétního režimu a při
ukončení musí uvolnit camera stream, tracking session, event listenery,
animation frame i WebGL prostředky. Současně nesmí běžet více camera-based
engine současně.

Budoucí režimy musí mít:

- feature detection a jasný fallback,
- stav loading, permission denied, unsupported a runtime error,
- oddělený modul bez přímé závislosti na jiném tracking enginu,
- fyzické testy na cílových telefonech,
- dokumentovaný seznam podporovaných verzí prohlížečů a OS.
