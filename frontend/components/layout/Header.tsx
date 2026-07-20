"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/Button";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { totalItems, openCart } = useCart();

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | undefined;

    async function init() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        setUser(data?.user ?? null);

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (mounted) setUser(session?.user ?? null);
        });
        unsub = () => listener?.subscription.unsubscribe();
      } catch {}
    }

    init();

    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      mounted = false;
      unsub?.();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
      role="banner"
    >
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group" aria-label="UNMSM Store - Inicio">
          <span className="text-xl font-serif font-bold text-gold group-hover:text-gold-light transition-colors">
            UNMSM
          </span>
          <span className="text-sm text-foreground-secondary hidden sm:inline">
            Store
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6" aria-label="Navegación principal">
          <Link
            href="/catalogo"
            className="text-lg font-serif uppercase tracking-widest text-foreground-secondary hover:text-foreground transition-colors"
          >
            Catálogo
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={openCart}
            className="relative flex items-center gap-1.5 text-foreground-secondary hover:text-foreground transition-colors p-2 cursor-pointer"
            aria-label={`Carrito de compras${totalItems > 0 ? `, ${totalItems} productos` : ""}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-background" aria-hidden="true">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </button>

          {user ? (
            <Link href="/perfil">
              <Button variant="ghost" size="sm">
                {user.email?.split("@")[0]}
              </Button>
            </Link>
          ) : (
            <Link href="/auth/login">
              <Button variant="outline" size="sm">
                Ingresar
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
