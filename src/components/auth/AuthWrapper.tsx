import React, { ReactNode, useState } from 'react';
import { useAuth } from './AuthContext';
import { LoginModal } from './LoginModal';
import { InviteCodeModal } from './InviteCodeModal';
import { InviteRequestQueue } from './InviteRequestQueue';
import { Loader2 } from '@/lib/icons';

interface AuthWrapperProps {
  children: ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, inviteVerified, checkInviteStatus, login, logout } = useAuth();
  const [showRequestQueue, setShowRequestQueue] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginModal
        onLoginSuccess={login}
        onClose={() => {
          // Prevent closing - user must authenticate
          console.log('Authentication required');
        }}
      />
    );
  }

  // If authenticated but invite not verified, show invite code modal
  if (isAuthenticated && user && !inviteVerified) {
    if (showRequestQueue) {
      return (
        <InviteRequestQueue
          onBack={() => setShowRequestQueue(false)}
          userEmail={user.email}
          userName={user.name}
        />
      );
    }

    return (
      <InviteCodeModal
        onVerifySuccess={async () => {
          await checkInviteStatus();
        }}
        onRequestInvite={() => setShowRequestQueue(true)}
        onChangeEmail={() => {
          logout();
        }}
        userEmail={user.email}
      />
    );
  }

  // Only show children if authenticated AND invite verified
  return <>{children}</>;
}; 