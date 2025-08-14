import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

type TopModule = {
  id: string;
  title: string;
  completions: number;
  totalTimeSpent: number;
};

type TopModulesTableProps = {
  topModules?: TopModule[];
  isLoading?: boolean;
};

const TopModulesTable = ({ topModules = [], isLoading }: TopModulesTableProps) => {
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <Card className='col-span-12 xl:col-span-4'>
      <CardHeader>
        <CardTitle className='text-lg font-semibold'>Top Performing Modules</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          <div className='grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b pb-2'>
            <div>Module</div>
            <div className='text-center'>Completions</div>
            <div className='text-center'>Time Spent</div>
            <div className='text-center'>Rank</div>
          </div>

          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-pulse text-muted-foreground'>Loading...</div>
            </div>
          ) : topModules.length > 0 ? (
            topModules.slice(0, 10).map((module, index) => (
              <div key={module.id} className='grid grid-cols-4 gap-4 py-3 border-b border-border last:border-b-0'>
                <div className='flex flex-col'>
                  <p className='text-sm font-medium text-foreground truncate' title={module.title}>
                    {module.title}
                  </p>
                </div>
                <div className='text-center'>
                  <span className='inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800'>
                    {module.completions}
                  </span>
                </div>
                <div className='text-center'>
                  <span className='text-sm text-muted-foreground'>
                    {formatTime(module.totalTimeSpent)}
                  </span>
                </div>
                <div className='text-center'>
                  <span className='inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-800'>
                    {index + 1}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className='flex items-center justify-center py-8'>
              <p className='text-muted-foreground'>No module data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopModulesTable;
