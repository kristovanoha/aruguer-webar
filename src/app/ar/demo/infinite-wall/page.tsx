import Link from "next/link";
import InfiniteIceWallDemo from "@/features/ar/surface-tracking/InfiniteIceWallDemo";

export const metadata = {
  title: "Nekonečná ledová zeď – AR demo | ARuguer Reality",
  description: "Procedurálně skládaná monumentální ledová zeď s WebXR umístěním.",
};

export default function InfiniteWallPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4"><Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">← ARuguer Reality</Link><span className="rounded-full border border-cyan-200/30 bg-cyan-200/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-cyan-100">WebXR experiment</span></header>
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <section><p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Surface AR</p><h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Nekonečná ledová zeď.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Monumentální procedurální hradba složená z navazujících segmentů, s horizontální mlhou a horním ledovým oparem.</p><p className="mt-5 text-sm leading-6 text-slate-400">Na Android Chrome s ARCore lze scénu umístit přes WebXR hit-test. iOS Safari zůstává u 3D náhledu, protože AR Quick Look neumí tuto procedurální scénu.</p></section>
          <InfiniteIceWallDemo />
        </div>
      </div>
    </main>
  );
}
