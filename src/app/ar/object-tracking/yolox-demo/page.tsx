import Link from "next/link";
import YoloXClockDetectionDemo from "@/features/ar/object-tracking/YoloXClockDetectionDemo";

export const metadata = {
  title: "YOLOX detekce hodin – ARuguer Reality",
  description: "Nezávislý diagnostický test YOLOX Nano a ONNX Runtime Web pro rozpoznávání hodin.",
};

export default function YoloXClockDetectionPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4"><Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">← ARuguer Reality</Link><span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-violet-100">AI diagnostika</span></header>
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start"><section><p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-violet-200">YOLOX Nano + ONNX Runtime Web</p><h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Ověřte detekci hodin od vstupu po překrytí.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Nejprve nahrajte fotografii a zkontrolujte všechny rozpoznané COCO objekty. Až potom spusťte zadní kameru.</p><p className="mt-5 text-sm leading-6 text-slate-400">Toto je zcela samostatný test: nepoužívá MediaPipe ani TensorFlow.js a nemění původní demo.</p></section><YoloXClockDetectionDemo /></div>
      </div>
    </main>
  );
}
