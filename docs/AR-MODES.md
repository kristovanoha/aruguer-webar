# AR režimy a kompatibilita

## Přehled stavu

| Režim | Stav | Technologie | Aktuální vstup |
| --- | --- | --- | --- |
| Surface AR | Implementováno jako demo | @google/model-viewer, WebXR, Scene Viewer | public/models/netvorBeh.glb |
| Image Tracking | Implementováno jako demo | MindAR 1.2.5 + Three.js 0.160.0 | public/targets/house-target.mind + netvorBeh.glb |
| AI Object Tracking | Implementováno jako demo | MediaPipe Tasks Vision 0.10.35 + EfficientDet-Lite0 int8 v1 | public/ar/overlays/clock-overlay.png |
| Vesmírná loď – AR demo | Implementováno jako demo | @google/model-viewer, WebXR, Scene Viewer | public/models/vesmirnaLod.glb |
| Focke-Wulf 190 – AR demo | Implementováno jako demo | @google/model-viewer, WebXR, Scene Viewer | public/models/fockeWolf190.glb |
| Sky AR test | Implementováno jako experiment | Three.js, kamera, Device Orientation | public/models/vesmirnaLod.glb |
| Location AR | Plánováno | Ověřená location AR technologie | Není |
| Face Tracking | Plánováno | MindAR nebo jiný ověřený face tracker | Není |

## MindAR a kompatibilita

MindAR 1.2.5 je použito pouze pro image tracking a je načítáno dynamicky v
client komponentě. Balíček je MIT, ale jeho poslední npm publikace je z ledna
2024, proto jde o údržbové riziko pro dlouhodobý komerční produkt. Oficiální
MindAR dokumentace používá Three.js jako externí peer dependency; v projektu je
zvolena verze 0.160.0, která zachovává starší export sRGBEncoding a současně
odpovídá @google/model-viewer 3.4.0.

MindAR obsahuje i Node-only compiler větev, která při bundlingu odkazuje na fs.
Next.js proto používá prázdný browser alias v next.config.ts. Runtime image
tracking tuto větev v prohlížeči nepoužívá.

## Surface AR demo

Route /ar/demo renderuje ARModelViewer jako client komponentu. Knihovna
@google/model-viewer se načítá dynamickým importem až v prohlížeči. Viewer má
camera-controls pro otáčení a přiblížení a ar-modes nastavené na
webxr scene-viewer.

Tlačítko Zobrazit v AR volá activateAR(). Komponenta sleduje load, error a
ar-status eventy. Při chybě zobrazuje uživatelskou zprávu a 3D viewer zůstává
fallbackem, pokud se načtení modelu podaří.

## Image Tracking demo

Route /ar/image/demo používá přiložený černobílý obrázek domu jako target.
Soubor house-target.mind vznikl lokálně pomocí scripts/compile-mind-target.mjs.
Po spuštění kamery se načte model `netvorBeh.glb` do anchoru targetu.
Model obsahuje klipy `Running`, `Walking` a `run_fast_7`; v demu se automaticky
přehrává klip `Running`. Pod prohlížečem jsou tlačítka pro přepnutí mezi během,
chůzí a rychlým během včetně krátkého popisu každé animace.

Komponenta explicitně zastavuje MindAR, animation loop, camera stream přes
MindAR stop API, renderer a modelové geometrie/materialy. Při selhání před
aktivací kamery zobrazuje fallback a zachová interaktivní
@google/model-viewer prohlížeč.

Při běžícím demo režimu je viewport přes celou obrazovku. MindAR vlastní
video element zadní kamery; komponenta jej pouze vizuálně vrství pod
transparentní Three.js WebGL canvas. Video, WebGL canvas a případný CSS renderer
mají explicitní vrstvy, takže skutečné prostředí zůstává viditelné a anchor
modelu se dál řídí trackingem MindAR.

MindAR 1.2.5 interně registruje resize listener bez veřejného destroy API.
Komponenta proto uvolňuje všechny zdroje, které vlastní, a volá oficiální
stop API; tento upstream limit je nutné znovu ověřit při budoucí aktualizaci
knihovny před produkčním nasazením.

## Android Chrome

Android Chrome je současný primární cíl. Funkce závisí na:

- HTTPS nebo localhost secure contextu.
- Oprávnění ke kameře.
- Kompatibilitě telefonu s ARCore / Google Play Services for AR.
- Dostupnosti WebXR nebo schopnosti otevřít Android Scene Viewer.
- Dostatečném výkonu, světle a stabilním povrchu pro tracking.

Podpora musí být ověřena na fyzických telefonech. Desktopový build ani
emulátor nepotvrzuje správné umístění modelu.

## Vesmírná loď – AR demo

Route `/ar/spaceship` dynamicky načítá stejný @google/model-viewer jako
stávající route `/ar/demo`; model se proto nestahuje při návštěvě úvodní
stránky. Tlačítko **Zobrazit v AR** aktivuje WebXR nebo Android Scene Viewer,
který zajistí vlastní detekci plochy a umístění modelu. Neobsahuje vlastní
Three.js světla, animace ani ovládací panely.

Primární cíl je Android Chrome s podporou ARCore, HTTPS a oprávněním kamery.
iOS Safari bez USDZ verze modelu nemá AR Quick Look fallback a zůstává u
interaktivního 3D náhledu.
Model má přibližně 83 MB, proto je před produkčním nasazením nutné zvážit
optimalizovanou GLB variantu, ale současné demo zachovává dodané textury a
detaily beze změny.

## Focke-Wulf 190 – AR demo

Route `/ar/focke-wolf-190` načítá lokální model až po otevření stránky. Tlačítko
**Zobrazit na ploše v AR** aktivuje stejný WebXR nebo Android Scene Viewer
mechanismus jako základní Surface AR demo. Detekci vodorovné plochy a umístění
zajišťuje AR prohlížeč; bez podpory zůstává ovladatelný 3D náhled.

## Sky AR test

Route `/ar/sky` dynamicky načte zadní kameru, Device Orientation API a jediný
GLB model, jehož čtyři kopie sdílejí geometrii i materiály. Transparentní
Three.js canvas je vrstva nad kamerou. Po kalibraci používá relativní změnu
orientace telefonu, proto nevyžaduje absolutní kompas ani sever. Pokud uživatel
senzory nepovolí nebo je prohlížeč neposkytne, demo pokračuje v režimu Screen
AR bez ukotvení při pohybu telefonu. Nejde o hit-test, geolokační AR ani
persistentní anchor. Kamera vyžaduje HTTPS/localhost; iOS může vyžadovat
explicitní souhlas s orientačními senzory.

## AI Object Tracking demo

Route `/ar/object-tracking/demo` načítá Google MediaPipe Tasks Vision a
Object Detector až po kliknutí na spuštění kamery. Detekce běží lokálně v
prohlížeči s verzovaným modelem EfficientDet-Lite0 (int8, verze 1), který má
COCO kategorii `clock`. Detektor běží v režimu `VIDEO`, pro každý nový snímek
předává monotónní timestamp a při nefunkčním GPU delegate přepne na CPU.
Detektor vrací běžné COCO kategorie a aplikace z nich vybere kategorii `clock`
s nejvyšším confidence; výchozí minimum je 0,55. Filtrování se záměrně
provádí až v aplikaci, protože tím zůstává kompatibilní s modely, které vracejí
název kategorie pouze jako `displayName`.

WASM runtime i model se při startu stahují z pevných, verzovaných veřejných URL;
binární model se proto nereplikuje do repozitáře. Překryv
`public/ar/overlays/clock-overlay.png` se mapuje na video s
`object-fit: cover`. Nejlépe hodnocená detekovaná hodina dostane stopu a ID;
tracker používá EMA vyhlazení, predikci rychlosti a toleranci pěti ztracených
detekčních cyklů, takže překryv zůstává stabilnější při pohybu kamery. Kamera i
AI model se při zastavení nebo opuštění stránky uvolní. Demo neposílá snímky
kamery na server.

Kompatibilita tohoto konkrétního MediaPipe přechodu na Android Chrome a iOS
Safari zatím nebyla ověřena na fyzickém zařízení. Před nasazením je nutné na
obou cílových prohlížečích otestovat načtení WASM a modelu, oprávnění kamery,
detekci hodin, GPU i CPU fallback a opakované zastavení/spuštění kamery.

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
