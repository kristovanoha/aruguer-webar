import Link from "next/link";
import ObjectTrackingDemo from "@/features/ar/object-tracking/ObjectTrackingDemo";

export const metadata = {
  title: "AI Object Tracking demo – ARuguer Reality",
  description: "Lokální detekce nástěnných hodin a obrazový překryv v mobilním prohlížeči.",
};

export default function ObjectTrackingDemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">
            ← ARuguer Reality
          </Link>
          <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-blue-200">
            AI demo
          </span>
        </header>

        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">AI Object Tracking</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Překryjte hodiny vlastním obrázkem.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Kamera hledá nástěnné hodiny přímo v telefonu a při rozpoznání přes ně vykreslí dočasný obrazový překryv.
            </p>
            <p className="mt-5 text-sm leading-6 text-slate-500">
              Detekce je pouze demonstrační a nemusí rozpoznat hodiny při špatném světle, zakrytí nebo neobvyklém designu.
            </p>
          </section>

          <ObjectTrackingDemo />
        </div>
      </div>
    </main>
  );
}
