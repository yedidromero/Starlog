# Starlog

**Travel and meet, pay your way.**

Starlog is a travel and activities prototype with a text and voice assistant. This repository includes a booking portal and backend, a traveler guide, a LiveKit agent, an MCP server, and Stellar Soroban contracts.

> **Demo scope:** Current flows use Stellar Testnet, Duffel sandbox, and LiveKit Cloud. Madrid, València, and Barcelona recommendations, destination cards, and event cards are sample content for testing; their displayed prices and availability are not live offers or valid tickets. Musement sandbox orders are disabled by default. This is not a production booking or payment service.

## What Starlog includes

- A booking portal with Pollar authentication, a Stellar wallet, and a wallet balance view.
- A traveler guide with sample recommendations for Madrid, València, and Barcelona.
- A text and voice travel assistant powered by LiveKit.
- Duffel sandbox flight search and Estela MCP tools for event search, quotes, and Testnet bookings.
- Soroban contracts and TypeScript bindings for escrow and two OpenZeppelin-based NFTs: Estela Pass and Estela Stamps.

A flight search or quote does not create a booking. The booking flow requires passenger details and explicit confirmation of the amount. Testnet payments and sandbox orders are not real travel purchases.

## Deployed OpenZeppelin NFTs

Estela Pass and Estela Stamps use OpenZeppelin Contracts for Stellar 0.8.0 (`stellar-tokens` and `stellar-access`). Both are non-transferable NFTs deployed on Stellar Testnet:

| NFT | Testnet contract ID | Purpose |
|---|---|---|
| Estela Pass | `CB6ENR37I5ZIGRAWHTYBTWI4ZCOTZKK2I75CLLHCDIUTP3QG4VO2WL6S` | One membership NFT per traveler, minted after the first XP award; tracks XP, level, and member discount. |
| Estela Stamps | `CDQQ7PKXRNOYZUW47USR6OJCODKPH45OCYRODEMYHO7LJZDO7Y2HF7ZD` | Collectible proof of an event check-in or completed trip; awards XP to Estela Pass. |

The contract IDs and deployment details are recorded in [deploy/testnet.json](deploy/testnet.json). NFT metadata URLs are still placeholders, so the artwork and metadata are not yet published.

## How the components connect

~~~mermaid
flowchart LR
  Traveler --> Guide[Guide web app]
  Guide --> LiveKit[LiveKit]
  LiveKit --> Agent[Starlog voice agent]
  Agent --> MCP[Estela MCP tools]
  Guide --> Duffel[Duffel sandbox]
  Agent --> Web[Booking portal and backend]
  MCP --> Web
  Web --> Stellar[Stellar Testnet]
  Stellar --> Soroban[Soroban contracts]
  Traveler --> Pollar[Pollar wallet]
~~~

The traveler’s Pollar wallet and the MCP agent’s Stellar wallet are separate accounts.

## Repository layout

| Path | Purpose |
|---|---|
| apps/web | Booking portal, authentication, backend API, and Stellar payment flows. |
| apps/guide-web | Traveler guide, recommendations, flight search, and assistant interface. |
| apps/agent | LiveKit text and voice agent. |
| mcp | Estela tools for event search, flight search, quotes, and Testnet bookings. |
| contracts | Soroban contract source code. |
| packages | TypeScript bindings for the contracts. |
| knowledge | Sample destination guide content for Madrid, València, and Barcelona. |
| deploy/testnet.json | Testnet contract IDs, assets, network settings, and demo transactions. |

Some components retain internal “Estela” names. They are part of the Starlog project.

## Local development

Each app has its own dependencies and environment variables. Copy the relevant .env.example file to .env.local, fill in the required values, and keep .env.local out of Git.

### Booking portal and backend

Configure apps/web/.env.local using [apps/web/.env.example](apps/web/.env.example). It includes Pollar, Duffel, and Stellar settings. Use the contract IDs in [deploy/testnet.json](deploy/testnet.json).

In PowerShell, from the repository root:

~~~powershell
cd apps/web
Copy-Item .env.example .env.local
npm ci
$env:PORT = "3002"
npm run dev
~~~

Fill in the environment values before starting the app.

### Traveler guide

Configure apps/guide-web/.env.local using [apps/guide-web/.env.example](apps/guide-web/.env.example). The guide uses Duffel sandbox and optional Pollar Testnet settings.

~~~powershell
cd apps/guide-web
Copy-Item .env.example .env.local
pnpm install
pnpm exec next dev -p 3001
~~~

Open [http://localhost:3001/?assistant=flights](http://localhost:3001/?assistant=flights).

### LiveKit agent

Configure apps/agent/.env.local using [apps/agent/.env.example](apps/agent/.env.example). Use the same LiveKit credentials and STARLOG_INTERNAL_API_TOKEN in the guide and agent configuration. Set STARLOG_WEB_API_URL to http://localhost:3001 and STARLOG_MCP_DIR to the absolute path of this repository’s mcp folder.

~~~powershell
cd apps/agent
Copy-Item .env.example .env.local
pnpm install
$env:NODE_OPTIONS = "--use-system-ca"
pnpm dev
~~~

The Windows NODE_OPTIONS setting lets the agent use the system certificates when connecting to LiveKit Cloud.

### Estela MCP tools

The LiveKit agent starts the MCP server when STARLOG_MCP_DIR and the Testnet agent wallet are configured. Set ESTELA_URL in mcp/.env.local to the backend address, such as http://localhost:3002.

To run the MCP server on its own:

~~~powershell
cd mcp
npm ci
npm run setup:wallet
npm run setup:testnet
node --env-file=.env.local src/index.mjs
~~~

The wallet setup stores its secret in the ignored mcp/.env.local file. Fund the agent with Testnet USDC before using paid search and quote tools. Never commit wallet secrets or API tokens.

## Testnet and sandbox

Use the Testnet contract and asset settings in [deploy/testnet.json](deploy/testnet.json). These values are not Mainnet configuration.

The guide uses DUFFEL_ACCESS_TOKEN; the booking backend uses DUFFEL_TOKEN. Both must be sandbox credentials. Musement partner credentials are optional, and sandbox orders are disabled by default.

The MCP tools are buscar_eventos, buscar_vuelos, cotizar, reservar, and mi_estela_pass. See [mcp/README.md](mcp/README.md) for MCP-specific usage and test details.

Do not replace the deployed contract role keys with newly generated keys. The server signing keys must match the roles already assigned to the Testnet contracts.
