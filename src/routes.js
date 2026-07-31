import { StellarPaywallConfigError } from "./errors.js";

/**
 * @typedef {Object} PaywallRoute
 * @property {string|{amount: string, asset: string}} price - e.g. "$0.001", or explicit base units for a non-USDC asset.
 * @property {string} [payTo] - Recipient G... address. Falls back to the preset's default (STELLAR_RECIPIENT).
 * @property {string} [description]
 */

/**
 * Turn the kit's simplified per-route shape into the `RoutesConfig` that
 * `@x402/core` expects (scheme + network + payTo attached to every route).
 *
 * @param {Record<string, PaywallRoute>} routes
 * @param {{ network: string, payTo?: string }} ctx
 */
export function buildRoutesConfig(routes, ctx) {
  const entries = Object.entries(routes);
  if (entries.length === 0) {
    throw new StellarPaywallConfigError("stellarPaywall() needs at least one route, e.g. { \"GET /weather\": { price: \"$0.001\" } }.");
  }

  const out = {};
  for (const [pattern, route] of entries) {
    const payTo = route.payTo ?? ctx.payTo;
    if (!payTo) {
      throw new StellarPaywallConfigError(
        `Route "${pattern}" has no payTo and no default recipient is set. ` +
          `Pass { payTo } on the route, or set STELLAR_RECIPIENT / pass { payTo } to the preset.`
      );
    }
    out[pattern] = {
      description: route.description,
      accepts: {
        scheme: "exact",
        network: ctx.network,
        price: route.price,
        payTo,
      },
    };
  }
  return out;
}
