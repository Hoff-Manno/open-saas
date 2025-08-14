import { useState } from 'react';
import { type AuthUser } from 'wasp/auth';
import { getOrganizationModules, deleteModule, useQuery, useAction } from 'wasp/client/operations';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen, 
  Clock, 
  Users,
  Eye,
  AlertTriangle,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import DefaultLayout from '../../layout/DefaultLayout';
import { useRedirectHomeUnlessUserIsAdmin } from '../../useRedirectHomeUnlessUserIsAdmin';

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

interface ModuleCardProps {
  module: any;
  onEdit: (moduleId: string) => void;
  onDelete: (moduleId: string) => void;
  onView: (moduleId: string) => void;
}

function ModuleCard({ module, onEdit, onDelete, onView }: ModuleCardProps) {
  const totalSections = module._count?.sections || module.sections?.length || 0;
  const totalAssignments = module._count?.assignments || 0;
  
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

const LearningModulesDashboard = ({ user }: { user: AuthUser }) => {
  useRedirectHomeUnlessUserIsAdmin({ user });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  const { data: modules, isLoading, error, refetch } = useQuery(getOrganizationModules);
  const deleteModuleFn = useAction(deleteModule);

  const handleCreateModule = () => {
    navigate('/learning-modules/builder');
  };

  const handleEditModule = (moduleId: string) => {
    navigate(`/learning-modules/builder/${moduleId}`);
  };

  const handleViewModule = (moduleId: string) => {
    navigate(`/learning-modules/viewer/${moduleId}`);
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      await deleteModuleFn({ moduleId });
      refetch();
    } catch (err) {
      console.error('Failed to delete module:', err);
    }
  };

  // Filter modules based on search and status
  const filteredModules = modules?.filter((module: any) => {
    const matchesSearch = module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || module.processingStatus === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Learning Modules</h1>
            <p className="text-muted-foreground mt-1">
              Manage learning modules and track their usage across your organization
            </p>
          </div>
          <Button onClick={handleCreateModule}>
            <Plus className="h-4 w-4 mr-2" />
            Create Module
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-input rounded-md w-full focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PROCESSING">Processing</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{modules?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {modules?.filter((m: any) => m.processingStatus === 'COMPLETED').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {modules?.filter((m: any) => m.processingStatus === 'PROCESSING').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {modules?.reduce((sum: number, m: any) => sum + (m._count?.assignments || 0), 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              Failed to load modules. Please try again.
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
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
        )}

        {/* Empty State */}
        {!isLoading && filteredModules.length === 0 && !error && (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No modules found' : 'No learning modules yet'}
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first learning module to start building educational content for your team.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={handleCreateModule}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Module
              </Button>
            )}
          </div>
        )}

        {/* Modules Grid */}
        {!isLoading && filteredModules.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredModules.map((module: any) => (
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
    </DefaultLayout>
  );
};

export default LearningModulesDashboard;