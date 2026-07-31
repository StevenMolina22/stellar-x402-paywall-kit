# stellar-x402-paywall-kit

One-line [x402](https://github.com/x402-foundation/x402) paywall middleware for **Express** and **Hono**, preset for the **Stellar** OZ Channels facilitator. Built for the GrantFox Stellar Builder Summit SP 2026 bounty — sub-lane 3A (Agentic Payments) and paired with [`stellar-agent-pay-cli`](https://github.com/leocagli/stellar-agent-pay-cli) (sub-lane 3B) for a full 402 → pay → unlock demo.

x402 already ships official Stellar adapters (`@x402/express`, `@x402/hono`, `@x402/stellar`) — this kit is the part nobody publishes: the one-line **Stellar-specific preset** (facilitator client, scheme registration, env validation with actionable errors) plus a shared route config that works identically across both frameworks.

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
curl -i http://localhost:3001/weather                  # -> 402 Payment Required + challenge
```

Pay it with [`stellar-agent-pay-cli`](https://github.com/leocagli/stellar-agent-pay-cli):

```bash
stellar-agent-pay http://localhost:3001/weather
```

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

## Troubleshooting

**`Failed to initialize: no supported payment kinds loaded from any facilitator` right after calling `stellarPaywall()`** — the middleware syncs with the OZ Channels facilitator in the background as soon as it's created (`syncFacilitatorOnStart`, on by default). If `OZ_API_KEY` is missing or wrong, this surfaces as an *unhandled rejection*, not a thrown error from `stellarPaywall()` itself — you'll see a 401 from the facilitator in the logs. Fix: double-check `OZ_API_KEY` matches the network in `STELLAR_NETWORK` (testnet keys don't work on pubnet and vice versa).

## Testing

```bash
npm test   # node --test — no network calls, no live facilitator needed
```

## License

MIT
