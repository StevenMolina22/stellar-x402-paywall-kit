import { paymentMiddleware } from "@x402/hono";
import { createStellarFacilitator } from "./facilitator.js";
import { buildRoutesConfig } from "./routes.js";

/**
 * One-line x402 paywall for Hono, preset for Stellar via OZ Channels.
 * Same config shape as the Express preset — swap the import to gate a second app.
 *
 * @example
 * import { Hono } from "hono";
 * import { stellarPaywall } from "stellar-x402-paywall-kit/hono";
 *
 * const app = new Hono();
 * app.use(stellarPaywall({
 *   "GET /weather": { price: "$0.001" },
 * }));
 * app.get("/weather", (c) => c.json({ temp: 18 }));
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
