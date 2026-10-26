# Starlog

**Travel and meet, pay your way.**

Starlog brings together travel to community events, Stellar payments, and an AI travel assistant. This repository contains the main web app and backend, Soroban contracts, TypeScript contract bindings, and an MCP server for AI clients.

> The current deployment and demo use **Stellar Testnet** and **Duffel sandbox** credentials. This is not a production booking or card-payment service.

## The problem

Travelers have to coordinate event discovery, flights, tickets, payment, and local community across separate services. Starlog connects those steps: users can discover events and flights, get a package quote, pay through a Soroban escrow, and request a flight booking through Duffel.

## Repository layout

| Path | Contents |
|---|---|
| apps/web | Next.js web app and server routes for authentication, events, flight search, quotes, bookings, escrow, and traveler data. |
| mcp | MCP server that exposes travel tools to compatible AI clients over stdio. |
| contracts | Soroban contracts for escrow, Estela Pass, Stamps, and integration work. |
| packages | TypeScript bindings for the deployed Soroban contracts. |
| deploy/testnet.json | Testnet network settings, contract and asset IDs, role addresses, and smoke-test transaction links. |

The code retains some internal Estela names (for example, contract IDs and MCP tool names); those refer to Starlog services in this repository.

## Architecture and Stellar integration

~~~mermaid
flowchart LR
  T[Traveler] --> WEB[Next.js web app]
  T --> POL[Pollar sign-in and wallet]
  WEB --> DB[(Supabase PostgreSQL)]
  WEB --> DUF[Duffel API sandbox]
  WEB --> RPC[Stellar RPC and Horizon]
  RPC --> ESC[Escrow Soroban contract]
  RPC --> PASS[Estela Pass and Stamps]
  AI[AI client] --> MCP[Starlog MCP server]
  MCP --> WEB
  MCP --> X402[x402 USDC payments]
  X402 --> RPC
~~~

- **Wallet and authentication:** Pollar handles sign-in and the traveler wallet in the browser. The Pollar publishable key selects Stellar Testnet. SEP-10 is used for Stellar wallet authentication.
- **Escrow:** the Soroban escrow contract holds a booking payment and supports release or refund according to the booking flow.
- **Pass and Stamps:** the other Soroban contracts support membership benefits, experience points, and event stamps.
- **AI tools:** the MCP server uses a separate Stellar account for agent payments and signatures. It calls the web backend; it is not the traveler's Pollar wallet.
- **Duffel:** Duffel is the flight search and booking API provider, **not the AI agent or a wallet**. The agent interface in this repository is MCP. Duffel test tokens use its sandbox; orders are paid from Starlog's Duffel balance.
- **Application APIs:** the web app includes routes such as /api/events, /api/flights/search, and /api/bookings. Agent routes include /api/agent/events, /api/agent/flights/search, and /api/agent/quotes. Flight searches and quotes use x402 micropayments on Testnet.
- **Data and network APIs:** Supabase provides PostgreSQL and project API keys. Soroban contract calls use Stellar RPC; account and asset lookups use Horizon.
- **Anchors and cards:** this checkout does not integrate a Stellar Anchor, a fiat on/off-ramp, or a card-payment provider. USDC, EURC, and XLM are Stellar assets; the app does not convert fiat or charge a real card.
- **LiveKit:** there is no LiveKit service in this checkout. The included AI-agent integration is MCP.

## Stellar Testnet contracts and assets

The deployment file at [deploy/testnet.json](deploy/testnet.json) is the source of truth. The contracts and asset contracts below are **Testnet-only**.

### Soroban contracts

| Contract | Testnet contract ID |
|---|---|
| Escrow (estelaEscrow) | CDUARFKLW2YDKWIUZAAFY2BQCWOJU46H6NVY4ZKHRPLTSDTHYPZAHCTD |
| Pass (estelaPass) | CB6ENR37I5ZIGRAWHTYBTWI4ZCOTZKK2I75CLLHCDIUTP3QG4VO2WL6S |
| Stamps (estelaStamps) | CDQQ7PKXRNOYZUW47USR6OJCODKPH45OCYRODEMYHO7LJZDO7Y2HF7ZD |

### Payment assets

| Asset | Testnet SAC contract ID | Classic issuer |
|---|---|---|
| USDC | CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA | GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 |
| EURC | CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ | GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO |
| XLM | CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC | Native Stellar asset |

Do not use these IDs or issuers as Mainnet configuration. The current web environment defaults are:

- Soroban RPC: https://soroban-testnet.stellar.org
- Horizon: https://horizon-testnet.stellar.org
- Network passphrase: Test SDF Network ; September 2015

## Requirements

Install these tools and create the required service accounts before running the app:

1. **Git** to clone the public repository.
2. **Node.js 20 LTS and npm** to install and run the web app and MCP server.
3. **Supabase** project with PostgreSQL for the app database.
4. **Pollar** application configured for Stellar Testnet.
5. **Duffel** developer account and a test-mode API token. Orders also require available Duffel sandbox balance.
6. **Testnet funds** for the Pollar traveler wallet and the MCP agent wallet: XLM from Stellar Friendbot and USDC/EURC from the [Circle Testnet Faucet](https://faucet.circle.com/).
7. The server signing keys that already hold the deployed contract roles estela-admin and estela-backend. Obtain these securely from the deployment owner. New random keys will not have those roles.

You do not need Rust or the Stellar CLI to run the existing web app and MCP server. Those are only needed when changing, building, or redeploying the Rust contracts.

## Installation and local setup

Clone the main repository:

~~~bash
git clone https://github.com/yedidromero/Starlog.git
cd Starlog
~~~

### 1. Configure the web app

Copy the committed template to a local-only environment file. In PowerShell:

~~~powershell
Copy-Item apps/web/.env.example apps/web/.env.local
~~~

Open apps/web/.env.local and fill in the values listed below. Copy the Testnet contract IDs and asset settings from deploy/testnet.json. Do not commit .env.local or put server secrets in browser-visible variables.

Install dependencies, apply the database migrations, and start Next.js:

~~~bash
cd apps/web
npm ci
npm run db:migrate
npm run dev
~~~

Open http://localhost:3000. The postinstall script builds the local TypeScript contract bindings. The app uses DATABASE_URL for the transaction pool; Drizzle migrations use DATABASE_MIGRATION_URL, normally a direct/session connection.

### 2. Configure Pollar

1. Create or configure the app in the [Pollar dashboard](https://dashboard.pollar.xyz/) and select Stellar Testnet.
2. Copy the **publishable Testnet key** from Build → API Keys to NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY. Testnet keys use the pub_testnet_ prefix.
3. In Build → Domains, allow http://localhost:3000 and add the OAuth callback http://localhost:3000/oauth/callback.
4. Start the web app and sign in. Pollar creates or connects the traveler's wallet.
5. Copy that wallet's **public Stellar address**. Fund it with test XLM from [Stellar Friendbot](https://developers.stellar.org/docs/build/guides/freighter/connect-testnet), and test USDC/EURC from [Circle Testnet Faucet](https://faucet.circle.com/). Add or approve the asset trustline in the wallet if required.

The publishable key is intended for the frontend. Never expose any Pollar secret key or a wallet's secret seed.

### 3. Configure Duffel sandbox

1. Create a test-mode access token in Duffel; see the [Duffel test-mode guide](https://duffel.com/docs/api/overview/test-mode/duffel-airways).
2. Put the token, which starts with duffel_test_, in DUFFEL_TOKEN in apps/web/.env.local.
3. Keep this token server-side; do not name it NEXT_PUBLIC_DUFFEL_TOKEN.
4. Check that the Duffel sandbox account has balance for order creation. A sandbox order is not a real airline ticket.

### 4. Configure and fund the MCP agent

Keep the web app running on localhost:3000. Open a second terminal from the repository root and run:

~~~bash
cd mcp
npm ci
npm run setup:wallet
npm run setup:testnet
~~~

- setup:wallet generates a dedicated Stellar test wallet and writes its secret to the ignored mcp/.env.local file without printing it.
- setup:testnet funds the account with native XLM using Friendbot and creates its USDC trustline. It prints the public address.
- Send test USDC to that public address from the [Circle Testnet Faucet](https://faucet.circle.com/) to pay for x402 searches and quotes.
- The generated ESTELA_URL points to http://localhost:3000. Keep it set to the running web backend.

Start the MCP server manually:

~~~bash
node --env-file=.env.local src/index.mjs
~~~

To connect an MCP host, configure a stdio server with command node and these arguments (replace the paths with absolute paths on your computer):

~~~json
{
  "mcpServers": {
    "starlog": {
      "command": "node",
      "args": [
        "--env-file=/ABSOLUTE/PATH/TO/Starlog/mcp/.env.local",
        "/ABSOLUTE/PATH/TO/Starlog/mcp/src/index.mjs"
      ]
    }
  }
}
~~~

On Windows, use absolute paths and escape backslashes in JSON. Keep this MCP host configuration private because it grants access to the agent wallet.

### 5. Run the demo

1. Start the web app and open http://localhost:3000.
2. Sign in with Pollar Testnet and fund the traveler's wallet.
3. Start the MCP server and connect it from your MCP client.
4. Try buscar_eventos first, then buscar_vuelos and cotizar.
5. Use reservar only after checking the quote, currency, and passenger details. It signs a Testnet transaction and creates a Duffel sandbox order.

## Environment variables

The full placeholder template is [apps/web/.env.example](apps/web/.env.example). Most server routes validate their configuration at runtime. Use Testnet values for this demo.

| Variable | Required value / purpose |
|---|---|
| SUPABASE_URL | Supabase project URL. |
| SUPABASE_PUBLISHABLE_KEY | Supabase publishable API key. |
| SUPABASE_SECRET_KEY | Supabase server secret key; bypasses RLS. Server only. |
| SUPABASE_JWKS_URL | Supabase Auth JWKS URL, normally https://PROJECT_REF.supabase.co/auth/v1/.well-known/jwks.json. |
| DATABASE_URL | PostgreSQL transaction-pool connection string, commonly port 6543. |
| DATABASE_MIGRATION_URL | PostgreSQL direct/session connection string for migrations, commonly port 5432. |
| SESSION_SECRET | Random string with at least 32 characters for session signing. |
| SEP10_SIGNING_SECRET | Stellar S... key for SEP-10 challenges. It needs no funds and must not be the escrow admin key. |
| WEB_AUTH_DOMAIN, HOME_DOMAIN | Use localhost:3000 for both in local development. |
| STELLAR_NETWORK_PASSPHRASE | Testnet passphrase: Test SDF Network ; September 2015. |
| STELLAR_RPC_URL | Soroban RPC URL; Testnet default is https://soroban-testnet.stellar.org. |
| HORIZON_URL | Optional Horizon URL; Testnet default is https://horizon-testnet.stellar.org. |
| ESCROW_CONTRACT_ID, PASS_CONTRACT_ID, STAMPS_CONTRACT_ID | Soroban contract IDs from deploy/testnet.json. |
| USDC_CONTRACT_ID, EURC_CONTRACT_ID, XLM_CONTRACT_ID | Stellar Asset Contract (SAC) IDs from deploy/testnet.json. |
| USDC_ISSUER, EURC_ISSUER | Optional classic issuers. Defaults in the app are the Circle Testnet issuers. |
| ESCROW_ADMIN_SECRET | Secret S... key for the deployed estela-admin escrow role. Server only. |
| BACKEND_SECRET | Secret S... key for the deployed estela-backend role (Stamps issuer and Pass awarder). Server only. |
| DUFFEL_TOKEN | Duffel test token beginning duffel_test_. Server only. |
| FLIGHT_SERVICE_FEE | Optional service fee per passenger in the offer currency; default is 10. |
| DEMO_XLM_PER_FIAT | Optional fixed Testnet demo conversion for XLM packages; default is 1. It is not a live price oracle. |
| X402_FACILITATOR_URL | Optional x402 facilitator; Testnet default is https://x402.org/facilitator. |
| X402_NETWORK | Optional x402 network; Testnet default is stellar:testnet. |
| X402_PAY_TO | Public G... Stellar address that receives agent micropayments in USDC; it needs a USDC trustline. |
| CRON_SECRET | Random string with at least 32 characters to protect cron routes. |
| NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY | Pollar Testnet publishable key, normally pub_testnet_...; safe to expose in the web bundle. |

Generate random session and cron secrets with Node:

~~~bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
~~~

SEP10_SIGNING_SECRET can be generated locally after npm ci:

~~~bash
node -e "console.log(require('@stellar/stellar-sdk').Keypair.random().secret())"
~~~

Do not generate replacement ESCROW_ADMIN_SECRET or BACKEND_SECRET values unless you are also authorized to update the deployed contract roles. Never commit secret keys, database passwords, or wallet seeds.

## MCP tools and Testnet costs

The MCP tool names are currently Spanish because they are exposed by the existing server implementation.

| Tool | Purpose | Testnet cost |
|---|---|---|
| buscar_eventos | List available events, cities, nearby airports, dates, and ticket prices. | Free |
| buscar_vuelos | Search Duffel flight offers, cheapest first. | 0.01 USDC per call through x402. |
| cotizar | Quote flight, service fee, optional event ticket, and Estela Pass discount. | 0.005 USDC through x402. |
| reservar | Pay the quoted amount to escrow and request the Duffel sandbox booking. | The trip amount in the selected Testnet asset. |
| mi_estela_pass | Read the agent's membership level, XP, discount, and tickets. | Free |

The MCP wallet and the Pollar traveler wallet are separate accounts. Friendbot supplies test XLM; Circle's faucet supplies test USDC/EURC. The x402 Testnet facilitator sponsors fees for paid reads, but bookings consume Testnet assets. No Mainnet funds are needed for the demo.

## On-chain demo evidence

deploy/testnet.json records a Stellar Testnet smoke test dated October 25, 2026. The test booked a 10 XLM package, released 3 XLM to the organizer, and issued an event stamp.

- [Create booking transaction](https://stellar.expert/explorer/testnet/tx/e31d08e7b83af10a3a6af13c7bdf1d42b228e9ff5122ba2080973c24b7866ddc)
- [Fund escrow transaction](https://stellar.expert/explorer/testnet/tx/eb1dbfe288be31a6d5ac04761aab955c8513f9525c5ade7230602a9aa71444de)
- [Release escrow transaction](https://stellar.expert/explorer/testnet/tx/509f5d080135bc0facf907cca5caf65a8c5fee9cbcb4a1d7787a48c03975b881)
- [Issue event stamp transaction](https://stellar.expert/explorer/testnet/tx/7d0878cffa820df99b59a4851650edb93f52cdfa085669ef9ddce2495c3c6fae)

These links are Testnet evidence only; they are not Mainnet payments or real travel bookings.
