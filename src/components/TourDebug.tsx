import React, { useEffect } from 'react';
import { useTour } from './TourProvider';

export const TourDebug: React.FC = () => {
  const { isRunning } = useTour();

  useEffect(() => {
    if (isRunning) {
      console.log('🔍 Tour Debug - Checking for target elements:');
      
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
        console.log(`Target ${target}:`, element ? '✅ Found' : '❌ Not found', element);
      });
    }
  }, [isRunning]);

  return null; // This component doesn't render anything
};
