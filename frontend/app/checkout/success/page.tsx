"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/Button";

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="pt-20 pb-10">
      <div className="container-page">
        <div className="text-center py-20 max-w-md mx-auto">
          <div className="mb-6">
            <svg className="h-20 w-20 mx-auto text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-serif font-bold mb-2">¡Pago exitoso!</h1>
          <p className="text-foreground-muted mb-6">
            Gracias por tu compra. Recibirás un correo con los detalles de tu orden.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link href="/catalogo">
              <Button>Seguir comprando</Button>
            </Link>
            <Link href="/perfil/ordenes" className="text-sm text-foreground-muted hover:text-foreground transition-colors">
              Ver mis órdenes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
