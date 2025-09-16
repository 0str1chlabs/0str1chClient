import React from 'react';
import { TourProvider } from './TourProvider';

interface TourContextWrapperProps {
  children: React.ReactNode;
  isDarkMode?: boolean;
  currentUserId?: string;
}

export const TourContextWrapper: React.FC<TourContextWrapperProps> = ({ children, isDarkMode = false, currentUserId }) => {
  return (
    <TourProvider isDarkMode={isDarkMode} currentUserId={currentUserId}>
      {children}
    </TourProvider>
  );
};
