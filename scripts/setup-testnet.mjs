// One-shot testnet bootstrap: generates a recipient + payer keypair, funds both via
// Friendbot, and adds a USDC trustline to both. Writes a starter .env for the examples.
//
// Two steps stay manual (web-only, no API): funding the payer with testnet USDC
// (Circle faucet) and generating an OZ Channels API key. This script prints both links
// at the end.
import fs from "node:fs/promises";
import {
  Keypair,
  Horizon,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
} from "@stellar/stellar-sdk";

const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");

const friendbot = (addr) => fetch(`https://friendbot.stellar.org?addr=${addr}`);

async function addTrustline(kp) {
  const acc = await horizon.loadAccount(kp.publicKey());
  const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset: new Asset("USDC", USDC_ISSUER) }))
    .setTimeout(60)
    .build();
  tx.sign(kp);
  return horizon.submitTransaction(tx);
}

const recipient = Keypair.random();
const payer = Keypair.random();

console.log("Funding both accounts via Friendbot...");
await Promise.all([friendbot(recipient.publicKey()), friendbot(payer.publicKey())]);
await new Promise((r) => setTimeout(r, 2000));

console.log("Adding USDC trustlines...");
await Promise.all([addTrustline(recipient), addTrustline(payer)]);

const envPath = ".env";
await fs.writeFile(
  envPath,
  `STELLAR_NETWORK=stellar:testnet
STELLAR_RECIPIENT=${recipient.publicKey()}
OZ_API_KEY=
# payer keypair (for the demo client / stellar-agent-pay-cli), not used by the server itself
STELLAR_PAYER_SECRET=${payer.secret()}
`
);

console.log(`\nWrote ${envPath}`);
console.log(`Recipient (server payTo): ${recipient.publicKey()}`);
console.log(`Payer     (client):       ${payer.publicKey()}`);
console.log(`\nTwo manual steps left (both web-only, can't be scripted):`);
console.log(`  1. Fund the payer with testnet USDC: https://faucet.circle.com  ->  ${payer.publicKey()}`);
console.log(`  2. Generate an OZ Channels testnet key: https://channels.openzeppelin.com/testnet/gen  ->  paste into OZ_API_KEY in .env`);
