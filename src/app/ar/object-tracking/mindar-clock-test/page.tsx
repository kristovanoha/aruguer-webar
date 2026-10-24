import Image from "next/image";
import Link from "next/link";
import ClockMindArTrackingDemo from "@/features/ar/image-tracking/ClockMindArTrackingDemo";

export const metadata = {
  title: "Stabilní tracking hodin – MindAR test | ARuguer Reality",
  description: "Samostatný MindAR image tracking test pro dodanou referenční fotografii hodin.",
};

export default function MindArClockTestPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl"><header className="mb-8 flex items-center justify-between gap-4"><Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">← ARuguer Reality</Link><span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-emerald-100">MindAR image tracking</span></header><div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start"><section><p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">Stabilní tracking hodin – MindAR test</p><h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Ukotvení k konkrétním hodinám.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Tento test nepoužívá YOLOX box pro polohu překrytí. MindAR porovnává obraz kamery s dodanou referenční fotografií hodin, takže při úspěšném nalezení může překrytí držet výrazně stabilněji.</p><div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-white p-3"><Image src="/targets/hodiny.jfif" alt="Referenční fotografie hodin pro MindAR tracking" className="w-full rounded-xl" width={448} height={446} /></div><p className="mt-3 text-xs leading-5 text-slate-400">Při testu mířte na stejné fyzické hodiny z podobného úhlu a v dobrém světle.</p></section><ClockMindArTrackingDemo /></div></div>
    </main>
  );
}
