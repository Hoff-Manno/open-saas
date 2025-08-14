import { requireNodeEnvVar } from '../server/utils';

export enum SubscriptionStatus {
  PastDue = 'past_due',
  CancelAtPeriodEnd = 'cancel_at_period_end',
  Active = 'active',
  Deleted = 'deleted',
}

export enum PaymentPlanId {
  Starter = 'starter',
  Professional = 'professional',
  Enterprise = 'enterprise',
}

export interface PaymentPlan {
  // Returns the id under which this payment plan is identified on your payment processor.
  // E.g. this might be price id on Stripe, or variant id on LemonSqueezy.
  getPaymentProcessorPlanId: () => string;
  effect: PaymentPlanEffect;
}

export type PaymentPlanEffect = { kind: 'subscription' } | { kind: 'credits'; amount: number };

export const paymentPlans: Record<PaymentPlanId, PaymentPlan> = {
  [PaymentPlanId.Starter]: {
    getPaymentProcessorPlanId: () => requireNodeEnvVar('PAYMENTS_STARTER_SUBSCRIPTION_PLAN_ID'),
    effect: { kind: 'subscription' },
  },
  [PaymentPlanId.Professional]: {
    getPaymentProcessorPlanId: () => requireNodeEnvVar('PAYMENTS_PROFESSIONAL_SUBSCRIPTION_PLAN_ID'),
    effect: { kind: 'subscription' },
  },
  [PaymentPlanId.Enterprise]: {
    getPaymentProcessorPlanId: () => requireNodeEnvVar('PAYMENTS_ENTERPRISE_SUBSCRIPTION_PLAN_ID'),
    effect: { kind: 'subscription' },
  },
};

export function prettyPaymentPlanName(planId: PaymentPlanId): string {
  const planToName: Record<PaymentPlanId, string> = {
    [PaymentPlanId.Starter]: 'Starter',
    [PaymentPlanId.Professional]: 'Professional',
    [PaymentPlanId.Enterprise]: 'Enterprise',
  };
  return planToName[planId];
}

export function parsePaymentPlanId(planId: string): PaymentPlanId {
  if ((Object.values(PaymentPlanId) as string[]).includes(planId)) {
    return planId as PaymentPlanId;
  } else {
    throw new Error(`Invalid PaymentPlanId: ${planId}`);
  }
}

export function getSubscriptionPaymentPlanIds(): PaymentPlanId[] {
  return Object.values(PaymentPlanId).filter((planId) => paymentPlans[planId].effect.kind === 'subscription');
}

// Subscription tier limits based on requirements
export interface SubscriptionLimits {
  maxModules: number | null; // null means unlimited
  maxUsers: number | null; // null means unlimited
  hasApiAccess: boolean;
}

export const subscriptionLimits: Record<PaymentPlanId, SubscriptionLimits> = {
  [PaymentPlanId.Starter]: {
    maxModules: 10,
    maxUsers: 25,
    hasApiAccess: false,
  },
  [PaymentPlanId.Professional]: {
    maxModules: null, // unlimited
    maxUsers: 100,
    hasApiAccess: false,
  },
  [PaymentPlanId.Enterprise]: {
    maxModules: null, // unlimited
    maxUsers: null, // unlimited
    hasApiAccess: true,
  },
};

export function getSubscriptionLimits(planId: PaymentPlanId): SubscriptionLimits {
  return subscriptionLimits[planId];
}

// Helper function to check if user can perform action based on subscription
export function canPerformAction(
  currentPlan: PaymentPlanId | null,
  currentModuleCount: number,
  currentUserCount: number
): {
  canCreateModule: boolean;
  canAddUser: boolean;
  hasApiAccess: boolean;
} {
  if (!currentPlan) {
    return {
      canCreateModule: false,
      canAddUser: false,
      hasApiAccess: false,
    };
  }

  const limits = getSubscriptionLimits(currentPlan);
  
  return {
    canCreateModule: limits.maxModules === null || currentModuleCount < limits.maxModules,
    canAddUser: limits.maxUsers === null || currentUserCount < limits.maxUsers,
    hasApiAccess: limits.hasApiAccess,
  };
}
