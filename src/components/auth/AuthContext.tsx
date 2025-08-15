import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from './AuthService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
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

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const verifyToken = async (): Promise<boolean> => {
    try {
      const verification = await authService.verifyToken();
      if (verification.valid && verification.user) {
        setUser(verification.user);
        return true;
      } else {
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setUser(null);
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
          setUser(autoLoginUser);
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
            setUser(verification.user);
          } else {
            // Token is invalid, try to refresh
            const refreshed = await authService.refreshToken();
            if (refreshed) {
              const userFromApi = await authService.getCurrentUser();
              if (userFromApi) {
                setUser(userFromApi);
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
    isLoading,
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