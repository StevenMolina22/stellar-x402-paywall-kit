# stellar-x402-paywall-kit

[![npm](https://img.shields.io/npm/v/stellar-x402-paywall-kit.svg)](https://www.npmjs.com/package/stellar-x402-paywall-kit) [![license](https://img.shields.io/npm/l/stellar-x402-paywall-kit.svg)](LICENSE) [![node](https://img.shields.io/node/v/stellar-x402-paywall-kit.svg)](https://nodejs.org)

Charge for an API route in one line. [x402](https://github.com/x402-foundation/x402) paywall
middleware for Express and Hono, preset for Stellar via the OpenZeppelin Channels facilitator.

```js
app.use(stellarPaywall({ "GET /weather": { price: "$0.001" } }));
```

x402 ships official Stellar adapters, but wiring them takes about 15 lines per app: a
facilitator client on the right Channels URL, scheme registration, a resource server, then the
framework middleware. Forget `OZ_API_KEY` and it fails opaquely. This kit is that preset, with
one route config that works across both frameworks.

## Install

Requires Node.js 20 or newer.

```bash
npm install stellar-x402-paywall-kit @x402/core @x402/stellar @x402/express
# or, for Hono:
npm install stellar-x402-paywall-kit @x402/core @x402/stellar @x402/hono
```

Express 4 and 5 both work. `@x402/express` declares `^4.0.0 || ^5.0.0`. The examples and the
live test run Express 5.

## Quickstart

```bash
npx stellar-paywall-init      # writes .env.example
cp .env.example .env          # fill in STELLAR_RECIPIENT and OZ_API_KEY, see the runbook
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

For **Hono** (`examples/hono-app`), the route config is identical. Only the import and the mount
change: `from "stellar-x402-paywall-kit/hono"`, and `app.use("*", stellarPaywall({ ... }))`.

Run either example, then pay it with [`stellar-agent-pay-cli`](https://github.com/StevenMolina22/stellar-agent-pay-cli):

```bash
cd examples/express-app && npm install && npm start
curl -i http://localhost:3001/weather           # 402 Payment Required, $0.001
curl -i http://localhost:3001/weather/premium   # 402 Payment Required, $0.01, second tier
stellar-agent-pay http://localhost:3001/weather # pays and unlocks
```

Two price tiers on one server is just two entries in the `routes` object. Nothing else changes.

### Or watch an agent shop: `examples/agent-catalog`

`examples/express-app` proves the plumbing. [`examples/agent-catalog`](examples/agent-catalog)
is the demo worth showing: a paywalled research catalog at three price tiers
($0.001 index, $0.005 per report, $0.05 synthesis) driven by Claude Code through the
CLI's MCP server on a $0.02 budget. The agent buys the index, decides which reports
are worth $0.005, then gets refused on the synthesis when the cumulative cap runs
out. A fourth route sells the same data cheaper from an unvetted recipient, and the
operator's allow-list refuses it. See that example's README for the run.

## Testnet runbook

1. `node scripts/setup-testnet.mjs` generates a recipient and payer keypair, funds both via
   Friendbot, adds a USDC trustline to both, and writes `.env`.
2. Fund the payer with testnet USDC at [faucet.circle.com](https://faucet.circle.com/), Stellar
   testnet, using the payer address the script printed.
3. Generate a Channels testnet key at
   [channels.openzeppelin.com/testnet/gen](https://channels.openzeppelin.com/testnet/gen) and
   paste it into `OZ_API_KEY`.
4. `cd examples/express-app && npm install && npm start`.

Steps 2 and 3 are web only, a captcha and a login. That is a Channels limitation, not a gap here.

## Proof of work

This exact server, paid by the sibling CLI, on Stellar testnet. Not mocked. Verify any of these
on [Stellar Expert](https://stellar.expert/explorer/testnet):

| tx hash | route | price |
|---|---|---|
| [`d8adef29...ee7e14fe`](https://stellar.expert/explorer/testnet/tx/d8adef2991af899cbf1009d06e8a428199f7b642ab65948c3fabbf70ee7e14fe) | `GET /weather` | $0.001 |
| [`4b0524e7...cdab979b83`](https://stellar.expert/explorer/testnet/tx/4b0524e754703b99237558f94cc5b89e74e2e4ee3aa2d99d7b9527cdab979b83) | `GET /weather` | $0.001 |
| [`3ee14d47...9fed611`](https://stellar.expert/explorer/testnet/tx/3ee14d47ee8ae5b3e4eb374ddb178f108d72e63c262244cce68a563fb9fed611) | `GET /weather/premium` (2nd tier, same server) | $0.01 |

## How the 402 flow works

1. Client requests `GET /weather`.
2. Server replies `402 Payment Required` with a challenge: price, `payTo`, network.
3. Client builds a Stellar SAC USDC transfer and signs only the auth entries. No XLM needed.
4. Client repeats the request with a `PAYMENT-SIGNATURE` header (`X-PAYMENT` in x402 v1).
5. Server verifies and settles through the Channels facilitator, which submits to Stellar.
   This takes roughly 5 seconds.
6. Server returns `200 OK` with the resource.

Step 6 only happens after step 5 succeeds. See [SECURITY.md](SECURITY.md).

Protocol details are in the [x402 spec](https://github.com/x402-foundation/x402).

## API

### `stellarPaywall(routes, opts?)`

Exported from `stellar-x402-paywall-kit/express` and `stellar-x402-paywall-kit/hono`.

- `routes`: `{ "METHOD /path": { price, payTo?, description? } }`
  - `price`: `"$0.001"`, converted to 7-decimal USDC base units. Or
    `{ amount: "1000", asset: "<SAC contract id>" }` for a non-USDC asset.
  - `payTo`: recipient `G...` address. Falls back to `opts.payTo`, then `STELLAR_RECIPIENT`.
- `opts.network`: `"stellar:testnet"` (default) or `"stellar:pubnet"`.
- `opts.ozApiKey`: Channels API key. Falls back to `OZ_API_KEY`.
- `opts.payTo`: default recipient for routes without their own. Falls back to `STELLAR_RECIPIENT`.
- `opts.facilitatorUrl`: override the Channels URL. Rarely needed.
- `opts.paywallConfig`: passed straight through to the underlying `paymentMiddleware`, for
  options this preset does not wrap.

### `createStellarFacilitator(opts?)`

Exported from `stellar-x402-paywall-kit`. Framework agnostic, returns `{ network, payTo, server }`.
Use it directly when you need resource-server level control, such as custom paywall HTML or
`onProtectedRequest` hooks, instead of the one-line preset.

## Mainnet

Only `.env` changes. No code changes:

| Var | Testnet | Mainnet |
|---|---|---|
| `STELLAR_NETWORK` | `stellar:testnet` | `stellar:pubnet` |
| `OZ_API_KEY` | from `/testnet/gen` | from `channels.openzeppelin.com/gen` |
| `STELLAR_RECIPIENT` | testnet `G...` with USDC trustline | mainnet `G...` with USDC trustline |

## Troubleshooting

**`Failed to initialize: no supported payment kinds loaded from any facilitator`, right after
calling `stellarPaywall()`.** The middleware syncs with the facilitator in the background as
soon as it is created (`syncFacilitatorOnStart`, on by default). A missing or wrong
`OZ_API_KEY` surfaces as an unhandled rejection rather than a thrown error, with a 401 in the
logs. Check that the key matches `STELLAR_NETWORK`. Testnet keys do not work on pubnet.

## Testing

```bash
npm test   # 9 unit tests, no network needed
```

`test/e2e.test.js` adds one live test that pays a real route through the Channels testnet
facilitator. It needs `OZ_API_KEY`, `STELLAR_RECIPIENT` and `STELLAR_PAYER_SECRET`, and skips
without them. With credentials present the suite is 10 of 10.

## Security

Three things to know before this handles real money:

- Delivery is already gated on settlement, not just verification. `@x402/express` buffers your
  handler's response and flushes it only once settlement succeeds.
- This kit adds no idempotency or replay store. If a double-grant would matter, add your own.
- Pin `@x402/*` exactly in your lockfile rather than floating on `^`, and watch advisories.

Full detail with citations: [SECURITY.md](SECURITY.md).

## About

Built for the GrantFox Stellar Builder Summit SP 2026 bounty, sub-lane 3A (Agentic Payments).
It pairs with [`stellar-agent-pay-cli`](https://github.com/StevenMolina22/stellar-agent-pay-cli),
sub-lane 3B, for a full 402, pay, unlock demo: gate a route with this kit, pay it with that CLI.

## License

MIT
