// Mistral AI Service for schema analysis and report generation
export interface MistralConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface SchemaAnalysisRequest {
  schema: any;
  prompt?: string;
}

export interface SchemaAnalysisResponse {
  selected_columns: Array<{
    name: string;
    type: string;
    business_relevance: string;
    report_usage: 'kpi' | 'dimension' | 'metric' | 'trend';
  }>;
  excluded_count: number;
  selection_rationale: string;
}

export interface ReportTemplateResponse {
  report_type: string;
  primary_focus: string;
  kpi_cards: Array<{
    metric: string;
    calculation: string;
    format: string;
  }>;
  chart_suggestions: Array<{
    type: 'bar' | 'line' | 'pie' | 'scatter';
    title: string;
    x_axis: string;
    y_axis: string;
    purpose: string;
  }>;
  report_sections: string[];
}

export interface MistralError {
  error: string;
  details?: any;
}

class MistralService {
  private config: MistralConfig;

  constructor(config: MistralConfig) {
    this.config = config;
  }

  /**
   * Analyze spreadsheet schema using Mistral AI
   * This function sends the schema to Mistral with a prompt to identify business-relevant columns
   */
  async analyzeSchema(schema: any): Promise<SchemaAnalysisResponse> {
    try {
      // Default prompt for schema analysis
      const defaultPrompt = `[INST] Analyze this spreadsheet schema and return only columns essential for business reporting. 

INCLUDE: Revenue metrics, KPIs, dates, geographic/categorical dimensions, performance measures
EXCLUDE: System IDs, metadata, PII, debug fields, high-null columns, constant values

Input: {SCHEMA_JSON}

Output format:
{
  "selected_columns": [
    {"name": "col_name", "type": "data_type", "business_relevance": "reason", "report_usage": "kpi|dimension|metric|trend"}
  ],
  "excluded_count": number,
  "selection_rationale": "summary"
}

Select 5-15 most business-relevant columns only. [/INST]`;

      // Replace placeholder with actual schema
      const prompt = defaultPrompt.replace('{SCHEMA_JSON}', JSON.stringify(schema, null, 2));

      const response = await this.callMistralAPI(prompt);
      
      // Parse the response
      const analysis = this.parseMistralResponse(response);
      
      console.log('✅ Schema analysis completed:', analysis);
      return analysis;
      
    } catch (error) {
      console.error('❌ Error analyzing schema with Mistral:', error);
      throw new Error(`Failed to analyze schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Call local Mistral:instruct API with the given prompt
   */
  async callMistralAPI(prompt: string): Promise<string> {
    try {
      // For local Mistral:instruct, we don't need an API key
      const baseUrl = this.config.baseUrl || 'http://localhost:11434';
      const model = this.config.model || 'mistral:instruct';

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1, // Low temperature for consistent schema analysis
          max_tokens: 2000,
          top_p: 0.9,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Local Mistral error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from local Mistral');
      }

      return content;

    } catch (error) {
      console.error('❌ Local Mistral API call failed:', error);
      throw error;
    }
  }

  /**
   * Parse Mistral API response to extract structured data
   */
  private parseMistralResponse(response: string): SchemaAnalysisResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!parsed.selected_columns || !Array.isArray(parsed.selected_columns)) {
        throw new Error('Invalid response structure: missing selected_columns array');
      }

      // Ensure all required fields are present
      const validatedColumns = parsed.selected_columns.map((col: any) => ({
        name: col.name || 'Unknown',
        type: col.type || 'Unknown',
        business_relevance: col.business_relevance || 'Not specified',
        report_usage: col.report_usage || 'metric'
      }));

      return {
        selected_columns: validatedColumns,
        excluded_count: parsed.excluded_count || 0,
        selection_rationale: parsed.selection_rationale || 'Analysis completed'
      };

    } catch (error) {
      console.error('❌ Failed to parse Mistral response:', error);
      console.log('Raw response:', response);
      
      // Return a fallback response
      return {
        selected_columns: [],
        excluded_count: 0,
        selection_rationale: 'Failed to parse AI response - using fallback analysis'
      };
    }
  }

  /**
   * Parse report template response to extract structured data
   */
  private parseReportTemplateResponse(response: string): ReportTemplateResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in template response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!parsed.report_type || !parsed.kpi_cards || !parsed.chart_suggestions) {
        throw new Error('Invalid template response structure: missing required fields');
      }

      // Ensure all required fields are present with defaults
      return {
        report_type: parsed.report_type || 'OPERATIONS',
        primary_focus: parsed.primary_focus || 'General business analysis',
        kpi_cards: Array.isArray(parsed.kpi_cards) ? parsed.kpi_cards.map((kpi: any) => ({
          metric: kpi.metric || 'Unknown',
          calculation: kpi.calculation || 'sum',
          format: kpi.format || 'number'
        })) : [],
        chart_suggestions: Array.isArray(parsed.chart_suggestions) ? parsed.chart_suggestions.map((chart: any) => ({
          type: chart.type || 'bar',
          title: chart.title || 'Chart',
          x_axis: chart.x_axis || 'Unknown',
          y_axis: chart.y_axis || 'Unknown',
          purpose: chart.purpose || 'comparison'
        })) : [],
        report_sections: Array.isArray(parsed.report_sections) ? parsed.report_sections : ['executive_summary']
      };

    } catch (error) {
      console.error('❌ Failed to parse report template response:', error);
      console.log('Raw template response:', response);
      
      // Return a fallback response
      return {
        report_type: 'OPERATIONS',
        primary_focus: 'General business analysis',
        kpi_cards: [],
        chart_suggestions: [],
        report_sections: ['executive_summary']
      };
      }
    }

  /**
   * Generate a comprehensive report prompt based on the analyzed schema
   */
  async generateReportPrompt(schemaAnalysis: SchemaAnalysisResponse, category?: string): Promise<string> {
    try {
      const categoryContext = category ? `Focus on ${category.toLowerCase()} analysis and metrics.` : '';
      
      const prompt = `[INST] Based on the following schema analysis, generate a comprehensive business report:

${categoryContext}

Schema Analysis:
- Selected Columns: ${schemaAnalysis.selected_columns.map(col => `${col.name} (${col.type}) - ${col.business_relevance}`).join(', ')}
- Excluded Count: ${schemaAnalysis.excluded_count}
- Rationale: ${schemaAnalysis.selection_rationale}

Generate a report that includes:
1. Executive Summary
2. Key Performance Indicators (KPIs)
3. Data Analysis and Insights
4. Recommendations
5. Visualizations needed

Focus on the selected columns and provide actionable business insights. [/INST]`;

      return prompt;

    } catch (error) {
      console.error('❌ Error generating report prompt:', error);
      throw new Error(`Failed to generate report prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a detailed report template based on the analyzed schema
   * This creates the structure for calculations and visualizations
   */
  async generateReportTemplate(schemaAnalysis: SchemaAnalysisResponse): Promise<ReportTemplateResponse> {
    try {
      const reportTemplatePrompt = `[INST] Based on these analyzed columns, determine the optimal report structure and visualizations:

Column Analysis:
${JSON.stringify(schemaAnalysis, null, 2)}

Determine:
1. Report type and primary focus
2. Key metrics to highlight  
3. Best chart types for each data combination
4. Report sections to include

Return JSON format:
{
  "report_type": "HR_ANALYTICS|FINANCIAL|SALES|MARKETING|OPERATIONS",
  "primary_focus": "description",
  "kpi_cards": [
    {"metric": "Annual Salary", "calculation": "average", "format": "currency"}
  ],
  "chart_suggestions": [
    {
      "type": "bar|line|pie|scatter", 
      "title": "chart_name",
      "x_axis": "column_name",
      "y_axis": "column_name", 
      "purpose": "comparison|trend|distribution"
    }
  ],
  "report_sections": ["executive_summary", "detailed_analysis", "demographics"]
}
[/INST]`;

      console.log('🔍 Generating report template with prompt:', reportTemplatePrompt);
      
      const response = await this.callMistralAPI(reportTemplatePrompt);
      console.log('✅ Report template generated:', response);
      
      // Parse and validate the response
      const parsedTemplate = this.parseReportTemplateResponse(response);
      console.log('✅ Parsed report template:', parsedTemplate);
      
      return parsedTemplate;

    } catch (error) {
      console.error('❌ Error generating report template:', error);
      throw new Error(`Failed to generate report template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test the local Mistral:instruct connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test if the local Ollama server is running
      const baseUrl = this.config.baseUrl || 'http://localhost:11434';
      const response = await fetch(`${baseUrl}/v1/models`);
      
      if (response.ok) {
        console.log('✅ Local Mistral:instruct server is running');
        return true;
      } else {
        console.log('❌ Local Mistral:instruct server is not responding');
        return false;
      }
    } catch (error) {
      console.error('❌ Local Mistral:instruct connection test failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const mistralService = new MistralService({
  apiKey: '', // No API key needed for local Mistral:instruct
  model: 'mistral:instruct',
  baseUrl: import.meta.env.VITE_MISTRAL_BASE_URL || 'http://localhost:11434'
});

export default MistralService;
