import { ArrowDown, ArrowUp, CheckCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';

type CompletionRateCardProps = {
  completionRate?: number;
  modulesCompletedToday?: number;
  isLoading?: boolean;
};

const CompletionRateCard = ({ completionRate = 0, modulesCompletedToday = 0, isLoading }: CompletionRateCardProps) => {
  const isGoodRate = completionRate >= 70;

  return (
    <Card>
      <CardHeader>
        <div className='flex h-11.5 w-11.5 items-center justify-center rounded-full bg-muted'>
          <CheckCircle className='size-6' />
        </div>
      </CardHeader>

      <CardContent className='flex justify-between'>
        <div>
          <h4 className='text-title-md font-bold text-foreground'>{completionRate.toFixed(1)}%</h4>
          <span className='text-sm font-medium text-muted-foreground'>Completion Rate</span>
        </div>
        <div className='flex items-center gap-1'>
          {modulesCompletedToday > 0 ? (
            <ArrowUp className='size-3 text-green-500' />
          ) : (
            <ArrowDown className='size-3 text-gray-400' />
          )}
          <span
            className={cn('text-xs font-medium', {
              'text-green-500': modulesCompletedToday > 0,
              'text-gray-400': modulesCompletedToday === 0,
            })}
          >
            +{modulesCompletedToday} today
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompletionRateCard;
