export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // PAYMENTS_API apunta al microservicio de pagos (Render en prod, localhost en dev)
  const paymentsApi =
    process.env.PAYMENTS_API || "http://localhost:8082";

  try {
    const body = await request.json();

    const res = await fetch(`${paymentsApi}/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return Response.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return Response.json({ error: "Servidor de pagos no disponible" }, { status: 503 });
  }
}
