import { paymentMiddleware } from "@x402/express";
import { createStellarFacilitator } from "./facilitator.js";
import { buildRoutesConfig } from "./routes.js";

/**
 * One-line x402 paywall for Express, preset for Stellar via OZ Channels.
 *
 * @example
 * import express from "express";
 * import { stellarPaywall } from "stellar-x402-paywall-kit/express";
 *
 * const app = express();
 * app.use(stellarPaywall({
 *   "GET /weather": { price: "$0.001" },
 * }));
 * app.get("/weather", (req, res) => res.json({ temp: 18 }));
 *
 * @param {Record<string, import("./routes.js").PaywallRoute>} routes
 * @param {import("./facilitator.js").StellarPaywallOptions} [opts]
 */
export function stellarPaywall(routes, opts = {}) {
  const { network, payTo, server } = createStellarFacilitator(opts);
  const routesConfig = buildRoutesConfig(routes, { network, payTo });
  return paymentMiddleware(routesConfig, server, opts.paywallConfig);
}

export { createStellarFacilitator, buildRoutesConfig };
