# Starlog Guide Web

Aplicación Next.js de viajes con búsqueda de vuelos Duffel sandbox, recomendaciones, Pollar testnet y asistente LiveKit. Esta es la interfaz que se probaba en `http://localhost:3001/?assistant=flights`. El portal de reservas y el backend de Estela están en `../web` dentro del mismo repositorio.

## Arranque local

En `apps/guide-web`:

```powershell
Copy-Item .env.example .env.local
pnpm install
pnpm exec next dev -p 3001
```

En `apps/agent`, en otra terminal:

```powershell
Copy-Item .env.example .env.local
pnpm install
$env:NODE_OPTIONS='--use-system-ca' # Windows: usar certificados del sistema para LiveKit Cloud
pnpm dev
```

Configura `LIVEKIT_URL`, `LIVEKIT_API_KEY` y `LIVEKIT_API_SECRET` en ambos `.env.local`. Usa el mismo valor privado de `STARLOG_INTERNAL_API_TOKEN` en ambos. En `apps/agent/.env.local`, define `STARLOG_WEB_API_URL=http://localhost:3001` y `STARLOG_MCP_DIR` con la ruta absoluta al directorio `mcp` de este repositorio. El nombre del worker LiveKit es `starlog-guide`.

Para las cotizaciones y reservas mediante Estela, arranca el backend `apps/web` por separado (por ejemplo en el puerto 3002), configura `mcp/.env.local` con `ESTELA_URL=http://localhost:3002` y prepara la wallet testnet siguiendo [`../../mcp/README.md`](../../mcp/README.md). La búsqueda de Duffel necesita `DUFFEL_ACCESS_TOKEN` de prueba en `apps/guide-web/.env.local`.

## Alcance del prototipo

- Recomendaciones y guía conversacional por texto y voz.
- Guías de Madrid, Valencia y Barcelona en `knowledge/`.
- Búsqueda de vuelos Duffel sandbox y cotizaciones testnet mediante Starlog MCP.
- Pollar en Stellar testnet cuando se configura `NEXT_PUBLIC_POLLAR_API_KEY` y el dominio permitido en Pollar.
- Musement sandbox solo con credenciales de partner; por defecto no se crean pedidos.

Elegir o cotizar un vuelo no hace una reserva. El paso `reservar` requiere datos del pasajero y aprobación explícita del importe. Las tarjetas de destino y eventos son demostrativas; no emiten entradas válidas para un recinto.

Los borradores locales de meetup se guardan en `apps/guide-web/.data/meetup-drafts.json`; requieren revisión humana antes de publicarse. Mantén todos los `.env.local` fuera de Git.
