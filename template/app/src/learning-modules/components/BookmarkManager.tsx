import { Bookmark, BookmarkCheck, MapPin, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../lib/utils';

interface BookmarkData {
  sectionId: string;
  sectionTitle: string;
  scrollTop: number;
  timestamp: number;
  notes?: string;
}

interface BookmarkManagerProps {
  currentSectionId: string;
  currentSectionTitle: string;
  scrollPosition: number;
  bookmarks: BookmarkData[];
  onSaveBookmark: (bookmark: BookmarkData) => Promise<void>;
  onJumpToBookmark: (sectionId: string, scrollPosition: number) => void;
  onRemoveBookmark: (sectionId: string) => Promise<void>;
  className?: string;
}

export function BookmarkManager({
  currentSectionId,
  currentSectionTitle,
  scrollPosition,
  bookmarks,
  onSaveBookmark,
  onJumpToBookmark,
  onRemoveBookmark,
  className
}: BookmarkManagerProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check if current position is bookmarked
  useEffect(() => {
    const hasBookmark = bookmarks.some(b => b.sectionId === currentSectionId);
    setIsBookmarked(hasBookmark);
  }, [bookmarks, currentSectionId]);

  const handleSaveBookmark = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const bookmark: BookmarkData = {
        sectionId: currentSectionId,
        sectionTitle: currentSectionTitle,
        scrollTop: scrollPosition,
        timestamp: Date.now(),
      };
      
      await onSaveBookmark(bookmark);
      setIsBookmarked(true);
    } catch (error) {
      console.error('Error saving bookmark:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveBookmark = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await onRemoveBookmark(currentSectionId);
      setIsBookmarked(false);
    } catch (error) {
      console.error('Error removing bookmark:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bookmark className="h-4 w-4" />
          Bookmarks
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Section Bookmark */}
        <div className="flex items-center justify-between p-2 border rounded-lg bg-muted/20">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{currentSectionTitle}</p>
              <p className="text-xs text-muted-foreground">Current position</p>
            </div>
          </div>
          
          <Button
            size="sm"
            variant={isBookmarked ? "secondary" : "outline"}
            onClick={isBookmarked ? handleRemoveBookmark : handleSaveBookmark}
            disabled={isSaving}
            className="ml-2 flex-shrink-0"
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-3 w-3" />
            ) : (
              <Bookmark className="h-3 w-3" />
            )}
          </Button>
        </div>

        <Separator />

        {/* Saved Bookmarks */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Saved Bookmarks</h4>
          
          {bookmarks.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.sectionId}
                  className={cn(
                    "flex items-start gap-2 p-2 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer",
                    bookmark.sectionId === currentSectionId && "border-primary/50 bg-primary/5"
                  )}
                  onClick={() => onJumpToBookmark(bookmark.sectionId, bookmark.scrollTop)}
                >
                  <BookmarkCheck className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {bookmark.sectionTitle}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-2 w-2 mr-1" />
                        {formatTimeAgo(bookmark.timestamp)}
                      </Badge>
                      
                      {bookmark.sectionId === currentSectionId && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    
                    {bookmark.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {bookmark.notes}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBookmark(bookmark.sectionId);
                    }}
                    className="h-6 w-6 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Bookmark className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No bookmarks saved</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click the bookmark button to save your current position
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickBookmarkProps {
  isBookmarked: boolean;
  onToggleBookmark: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function QuickBookmark({ 
  isBookmarked, 
  onToggleBookmark, 
  disabled = false,
  className 
}: QuickBookmarkProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (isLoading || disabled) return;
    
    setIsLoading(true);
    try {
      await onToggleBookmark();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isBookmarked ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={isLoading || disabled}
      className={cn("flex items-center gap-2", className)}
    >
      {isBookmarked ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {isBookmarked ? 'Bookmarked' : 'Bookmark'}
      </span>
    </Button>
  );
}
