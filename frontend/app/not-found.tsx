import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-serif font-bold text-gold-light">404</p>
        <h1 className="text-2xl font-serif font-bold mt-4">Página no encontrada</h1>
        <p className="text-foreground-muted mt-2 mb-6">
          La página que buscas no existe o fue movida
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold text-background font-semibold px-5 py-2.5 text-sm transition-all duration-200 hover:bg-gold-light"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
