import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Brain, BookOpen, Code } from 'lucide-react';

export default function AILearningDemo() {
  const [content, setContent] = useState('');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">AI Learning Features (Demo)</h1>
        <p className="text-muted-foreground">AI operations temporarily disabled for basic testing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Content Input
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter learning content here... (AI features temporarily disabled)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px]"
          />
          <div className="flex gap-2 mt-4">
            <Button disabled className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Generate Questions (Disabled)
            </Button>
            <Button disabled className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Generate Summary (Disabled)
            </Button>
            <Button disabled className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Enrich Content (Disabled)
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generated Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No questions generated yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No summary generated yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enriched Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No enriched content yet</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
