import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Plus, FileSpreadsheet } from 'lucide-react';
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
  uploadButton?: React.ReactNode;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
}

export interface InfiniteCanvasHandle {
  zoomIn: (step?: number) => void;
  zoomOut: (step?: number) => void;
  zoomTo: (scale: number, duration?: number) => void;
  centerView: (x: number, y: number, duration?: number) => void;
}

export const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(
  ({ children, onAddSheet, uploadButton, zoom, onZoomChange }, ref) => {
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
                                target.closest('.modern-spreadsheet') ||
                                target.closest('.ai-assistant') ||
                                target.closest('.toolbar') ||
                                target.closest('.chart-block');
      
      if (isOverSpreadsheet) {
        // Allow normal scrolling, prevent zoom
        event.stopPropagation();
        return false; // Prevent zoom
      }
      
      // Default zoom behavior for canvas - let the library handle it
      return true;
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

    // Effect to handle zoom changes from parent
    useEffect(() => {
      if (transformRef.current && typeof zoom === 'number') {
        try {
          // Use zoomTo method to set the exact zoom level
          transformRef.current.zoomTo(zoom, 300);
        } catch (error) {
          console.warn('Error setting zoom:', error);
        }
      }
    }, [zoom]);

    // Expose transform methods to parent via ref
    useImperativeHandle(ref, () => ({
      zoomIn: (step = 0.1) => {
        if (transformRef.current) {
          transformRef.current.zoomIn(step);
        }
      },
      zoomOut: (step = 0.1) => {
        if (transformRef.current) {
          transformRef.current.zoomOut(step);
        }
      },
      zoomTo: (scale: number, duration = 300) => {
        if (transformRef.current) {
          transformRef.current.zoomTo(scale, duration);
        }
      },
      centerView: (x: number, y: number, duration = 300) => {
        if (transformRef.current) {
          try {
            // Use the correct method to center the view on specific coordinates
            // The library expects the center point in the transformed coordinate system
            if (transformRef.current.setTransform) {
              // Calculate the center position relative to the viewport
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              
              // Convert the target coordinates to the library's coordinate system
              const centerX = -(x + viewportWidth / 2);
              const centerY = -(y + viewportHeight / 2);
              
              transformRef.current.setTransform(centerX, centerY, 1, duration);
            } else if (transformRef.current.centerOn) {
              // Fallback to centerOn if setTransform is not available
              transformRef.current.centerOn(x, y, duration);
            }
          } catch (error) {
            console.warn('Error centering view:', error);
            // Final fallback: try to use the instance methods directly
            try {
              if (transformRef.current.instance) {
                transformRef.current.instance.setTransform(x, y, 1, duration);
              }
            } catch (fallbackError) {
              console.warn('Fallback centering also failed:', fallbackError);
            }
          }
        }
      }
    }), []);

    return (
      <div
        className="w-full h-screen relative overflow-hidden"
        ref={wrapperRef}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* Infinite Canvas Container */}
        <div className=""
        style={{
          width: '8000px',
          height: '6000px',
          backgroundColor: 'hsl(var(--background))',
          backgroundImage: 'radial-gradient(hsla(var(--foreground), 0.1) 2px, transparent 2px)',
          backgroundSize: '24px 24px',
        }}>
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            initialPositionX={0}
            initialPositionY={0}
            minScale={0.3}
            maxScale={3}
            centerOnInit={true}
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
            onZoom={ref => {
              if (typeof onZoomChange === 'function') {
                onZoomChange(ref.state.scale);
              }
            }}
          >
            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full"
            >
              <div
                className={"relative transition-shadow duration-200"}
                style={{
                  width: '8000px',
                  height: '6000px',
                  backgroundColor: 'hsl(var(--background))',
                  backgroundImage: 'radial-gradient(hsla(var(--foreground), 0.1) 2px, transparent 2px)',
                  backgroundSize: '24px 24px',
                }}
              >
                {/* Main content positioned in the top left of the large canvas */}
                <div 
                  className="absolute modern-spreadsheet"
                  style={{ 
                    left: 0, 
                    top: 0,
                    width: '6000px',
                    height: '4000px'
                  }}
                >
                  {children}
                </div>
                {/* Placeholder if no children */}
                {(!children || (Array.isArray(children) && children.length === 0)) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                    <FileSpreadsheet size={64} className="text-muted-foreground mb-4 opacity-60" />
                    <div className="text-lg font-semibold text-muted-foreground opacity-70">Drag sheets or charts here</div>
                  </div>
                )}
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>
      </div>
    );
  }
);
