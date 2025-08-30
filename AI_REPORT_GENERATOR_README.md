# AI-Powered Report Generator

This feature integrates local Mistral:instruct (via Ollama) to automatically analyze spreadsheet schemas and generate intelligent business reports.

## Features

### 1. Schema Analysis
- **Automatic Schema Extraction**: Automatically analyzes your spreadsheet structure
- **Column Classification**: Identifies data types (numeric, date, text, boolean)
- **Business Relevance Assessment**: Scores columns based on business importance
- **Data Quality Metrics**: Calculates completeness, consistency, and accuracy

### 2. AI-Powered Column Selection
- **Smart Filtering**: Uses local Mistral:instruct to identify the most business-relevant columns
- **KPI Identification**: Automatically detects revenue metrics, KPIs, and performance measures
- **Exclusion Logic**: Filters out system IDs, metadata, PII, and debug fields
- **Usage Classification**: Categorizes columns as KPI, dimension, metric, or trend

### 3. Report Template Generation
- **Two-Stage AI Analysis**: First analyzes schema, then generates detailed report template
- **KPI Card Definitions**: Specifies metrics, calculations, and formatting for each KPI
- **Chart Recommendations**: Suggests optimal chart types and axis configurations
- **Report Structure**: Defines report type, focus areas, and section organization

### 4. Intelligent Report Generation
- **Context-Aware Prompts**: Generates prompts based on analyzed schema
- **Business Insights**: Creates executive summaries and actionable recommendations
- **Visualization Suggestions**: Recommends appropriate charts and graphs
- **Industry-Specific Analysis**: Adapts analysis based on data characteristics

## Setup

### 1. Install Ollama
1. Download and install [Ollama](https://ollama.ai/) for your operating system
2. Pull the Mistral:instruct model: `ollama pull mistral:instruct`
3. Start the Ollama service: `ollama serve`

### 2. Environment Configuration
Add the following variable to your `.env` file (optional):

```bash
# Local Mistral:instruct Configuration
# Optional: Override default localhost:11434 if your Ollama server runs on a different port
VITE_MISTRAL_BASE_URL=http://localhost:11434
```

## Usage

### 1. Access the AI Report Generator
1. Click the **"AI Report"** button (purple button with brain icon) in the top toolbar
2. The AI Report Generator popup will open

### 2. Two-Stage AI Analysis Workflow
1. **Schema Overview**: View basic statistics about your sheet
2. **Stage 1 - Schema Analysis**: Click "Start Two-Stage Analysis" to begin AI processing
3. **Stage 2 - Template Generation**: Automatically generates detailed report template with KPI cards and chart suggestions
4. **Review Results**: Examine selected columns, exclusion rationale, and generated template
5. **Detailed View**: Click "Show Detailed Schema" for comprehensive analysis

### 3. Report Generation
1. **Generate Report**: Click "Generate AI Report" after template generation (optional Stage 3)
2. **Review Output**: Read the AI-generated business report
3. **Copy Results**: Use copy buttons to save analysis, templates, and reports

## Technical Details

### Architecture
- **Frontend**: React component with TypeScript
- **AI Service**: MistralService class for API integration
- **Schema Utils**: Utilities for spreadsheet analysis
- **State Management**: Local React state with proper cleanup

### API Integration
- **Local Mistral:instruct**: Uses Ollama's local API endpoint
- **Prompt Engineering**: Structured prompts for consistent results
- **Error Handling**: Comprehensive error handling and user feedback
- **Local Processing**: No rate limits or API costs

### Data Processing
- **Schema Extraction**: Analyzes cell data and structure
- **Type Detection**: Automatic data type identification
- **Quality Metrics**: Calculates data completeness and consistency
- **Business Logic**: Applies domain-specific relevance scoring

## Example Output

### Stage 1: Schema Analysis Result
```json
{
  "selected_columns": [
    {
      "name": "Revenue",
      "type": "numeric",
      "business_relevance": "Primary KPI for business performance",
      "report_usage": "kpi"
    },
    {
      "name": "Date",
      "type": "date",
      "business_relevance": "Temporal dimension for trend analysis",
      "report_usage": "dimension"
    }
  ],
  "excluded_count": 8,
  "selection_rationale": "Selected 5 most business-relevant columns focusing on financial metrics and temporal dimensions"
}
```

### Stage 2: Report Template Result
```json
{
  "report_type": "FINANCIAL",
  "primary_focus": "Revenue performance analysis with regional and temporal insights",
  "kpi_cards": [
    {
      "metric": "Total Revenue",
      "calculation": "sum",
      "format": "currency"
    },
    {
      "metric": "Average Revenue per Transaction",
      "calculation": "average",
      "format": "currency"
    }
  ],
  "chart_suggestions": [
    {
      "type": "line",
      "title": "Revenue Trends Over Time",
      "x_axis": "Date",
      "y_axis": "Revenue",
      "purpose": "trend"
    },
    {
      "type": "bar",
      "title": "Revenue by Region",
      "x_axis": "Region",
      "y_axis": "Revenue",
      "purpose": "comparison"
    }
  ],
  "report_sections": ["executive_summary", "revenue_analysis", "regional_insights", "trends_and_forecasting"]
}
```

### Generated Report
The AI generates comprehensive business reports including:
- Executive Summary
- Key Performance Indicators
- Data Analysis and Insights
- Recommendations
- Visualization suggestions

## Two-Stage Process Details

### Stage 1: Schema Analysis
- **Input**: Raw spreadsheet data and structure
- **Process**: Mistral:instruct analyzes column relevance and business importance
- **Output**: Filtered list of business-relevant columns with usage classifications

### Stage 2: Report Template Generation
- **Input**: Analyzed schema from Stage 1
- **Process**: Mistral:instruct creates detailed report structure with KPIs and charts
- **Output**: Structured template with report type, KPI cards, chart suggestions, and sections

### Stage 3: Report Generation (Optional)
- **Input**: Schema analysis and report template
- **Process**: Mistral:instruct generates comprehensive business report
- **Output**: Human-readable report with insights and recommendations

## Troubleshooting

### Common Issues

1. **Ollama Not Running**
   - Ensure Ollama is installed and running: `ollama serve`
   - Verify the mistral:instruct model is pulled: `ollama list`
   - Check if Ollama is accessible at http://localhost:11434

2. **Connection Issues**
   - Check if Ollama service is running on the correct port
   - Verify the mistral:instruct model is available
   - Ensure no firewall is blocking localhost connections

3. **Schema Extraction Errors**
   - Ensure spreadsheet has data
   - Check for valid cell structure
   - Verify sheet object is properly initialized

### Debug Information
- Check browser console for detailed logs
- Look for "📊", "🔍", "✅", and "❌" emoji indicators
- Review network tab for API call details

## Performance Considerations

- **Schema Analysis**: Typically completes in 2-5 seconds
- **Report Generation**: Usually takes 5-15 seconds (depends on local hardware)
- **Large Sheets**: Performance scales with data size and local GPU/CPU
- **Local Processing**: No external API delays or rate limits

## Future Enhancements

- **Custom Prompts**: Allow users to modify AI prompts
- **Batch Processing**: Process multiple sheets simultaneously
- **Template Library**: Pre-built report templates
- **Export Options**: PDF, Word, and PowerPoint export
- **Collaboration**: Share and collaborate on AI reports

## Support

For technical support or feature requests:
1. Check the browser console for error messages
2. Review the troubleshooting section above
3. Ensure Ollama is running with mistral:instruct model
4. Verify localhost:11434 is accessible

## License

This feature is part of the Sheet Scribe AI Lab project and follows the same licensing terms.
