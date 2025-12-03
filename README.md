# XVoid Private Transaction Routing Network

XVoid is an entirely off-chain, AI-assisted privacy relay built to obfuscate Solana transfers without modifying on-chain programs. Transactions are split into randomized fragments, routed through independent swarm nodes, relayed via temporary shadow wallets, padded with noise transfers, and scheduled with adaptive delays. All fragments are executed with standard System Program or SPL Token transfers issued by the nodes themselves.

## Architecture Overview

```
Client/Web → Coordinator API → AI Routing Engine → Fragment Scheduler
                                        ↓
                                 Task Store / Node Registry
                                        ↓
                               Swarm Nodes (executors)
                                        ↓
                           Solana RPC (System/SPL transfers)
```

- **Coordinator (`coordinator/`)** – Fastify/Express-style API (implemented with Express) that validates requests, computes routing plans, fragments transfers, assigns nodes, exposes polling endpoints, and tracks per-fragment lifecycle.
- **AI Routing Engine (`ai/`)** – Rule-based planner that adapts fragment counts, delays, shadow wallet usage, and noise injections from privacy level + live TPS hints.
- **Common Utilities (`common/`)** – Shared TypeScript interfaces, Solana helpers, and the shadow wallet generator used across packages.
- **Swarm Nodes (`node/`)** – Worker agents that register with the coordinator, fetch fragment tasks, perform (or simulate) transfers, generate temporary wallets, emit noise traffic, and report completion.
- **SDK (`sdk/`)** – Typed JavaScript/TypeScript client with retrying HTTP wrappers for programmatic integrations.
- **Web UI (`web-ui/`)** – Next.js dashboard to submit private transfers and monitor status in real time.
- **Docker (`docker/`, `docker-compose.yml`)** – Reproducible environment with one coordinator, two swarm nodes, and the web UI.

### Fragment Lifecycle
1. **Submit** – Client sends `recipient`, `amount`, `privacyLevel`.
2. **Plan** – AI engine determines fragment count, delays, shadow wallets, and noise envelopes; optional TPS hint tightens delays.
3. **Schedule** – Coordinator fragments the transfer, enqueues tasks, and balances assignments across available nodes.
4. **Execute** – Nodes dequeue fragments, wait adaptive delays, build temporary wallets, execute SOL/SPL transfers (or simulate), inject noise, then destroy ephemeral keys.
5. **Report** – Nodes post signatures/status; coordinator retries failed fragments (with limited attempts) and exposes progress through `/tasks/:trackingId/status`.

## Coordinator API

| Endpoint | Description |
| --- | --- |
| `POST /submit` | Validate request, build plan, queue fragments. Returns `{ trackingId }`. |
| `POST /nodes/register` | Register swarm node capacity/endpoint metadata. |
| `POST /nodes/heartbeat` | Nodes report liveness every 10–20s; keeps load metrics fresh. |
| `GET /tasks/next?nodeId=XYZ` | Node polling endpoint delivering the next fragment (or `{ task: null }`). |
| `POST /tasks/report` | Nodes report completion/failure + signature. Retries pending fragments when needed. |
| `GET /tasks/:trackingId/status` | Public tracker with counts for total/completed/pending/failed fragments. |
| `GET /health` | Lightweight status check. |

Internal systems include a load-aware scheduler, fragment retry queue, node availability scoring, TPS monitor, and structured logging (Pino) with no key leakage.

## Swarm Node Agent

- Loads required environment variables (`XVOID_NODE_ID`, `XVOID_COORDINATOR_URL`, `XVOID_SOLANA_RPC_URL`, `XVOID_HOT_WALLET_SECRET_KEY`, etc.).
- Registers once, then maintains heartbeats on a configurable interval.
- Polls for fragments, respects coordinator-assigned `delayMs`, generates requested shadow wallets, issues noise transfers, executes/simulates the fragment transfer, and reports signed completion.
- Supports concurrent execution via `p-queue`.
- Simulation mode (`XVOID_SIMULATE_TRANSFERS=true`) skips Solana RPC while still exercising the full workflow.

## AI Routing Engine

- **Fragment counts**: low=2, medium=4, high=6.
- **Delay bands**: 0.5–2s / 2–5s / 5–12s with TPS-driven adjustments (reduce when TPS > 2000, increase when TPS < 1500).
- **Shadow wallets**: (0–1), (1–2), (2–4) per fragment depending on privacy.
- **Noise tx**: 0 / 1–2 / 2–4 fake transfers.
- **Load balancing**: deterministic-yet-random assignment across currently registered nodes weighted by free capacity.

## Shared Utilities

- `common/src/types` – Canonical interfaces for nodes, tasks, fragments, statuses, routing plans, and reports.
- `common/src/utils/shadowWallet.ts` – Secure helper that generates disposable Solana keypairs (never logged).
- `common/src/utils/solana.ts` – Connection factory plus wrappers for SOL/SPL transfers, recent blockhash, and TPS sampling.

## Web UI

- `/` – Professional form to submit a recipient, amount, and privacy tier. Displays the issued tracking ID with a deep-link.
- `/status/[trackingId]` – Live dashboard that polls every 3 seconds via the SDK, summarizing total/completed/pending/failed fragments.
- Built with Next.js + TypeScript, styled with custom CSS tokens, and powered by the shared SDK.

## SDK Usage

```ts
import { XVoidClient } from '@xvoid/sdk';

const client = new XVoidClient({ baseUrl: 'http://localhost:4000' });

const { trackingId } = await client.send({
  recipient: 'ExampleRecipient1111111111111111111111111111',
  amount: 1.25,
  privacy: 'high'
});

const status = await client.getStatus(trackingId);
console.log(status.completed, '/', status.totalFragments);
```

Retry logic, schema validation (Zod), and helpful errors are included out of the box.

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Build everything**
   ```bash
   npm run build
   ```
3. **Run packages independently**
   - Coordinator: `npm run dev --workspace coordinator`
   - Swarm node: `npm run dev --workspace node`
   - Web UI: `npm run dev --workspace web-ui`
4. **Environment variables**

| Component | Key | Description |
| --- | --- | --- |
| Coordinator | `COORDINATOR_PORT` | HTTP port (default 4000). |
|  | `XVOID_SOLANA_RPC_URL` | Primary Solana RPC endpoint. |
|  | `XVOID_REDIS_URL` | Optional Redis (future use). |
|  | `XVOID_MAX_RETRIES` | Fragment retry limit. |
| Swarm Node | `XVOID_NODE_ID` | Unique identifier. |
|  | `XVOID_COORDINATOR_URL` | Coordinator base URL. |
|  | `XVOID_SOLANA_RPC_URL` | RPC endpoint used for transfers. |
|  | `XVOID_HOT_WALLET_SECRET_KEY` | Base64/JSON secret key (required unless simulating). |
|  | `XVOID_NODE_CAPACITY` | Concurrent fragment limit. |
|  | `XVOID_NODE_ENDPOINT` | Metadata only, displayed in coordinator. |
|  | `XVOID_SIMULATE_TRANSFERS` | `true` to skip actual Solana sends. |
| Web UI | `NEXT_PUBLIC_COORDINATOR_URL` | Coordinator endpoint reachable from the browser. |

## Docker & Compose

1. Build + run the full stack:
   ```bash
   docker compose up --build
   ```
2. Services:
   - `coordinator` on `localhost:4000`
   - Two swarm nodes (`node_a`, `node_b`) registering automatically (simulation mode by default).
   - `web` Next.js UI on `localhost:3000`
3. Provide real Solana hot wallet keys by exporting `XVOID_HOT_WALLET_SECRET_KEY` / `XVOID_NODE_B_SECRET_KEY` before running compose if you intend to execute live transfers.

## Operational Notes

- No Solana smart contracts, Anchor code, or experimental programs are deployed—workers only invoke System Program or SPL token transfers.
- Private keys are never logged; sensitive fields remain in-memory.
- All logic remains off-chain; disabling any on-chain feature flag does not impact XVoid.

With these modules the repository delivers a production-ready foundation for off-chain Solana privacy routing, complete with Node/TypeScript services, SDK, UI, and container orchestration.

