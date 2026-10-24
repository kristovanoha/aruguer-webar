import Link from "next/link";
import YoloXClockDetectionDemo from "@/features/ar/object-tracking/YoloXClockDetectionDemo";

export const metadata = {
  title: "OpenCV tracker test – ARuguer Reality",
  description: "YOLOX-s 640 detekce hodin s OpenCV optickým tokem mezi AI snímky.",
};

export default function OpenCvTrackerTestPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4"><Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">← ARuguer Reality</Link><span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-amber-100">YOLOX + OpenCV</span></header>
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start"><section><p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-amber-200">OpenCV tracker test</p><h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">OpenCV tracker test.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">YOLOX-s 640 nejprve vyhledá kategorii <code>clock</code>. Mezi pomalejšími AI detekcemi OpenCV sleduje více detailních bodů ciferníku metodou Lucas–Kanade a z nich přepočítává polohu rámečku afinní transformací.</p><p className="mt-5 text-sm leading-6 text-slate-400">AI zůstává zdrojem pravdy: při další detekci znovu opraví tracker. Pokud AI hodiny nenajde, lze je v diagnostice ručně obtáhnout prstem.</p></section><YoloXClockDetectionDemo modelName="YOLOX-s 640 + OpenCV tracker" modelPath="/models/ai/yolox_s.onnx" inputSize={640} motionTracking trackingMode="opencv" /></div>
      </div>
    </main>
  );
}
