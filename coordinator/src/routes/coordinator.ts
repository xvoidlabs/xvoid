import { Router } from "express";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  CreateIntentRequest,
  CreateIntentResponse,
  ConfirmIntentRequest,
  RouteIntentStatus,
} from "@xvoid/common";
import { verifyTransferTransaction } from "@xvoid/common";
import { planFragments } from "@xvoid/ai";
import { storage } from "../storage";
import { getEntryWallet } from "../wallet";

const router = Router();

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

/**
 * POST /intents
 * Create a new route intent
 */
router.post("/", async (req, res) => {
  try {
    const body: CreateIntentRequest = req.body;

    if (!body.recipient || !body.amountSol || !body.privacyLevel || !body.senderPubkey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate recipient address
    try {
      new PublicKey(body.recipient);
    } catch {
      return res.status(400).json({ error: "Invalid recipient address" });
    }

    // Validate sender address
    try {
      new PublicKey(body.senderPubkey);
    } catch {
      return res.status(400).json({ error: "Invalid sender address" });
    }

    if (body.amountSol <= 0) {
      return res.status(400).json({ error: "Amount must be positive" });
    }

    const amountLamports = Math.floor(body.amountSol * 1e9);

    const intentId = `intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const entryWallet = getEntryWallet();

    const intent = {
      id: intentId,
      senderPubkey: body.senderPubkey,
      recipient: body.recipient,
      amountLamports,
      privacyLevel: body.privacyLevel,
      status: "awaiting_deposit" as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    storage.createIntent(intent);

    const response: CreateIntentResponse = {
      intentId,
      xvEntryAddress: entryWallet.publicKey.toBase58(),
    };

    res.json(response);
  } catch (error) {
    console.error("Error creating intent:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /intents/:id/confirm
 * Confirm deposit and start routing
 */
router.post("/:id/confirm", async (req, res) => {
  try {
    const intentId = req.params.id;
    const body: ConfirmIntentRequest = req.body;

    if (!body.txSignature) {
      return res.status(400).json({ error: "Missing txSignature" });
    }

    const intent = storage.getIntent(intentId);
    if (!intent) {
      return res.status(404).json({ error: "Intent not found" });
    }

    if (intent.status !== "awaiting_deposit") {
      return res.status(400).json({ error: `Intent is in ${intent.status} status` });
    }

    const entryWallet = getEntryWallet();
    const expectedAmount = intent.amountLamports;

    // Verify the transaction
    const isValid = await verifyTransferTransaction(
      connection,
      body.txSignature,
      intent.senderPubkey,
      entryWallet.publicKey.toBase58(),
      expectedAmount,
      1000 // 1000 lamports tolerance
    );

    if (!isValid) {
      return res.status(400).json({ error: "Transaction verification failed" });
    }

    // Update intent status
    storage.updateIntent(intentId, {
      status: "deposit_confirmed",
      depositTxSignature: body.txSignature,
    });

    // Get available nodes
    const availableNodes = storage.getAvailableNodes();
    if (availableNodes.length === 0) {
      storage.updateIntent(intentId, { status: "failed" });
      return res.status(503).json({ error: "No available nodes" });
    }

    const nodeIds = availableNodes.map((n) => n.nodeId);

    // Plan fragments
    const fragmentPlans = planFragments(
      intent.amountLamports,
      intent.privacyLevel,
      nodeIds
    );

    // Create fragment tasks
    for (const plan of fragmentPlans) {
      const fragment: typeof plan = {
        ...plan,
        intentId,
        recipient: intent.recipient,
      };
      storage.createFragment(fragment);
    }

    // Update intent to routing
    storage.updateIntent(intentId, { status: "routing" });

    res.json({ success: true, fragmentCount: fragmentPlans.length });
  } catch (error) {
    console.error("Error confirming intent:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /intents/:id/status
 * Get intent status and fragment progress
 */
router.get("/:id/status", (req, res) => {
  try {
    const intentId = req.params.id;
    const status = storage.getIntentStatus(intentId);

    if (!status) {
      return res.status(404).json({ error: "Intent not found" });
    }

    res.json(status);
  } catch (error) {
    console.error("Error getting status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as coordinatorRouter };

