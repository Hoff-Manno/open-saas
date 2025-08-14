import type { User } from 'wasp/entities';
import { PaymentPlanId, SubscriptionStatus, getSubscriptionLimits } from './plans';

/**
 * Check if user has an active subscription
 */
export function isUserSubscribed(user: User): boolean {
  return (
    user.subscriptionStatus === SubscriptionStatus.Active ||
    user.subscriptionStatus === SubscriptionStatus.CancelAtPeriodEnd
  );
}

/**
 * Get user's current subscription plan
 */
export function getUserSubscriptionPlan(user: User): PaymentPlanId | null {
  if (!isUserSubscribed(user) || !user.subscriptionPlan) {
    return null;
  }
  
  try {
    return user.subscriptionPlan as PaymentPlanId;
  } catch {
    return null;
  }
}

/**
 * Check if user can create a new learning module based on their subscription
 */
export function canUserCreateModule(user: User, currentModuleCount: number): boolean {
  const plan = getUserSubscriptionPlan(user);
  if (!plan) return false;
  
  const limits = getSubscriptionLimits(plan);
  return limits.maxModules === null || currentModuleCount < limits.maxModules;
}

/**
 * Check if user can add a new team member based on their subscription
 */
export function canUserAddTeamMember(user: User, currentUserCount: number): boolean {
  const plan = getUserSubscriptionPlan(user);
  if (!plan) return false;
  
  const limits = getSubscriptionLimits(plan);
  return limits.maxUsers === null || currentUserCount < limits.maxUsers;
}

/**
 * Check if user has API access based on their subscription
 */
export function hasUserApiAccess(user: User): boolean {
  const plan = getUserSubscriptionPlan(user);
  if (!plan) return false;
  
  const limits = getSubscriptionLimits(plan);
  return limits.hasApiAccess;
}

/**
 * Get subscription limits for a user
 */
export function getUserSubscriptionLimits(user: User) {
  const plan = getUserSubscriptionPlan(user);
  if (!plan) {
    return {
      maxModules: 0,
      maxUsers: 0,
      hasApiAccess: false,
    };
  }
  
  return getSubscriptionLimits(plan);
}

/**
 * Get subscription enforcement error message
 */
export function getSubscriptionErrorMessage(action: 'create_module' | 'add_user' | 'api_access'): string {
  const messages = {
    create_module: 'You have reached your module limit. Please upgrade your subscription to create more modules.',
    add_user: 'You have reached your team member limit. Please upgrade your subscription to add more users.',
    api_access: 'API access is only available for Enterprise subscribers. Please upgrade your subscription.',
  };
  
  return messages[action];
}