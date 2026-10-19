import Link from "next/link";
import SkyARDemo from "@/features/ar/location-tracking/SkyARDemo";

export const metadata = {
  title: "Sky AR test | ARuguer Reality",
  description: "Experimentální Sky AR s relativní orientací po kalibraci a Screen AR fallbackem bez kompasu.",
};

export default function SkyARPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium text-slate-200 transition hover:text-white">← ARuguer Reality</Link>
          <span className="rounded-full border border-cyan-300/40 bg-cyan-300/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">Experiment</span>
        </header>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <section>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">Sky AR</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Lodě nad horizontem.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">Otevřete kameru, namiřte telefon na oblohu a otáčejte se. Po kalibraci se ve scéně zobrazí několik kopií vesmírné lodi.</p>
            <p className="mt-5 text-sm leading-6 text-slate-300">Kompas není nutný: bez senzorů zůstane k dispozici Screen AR náhled. Nejde o přesné geolokační AR ukotvení.</p>
          </section>
          <SkyARDemo />
        </div>
      </div>
    </main>
  );
}
