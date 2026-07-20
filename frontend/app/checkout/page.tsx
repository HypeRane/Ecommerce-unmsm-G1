"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe/client";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";

function PaymentStep({
  clientSecret,
  address,
  totalPrice,
  items,
  onBack,
}: {
  clientSecret: string;
  address: { fullName: string; phone: string };
  totalPrice: number;
  items: { id: string; name: string; price: number; quantity: number }[];
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Error en el formulario");
      setLoading(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
        payment_method_data: {
          billing_details: {
            name: address.fullName,
            phone: address.phone,
          },
        },
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? "Error al confirmar el pago");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Datos de pago</h3>
              <button
                type="button"
                onClick={onBack}
                className="text-sm text-gold hover:underline"
              >
                ← Volver
              </button>
            </div>
            <p className="text-xs text-foreground-muted">
              Pago seguro procesado por Stripe
            </p>
            <PaymentElement />
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold">Resumen</h3>
            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-foreground-secondary"
                >
                  <span className="truncate">
                    {item.name} x{item.quantity}
                  </span>
                  <span>S/ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2" />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span className="text-gold">S/ {totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red bg-red/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              disabled={!stripe || !elements}
            >
              {loading ? "Procesando..." : `Pagar S/ ${totalPrice.toFixed(2)}`}
            </Button>

            <p className="text-xs text-center text-foreground-muted">
              Al pagar aceptás nuestros términos y condiciones
            </p>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  const { items, totalItems, totalPrice } = useCart();
  const stripePromise = getStripe();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"address" | "payment">("address");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
  });

  if (items.length === 0) {
    return (
      <div className="pt-20 pb-10">
        <div className="container-page text-center py-20">
          <h1 className="text-2xl font-serif font-bold mb-2">
            No hay productos en tu carrito
          </h1>
          <p className="text-foreground-muted mb-6">
            Agregá productos antes de continuar
          </p>
          <Link href="/catalogo">
            <Button>Ver catálogo</Button>
          </Link>
        </div>
      </div>
    );
  }

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(totalPrice * 100),
          order_id: crypto.randomUUID(),
        }),
      });
      const data = await res.json();
      if (data.client_secret) {
        setClientSecret(data.client_secret);
        setStep("payment");
      } else {
        setError(data.error || "Error al iniciar el pago");
      }
    } catch {
      setError("Error de conexión con el servicio de pagos");
    } finally {
      setLoading(false);
    }
  }

  if (step === "payment" && clientSecret) {
    return (
      <div className="pt-20 pb-10">
        <div className="container-page">
          <h1 className="text-2xl font-serif font-bold mb-8">
            Checkout ({totalItems} productos)
          </h1>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentStep
              clientSecret={clientSecret}
              address={address}
              totalPrice={totalPrice}
              items={items}
              onBack={() => {
                setStep("address");
                setClientSecret(null);
              }}
            />
          </Elements>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-10">
      <div className="container-page">
        <h1 className="text-2xl font-serif font-bold mb-8">
          Checkout ({totalItems} productos)
        </h1>

        <form
          onSubmit={handleAddressSubmit}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold">Información de envío</h3>
                <Input
                  label="Nombre completo"
                  placeholder="Juan Pérez"
                  value={address.fullName}
                  onChange={(e) =>
                    setAddress({ ...address, fullName: e.target.value })
                  }
                  required
                />
                <Input
                  label="Teléfono"
                  type="tel"
                  placeholder="999 888 777"
                  value={address.phone}
                  onChange={(e) =>
                    setAddress({ ...address, phone: e.target.value })
                  }
                />
                <Input
                  label="Dirección"
                  placeholder="Av. Universitaria 1234"
                  value={address.address}
                  onChange={(e) =>
                    setAddress({ ...address, address: e.target.value })
                  }
                  required
                />
                <Input
                  label="Ciudad"
                  placeholder="Lima"
                  value={address.city}
                  onChange={(e) =>
                    setAddress({ ...address, city: e.target.value })
                  }
                  required
                />
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold">Resumen</h3>
                <div className="space-y-2 text-sm">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-foreground-secondary"
                    >
                      <span className="truncate">
                        {item.name} x{item.quantity}
                      </span>
                      <span>S/ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 mt-2" />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span className="text-gold">
                      S/ {totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red bg-red/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  loading={loading}
                >
                  Continuar al pago
                </Button>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
