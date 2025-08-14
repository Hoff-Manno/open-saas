import { type AuthUser } from 'wasp/auth';
import { useAuth } from 'wasp/client/auth';
import UsersTable from './UsersTable';
import TeamManagementTabs from '../../../team/TeamManagementTabs';
import Breadcrumb from '../../layout/Breadcrumb';
import DefaultLayout from '../../layout/DefaultLayout';
import { useRedirectHomeUnlessUserIsAdmin } from '../../useRedirectHomeUnlessUserIsAdmin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Users, UserCog } from 'lucide-react';

const EnhancedUsersPage = ({ user }: { user: AuthUser }) => {
  useRedirectHomeUnlessUserIsAdmin({user});
  const { data: currentUser } = useAuth();

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName='Users & Team Management' />
      <div className='flex flex-col gap-10'>
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              All Users
            </TabsTrigger>
            <TabsTrigger value="team">
              <UserCog className="w-4 h-4 mr-2" />
              Team Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UsersTable />
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            {currentUser && <TeamManagementTabs currentUser={currentUser} />}
          </TabsContent>
        </Tabs>
      </div>
    </DefaultLayout>
  );
};

export default EnhancedUsersPage;
