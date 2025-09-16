import React, { useEffect, useState } from 'react';
import { TourContextWrapper } from './TourContextWrapper';

interface TourWithAuthProps {
  children: React.ReactNode;
  isDarkMode?: boolean;
}

export const TourWithAuth: React.FC<TourWithAuthProps> = ({ children, isDarkMode = false }) => {
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Get user ID from localStorage (set by AuthService)
    const getUserFromStorage = () => {
      try {
        const userData = localStorage.getItem('user_data');
        if (userData) {
          const user = JSON.parse(userData);
          setUserId(user.id);
        }
      } catch (error) {
        console.warn('TourWithAuth: Could not get user from localStorage:', error);
      }
    };

    getUserFromStorage();

    // Listen for storage changes (when user logs in/out)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_data') {
        getUserFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case of same-tab updates
    const interval = setInterval(getUserFromStorage, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <TourContextWrapper isDarkMode={isDarkMode} currentUserId={userId}>
      {children}
    </TourContextWrapper>
  );
};
