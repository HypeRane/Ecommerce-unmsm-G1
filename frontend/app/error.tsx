"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-serif font-bold text-gold">500</p>
        <h1 className="text-2xl font-serif font-bold mt-4">Error del servidor</h1>
        <p className="text-foreground-muted mt-2 mb-6">
          Algo salió mal. Intentá de nuevo o volvé al inicio.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold text-background font-semibold px-5 py-2.5 text-sm transition-all duration-200 hover:bg-gold-light"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-light text-foreground font-semibold px-5 py-2.5 text-sm transition-all duration-200 hover:bg-background-lighter"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
