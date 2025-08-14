import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { 
  Plus, 
  BookOpen, 
  Users, 
  BarChart3,
  Upload,
  Settings,
  ArrowRight
} from 'lucide-react';

interface LearningQuickActionsProps {
  className?: string;
}

export default function LearningQuickActions({ className }: LearningQuickActionsProps) {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Create Module',
      description: 'Upload PDF and create new learning module',
      icon: Plus,
      action: () => navigate('/learning-modules/builder'),
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Upload PDF',
      description: 'Process new PDF document',
      icon: Upload,
      action: () => navigate('/pdf-upload'),
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'Manage Modules',
      description: 'View and edit existing modules',
      icon: BookOpen,
      action: () => navigate('/admin/learning/modules'),
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      title: 'Track Progress',
      description: 'Monitor learner progress',
      icon: Users,
      action: () => navigate('/admin/learning/progress'),
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      title: 'View Analytics',
      description: 'Learning metrics and insights',
      icon: BarChart3,
      action: () => navigate('/admin/analytics'),
      color: 'bg-indigo-500 hover:bg-indigo-600',
    },
    {
      title: 'Module Settings',
      description: 'Configure learning settings',
      icon: Settings,
      action: () => navigate('/admin/settings'),
      color: 'bg-gray-500 hover:bg-gray-600',
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Learning Management
        </CardTitle>
        <CardDescription>
          Quick actions for managing your learning platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2 hover:shadow-md transition-shadow"
              onClick={action.action}
            >
              <div className="flex items-center gap-2 w-full">
                <div className={`p-2 rounded-md text-white ${action.color}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">{action.title}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}