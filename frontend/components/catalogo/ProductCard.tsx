"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/hooks/useCart";
import type { CartItem } from "@/hooks/useCart";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  image_url?: string;
  sales?: number;
};

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  const cartItem: CartItem = {
    id: product.id,
    name: product.name,
    price: product.price,
    quantity: 1,
    stock: product.stock,
    image_url: product.image_url,
  };

  return (
    <Card hover className="group overflow-hidden">
      <Link href={`/catalogo/${product.id}`} aria-label={`Ver ${product.name}`}>
        <div className="aspect-square bg-background-secondary flex items-center justify-center overflow-hidden relative">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              loading="eager"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-foreground-muted" aria-hidden="true">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-serif uppercase tracking-widest">No Image</span>
            </div>
          )}
        </div>
      </Link>

      <CardContent className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/catalogo/${product.id}`} className="hover:text-gold transition-colors">
            <h3 className="font-serif font-bold text-2xl uppercase tracking-wider truncate">{product.name}</h3>
          </Link>
          {product.stock <= 5 && product.stock > 0 && (
            <Badge variant="warning" className="shrink-0">Últimas {product.stock}</Badge>
          )}
          {product.stock === 0 && <Badge variant="error" className="shrink-0">Agotado</Badge>}
        </div>

        {product.category && (
          <p className="text-xs font-serif uppercase tracking-widest text-gold mb-1">{product.category}</p>
        )}

        <p className="text-2xl font-bold text-gold">S/ {product.price.toFixed(2)}</p>

        <Button
          size="sm"
          className="w-full"
          disabled={product.stock === 0}
          onClick={() => addItem(cartItem)}
        >
          {product.stock === 0 ? "Agotado" : "Agregar al carrito"}
        </Button>
      </CardContent>
    </Card>
  );
}
