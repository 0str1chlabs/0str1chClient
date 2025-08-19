import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Plus, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChartRenderer } from './ChartRenderer';

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
  embeddedCharts?: Array<{
    id: string;
    type: string;
    data: any;
    chartSpec: any;
    position: { x: number; y: number };
    size: { width: number; height: number };
  }>;
  onRemoveChart?: (chartId: string) => void;
}

export interface InfiniteCanvasHandle {
  zoomIn: (step?: number) => void;
  zoomOut: (step?: number) => void;
  zoomTo: (scale: number, duration?: number) => void;
  centerView: (x: number, y: number, duration?: number) => void;
  fitToView: (duration?: number) => void;
}

export const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(
  ({ children, onAddSheet, uploadButton, zoom, onZoomChange, embeddedCharts = [], onRemoveChart }, ref) => {
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
          try {
            // Use the correct method from react-zoom-pan-pinch
            if (transformRef.current.zoomTo) {
              transformRef.current.zoomTo(scale, duration);
            } else if (transformRef.current.setTransform) {
              // Fallback: use setTransform with current position
              const currentState = transformRef.current.state;
              transformRef.current.setTransform(
                currentState.positionX,
                currentState.positionY,
                scale,
                duration
              );
            } else if (transformRef.current.instance) {
              // Final fallback: use the instance directly
              transformRef.current.instance.zoomTo(scale, duration);
            }
          } catch (error) {
            console.warn('Error in zoomTo:', error);
          }
        }
      },
      centerView: (x: number, y: number, duration = 300) => {
        if (transformRef.current) {
          try {
            // Try multiple methods to center the view
            if (transformRef.current.centerOn) {
              // Primary method: use centerOn
              transformRef.current.centerOn(x, y, duration);
            } else if (transformRef.current.setTransform) {
              // Fallback: use setTransform to center on coordinates
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              
              // Calculate the position to center the target point
              const centerX = -(x - viewportWidth / 2);
              const centerY = -(y - viewportHeight / 2);
              
              // Get current scale
              const currentScale = transformRef.current.state?.scale || 1;
              
              transformRef.current.setTransform(centerX, centerY, currentScale, duration);
            } else if (transformRef.current.instance) {
              // Final fallback: try instance methods
              if (transformRef.current.instance.centerOn) {
                transformRef.current.instance.centerOn(x, y, duration);
              }
            }
          } catch (error) {
            console.warn('Error centering view:', error);
          }
        }
      },
      
      // Method to fit all content in the viewport
      fitToView: (duration = 500) => {
        if (transformRef.current) {
          try {
            // Try to use the library's built-in fit to view method
            if (transformRef.current.fitToView) {
              transformRef.current.fitToView(duration);
            } else if (transformRef.current.instance && transformRef.current.instance.fitToView) {
              transformRef.current.instance.fitToView(duration);
            } else {
              // Fallback: reset to initial state
              transformRef.current.resetTransform(duration);
            }
          } catch (error) {
            console.warn('Error fitting to view:', error);
            // Final fallback: reset transform
            try {
              if (transformRef.current.resetTransform) {
                transformRef.current.resetTransform(duration);
              }
            } catch (resetError) {
              console.warn('Reset transform also failed:', resetError);
            }
          }
        }
      }
    }), []);

    return (
      <div
        className="w-full h-full relative overflow-hidden"
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
                    width: '100%',
                    height: '100%'
                  }}
                >
                  {children}
                </div>
                
                {/* Embedded Charts */}
                {embeddedCharts.map((chart) => (
                  <div
                    key={chart.id}
                    className="absolute chart-block bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                    style={{
                      left: chart.position.x,
                      top: chart.position.y,
                      width: chart.size.width,
                      height: chart.size.height,
                      zIndex: 20
                    }}
                  >
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart
                      </span>
                      <button
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => {
                          if (onRemoveChart) {
                            onRemoveChart(chart.id);
                          }
                        }}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-3">
                      <ChartRenderer
                        data={chart.data}
                        chartSpec={chart.chartSpec}
                        width={chart.size.width - 20}
                        height={chart.size.height - 80}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                ))}
                
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
