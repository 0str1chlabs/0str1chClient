
export interface GeminiConfig {
  baseUrl?: string;
}

export interface ChartConfig {
  type: string;
  title: string;
  x_column: string;
  y_column: string;
  chart_purpose?: string;
  aggregation?: string; // 'count', 'sum', 'average'
  data?: any[]; // Backend-provided data
  sql_query?: string;
  x_axis_label?: string;
  y_axis_label?: string;
  description?: string;
  insights?: string;
}

export interface KPIConfig {
  name: string;
  column: string;
  calc: string;
  format: string;
}

export interface GeminiResponse {
  charts: ChartConfig[];
  kpis: KPIConfig[];
}

export interface GeminiError {
  message: string;
  code?: string;
}

class GeminiService {
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    // Use VITE_BACKEND_URL if available, otherwise fallback to localhost for development
    const defaultBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';

    this.config = {
      baseUrl: config.baseUrl || defaultBaseUrl,
      ...config
    };

    console.log('🔧 GeminiService initialized with baseUrl:', this.config.baseUrl);
    console.log('🔧 VITE_BACKEND_URL from env:', import.meta.env.VITE_BACKEND_URL);
  }

  /**
   * Generate chart configs and KPI calculations using Gemini
   * This takes the Mistral schema analysis and creates actionable chart/calculation configs
   */
  async generateChartAndKPIConfigs(
    schemaAnalysis: any, 
    reportTemplate: any
  ): Promise<GeminiResponse> {
    try {
      const prompt = `Create chart configs for React dashboard. Return JSON with 3-6 charts (bar/line/pie/scatter) and KPI cards from the data:

Schema Analysis:
${JSON.stringify(schemaAnalysis, null, 2)}

Report Template:
${JSON.stringify(reportTemplate, null, 2)}

Instructions:
1. Use meaningful column names from the schema analysis
2. Create 3-6 charts that make business sense
3. Generate 3-8 KPI calculations that are relevant
4. Ensure all column references exist in the schema
5. Return valid JSON only

Return JSON format:
{
  "charts": [
    {
      "type": "bar|line|pie|scatter",
      "title": "Chart Title",
      "x_column": "column_name",
      "y_column": "column_name", 
      "chart_purpose": "comparison|trend|distribution|correlation"
    }
  ],
  "kpis": [
    {
      "name": "KPI Name",
      "column": "column_name",
      "calc": "sum|average|count|min|max",
      "format": "number|currency|percentage|decimal"
    }
  ]
}`;

      console.log('🔍 Gemini: Generating chart and KPI configs with prompt:', prompt);
      
      const response = await this.callGeminiAPI(prompt);
      console.log('✅ Gemini: Response received:', response);
      
      // Parse and validate the response
      const parsedConfig = this.parseGeminiResponse(response);
      console.log('✅ Gemini: Parsed config:', parsedConfig);
      
      return parsedConfig;

    } catch (error) {
      console.error('❌ Gemini: Error generating chart and KPI configs:', error);
      throw new Error(`Failed to generate chart and KPI configs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Call AISERVER to generate Gemini chart and KPI configs
   */
  private async callGeminiAPI(prompt: string): Promise<string> {
    try {
      const baseUrl = this.config.baseUrl;

      const response = await fetch(`${baseUrl}/api/ai/gemini/generate-charts-kpis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          schema: prompt // We'll send the full context
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`AISERVER error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('No response received from AISERVER');
      }

      return data.response;

    } catch (error) {
      console.error('❌ AISERVER call failed:', error);
      throw error;
    }
  }

  /**
   * Parse Gemini response to extract structured data
   */
  private parseGeminiResponse(response: string): GeminiResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!parsed.charts || !Array.isArray(parsed.charts) || !parsed.kpis || !Array.isArray(parsed.kpis)) {
        throw new Error('Invalid Gemini response structure: missing charts or kpis arrays');
      }

      // Ensure all required fields are present with defaults
      const validatedCharts = parsed.charts.map((chart: any) => ({
        type: chart.type || 'bar',
        title: chart.title || 'Chart',
        x_column: chart.x_column || 'Unknown',
        y_column: chart.y_column || 'Unknown',
        chart_purpose: chart.chart_purpose || 'comparison'
      }));

      const validatedKPIs = parsed.kpis.map((kpi: any) => ({
        name: kpi.name || 'Unknown KPI',
        column: kpi.column || 'Unknown',
        calc: kpi.calc || 'sum',
        format: kpi.format || 'number'
      }));

      return {
        charts: validatedCharts,
        kpis: validatedKPIs
      };

    } catch (error) {
      console.error('❌ Failed to parse Gemini response:', error);
      console.log('Raw Gemini response:', response);
      
      // Return a fallback response
      return {
        charts: [],
        kpis: []
      };
    }
  }

  /**
   * Test the AISERVER connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const baseUrl = this.config.baseUrl;
      const response = await fetch(`${baseUrl}/health`);
      
      if (response.ok) {
        console.log('✅ AISERVER is accessible');
        return true;
      } else {
        console.log('❌ AISERVER is not responding');
        return false;
      }
    } catch (error) {
      console.error('❌ AISERVER connection test failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const geminiService = new GeminiService({
  baseUrl: import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_AISERVER_URL || 'http://localhost:8090'
});
