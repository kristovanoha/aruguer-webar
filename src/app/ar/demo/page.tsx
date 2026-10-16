import Link from "next/link";
import ARModelViewer from "@/features/ar/surface-tracking/ARModelViewer";

export const metadata = {
  title: "AR demo domu – ARuguer Reality",
  description: "Interaktivní 3D model domu s možností umístění v rozšířené realitě.",
};

export default function ARDemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">
            ← ARuguer Reality
          </Link>
          <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-blue-200">
            Android Chrome demo
          </span>
        </header>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">Surface AR</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Prohlédněte si dům ve svém prostoru.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Otočte si model domu, prohlédněte si jeho proporce a na podporovaném Android telefonu jej umístěte pomocí kamery.
            </p>
            <p className="mt-5 text-sm leading-6 text-slate-500">
              Pokud vaše zařízení AR nepodporuje, interaktivní 3D prohlížeč zůstává plně funkční.
            </p>
          </section>

          <ARModelViewer />
        </div>
      </div>
    </main>
  );
}
