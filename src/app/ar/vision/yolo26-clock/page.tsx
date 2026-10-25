import Link from "next/link";
import Yolo26ClockDetectionDemo from "@/features/ar/object-tracking/Yolo26ClockDetectionDemo";

export const metadata = {
  title: "YOLO26 Clock Detection – ARuguer Reality",
  description: "Samostatný YOLO26n COCO test detekce hodin s 2D Three.js overlayem.",
};

export default function Yolo26ClockPage() {
  return <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10"><div className="mx-auto max-w-5xl"><header className="mb-8 flex items-center justify-between gap-4"><Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">← ARuguer Reality</Link><span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-emerald-100">YOLO26n · COCO</span></header><div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start"><section><p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">YOLO26 Clock Detection Demo</p><h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Hodiny a 2D 3D overlay.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Samostatný test používá YOLO26n předtrénovaný na COCO a filtruje pouze třídu <code>clock</code> (ID 74). Po třech stabilních detekcích zobrazí nad hodinami jednoduchý Three.js objekt.</p><p className="mt-5 text-sm leading-6 text-amber-200">Testovací implementace podléhá licenci Ultralytics AGPL-3.0. Není právně vhodná pro uzavřenou komerční produkci bez Enterprise licence.</p></section><Yolo26ClockDetectionDemo /></div></div></main>;
}
