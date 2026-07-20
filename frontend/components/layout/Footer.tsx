"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border mt-20 bg-background-secondary pt-20" role="contentinfo">
      <div className="container-page pb-16">
        <div className="flex flex-col items-center text-center mb-16">
          <h3 className="text-4xl md:text-5xl font-serif uppercase tracking-widest text-white mb-4">
            Mantente Informado
          </h3>
          <p className="text-foreground-secondary mb-8 max-w-xl">
            Suscríbete para recibir noticias sobre lanzamientos, eventos y descuentos exclusivos.
          </p>
          <form className="flex w-full max-w-md gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="TU CORREO ELECTRÓNICO"
              aria-label="Correo electrónico para suscripción"
              className="flex-1 bg-background border border-border px-4 py-3 text-white uppercase tracking-wider focus:outline-none focus:border-gold"
            />
            <button
              type="submit"
              className="bg-gold text-background font-bold uppercase tracking-widest px-8 hover:bg-gold-light transition-colors"
            >
              Suscribir
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-border pt-16">
          <div>
            <span className="text-3xl font-serif font-black uppercase tracking-tighter text-white">
              UNMSM <span className="text-gold">STORE</span>
            </span>
            <p className="mt-4 text-sm text-foreground-muted uppercase tracking-widest leading-loose">
              Proyecto final <br />
              Taller de Aplicaciones Distribuidas
            </p>
          </div>

          <div>
            <h4 className="text-lg font-serif uppercase tracking-widest text-white mb-6">Enlaces</h4>
            <nav aria-label="Enlaces del footer">
              <ul className="flex flex-col gap-4">
                <li>
                  <Link href="/catalogo" className="text-sm uppercase tracking-widest text-foreground-muted hover:text-gold transition-colors">
                    Catálogo
                  </Link>
                </li>
                <li>
                  <Link href="/auth/login" className="text-sm uppercase tracking-widest text-foreground-muted hover:text-gold transition-colors">
                    Iniciar Sesión
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div>
            <h4 className="text-lg font-serif uppercase tracking-widest text-white mb-6">Universidad</h4>
            <address className="not-italic text-sm uppercase tracking-widest text-foreground-muted leading-loose">
              Universidad Nacional Mayor de San Marcos<br />
              Facultad de Ingeniería de Sistemas e Informática
            </address>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-widest text-foreground-muted">
            &copy; {new Date().getFullYear()} UNMSM Store. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
