import { AlertTriangle, Crown, Users, FileText } from 'lucide-react';
import { useAuth } from 'wasp/client/auth';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getUserSubscriptionLimits, getUserSubscriptionPlan } from './subscriptionUtils';
import { PaymentPlanId, prettyPaymentPlanName } from './plans';

interface SubscriptionLimitBannerProps {
  currentModuleCount?: number;
  currentUserCount?: number;
  showUpgradeButton?: boolean;
  onUpgradeClick?: () => void;
}

export function SubscriptionLimitBanner({
  currentModuleCount = 0,
  currentUserCount = 0,
  showUpgradeButton = true,
  onUpgradeClick,
}: SubscriptionLimitBannerProps) {
  const { data: user } = useAuth();

  if (!user) return null;

  const currentPlan = getUserSubscriptionPlan(user);
  const limits = getUserSubscriptionLimits(user);

  if (!currentPlan) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No active subscription found. Please subscribe to access PDF learning features.
          {showUpgradeButton && (
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={onUpgradeClick}
            >
              View Plans
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const moduleUsagePercent = limits.maxModules 
    ? Math.round((currentModuleCount / limits.maxModules) * 100)
    : 0;
  
  const userUsagePercent = limits.maxUsers 
    ? Math.round((currentUserCount / limits.maxUsers) * 100)
    : 0;

  const isNearModuleLimit = limits.maxModules && moduleUsagePercent >= 80;
  const isNearUserLimit = limits.maxUsers && userUsagePercent >= 80;
  const showWarning = isNearModuleLimit || isNearUserLimit;

  if (!showWarning) return null;

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Crown className="h-5 w-5" />
          {prettyPaymentPlanName(currentPlan)} Plan Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isNearModuleLimit && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Learning Modules: {currentModuleCount} / {limits.maxModules}
              </span>
            </div>
            <div className="text-sm font-medium text-amber-800">
              {moduleUsagePercent}% used
            </div>
          </div>
        )}
        
        {isNearUserLimit && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Team Members: {currentUserCount} / {limits.maxUsers}
              </span>
            </div>
            <div className="text-sm font-medium text-amber-800">
              {userUsagePercent}% used
            </div>
          </div>
        )}

        {showUpgradeButton && (
          <div className="pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onUpgradeClick}
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              Upgrade Plan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SubscriptionFeatureGateProps {
  feature: 'create_module' | 'add_user' | 'api_access';
  currentCount?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SubscriptionFeatureGate({
  feature,
  currentCount = 0,
  children,
  fallback,
}: SubscriptionFeatureGateProps) {
  const { data: user } = useAuth();

  if (!user) return null;

  const currentPlan = getUserSubscriptionPlan(user);
  const limits = getUserSubscriptionLimits(user);

  let canAccess = false;

  switch (feature) {
    case 'create_module':
      canAccess = limits.maxModules === null || currentCount < limits.maxModules;
      break;
    case 'add_user':
      canAccess = limits.maxUsers === null || currentCount < limits.maxUsers;
      break;
    case 'api_access':
      canAccess = limits.hasApiAccess;
      break;
  }

  if (canAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const featureNames = {
    create_module: 'create more learning modules',
    add_user: 'add more team members',
    api_access: 'access the API',
  };

  return (
    <Alert variant="destructive">
      <Crown className="h-4 w-4" />
      <AlertDescription>
        Upgrade your subscription to {featureNames[feature]}.
        {currentPlan && (
          <span className="block mt-1 text-sm">
            Current plan: {prettyPaymentPlanName(currentPlan)}
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}