import { useQuery } from 'wasp/client/operations';
import { getLearningAnalytics, getUserEngagement } from 'wasp/client/operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { 
  BookOpen, 
  Users, 
  TrendingUp, 
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LearningOverviewWidgetProps {
  className?: string;
}

export default function LearningOverviewWidget({ className }: LearningOverviewWidgetProps) {
  const navigate = useNavigate();
  
  const { data: learningStats, isLoading: learningLoading } = useQuery(getLearningAnalytics, {
    days: 30
  });
  
  const { data: engagementData, isLoading: engagementLoading } = useQuery(getUserEngagement, {
    days: 30
  });

  const isLoading = learningLoading || engagementLoading;

  // Calculate key metrics
  const totalModules = learningStats?.totalModules || 0;
  const activeModules = learningStats?.activeModules || 0;
  const totalLearners = learningStats?.totalLearners || 0;
  const activeLearners = learningStats?.activeLearners || 0;
  const completionRate = learningStats?.completionRate || 0;
  
  // Calculate learners needing attention (completion rate < 60%)
  const learnersNeedingAttention = engagementData?.filter((user: any) => 
    user.completionRate < 60 && user.totalModules > 0
  ).length || 0;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Learning Management Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Learning Management Overview
        </CardTitle>
        <CardDescription>
          Key metrics and insights from your learning platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              Active Modules
            </div>
            <div className="text-2xl font-bold">
              {activeModules}/{totalModules}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Active Learners
            </div>
            <div className="text-2xl font-bold">
              {activeLearners}/{totalLearners}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Completion Rate
            </div>
            <div className="text-2xl font-bold text-green-600">
              {completionRate.toFixed(1)}%
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Need Attention
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {learnersNeedingAttention}
            </div>
          </div>
        </div>

        {/* Top Performing Modules */}
        {learningStats?.topModules && learningStats.topModules.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Top Performing Modules</h4>
            <div className="space-y-2">
              {learningStats.topModules.slice(0, 3).map((module: any, index: number) => (
                <div key={module.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm truncate max-w-32">
                        {module.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {module.completions} completions
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDuration(module.totalTimeSpent)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Summary */}
        {engagementData && engagementData.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Recent Activity</h4>
            <div className="space-y-2">
              {engagementData.slice(0, 3).map((user: any) => (
                <div key={user.userId} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {user.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {user.userName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.completedModules}/{user.totalModules} modules
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {user.completionRate >= 80 ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : user.completionRate >= 60 ? (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-xs font-medium">
                      {user.completionRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate('/admin/learning/modules')}
          >
            Manage Modules
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate('/admin/learning/progress')}
          >
            View Progress
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* No Data State */}
        {!isLoading && totalModules === 0 && (
          <div className="text-center py-6">
            <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No learning modules yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Create your first learning module to start tracking progress.
            </p>
            <Button 
              size="sm"
              onClick={() => navigate('/learning-modules/builder')}
            >
              Create Module
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}