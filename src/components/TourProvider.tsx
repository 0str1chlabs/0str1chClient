import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS } from 'react-joyride';
import { tourSteps, tourOptions, darkTourOptions } from '@/lib/tourConfig';
import { 
  markTourCompleted, 
  hasCompletedTour as checkTourCompleted, 
  isNewUser, 
  shouldShowTourAutomatically,
  getTourStats,
  isFirstTimeSignup,
  hasUserChanged
} from '@/lib/tourUtils';

interface TourContextType {
  isRunning: boolean;
  startTour: () => void;
  stopTour: () => void;
  resetTour: () => void;
  hasCompletedTour: boolean;
}

// Create a default context value
const defaultContextValue: TourContextType = {
  isRunning: false,
  startTour: () => {},
  stopTour: () => {},
  resetTour: () => {},
  hasCompletedTour: false,
};

const TourContext = createContext<TourContextType>(defaultContextValue);

interface TourProviderProps {
  children: React.ReactNode;
  isDarkMode?: boolean;
  currentUserId?: string;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children, isDarkMode = false, currentUserId }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);

  // Check if user has completed tour before
  useEffect(() => {
    setHasCompletedTour(checkTourCompleted());
  }, []);

  const startTour = useCallback(() => {
    setIsRunning(true);
  }, []);

  // Check if user is new signup and should see tour
  useEffect(() => {
    // Only show tour for first-time signups, not returning users
    if (currentUserId && isFirstTimeSignup() && !hasCompletedTour) {
      // Check if user has changed (different user logged in)
      if (hasUserChanged(currentUserId)) {
        // User has changed, don't show tour
        return;
      }
      
      // Delay tour start to allow page to load
      const timer = setTimeout(() => {
        startTour();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour, startTour, currentUserId]);

  const stopTour = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem('tour-completed');
    setHasCompletedTour(false);
    startTour();
  }, [startTour]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, action, index } = data;

    console.log('Tour callback:', { status, type, action, index });

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      // Tour has ended - either finished or skipped
      setIsRunning(false);
      
      if (status === STATUS.FINISHED) {
        setHasCompletedTour(true);
        markTourCompleted();
      }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      // If target element is not found, try to continue to next step
      console.warn('Tour target not found, continuing to next step');
    }
    // Let React Joyride handle step navigation automatically when continuous=true
  }, []);

  const contextValue: TourContextType = {
    isRunning,
    startTour,
    stopTour,
    resetTour,
    hasCompletedTour,
  };

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      <Joyride
        steps={tourSteps}
        run={isRunning}
        callback={handleJoyrideCallback}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        disableOverlayClose={true}
        disableScrolling={true}
        scrollToFirstStep={false}
        spotlightClicks={false}
        spotlightPadding={8}
        styles={isDarkMode ? darkTourOptions.styles : tourOptions.styles}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish Tour',
          next: 'Next',
          skip: 'Skip Tour',
        }}
      />
    </TourContext.Provider>
  );
};

export const useTour = (): TourContextType => {
  const context = useContext(TourContext);
  return context;
};
