import { useState, useRef, useEffect } from 'react';
import { Toolbar } from './Toolbar';
import { RotateCw, Move, Pin, PinOff, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

export const MovableToolbar = (props: MovableToolbarProps) => {
  const [position, setPosition] = useState({ x: 24, y: 128 }); // Default position (left-6 top-32)
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
        
        // Keep toolbar within viewport bounds
        const maxX = window.innerWidth - 56; // toolbar width
        const maxY = window.innerHeight - 400; // approximate toolbar height
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
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
      // When switching to fixed mode, reset position to left side
      setPosition({ x: 24, y: 128 });
      setRotation(0);
    }
  };

  // Fixed position styles
  const fixedStyles = isFixed ? {
    position: 'fixed' as const,
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 50,
  } : {
    position: 'fixed' as const,
    left: position.x,
    top: position.y,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
    zIndex: 50,
  };

  return (
    <div
      ref={toolbarRef}
      className="select-none"
      style={fixedStyles}
      onMouseDown={handleMouseDown}
      data-toolbar-handle="true"
    >
      {/* Toolbar Container with drag handle */}
      <div className="relative">
        {/* Toggle Fixed/Movable Button */}
        <div 
                      className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-t-lg px-2 py-1 shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={toggleFixedMode}
          title={isFixed ? "Make Movable" : "Fix Position"}
        >
                     {isFixed ? <PinOff size={12} className="text-foreground" /> : <Pin size={12} className="text-foreground" />}
        </div>
        
        {/* Rearrange Button */}
        <div 
          className="absolute -top-8 left-16 bg-white dark:bg-gray-800 rounded-t-lg px-2 py-1 shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={props.onRearrange}
          title="Rearrange Layout"
        >
          <LayoutGrid size={12} className="text-foreground" />
        </div>
        
        {/* Drag Handle - only show when not fixed */}
        {!isFixed && (
          <div 
            className="absolute -top-8 -left-8 bg-white dark:bg-gray-800 rounded-lg px-2 py-1 shadow-md border border-gray-200 dark:border-gray-700 cursor-move hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            data-toolbar-handle="true"
          >
                         <Move size={12} className="text-foreground" />
          </div>
        )}
        
        {/* Rotation Handle - only show when not fixed */}
        {!isFixed && (
          <>
            <div 
              className="absolute -top-8 -right-8 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onMouseDown={handleRotationMouseDown}
              title="Rotate Toolbar"
            >
              <RotateCw size={12} className="text-foreground" />
            </div>
            
            {/* Quick Rotation Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-8 left-8 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={handleRotationClick}
              title="Quick Rotate (45° increments)"
            >
              <RotateCw size={12} className="text-foreground" />
            </Button>
          </>
        )}
        
        {/* Main Toolbar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_24px_0_rgba(0,0,0,0.12),0_1.5px_4px_0_rgba(0,0,0,0.10)] border border-gray-200 dark:border-gray-700">
          <Toolbar {...props} />
        </div>
      </div>
    </div>
  );
}; 