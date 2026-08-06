import { x402ResourceServer } from "@x402/core/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import type { PaywallConfig } from "@x402/core/server";
import { StellarPaywallConfigError } from "./errors.js";

const TESTNET_FACILITATOR_URL = "https://channels.openzeppelin.com/x402/testnet";
const PUBNET_FACILITATOR_URL = "https://channels.openzeppelin.com/x402";

/** The two Stellar networks this preset supports, as CAIP-2 ids. */
export type StellarNetwork = "stellar:testnet" | "stellar:pubnet";

/**
 * Default OZ Channels facilitator URL for a given CAIP-2 Stellar network.
 */
export function defaultFacilitatorUrl(network: string): string {
  return network === "stellar:pubnet" ? PUBNET_FACILITATOR_URL : TESTNET_FACILITATOR_URL;
}

export type StellarPaywallOptions = {
  /** CAIP-2 network id. Defaults to STELLAR_NETWORK env or "stellar:testnet". */
  network?: string;
  /** OZ Channels API key. Defaults to OZ_API_KEY env. */
  ozApiKey?: string;
  /** Override the facilitator URL. Defaults to the OZ Channels URL for `network`. */
  facilitatorUrl?: string;
  /** Default recipient G... address for routes that don't set their own. Defaults to STELLAR_RECIPIENT env. */
  payTo?: string;
  /**
   * Passed straight through to the underlying paymentMiddleware, for branding the
   * browser-facing paywall page. Both presets read it, and the README documents it,
   * but it was missing from this type until the type check went on.
   */
  paywallConfig?: PaywallConfig;
};

/**
 * Build a Stellar x402 resource server (facilitator client + ExactStellarScheme registered)
 * from environment variables or explicit options. This is the one piece every x402 seller
 * on Stellar needs to wire up by hand (see the OZ Channels quickstart); this preset does it
 * once, with clear config-time errors instead of an opaque crash on the first request.
 */
export function createStellarFacilitator(opts: StellarPaywallOptions = {}): {
  network: StellarNetwork;
  payTo: string | undefined;
  server: x402ResourceServer;
} {
  const network = opts.network ?? process.env.STELLAR_NETWORK ?? "stellar:testnet";

  if (network !== "stellar:testnet" && network !== "stellar:pubnet") {
    throw new StellarPaywallConfigError(
      `Invalid Stellar network "${network}". Expected "stellar:testnet" or "stellar:pubnet" ` +
        `(CAIP-2 network id, which is not the same string as the Horizon network passphrase).`
    );
  }

  const ozApiKey = opts.ozApiKey ?? process.env.OZ_API_KEY;
  if (!ozApiKey) {
    const genUrl =
      network === "stellar:pubnet"
        ? "https://channels.openzeppelin.com/gen"
        : "https://channels.openzeppelin.com/testnet/gen";
    throw new StellarPaywallConfigError(
      `OZ_API_KEY is required (OZ Channels needs a Bearer key on both testnet and mainnet). ` +
        `Generate one at ${genUrl} and set OZ_API_KEY, or pass { ozApiKey } explicitly.`
    );
  }

  const payTo = opts.payTo ?? process.env.STELLAR_RECIPIENT;
  const facilitatorUrl = opts.facilitatorUrl ?? defaultFacilitatorUrl(network);

  const facilitator = new HTTPFacilitatorClient({
    url: facilitatorUrl,
    createAuthHeaders: async () => {
      const headers = { Authorization: `Bearer ${ozApiKey}` };
      return { verify: headers, settle: headers, supported: headers };
    },
  });

  const server = new x402ResourceServer(facilitator).register(network, new ExactStellarScheme());

  return { network, payTo, server };
}
