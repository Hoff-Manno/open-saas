import { Search, X } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

interface SearchResult {
  sectionId: string;
  sectionTitle: string;
  sectionIndex: number;
  matches: number;
  titleMatch: boolean;
  contentPreview?: string;
}

interface ContentSearchProps {
  sections: Array<{
    id: string;
    title: string;
    content: string;
    orderIndex: number;
  }>;
  onSectionSelect: (sectionIndex: number) => void;
  className?: string;
}

export function ContentSearch({ sections, onSectionSelect, className }: ContentSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Search functionality
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase();
    const results: SearchResult[] = [];
    
    sections.forEach((section, index) => {
      const titleMatch = section.title.toLowerCase().includes(searchTerm);
      const content = section.content.toLowerCase();
      const contentMatches = content.split(searchTerm).length - 1;
      
      if (titleMatch || contentMatches > 0) {
        // Get content preview around first match
        let contentPreview = '';
        if (contentMatches > 0 && !titleMatch) {
          const matchIndex = content.indexOf(searchTerm);
          const start = Math.max(0, matchIndex - 50);
          const end = Math.min(content.length, matchIndex + searchTerm.length + 50);
          contentPreview = '...' + section.content.substring(start, end) + '...';
        }
        
        results.push({
          sectionId: section.id,
          sectionTitle: section.title,
          sectionIndex: index,
          matches: contentMatches,
          titleMatch,
          contentPreview,
        });
      }
    });
    
    return results.slice(0, 10); // Limit to 10 results
  }, [query, sections]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || searchResults.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            handleResultClick(searchResults[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex]);

  const handleResultClick = (result: SearchResult) => {
    onSectionSelect(result.sectionIndex);
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(-1);
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search in module..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              setSelectedIndex(-1);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {isOpen && query && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-hidden">
          <CardContent className="p-0">
            {searchResults.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={result.sectionId}
                    className={cn(
                      "w-full text-left p-3 hover:bg-accent transition-colors border-b last:border-b-0",
                      selectedIndex === index && "bg-accent"
                    )}
                    onClick={() => handleResultClick(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="space-y-1">
                      {/* Section Title */}
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm truncate">
                          Section {result.sectionIndex + 1}: {highlightText(result.sectionTitle, query)}
                        </h4>
                        <div className="flex items-center gap-1 ml-2">
                          {result.titleMatch && (
                            <Badge variant="secondary" className="text-xs">
                              Title
                            </Badge>
                          )}
                          {result.matches > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {result.matches} match{result.matches !== 1 ? 'es' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Content Preview */}
                      {result.contentPreview && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {highlightText(result.contentPreview, query)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsOpen(false);
            setSelectedIndex(-1);
          }}
        />
      )}
    </div>
  );
}

interface QuickSearchProps {
  sections: Array<{
    id: string;
    title: string;
    content: string;
    orderIndex: number;
  }>;
  onSectionSelect: (sectionIndex: number) => void;
  currentSectionIndex: number;
}

export function QuickSearch({ sections, onSectionSelect, currentSectionIndex }: QuickSearchProps) {
  return (
    <div className="space-y-2">
      <ContentSearch 
        sections={sections}
        onSectionSelect={onSectionSelect}
        className="mb-4"
      />
      
      {/* Quick Navigation */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSectionSelect(Math.max(0, currentSectionIndex - 1))}
          disabled={currentSectionIndex === 0}
          className="text-xs h-8"
        >
          ← Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSectionSelect(Math.min(sections.length - 1, currentSectionIndex + 1))}
          disabled={currentSectionIndex === sections.length - 1}
          className="text-xs h-8"
        >
          Next →
        </Button>
      </div>
      
      {/* Section Jump */}
      <div className="text-xs text-muted-foreground text-center pt-1">
        Section {currentSectionIndex + 1} of {sections.length}
      </div>
    </div>
  );
}
