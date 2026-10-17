import Link from "next/link";
import Image from "next/image";
import ARModelViewer from "@/features/ar/surface-tracking/ARModelViewer";
import ImageTrackingDemo from "@/features/ar/image-tracking/ImageTrackingDemo";

export const metadata = {
  title: "Image Tracking demo – ARuguer Reality",
  description: "Image Tracking demonstrace s referenčním obrázkem domu.",
};

export default function ImageTrackingDemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">
            ← ARuguer Reality
          </Link>
          <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-blue-200">
            Image Tracking demo
          </span>
        </header>

        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">Image Tracking</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Oživte referenční obrázek domu.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Kamera rozpozná přiložený obrazový target a umístí nad něj 3D model robota.
            </p>
            <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-white p-3">
              {/* The image is also the exact source used to create house-target.mind. */}
              <Image
                src="/targets/house-target.png"
                alt="Referenční obrázek domu pro Image Tracking"
                className="w-full rounded-xl"
                width={1254}
                height={1254}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Pro první test použijte obrazovku nebo vytisknutý obrázek v dobrém světle.
            </p>
          </section>

          <div className="space-y-10">
            <ImageTrackingDemo />
            <section className="border-t border-white/10 pt-8" aria-labelledby="image-fallback-heading">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Fallback</p>
              <h2 id="image-fallback-heading" className="mt-2 text-xl font-medium text-white">3D prohlížeč bez kamery</h2>
              <p className="mt-2 mb-4 text-sm leading-6 text-slate-400">
                Pokud Image Tracking není podporovaný nebo nechcete použít kameru, robota si můžete stále prohlédnout interaktivně.
              </p>
              <ARModelViewer />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
