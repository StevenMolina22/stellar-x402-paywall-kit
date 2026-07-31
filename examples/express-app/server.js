// Gate a route in one line. Run: node server.js (needs .env — see ../../README.md)
import "dotenv/config";
import express from "express";
import { stellarPaywall } from "stellar-x402-paywall-kit/express";

const app = express();

app.use(
  stellarPaywall({
    "GET /weather": { price: "$0.001", description: "Current weather data" },
  })
);

app.get("/weather", (_req, res) => {
  res.json({ city: "Buenos Aires", temp: 21, conditions: "Clear" });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`x402 Express example on http://localhost:${port} (${process.env.STELLAR_NETWORK || "stellar:testnet"})`);
  console.log(`Try: curl -i http://localhost:${port}/weather   (expect 402)`);
});
