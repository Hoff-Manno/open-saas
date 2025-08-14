import { Clock, BookOpen, TrendingUp, Award, Calendar, Target } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type AuthUser } from 'wasp/auth';
import { useQuery } from 'wasp/client/operations';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { cn } from '../lib/utils';

// Import operations (will be defined in main.wasp)
import { getUserProgressSummary, getRecentLearningActivity } from 'wasp/client/operations';

interface ProgressDashboardProps {
  user: AuthUser;
}

interface ModuleProgress {
  moduleId: string;
  title: string;
  description?: string;
  totalSections: number;
  completedSections: number;
  progressPercentage: number;
  totalTimeSpent: number;
  estimatedTotalTime: number;
  isCompleted: boolean;
  assignment?: {
    assignedAt: Date;
    dueDate?: Date;
    completedAt?: Date;
  };
  lastAccessed: number | null;
}

interface ProgressSummary {
  totalModules: number;
  completedModules: number;
  totalTimeSpent: number;
  modules: ModuleProgress[];
}

interface RecentActivity {
  moduleId: string;
  moduleTitle: string;
  sectionId: string;
  sectionTitle: string;
  completed: boolean;
  timeSpent: number;
  lastAccessed: Date;
}

export default function ProgressDashboard({ user }: ProgressDashboardProps) {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');

  const { 
    data: progressSummary, 
    isLoading: summaryLoading, 
    error: summaryError 
  } = useQuery(getUserProgressSummary, {}) as { 
    data: ProgressSummary | undefined, 
    isLoading: boolean, 
    error: any 
  };

  const { 
    data: recentActivity, 
    isLoading: activityLoading, 
    error: activityError 
  } = useQuery(getRecentLearningActivity, {}) as {
    data: RecentActivity[] | undefined,
    isLoading: boolean,
    error: any
  };

  // Calculate statistics
  const stats = progressSummary ? {
    completionRate: progressSummary.totalModules > 0 
      ? Math.round((progressSummary.completedModules / progressSummary.totalModules) * 100) 
      : 0,
    averageProgress: progressSummary.modules.length > 0
      ? Math.round(progressSummary.modules.reduce((sum: number, m: ModuleProgress) => sum + m.progressPercentage, 0) / progressSummary.modules.length)
      : 0,
    totalHours: Math.round(progressSummary.totalTimeSpent / 60 * 10) / 10,
    activeModules: progressSummary.modules.filter((m: ModuleProgress) => m.progressPercentage > 0 && !m.isCompleted).length,
  } : null;

  // Filter modules based on time
  const filteredModules = progressSummary?.modules.filter((module: ModuleProgress) => {
    if (timeFilter === 'all') return true;
    if (!module.lastAccessed) return false;
    
    const lastAccessed = new Date(module.lastAccessed);
    const now = new Date();
    const diffDays = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    
    if (timeFilter === 'week') return diffDays <= 7;
    if (timeFilter === 'month') return diffDays <= 30;
    
    return true;
  }).sort((a: ModuleProgress, b: ModuleProgress) => {
    // Sort by last accessed (most recent first)
    if (!a.lastAccessed && !b.lastAccessed) return 0;
    if (!a.lastAccessed) return 1;
    if (!b.lastAccessed) return -1;
    return b.lastAccessed - a.lastAccessed;
  });

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600 bg-green-100 dark:bg-green-900/20';
    if (percentage >= 50) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
    if (percentage >= 25) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
    return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
  };

  if (summaryLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Learning Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your learning progress and achievements
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/learning-modules')}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Browse Modules
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {progressSummary?.completedModules} of {progressSummary?.totalModules} modules
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageProgress}%</div>
              <p className="text-xs text-muted-foreground">
                Across all modules
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Invested</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHours}h</div>
              <p className="text-xs text-muted-foreground">
                Total learning time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Modules</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeModules}</div>
              <p className="text-xs text-muted-foreground">
                In progress
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Learning Modules */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Your Learning Modules
                </CardTitle>
                
                <div className="flex gap-1">
                  {(['all', 'week', 'month'] as const).map((filter) => (
                    <Button
                      key={filter}
                      variant={timeFilter === filter ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTimeFilter(filter)}
                      className="text-xs"
                    >
                      {filter === 'all' ? 'All' : filter === 'week' ? '7d' : '30d'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredModules?.map((module: ModuleProgress) => (
                  <div 
                    key={module.moduleId} 
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/learning-modules/viewer/${module.moduleId}`)}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{module.title}</h3>
                        {module.isCompleted && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20">
                            <Award className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      
                      {module.description && (
                        <p className="text-sm text-muted-foreground truncate mb-2">
                          {module.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <span>{module.completedSections}/{module.totalSections} sections</span>
                        {module.totalTimeSpent > 0 && (
                          <span>{Math.round(module.totalTimeSpent / 60 * 10) / 10}h spent</span>
                        )}
                        {module.lastAccessed && (
                          <span>{formatTimeAgo(module.lastAccessed)}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Progress value={module.progressPercentage} className="flex-1 h-2" />
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs px-2 py-0", getProgressColor(module.progressPercentage))}
                        >
                          {module.progressPercentage}%
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Button variant="ghost" size="sm">
                        {module.progressPercentage === 0 ? 'Start' : 'Continue'}
                      </Button>
                      
                      {module.assignment?.dueDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due {new Date(module.assignment.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {(!filteredModules || filteredModules.length === 0) && (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No learning modules found</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/learning-modules')}
                    >
                      Browse Available Modules
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity?.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {activity.completed ? '✓' : '📖'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {activity.completed ? 'Completed' : 'Read'}{' '}
                        <span className="font-medium">{activity.sectionTitle}</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        in {activity.moduleTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(activity.lastAccessed.getTime())}
                        </p>
                        {activity.timeSpent > 0 && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground">
                              {activity.timeSpent} min
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!recentActivity || recentActivity.length === 0) && (
                  <div className="text-center py-6">
                    <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">This Week</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sessions</span>
                  <span className="font-medium">
                    {recentActivity?.length || 0}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Time</span>
                  <span className="font-medium">
                    {Math.round((recentActivity?.reduce((sum, a) => sum + a.timeSpent, 0) || 0) / 60 * 10) / 10}h
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="font-medium">
                    {recentActivity?.filter(a => a.completed).length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
