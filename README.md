# Starlog

Repositorio principal de Starlog: búsqueda de viajes y actividades, asistente por texto y voz, reservas de prueba y pagos en Stellar testnet.

## Aplicaciones

| Ruta | Función |
| --- | --- |
| `apps/web` | Portal de reservas, perfil del viajero, autenticación con Pollar y backend de pagos. |
| `apps/guide-web` | Interfaz editorial y asistente LiveKit que se probaba en `localhost:3001`. |
| `apps/agent` | Worker LiveKit para conversaciones por voz y texto. |
| `mcp` | Herramientas de Estela para búsquedas, cotizaciones y pagos de prueba. |
| `contracts`, `packages` | Contratos Soroban y bindings TypeScript. |
| `knowledge` | Guías de Madrid, Valencia y Barcelona. |

## Desarrollo local

Cada aplicación tiene sus propias dependencias y variables de entorno. Usa [`apps/guide-web/README.md`](apps/guide-web/README.md) para ejecutar la interfaz y el agente; usa [`mcp/README.md`](mcp/README.md) para configurar el MCP de Estela. Las plantillas `.env.example` indican las variables requeridas. Guarda claves, tokens y wallets solo en `.env.local`, que está excluido de Git.

Los pagos usan Stellar testnet y Duffel opera en sandbox. El catálogo de Musement requiere credenciales de partner para probar pedidos; las tarjetas y entradas reales no forman parte del flujo de prueba.
