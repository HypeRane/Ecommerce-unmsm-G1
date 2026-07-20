"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { ProductCard } from "@/components/catalogo/ProductCard";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  image_url?: string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase
          .from("products")
          .select("*")
          .limit(6);

        if (!cancelled && data && data.length > 0) {
          setProducts(data as Product[]);
        }
      } catch {}

      if (!cancelled) setLoading(false);
    }

    fetchProducts();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/20 via-background to-background pointer-events-none" />
        <div className="container-page text-center relative z-10 py-20 flex flex-col items-center">
          <h1 className="text-7xl sm:text-8xl lg:text-[12rem] font-serif font-black uppercase tracking-tighter leading-none text-white mb-6">
            UNMSM{" "}
            <span className="text-gold block">STORE</span>
          </h1>
          <p className="mt-2 text-xl md:text-3xl font-serif uppercase tracking-widest text-foreground-secondary max-w-3xl mx-auto">
            Tradición e Innovación • Calidad Premium
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/catalogo">
              <Button size="lg" className="text-xl px-12 py-6">
                Explorar Ahora
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-background-secondary py-24 border-y border-border">
        <div className="container-page">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-5xl sm:text-7xl font-serif font-bold uppercase tracking-widest text-white">
              Novedades
            </h2>
            <div className="h-1 w-24 bg-gold mt-6 mb-6" />
            <p className="text-xl text-foreground-muted font-serif uppercase tracking-widest">
              Los productos más exclusivos
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-foreground-muted font-serif uppercase tracking-widest text-xl">
              <p>Conectá el servicio de catálogo para ver productos</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.slice(0, 6).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-16 text-center">
                <Link href="/catalogo">
                  <Button variant="outline" size="lg" className="text-lg">
                    Ver Catálogo Completo
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="bg-background py-24">
        <div className="container-page">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-gold/10 border-2 border-gold flex items-center justify-center mb-6">
                <svg className="h-10 w-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-bold uppercase tracking-widest mb-3 text-white">Pago Seguro</h3>
              <p className="text-base text-foreground-muted">
                Procesado por Stripe con encriptación SSL de nivel militar.
              </p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-gold/10 border-2 border-gold flex items-center justify-center mb-6">
                <svg className="h-10 w-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-bold uppercase tracking-widest mb-3 text-white">Envío Rápido</h3>
              <p className="text-base text-foreground-muted">
                Entregas inmediatas en todo Lima Metropolitana y provincias.
              </p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-gold/10 border-2 border-gold flex items-center justify-center mb-6">
                <svg className="h-10 w-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-bold uppercase tracking-widest mb-3 text-white">Calidad UNMSM</h3>
              <p className="text-base text-foreground-muted">
                Productos oficiales con los más altos estándares de calidad.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
