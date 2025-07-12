import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface ResizableProps {
  children: ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Resizable: React.FC<ResizableProps> = ({
  children,
  initialWidth = 440,
  initialHeight = 650,
  minWidth = 300,
  minHeight = 400,
  maxWidth = 800,
  maxHeight = 1000,
  className = '',
  style = {}
}) => {
  const [dimensions, setDimensions] = useState({
    width: initialWidth,
    height: initialHeight
  });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startDimensions = useRef({ width: 0, height: 0 });
  const startPosition = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw') => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeDirection(direction);
    startPos.current = { x: e.clientX, y: e.clientY };
    startDimensions.current = { width: dimensions.width, height: dimensions.height };
    startPosition.current = { x: position.x, y: position.y };
    
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !resizeDirection) return;

    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;

    let newWidth = startDimensions.current.width;
    let newHeight = startDimensions.current.height;
    let newX = startPosition.current.x;
    let newY = startPosition.current.y;

    // Calculate new dimensions based on resize direction
    switch (resizeDirection) {
      case 'n': // north (top edge) - decrease height and move up
        newHeight = startDimensions.current.height - deltaY;
        newY = startPosition.current.y + deltaY;
        break;
      case 's': // south (bottom edge) - increase height
        newHeight = startDimensions.current.height + deltaY;
        break;
      case 'e': // east (right edge) - increase width
        newWidth = startDimensions.current.width + deltaX;
        break;
      case 'w': // west (left edge) - decrease width and move left
        newWidth = startDimensions.current.width - deltaX;
        newX = startPosition.current.x + deltaX;
        break;
      case 'ne': // northeast (top-right corner) - increase width, decrease height and move up
        newWidth = startDimensions.current.width + deltaX;
        newHeight = startDimensions.current.height - deltaY;
        newY = startPosition.current.y + deltaY;
        break;
      case 'nw': // northwest (top-left corner) - decrease width, decrease height and move up/left
        newWidth = startDimensions.current.width - deltaX;
        newHeight = startDimensions.current.height - deltaY;
        newX = startPosition.current.x + deltaX;
        newY = startPosition.current.y + deltaY;
        break;
      case 'se': // southeast (bottom-right corner) - increase width, increase height
        newWidth = startDimensions.current.width + deltaX;
        newHeight = startDimensions.current.height + deltaY;
        break;
      case 'sw': // southwest (bottom-left corner) - decrease width, increase height and move left
        newWidth = startDimensions.current.width - deltaX;
        newHeight = startDimensions.current.height + deltaY;
        newX = startPosition.current.x + deltaX;
        break;
    }

    // Apply constraints
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    setDimensions({ width: newWidth, height: newHeight });
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    setResizeDirection(null);
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeDirection]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        transform: `translate(${position.x}px, ${position.y}px)`,
        ...style
      }}
    >
      {children}
      
      {/* Edge resize handles */}
      {/* Top edge */}
      <div
        className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-blue-500/20 transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 'n')}
        title="Resize height"
      />
      
      {/* Bottom edge */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-blue-500/20 transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 's')}
        title="Resize height"
      />
      
      {/* Left edge */}
      <div
        className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize hover:bg-blue-500/20 transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 'w')}
        title="Resize width"
      />
      
      {/* Right edge */}
      <div
        className="absolute top-0 bottom-0 right-0 w-2 cursor-e-resize hover:bg-blue-500/20 transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 'e')}
        title="Resize width"
      />
      
      {/* Corner resize handles */}
      {/* Top-right corner */}
      <div
        className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize hover:bg-blue-500/20 rounded-bl transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 'ne')}
        title="Resize width and height"
      />
      
      {/* Top-left corner */}
      <div
        className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize hover:bg-blue-500/20 rounded-br transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 'nw')}
        title="Resize width and height"
      />
      
      {/* Bottom-right corner */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/20 rounded-tl transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 'se')}
        title="Resize width and height"
      />
      
      {/* Bottom-left corner */}
      <div
        className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize hover:bg-blue-500/20 rounded-tr transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 'sw')}
        title="Resize width and height"
      />
    </div>
  );
}; 