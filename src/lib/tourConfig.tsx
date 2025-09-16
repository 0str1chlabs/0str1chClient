import React from 'react';
import { Step } from 'react-joyride';

export interface TourStep extends Step {
  target: string;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto';
  disableBeacon?: boolean;
  hideCloseButton?: boolean;
  hideFooter?: boolean;
  spotlightClicks?: boolean;
  spotlightPadding?: number;
  styles?: {
    options?: {
      primaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
      overlayColor?: string;
      arrowColor?: string;
    };
  };
}

export const tourSteps: TourStep[] = [
  {
    target: '[data-tour="header-brand"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">🏠 Welcome to Ostr1ch</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          This is your AI-powered spreadsheet platform. Let's take a quick tour to show you all the amazing features!
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="header-controls"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">🔧 Canvas Controls</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Use these controls to navigate your spreadsheet:
          <br />• <strong>Zoom In/Out:</strong> Adjust the view
          <br />• <strong>Reset:</strong> Return to default view
          <br />• <strong>Rearrange:</strong> Auto-organize layout
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="upload-button"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">📁 Upload Your Data</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Start by uploading your CSV or Excel files. Click this button to import your data and begin analyzing it with AI.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-pivot-table"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">📊 Pivot Tables & Charts</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Create interactive pivot tables and generate beautiful charts from your data. The AI will suggest the best visualizations for your data.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-sanitize-data"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">🛡️ Sanitize Data</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Click this button to highlight cells with mismatched data types in red. This helps you identify and fix data quality issues by comparing actual values against the AI-inferred column types.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="research-button"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">🔍 Research & Insights</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Get deeper insights by researching industry trends and benchmarks related to your data. This helps you understand how your data compares to industry standards.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="report-generator"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">📋 AI Report Generator</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Generate comprehensive reports with charts, KPIs, and insights. Perfect for presentations and data analysis summaries.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="sheet-tabs"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">📑 Sheet Navigation</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Switch between different sheets in your workbook. Each sheet can be analyzed independently with its own AI insights.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="spreadsheet"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">📊 Interactive Spreadsheet</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Your data is displayed in an interactive spreadsheet. Click on cells to select them, and use the AI tools to analyze specific ranges.
        </p>
      </div>
    ),
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="ai-tools"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">🛠️ AI Analysis Tools</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Use these powerful AI tools to analyze your data:
          <br />• <strong>Column AI:</strong> Analyze entire columns
          <br />• <strong>Row AI:</strong> Analyze specific rows
          <br />• <strong>Sheet AI:</strong> Get insights about your entire dataset
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="ai-assistant"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">🤖 AI Assistant</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Ask questions about your data in natural language. The AI can help you analyze, visualize, and understand your data patterns.
        </p>
      </div>
    ),
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="logout-button"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">🚪 Logout</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Click here to safely log out of your account. Your data will be saved automatically.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="floating-ai-button"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">💬 Quick AI Access</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          This floating button gives you quick access to the AI assistant. Click it to open or close the AI chat panel.
        </p>
      </div>
    ),
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="floating-tour-button"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">🎮 Tour Button</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Need help again? This floating tour button is always available to restart the tour and explore features.
        </p>
      </div>
    ),
    placement: 'left',
    disableBeacon: true,
  },
  // Toolbar Tour Steps
  {
    target: '[data-tour="toolbar-add-sheet"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">📄 Add Sheet</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Create a new sheet to organize your data. Each sheet can contain different datasets and analyses.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-undo"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">↶ Undo</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Undo your last action. Perfect for when you make a mistake or want to revert changes.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-redo"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">↷ Redo</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Redo an action you just undid. Great for toggling between different states.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-text-format"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">🎨 Text Formatting</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Format your text with bold, italic, and underline. Click to see all formatting options.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-text-color"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">🌈 Text Color</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Change the color of your text to make important data stand out.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-align-left"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">⬅️ Align Left</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Align text to the left side of the cell. Great for text content and labels.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-align-center"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">↔️ Align Center</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Center align text in the cell. Perfect for headers and titles.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-align-right"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">➡️ Align Right</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Align text to the right side of the cell. Ideal for numbers and currency values.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-copy"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">📋 Copy</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Copy selected cells to the clipboard. You can then paste them elsewhere.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-paste"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">📄 Paste</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Paste copied content into the selected cells. Works with data from other applications too.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-search"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">🔍 Search</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Search for specific text or values in your spreadsheet. Great for finding data quickly.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbar-functions"]',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">🧮 Functions</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Access spreadsheet functions like SUM, AVERAGE, and more. Build powerful formulas for data analysis.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
];

export const tourOptions = {
  continuous: true,
  showProgress: true,
  showSkipButton: true,
  hideCloseButton: false,
  hideFooter: false,
  disableOverlayClose: true,
  disableScrolling: true, // Prevent automatic scrolling to reduce lag
  scrollToFirstStep: false, // Avoid scrolling to first step
  spotlightClicks: false,
  spotlightPadding: 8,
  styles: {
    options: {
      primaryColor: '#3b82f6', // Blue-500
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      overlayColor: 'rgba(0, 0, 0, 0.7)', // Darker overlay
      arrowColor: '#ffffff',
      zIndex: 9999, // Ensure highest z-index
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)', // Dark overlay
      zIndex: 9998, // Just below the tooltip
    },
    tooltip: {
      zIndex: 9999, // Highest z-index for tooltip
    },
    tooltipContainer: {
      zIndex: 9999, // Highest z-index for container
    },
  },
  locale: {
    back: 'Back',
    close: 'Close',
    last: 'Finish Tour',
    next: 'Next',
    skip: 'Skip Tour',
  },
};

// Dark mode tour options
export const darkTourOptions = {
  ...tourOptions,
  styles: {
    options: {
      primaryColor: '#3b82f6', // Blue-500
      backgroundColor: '#1f2937', // Gray-800
      textColor: '#f9fafb', // Gray-50
      overlayColor: 'rgba(0, 0, 0, 0.8)', // Even darker for dark mode
      arrowColor: '#1f2937',
      zIndex: 9999, // Ensure highest z-index
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)', // Dark overlay for dark mode
      zIndex: 9998, // Just below the tooltip
    },
    tooltip: {
      zIndex: 9999, // Highest z-index for tooltip
    },
    tooltipContainer: {
      zIndex: 9999, // Highest z-index for container
    },
  },
};
