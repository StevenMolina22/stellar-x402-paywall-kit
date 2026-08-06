import type { RouteConfig } from "@x402/core/server";
import { StellarPaywallConfigError } from "./errors.js";

export type PaywallRoute = {
  /** e.g. "$0.001", or explicit base units for a non-USDC asset. */
  price: string | { amount: string; asset: string };
  /** Recipient G... address. Falls back to the preset's default (STELLAR_RECIPIENT). */
  payTo?: string;
  description?: string;
};

/**
 * Turn the kit's simplified per-route shape into the `RoutesConfig` that
 * `@x402/core` expects (scheme + network + payTo attached to every route).
 *
 * `ctx.network` is CAIP-2, which is the shape @x402/core's RouteConfig actually
 * requires, not any old string.
 */
export function buildRoutesConfig(
  routes: Record<string, PaywallRoute>,
  ctx: { network: `${string}:${string}`; payTo?: string }
): Record<string, RouteConfig> {
  const entries = Object.entries(routes);
  if (entries.length === 0) {
    throw new StellarPaywallConfigError("stellarPaywall() needs at least one route, e.g. { \"GET /weather\": { price: \"$0.001\" } }.");
  }

  const out: Record<string, RouteConfig> = {};
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
