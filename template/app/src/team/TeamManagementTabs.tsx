import { useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import { useAction } from 'wasp/client/operations';
import { type User, type LearningModule } from 'wasp/entities';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { UserPlus, Mail, Users, BookOpen, CheckCircle, XCircle } from 'lucide-react';

interface TeamManagementTabsProps {
  currentUser: User;
}

export function TeamManagementTabs({ currentUser }: TeamManagementTabsProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'LEARNER'>('LEARNER');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [inviteMessage, setInviteMessage] = useState('');
  
  // Temporary action implementations until operations are properly registered
  const createTeamInvitationAction = async (args: any) => {
    // Placeholder implementation
    return { success: true, message: `Invitation sent to ${args.email}` };
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail || !currentUser.organizationId) {
      setInviteStatus('error');
      setInviteMessage('Please provide an email address and ensure you have an organization.');
      return;
    }

    try {
      setInviteStatus('loading');
      const result = await createTeamInvitationAction({
        email: inviteEmail,
        organizationId: currentUser.organizationId,
        role: inviteRole,
      });

      setInviteStatus('success');
      setInviteMessage(result.message);
      setInviteEmail('');
      setInviteRole('LEARNER');
    } catch (error: any) {
      setInviteStatus('error');
      setInviteMessage(error.message || 'Failed to send invitation');
    }
  };

  // Only show team management if user is admin
  if (!currentUser.isAdmin && currentUser.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="invite" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invite">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Users
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <BookOpen className="w-4 h-4 mr-2" />
            Module Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invite" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Invite Team Members
              </CardTitle>
              <CardDescription>
                Send invitations to join your organization and start learning together.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={(value: 'ADMIN' | 'LEARNER') => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEARNER">Learner</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {inviteStatus !== 'idle' && (
                <Alert className={inviteStatus === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {inviteStatus === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={inviteStatus === 'success' ? 'text-green-800' : 'text-red-800'}>
                    {inviteMessage}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleSendInvitation}
                disabled={inviteStatus === 'loading' || !inviteEmail}
                className="w-full md:w-auto"
              >
                {inviteStatus === 'loading' ? (
                  <>Loading...</>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <TeamUsersSection currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <ModuleAssignmentSection currentUser={currentUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TeamUsersSectionProps {
  currentUser: User;
}

function TeamUsersSection({ currentUser }: TeamUsersSectionProps) {
  // This would normally use the getTeamUsers query
  const [teamUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>
          Manage your organization's team members and their roles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {teamUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No team members found. Start by inviting users to your organization.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Team users table would go here */}
            <p className="text-sm text-gray-500">Team users will be displayed here once the queries are implemented.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ModuleAssignmentSectionProps {
  currentUser: User;
}

function ModuleAssignmentSection({ currentUser }: ModuleAssignmentSectionProps) {
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>('');
  const [assignmentStatus, setAssignmentStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [assignmentMessage, setAssignmentMessage] = useState('');

  // These would normally use actual queries
  const [learningModules] = useState<LearningModule[]>([]);
  const [teamUsers] = useState<User[]>([]);

  // Temporary action implementation
  const assignModuleToUsersAction = async (args: any) => {
    // Placeholder implementation
    return { success: true, assignedCount: args.userIds.length };
  };

  const handleAssignModule = async () => {
    if (!selectedModule || selectedUsers.length === 0) {
      setAssignmentStatus('error');
      setAssignmentMessage('Please select a module and at least one user.');
      return;
    }

    try {
      setAssignmentStatus('loading');
      const result = await assignModuleToUsersAction({
        moduleId: selectedModule,
        userIds: selectedUsers,
        dueDate: dueDate || undefined,
      });

      setAssignmentStatus('success');
      setAssignmentMessage(`Module assigned to ${result.assignedCount} users successfully.`);
      setSelectedModule('');
      setSelectedUsers([]);
      setDueDate('');
    } catch (error: any) {
      setAssignmentStatus('error');
      setAssignmentMessage(error.message || 'Failed to assign module');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Assignments</CardTitle>
        <CardDescription>
          Assign learning modules to team members and track their progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {learningModules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No learning modules found. Create modules first before assigning them.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="module-select">Select Module</Label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a learning module..." />
                  </SelectTrigger>
                  <SelectContent>
                    {learningModules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date (Optional)</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Users</Label>
              <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                {teamUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => {
                        setSelectedUsers(prev =>
                          prev.includes(user.id)
                            ? prev.filter(id => id !== user.id)
                            : [...prev, user.id]
                        );
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`user-${user.id}`} className="text-sm font-medium leading-none">
                      {user.email} 
                      <Badge variant="outline" className="ml-2">
                        {user.role?.toLowerCase()}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {assignmentStatus !== 'idle' && (
              <Alert className={assignmentStatus === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {assignmentStatus === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={assignmentStatus === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {assignmentMessage}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleAssignModule}
              disabled={assignmentStatus === 'loading' || !selectedModule || selectedUsers.length === 0}
              className="w-full md:w-auto"
            >
              {assignmentStatus === 'loading' ? (
                <>Loading...</>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Assign Module
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamManagementTabs;
