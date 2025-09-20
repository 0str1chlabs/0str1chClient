import { useState, useRef, useEffect } from 'react';
import { Toolbar } from './Toolbar';
import { RotateCw, Move, Pin, PinOff, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getResponsivePosition, getResponsiveSize, constrainToViewport, getViewportBounds } from '@/lib/viewportUtils';

interface MovableToolbarProps {
  onFormat: (action: string, value?: string) => void;
  selectedCells?: string[];
  activeSheet?: any;
  onCellSelect?: (cellId: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onAddSheet?: () => void;
  onRearrange?: () => void;
  onShowPivotTable?: () => void;
  onShowPivotFullScreen?: () => void;
  onShowPivotModal?: () => void;
  onSanitizeData?: () => void;
  onTestFormat?: () => void;
}

export const MovableToolbar = (props: MovableToolbarProps) => {
  // Initialize with responsive positioning
  const [position, setPosition] = useState(() => {
    const viewport = getViewportBounds();
    return getResponsivePosition('toolbar', viewport);
  });
  const [rotation, setRotation] = useState(0); // Rotation in degrees
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotationStart, setRotationStart] = useState(0);
  const [isFixed, setIsFixed] = useState(true); // New state for fixed/movable mode
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isFixed) return; // Don't allow dragging when fixed
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-toolbar-handle]')) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // Handle mouse down for rotation
  const handleRotationMouseDown = (e: React.MouseEvent) => {
    if (isFixed) return; // Don't allow rotation when fixed
    e.preventDefault();
    e.stopPropagation();
    setIsRotating(true);
    setRotationStart(rotation);
  };

  // Handle mouse move for dragging and rotation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !isFixed) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Keep toolbar within viewport bounds using utility function
        const toolbarSize = getResponsiveSize('toolbar', getViewportBounds());
        const constrainedPosition = constrainToViewport(
          { x: newX, y: newY },
          toolbarSize,
          20 // margin
        );
        
        setPosition(constrainedPosition);
      }
      
      if (isRotating && !isFixed) {
        const toolbar = toolbarRef.current;
        if (toolbar) {
          const rect = toolbar.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          const angle = Math.atan2(
            e.clientY - centerY,
            e.clientX - centerX
          ) * 180 / Math.PI;
          
          setRotation(angle + 90); // +90 to align with the rotation handle
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsRotating(false);
    };

    if ((isDragging || isRotating) && !isFixed) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isRotating, dragStart, rotation, isFixed]);

  // Handle window resize to maintain responsive positioning
  useEffect(() => {
    const handleResize = () => {
      if (isFixed) {
        // Update position to maintain responsive layout
        const viewport = getViewportBounds();
        setPosition(getResponsivePosition('toolbar', viewport));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFixed]);

  // Handle rotation button click (cycle through common angles)
  const handleRotationClick = () => {
    if (isFixed) return; // Don't allow rotation when fixed
    const commonAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    const currentIndex = commonAngles.findIndex(angle => Math.abs(angle - rotation) < 5);
    const nextIndex = (currentIndex + 1) % commonAngles.length;
    setRotation(commonAngles[nextIndex]);
  };

  // Toggle fixed/movable mode
  const toggleFixedMode = () => {
    setIsFixed(!isFixed);
    if (!isFixed) {
      // When switching to fixed mode, reset position to responsive position
      const viewport = getViewportBounds();
      setPosition(getResponsivePosition('toolbar', viewport));
      setRotation(0);
    }
  };

  // Fixed position styles with responsive positioning
  const fixedStyles = isFixed ? {
    position: 'fixed' as const,
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'none',
    zIndex: 5,
  } : {
    position: 'fixed' as const,
    left: position.x,
    top: position.y,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
    zIndex: 5,
  };

  return (
    <div
      ref={toolbarRef}
      className="movable-toolbar select-none viewport-safe"
      style={fixedStyles}
      onMouseDown={handleMouseDown}
      data-toolbar-handle="true"
    >
      {/* Toolbar Container with drag handle */}
      <div className="relative">
        {/* Toggle Fixed/Movable Button */}
        <div 
                      className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-transparent backdrop-blur-sm rounded-t-lg px-2 py-1 shadow-md border border-transparent cursor-pointer hover:bg-white/20 transition-colors"
          onClick={toggleFixedMode}
          title={isFixed ? "Make Movable" : "Fix Position"}
        >
                     {isFixed ? <PinOff size={12} className="text-foreground" /> : <Pin size={12} className="text-foreground" />}
        </div>
        
        {/* Rearrange Button */}
        <div 
          className="absolute -top-8 left-16 bg-transparent backdrop-blur-sm rounded-t-lg px-2 py-1 shadow-md border border-transparent cursor-pointer hover:bg-white/20 transition-colors"
          onClick={props.onRearrange}
          title="Rearrange Layout"
        >
          <LayoutGrid size={12} className="text-foreground" />
        </div>
        
        {/* Drag Handle - only show when not fixed */}
        {!isFixed && (
          <div 
            className="absolute -top-8 -left-8 bg-transparent backdrop-blur-sm rounded-lg px-2 py-1 shadow-md border border-transparent cursor-move hover:bg-white/20 transition-colors"
            data-toolbar-handle="true"
          >
                         <Move size={12} className="text-foreground" />
          </div>
        )}
        
        {/* Rotation Handle - only show when not fixed */}
        {!isFixed && (
          <>
            <div 
              className="absolute -top-8 -right-8 bg-transparent backdrop-blur-sm rounded-lg p-1 shadow-md border border-transparent cursor-pointer hover:bg-white/20 transition-colors"
              onMouseDown={handleRotationMouseDown}
              title="Rotate Toolbar"
            >
              <RotateCw size={12} className="text-foreground" />
            </div>
            
            {/* Quick Rotation Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-8 left-8 bg-transparent backdrop-blur-sm rounded-lg p-1 shadow-md border border-transparent hover:bg-white/20 transition-colors"
              onClick={handleRotationClick}
              title="Quick Rotate (45° increments)"
            >
              <RotateCw size={12} className="text-foreground" />
            </Button>
          </>
        )}
        
        {/* Main Toolbar */}
        <div className="bg-transparent rounded-2xl shadow-[0_4px_24px_0_rgba(0,0,0,0.12),0_1.5px_4px_0_rgba(0,0,0,0.10)] border border-transparent backdrop-blur-sm">
          <Toolbar {...props} />
        </div>
      </div>
    </div>
  );
}; 