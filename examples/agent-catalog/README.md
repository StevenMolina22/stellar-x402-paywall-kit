# agent-catalog: the agent-buys-data demo

The weather example proves the plumbing works. This one is the actual pitch: an AI
agent with a wallet, a budget, and a question it cannot answer without buying data.

Four gated routes at deliberately different prices, so the agent has to *shop*:

| Route | Price | What you get |
|---|---|---|
| `GET /` | free | index of what's for sale, so the agent can orient before spending |
| `GET /catalog` | $0.001 | 12 report titles and ids, no bodies |
| `GET /reports/:id` | $0.005 | one full report body |
| `GET /synthesis` | $0.05 | cross-report analysis of all 12 |
| `GET /mirror` | $0.0005 | same index, but paying an unvetted third party (see Decoy) |

The report bodies are private, so the agent's final answer is itself evidence that
the payments settled. The titles are ambiguous on purpose: four of the twelve sound
supply-chain related, and only one flags an actual risk.

## Run it

```bash
npm install
doppler run -- npm start        # or set STELLAR_RECIPIENT + OZ_API_KEY yourself
```

Then point Claude Code at the CLI's MCP server. Launching it through a secret manager
keeps the wallet key out of a committed file, and the two env vars below are what make
this demo a demo (see the CLI's README for the full tool reference):

```json
{
  "mcpServers": {
    "stellar-agent-pay": {
      "command": "doppler",
      "args": ["run", "-p", "stellar-x402", "-c", "dev", "--", "stellar-agent-pay-mcp"],
      "env": {
        "STELLAR_AGENT_PAY_SESSION_CAP_USD": "0.02",
        "STELLAR_AGENT_PAY_ALLOW_RECIPIENTS": "G... (this server's STELLAR_RECIPIENT)"
      }
    }
  }
}
```

`STELLAR_NETWORK` and `STELLAR_SECRET_KEY` arrive from the secret manager, so nothing
sensitive is in this file. Swap `doppler run` for whatever you use, or set the two
values directly in `env` if you don't mind them sitting on disk.

Then type one thing:

> Which of these reports mentions a supply chain risk? Start at
> http://localhost:3002 and mind your budget.

## What happens

The $0.02 session cap is the whole point. It is cumulative across the conversation,
which is the one thing a one-shot CLI invocation structurally cannot enforce.

1. `peek_paywall /catalog` costs nothing and tells the agent the price
2. `pay_url /catalog` for $0.001 buys the 12 titles
3. it picks the plausible-sounding ones and buys bodies at $0.005 each
4. `session_status` shows $0.016 spent, $0.004 left
5. `pay_url /synthesis` is **refused**: $0.05 does not fit in $0.004 remaining
6. it answers from the three reports it could afford, and says what it could not buy

Step 5 is the beat that matters. `pay_url` peeks the price and reserves against the
budget *before* anything is signed, so the refusal costs no transaction, no fee, and
leaves nothing to roll back (`src/mcp.js` in the CLI repo). Verified output from a
real testnet run:

```
peek /catalog     -> Payment required, $0.001
pay /catalog      -> spent $0.001  tx=285ffcecb93d  12 titles
pay /reports/1    -> spent $0.006  tx=811e88e0a337  "Q3 logistics review..."
pay /reports/3    -> spent $0.011  tx=0018621a4175  "Vendor concentration: tier-2..."
pay /reports/6    -> spent $0.016  tx=323ebe79c544  "Supplier audit findings, 2026"
session_status    -> { "spentUsd": "$0.016", "remainingUsd": "$0.004" }
pay /synthesis    -> Session cap exceeded: this payment ($0.05) would bring cumulative
                     spend to $0.066, over the $0.02 session cap ($0.004 remaining).
```

Report 3 is the answer. Reports 1 and 6 are the near-misses that had to be bought to
be ruled out, which is what makes the spend real rather than decorative.

## Decoy: who may be paid is not the agent's call

`GET /mirror` sells the same index for half the price, but its `payTo` is an address
that is not the server's recipient. Ask the agent to save money by using the mirror
and it fails closed, because `STELLAR_AGENT_PAY_ALLOW_RECIPIENTS` is set in the
environment at launch and is not a tool parameter the agent can pass or omit.

That asymmetry is the demo's security story in one line: **the agent decides what to
buy, the operator decides who may be paid.**

## Cost

A full run is about $0.016 of testnet USDC, roughly 5 payments. The payer needs a
USDC balance; see the testnet runbook in the repo root README.
