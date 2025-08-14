import { useState } from 'react';
import { type AuthUser } from 'wasp/auth';
import { getUserEngagement, useQuery } from 'wasp/client/operations';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { 
  Search,
  Filter,
  Download,
  Users,
  BookOpen,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Circle,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import DefaultLayout from '../../layout/DefaultLayout';
import { useRedirectHomeUnlessUserIsAdmin } from '../../useRedirectHomeUnlessUserIsAdmin';

interface ProgressTableProps {
  users: any[];
  isLoading: boolean;
}

function ProgressTable({ users, isLoading }: ProgressTableProps) {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBg = (rate: number) => {
    if (rate >= 80) return 'bg-green-100';
    if (rate >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Learning Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Progress</CardTitle>
        <CardDescription>
          Track individual learner progress and engagement across all modules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Learner</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Modules</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Completion Rate</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time Spent</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Active</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.userId} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {user.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{user.userName}</div>
                        <div className="text-sm text-muted-foreground">ID: {user.userId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{user.completedModules}/{user.totalModules}</span>
                      {user.inProgressModules > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({user.inProgressModules} in progress)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-20">
                        <div 
                          className={cn("h-2 rounded-full", getProgressBg(user.completionRate))}
                          style={{ width: `${Math.min(user.completionRate, 100)}%` }}
                        ></div>
                      </div>
                      <span className={cn("text-sm font-medium", getProgressColor(user.completionRate))}>
                        {user.completionRate.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDuration(user.totalTimeSpent)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(user.lastActive)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {user.completionRate >= 80 ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">Excellent</span>
                        </>
                      ) : user.completionRate >= 60 ? (
                        <>
                          <Circle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-600">Good</span>
                        </>
                      ) : user.lastActive ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-600">Needs Attention</span>
                        </>
                      ) : (
                        <>
                          <Circle className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-400">Inactive</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {users.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No learners found</h3>
            <p className="text-gray-500">
              Learners will appear here once they start engaging with learning modules.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const LearningProgressDashboard = ({ user }: { user: AuthUser }) => {
  useRedirectHomeUnlessUserIsAdmin({ user });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [days, setDays] = useState(30);

  const { data: engagementData, isLoading, error, refetch } = useQuery(getUserEngagement, { days });

  // Filter users based on search and status
  const filteredUsers = engagementData?.filter((userData: any) => {
    const matchesSearch = userData.userName.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesStatus = true;
    
    if (statusFilter === 'excellent') matchesStatus = userData.completionRate >= 80;
    else if (statusFilter === 'good') matchesStatus = userData.completionRate >= 60 && userData.completionRate < 80;
    else if (statusFilter === 'needs-attention') matchesStatus = userData.completionRate < 60 && userData.lastActive;
    else if (statusFilter === 'inactive') matchesStatus = !userData.lastActive;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate summary stats
  const totalLearners = engagementData?.length || 0;
  const activeLearners = engagementData?.filter((u: any) => u.lastActive).length || 0;
  const avgCompletionRate = totalLearners > 0 
    ? (engagementData?.reduce((sum: number, u: any) => sum + u.completionRate, 0) || 0) / totalLearners 
    : 0;
  const totalTimeSpent = engagementData?.reduce((sum: number, u: any) => sum + u.totalTimeSpent, 0) || 0;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Learning Progress</h1>
            <p className="text-muted-foreground mt-1">
              Monitor learner progress and engagement across all modules
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Learners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLearners}</div>
              <div className="text-xs text-muted-foreground">
                {activeLearners} active in last {days} days
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgCompletionRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">
                Across all assigned modules
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Time Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(totalTimeSpent)}</div>
              <div className="text-xs text-muted-foreground">
                In last {days} days
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Engagement Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalLearners > 0 ? ((activeLearners / totalLearners) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">
                Active vs total learners
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search learners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-input rounded-md w-full focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="excellent">Excellent (80%+)</option>
            <option value="good">Good (60-79%)</option>
            <option value="needs-attention">Needs Attention (&lt;60%)</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              Failed to load learning progress data. Please try again.
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Progress Table */}
        <ProgressTable users={filteredUsers} isLoading={isLoading} />
      </div>
    </DefaultLayout>
  );
};

export default LearningProgressDashboard;