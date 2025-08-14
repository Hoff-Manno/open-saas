import { useState } from 'react';
import { type AuthUser } from 'wasp/auth';
import { getUserEngagement, useQuery } from 'wasp/client/operations';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import DefaultLayout from '../../layout/DefaultLayout';
import { useRedirectHomeUnlessUserIsAdmin } from '../../useRedirectHomeUnlessUserIsAdmin';
import { Search, User, Clock, Trophy, TrendingUp } from 'lucide-react';

const UserEngagementDashboard = ({ user }: { user: AuthUser }) => {
  useRedirectHomeUnlessUserIsAdmin({ user });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const { data: engagementData, isLoading, error } = useQuery(getUserEngagement, {
    days: selectedPeriod
  });

  const filteredUsers = engagementData?.filter((userData: any) => 
    userData.userName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEngagementLevel = (completionRate: number, totalTimeSpent: number) => {
    if (completionRate >= 80 && totalTimeSpent >= 180) return { level: 'High', color: 'text-green-600 bg-green-100' };
    if (completionRate >= 50 && totalTimeSpent >= 90) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-100' };
    return { level: 'Low', color: 'text-red-600 bg-red-100' };
  };

  return (
    <DefaultLayout user={user}>
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-foreground'>User Engagement</h1>
            <p className='text-muted-foreground'>Monitor learner progress and engagement levels</p>
          </div>
          
          {/* Period Selection */}
          <div className='flex gap-2'>
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant={selectedPeriod === days ? 'default' : 'outline'}
                size='sm'
                onClick={() => setSelectedPeriod(days)}
              >
                {days} days
              </Button>
            ))}
          </div>
        </div>

        {/* Search and Summary Cards */}
        <div className='grid gap-4 md:grid-cols-4'>
          <Card>
            <CardContent className='pt-6'>
              <div className='flex items-center space-x-2'>
                <User className='h-4 w-4 text-muted-foreground' />
                <div>
                  <p className='text-sm font-medium'>Total Learners</p>
                  <p className='text-2xl font-bold'>{filteredUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className='pt-6'>
              <div className='flex items-center space-x-2'>
                <Trophy className='h-4 w-4 text-muted-foreground' />
                <div>
                  <p className='text-sm font-medium'>Avg Completion</p>
                  <p className='text-2xl font-bold'>
                    {filteredUsers.length > 0 
                      ? Math.round(filteredUsers.reduce((sum: number, u: any) => sum + u.completionRate, 0) / filteredUsers.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className='pt-6'>
              <div className='flex items-center space-x-2'>
                <Clock className='h-4 w-4 text-muted-foreground' />
                <div>
                  <p className='text-sm font-medium'>Avg Time Spent</p>
                  <p className='text-2xl font-bold'>
                    {filteredUsers.length > 0 
                      ? formatTime(filteredUsers.reduce((sum: number, u: any) => sum + u.totalTimeSpent, 0) / filteredUsers.length)
                      : '0m'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className='pt-6'>
              <div className='flex items-center space-x-2'>
                <TrendingUp className='h-4 w-4 text-muted-foreground' />
                <div>
                  <p className='text-sm font-medium'>High Engagement</p>
                  <p className='text-2xl font-bold'>
                    {filteredUsers.filter((u: any) => getEngagementLevel(u.completionRate, u.totalTimeSpent).level === 'High').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Search Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search by username or email...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
          </CardContent>
        </Card>

        {/* User Engagement Table */}
        <Card>
          <CardHeader>
            <CardTitle>Learner Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='flex items-center justify-center py-8'>
                <div className='animate-pulse text-muted-foreground'>Loading user engagement data...</div>
              </div>
            ) : error ? (
              <div className='flex items-center justify-center py-8'>
                <div className='text-destructive'>Error loading user engagement data</div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className='overflow-x-auto'>
                <div className='grid grid-cols-8 gap-4 py-3 text-sm font-medium text-muted-foreground border-b'>
                  <div className='col-span-2'>User</div>
                  <div className='text-center'>Modules</div>
                  <div className='text-center'>Completed</div>
                  <div className='text-center'>Progress</div>
                  <div className='text-center'>Time Spent</div>
                  <div className='text-center'>Last Active</div>
                  <div className='text-center'>Engagement</div>
                </div>
                
                <div className='space-y-2'>
                  {filteredUsers.map((userData) => {
                    const engagement = getEngagementLevel(userData.completionRate, userData.totalTimeSpent);
                    return (
                      <div key={userData.userId} className='grid grid-cols-8 gap-4 py-4 border-b border-border last:border-b-0'>
                        <div className='col-span-2'>
                          <p className='font-medium text-foreground'>{userData.userName}</p>
                        </div>
                        <div className='text-center'>
                          <span className='text-sm'>{userData.totalModules}</span>
                        </div>
                        <div className='text-center'>
                          <span className='text-sm font-medium text-green-600'>
                            {userData.completedModules}
                          </span>
                        </div>
                        <div className='text-center'>
                          <div className='flex items-center justify-center'>
                            <div className='w-16 h-2 bg-gray-200 rounded-full overflow-hidden'>
                              <div 
                                className='h-full bg-blue-600 transition-all duration-300'
                                style={{ width: `${userData.completionRate}%` }}
                              />
                            </div>
                            <span className='ml-2 text-xs text-muted-foreground'>
                              {userData.completionRate.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className='text-center'>
                          <span className='text-sm'>{formatTime(userData.totalTimeSpent)}</span>
                        </div>
                        <div className='text-center'>
                          <span className='text-xs text-muted-foreground'>
                            {formatDate(userData.lastActive)}
                          </span>
                        </div>
                        <div className='text-center'>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${engagement.color}`}>
                            {engagement.level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className='flex items-center justify-center py-8'>
                <p className='text-muted-foreground'>No users found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DefaultLayout>
  );
};

export default UserEngagementDashboard;
