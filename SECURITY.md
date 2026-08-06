# Security considerations

What this kit handles for you, and what it deliberately leaves to your application.

## Response delivery is already gated on settlement

This was confirmed by reading the source of `@x402/express`, not just its docs.

On a `payment-verified` result, the middleware buffers your route handler's response. It
intercepts `res.write` and `res.end`, and only flushes to the client after
`processSettlement()` succeeds. If settlement fails, the buffered body is discarded and a
settlement-failure response is sent instead.

So a client never sees your resource before its payment actually settles. That part of the
design is sound out of the box.

## This kit does not add idempotency or replay protection

A signed x402 auth entry stays valid until its `max_ledger` expiration. That bounds how long
a payment is valid. It does not record whether the payment has already been redeemed.

Research on x402 deployments documented resource servers that granted access **248 times for
a single settlement**, because nothing tracked that the payment was already claimed
([Five Attacks on x402, arXiv:2605.11781](https://arxiv.org/html/2605.11781v1)).

Separately, the x402 facilitator docs call out a real race that merchants must handle
themselves: a payment resubmitted to `/settle` before the first attempt confirms
([docs.x402.org/core-concepts/facilitator](https://docs.x402.org/core-concepts/facilitator)).
Whether OZ Channels' Stellar `/settle` deduplicates that is not documented anywhere we could
find.

This kit is a thin preset over the official packages. It does not add a claim-per-payment
store. If a double-grant would matter for your route, add your own idempotency cache before
trusting a single verify and settle as proof the payment has never been seen. Key it on a
hash of the payment payload, or on the settled transaction hash.

The distinction that matters is not "serve the same JSON twice". It is something like
issuing a single-use credential.

## Concurrent requests can each pass a client-side spend policy

This affects the buyer side, not this seller kit. It is worth knowing if you are building
both halves of a demo.

An x402 `PaymentPolicy` filter runs per request. So several simultaneous requests from one
agent can each pass a cap independently, before any of them settle
([Free-Riding the Agentic Web, arXiv:2605.30998](https://arxiv.org/pdf/2605.30998)).

See [`stellar-agent-pay-cli`](https://github.com/StevenMolina22/stellar-agent-pay-cli) for
the session-level mitigation.

## Why there is no signature-normalization layer

This is a comparative note, not a hypothetical.

EVM x402 implementations have hit real interoperability bugs from ECDSA's `v` recovery id.
It has three incompatible encodings across wallets and SDKs: `yParity` (0 or 1), legacy
(27 or 28), and EIP-155 (`chainId*2+35+yParity`). Shipped x402 demos carry their own
`normalizeSignatureV` workaround before submitting a payment header.

Stellar's exact-scheme auth entries are signed with Ed25519. It has no recovery id and only
one canonical 64-byte signature encoding, so that whole class of bug does not exist here.
Confirmed against a live payment in this repo's own testing, not assumed.

## Dependency pinning

This kit's `devDependencies` pin `@x402/*` to an exact `2.20.0` for reproducible tests. Its
`peerDependencies` stay range-based on `^2.20.0`, which is the right call for a library so it
does not fight your app's lockfile.

Pin exact versions in your own app's lockfile rather than floating on `^`.

Two advisories are worth knowing about, though neither applies to this kit directly.
[GHSA-3j63-5h8p-gf7c](https://github.com/advisories/GHSA-3j63-5h8p-gf7c) hit the older,
differently named `x402`, `x402-express` and `x402-hono` v1 packages, not the `@x402/*` v2
family used here. [GHSA-qr2g-p6q7-w82m](https://github.com/advisories/GHSA-qr2g-p6q7-w82m)
hit `@x402/svm` facilitators, not Stellar's.

Both are evidence that this protocol has had real facilitator-side vulnerabilities. Watch
advisories rather than assuming a floating range stays safe.
