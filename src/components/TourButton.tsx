import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw } from 'lucide-react';
import { useTour } from './TourProvider';

interface TourButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  showReset?: boolean;
}

export const TourButton: React.FC<TourButtonProps> = ({ 
  variant = 'outline', 
  size = 'default', 
  className = '',
  showReset = false 
}) => {
  const { startTour, resetTour, hasCompletedTour } = useTour();

  return (
    <div className="flex gap-2">
      <Button
        onClick={startTour}
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
        data-tour="tour-button"
      >
        <Play className="h-4 w-4" />
        {hasCompletedTour ? 'Retake Tour' : 'Take Tour'}
      </Button>
      
      {showReset && hasCompletedTour && (
        <Button
          onClick={resetTour}
          variant="ghost"
          size={size}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      )}
    </div>
  );
};

// Floating tour button for easy access
export const FloatingTourButton: React.FC = () => {
  const { startTour, hasCompletedTour } = useTour();

  return (
    <Button
      onClick={startTour}
      className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white"
      size="lg"
      data-tour="floating-tour-button"
    >
      <Play className="h-5 w-5 mr-2" />
      {hasCompletedTour ? 'Tour' : 'Start Tour'}
    </Button>
  );
};
