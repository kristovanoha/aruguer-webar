import Link from "next/link";

const plannedModes = [
  {
    number: "01",
    name: "Image Tracking",
    description: "Propojení digitálního obsahu s fyzickými obrazy a materiály.",
  },
  {
    number: "02",
    name: "Surface AR",
    description: "Umístění 3D objektů do prostoru pomocí detekce povrchů.",
  },
  {
    number: "03",
    name: "Location AR",
    description: "Zážitky ukotvené na konkrétním místě a v jeho okolí.",
  },
  {
    number: "04",
    name: "Face Tracking",
    description: "Interaktivní vizuální prvky reagující na pohyb obličeje.",
  },
];

export default function Home() {
  return (
    <main className="relative isolate overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-1/2 top-[-18rem] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-[-14rem] top-1/2 h-[28rem] w-[28rem] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-10 sm:py-8 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm font-medium tracking-wide text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200/70 bg-blue-400/25 text-blue-100">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-200 shadow-[0_0_18px_4px_rgba(147,197,253,0.55)]" />
            </span>
            ARuguer Reality
          </div>
          <span className="rounded-full border border-slate-500 bg-slate-900/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
            v0.1 · Preview
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center pb-16 pt-24 sm:pb-24 sm:pt-32">
          <div className="max-w-3xl">
            <p className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.28em] text-blue-200">
              <span className="h-px w-8 bg-blue-300" />
              WebAR Platform
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold tracking-[-0.055em] text-white sm:text-7xl lg:text-8xl">
              Realita, která
              <span className="block bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent">
                začíná na webu.
              </span>
            </h1>
            <p className="mt-8 max-w-xl text-lg font-medium leading-8 text-slate-100 sm:text-xl">
              Profesionální platforma rozšířené reality přímo ve webovém prohlížeči.
            </p>
            <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-emerald-300/60 bg-emerald-400/15 px-4 py-2.5 text-sm font-semibold text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-200 shadow-[0_0_12px_3px_rgba(110,231,183,0.55)]" />
              První verze aplikace je připravena.
            </div>
            <Link
              href="/ar/demo"
              className="mt-5 inline-flex items-center rounded-full bg-blue-200 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-blue-500/25 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-blue-200/40"
            >
              Vyzkoušet AR demo <span className="ml-2" aria-hidden="true">→</span>
            </Link>
            <Link
              href="/ar/image/demo"
              className="ml-2 mt-5 inline-flex items-center rounded-full border border-slate-400 bg-slate-900/85 px-5 py-3 text-sm font-bold text-white transition hover:border-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300/25"
            >
              Image Tracking demo <span className="ml-2" aria-hidden="true">→</span>
            </Link>
            <Link
              href="/ar/object-tracking/demo"
              className="ml-2 mt-5 inline-flex items-center rounded-full border border-emerald-300 bg-emerald-400/20 px-5 py-3 text-sm font-bold text-emerald-100 transition hover:bg-emerald-400/30 focus:outline-none focus:ring-4 focus:ring-emerald-300/25"
            >
              AI Object Tracking demo <span className="ml-2" aria-hidden="true">→</span>
            </Link>
            <Link
              href="/ar/spaceship"
              className="ml-2 mt-5 inline-flex items-center rounded-full border border-cyan-300 bg-cyan-400/20 px-5 py-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-400/30 focus:outline-none focus:ring-4 focus:ring-cyan-300/25"
            >
              Vesmírná loď – AR demo <span className="ml-2" aria-hidden="true">→</span>
            </Link>
            <Link
              href="/ar/sky"
              className="ml-2 mt-5 inline-flex items-center rounded-full border border-violet-300 bg-violet-400/20 px-5 py-3 text-sm font-bold text-violet-100 transition hover:bg-violet-400/30 focus:outline-none focus:ring-4 focus:ring-violet-300/25"
            >
              Sky AR test <span className="ml-2" aria-hidden="true">→</span>
            </Link>
            <Link
              href="/ar/focke-wolf-190"
              className="ml-2 mt-5 inline-flex items-center rounded-full border border-amber-300 bg-amber-400/20 px-5 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-400/30 focus:outline-none focus:ring-4 focus:ring-amber-300/25"
            >
              fockeWolf190 <span className="ml-2" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="border-t border-slate-600 py-8 sm:py-10" aria-labelledby="planned-modes">
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-300">Roadmap</p>
              <h2 id="planned-modes" className="mt-2 text-xl font-medium text-white">Plánované režimy</h2>
            </div>
            <p className="text-sm font-medium text-slate-300">Připravujeme modulární základ pro další vývoj.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {plannedModes.map((mode) => (
              <article key={mode.name} className="group rounded-2xl border border-slate-600 bg-slate-900/90 p-5 shadow-lg shadow-black/20 transition-colors hover:border-blue-300 hover:bg-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-xs font-bold text-blue-200">{mode.number}</span>
                  <span className="rounded-full border border-slate-500 bg-slate-800 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-200">Plánováno</span>
                </div>
                <h3 className="mt-8 text-base font-medium text-white">{mode.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200">{mode.description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-slate-600 py-6 text-xs font-medium text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <span>ARuguer Reality — WebAR Platform</span>
          <span>Built for the open web.</span>
        </footer>
      </div>
    </main>
  );
}
