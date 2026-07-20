import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY no está configurada en las variables de entorno." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { amount, order_id, items } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    const orderId = order_id || crypto.randomUUID();

    // 1. Inicializar Stripe
    const stripe = new Stripe(stripeSecretKey);

    // 2. Crear Payment Intent en Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // en céntimos (ej: 4590 = S/ 45.90)
      currency: "pen",
      metadata: {
        order_id: orderId,
      },
    });

    // 3. Crear registro de orden inicial en Supabase (si hay credenciales)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      try {
        const supabase = createClient(supabaseUrl, serviceKey);

        // Crear orden
        const totalInSol = amount / 100;
        const { data: insertedOrder, error: orderErr } = await supabase
          .from("orders")
          .insert({
            id: orderId,
            total: totalInSol,
            status: "pendiente",
            stripe_payment_intent_id: paymentIntent.id,
          })
          .select()
          .single();

        // Crear order_items si se proporcionaron items
        if (!orderErr && insertedOrder && Array.isArray(items) && items.length > 0) {
          const orderItems = items.map((item: { id: string; quantity: number; price: number }) => ({
            order_id: orderId,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
          }));

          await supabase.from("order_items").insert(orderItems);
        }
      } catch (err) {
        console.warn("No se pudo registrar la orden preliminar en Supabase:", err);
      }
    }

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      order_id: orderId,
    });
  } catch (error: unknown) {
    console.error("Error al crear PaymentIntent:", error);
    const message = error instanceof Error ? error.message : "Error interno al procesar el pago";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
