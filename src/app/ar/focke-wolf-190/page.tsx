import Link from "next/link";
import FockeWolf190ARDemo from "@/features/ar/surface-tracking/FockeWolf190ARDemo";

export const metadata = {
  title: "Focke-Wulf 190 – AR demo | ARuguer Reality",
  description: "3D náhled a AR umístění letounu Focke-Wulf 190 na plochu.",
};

export default function FockeWolf190Page() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">← ARuguer Reality</Link>
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-amber-100">Surface AR</span>
        </header>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-amber-200">3D model</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Focke-Wulf 190 na vaší ploše.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Prohlédněte si model letounu a na podporovaném Android telefonu jej umístěte na detekovanou vodorovnou plochu.</p>
            <p className="mt-5 text-sm leading-6 text-slate-400">AR používá WebXR nebo Android Scene Viewer; bez podpory AR zůstává funkční 3D náhled.</p>
          </section>
          <FockeWolf190ARDemo />
        </div>
      </div>
    </main>
  );
}
