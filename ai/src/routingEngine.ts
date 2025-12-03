import { FragmentTask, PrivacyLevel } from "@xvoid/common";

/**
 * Rule-based routing engine that plans fragment tasks based on privacy level
 * No ML - uses deterministic rules with randomization for fragment sizes and delays
 */
export function planFragments(
  amountLamports: number,
  privacyLevel: PrivacyLevel,
  availableNodeIds: string[]
): FragmentTask[] {
  if (availableNodeIds.length === 0) {
    throw new Error("No available nodes");
  }

  const now = Date.now();
  const fragments: FragmentTask[] = [];

  let fragmentCount: number;
  let delayRange: [number, number];
  let noiseTxCount: number;
  let shadowWalletCount: number;

  switch (privacyLevel) {
    case "low":
      fragmentCount = 2;
      delayRange = [500, 3000]; // 0.5-3 seconds
      noiseTxCount = Math.random() < 0.5 ? 0 : 1; // 50% chance of 1 noise tx
      shadowWalletCount = 0; // Minimal shadow wallets
      break;

    case "medium":
      fragmentCount = 4;
      delayRange = [3000, 20000]; // 3-20 seconds
      noiseTxCount = Math.floor(Math.random() * 2) + 1; // 1-2 noise tx
      shadowWalletCount = Math.floor(Math.random() * 2) + 1; // 1-2 shadow wallets
      break;

    case "high":
      fragmentCount = 6;
      delayRange = [10000, 60000]; // 10-60 seconds
      noiseTxCount = Math.floor(Math.random() * 3) + 2; // 2-4 noise tx
      shadowWalletCount = Math.floor(Math.random() * 2) + 2; // 2-3 shadow wallets
      break;
  }

  // Generate random fragment sizes that sum to total amount
  const fragmentSizes = generateRandomFragmentSizes(amountLamports, fragmentCount);

  // Assign nodes in round-robin fashion
  let nodeIndex = 0;

  for (let i = 0; i < fragmentCount; i++) {
    const fragmentId = `fragment-${Date.now()}-${i}`;
    const delayMs = Math.floor(
      Math.random() * (delayRange[1] - delayRange[0]) + delayRange[0]
    );

    // Distribute noise and shadow wallets across fragments
    // For simplicity, assign noise/shadow to first few fragments
    const hasNoise = i < noiseTxCount;
    const hasShadowWallets = i < shadowWalletCount;

    fragments.push({
      id: fragmentId,
      intentId: "", // Will be set by coordinator
      recipient: "", // Will be set by coordinator
      amountLamports: fragmentSizes[i],
      delayMs,
      shadowWalletCount: hasShadowWallets ? Math.floor(Math.random() * 2) + 1 : 0,
      noiseTxCount: hasNoise ? 1 : 0,
      assignedNodeId: availableNodeIds[nodeIndex % availableNodeIds.length],
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    nodeIndex++;
  }

  return fragments;
}

/**
 * Generate random fragment sizes that sum to the total amount
 * Uses a weighted random distribution to avoid equal-sized fragments
 */
function generateRandomFragmentSizes(
  totalLamports: number,
  fragmentCount: number
): number[] {
  if (fragmentCount === 1) {
    return [totalLamports];
  }

  // Generate random weights
  const weights: number[] = [];
  let weightSum = 0;

  for (let i = 0; i < fragmentCount; i++) {
    const weight = Math.random() * 0.8 + 0.2; // Weight between 0.2 and 1.0
    weights.push(weight);
    weightSum += weight;
  }

  // Normalize and scale to total amount
  const fragments: number[] = [];
  let allocated = 0;

  for (let i = 0; i < fragmentCount - 1; i++) {
    const fraction = weights[i] / weightSum;
    const fragmentSize = Math.floor(totalLamports * fraction);
    fragments.push(fragmentSize);
    allocated += fragmentSize;
  }

  // Last fragment gets the remainder to ensure exact sum
  fragments.push(totalLamports - allocated);

  return fragments;
}

