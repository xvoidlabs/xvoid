# XVoid - Solana Privacy Routing Service

XVoid is a production-ready privacy routing service for Solana that enables users to privately route SOL transfers on mainnet using fragmentation, swarm routing, shadow wallets, and adaptive delays.

## Overview

XVoid breaks the on-chain link between a user's entry transfer and the recipient's receipt by:

1. **Entry Leg**: User signs a single normal System Program transfer to an XVoid entry wallet
2. **Exit Leg**: XVoid's coordinator and swarm nodes fragment and route the transfer to the recipient using:
   - Multiple fragment transfers of varying sizes
   - Shadow wallets for intermediate hops
   - Adaptive delays between fragments
   - Optional noise transactions

**Key Principles:**
- No smart contracts
- No confidential transfers
- No zero-knowledge proofs
- No state compression
- Only standard System Program transfers
- Privacy achieved through off-chain coordination and routing

## Architecture

### Two-Leg Model

**Leg 1: Entry Transfer**
- User connects wallet and signs a transfer to XVoid entry wallet
- Coordinator verifies the deposit transaction

**Leg 2: Exit Fragments**
- Coordinator creates a fragmentation plan based on privacy level
- Swarm nodes execute fragment transfers via shadow wallets
- Recipient receives multiple dispersed transfers

### Components

- **Coordinator**: Manages route intents, confirms deposits, creates routing plans, assigns tasks to nodes
- **Node Agent**: Executes fragment tasks, creates shadow wallets, sends noise transactions
- **AI Routing Engine**: Rule-based engine that plans fragments based on privacy level
- **Web UI**: Next.js interface for creating and monitoring routes
- **SDK**: TypeScript client library for interacting with the coordinator

## Privacy Levels

- **Low**: 2 fragments, 0.5-3s delays, minimal noise
- **Medium**: 4 fragments, 3-20s delays, 1-2 noise transactions, 1-2 shadow wallets
- **High**: 6 fragments, 10-60s delays, 2-4 noise transactions, 2-3 shadow wallets

## Quick Start

### Prerequisites

- Node.js 20+ LTS
- npm or yarn
- Solana wallet (Phantom, Solflare, etc.)
- Solana RPC endpoint (mainnet)

### Local Development

1. **Install Dependencies**

```bash
npm install
```

2. **Build Common Modules**

```bash
npm run build --workspace=common
npm run build --workspace=ai
npm run build --workspace=sdk
```

3. **Start Coordinator**

```bash
cd coordinator
npm run dev
```

Environment variables:
```bash
PORT=3001
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
XVOID_ENTRY_WALLET_SECRET_KEY=<base58-or-json-array>
```

4. **Start Node Agent**

```bash
cd node
npm run dev
```

Environment variables:
```bash
XVOID_NODE_ID=node-1
XVOID_COORDINATOR_URL=http://localhost:3001
XVOID_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
XVOID_NODE_HOT_WALLET_SECRET_KEY=<base58-or-json-array>
XVOID_NODE_CAPACITY=10
```

5. **Start Web UI**

```bash
cd web-ui
npm run dev
```

Environment variables:
```bash
NEXT_PUBLIC_COORDINATOR_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Docker Deployment

1. **Set Environment Variables**

Create a `.env` file:

```bash
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
XVOID_ENTRY_WALLET_SECRET_KEY=<base58-or-json-array>
XVOID_NODE_ID=node-1
XVOID_NODE_HOT_WALLET_SECRET_KEY=<base58-or-json-array>
XVOID_NODE_CAPACITY=10
```

2. **Build and Run**

```bash
docker-compose up --build
```

Services will be available at:
- Coordinator: http://localhost:3001
- Web UI: http://localhost:3000

## Wallet Setup

### Entry Wallet

The entry wallet receives user deposits. Generate a keypair:

```javascript
const { Keypair } = require('@solana/web3.js');
const keypair = Keypair.generate();
console.log('Public Key:', keypair.publicKey.toBase58());
console.log('Secret Key (base58):', require('bs58').encode(keypair.secretKey));
console.log('Secret Key (JSON):', JSON.stringify(Array.from(keypair.secretKey)));
```

Fund this wallet with SOL to cover transaction fees for node operations.

### Node Hot Wallet

Each node needs a hot wallet to execute fragment transfers. Generate similarly:

```javascript
const { Keypair } = require('@solana/web3.js');
const keypair = Keypair.generate();
console.log('Public Key:', keypair.publicKey.toBase58());
console.log('Secret Key (base58):', require('bs58').encode(keypair.secretKey));
```

**Important**: Nodes will need periodic refilling from the entry wallet. This is a TODO for production treasury management.

## API Reference

### Coordinator Endpoints

#### POST /intents
Create a new route intent.

Request:
```json
{
  "recipient": "RecipientSolanaAddress",
  "amountSol": 1.0,
  "privacyLevel": "medium",
  "senderPubkey": "SenderSolanaAddress"
}
```

Response:
```json
{
  "intentId": "intent-1234567890-abc",
  "xvEntryAddress": "EntryWalletAddress"
}
```

#### POST /intents/:id/confirm
Confirm deposit and start routing.

Request:
```json
{
  "txSignature": "TransactionSignature"
}
```

#### GET /intents/:id/status
Get intent status and fragment progress.

Response:
```json
{
  "intent": {
    "id": "intent-1234567890-abc",
    "status": "routing",
    "amountLamports": 1000000000,
    "privacyLevel": "medium",
    ...
  },
  "fragments": {
    "total": 4,
    "completed": 2,
    "pending": 2,
    "failed": 0
  }
}
```

### Node Endpoints

#### POST /nodes/register
Register a node with the coordinator.

#### POST /nodes/heartbeat
Update node heartbeat.

#### GET /tasks/next?nodeId=XYZ
Get next pending task for a node.

#### POST /tasks/report
Report task completion or failure.

## SDK Usage

```typescript
import { XVoidClient } from '@xvoid/sdk';

const client = new XVoidClient({
  baseUrl: 'http://localhost:3001'
});

// Create intent
const { intentId, xvEntryAddress } = await client.createIntent({
  recipient: 'RecipientAddress',
  amountSol: 1.0,
  privacyLevel: 'medium',
  senderPubkey: 'SenderAddress'
});

// After sending transfer to xvEntryAddress, confirm
await client.confirmIntent(intentId, txSignature);

// Check status
const status = await client.getStatus(intentId);
console.log(`Progress: ${status.fragments.completed}/${status.fragments.total}`);
```

## Project Structure

```
xvoid/
├── common/          # Shared types and utilities
├── ai/              # Routing engine
├── coordinator/     # Coordinator backend
├── node/            # Node agent
├── sdk/             # TypeScript SDK
├── web-ui/          # Next.js web interface
├── docker/          # Dockerfiles
└── docker-compose.yml
```

## Security Considerations

- **Never log private keys**: All modules are designed to never log seed phrases or private keys
- **Entry wallet security**: The entry wallet should be secured and monitored
- **Node wallet security**: Each node's hot wallet should be secured
- **RPC endpoint**: Use a reliable RPC provider or self-hosted node
- **Network isolation**: In production, consider network isolation between components

## Development Notes

- Storage is currently in-memory (Maps). Production should use Redis or a database
- Node refilling from entry wallet is a TODO
- Error handling and retries are implemented but can be enhanced
- Monitoring and logging should be added for production

## License

[Specify your license]

## Contributing

[Contributing guidelines]

