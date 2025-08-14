import { ArrowDown, ArrowUp, BookOpen } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';

type LearningMetricsCardProps = {
  totalModules?: number;
  activeModules?: number;
  isLoading?: boolean;
};

const TotalModulesCard = ({ totalModules = 0, activeModules = 0, isLoading }: LearningMetricsCardProps) => {
  const activityRate = useMemo(() => {
    if (totalModules === 0) return 0;
    return Math.round((activeModules / totalModules) * 100);
  }, [totalModules, activeModules]);

  const isActive = activityRate >= 50;

  return (
    <Card>
      <CardHeader>
        <div className='flex h-11.5 w-11.5 items-center justify-center rounded-full bg-muted'>
          <BookOpen className='size-6' />
        </div>
      </CardHeader>

      <CardContent className='flex justify-between'>
        <div>
          <h4 className='text-title-md font-bold text-foreground'>{totalModules}</h4>
          <span className='text-sm font-medium text-muted-foreground'>Total Modules</span>
        </div>
        <div className='flex items-center gap-1'>
          {isActive ? (
            <ArrowUp className='size-3 text-green-500' />
          ) : (
            <ArrowDown className='size-3 text-red-500' />
          )}
          <span
            className={cn('text-xs font-medium', {
              'text-green-500': isActive,
              'text-red-500': !isActive,
            })}
          >
            {activityRate}% active
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TotalModulesCard;
