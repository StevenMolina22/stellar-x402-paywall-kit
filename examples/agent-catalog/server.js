// A paywalled research catalog for the agent-buyer demo.
//
// Unlike the weather example (one route, one price, a human who already knows the
// price), this one is built to be *shopped*: a cheap index, a mid-priced item, and
// an expensive bundle. An agent with a budget has to decide what's worth buying,
// and the answer to the question it was asked is only in the paid bodies.
//
// Run: doppler run -- npm start        (or supply STELLAR_RECIPIENT + OZ_API_KEY yourself)
import express from "express";
import { stellarPaywall } from "stellar-x402-paywall-kit/express";
import { REPORTS, CATALOG, SYNTHESIS } from "./reports.js";

// A recipient that is deliberately NOT the server's own payTo. Nothing is ever paid
// here: it exists so the demo can show an operator-set allow-list refusing a route
// that is cheaper than the legitimate one. See the README's "decoy" section.
const UNVETTED_MIRROR = "GAXBFHC6HPEYW3O3GVNYGPTOOIM6A4TTVMYKLRS5XQIR6VLHCJ4VZLYR";

const app = express();

// Seller's-eye view, so a demo can show the negotiation happening in real time.
// Each sale appears as a pair: a 402 challenge, then a 200 once the payment settles.
app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - started;
    // x402 v2 sends the signed payload in PAYMENT-SIGNATURE; X-PAYMENT is the v1 name,
    // which @x402/core still emits as a fallback. Check both or a paid request reads as free.
    const paid = Boolean(req.headers["payment-signature"] || req.headers["x-payment"]);
    const label =
      res.statusCode === 402
        ? "402 challenge sent"
        : res.statusCode === 200
          ? paid
            ? "200 PAID, resource served"
            : "200 free"
          : `${res.statusCode}`;
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.path.padEnd(14)} ${label} (${ms}ms)`);
  });
  next();
});

app.use(
  stellarPaywall({
    "GET /catalog": { price: "$0.001", description: "Index of all 12 reports (ids + titles only)" },
    "GET /reports/:id": { price: "$0.005", description: "Full body of one report" },
    "GET /synthesis": { price: "$0.05", description: "Cross-report analysis of all 12" },
    "GET /mirror": {
      price: "$0.0005",
      description: "Same index, unvetted third-party mirror (cheaper)",
      payTo: UNVETTED_MIRROR,
    },
  })
);

app.get("/catalog", (_req, res) => {
  res.json({ count: CATALOG.length, reports: CATALOG, detailPriceUsd: "0.005" });
});

app.get("/reports/:id", (req, res) => {
  const report = REPORTS.find((r) => r.id === Number(req.params.id));
  if (!report) return res.status(404).json({ error: `No report ${req.params.id}` });
  res.json(report);
});

app.get("/synthesis", (_req, res) => {
  res.json({ synthesis: SYNTHESIS });
});

app.get("/mirror", (_req, res) => {
  res.json({ count: CATALOG.length, reports: CATALOG, source: "unvetted-mirror" });
});

// Free, so the agent can orient itself before spending anything.
app.get("/", (_req, res) => {
  res.json({
    catalog: { url: "/catalog", priceUsd: "0.001" },
    report: { url: "/reports/{id}", priceUsd: "0.005" },
    synthesis: { url: "/synthesis", priceUsd: "0.05" },
    mirror: { url: "/mirror", priceUsd: "0.0005", note: "third-party mirror" },
  });
});

const port = process.env.PORT || 3002;
const server = app.listen(port, () => {
  console.log(`Research catalog on http://localhost:${port} (${process.env.STELLAR_NETWORK || "stellar:testnet"})`);
  console.log(`  GET /            free index of what's for sale`);
  console.log(`  GET /catalog     $0.001`);
  console.log(`  GET /reports/3   $0.005`);
  console.log(`  GET /synthesis   $0.05`);
});

// A stale copy of this example holding the port is the single most likely way to lose
// 30 seconds in front of an audience. Say what to do instead of printing a stack trace.
server.on("error", (err) => {
  if (err.code !== "EADDRINUSE") throw err;
  console.error(`\nPort ${port} is already in use, most likely an older copy of this server.\n`);
  console.error(`  Free it:        kill $(lsof -ti:${port})`);
  console.error(`  Or use another: PORT=3005 doppler run -- npm start`);
  console.error(`\nIf you change the port, remember the demo prompt points at the old one.\n`);
  process.exit(1);
});
