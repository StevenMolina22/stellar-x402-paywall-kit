import { test } from "node:test";
import assert from "node:assert/strict";
import { createStellarFacilitator, defaultFacilitatorUrl } from "../src/facilitator.js";
import { StellarPaywallConfigError } from "../src/errors.js";

test("defaultFacilitatorUrl picks OZ Channels testnet vs pubnet", () => {
  assert.equal(defaultFacilitatorUrl("stellar:testnet"), "https://channels.openzeppelin.com/x402/testnet");
  assert.equal(defaultFacilitatorUrl("stellar:pubnet"), "https://channels.openzeppelin.com/x402");
  assert.equal(defaultFacilitatorUrl(undefined), "https://channels.openzeppelin.com/x402/testnet");
});

test("createStellarFacilitator throws a clear error without OZ_API_KEY", () => {
  const prev = process.env.OZ_API_KEY;
  delete process.env.OZ_API_KEY;
  try {
    assert.throws(() => createStellarFacilitator({ network: "stellar:testnet" }), StellarPaywallConfigError);
    assert.throws(
      () => createStellarFacilitator({ network: "stellar:testnet" }),
      /OZ_API_KEY is required/
    );
  } finally {
    if (prev !== undefined) process.env.OZ_API_KEY = prev;
  }
});

test("createStellarFacilitator rejects an invalid network id", () => {
  assert.throws(
    () => createStellarFacilitator({ network: "testnet", ozApiKey: "k" }),
    /Invalid Stellar network/
  );
});

test("createStellarFacilitator succeeds with an explicit key and returns network/payTo", () => {
  const { network, payTo, server } = createStellarFacilitator({
    network: "stellar:testnet",
    ozApiKey: "test-key",
    payTo: "GABCDEFAKE",
  });
  assert.equal(network, "stellar:testnet");
  assert.equal(payTo, "GABCDEFAKE");
  assert.ok(server, "should return a configured x402ResourceServer");
});

test("createStellarFacilitator falls back to env vars", () => {
  const prevKey = process.env.OZ_API_KEY;
  const prevNet = process.env.STELLAR_NETWORK;
  process.env.OZ_API_KEY = "env-key";
  process.env.STELLAR_NETWORK = "stellar:pubnet";
  try {
    const { network } = createStellarFacilitator({});
    assert.equal(network, "stellar:pubnet");
  } finally {
    if (prevKey === undefined) delete process.env.OZ_API_KEY;
    else process.env.OZ_API_KEY = prevKey;
    if (prevNet === undefined) delete process.env.STELLAR_NETWORK;
    else process.env.STELLAR_NETWORK = prevNet;
  }
});
