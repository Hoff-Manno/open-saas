import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Placeholder types until wasp/entities is built
interface LearningModule {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  sections?: ModuleSection[];
}

interface ModuleSection {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
  estimatedMinutes?: number;
}

// Placeholder implementations until wasp/client/operations is built
const getModuleDetails = async ({ moduleId }: { moduleId: string }): Promise<LearningModule> => {
  // This will be replaced with actual Wasp operation
  throw new Error('getModuleDetails not implemented yet - needs wasp build');
};

const createModule = async ({ title, description }: { title: string; description?: string }): Promise<LearningModule> => {
  // This will be replaced with actual Wasp operation
  throw new Error('createModule not implemented yet - needs wasp build');
};

const updateModule = async ({ moduleId, title, description }: { moduleId: string; title?: string; description?: string }): Promise<LearningModule> => {
  // This will be replaced with actual Wasp operation
  throw new Error('updateModule not implemented yet - needs wasp build');
};

const createSection = async ({ moduleId, title, content, orderIndex, estimatedMinutes }: { 
  moduleId: string; 
  title: string; 
  content: string; 
  orderIndex: number; 
  estimatedMinutes?: number; 
}): Promise<ModuleSection> => {
  // This will be replaced with actual Wasp operation
  throw new Error('createSection not implemented yet - needs wasp build');
};

const updateSection = async ({ sectionId, title, content, estimatedMinutes }: { 
  sectionId: string; 
  title?: string; 
  content?: string; 
  estimatedMinutes?: number; 
}): Promise<ModuleSection> => {
  // This will be replaced with actual Wasp operation
  throw new Error('updateSection not implemented yet - needs wasp build');
};

const deleteSection = async ({ sectionId }: { sectionId: string }): Promise<void> => {
  // This will be replaced with actual Wasp operation
  throw new Error('deleteSection not implemented yet - needs wasp build');
};

const reorderSections = async ({ moduleId, sectionIds }: { moduleId: string; sectionIds: string[] }): Promise<void> => {
  // This will be replaced with actual Wasp operation
  throw new Error('reorderSections not implemented yet - needs wasp build');
};
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { 
  Save, 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical, 
  Eye,
  ArrowLeft,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ModuleFormData {
  title: string;
  description: string;
  estimatedMinutes: number;
}

interface SectionData {
  id?: string;
  title: string;
  content: string;
  orderIndex: number;
  estimatedMinutes?: number;
}

interface SectionCardProps {
  section: ModuleSection;
  index: number;
  onEdit: (section: ModuleSection) => void;
  onDelete: (sectionId: string) => void;
  onPreview: (section: ModuleSection) => void;
  isEditing: boolean;
}

function SectionCard({ section, index, onEdit, onDelete, onPreview, isEditing }: SectionCardProps) {
  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium truncate">
                {section.title}
              </CardTitle>
              {section.estimatedMinutes && section.estimatedMinutes > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {section.estimatedMinutes} minute{section.estimatedMinutes !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPreview(section)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(section)}
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
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Section</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{section.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(section.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            <div className="w-8 flex justify-center cursor-move">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {section.content.length > 150 
            ? `${section.content.substring(0, 150)}...` 
            : section.content}
        </p>
      </CardContent>
    </Card>
  );
}

interface SectionFormProps {
  section?: ModuleSection;
  onSave: (sectionData: Omit<SectionData, 'id'>) => Promise<void>;
  onCancel: () => void;
  isEditing: boolean;
}

function SectionForm({ section, onSave, onCancel, isEditing }: SectionFormProps) {
  const [formData, setFormData] = useState<Omit<SectionData, 'id'>>({
    title: section?.title || '',
    content: section?.content || '',
    orderIndex: section?.orderIndex || 0,
    estimatedMinutes: section?.estimatedMinutes || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save section:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isEditing ? 'Edit Section' : 'Add New Section'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sectionTitle">Section Title *</Label>
            <Input
              id="sectionTitle"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter section title..."
              required
            />
          </div>

          <div>
            <Label htmlFor="sectionContent">Content *</Label>
            <textarea
              id="sectionContent"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter section content (supports Markdown)..."
              rows={8}
              className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-vertical"
              required
            />
          </div>

          <div>
            <Label htmlFor="estimatedMinutes">Estimated Minutes</Label>
            <Input
              id="estimatedMinutes"
              type="number"
              min="0"
              value={formData.estimatedMinutes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedMinutes: parseInt(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving || !formData.title.trim() || !formData.content.trim()}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Section
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface SectionPreviewProps {
  section: ModuleSection;
  onClose: () => void;
}

function SectionPreview({ section, onClose }: SectionPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{section.title}</CardTitle>
            {section.estimatedMinutes && section.estimatedMinutes > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Estimated time: {section.estimatedMinutes} minute{section.estimatedMinutes !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {section.content}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ModuleBuilder() {
  const { moduleId } = useParams<{ moduleId?: string }>();
  const navigate = useNavigate();
  const isEditing = !!moduleId;

  const [module, setModule] = useState<LearningModule | null>(null);
  const [sections, setSections] = useState<ModuleSection[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [moduleForm, setModuleForm] = useState<ModuleFormData>({
    title: '',
    description: '',
    estimatedMinutes: 0,
  });

  // Section editing states
  const [editingSection, setEditingSection] = useState<ModuleSection | null>(null);
  const [previewSection, setPreviewSection] = useState<ModuleSection | null>(null);
  const [showingSectionForm, setShowingSectionForm] = useState(false);

  // Load module data if editing
  useEffect(() => {
    if (isEditing && moduleId) {
      loadModule();
    }
  }, [isEditing, moduleId]);

  const loadModule = async () => {
    if (!moduleId) return;

    try {
      setLoading(true);
      setError(null);
      const moduleData = await getModuleDetails({ moduleId });
      setModule(moduleData);
      setModuleForm({
        title: moduleData.title,
        description: moduleData.description || '',
        estimatedMinutes: 0, // Calculate from sections or module data
      });
      setSections(moduleData.sections || []);
    } catch (err) {
      console.error('Failed to load module:', err);
      setError('Failed to load module. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModule = async () => {
    if (!moduleForm.title.trim()) return;

    try {
      setSaving(true);
      setError(null);

      if (isEditing && moduleId) {
        await updateModule({
          moduleId,
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim() || undefined,
        });
      } else {
        const newModule = await createModule({
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim() || undefined,
        });
        navigate(`/modules/builder/${newModule.id}`);
        return;
      }
    } catch (err) {
      console.error('Failed to save module:', err);
      setError('Failed to save module. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSection = async (sectionData: Omit<SectionData, 'id'>) => {
    if (!moduleId) return;

    try {
      if (editingSection) {
        // Update existing section
        await updateSection({
          sectionId: editingSection.id,
          title: sectionData.title,
          content: sectionData.content,
          estimatedMinutes: sectionData.estimatedMinutes,
        });
        // Update local state
        setSections(prev => prev.map(s => 
          s.id === editingSection.id 
            ? { ...s, ...sectionData }
            : s
        ));
      } else {
        // Create new section
        const newSection = await createSection({
          moduleId,
          title: sectionData.title,
          content: sectionData.content,
          orderIndex: sections.length,
          estimatedMinutes: sectionData.estimatedMinutes,
        });
        setSections(prev => [...prev, newSection]);
      }

      // Reset form state
      setEditingSection(null);
      setShowingSectionForm(false);
    } catch (error) {
      throw error; // Let the form handle the error
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await deleteSection({ sectionId });
      setSections(prev => prev.filter(s => s.id !== sectionId));
    } catch (err) {
      console.error('Failed to delete section:', err);
      setError('Failed to delete section. Please try again.');
    }
  };

  const handleEditSection = (section: ModuleSection) => {
    setEditingSection(section);
    setShowingSectionForm(true);
  };

  const handlePreviewSection = (section: ModuleSection) => {
    setPreviewSection(section);
  };

  const handleAddSection = () => {
    setEditingSection(null);
    setShowingSectionForm(true);
  };

  const handleCancelSectionForm = () => {
    setEditingSection(null);
    setShowingSectionForm(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="sm" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Modules
          </Button>
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-20 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/modules')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Modules
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Edit Module' : 'Create New Module'}
          </h1>
        </div>
        <Button onClick={handleSaveModule} disabled={saving || !moduleForm.title.trim()}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Module
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sections List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Sections ({sections.length})</h2>
              {isEditing && (
                <Button onClick={handleAddSection} disabled={showingSectionForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              )}
            </div>

            {/* Section Form */}
            {showingSectionForm && (
              <div className="mb-6">
                <SectionForm
                  section={editingSection || undefined}
                  onSave={handleSaveSection}
                  onCancel={handleCancelSectionForm}
                  isEditing={!!editingSection}
                />
              </div>
            )}

            {/* Section Preview */}
            {previewSection && (
              <div className="mb-6">
                <SectionPreview
                  section={previewSection}
                  onClose={() => setPreviewSection(null)}
                />
              </div>
            )}

            {/* Sections List */}
            {sections.length === 0 && !showingSectionForm ? (
              <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No sections yet
                </h3>
                <p className="text-gray-500 mb-6">
                  {isEditing 
                    ? 'Add your first section to start building your module content.'
                    : 'Save the module first, then you can add sections.'
                  }
                </p>
                {isEditing && (
                  <Button onClick={handleAddSection}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Section
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section, index) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    index={index}
                    onEdit={handleEditSection}
                    onDelete={handleDeleteSection}
                    onPreview={handlePreviewSection}
                    isEditing={showingSectionForm && editingSection?.id === section.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Module Settings */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Module Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="moduleTitle">Module Title *</Label>
                <Input
                  id="moduleTitle"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter module title..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="moduleDescription">Description</Label>
                <textarea
                  id="moduleDescription"
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter module description..."
                  rows={4}
                  className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-vertical"
                />
              </div>

              {/* Module Stats */}
              {isEditing && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Module Statistics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sections:</span>
                      <span>{sections.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Time:</span>
                      <span>
                        {sections.reduce((total, s) => total + (s.estimatedMinutes || 0), 0)} min
                      </span>
                    </div>
                    {module?.createdAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span>{new Date(module.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
