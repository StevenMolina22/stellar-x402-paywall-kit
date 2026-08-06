// Live end-to-end test against the real OZ Channels testnet facilitator — not mocked.
// Skipped automatically unless credentials are present, so it never breaks CI/`npm test`
// for anyone without a funded testnet account; run it locally once you have one (see README).
//
// This builds its buyer by hand out of @x402/fetch on purpose. It is the *seller's* test:
// it proves this middleware gates an unpaid request and unlocks a paid one, using the
// thinnest possible client, and it keeps this kit free of any dependency on the CLI.
// The mirror-image test (a real buyer paying a real paywall) lives in the sibling
// stellar-agent-pay-cli, which is where the buyer code it exercises actually is.
// Do not "simplify" this by importing that CLI: it would put a dependency cycle
// between the two repos and leave the seller side untested on its own.
import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { stellarPaywall } from "../src/express.js";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const RUN_E2E = Boolean(
  process.env.OZ_API_KEY && process.env.STELLAR_RECIPIENT && process.env.STELLAR_PAYER_SECRET
);

test(
  "live 402 -> pay -> unlock against OZ Channels testnet",
  { skip: !RUN_E2E && "set OZ_API_KEY, STELLAR_RECIPIENT, STELLAR_PAYER_SECRET to run (see README testnet runbook)" },
  async () => {
    const app = express();
    app.use(
      stellarPaywall(
        { "GET /ping": { price: "$0.0001", description: "e2e ping" } },
        { payTo: process.env.STELLAR_RECIPIENT }
      )
    );
    app.get("/ping", (_req, res) => res.json({ ok: true }));

    const server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const url = `http://localhost:${server.address().port}/ping`;

    try {
      const unpaid = await fetch(url);
      assert.equal(unpaid.status, 402, "unauthenticated request should be gated");

      const network = "stellar:testnet";
      const signer = createEd25519Signer(process.env.STELLAR_PAYER_SECRET, network);
      const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
        schemes: [{ network, client: new ExactStellarScheme(signer) }],
      });

      const paid = await fetchWithPayment(url);
      assert.equal(paid.status, 200, "paid request should unlock the resource");
      const body = await paid.json();
      assert.deepEqual(body, { ok: true });
    } finally {
      server.close();
    }
  }
);
