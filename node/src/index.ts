import dotenv from "dotenv";
import { NodeAgent } from "./agent";

dotenv.config();

const NODE_ID = process.env.XVOID_NODE_ID || `node-${Date.now()}`;
const COORDINATOR_URL = process.env.XVOID_COORDINATOR_URL || "http://localhost:3001";
const CAPACITY = parseInt(process.env.XVOID_NODE_CAPACITY || "10", 10);

console.log("Starting XVoid Node Agent...");
console.log(`Node ID: ${NODE_ID}`);
console.log(`Coordinator URL: ${COORDINATOR_URL}`);
console.log(`Capacity: ${CAPACITY}`);

const agent = new NodeAgent(NODE_ID, COORDINATOR_URL, CAPACITY);

agent.start().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  agent.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down...");
  agent.stop();
  process.exit(0);
});

