import { CheckCircle, Circle, Clock, BookOpen } from 'lucide-react';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

interface SectionProgressProps {
  sectionId: string;
  sectionTitle: string;
  completed: boolean;
  timeSpent?: number;
  estimatedMinutes?: number;
  isActive?: boolean;
  onClick?: () => void;
}

export function SectionProgress({ 
  sectionTitle, 
  completed, 
  timeSpent = 0, 
  estimatedMinutes,
  isActive = false,
  onClick 
}: SectionProgressProps) {
  const progressPercentage = estimatedMinutes && timeSpent 
    ? Math.min(Math.round((timeSpent / estimatedMinutes) * 100), 100)
    : completed ? 100 : 0;

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
        isActive && "bg-primary/5 border-primary/20",
        completed && "bg-green-50 dark:bg-green-950/20",
        "hover:bg-accent/50"
      )}
      onClick={onClick}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {completed ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Section Info */}
      <div className="flex-1 min-w-0">
        <h3 className={cn(
          "font-medium text-sm truncate",
          isActive && "text-primary",
          completed && "text-green-700 dark:text-green-400"
        )}>
          {sectionTitle}
        </h3>
        
        {/* Progress Bar */}
        {(timeSpent > 0 || estimatedMinutes) && (
          <div className="mt-1">
            <Progress 
              value={progressPercentage} 
              className="h-1.5"
            />
          </div>
        )}

        {/* Time Info */}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {estimatedMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{estimatedMinutes} min</span>
            </div>
          )}
          
          {timeSpent > 0 && (
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              <span>{timeSpent} min read</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0">
        {completed ? (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 text-xs">
            Done
          </Badge>
        ) : isActive ? (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 text-xs">
            Reading
          </Badge>
        ) : timeSpent > 0 ? (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 text-xs">
            In Progress
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Not Started
          </Badge>
        )}
      </div>
    </div>
  );
}

interface ModuleProgressSummaryProps {
  totalSections: number;
  completedSections: number;
  totalTimeSpent: number;
  estimatedTotalTime?: number;
  className?: string;
}

export function ModuleProgressSummary({
  totalSections,
  completedSections,
  totalTimeSpent,
  estimatedTotalTime,
  className
}: ModuleProgressSummaryProps) {
  const progressPercentage = totalSections > 0 
    ? Math.round((completedSections / totalSections) * 100) 
    : 0;

  const timeProgressPercentage = estimatedTotalTime && totalTimeSpent
    ? Math.min(Math.round((totalTimeSpent / estimatedTotalTime) * 100), 100)
    : 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Section Progress */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Section Progress</span>
          <span className="text-sm text-muted-foreground">
            {completedSections} of {totalSections} completed
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <div className="text-center mt-1">
          <Badge variant="secondary" className="text-xs">
            {progressPercentage}% Complete
          </Badge>
        </div>
      </div>

      {/* Time Progress */}
      {estimatedTotalTime && estimatedTotalTime > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Time Progress</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(totalTimeSpent / 60 * 10) / 10}h of {Math.round(estimatedTotalTime / 60 * 10) / 10}h
            </span>
          </div>
          <Progress value={timeProgressPercentage} className="h-2" />
          <div className="text-center mt-1">
            <Badge variant="outline" className="text-xs">
              {timeProgressPercentage}% Time
            </Badge>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
        <div className="text-center">
          <div className="text-lg font-semibold">{completedSections}</div>
          <div className="text-xs text-muted-foreground">Sections Done</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold">
            {Math.round(totalTimeSpent / 60 * 10) / 10}h
          </div>
          <div className="text-xs text-muted-foreground">Time Spent</div>
        </div>
      </div>
    </div>
  );
}
