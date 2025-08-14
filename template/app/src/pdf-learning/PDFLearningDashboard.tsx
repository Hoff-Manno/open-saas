import { useState } from 'react';
import { useQuery } from 'wasp/client/operations';
import { getOrganizationModules, getRecentLearningActivity } from 'wasp/client/operations';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { FileText, Upload, BookOpen, Clock, TrendingUp, Users } from 'lucide-react';
import { Link } from 'wasp/client/router';

export default function PDFLearningDashboard() {
  const { data: modules, isLoading: modulesLoading } = useQuery(getOrganizationModules);
  const { data: recentActivity, isLoading: activityLoading } = useQuery(getRecentLearningActivity);

  return (
    <div className="py-10 lg:mt-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header Section */}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            <span className="text-primary">PDF</span> Learning Hub
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-muted-foreground">
            Transform your PDF documents into interactive learning experiences. Upload, process, and track your team's learning progress with AI-powered insights.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Upload PDF</h3>
                  <p className="text-sm text-muted-foreground">Convert documents to modules</p>
                </div>
              </div>
              <Link to="/pdf-upload">
                <Button className="w-full mt-4" variant="outline">
                  Upload Document
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Learning Modules</h3>
                  <p className="text-sm text-muted-foreground">Manage your content</p>
                </div>
              </div>
              <Link to="/learning-modules">
                <Button className="w-full mt-4" variant="outline">
                  View Modules
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Progress Dashboard</h3>
                  <p className="text-sm text-muted-foreground">Track learning analytics</p>
                </div>
              </div>
              <Link to="/progress-dashboard">
                <Button className="w-full mt-4" variant="outline">
                  View Progress
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Team Management</h3>
                  <p className="text-sm text-muted-foreground">Assign and track team progress</p>
                </div>
              </div>
              <Link to="/admin">
                <Button className="w-full mt-4" variant="outline">
                  Manage Team
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Learning Modules */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-foreground">Your Learning Modules</h3>
            <Link to="/learning-modules">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          {modulesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : modules && modules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.slice(0, 6).map((module) => (
                <Card key={module.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold text-lg">{module.title}</h4>
                      </div>
                      <Badge variant={module.processingStatus === 'COMPLETED' ? 'default' : 'secondary'}>
                        {module.processingStatus}
                      </Badge>
                    </div>
                    
                    {module.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {module.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(module.createdAt).toLocaleDateString()}
                      </span>
                      <span>{module.sectionsCount || 0} sections</span>
                    </div>

                    {module.processingStatus === 'COMPLETED' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>0%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2 mt-4">
                      {module.processingStatus === 'COMPLETED' ? (
                        <Button size="sm" className="flex-1" onClick={() => window.location.href = `/learning-modules/viewer/${module.id}`}>
                          Start Learning
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled className="flex-1">
                          Processing...
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => window.location.href = `/learning-modules/builder/${module.id}`}>
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Learning Modules Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Upload your first PDF document to create an interactive learning module.
                </p>
                <Link to="/pdf-upload">
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Your First PDF
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        {recentActivity && recentActivity.length > 0 && (
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-foreground mb-6">Recent Learning Activity</h3>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{activity.moduleTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.sectionTitle} • {activity.timeSpent}min
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(activity.lastAccessed).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}