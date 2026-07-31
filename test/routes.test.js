import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRoutesConfig } from "../src/routes.js";
import { StellarPaywallConfigError } from "../src/errors.js";

test("buildRoutesConfig attaches scheme/network/payTo to every route", () => {
  const out = buildRoutesConfig(
    { "GET /weather": { price: "$0.001", description: "weather data" } },
    { network: "stellar:testnet", payTo: "GDEFAULT" }
  );
  assert.deepEqual(out["GET /weather"].accepts, {
    scheme: "exact",
    network: "stellar:testnet",
    price: "$0.001",
    payTo: "GDEFAULT",
  });
  assert.equal(out["GET /weather"].description, "weather data");
});

test("buildRoutesConfig lets a route override the default payTo", () => {
  const out = buildRoutesConfig(
    { "GET /premium": { price: "$0.01", payTo: "GOVERRIDE" } },
    { network: "stellar:testnet", payTo: "GDEFAULT" }
  );
  assert.equal(out["GET /premium"].accepts.payTo, "GOVERRIDE");
});

test("buildRoutesConfig throws when no payTo is available anywhere", () => {
  assert.throws(
    () => buildRoutesConfig({ "GET /weather": { price: "$0.001" } }, { network: "stellar:testnet" }),
    StellarPaywallConfigError
  );
});

test("buildRoutesConfig throws on an empty route map", () => {
  assert.throws(
    () => buildRoutesConfig({}, { network: "stellar:testnet", payTo: "GDEFAULT" }),
    /at least one route/
  );
});
