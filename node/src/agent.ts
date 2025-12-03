import axios, { AxiosInstance } from "axios";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { FragmentTask } from "@xvoid/common";
import {
  createAndSendSOLTransfer,
  generateRandomAddress,
  generateShadowWallet,
  secretKeyFromBase58,
  secretKeyFromJson,
} from "@xvoid/common";

export class NodeAgent {
  private nodeId: string;
  private coordinatorUrl: string;
  private capacity: number;
  private httpClient: AxiosInstance;
  private connection: Connection;
  private hotWallet: Keypair;
  private heartbeatInterval?: NodeJS.Timeout;
  private pollingInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(nodeId: string, coordinatorUrl: string, capacity: number) {
    this.nodeId = nodeId;
    this.coordinatorUrl = coordinatorUrl;
    this.capacity = capacity;
    this.httpClient = axios.create({
      baseURL: coordinatorUrl,
      timeout: 30000,
    });

    const RPC_URL = process.env.XVOID_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    this.connection = new Connection(RPC_URL, "confirmed");

    // Load hot wallet
    const secretKeyEnv = process.env.XVOID_NODE_HOT_WALLET_SECRET_KEY;
    if (!secretKeyEnv) {
      throw new Error("XVOID_NODE_HOT_WALLET_SECRET_KEY environment variable is required");
    }

    try {
      // Try parsing as JSON array first
      const jsonArray = JSON.parse(secretKeyEnv);
      if (Array.isArray(jsonArray)) {
        const secretKey = secretKeyFromJson(jsonArray);
        this.hotWallet = Keypair.fromSecretKey(secretKey);
      } else {
        throw new Error("Invalid JSON array format");
      }
    } catch {
      // Not JSON, try as base58 string
      try {
        const secretKey = secretKeyFromBase58(secretKeyEnv);
        this.hotWallet = Keypair.fromSecretKey(secretKey);
      } catch (error) {
        throw new Error(`Failed to parse hot wallet secret key: ${error}`);
      }
    }

    console.log(`Hot wallet loaded: ${this.hotWallet.publicKey.toBase58()}`);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Register with coordinator
    await this.register();

    // Start heartbeat
    this.startHeartbeat();

    // Start task polling
    this.startPolling();

    console.log("Node agent started successfully");
  }

  stop(): void {
    this.isRunning = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    console.log("Node agent stopped");
  }

  private async register(): Promise<void> {
    try {
      await this.httpClient.post("/nodes/register", {
        nodeId: this.nodeId,
        capacity: this.capacity,
      });
      console.log("Registered with coordinator");
    } catch (error: any) {
      console.error("Failed to register:", error.message);
      throw error;
    }
  }

  private startHeartbeat(): void {
    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.httpClient.post("/nodes/heartbeat", {
          nodeId: this.nodeId,
        });
      } catch (error: any) {
        console.error("Heartbeat failed:", error.message);
      }
    }, 30000);

    // Send initial heartbeat
    this.httpClient.post("/nodes/heartbeat", {
      nodeId: this.nodeId,
    }).catch((error: any) => {
      console.error("Initial heartbeat failed:", error.message);
    });
  }

  private startPolling(): void {
    // Poll for tasks every 5 seconds
    this.pollingInterval = setInterval(async () => {
      if (!this.isRunning) {
        return;
      }

      try {
        const response = await this.httpClient.get("/tasks/next", {
          params: { nodeId: this.nodeId },
        });

        const task: FragmentTask | null = response.data;

        if (task) {
          // Process task asynchronously
          this.processTask(task).catch((error) => {
            console.error(`Error processing task ${task.id}:`, error);
          });
        }
      } catch (error: any) {
        console.error("Error polling for tasks:", error.message);
      }
    }, 5000);
  }

  private async processTask(task: FragmentTask): Promise<void> {
    console.log(`Processing fragment task ${task.id} for intent ${task.intentId}`);

    try {
      // Wait for delay
      if (task.delayMs > 0) {
        console.log(`Waiting ${task.delayMs}ms before executing fragment`);
        await this.sleep(task.delayMs);
      }

      // Execute fragment routing
      const txSignature = await this.executeFragment(task);

      // Report success
      await this.httpClient.post("/tasks/report", {
        nodeId: this.nodeId,
        fragmentId: task.id,
        intentId: task.intentId,
        status: "completed",
        txSignature,
      });

      console.log(`Fragment ${task.id} completed with tx ${txSignature}`);
    } catch (error: any) {
      console.error(`Fragment ${task.id} failed:`, error.message);

      // Report failure
      try {
        await this.httpClient.post("/tasks/report", {
          nodeId: this.nodeId,
          fragmentId: task.id,
          intentId: task.intentId,
          status: "failed",
        });
      } catch (reportError: any) {
        console.error(`Failed to report task failure:`, reportError.message);
      }
    }
  }

  private async executeFragment(task: FragmentTask): Promise<string> {
    const recipientPubkey = new PublicKey(task.recipient);
    let currentAmount = task.amountLamports;
    let lastTxSignature: string | null = null;

    // Create shadow wallet hops if needed
    if (task.shadowWalletCount > 0) {
      const shadowWallets: Array<{ publicKey: string; secretKey: Uint8Array }> = [];

      for (let i = 0; i < task.shadowWalletCount; i++) {
        const shadow = generateShadowWallet();
        shadowWallets.push(shadow);
      }

      // Route through shadow wallets
      let fromKeypair = this.hotWallet;
      let toPubkey: PublicKey;

      for (let i = 0; i < shadowWallets.length; i++) {
        const shadow = shadowWallets[i];
        toPubkey = new PublicKey(shadow.publicKey);

        // Send to shadow wallet
        const shadowKeypair = Keypair.fromSecretKey(shadow.secretKey);
        const txSig = await createAndSendSOLTransfer(
          this.connection,
          fromKeypair,
          toPubkey.toBase58(),
          currentAmount
        );

        lastTxSignature = txSig;
        console.log(`Sent ${currentAmount} lamports to shadow wallet ${shadow.publicKey}`);

        // Wait a bit between hops
        await this.sleep(1000);

        fromKeypair = shadowKeypair;
      }

      // Final transfer to recipient
      const finalTxSig = await createAndSendSOLTransfer(
        this.connection,
        fromKeypair,
        recipientPubkey.toBase58(),
        currentAmount
      );

      lastTxSignature = finalTxSig;
    } else {
      // Direct transfer to recipient
      const txSig = await createAndSendSOLTransfer(
        this.connection,
        this.hotWallet,
        recipientPubkey.toBase58(),
        currentAmount
      );

      lastTxSignature = txSig;
    }

    // Send noise transactions if needed
    if (task.noiseTxCount > 0) {
      for (let i = 0; i < task.noiseTxCount; i++) {
        const noiseAmount = Math.floor(Math.random() * 1000) + 100; // 100-1100 lamports
        const noiseRecipient = generateRandomAddress();

        try {
          await createAndSendSOLTransfer(
            this.connection,
            this.hotWallet,
            noiseRecipient,
            noiseAmount
          );
          console.log(`Sent noise transaction: ${noiseAmount} lamports to ${noiseRecipient}`);
        } catch (error) {
          console.error("Failed to send noise transaction:", error);
          // Continue even if noise fails
        }
      }
    }

    if (!lastTxSignature) {
      throw new Error("No transaction signature generated");
    }

    return lastTxSignature;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

