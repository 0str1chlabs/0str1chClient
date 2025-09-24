/**
 * Utility functions for viewport-aware positioning
 * Ensures components are always visible within the viewport bounds
 */

export interface ViewportBounds {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Get current viewport dimensions
 */
export const getViewportBounds = (): ViewportBounds => {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
};

/**
 * Constrain a position to be within viewport bounds
 */
export const constrainToViewport = (
  position: Position,
  size: Size,
  margin: number = 20
): Position => {
  const viewport = getViewportBounds();
  
  return {
    x: Math.max(margin, Math.min(position.x, viewport.width - size.width - margin)),
    y: Math.max(margin, Math.min(position.y, viewport.height - size.height - margin))
  };
};

/**
 * Get responsive positioning for different screen sizes
 */
export const getResponsivePosition = (
  component: 'toolbar' | 'spreadsheet' | 'ai-assistant',
  viewport: ViewportBounds
): Position => {
  const { width, height } = viewport;
  
  switch (component) {
    case 'toolbar':
      // Position toolbar on the left side, higher up on the screen
      return {
        x: 20,
        y: Math.max(20, height * 0.15) // Position at 15% from top instead of center
      };
      
    case 'spreadsheet':
      // Position spreadsheet in the front/upper area of the visible canvas
      const spreadsheetSize = getResponsiveSize('spreadsheet', viewport);
      return {
        x: Math.max(20, (width - spreadsheetSize.width) / 3), // Slightly left of center
        y: Math.max(20, height * 0.1) // Position at 10% from top
      };
      
    case 'ai-assistant':
      // Position AI assistant on the right side
      return {
        x: width - 520, // 500px width + 20px margin
        y: Math.max(20, (height - 600) / 2) // Center vertically
      };
      
    default:
      return { x: 20, y: 20 };
  }
};

/**
 * Get responsive sizing for different screen sizes
 */
export const getResponsiveSize = (
  component: 'toolbar' | 'spreadsheet' | 'ai-assistant',
  viewport: ViewportBounds
): Size => {
  const { width, height } = viewport;
  
  switch (component) {
    case 'toolbar':
      return {
        width: 48, // Fixed width for toolbar
        height: Math.min(400, height - 100) // Responsive height
      };
      
    case 'spreadsheet':
      return {
        width: Math.min(850, Math.max(600, width * 0.65)), // Restore reasonable width
        height: Math.min(650, Math.max(400, height * 0.7 - 100)) // Subtract 100px to ensure bottom is always visible
      };
      
    case 'ai-assistant':
      return {
        width: Math.min(500, width * 0.4),
        height: Math.min(600, height * 0.8)
      };
      
    default:
      return { width: 400, height: 300 };
  }
};

/**
 * Check if a position and size would fit within viewport
 */
export const fitsInViewport = (
  position: Position,
  size: Size,
  margin: number = 20
): boolean => {
  const viewport = getViewportBounds();
  
  return (
    position.x >= margin &&
    position.y >= margin &&
    position.x + size.width <= viewport.width - margin &&
    position.y + size.height <= viewport.height - margin
  );
};

/**
 * Get optimal position for a component to be fully visible
 */
export const getOptimalPosition = (
  component: 'toolbar' | 'spreadsheet' | 'ai-assistant',
  preferredPosition?: Position
): Position => {
  const viewport = getViewportBounds();
  const size = getResponsiveSize(component, viewport);
  
  // If no preferred position, use responsive positioning
  if (!preferredPosition) {
    return getResponsivePosition(component, viewport);
  }
  
  // Check if preferred position fits
  if (fitsInViewport(preferredPosition, size)) {
    return preferredPosition;
  }
  
  // If not, constrain to viewport
  return constrainToViewport(preferredPosition, size);
};

/**
 * Hook for responsive positioning that updates on window resize
 */
export const useResponsivePosition = (
  component: 'toolbar' | 'spreadsheet' | 'ai-assistant',
  preferredPosition?: Position
) => {
  const [position, setPosition] = React.useState<Position>(() => 
    getOptimalPosition(component, preferredPosition)
  );
  
  React.useEffect(() => {
    const handleResize = () => {
      setPosition(getOptimalPosition(component, preferredPosition));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [component, preferredPosition]);
  
  return position;
};

// Import React for the hook
import React from 'react';
