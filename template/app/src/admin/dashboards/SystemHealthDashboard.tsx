// System Health Dashboard for Admin
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  FileText, 
  HardDrive, 
  RefreshCw,
  Server,
  Users,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useQuery } from 'wasp/client/operations';
import { checkDoclingHealth } from '../../pdf-processing/operations';

// Health status types
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

interface ServiceHealth {
  service: string;
  status: HealthStatus;
  responseTime?: number;
  message?: string;
  lastChecked?: string;
}

interface SystemMetrics {
  database: {
    connectionCount: number;
    queryTime: number;
    errorRate: number;
  };
  processing: {
    queueSize: number;
    processingRate: number;
    failureRate: number;
    avgProcessingTime: number;
  };
  storage: {
    totalFiles: number;
    totalSize: number;
    uploadRate: number;
    errorRate: number;
  };
  users: {
    activeUsers: number;
    totalUsers: number;
    subscriptionDistribution: Record<string, number>;
  };
}

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  timestamp: string;
}

export function SystemHealthDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Query system health
  const {
    data: healthData,
    isLoading,
    error,
    refetch
  } = useQuery(checkDoclingHealth, undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      setLastRefresh(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">System Health</h2>
          <Button disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">System Health</h2>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load system health data. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const overallStatus = healthData?.status || 'unknown';
  const services = healthData?.services || {};
  const metrics = healthData?.metrics;
  const alerts = healthData?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Health</h2>
          <p className="text-gray-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon status={overallStatus} />
            Overall System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <StatusBadge status={overallStatus} />
            <span className="text-gray-600">
              {getStatusMessage(overallStatus)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ServiceStatusCard
          title="Database"
          status={services.database || 'unknown'}
          icon={<Database className="h-5 w-5" />}
          metrics={metrics?.database}
        />
        <ServiceStatusCard
          title="PDF Processing"
          status={services.docling || 'unknown'}
          icon={<FileText className="h-5 w-5" />}
          metrics={metrics?.processing}
        />
        <ServiceStatusCard
          title="File Storage"
          status={services.storage || 'unknown'}
          icon={<HardDrive className="h-5 w-5" />}
          metrics={metrics?.storage}
        />
        <ServiceStatusCard
          title="API Server"
          status={services.api || 'unknown'}
          icon={<Server className="h-5 w-5" />}
        />
      </div>

      {/* System Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricsCard
            title="Database Performance"
            icon={<Database className="h-5 w-5" />}
            metrics={[
              { label: 'Query Time', value: `${metrics.database?.queryTime || 0}ms` },
              { label: 'Connections', value: metrics.database?.connectionCount || 0 },
              { label: 'Error Rate', value: `${((metrics.database?.errorRate || 0) * 100).toFixed(1)}%` },
            ]}
          />
          <MetricsCard
            title="Processing Queue"
            icon={<Zap className="h-5 w-5" />}
            metrics={[
              { label: 'Queue Size', value: metrics.processing?.queueSize || 0 },
              { label: 'Processing Rate', value: `${metrics.processing?.processingRate || 0}/hr` },
              { label: 'Failure Rate', value: `${((metrics.processing?.failureRate || 0) * 100).toFixed(1)}%` },
            ]}
          />
          <MetricsCard
            title="User Activity"
            icon={<Users className="h-5 w-5" />}
            metrics={[
              { label: 'Active Users', value: metrics.users?.activeUsers || 0 },
              { label: 'Total Users', value: metrics.users?.totalUsers || 0 },
              { label: 'Files Stored', value: metrics.storage?.totalFiles || 0 },
            ]}
          />
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Distribution */}
      {metrics?.users?.subscriptionDistribution && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(metrics.users.subscriptionDistribution).map(([plan, count]) => (
                <div key={plan} className="text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-gray-600 capitalize">{plan}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Service Status Card Component
function ServiceStatusCard({ 
  title, 
  status, 
  icon, 
  metrics 
}: { 
  title: string; 
  status: HealthStatus; 
  icon: React.ReactNode;
  metrics?: any;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-gray-600">
          {getStatusMessage(status)}
        </p>
      </CardContent>
    </Card>
  );
}

// Metrics Card Component
function MetricsCard({ 
  title, 
  icon, 
  metrics 
}: { 
  title: string; 
  icon: React.ReactNode;
  metrics: Array<{ label: string; value: string | number }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {metrics.map((metric, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-600">{metric.label}</span>
              <span className="font-medium">{metric.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Alert Item Component
function AlertItem({ alert }: { alert: Alert }) {
  const levelColors = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    critical: 'bg-red-100 border-red-300 text-red-900',
  };

  const levelIcons = {
    info: <Activity className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    error: <AlertTriangle className="h-4 w-4" />,
    critical: <AlertTriangle className="h-4 w-4" />,
  };

  return (
    <div className={`p-3 rounded-md border ${levelColors[alert.level]}`}>
      <div className="flex items-start gap-2">
        {levelIcons[alert.level]}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium capitalize">{alert.service}</span>
            <Badge variant="outline" className="text-xs">
              {alert.level}
            </Badge>
          </div>
          <p className="text-sm">{alert.message}</p>
          <p className="text-xs opacity-75 mt-1">
            {new Date(alert.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// Status Icon Component
function StatusIcon({ status }: { status: HealthStatus }) {
  const icons = {
    healthy: <CheckCircle className="h-5 w-5 text-green-500" />,
    degraded: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    unhealthy: <AlertTriangle className="h-5 w-5 text-red-500" />,
    unknown: <Clock className="h-5 w-5 text-gray-500" />,
  };

  return icons[status];
}

// Status Badge Component
function StatusBadge({ status }: { status: HealthStatus }) {
  const variants = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    degraded: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    unhealthy: 'bg-red-100 text-red-800 border-red-200',
    unknown: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <Badge className={`${variants[status]} capitalize`}>
      {status}
    </Badge>
  );
}

// Helper function to get status message
function getStatusMessage(status: HealthStatus): string {
  const messages = {
    healthy: 'All systems operational',
    degraded: 'Some services experiencing issues',
    unhealthy: 'Critical issues detected',
    unknown: 'Status unknown',
  };

  return messages[status];
}