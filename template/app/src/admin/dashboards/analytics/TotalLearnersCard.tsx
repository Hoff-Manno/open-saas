import { ArrowDown, ArrowUp, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';

type LearningUsersCardProps = {
  totalLearners?: number;
  activeLearners?: number;
  isLoading?: boolean;
};

const TotalLearnersCard = ({ totalLearners = 0, activeLearners = 0, isLoading }: LearningUsersCardProps) => {
  const engagementRate = useMemo(() => {
    if (totalLearners === 0) return 0;
    return Math.round((activeLearners / totalLearners) * 100);
  }, [totalLearners, activeLearners]);

  const isEngaged = engagementRate >= 40;

  return (
    <Card>
      <CardHeader>
        <div className='flex h-11.5 w-11.5 items-center justify-center rounded-full bg-muted'>
          <Users className='size-6' />
        </div>
      </CardHeader>

      <CardContent className='flex justify-between'>
        <div>
          <h4 className='text-title-md font-bold text-foreground'>{totalLearners}</h4>
          <span className='text-sm font-medium text-muted-foreground'>Total Learners</span>
        </div>
        <div className='flex items-center gap-1'>
          {isEngaged ? (
            <ArrowUp className='size-3 text-green-500' />
          ) : (
            <ArrowDown className='size-3 text-red-500' />
          )}
          <span
            className={cn('text-xs font-medium', {
              'text-green-500': isEngaged,
              'text-red-500': !isEngaged,
            })}
          >
            {engagementRate}% active
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TotalLearnersCard;
