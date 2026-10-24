import Link from "next/link";
import YoloXClockDetectionDemo from "@/features/ar/object-tracking/YoloXClockDetectionDemo";

export const metadata = {
  title: "YOLOX-s 640 test hodin – ARuguer Reality",
  description: "Samostatný diagnostický test YOLOX-s 640 a ONNX Runtime Web pro rozpoznávání hodin.",
};

export default function YoloXSClockDetectionPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4"><Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">← ARuguer Reality</Link><span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-violet-100">AI diagnostika</span></header>
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start"><section><p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-violet-200">YOLOX-s 640 + ONNX Runtime Web</p><h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">YOLOX-s 640 test hodin.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Silnější Apache‑2.0 model s 640 × 640 vstupem. Nahrajte fotografii, prohlédněte si všechny COCO detekce a potom spusťte zadní kameru.</p><p className="mt-5 text-sm leading-6 text-slate-400">Jde o samostatný test. Původní YOLOX Nano ani MediaPipe demo nemění.</p></section><YoloXClockDetectionDemo modelName="YOLOX-s 640" modelPath="/models/ai/yolox_s.onnx" inputSize={640} /></div>
      </div>
    </main>
  );
}
