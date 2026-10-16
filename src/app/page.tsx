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
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-1/2 top-[-18rem] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[-14rem] top-1/2 h-[28rem] w-[28rem] rounded-full bg-cyan-400/5 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-10 sm:py-8 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm font-medium tracking-wide text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-300/30 bg-blue-400/10 text-blue-300">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-300 shadow-[0_0_18px_4px_rgba(147,197,253,0.35)]" />
            </span>
            ARuguer Reality
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
            v0.1 · Preview
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center pb-16 pt-24 sm:pb-24 sm:pt-32">
          <div className="max-w-3xl">
            <p className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
              <span className="h-px w-8 bg-blue-400/70" />
              WebAR Platform
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold tracking-[-0.055em] text-white sm:text-7xl lg:text-8xl">
              Realita, která
              <span className="block bg-gradient-to-r from-blue-200 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                začíná na webu.
              </span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
              Profesionální platforma rozšířené reality přímo ve webovém prohlížeči.
            </p>
            <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2.5 text-sm text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_3px_rgba(110,231,183,0.35)]" />
              První verze aplikace je připravena.
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-8 sm:py-10" aria-labelledby="planned-modes">
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Roadmap</p>
              <h2 id="planned-modes" className="mt-2 text-xl font-medium text-white">Plánované režimy</h2>
            </div>
            <p className="text-sm text-slate-500">Připravujeme modulární základ pro další vývoj.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {plannedModes.map((mode) => (
              <article key={mode.name} className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition-colors hover:border-blue-300/30 hover:bg-blue-300/[0.06]">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-xs text-blue-300/70">{mode.number}</span>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500">Plánováno</span>
                </div>
                <h3 className="mt-8 text-base font-medium text-white">{mode.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{mode.description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>ARuguer Reality — WebAR Platform</span>
          <span>Built for the open web.</span>
        </footer>
      </div>
    </main>
  );
}
