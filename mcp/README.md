# Starlog MCP

Starlog MCP is a stdio server that lets an AI agent find events and book test trips through the Estela backend:

| Tool | What it does | Cost |
|---|---|---|
| `buscar_eventos` | Upcoming events (city, airport, date, ticket price) | free |
| `buscar_vuelos` | Flight offers, cheapest first | 0.01 USDC per call (x402) |
| `cotizar` | Exact package price (flight + service fee + ticket − Estela Pass discount) | 0.005 USDC (x402) |
| `reservar` | Books and pays **through Estela's escrow** (refunded in full if the airline doesn't confirm) | the trip |
| `mi_estela_pass` | Agent's level, XP, discount and tickets | free |

The agent is a Stellar account whose secret key the server holds: it pays x402 calls
in USDC (no XLM needed, the facilitator sponsors fees), signs in to Estela with SEP-10
and signs escrow payments itself. On testnet it needs a USDC trustline + test USDC
(faucet.circle.com) for searches, and XLM (or EURC/USDC) for bookings.

## Run

```bash
npm ci
npm run setup:wallet
npm run setup:testnet
node --env-file=.env.local src/index.mjs
```

`setup:wallet` writes a new secret to the ignored `mcp/.env.local` without printing it.
`setup:testnet` uses Friendbot and creates the USDC trustline; fund the public
address with **testnet USDC** through the Circle faucet before calling paid tools.
Set `ESTELA_URL` in that file to the running Estela backend (for example,
`http://localhost:3002`). The agent's secret must stay local and must not be
committed to Git.

## Add to Claude Code

```bash
claude mcp add starlog \
  --env ESTELA_AGENT_SECRET=S... \
  --env ESTELA_URL=http://localhost:3000 \
  -- node /absolute/path/to/mcp/src/index.mjs
```

The secret ends up in your local Claude config: use a testnet agent account, never a
wallet holding real funds.

## Test

```bash
node --env-file=.env.local test/e2e.mjs                # free + paid reads (~0.015 USDC)
RUN_BOOKING=1 node --env-file=.env.local test/e2e.mjs  # also books a flight (testnet XLM)
```

In PowerShell, set `$env:RUN_BOOKING='1'` before running the second command.
