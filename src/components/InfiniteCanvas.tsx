import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CanvasBlock {
  id: string;
  type: 'spreadsheet' | 'chart';
  position: { x: number; y: number };
  size: { width: number; height: number };
  data?: any;
}

interface InfiniteCanvasProps {
  children: React.ReactNode;
  onAddSheet: () => void;
}

export interface InfiniteCanvasHandle {}

export const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(
  ({ children, onAddSheet }, ref) => {
    const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
    const [isPanning, setIsPanning] = useState(false);
    const transformRef = useRef<any>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const spreadsheetRef = useRef<HTMLDivElement>(null);

    const handleWheel = useCallback((ref: any, event: WheelEvent) => {
      // Check if we're hovering over a spreadsheet or scrollable content
      const target = event.target as HTMLElement;
      const isOverSpreadsheet = target.closest('.spreadsheet-container') || 
                                target.closest('.overflow-auto') ||
                                target.closest('[data-scrollable="true"]') ||
                                target.closest('.modern-spreadsheet');
      
      if (isOverSpreadsheet) {
        // Allow normal scrolling, prevent zoom
        event.stopPropagation();
        return;
      }
      
      // Default zoom behavior for canvas - let the library handle it
    }, []);

    const handleAddSheet = () => {
      console.log('Add sheet clicked');
      onAddSheet();
    };

    // Handlers for cursor change
    useEffect(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const handlePointerDown = () => setIsPanning(true);
      const handlePointerUp = () => setIsPanning(false);
      wrapper.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        wrapper.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }, []);

    return (
      <div
        className="w-full h-screen relative overflow-hidden"
        ref={wrapperRef}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* Header with Platform Name */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-neutral-800 dark:to-black border-b border-yellow-200 dark:border-neutral-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleAddSheet}
              className="bg-black hover:bg-neutral-700 text-yellow-100 shadow-lg rounded-full w-10 h-10 p-0 transition-all duration-200 hover:scale-105 dark:bg-yellow-400 dark:text-black dark:hover:bg-yellow-300"
            >
              <Plus size={20} className="text-yellow-100 dark:text-black" />
            </Button>
            
            <h1 className="text-2xl font-bold text-black dark:text-yellow-400 tracking-wide">
              0str1ch
            </h1>
            
            <div className="w-10 h-10"></div> {/* Spacer for center alignment */}
          </div>
        </div>

        {/* Infinite Canvas Container */}
        <div className="pt-16">
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            initialPositionX={0}
            initialPositionY={0}
            minScale={0.3}
            maxScale={3}
            centerOnInit={false}
            limitToBounds={false}
            panning={{ disabled: false }}
            wheel={{ 
              step: 0.1,
              wheelDisabled: false,
              touchPadDisabled: false
            }}
            doubleClick={{ disabled: true }}
            pinch={{ step: 0.1 }}
            onWheel={handleWheel}
          >
            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full"
            >
              <div className="relative" style={{ width: '8000px', height: '6000px' }}>
                {/* Main content positioned in the center of the large canvas */}
                <div 
                  className="absolute modern-spreadsheet"
                  style={{ 
                    left: '1000px', 
                    top: '500px',
                    width: '6000px',
                    height: '4000px'
                  }}
                >
                  {children}
                </div>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>
      </div>
    );
  }
);
