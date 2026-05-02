export type Plan = "BASIC";

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED";

export interface Subscription {
  readonly id: string;
  readonly tenantId: string;
  readonly plan: Plan;
  readonly status: SubscriptionStatus;
  readonly trialEndsAt: Date;
  readonly currentPeriodStart: Date | null;
  readonly currentPeriodEnd: Date | null;
  readonly stripeCustomerId: string | null;
  readonly updatedAt: Date;
}

export function isSubscriptionActive(sub: Subscription): boolean {
  return sub.status === "TRIAL" || sub.status === "ACTIVE";
}

export function isSubscriptionSuspended(sub: Subscription): boolean {
  return sub.status === "SUSPENDED";
}

export function isSubscriptionCancelled(sub: Subscription): boolean {
  return sub.status === "CANCELLED";
}
