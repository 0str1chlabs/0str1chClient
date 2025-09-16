import React from 'react';
import { TourProvider } from './TourProvider';

interface TourContextWrapperProps {
  children: React.ReactNode;
  isDarkMode?: boolean;
}

export const TourContextWrapper: React.FC<TourContextWrapperProps> = ({ children, isDarkMode = false }) => {
  return (
    <TourProvider isDarkMode={isDarkMode}>
      {children}
    </TourProvider>
  );
};
