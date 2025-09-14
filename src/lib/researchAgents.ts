import { mistralService } from './mistralService';
import { geminiService } from './geminiService';

// Types for the multi-agent system
export interface ResearchPlan {
  queries: string[];
  expectedColumns: string[];
  dataTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'>;
  extractionInstructions: Record<string, string>;
  validationRules: string[];
  researchStrategy: string;
}

export interface ResearchData {
  searchResults: any[];
  detailedContent: any[];
  totalSources: number;
  rawData: any;
}

export interface StructuredSpreadsheetData {
  columns: string[];
  rows: any[][];
  metadata: {
    totalRows: number;
    dataQuality: 'high' | 'medium' | 'low';
    sourceCount: number;
    confidence: number;
  };
}

export interface ResearchSource {
  id: number;
  url: string;
  title: string;
  usedFor: string[];
  relevanceScore: number;
  domain: string;
}

export interface FinalResearchResult {
  spreadsheetData: StructuredSpreadsheetData;
  sources: ResearchSource[];
  researchPlan: ResearchPlan;
  processingTime: number;
  timestamp: string;
}

/**
 * Agent 1: Research Planner (Mistral 7B:instruct)
 * Role: Query strategy and research orchestration
 * Strengths: Fast, cost-effective, good at structured planning
 */
export class ResearchPlanner {
  static async generatePlan(userPrompt: string): Promise<ResearchPlan> {
    const planningPrompt = `
You are a research strategist. The user wants: "${userPrompt}"

Generate a comprehensive research strategy with:

1. 5-8 specific, targeted search queries for web research
2. Expected spreadsheet structure (column names) - MAX 8 columns
3. Data types for each column
4. Data validation criteria
5. Research strategy explanation
6. Specific extraction instructions for each column

Focus on:
- Creating queries that will find diverse, high-quality sources
- Designing columns that capture the most valuable information
- Ensuring data types are appropriate for analysis
- Setting validation rules to ensure data quality
- Providing clear extraction instructions for each column

CRITICAL: You must respond with ONLY valid JSON. Do not include any explanatory text, comments, or additional content. Start your response with { and end with }.

Output ONLY valid JSON in this exact format:
{
  "queries": ["specific query 1", "specific query 2", "specific query 3", "specific query 4", "specific query 5", "specific query 6", "specific query 7", "specific query 8"],
  "expectedColumns": ["Column Name 1", "Column Name 2", "Column Name 3", "Column Name 4", "Column Name 5", "Column Name 6", "Column Name 7", "Column Name 8"],
  "dataTypes": {
    "Column Name 1": "string",
    "Column Name 2": "number", 
    "Column Name 3": "date",
    "Column Name 4": "boolean",
    "Column Name 5": "string",
    "Column Name 6": "number",
    "Column Name 7": "string",
    "Column Name 8": "string"
  },
  "extractionInstructions": {
    "Column Name 1": "Specific instruction on how to extract this data from research results",
    "Column Name 2": "Specific instruction on how to extract this data from research results",
    "Column Name 3": "Specific instruction on how to extract this data from research results",
    "Column Name 4": "Specific instruction on how to extract this data from research results",
    "Column Name 5": "Specific instruction on how to extract this data from research results",
    "Column Name 6": "Specific instruction on how to extract this data from research results",
    "Column Name 7": "Specific instruction on how to extract this data from research results",
    "Column Name 8": "Specific instruction on how to extract this data from research results"
  },
  "validationRules": [
    "Rule 1: Description of validation",
    "Rule 2: Description of validation",
    "Rule 3: Description of validation"
  ],
  "researchStrategy": "Brief explanation of the research approach and expected outcomes"
}
`;

    try {
      const response = await mistralService.callMistralAPI(planningPrompt);
      console.log('🔍 Research Planner Response:', response);
      
      // Extract JSON from response (handle cases where AI returns text with JSON)
      let jsonString = response;
      
      // Try to find JSON object in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
        console.log('📋 Extracted JSON from response:', jsonString);
      }
      
      // Parse the JSON response
      const plan = JSON.parse(jsonString);
      
      // Validate the plan structure
      if (!plan.queries || !plan.expectedColumns || !plan.dataTypes || !plan.extractionInstructions || !plan.validationRules) {
        console.error('❌ Invalid research plan structure:', plan);
        throw new Error('Invalid research plan structure');
      }
      
      console.log('✅ Research plan generated successfully');
      return plan;
    } catch (error) {
      console.error('❌ Research Planner Error:', error);
      
      // Fallback plan
      return {
        queries: [
          `${userPrompt} overview`,
          `${userPrompt} statistics`,
          `${userPrompt} trends`,
          `${userPrompt} analysis`,
          `${userPrompt} data`
        ],
        expectedColumns: ['Name', 'Value', 'Source', 'Date', 'Category', 'Description', 'URL', 'Confidence'],
        dataTypes: {
          'Name': 'string',
          'Value': 'string',
          'Source': 'string',
          'Date': 'date',
          'Category': 'string',
          'Description': 'string',
          'URL': 'string',
          'Confidence': 'number'
        },
        extractionInstructions: {
          'Name': 'Extract the main entity, person, company, or concept name from the content',
          'Value': 'Extract the key metric, statistic, or value associated with the name',
          'Source': 'Extract the source name, organization, or publication from the content',
          'Date': 'Extract dates in YYYY-MM-DD format, use current date if not available',
          'Category': 'Extract or infer the category or type of information',
          'Description': 'Extract a brief description or summary of the information',
          'URL': 'Extract the source URL if available, otherwise use "N/A"',
          'Confidence': 'Assign a confidence score (0-100) based on source reliability and data quality'
        },
        validationRules: [
          'All rows must have at least a Name and Value',
          'URLs must be valid format',
          'Confidence scores must be between 0-100',
          'Dates must be in YYYY-MM-DD format'
        ],
        researchStrategy: `Comprehensive research on "${userPrompt}" using multiple search angles to gather diverse, high-quality data`
      };
    }
  }
}

/**
 * Agent 2: Web Researcher (Tavily)
 * Role: Execute research plan and gather raw data
 * Strengths: Optimized web search, source citations, real-time data
 */
export class WebResearcher {
  static async executeResearch(researchPlan: ResearchPlan): Promise<ResearchData> {
    console.log('🌐 Starting web research with', researchPlan.queries.length, 'queries');
    
    try {
      // Execute multiple concurrent searches
      const searchPromises = researchPlan.queries.map(async (query, index) => {
        console.log(`🔍 Executing query ${index + 1}: "${query}"`);
        
        const response = await fetch('/api/research', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: query,
            searchDepth: 'advanced',
            includeImages: true
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Research query failed: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`Research query failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return await response.json();
      });
      
      const searchResults = await Promise.all(searchPromises);
      console.log('✅ All search queries completed');
      
      // Extract top sources from all results
      const allSources = searchResults.flatMap(result => result.sources || []);
      const topSources = allSources
        .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
        .slice(0, 15); // Top 15 sources to limit data size
      
      // Extract detailed content from top sources (limit content length)
      const detailedContent = topSources.map(source => ({
        url: source.url,
        title: source.title,
        content: source.content ? source.content.substring(0, 2000) : '', // Limit content to 2000 chars
        raw_content: source.raw_content ? source.raw_content.substring(0, 3000) : '', // Limit raw content to 3000 chars
        domain: source.domain,
        relevance_score: source.relevance_score,
        published_date: source.published_date,
        author: source.author,
        category: source.category
      }));
      
      return {
        searchResults,
        detailedContent,
        totalSources: allSources.length,
        rawData: {
          allSources,
          topSources,
          queryCount: researchPlan.queries.length
        }
      };
    } catch (error) {
      console.error('❌ Web Researcher Error:', error);
      throw error;
    }
  }
}

/**
 * Agent 3: Data Structurer (Gemini)
 * Role: Process raw research into structured spreadsheet data
 * Strengths: Advanced reasoning, complex data processing, accuracy
 */
export class DataStructurer {
  static async structureData(
    researchData: ResearchData, 
    researchPlan: ResearchPlan, 
    userPrompt: string
  ): Promise<FinalResearchResult> {
    console.log('🧠 Structuring data with Gemini...');
    
    const structuringPrompt = `
ORIGINAL USER REQUEST: "${userPrompt}"

EXPECTED SPREADSHEET STRUCTURE:
Columns: ${JSON.stringify(researchPlan.expectedColumns)}
Data Types: ${JSON.stringify(researchPlan.dataTypes)}
Validation Rules: ${JSON.stringify(researchPlan.validationRules)}

RAW RESEARCH DATA:
${JSON.stringify(researchData.detailedContent, null, 2)}

SEARCH RESULTS SUMMARY:
Total Sources: ${researchData.totalSources}
Query Count: ${researchData.rawData?.queryCount || 0}

TASK: Create a comprehensive, structured spreadsheet from the research data.

REQUIREMENTS:
1. Extract and structure data into rows matching the expected columns
2. Use the specific extraction instructions for each column
3. Limit data to MAX 20 rows to prevent overflow
4. Include source attribution for each data point
5. Apply data type conversions (string, number, date, boolean)
6. Handle missing data appropriately (use "N/A" or empty string)
7. Calculate confidence scores for data quality
8. Ensure data is accurate and relevant to the original request
9. Focus on quality over quantity - better to have fewer complete rows than many incomplete ones

EXTRACTION INSTRUCTIONS FOR EACH COLUMN:
${Object.entries(researchPlan.extractionInstructions).map(([column, instruction]) => 
  `- ${column}: ${instruction}`
).join('\n')}

OUTPUT FORMAT (JSON only):
{
  "spreadsheetData": {
    "columns": ["Column1", "Column2", "Column3", ...],
    "rows": [
      ["Value1", "Value2", "Value3", ...],
      ["Value4", "Value5", "Value6", ...],
      ...
    ],
    "metadata": {
      "totalRows": 25,
      "dataQuality": "high",
      "sourceCount": 15,
      "confidence": 85
    }
  },
  "sources": [
    {
      "id": 1,
      "url": "https://example.com",
      "title": "Source Title",
      "usedFor": ["row1_col2", "row3_col1"],
      "relevanceScore": 0.95,
      "domain": "example.com"
    }
  ]
}

Focus on creating high-quality, structured data that directly addresses the user's research request.
`;

    try {
      const response = await geminiService.generateResponse(structuringPrompt);
      console.log('🧠 Data Structurer Response:', response);
      
      // Parse the JSON response
      const result = JSON.parse(response);
      
      // Validate the result structure
      if (!result.spreadsheetData || !result.sources) {
        throw new Error('Invalid structured data format');
      }
      
      // Add processing metadata
      const finalResult: FinalResearchResult = {
        ...result,
        researchPlan,
        processingTime: Date.now(),
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Data structuring completed successfully');
      return finalResult;
    } catch (error) {
      console.error('❌ Data Structurer Error:', error);
      
      // Fallback structured data
      return {
        spreadsheetData: {
          columns: researchPlan.expectedColumns,
          rows: [
            ['Research completed', 'Data processing failed', 'N/A', 'N/A', 'Error', 'Please try again', 'N/A', '0'],
            ['Fallback data', 'Limited information', 'N/A', 'N/A', 'Error', 'Structuring failed', 'N/A', '0']
          ],
          metadata: {
            totalRows: 2,
            dataQuality: 'low',
            sourceCount: 0,
            confidence: 0
          }
        },
        sources: [],
        researchPlan,
        processingTime: Date.now(),
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Master Research Orchestrator
 * Coordinates all three agents in sequence
 */
export class ResearchOrchestrator {
  static async executeFullResearch(userPrompt: string): Promise<FinalResearchResult> {
    console.log('🚀 Starting multi-agent research process...');
    const startTime = Date.now();
    
    try {
      // Step 1: Research Planning
      console.log('📋 Step 1: Research Planning...');
      const researchPlan = await ResearchPlanner.generatePlan(userPrompt);
      
      // Step 2: Web Research
      console.log('🌐 Step 2: Web Research...');
      const researchData = await WebResearcher.executeResearch(researchPlan);
      
      // Step 3: Data Structuring
      console.log('🧠 Step 3: Data Structuring...');
      const finalResult = await DataStructurer.structureData(researchData, researchPlan, userPrompt);
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ Multi-agent research completed in ${totalTime}ms`);
      
      return {
        ...finalResult,
        processingTime: totalTime
      };
    } catch (error) {
      console.error('❌ Research Orchestration Error:', error);
      throw error;
    }
  }
}
