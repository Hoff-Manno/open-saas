import { useState } from 'react';
import { type AuthUser } from 'wasp/auth';
import { getDailyStats, getLearningAnalytics, useQuery } from 'wasp/client/operations';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import DefaultLayout from '../../layout/DefaultLayout';
import { useRedirectHomeUnlessUserIsAdmin } from '../../useRedirectHomeUnlessUserIsAdmin';

// Existing components
import RevenueAndProfitChart from './RevenueAndProfitChart';
import SourcesTable from './SourcesTable';
import TotalPageViewsCard from './TotalPageViewsCard';
import TotalPayingUsersCard from './TotalPayingUsersCard';
import TotalRevenueCard from './TotalRevenueCard';
import TotalSignupsCard from './TotalSignupsCard';

// New learning components
import TotalModulesCard from './TotalModulesCard';
import TotalLearnersCard from './TotalLearnersCard';
import CompletionRateCard from './CompletionRateCard';
import AvgTimeSpentCard from './AvgTimeSpentCard';
import LearningEngagementChart from './LearningEngagementChart';
import TopModulesTable from './TopModulesTable';
import LearningOverviewWidget from '../learning/LearningOverviewWidget';
import LearningQuickActions from '../learning/LearningQuickActions';

type DashboardView = 'overview' | 'business' | 'learning';

const EnhancedAnalyticsDashboard = ({ user }: { user: AuthUser }) => {
  useRedirectHomeUnlessUserIsAdmin({ user });
  
  const [activeView, setActiveView] = useState<DashboardView>('overview');

  const { data: businessStats, isLoading: businessLoading, error: businessError } = useQuery(getDailyStats);
  const { data: learningStats, isLoading: learningLoading, error: learningError } = useQuery(getLearningAnalytics, {
    days: 30
  });

  const isLoading = businessLoading || learningLoading;
  const hasError = businessError || learningError;

  return (
    <DefaultLayout user={user}>
      <div className='relative'>
        {/* Tab Navigation */}
        <div className='mb-6 flex space-x-1 rounded-lg bg-muted p-1'>
          <Button
            variant={activeView === 'overview' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setActiveView('overview')}
            className='flex-1'
          >
            Overview
          </Button>
          <Button
            variant={activeView === 'business' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setActiveView('business')}
            className='flex-1'
          >
            Business Metrics
          </Button>
          <Button
            variant={activeView === 'learning' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setActiveView('learning')}
            className='flex-1'
          >
            Learning Analytics
          </Button>
        </div>

        <div
          className={cn({
            'opacity-25': !businessStats && !learningStats && !hasError,
          })}
        >
          {/* Overview Tab - Combined metrics */}
          {activeView === 'overview' && (
            <>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5 mb-6'>
                <TotalPageViewsCard
                  totalPageViews={businessStats?.dailyStats.totalViews}
                  prevDayViewsChangePercent={businessStats?.dailyStats.prevDayViewsChangePercent}
                />
                <TotalSignupsCard dailyStats={businessStats?.dailyStats} isLoading={businessLoading} />
                <TotalModulesCard
                  totalModules={businessStats?.dailyStats.totalModules}
                  activeModules={businessStats?.dailyStats.activeModules}
                  isLoading={isLoading}
                />
                <TotalLearnersCard
                  totalLearners={businessStats?.dailyStats.totalLearners}
                  activeLearners={businessStats?.dailyStats.activeLearners}
                  isLoading={isLoading}
                />
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5 mb-6'>
                <TotalRevenueCard
                  dailyStats={businessStats?.dailyStats}
                  weeklyStats={businessStats?.weeklyStats}
                  isLoading={businessLoading}
                />
                <TotalPayingUsersCard dailyStats={businessStats?.dailyStats} isLoading={businessLoading} />
                <CompletionRateCard
                  completionRate={businessStats?.dailyStats.avgCompletionRate}
                  modulesCompletedToday={businessStats?.dailyStats.modulesCompletedToday}
                  isLoading={isLoading}
                />
                <AvgTimeSpentCard
                  avgTimeSpent={businessStats?.dailyStats.avgTimeSpentPerUser}
                  totalTimeSpent={businessStats?.dailyStats.totalTimeSpentMinutes}
                  isLoading={isLoading}
                />
              </div>

              <div className='mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5'>
                <RevenueAndProfitChart weeklyStats={businessStats?.weeklyStats} isLoading={businessLoading} />
                <TopModulesTable topModules={learningStats?.topModules} isLoading={learningLoading} />
              </div>

              <div className='mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5'>
                <LearningOverviewWidget className="col-span-12 xl:col-span-8" />
                <LearningQuickActions className="col-span-12 xl:col-span-4" />
              </div>

              <div className='mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5'>
                <div className="col-span-12">
                  <SourcesTable sources={businessStats?.dailyStats?.sources} />
                </div>
              </div>
            </>
          )}

          {/* Business Metrics Tab */}
          {activeView === 'business' && (
            <>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5'>
                <TotalPageViewsCard
                  totalPageViews={businessStats?.dailyStats.totalViews}
                  prevDayViewsChangePercent={businessStats?.dailyStats.prevDayViewsChangePercent}
                />
                <TotalRevenueCard
                  dailyStats={businessStats?.dailyStats}
                  weeklyStats={businessStats?.weeklyStats}
                  isLoading={businessLoading}
                />
                <TotalPayingUsersCard dailyStats={businessStats?.dailyStats} isLoading={businessLoading} />
                <TotalSignupsCard dailyStats={businessStats?.dailyStats} isLoading={businessLoading} />
              </div>

              <div className='mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5'>
                <RevenueAndProfitChart weeklyStats={businessStats?.weeklyStats} isLoading={businessLoading} />
                <div className='col-span-12 xl:col-span-4'>
                  <SourcesTable sources={businessStats?.dailyStats?.sources} />
                </div>
              </div>
            </>
          )}

          {/* Learning Analytics Tab */}
          {activeView === 'learning' && (
            <>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5'>
                <TotalModulesCard
                  totalModules={learningStats?.totalModules || businessStats?.dailyStats.totalModules}
                  activeModules={learningStats?.activeModules || businessStats?.dailyStats.activeModules}
                  isLoading={isLoading}
                />
                <TotalLearnersCard
                  totalLearners={learningStats?.totalLearners || businessStats?.dailyStats.totalLearners}
                  activeLearners={learningStats?.activeLearners || businessStats?.dailyStats.activeLearners}
                  isLoading={isLoading}
                />
                <CompletionRateCard
                  completionRate={learningStats?.completionRate || businessStats?.dailyStats.avgCompletionRate}
                  modulesCompletedToday={businessStats?.dailyStats.modulesCompletedToday}
                  isLoading={isLoading}
                />
                <AvgTimeSpentCard
                  avgTimeSpent={learningStats?.avgTimeSpent || businessStats?.dailyStats.avgTimeSpentPerUser}
                  totalTimeSpent={businessStats?.dailyStats.totalTimeSpentMinutes}
                  isLoading={isLoading}
                />
              </div>

              <div className='mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5'>
                <LearningEngagementChart
                  engagementTrends={learningStats?.engagementTrends}
                  isLoading={learningLoading}
                />
                <TopModulesTable topModules={learningStats?.topModules} isLoading={learningLoading} />
              </div>
            </>
          )}
        </div>

        {/* No Data Message */}
        {!businessStats && !learningStats && !hasError && (
          <div className='absolute inset-0 flex items-start justify-center bg-background/50'>
            <div className='rounded-lg bg-card p-8 shadow-lg'>
              <p className='text-2xl font-bold text-foreground'>No analytics data available</p>
              <p className='mt-2 text-sm text-muted-foreground'>
                Analytics will appear here once the daily stats job has run and learning modules are created
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {hasError && (
          <div className='absolute inset-0 flex items-start justify-center bg-background/50'>
            <div className='rounded-lg bg-card p-8 shadow-lg'>
              <p className='text-2xl font-bold text-destructive'>Error loading analytics</p>
              <p className='mt-2 text-sm text-muted-foreground'>
                There was an error loading the analytics data. Please try refreshing the page.
              </p>
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default EnhancedAnalyticsDashboard;
