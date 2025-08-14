import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAction } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { acceptTeamInvitation } from 'wasp/client/operations';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, XCircle, Loader2, Users } from 'lucide-react';

export function AcceptInvitationPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'ready'>('loading');
  const [message, setMessage] = useState<string>('');
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [invitationDetails, setInvitationDetails] = useState<{
    organizationName?: string;
    role?: string;
    email?: string;
  }>({});

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: user } = useAuth();
  const acceptInvitationAction = useAction(acceptTeamInvitation);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link. No token provided.');
      return;
    }

    // Decode token to show organization details (without accepting yet)
    try {
      const decoded = JSON.parse(atob(token));
      setInvitationDetails({
        role: decoded.role,
        email: decoded.email,
      });

      // If user is already authenticated and the invitation is for their email,
      // we can show the ready state
      if (user && user.email === decoded.email) {
        setStatus('ready');
      } else if (user && user.email !== decoded.email) {
        setStatus('error');
        setMessage('This invitation is for a different email address. Please log out and sign in with the correct account.');
      } else {
        // User not authenticated, show login options
        setStatus('ready');
      }
    } catch (error) {
      console.error('Error decoding token:', error);
      setStatus('error');
      setMessage('Invalid invitation token.');
    }
  }, [searchParams, user]);

  const handleAcceptInvitation = async () => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link.');
      return;
    }

    if (!user) {
      setStatus('error');
      setMessage('Please sign in first to accept the invitation.');
      return;
    }

    try {
      setIsAccepting(true);
      const result = await acceptInvitationAction({ invitationToken: token });
      setStatus('success');
      setMessage(result.message);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/learning-modules');
      }, 2000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Redirect to Google Auth with invitation token as parameter
    const token = searchParams.get('token');
    const googleAuthUrl = `/auth/google/login?invitation=${encodeURIComponent(token || '')}`;
    window.location.href = googleAuthUrl;
  };

  const handleDecline = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              Team Invitation
            </CardTitle>
            <CardDescription>
              You've been invited to join a learning organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitationDetails.role && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900">Invitation Details</h3>
                </div>
                <p className="text-blue-700 text-sm">
                  Role: <span className="font-medium capitalize">{invitationDetails.role.toLowerCase()}</span>
                </p>
                {invitationDetails.email && (
                  <p className="text-blue-700 text-sm">
                    Email: <span className="font-medium">{invitationDetails.email}</span>
                  </p>
                )}
              </div>
            )}

            {status === 'loading' && (
              <div className="flex items-center justify-center space-x-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing invitation...</span>
              </div>
            )}

            {status === 'success' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {status === 'ready' && !user && (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm text-center">
                  Sign in to accept this team invitation
                </p>
                <div className="space-y-3">
                  <Button 
                    onClick={handleGoogleSignIn}
                    className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/login')}
                    className="w-full"
                  >
                    Sign in with Email
                  </Button>
                </div>
              </div>
            )}

            {status === 'ready' && user && (
              <div className="flex space-x-3">
                <Button 
                  onClick={handleAcceptInvitation}
                  className="flex-1"
                  disabled={status !== 'ready' || isAccepting}
                >
                  {isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Accept Invitation
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDecline}
                  disabled={status !== 'ready' || isAccepting}
                  className="flex-1"
                >
                  Decline
                </Button>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">
                  Redirecting to your dashboard...
                </p>
                <Button onClick={() => navigate('/demo-app')} variant="outline">
                  Go to Dashboard Now
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <Button onClick={() => navigate('/')} variant="outline">
                  Return to Home
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
