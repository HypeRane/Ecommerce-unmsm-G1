import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const bodyText = await request.text();
  let event: Stripe.Event;

  if (webhookSecret) {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Falta firma Stripe" }, { status: 400 });
    }
    try {
      event = stripe.webhooks.constructEvent(bodyText, signature, webhookSecret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Firma inválida";
      return NextResponse.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 });
    }
  } else {
    // Modo debug si no hay firma configurada
    try {
      event = JSON.parse(bodyText) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  async function updateOrderStatus(orderId: string, status: string, intentId?: string) {
    if (!supabaseUrl || !serviceKey) return;
    const supabase = createClient(supabaseUrl, serviceKey);

    let query = supabase.from("orders").update({ status, updated_at: new Date().toISOString() });
    if (orderId) {
      query = query.eq("id", orderId);
    } else if (intentId) {
      query = query.eq("stripe_payment_intent_id", intentId);
    }

    const { error } = await query;
    if (error) {
      console.error(`Error actualizando orden ${orderId || intentId} a ${status}:`, error);
    } else {
      console.log(`✅ Orden ${orderId || intentId} actualizada a '${status}'`);
    }
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.order_id;
        await updateOrderStatus(orderId, "pagado", pi.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.order_id;
        await updateOrderStatus(orderId, "fallido", pi.id);
        break;
      }
      default:
        console.log(`Evento Stripe no manejado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error procesando Webhook de Stripe:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
