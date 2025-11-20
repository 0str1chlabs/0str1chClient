import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from './AuthService';
import { backblazeSyncManager } from '@/lib/backblazeSyncManager';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  inviteVerified: boolean;
  checkInviteStatus: () => Promise<boolean>;
  login: (user: User) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  verifyToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteVerified, setInviteVerified] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(false);

  const login = async (userData: User) => {
    // Check if user has changed before setting user state
    // This will clear IndexedDB and localStorage if it's a different user
    await authService.checkAndHandleUserSwitch(userData.id);
    
    // Set user in authService (which will track previous user ID)
    authService.setUser(userData);
    setUser(userData);
    setInviteVerified(false); // Force re-verification until backend confirms
    
    // Check invite status after login
    await checkInviteStatus();
    
    // Notify sync manager that user logged in
    // This will check for pending changes and schedule sync if needed
    setTimeout(() => {
      backblazeSyncManager.onUserLogin();
    }, 1000); // Small delay to ensure auth token is set
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setInviteVerified(false); // Reset invite verification status on logout
    }
  };

  const checkInviteStatus = async (): Promise<boolean> => {
    try {
      setCheckingInvite(true);
      const token = authService.getToken();
      if (!token) {
        setInviteVerified(false);
        return false;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';
      const response = await fetch(`${backendUrl}/api/auth/invite-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include' // Include cookies for session-based auth
      });

      if (response.ok) {
        const data = await response.json();
        const verified =
          data.isAllowed === true ||
          data.isAllowed === 'true' ||
          !!data.inviteVerified;
        setInviteVerified(verified);
        return verified;
      } else {
        setInviteVerified(false);
        return false;
      }
    } catch (error) {
      console.error('Error checking invite status:', error);
      setInviteVerified(false);
      return false;
    } finally {
      setCheckingInvite(false);
    }
  };

  const verifyToken = async (): Promise<boolean> => {
    try {
      const verification = await authService.verifyToken();
      if (verification.valid && verification.user) {
        // Check if user has changed before setting user state
        await authService.checkAndHandleUserSwitch(verification.user.id);
        authService.setUser(verification.user);
        setUser(verification.user);
        
        // Check invite status after setting user
        await checkInviteStatus();
        
        return true;
      } else {
        setUser(null);
        setInviteVerified(false);
        return false;
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setUser(null);
      setInviteVerified(false);
      return false;
    }
  };

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      // First, try auto-login if remember me is enabled
      if (authService.isRememberMeEnabled()) {
        const autoLoginUser = await authService.autoLogin();
        if (autoLoginUser) {
          // Check if user has changed before setting user state
          await authService.checkAndHandleUserSwitch(autoLoginUser.id);
          authService.setUser(autoLoginUser);
          setUser(autoLoginUser);
          
          // Check invite status
          await checkInviteStatus();
          
          setIsLoading(false);
          return;
        }
      }
      
      // Check if user is authenticated
      if (authService.isAuthenticated()) {
        // Get current user from localStorage or API
        const currentUser = authService.getUser();
        if (currentUser) {
          // Verify token with server
          const verification = await authService.verifyToken();
          if (verification.valid && verification.user) {
            // Check if user has changed before setting user state
            await authService.checkAndHandleUserSwitch(verification.user.id);
            authService.setUser(verification.user);
            setUser(verification.user);
            
            // Check invite status
            await checkInviteStatus();
            
            // Notify sync manager about successful auth restoration
            setTimeout(() => {
              backblazeSyncManager.onUserLogin();
            }, 1000);
          } else {
            // Token is invalid, try to refresh
            const refreshed = await authService.refreshToken();
            if (refreshed) {
              const userFromApi = await authService.getCurrentUser();
              if (userFromApi) {
                setUser(userFromApi);
                await checkInviteStatus();
              } else {
                authService.clearAuth();
                setUser(null);
              }
            } else {
              authService.clearAuth();
              setUser(null);
            }
          }
        } else {
          // Try to get user from API
          const userFromApi = await authService.getCurrentUser();
          if (userFromApi) {
            setUser(userFromApi);
            await checkInviteStatus();
          } else {
            // Clear auth if user not found
            authService.clearAuth();
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Set up periodic token verification if user is authenticated
  useEffect(() => {
    if (user && authService.isRememberMeEnabled()) {
      const interval = setInterval(async () => {
        const isValid = await verifyToken();
        if (!isValid) {
          console.log('Token expired, logging out');
          await logout();
        }
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(interval);
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading: isLoading || checkingInvite,
    inviteVerified,
    checkInviteStatus,
    login,
    logout,
    checkAuth,
    verifyToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 