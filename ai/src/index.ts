import {
  NodeRegistration,
  PrivacyLevel,
  RoutingPlan,
  RoutingPlanFragment
} from '@xvoid/common';

interface PrivacyProfile {
  fragments: number;
  delayRange: [number, number];
  shadowRange: [number, number];
  noiseRange: [number, number];
}

const PRIVACY_PROFILES: Record<PrivacyLevel, PrivacyProfile> = {
  low: {
    fragments: 2,
    delayRange: [500, 2000],
    shadowRange: [0, 1],
    noiseRange: [0, 0]
  },
  medium: {
    fragments: 4,
    delayRange: [2000, 5000],
    shadowRange: [1, 2],
    noiseRange: [1, 2]
  },
  high: {
    fragments: 6,
    delayRange: [5000, 12000],
    shadowRange: [2, 4],
    noiseRange: [2, 4]
  }
};

export interface RoutingContext {
  trackingId: string;
  recipient: string;
  amount: number;
  privacyLevel: PrivacyLevel;
  nodes: NodeRegistration[];
  tpsHint?: number | null;
}

export class RoutingEngine {
  buildPlan(context: RoutingContext): RoutingPlan {
    const profile = PRIVACY_PROFILES[context.privacyLevel];
    const fragments = this.splitAmount(context.amount, profile.fragments);

    return {
      trackingId: context.trackingId,
      privacyLevel: context.privacyLevel,
      fragmentCount: fragments.length,
      createdAt: Date.now(),
      fragments: fragments.map((amount, idx) =>
        this.buildFragment(idx, amount, profile, context)
      )
    };
  }

  private buildFragment(
    idx: number,
    amount: number,
    profile: PrivacyProfile,
    context: RoutingContext
  ): RoutingPlanFragment {
    return {
      fragmentId: `${context.trackingId}-${idx + 1}`,
      amount,
      delayMs: this.adjustDelay(
        this.randomInRange(profile.delayRange[0], profile.delayRange[1]),
        context.tpsHint
      ),
      shadowWalletCount: this.randomInt(profile.shadowRange[0], profile.shadowRange[1]),
      noiseTxCount: this.randomInt(profile.noiseRange[0], profile.noiseRange[1]),
      assignedNodeId: this.pickNode(context.nodes, idx)
    };
  }

  private splitAmount(total: number, fragments: number): number[] {
    const weights = Array.from({ length: fragments }, () => Math.random() + 0.1);
    const sum = weights.reduce((acc, w) => acc + w, 0);
    const result: number[] = [];
    let allocated = 0;

    weights.forEach((weight, idx) => {
      if (idx === fragments - 1) {
        const remainder = Number((total - allocated).toFixed(6));
        result.push(Math.max(remainder, 0));
        return;
      }

      const portion = Number(((weight / sum) * total).toFixed(6));
      allocated += portion;
      result.push(portion);
    });

    const delta =
      total - result.reduce((acc, amt) => acc + amt, 0);
    if (Math.abs(delta) >= 1e-6) {
      result[result.length - 1] = Number(
        (result[result.length - 1] + delta).toFixed(6)
      );
    }

    return result;
  }

  private randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomInt(min: number, max: number): number {
    if (min === max) {
      return min;
    }
    return this.randomInRange(min, max);
  }

  private adjustDelay(delay: number, tpsHint?: number | null): number {
    if (!tpsHint) {
      return delay;
    }

    if (tpsHint > 2000) {
      return Math.max(250, Math.floor(delay * 0.8));
    }

    if (tpsHint < 1500) {
      return Math.floor(delay * 1.2);
    }

    return delay;
  }

  private pickNode(
    nodes: NodeRegistration[],
    fragmentIdx: number
  ): string | undefined {
    if (!nodes.length) {
      return undefined;
    }

    const sorted = [...nodes].sort(
      (a, b) =>
        b.capacity - b.load - (a.capacity - a.load)
    );

    return sorted[fragmentIdx % sorted.length]?.nodeId;
  }
}

export const routingEngine = new RoutingEngine();

