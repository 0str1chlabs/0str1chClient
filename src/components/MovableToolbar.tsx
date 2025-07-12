import { useState, useRef, useEffect } from 'react';
import { Toolbar } from './Toolbar';
import { RotateCw, Move } from 'lucide-react';
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
}

export const MovableToolbar = (props: MovableToolbarProps) => {
  const [position, setPosition] = useState({ x: 24, y: 128 }); // Default position (left-6 top-32)
  const [rotation, setRotation] = useState(0); // Rotation in degrees
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotationStart, setRotationStart] = useState(0);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
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
    e.preventDefault();
    e.stopPropagation();
    setIsRotating(true);
    setRotationStart(rotation);
  };

  // Handle mouse move for dragging and rotation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
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
      
      if (isRotating) {
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

    if (isDragging || isRotating) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isRotating, dragStart, rotation]);

  // Handle rotation button click (cycle through common angles)
  const handleRotationClick = () => {
    const commonAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    const currentIndex = commonAngles.findIndex(angle => Math.abs(angle - rotation) < 5);
    const nextIndex = (currentIndex + 1) % commonAngles.length;
    setRotation(commonAngles[nextIndex]);
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 select-none"
      style={{
        left: position.x,
        top: position.y,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
      }}
      onMouseDown={handleMouseDown}
      data-toolbar-handle="true"
    >
      {/* Toolbar Container with drag handle */}
      <div className="relative">
        {/* Drag Handle */}
        <div 
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-t-lg px-2 py-1 shadow-md border border-gray-200 cursor-move hover:bg-gray-50 transition-colors"
          data-toolbar-handle="true"
        >
          <Move size={12} className="text-gray-600" />
        </div>
        
        {/* Rotation Handle */}
        <div 
          className="absolute -top-8 -right-8 bg-white rounded-lg p-1 shadow-md border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
          onMouseDown={handleRotationMouseDown}
          title="Rotate Toolbar"
        >
          <RotateCw size={12} className="text-gray-600" />
        </div>
        
        {/* Quick Rotation Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-8 left-8 bg-white rounded-lg p-1 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
          onClick={handleRotationClick}
          title="Quick Rotate (45° increments)"
        >
          <RotateCw size={12} className="text-gray-600" />
        </Button>
        
        {/* Main Toolbar */}
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_0_rgba(0,0,0,0.12),0_1.5px_4px_0_rgba(0,0,0,0.10)] border border-gray-200">
          <Toolbar {...props} />
        </div>
      </div>
    </div>
  );
}; 