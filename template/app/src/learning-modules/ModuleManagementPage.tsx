import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Placeholder types until wasp/entities is built
interface LearningModule {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  sections?: ModuleSection[];
  creator?: {
    id: string;
    username?: string;
    email?: string;
  };
}

interface ModuleSection {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
  estimatedMinutes?: number;
}

// Placeholder implementations until wasp/client/operations is built
const getOrganizationModules = async (): Promise<LearningModule[]> => {
  // This will be replaced with actual Wasp operation
  throw new Error('getOrganizationModules not implemented yet - needs wasp build');
};

const deleteModule = async ({ moduleId }: { moduleId: string }): Promise<void> => {
  // This will be replaced with actual Wasp operation
  throw new Error('deleteModule not implemented yet - needs wasp build');
};

import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen, 
  Clock, 
  User, 
  Users,
  Eye,
  AlertTriangle,
  ExternalLink 
} from 'lucide-react';

// Temporary simple alert dialog replacement
const AlertDialog = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const AlertDialogTrigger = ({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) => <>{children}</>;
const AlertDialogContent = ({ children }: { children: React.ReactNode }) => <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-lg max-w-md w-full p-6">{children}</div></div>;
const AlertDialogHeader = ({ children }: { children: React.ReactNode }) => <div className="mb-4">{children}</div>;
const AlertDialogTitle = ({ children }: { children: React.ReactNode }) => <h2 className="text-lg font-semibold">{children}</h2>;
const AlertDialogDescription = ({ children }: { children: React.ReactNode }) => <p className="text-gray-600">{children}</p>;
const AlertDialogFooter = ({ children }: { children: React.ReactNode }) => <div className="flex gap-2 justify-end mt-4">{children}</div>;
const AlertDialogAction = ({ onClick, className, disabled, children }: { onClick?: () => void; className?: string; disabled?: boolean; children: React.ReactNode }) => <Button onClick={onClick} className={className} disabled={disabled}>{children}</Button>;
const AlertDialogCancel = ({ children }: { children: React.ReactNode }) => <Button variant="outline">{children}</Button>;
import { cn } from '../lib/utils';

interface ModuleCardProps {
  module: any; // Will be properly typed once Wasp entities are available
  onEdit: (moduleId: string) => void;
  onDelete: (moduleId: string) => void;
  onView: (moduleId: string) => void;
}

function ModuleCard({ module, onEdit, onDelete, onView }: ModuleCardProps) {
  const totalSections = module._count?.sections || module.sections?.length || 0;
  const totalAssignments = module._count?.assignments || 0;
  const totalProgress = module._count?.progress || 0;
  
  // Calculate estimated time
  const estimatedMinutes = module.sections?.reduce(
    (total: number, section: any) => total + (section.estimatedMinutes || 0), 
    0
  ) || 0;
  
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'PROCESSING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PENDING': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FAILED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {module.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span 
                className={cn(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                  getStatusColor(module.processingStatus)
                )}
              >
                {module.processingStatus.toLowerCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(module.id)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(module.id)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  disabled={totalAssignments > 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Module</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{module.title}"? This action cannot be undone.
                    {totalAssignments > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-center gap-2 text-yellow-800 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          This module has {totalAssignments} active assignment{totalAssignments !== 1 ? 's' : ''} and cannot be deleted.
                        </div>
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(module.id)}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={totalAssignments > 0}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {module.description && (
          <CardDescription className="mt-2 line-clamp-2">
            {module.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>{totalSections} section{totalSections !== 1 ? 's' : ''}</span>
            </div>
            {estimatedMinutes > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(estimatedMinutes)}</span>
              </div>
            )}
            {totalAssignments > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{totalAssignments} assigned</span>
              </div>
            )}
          </div>
          <div className="text-xs">
            by {module.creator?.username || module.creator?.email || 'Unknown'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ModuleManagement() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();

  // Load modules
  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedModules = await getOrganizationModules();
      setModules(fetchedModules);
    } catch (err) {
      console.error('Failed to load modules:', err);
      setError('Failed to load modules. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = () => {
    navigate('/modules/builder');
  };

  const handleEditModule = (moduleId: string) => {
    navigate(`/modules/builder/${moduleId}`);
  };

  const handleViewModule = (moduleId: string) => {
    // Navigate to module preview/details page
    // This will be implemented in task 6
    console.log('View module:', moduleId);
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      setDeleting(moduleId);
      await deleteModule({ moduleId });
      setModules(modules.filter(m => m.id !== moduleId));
    } catch (err) {
      console.error('Failed to delete module:', err);
      setError('Failed to delete module. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Learning Modules</h1>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Create Module
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Learning Modules</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage learning modules for your organization
          </p>
        </div>
        <Button onClick={handleCreateModule}>
          <Plus className="h-4 w-4 mr-2" />
          Create Module
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={loadModules}
          >
            Try Again
          </Button>
        </div>
      )}

      {modules.length === 0 && !loading ? (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No learning modules yet
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Create your first learning module to start building educational content for your team.
          </p>
          <Button onClick={handleCreateModule}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Module
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onEdit={handleEditModule}
              onDelete={handleDeleteModule}
              onView={handleViewModule}
            />
          ))}
        </div>
      )}
    </div>
  );
}
