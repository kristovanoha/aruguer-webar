import Link from "next/link";
import SpaceshipARDemo from "@/features/ar/surface-tracking/SpaceshipARDemo";

export const metadata = {
  title: "Vesmírná loď – AR demo | ARuguer Reality",
  description: "WebXR demonstrace ukotvení vesmírné lodi na vodorovnou plochu.",
};

export default function SpaceshipARPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">← ARuguer Reality</Link>
          <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-blue-200">AR demo</span>
        </header>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">Surface AR</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Umístěte vesmírnou loď na zem.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Prohlédněte si loď v 3D a na podporovaném Android telefonu ji umístěte do prostoru stejným AR prohlížečem jako původní demo.</p>
            <p className="mt-5 text-sm leading-6 text-slate-400">Model používá osvědčený @google/model-viewer s WebXR a Android Scene Viewer fallbackem.</p>
          </section>
          <SpaceshipARDemo />
        </div>
      </div>
    </main>
  );
}
