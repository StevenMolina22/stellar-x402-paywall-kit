// Gate a route in one line. Run: node server.js (needs .env — see ../../README.md)
import "dotenv/config";
import express from "express";
import { stellarPaywall } from "stellar-x402-paywall-kit/express";

const app = express();

// Tiered pricing needs no special API — it's just two routes, each with its own
// price. (x402 also supports multiple payment *options* on a single route, e.g.
// USDC on testnet + pubnet; that's a different feature — see the README.)
app.use(
  stellarPaywall({
    "GET /weather": { price: "$0.001", description: "Current weather data" },
    "GET /weather/premium": { price: "$0.01", description: "Weather + 7-day forecast" },
  })
);

app.get("/weather", (_req, res) => {
  res.json({ city: "Buenos Aires", temp: 21, conditions: "Clear" });
});

app.get("/weather/premium", (_req, res) => {
  res.json({
    city: "Buenos Aires",
    temp: 21,
    conditions: "Clear",
    forecast: [22, 23, 19, 20, 24, 21, 18],
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`x402 Express example on http://localhost:${port} (${process.env.STELLAR_NETWORK || "stellar:testnet"})`);
  console.log(`Try: curl -i http://localhost:${port}/weather           (expect 402, $0.001)`);
  console.log(`     curl -i http://localhost:${port}/weather/premium   (expect 402, $0.01)`);
});
