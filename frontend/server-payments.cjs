const https = require("https");
const http = require("http");

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const PORT = 3001;

if (!STRIPE_KEY) {
  console.error("Falta STRIPE_SECRET_KEY");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    let amount;
    try {
      ({ amount } = JSON.parse(body));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    const stripeReq = https.request(
      {
        hostname: "api.stripe.com",
        path: "/v1/payment_intents",
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      (stripeRes) => {
        let data = "";
        stripeRes.on("data", (chunk) => (data += chunk));
        stripeRes.on("end", () => {
          try {
            const pi = JSON.parse(data);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ client_secret: pi.client_secret }));
          } catch {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: data }));
          }
        });
      },
    );

    stripeReq.on("error", (err) => {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    });

    stripeReq.write(`amount=${amount}&currency=pen`);
    stripeReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`Payments server on http://localhost:${PORT}`);
});
