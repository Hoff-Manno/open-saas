import { Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';

type AvgTimeSpentCardProps = {
  avgTimeSpent?: number;
  totalTimeSpent?: number;
  isLoading?: boolean;
};

const AvgTimeSpentCard = ({ avgTimeSpent = 0, totalTimeSpent = 0, isLoading }: AvgTimeSpentCardProps) => {
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex h-11.5 w-11.5 items-center justify-center rounded-full bg-muted'>
          <Clock className='size-6' />
        </div>
      </CardHeader>

      <CardContent className='flex justify-between'>
        <div>
          <h4 className='text-title-md font-bold text-foreground'>{formatTime(avgTimeSpent)}</h4>
          <span className='text-sm font-medium text-muted-foreground'>Avg Time/User</span>
        </div>
        <div className='flex items-center gap-1'>
          <TrendingUp className='size-3 text-blue-500' />
          <span className='text-xs font-medium text-blue-500'>
            {formatTime(totalTimeSpent)} total
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AvgTimeSpentCard;
