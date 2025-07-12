import React, { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { LoginModal } from './LoginModal';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, login } = useAuth();

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

  return <>{children}</>;
}; 