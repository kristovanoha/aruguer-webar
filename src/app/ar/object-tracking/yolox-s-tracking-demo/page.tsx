import Link from "next/link";
import YoloXClockDetectionDemo from "@/features/ar/object-tracking/YoloXClockDetectionDemo";

export const metadata = {
  title: "YOLOX-s 640 tracker hodin – ARuguer Reality",
  description: "Samostatný test YOLOX-s 640 s průběžným obrazovým trackingem překrytí hodin.",
};

export default function YoloXSClockTrackingPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4"><Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">← ARuguer Reality</Link><span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-cyan-100">AI + obrazový tracker</span></header>
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start"><section><p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">YOLOX-s 640 + průběžný tracker</p><h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">YOLOX-s 640 tracker hodin.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">YOLOX pravidelně najde hodiny. Mezi AI detekcemi obrazový tracker sleduje detail uvnitř rámečku, aby překrytí reagovalo plynuleji při pohybu telefonu.</p><p className="mt-5 text-sm leading-6 text-slate-400">Pokud obrazová shoda klesne, tracker se zastaví a čeká na bezpečné znovunalezení hodin pomocí YOLOX.</p></section><YoloXClockDetectionDemo modelName="YOLOX-s 640 + tracker" modelPath="/models/ai/yolox_s.onnx" inputSize={640} motionTracking /></div>
      </div>
    </main>
  );
}
