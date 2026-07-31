// Same config shape as the Express example — this is the "gate a second app in minutes" proof.
import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { stellarPaywall } from "stellar-x402-paywall-kit/hono";

const app = new Hono();

app.use(
  "*",
  stellarPaywall({
    "GET /weather": { price: "$0.001", description: "Current weather data" },
  })
);

app.get("/weather", (c) => c.json({ city: "Buenos Aires", temp: 21, conditions: "Clear" }));

const port = Number(process.env.PORT || 3002);
serve({ fetch: app.fetch, port }, () => {
  console.log(`x402 Hono example on http://localhost:${port} (${process.env.STELLAR_NETWORK || "stellar:testnet"})`);
  console.log(`Try: curl -i http://localhost:${port}/weather   (expect 402)`);
});
