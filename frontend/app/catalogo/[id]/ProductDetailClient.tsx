"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { useCart } from "@/hooks/useCart";
import type { CartItem } from "@/hooks/useCart";

type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  image_url?: string;
  sales?: number;
};

type Props = {
  product: Product;
  suggestions: Product[];
};

export function ProductDetailClient({ product, suggestions }: Props) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  const cartItem: CartItem = {
    id: product.id,
    name: product.name,
    price: product.price,
    quantity,
    stock: product.stock,
    image_url: product.image_url,
  };

  return (
    <div>
      <Link
        href="/catalogo"
        className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground transition-colors mb-6"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div className="aspect-square bg-background-secondary rounded-xl flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-foreground-muted">
              <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">Sin imagen disponible</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            {product.category && (
              <Badge variant="gold" className="mb-2">{product.category}</Badge>
            )}
            <h1 className="text-2xl lg:text-3xl font-serif font-bold">{product.name}</h1>
          </div>

          <p className="text-3xl font-semibold text-gold-light">
            S/ {product.price.toFixed(2)}
          </p>

          {product.description && (
            <p className="text-foreground-secondary leading-relaxed">{product.description}</p>
          )}

          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <span className={product.stock > 0 ? "text-success" : "text-error"}>
              {product.stock > 0 ? "●" : "●"}
            </span>
            {product.stock > 0 ? `${product.stock} en stock` : "Agotado"}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center border border-border-light rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 text-foreground-secondary hover:text-foreground transition-colors"
                disabled={quantity <= 1}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="px-3 py-2 text-foreground-secondary hover:text-foreground transition-colors"
                disabled={quantity >= product.stock}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <Button
              size="lg"
              className="flex-1"
              disabled={product.stock === 0}
              onClick={() => addItem(cartItem)}
            >
              {product.stock === 0 ? "Agotado" : "Agregar al carrito"}
            </Button>
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-serif font-bold mb-6">También te puede interesar</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {suggestions.map((s) => (
              <Link key={s.id} href={`/catalogo/${s.id}`}>
                <Card hover>
                  <CardContent className="p-3 space-y-2">
                    <div className="aspect-square bg-background-secondary rounded-lg flex items-center justify-center">
                      {s.image_url ? (
                        <Image src={s.image_url} alt={s.name} fill className="object-cover rounded-lg" sizes="(max-width: 768px) 50vw, 25vw" />
                      ) : (
                        <svg className="h-8 w-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-sm text-gold-light font-semibold">S/ {s.price.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
