# Interactive Onboarding Tour System

This document describes the interactive onboarding tour system implemented for the Sheet Scribe AI platform, similar to game tutorials with highlighted elements and explanatory banners.

## 🎯 Features

- **Interactive Tour**: Step-by-step guided tour with highlighted elements
- **Skip & Next Navigation**: Users can skip the entire tour or navigate step by step
- **Automatic Start**: Tour automatically starts for new users
- **Progress Indicator**: Shows current step and total steps
- **Dark Mode Support**: Tour adapts to light/dark theme
- **Persistent Tracking**: Remembers if user has completed the tour
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### For New Users
The tour will automatically start when:
1. A user visits the platform for the first time
2. They haven't completed the tour before
3. They haven't dismissed the tour

### For Existing Users
Users can manually start the tour by:
1. Clicking the "Take Tour" button in the header
2. Clicking the floating green tour button (bottom right)
3. Visiting `/tour-demo` for testing and controls

## 🎮 Tour Steps

The tour covers these key platform features:

1. **📁 Upload Your Data** - CSV/Excel file upload functionality
2. **🤖 AI Assistant** - Natural language data analysis
3. **📊 Interactive Spreadsheet** - Data manipulation and selection
4. **🛠️ AI Analysis Tools** - Column, Row, and Sheet-level AI tools
5. **📈 Create Charts** - Data visualization and pivot tables
6. **🔍 Research & Insights** - Industry research and benchmarking
7. **📋 AI Report Generator** - Comprehensive report generation
8. **📑 Multiple Sheets** - Sheet management and switching

## 🛠️ Technical Implementation

### Components

- **`TourProvider`**: Main context provider that manages tour state
- **`TourButton`**: Reusable button component for starting tours
- **`TourDemo`**: Demo page for testing and debugging

### Key Files

- `src/lib/tourConfig.ts` - Tour step definitions and styling
- `src/lib/tourUtils.ts` - Utility functions for tour management
- `src/components/TourProvider.tsx` - Main tour context and logic
- `src/components/TourButton.tsx` - Tour trigger buttons

### Data Attributes

Tour steps target elements using `data-tour` attributes:
- `data-tour="upload-button"` - Upload CSV button
- `data-tour="ai-assistant"` - AI chat interface
- `data-tour="spreadsheet"` - Main spreadsheet component
- `data-tour="ai-tools"` - AI analysis toolbar
- `data-tour="chart-button"` - Chart generation button
- `data-tour="research-button"` - Research modal button
- `data-tour="report-generator"` - AI report button
- `data-tour="sheet-selector"` - Sheet selection modal

## 🎨 Customization

### Adding New Tour Steps

1. Add a new step to `tourSteps` array in `src/lib/tourConfig.ts`:
```typescript
{
  target: '[data-tour="your-element"]',
  content: (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">Your Step Title</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Your step description here.
      </p>
    </div>
  ),
  placement: 'bottom',
  disableBeacon: true,
}
```

2. Add the corresponding `data-tour` attribute to your component:
```tsx
<YourComponent data-tour="your-element" />
```

### Styling

Tour appearance can be customized in `tourConfig.ts`:
- **Light Mode**: `tourOptions.styles.options`
- **Dark Mode**: `darkTourOptions.styles.options`

### Tour Behavior

Modify tour behavior in `TourProvider.tsx`:
- Auto-start delay: Change timeout in `useEffect`
- Step navigation: Modify `handleJoyrideCallback`
- Completion tracking: Update `markTourCompleted` logic

## 🧪 Testing

### Tour Demo Page
Visit `/tour-demo` to:
- View tour status and statistics
- Test tour functionality
- Reset tour state for testing
- Debug tour behavior

### Manual Testing
1. Open browser dev tools
2. Run `localStorage.clear()` to reset all data
3. Refresh the page - tour should start automatically
4. Or use the "Reset Tour State" button on the demo page

### Automated Testing
```typescript
import { resetTourState, shouldShowTourAutomatically } from '@/lib/tourUtils';

// Reset tour state
resetTourState();

// Check if tour should show
const shouldShow = shouldShowTourAutomatically();
```

## 📱 Mobile Support

The tour is fully responsive and works on:
- Desktop browsers
- Tablet devices
- Mobile phones
- Touch interfaces

## 🔧 Troubleshooting

### Tour Not Starting
1. Check if user has completed tour: `localStorage.getItem('tour-completed')`
2. Verify new user flag: `localStorage.getItem('is-new-user')`
3. Check browser console for errors
4. Ensure all required data attributes are present

### Elements Not Highlighting
1. Verify `data-tour` attributes are correctly set
2. Check if elements are visible in DOM
3. Ensure elements aren't hidden by CSS
4. Test with tour demo page

### Styling Issues
1. Check dark/light mode theme switching
2. Verify CSS custom properties are loaded
3. Test with different screen sizes
4. Check for CSS conflicts

## 🎯 Best Practices

1. **Keep Steps Short**: Each step should focus on one feature
2. **Use Clear Language**: Write descriptive, user-friendly content
3. **Test Thoroughly**: Test on different devices and browsers
4. **Monitor Performance**: Ensure tour doesn't impact app performance
5. **Gather Feedback**: Collect user feedback on tour effectiveness

## 📊 Analytics

Track tour effectiveness with:
```typescript
import { getTourStats } from '@/lib/tourUtils';

const stats = getTourStats();
console.log('Tour completion rate:', stats.hasCompleted);
console.log('First visit date:', stats.firstVisit);
```

## 🔄 Future Enhancements

Potential improvements:
- **Conditional Steps**: Show different steps based on user data
- **Interactive Elements**: Allow users to interact with highlighted elements
- **Video Integration**: Add video explanations for complex features
- **Multi-language Support**: Localize tour content
- **A/B Testing**: Test different tour variations
- **Analytics Integration**: Track tour completion and drop-off rates
