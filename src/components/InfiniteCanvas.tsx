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
  onExpandChart?: (chartId: string) => void;
  onShrinkChart?: (chartId: string) => void;
}

export interface InfiniteCanvasHandle {
  zoomIn: (step?: number) => void;
  zoomOut: (step?: number) => void;
  zoomTo: (scale: number, duration?: number) => void;
  centerView: (x: number, y: number, duration?: number) => void;
  fitToView: (duration?: number) => void;
}

export const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(
  ({ children, onAddSheet, uploadButton, zoom, onZoomChange, embeddedCharts = [], onRemoveChart, onExpandChart, onShrinkChart }, ref) => {
    const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
    const [isPanning, setIsPanning] = useState(false);
    const [draggedChart, setDraggedChart] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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

    // Chart dragging handlers
    const handleChartMouseDown = (e: React.MouseEvent, chartId: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      const chart = embeddedCharts.find(c => c.id === chartId);
      if (!chart) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      
      setDraggedChart(chartId);
      setDragOffset({ x: offsetX, y: offsetY });
    };

    const handleChartMouseMove = (e: React.MouseEvent) => {
      if (!draggedChart) return;
      
      e.preventDefault();
      
      const chart = embeddedCharts.find(c => c.id === draggedChart);
      if (!chart) return;
      
      // Calculate new position based on mouse position and offset
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Update chart position
      const updatedCharts = embeddedCharts.map(c => 
        c.id === draggedChart 
          ? { ...c, position: { x: newX, y: newY } }
          : c
      );
      
      // Dispatch custom event to notify parent of chart movement
      window.dispatchEvent(new CustomEvent('chartMoved', {
        detail: { chartId: draggedChart, newPosition: { x: newX, y: newY }, updatedCharts }
      }));
    };

    const handleChartMouseUp = () => {
      setDraggedChart(null);
      setDragOffset({ x: 0, y: 0 });
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

    // Effect to handle chart dragging
    useEffect(() => {
      if (draggedChart) {
        const handleGlobalMouseMove = (e: MouseEvent) => {
          if (!draggedChart) return;
          
          e.preventDefault();
          
          const chart = embeddedCharts.find(c => c.id === draggedChart);
          if (!chart) return;
          
          // Calculate new position based on mouse position and offset
          const newX = e.clientX - dragOffset.x;
          const newY = e.clientY - dragOffset.y;
          
          // Update chart position
          const updatedCharts = embeddedCharts.map(c => 
            c.id === draggedChart 
              ? { ...c, position: { x: newX, y: newY } }
              : c
          );
          
          // Dispatch custom event to notify parent of chart movement
          window.dispatchEvent(new CustomEvent('chartMoved', {
            detail: { chartId: draggedChart, newPosition: { x: newX, y: newY }, updatedCharts }
          }));
        };

        const handleGlobalMouseUp = () => {
          setDraggedChart(null);
          setDragOffset({ x: 0, y: 0 });
        };

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
          document.removeEventListener('mousemove', handleGlobalMouseMove);
          document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
      }
    }, [draggedChart, dragOffset, embeddedCharts]);

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
        <div className="infinite-canvas"
        style={{
          width: '8000px',
          height: '6000px',
          backgroundColor: '#fafafa',
          backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0',
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
              wrapperClass="!w-full !h-full infinite-canvas"
              contentClass="!w-full !h-full infinite-canvas"
            >
              <div
                className={"relative transition-shadow duration-200"}
                style={{
                  width: '8000px',
                  height: '6000px',
                  backgroundColor: '#fafafa',
                  backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0',
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
                    className="absolute chart-block bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 cursor-move select-none flex flex-col"
                    style={{
                      left: chart.position.x,
                      top: chart.position.y,
                      width: chart.size.width,
                      height: chart.size.height,
                      zIndex: 20,
                      background: 'white',
                      backgroundColor: 'white',
                      userSelect: 'none',
                    }}
                    onMouseDown={(e) => handleChartMouseDown(e, chart.id)}
                  >
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-t-lg">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart
                      </span>
                      <div className="flex items-center gap-1">
                        {/* Expand Button */}
                        <button
                          className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent chart dragging
                            if (onExpandChart) {
                              onExpandChart(chart.id);
                            }
                          }}
                          title="Expand chart by 25%"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </button>

                        {/* Shrink Button */}
                        <button
                          className="text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 p-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent chart dragging
                            if (onShrinkChart) {
                              onShrinkChart(chart.id);
                            }
                          }}
                          title="Shrink chart by 20%"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 16v4m0 0h-4m4 0l-5-5M4 8V4m0 0h4M4 4l5 5m11 1v4m0 0h-4m4 0l-5-5M4 16v-4m0 0h4m-4 0l5 5" />
                          </svg>
                        </button>
                        
                        {/* Close Button */}
                        <button
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent chart dragging
                            if (onRemoveChart) {
                              onRemoveChart(chart.id);
                            }
                          }}
                          title="Remove chart"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 flex-1 flex items-center justify-center overflow-hidden" style={{ padding: '12px', minHeight: 0 }}>
                      <div className="w-full h-full" style={{ minHeight: 0 }}>
                        <ChartRenderer
                          data={chart.data}
                          chartSpec={chart.chartSpec}
                          width={chart.size.width - 24}
                          height={chart.size.height - 84}
                          className="w-full h-full"
                        />
                      </div>
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
