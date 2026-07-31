#!/usr/bin/env node
// npx stellar-paywall-init — writes a starter .env for the Stellar x402 paywall preset.
import fs from "node:fs";
import path from "node:path";

const target = path.resolve(process.cwd(), ".env.example");

const contents = `# Stellar x402 paywall kit — copy to .env and fill in
STELLAR_NETWORK=stellar:testnet
STELLAR_RECIPIENT=
OZ_API_KEY=

# Generate an OZ Channels testnet key at:
#   https://channels.openzeppelin.com/testnet/gen
# STELLAR_RECIPIENT needs a funded testnet account with a USDC trustline —
# see the "Testnet runbook" section in this repo's README.
`;

if (fs.existsSync(target)) {
  console.error(`${target} already exists, not overwriting.`);
  process.exitCode = 1;
} else {
  fs.writeFileSync(target, contents);
  console.log(`Wrote ${target}`);
  console.log("Next: copy it to .env, fill in STELLAR_RECIPIENT and OZ_API_KEY, then use stellarPaywall() from stellar-x402-paywall-kit/express or /hono.");
}
