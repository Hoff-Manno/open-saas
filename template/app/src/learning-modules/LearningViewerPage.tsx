import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Search, 
  Bookmark, 
  CheckCircle,
  PlayCircle,
  PauseCircle,
  Menu,
  X
} from 'lucide-react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type AuthUser } from 'wasp/auth';
import { useQuery, useAction } from 'wasp/client/operations';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import { cn } from '../lib/utils';

// Import operations (these will be defined in main.wasp)
import { getModuleDetails, getModuleProgress, updateProgress } from 'wasp/client/operations';

interface LearningViewerPageProps {
  user: AuthUser;
}

interface ModuleSection {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
  estimatedMinutes?: number;
}

interface ModuleProgress {
  id: string;
  userId: string;
  moduleId: string;
  sectionId: string;
  completed: boolean;
  timeSpent: number;
  lastAccessed: Date;
  bookmarkPosition?: string;
}

interface ModuleDetails {
  id: string;
  title: string;
  description?: string;
  sections: ModuleSection[];
  creator: {
    id: string;
    username: string;
    email: string;
  };
  organization: {
    id: string;
    name: string;
  };
  _count: {
    sections: number;
    assignments: number;
    progress: number;
  };
}

interface ProgressData {
  module: {
    id: string;
    title: string;
  };
  totalSections: number;
  completedSections: number;
  progressPercentage: number;
  totalTimeSpent: number;
  sections: Array<{
    id: string;
    title: string;
    orderIndex: number;
    estimatedMinutes?: number;
    progress: ModuleProgress | null;
  }>;
}

export default function LearningViewerPage({ user }: LearningViewerPageProps) {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [readingStartTime, setReadingStartTime] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autoBookmark, setAutoBookmark] = useState(true);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const updateProgressAction = useAction(updateProgress);

  // Fetch module details and progress
  const { 
    data: moduleDetails, 
    isLoading: moduleLoading, 
    error: moduleError 
  } = useQuery(getModuleDetails, { moduleId: moduleId || '' }, {
    enabled: !!moduleId
  });

  const { 
    data: progressData, 
    isLoading: progressLoading,
    error: progressError,
    refetch: refetchProgress 
  } = useQuery(getModuleProgress, { moduleId: moduleId || '' }, {
    enabled: !!moduleId
  });

  // Calculate current section
  const currentSection = useMemo(() => {
    if (!moduleDetails?.sections) return null;
    return moduleDetails.sections[currentSectionIndex] || null;
  }, [moduleDetails, currentSectionIndex]);

  // Get current section progress
  const currentSectionProgress = useMemo(() => {
    if (!progressData?.sections || !currentSection) return null;
    return progressData.sections.find(s => s.id === currentSection.id)?.progress || null;
  }, [progressData, currentSection]);

  // Search functionality
  const searchInContent = useMemo(() => {
    if (!searchQuery.trim() || !moduleDetails?.sections) return [];
    
    const query = searchQuery.toLowerCase();
    const results: any[] = [];
    
    moduleDetails.sections.forEach((section, index) => {
      const titleMatch = section.title.toLowerCase().includes(query);
      const contentMatches = section.content.toLowerCase().split(query);
      
      if (titleMatch || contentMatches.length > 1) {
        results.push({
          sectionIndex: index,
          sectionId: section.id,
          sectionTitle: section.title,
          matches: contentMatches.length - 1,
          titleMatch,
        });
      }
    });
    
    return results;
  }, [searchQuery, moduleDetails]);

  // Handle section navigation
  const navigateToSection = async (sectionIndex: number) => {
    if (!moduleDetails?.sections) return;
    
    const targetSection = moduleDetails.sections[sectionIndex];
    if (!targetSection) return;

    // Save bookmark for current section if auto-bookmark is enabled
    if (autoBookmark && currentSection && contentRef.current) {
      const scrollPosition = contentRef.current.scrollTop;
      try {
        await updateProgressAction({
          moduleId: moduleId!,
          sectionId: currentSection.id,
          bookmarkPosition: JSON.stringify({ scrollTop: scrollPosition }),
        });
      } catch (error) {
        console.error('Error saving bookmark:', error);
      }
    }

    setCurrentSectionIndex(sectionIndex);
    
    // Start tracking reading time for new section
    setReadingStartTime(Date.now());
    
    // Scroll to top of new content
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    
    setSidebarOpen(false);
  };

  // Handle marking section as complete
  const markSectionComplete = async (completed: boolean) => {
    if (!currentSection) return;

    try {
      await updateProgressAction({
        moduleId: moduleId!,
        sectionId: currentSection.id,
        completed,
        timeSpent: readingStartTime ? Math.floor((Date.now() - readingStartTime) / 60000) : 0,
      });
      
      await refetchProgress();
      
      // Auto-navigate to next section if marking as complete
      if (completed && currentSectionIndex < (moduleDetails?.sections.length || 0) - 1) {
        setTimeout(() => {
          navigateToSection(currentSectionIndex + 1);
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating section completion:', error);
    }
  };

  // Save bookmark position periodically
  useEffect(() => {
    if (!autoBookmark || !currentSection || !contentRef.current) return;

    const saveBookmark = () => {
      const scrollPosition = contentRef.current?.scrollTop || 0;
      updateProgressAction({
        moduleId: moduleId!,
        sectionId: currentSection.id,
        bookmarkPosition: JSON.stringify({ scrollTop: scrollPosition }),
      }).catch(error => console.error('Error saving bookmark:', error));
    };

    const interval = setInterval(saveBookmark, 30000); // Save every 30 seconds
    return () => clearInterval(interval);
  }, [currentSection, autoBookmark, moduleId, updateProgressAction]);

  // Load saved bookmark position
  useEffect(() => {
    if (!currentSectionProgress?.bookmarkPosition || !contentRef.current) return;

    try {
      const position = JSON.parse(currentSectionProgress.bookmarkPosition);
      if (position.scrollTop) {
        contentRef.current.scrollTop = position.scrollTop;
      }
    } catch (error) {
      console.error('Error loading bookmark position:', error);
    }
  }, [currentSectionProgress]);

  // Track reading time
  useEffect(() => {
    if (!currentSection) return;
    
    setReadingStartTime(Date.now());
    
    return () => {
      // Save reading time when component unmounts or section changes
      if (readingStartTime) {
        const timeSpent = Math.floor((Date.now() - readingStartTime) / 60000);
        if (timeSpent > 0) {
          updateProgressAction({
            moduleId: moduleId!,
            sectionId: currentSection.id,
            timeSpent,
          }).catch(error => console.error('Error saving reading time:', error));
        }
      }
    };
  }, [currentSection, moduleId, updateProgressAction]);

  if (!moduleId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Module not found</p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/learning-modules')}
              className="mt-4"
            >
              Back to Modules
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (moduleLoading || progressLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading learning module...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (moduleError || !moduleDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Error loading module</p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/learning-modules')}
              className="mt-4"
            >
              Back to Modules
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const NavigationSidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("h-full flex flex-col", mobile ? "p-4" : "")}>
      {/* Module Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm truncate">{moduleDetails.title}</h2>
        </div>
        
        {progressData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progressData.completedSections} of {progressData.totalSections} completed</span>
              <span>{progressData.progressPercentage}%</span>
            </div>
            <Progress value={progressData.progressPercentage} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search in module..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-8 text-sm"
          />
        </div>
        
        {searchQuery && searchInContent.length > 0 && (
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {searchInContent.map((result, index) => (
              <button
                key={index}
                onClick={() => navigateToSection(result.sectionIndex)}
                className="w-full text-left p-2 text-xs rounded hover:bg-accent transition-colors"
              >
                <div className="font-medium truncate">{result.sectionTitle}</div>
                <div className="text-muted-foreground">{result.matches} match{result.matches !== 1 ? 'es' : ''}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Section List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {moduleDetails.sections.map((section, index) => {
            const sectionProgress = progressData?.sections.find(s => s.id === section.id)?.progress;
            const isActive = index === currentSectionIndex;
            const isCompleted = sectionProgress?.completed || false;
            
            return (
              <button
                key={section.id}
                onClick={() => navigateToSection(index)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  "hover:bg-accent/50",
                  isActive && "bg-primary/10 border-l-2 border-primary",
                  isCompleted && "bg-green-50 dark:bg-green-950/20"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-1">
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : isActive ? (
                      <PlayCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate mb-1">
                      {index + 1}. {section.title}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {section.estimatedMinutes && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{section.estimatedMinutes} min</span>
                        </div>
                      )}
                      
                      {sectionProgress?.timeSpent && (
                        <div className="flex items-center gap-1">
                          <span>•</span>
                          <span>{sectionProgress.timeSpent} min read</span>
                        </div>
                      )}
                      
                      {sectionProgress?.bookmarkPosition && (
                        <Bookmark className="h-3 w-3 text-primary" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-80 border-r bg-muted/30 flex-col">
        <NavigationSidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <NavigationSidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4 px-4 py-3">
            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <NavigationSidebar mobile />
              </SheetContent>
            </Sheet>

            {/* Back Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/learning-modules')}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Modules</span>
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Current Section Info */}
            {currentSection && (
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold truncate text-sm sm:text-base">
                  {currentSection.title}
                </h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Section {currentSectionIndex + 1} of {moduleDetails.sections.length}</span>
                  {currentSection.estimatedMinutes && (
                    <>
                      <span>•</span>
                      <span>{currentSection.estimatedMinutes} min</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Section Actions */}
            <div className="flex items-center gap-2">
              {currentSectionProgress && !currentSectionProgress.completed && (
                <Button 
                  size="sm" 
                  onClick={() => markSectionComplete(true)}
                  className="flex items-center gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Complete</span>
                </Button>
              )}
              
              {currentSectionProgress?.completed && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => markSectionComplete(false)}
                  className="flex items-center gap-1"
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="hidden sm:inline">Completed</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <div 
            ref={contentRef}
            className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8"
          >
            {currentSection ? (
              <div className="max-w-4xl mx-auto">
                {/* Section Content */}
                <div 
                  className="prose prose-gray dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentSection.content }}
                />
                
                {/* Section Navigation */}
                <div className="flex justify-between items-center mt-12 pt-8 border-t">
                  <Button 
                    variant="outline"
                    onClick={() => navigateToSection(currentSectionIndex - 1)}
                    disabled={currentSectionIndex === 0}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    {currentSectionIndex + 1} of {moduleDetails.sections.length}
                  </div>

                  <Button 
                    onClick={() => navigateToSection(currentSectionIndex + 1)}
                    disabled={currentSectionIndex === moduleDetails.sections.length - 1}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No content available for this section</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
