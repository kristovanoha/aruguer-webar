# Experimenty se sledováním hodin

Tento soubor je průběžný technický log. Každý další pokus o detekci nebo
sledování hodin musí před implementací zkontrolovat tento seznam a po
vyhodnocení přidat použitou technologii, výsledek a důvod další změny.

## Cíl

Na živé kameře rozpoznat kategorii `clock` a udržet obrazový překryv na
hodinách při pohybu telefonu. Nejde o persistentní WebXR anchor; přesnost je
omezena kvalitou detekčního boxu a dostupnými obrazovými detaily.

## Provedené pokusy

| Datum | Varianta | Výsledek | Co z toho plyne |
| --- | --- | --- | --- |
| 2026-10-24 | MediaPipe Object Detector s EfficientDet-Lite2 | Na části scén nerozpoznal kategorii `clock` dostatečně spolehlivě. | Zachovat jako oddělené původní demo; není zdrojem přesného obrazového trackingu. |
| 2026-10-24 | YOLOX Nano 416 přes ONNX Runtime Web | Diagnostika fungovala, přesnost a rozlišení pro hodiny nebyly dostatečné. | Pro náročnější test použít samostatný YOLOX-s 640 model. |
| 2026-10-24 | YOLOX-s 640 přes ONNX Runtime Web | Dokáže rozpoznat více objektů, ale `clock` stále závisí na velikosti, světle a pohledu. Jedna inference trvá na ukázaném zařízení přibližně 1,1 s. | AI detekce je příliš pomalá na plynulé sledování sama o sobě. |
| 2026-10-24 | Lehký korelační tracker mezi YOLOX-s inferencemi | Překrytí nebylo dostatečně stabilní. | Nevracet se k samotné korelaci jako k řešení přesného trackingu. |
| 2026-10-24 | OpenCV.js načítaný přes dynamický import npm balíčku | Brave hlásil `Promise.prototype.then called on incompatible receiver`. | Nepoužívat pro tento test CJS dynamický import OpenCV.js. |
| 2026-10-24 | Lokální OpenCV.js 5.0.0-release.1 jako browserový skript | Odstranil problém bundlerového importu. | Zachovat lokální verzovaný runtime `public/vendor/opencv-5.0.0-release.1.js`. |
| 2026-10-24 | OpenCV `goodFeaturesToTrack` + `estimateAffinePartial2D` | Použitý OpenCV 5 build tyto funkce neexportuje; mobil hlásil chybu funkce. | Nepoužívat tyto dva symboly v tomto runtime. |
| 2026-10-24 | OpenCV Harrisovy rohy + `calcOpticalFlowPyrLK` + `estimateAffine2D` | Spouští se bez chybějících API, ale překrytí stále není dostatečně přesné. | Optický tok s body v detekčním boxu sám o sobě nestačí pro přesné ukotvení. |
| 2026-10-24 | Filtrování odlehlých bodů, medián pohybu, vyhlazení, 640px tracker, jemná YOLOX korekce | Implementováno; uživatel hlásí, že výsledek stále není dostatečný. | Dále nezvyšovat složitost stejného boxového optical-flow přístupu bez měřitelného zlepšení. |
| 2026-10-24 | MindAR image tracking z `hodiny.jfif` | Implementováno jako samostatný test; target `hodiny.mind` byl lokálně zkompilován. Fyzický test zatím neproveden. | Ověřit na stejných fyzických hodinách, z podobného pohledu a při dobrém světle. |

## Aktuální stav

Route `/ar/object-tracking/opencv-tracker-test` je diagnostický test. Používá
YOLOX-s 640 pro hledání `clock`; po detekci zkouší OpenCV optical flow. Pokud
YOLOX kategorii `clock` nenajde, není možné tracker automaticky inicializovat.
Tlačítko **Ručně označit hodiny** existuje pouze pro izolované ověření trackeru.

Dosavadní výsledek **není vhodný jako přesné řešení pro produkční překrytí**.

## Dosud neprovedené směry

Tyto varianty ještě nejsou implementované a nesmí se označovat jako funkční:

1. Propojení AI nalezení a MindAR trackingu konkrétního ciferníku do jednoho
   automatického režimu. Současný MindAR test je samostatný, protože přepnutí
   mezi dvěma kamerovými AR enginy vyžaduje pečlivý lifecycle návrh.
2. Specializovaný model pro detekci hodin nebo model naučený na cílových typech
   hodin. Vyžaduje ověřit licenci, dataset, mobilní výkon a kvalitu detekce.
3. Specializovaný marker/target umístěný přímo u hodin. Technicky nejstabilnější
   varianta, ale mění zadání: nesleduje libovolné hodiny bez markeru.
4. Nativní AR s persistentním anchor. WebXR běžně neposkytuje anchor konkrétního
   objektu v obraze; není ekvivalentem univerzálního image trackingu hodin.

## Povinný zápis pro další pokus

Před změnou doplnit hypotézu a metriku úspěchu. Po testu doplnit zařízení,
prohlížeč, model, nastavení confidence, scénu, pozorovaný výsledek a rozhodnutí
zda variantu zachovat, opravit, nebo neopakovat.
