import React from 'react';
import { Button } from '@/components/ui/button';
import { TourButton } from './TourButton';
import { useTour } from './TourProvider';
import { resetTourState, getTourStats } from '@/lib/tourUtils';
import { Play, RotateCcw, Info } from 'lucide-react';

export const TourDemo: React.FC = () => {
  const { isRunning, hasCompletedTour } = useTour();
  const stats = getTourStats();

  const handleResetTour = () => {
    resetTourState();
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Info className="h-6 w-6" />
          Tour Demo & Controls
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Tour Status</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Running:</strong> {isRunning ? 'Yes' : 'No'}</p>
                <p><strong>Completed:</strong> {hasCompletedTour ? 'Yes' : 'No'}</p>
                <p><strong>Is New User:</strong> {stats.isNew ? 'Yes' : 'No'}</p>
                <p><strong>Is First Time Signup:</strong> {stats.isFirstTime ? 'Yes' : 'No'}</p>
                <p><strong>User ID:</strong> {stats.userId || 'None'}</p>
                <p><strong>Should Show:</strong> {stats.shouldShowTour ? 'Yes' : 'No'}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Tour Stats</h3>
              <div className="space-y-1 text-sm">
                <p><strong>First Visit:</strong> {stats.firstVisit ? stats.firstVisit.toLocaleString() : 'Never'}</p>
                <p><strong>Has Dismissed:</strong> {stats.hasDismissed ? 'Yes' : 'No'}</p>
                <p><strong>Has Completed:</strong> {stats.hasCompleted ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <TourButton variant="default" size="default" />
            <TourButton variant="outline" size="default" showReset />
            
            <Button
              onClick={handleResetTour}
              variant="destructive"
              size="default"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Tour State
            </Button>
            
            <Button
              onClick={() => {
                console.log('🔍 Checking tour target elements:');
                    const targets = [
                      '[data-tour="header-brand"]',
                      '[data-tour="header-controls"]',
                      '[data-tour="upload-button"]',
                      '[data-tour="research-button"]',
                      '[data-tour="report-generator"]',
                      '[data-tour="sheet-tabs"]',
                      '[data-tour="spreadsheet"]',
                      '[data-tour="ai-tools"]',
                      '[data-tour="ai-assistant"]',
                      '[data-tour="logout-button"]',
                      '[data-tour="floating-ai-button"]',
                      '[data-tour="floating-tour-button"]',
                      // Toolbar targets
                      '[data-tour="toolbar-add-sheet"]',
                      '[data-tour="toolbar-undo"]',
                      '[data-tour="toolbar-redo"]',
                      '[data-tour="toolbar-text-format"]',
                      '[data-tour="toolbar-text-color"]',
                      '[data-tour="toolbar-align-left"]',
                      '[data-tour="toolbar-align-center"]',
                      '[data-tour="toolbar-align-right"]',
                      '[data-tour="toolbar-copy"]',
                      '[data-tour="toolbar-paste"]',
                      '[data-tour="toolbar-search"]',
                      '[data-tour="toolbar-functions"]',
                      '[data-tour="toolbar-pivot-table"]'
                    ];
                targets.forEach(target => {
                  const element = document.querySelector(target);
                  console.log(`${target}:`, element ? '✅ Found' : '❌ Not found');
                });
              }}
              variant="secondary"
              size="default"
              className="flex items-center gap-2"
            >
              <Info className="h-4 w-4" />
              Check Targets
            </Button>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How to Test the Tour:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>Click "Reset Tour State" to clear all tour data</li>
              <li>Refresh the page - the tour should start automatically</li>
              <li>Or click "Take Tour" to start manually</li>
              <li>Use "Skip Tour" or "Next" buttons to navigate</li>
              <li>Complete the tour to mark it as finished</li>
            </ol>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              Tour Features:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
              <li>Automatic start for new users</li>
              <li>Skip and Next navigation buttons</li>
              <li>Progress indicator</li>
              <li>Dark mode support</li>
              <li>Persistent completion tracking</li>
              <li>Responsive design</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
