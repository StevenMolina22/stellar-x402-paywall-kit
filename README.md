# stellar-x402-paywall-kit

One-line [x402](https://github.com/x402-foundation/x402) paywall middleware for **Express** and **Hono**, preset for the **Stellar** OZ Channels facilitator. Built for the GrantFox Stellar Builder Summit SP 2026 bounty — sub-lane 3A (Agentic Payments) and paired with [`stellar-agent-pay-cli`](https://github.com/StevenMolina22/stellar-agent-pay-cli) (sub-lane 3B) for a full 402 → pay → unlock demo.

x402 already ships official Stellar adapters (`@x402/express`, `@x402/hono`, `@x402/stellar`) — this kit is the part nobody publishes: the one-line **Stellar-specific preset** (facilitator client, scheme registration, env validation with actionable errors) plus a shared route config that works identically across both frameworks.

**Contents:** [Why](#why-this-exists) · [Install](#install) · [Quickstart](#quickstart) · [Proof of work](#proof-of-work) · [How it works](#how-the-402-flow-works) · [API](#api) · [Testnet runbook](#testnet-runbook) · [Mainnet](#mainnet) · [Security](#security-considerations) · [Troubleshooting](#troubleshooting)

## Why this exists

Wiring x402 to Stellar by hand means: build an `HTTPFacilitatorClient` pointed at the right OZ Channels URL for your network, register `ExactStellarScheme`, build an `x402ResourceServer`, and only then call the framework middleware — about 15 lines of boilerplate per app, repeated per framework, with an opaque failure if you forget `OZ_API_KEY`. This kit collapses that to:

```js
app.use(stellarPaywall({ "GET /weather": { price: "$0.001" } }));
```

## Install

```bash
npm install stellar-x402-paywall-kit @x402/core @x402/stellar @x402/express
# or, for Hono:
npm install stellar-x402-paywall-kit @x402/core @x402/stellar @x402/hono
```

Express 4 and 5 both work (`@x402/express` declares `^4.0.0 || ^5.0.0`). The examples and the live test here run Express 5.

## Quickstart

```bash
npx stellar-paywall-init      # writes .env.example
cp .env.example .env          # fill in STELLAR_RECIPIENT + OZ_API_KEY (see runbook below)
```

**Express** (`examples/express-app`):

```js
import express from "express";
import { stellarPaywall } from "stellar-x402-paywall-kit/express";

const app = express();
app.use(stellarPaywall({ "GET /weather": { price: "$0.001" } }));
app.get("/weather", (_req, res) => res.json({ temp: 18 }));
app.listen(3001);
```

**Hono** (`examples/hono-app`) — identical route config, different import:

```js
import { Hono } from "hono";
import { stellarPaywall } from "stellar-x402-paywall-kit/hono";

const app = new Hono();
app.use("*", stellarPaywall({ "GET /weather": { price: "$0.001" } }));
app.get("/weather", (c) => c.json({ temp: 18 }));
```

Run either example:

```bash
cd examples/express-app && npm install && npm start   # or examples/hono-app
curl -i http://localhost:3001/weather                  # -> 402 Payment Required, $0.001
curl -i http://localhost:3001/weather/premium           # -> 402 Payment Required, $0.01 (2nd tier, same server)
```

Pay it with [`stellar-agent-pay-cli`](https://github.com/StevenMolina22/stellar-agent-pay-cli):

```bash
stellar-agent-pay http://localhost:3001/weather
```

### Or watch an agent shop: `examples/agent-catalog`

`examples/express-app` proves the plumbing. [`examples/agent-catalog`](examples/agent-catalog)
is the demo worth showing: a paywalled research catalog at three price tiers
($0.001 index, $0.005 per report, $0.05 synthesis) driven by Claude Code through the
CLI's MCP server on a $0.02 budget. The agent buys the index, decides which reports
are worth $0.005, then gets refused on the synthesis when the cumulative cap runs
out. A fourth route sells the same data cheaper from an unvetted recipient, and the
operator's allow-list refuses it. See that example's README for the run.

## Proof of work

This exact server, paid by the sibling CLI, on Stellar testnet — not mocked. Verify any of these on [Stellar Expert](https://stellar.expert/explorer/testnet):

| tx hash | route | price |
|---|---|---|
| [`d8adef29...ee7e14fe`](https://stellar.expert/explorer/testnet/tx/d8adef2991af899cbf1009d06e8a428199f7b642ab65948c3fabbf70ee7e14fe) | `GET /weather` | $0.001 |
| [`4b0524e7...cdab979b83`](https://stellar.expert/explorer/testnet/tx/4b0524e754703b99237558f94cc5b89e74e2e4ee3aa2d99d7b9527cdab979b83) | `GET /weather` | $0.001 |
| [`3ee14d47...9fed611`](https://stellar.expert/explorer/testnet/tx/3ee14d47ee8ae5b3e4eb374ddb178f108d72e63c262244cce68a563fb9fed611) | `GET /weather/premium` (2nd tier, same server) | $0.01 |

Plus `test/e2e.test.js` below, which runs this same flow live against the real facilitator on every `npm test` when credentials are present.

## How the 402 flow works

```
Client → GET /weather                                → Express/Hono app (stellarPaywall)
Client ← 402 Payment Required (challenge: price,      ← 
          payTo, network)
Client builds a Stellar SAC USDC transfer, signs
  only the auth entries (no XLM needed)
Client → GET /weather + X-PAYMENT header              → 
Server → verify + settle                              → OZ Channels facilitator → Stellar (~5s)
Client ← 200 OK + resource                             ←
```

Full protocol details: see the `stellar-agentic-payments` reference this kit was built against, or the [x402 spec](https://github.com/x402-foundation/x402).

## API

### `stellarPaywall(routes, opts?)` — `stellar-x402-paywall-kit/express` or `/hono`

- `routes`: `{ "METHOD /path": { price, payTo?, description? } }`
  - `price`: `"$0.001"` (human-readable, auto-converts to 7-decimal USDC base units) or `{ amount: "1000", asset: "<SAC contract id>" }` for a non-USDC asset
  - `payTo`: recipient `G...` address; falls back to `opts.payTo` / `STELLAR_RECIPIENT`
- `opts.network`: `"stellar:testnet"` (default) or `"stellar:pubnet"`
- `opts.ozApiKey`: OZ Channels API key; falls back to `OZ_API_KEY`
- `opts.payTo`: default recipient for routes that don't set their own; falls back to `STELLAR_RECIPIENT`
- `opts.facilitatorUrl`: override the OZ Channels URL (rarely needed)

### `createStellarFacilitator(opts?)` — `stellar-x402-paywall-kit`

Framework-agnostic — returns `{ network, payTo, server }`. Use this directly if you need `x402HTTPResourceServer`-level control (custom paywall HTML, `onProtectedRequest` hooks, etc.) instead of the one-line preset.

## Testnet runbook

1. `node scripts/setup-testnet.mjs` — generates a recipient + payer keypair, funds both via Friendbot, adds a USDC trustline to both, writes `.env`.
2. Fund the payer with testnet USDC: [faucet.circle.com](https://faucet.circle.com/) → select Stellar testnet → paste the payer address printed by the script.
3. Generate an OZ Channels testnet key: [channels.openzeppelin.com/testnet/gen](https://channels.openzeppelin.com/testnet/gen) → paste into `OZ_API_KEY` in `.env`.
4. `cd examples/express-app && npm install && npm start`.

Steps 2 and 3 are web-only (captcha / auth) and can't be scripted — this is a real OZ Channels limitation, not a gap in this kit.

## Mainnet

Only `.env` changes — no code changes:

| Var | Testnet | Mainnet |
|---|---|---|
| `STELLAR_NETWORK` | `stellar:testnet` | `stellar:pubnet` |
| `OZ_API_KEY` | from `/testnet/gen` | from `channels.openzeppelin.com/gen` |
| `STELLAR_RECIPIENT` | testnet `G...` w/ USDC trustline | mainnet `G...` w/ USDC trustline |

## Security considerations

**Response delivery is already gated on settlement, not just verification** — confirmed by reading `@x402/express`'s actual source (not just its docs): on a `payment-verified` result, the middleware buffers your route handler's response (intercepting `res.write`/`res.end`) and only flushes it to the client *after* `processSettlement()` succeeds. If settlement fails, the buffered body is discarded and a settlement-failure response is sent instead. So a client never sees your resource before its payment is actually settled — that part of the design is sound out of the box.

**What this kit does *not* add: idempotency / replay protection for the seller.** A signed x402 auth entry is valid until its `max_ledger` expiration — that bounds *how long* a payment is valid, not whether it's already been redeemed. Research on x402 deployments has documented resource servers that granted access **248 times for a single settlement** when nothing tracked "this payment was already claimed" ([Five Attacks on x402, arXiv:2605.11781](https://arxiv.org/html/2605.11781v1)); separately, the x402 facilitator docs call out that a payment resubmitted to `/settle` before the first attempt confirms is a real race merchants have to handle themselves ([docs.x402.org/core-concepts/facilitator](https://docs.x402.org/core-concepts/facilitator)) — and whether OZ Channels' Stellar `/settle` deduplicates that isn't documented anywhere we could find. This kit is a thin preset over the official packages and doesn't add a claim-per-payment store on top — if your route serves something where a double-grant matters (not just "serve the same JSON twice," but e.g. issuing a single-use credential), add your own idempotency cache (keyed on a hash of the payment payload, or the settled tx hash) before trusting a single verify+settle as "this exact payment has never been seen."

**Multiple concurrent requests can each pass a client-side spend policy independently** — this affects `stellar-agent-pay-cli`'s buyer-side `--max-price`, not this seller kit, but if you're building both sides of a demo it's worth knowing: an x402 `PaymentPolicy` filter runs per-request, so N simultaneous requests from one agent can each individually pass a cap before any of them settle ([Free-Riding the Agentic Web, arXiv:2605.30998](https://arxiv.org/pdf/2605.30998)). See that CLI's README for the session-level mitigation.

**Why there's no signature-normalization layer here** (a comparative note, not a hypothetical): EVM x402 implementations have hit real interoperability bugs from ECDSA's `v` recovery-id having three incompatible encodings across wallets/SDKs — `yParity` (0/1), legacy (27/28), and EIP-155 (`chainId*2+35+yParity`) — bad enough that shipped x402 demos carry their own `normalizeSignatureV` workaround before submitting a payment header. Stellar's exact-scheme auth entries are signed with **Ed25519**, which has no recovery-id and only one canonical 64-byte signature encoding — that whole bug class doesn't exist here. Confirmed against a live payment in this repo's own testing, not assumed.

**Multiple price tiers on one server, no special API:** `examples/express-app` and `examples/hono-app` gate two routes at two prices (`GET /weather` → `$0.001`, `GET /weather/premium` → `$0.01`) — it's just two entries in the `routes` object, nothing else changes.

**Dependency pinning:** this kit's own `devDependencies` pin `@x402/*` to an exact `2.20.0` (not `^2.20.0`) for reproducible tests. Its `peerDependencies` correctly stay range-based (`^2.20.0`) — that's the right call for a *library*, so it doesn't fight your app's own lockfile — but pin the exact versions in *your* app's lockfile rather than floating on `^`. [GHSA-3j63-5h8p-gf7c](https://github.com/advisories/GHSA-3j63-5h8p-gf7c) hit the older, differently-named `x402`/`x402-express`/`x402-hono` v1 packages (not the `@x402/*` v2 family this kit uses), and [GHSA-qr2g-p6q7-w82m](https://github.com/advisories/GHSA-qr2g-p6q7-w82m) hit `@x402/svm` facilitators, not Stellar's — neither applies directly today, but both are evidence this protocol has had real facilitator-side vulnerabilities, so watch advisories rather than assuming a floating range is safe forever.

## Troubleshooting

**`Failed to initialize: no supported payment kinds loaded from any facilitator` right after calling `stellarPaywall()`** — the middleware syncs with the OZ Channels facilitator in the background as soon as it's created (`syncFacilitatorOnStart`, on by default). If `OZ_API_KEY` is missing or wrong, this surfaces as an *unhandled rejection*, not a thrown error from `stellarPaywall()` itself — you'll see a 401 from the facilitator in the logs. Fix: double-check `OZ_API_KEY` matches the network in `STELLAR_NETWORK` (testnet keys don't work on pubnet and vice versa).

## Testing

```bash
npm test   # node --test — 10/10: 9 unit tests (no network) + 1 live e2e test (see Proof of work above)
```

The e2e test needs `OZ_API_KEY` + `STELLAR_RECIPIENT` + `STELLAR_PAYER_SECRET`; it auto-skips without them, so `npm test` never breaks CI for anyone without a funded account.

## License

MIT
