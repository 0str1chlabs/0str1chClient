// Test script for local Mistral:instruct integration
// Run this with: node test-mistral-integration.js

// Mock environment variables for testing
process.env.VITE_MISTRAL_BASE_URL = process.env.VITE_MISTRAL_BASE_URL || 'http://localhost:11434';

// Mock fetch for Node.js environment
global.fetch = require('node-fetch');

// Test schema data
const testSchema = {
  sheet_name: "Sales Data",
  total_rows: 1000,
  total_columns: 8,
  columns: [
    {
      name: "Date",
      letter: "A",
      data_type: "date",
      business_relevance: "high",
      sample_values: ["2024-01-01", "2024-01-02", "2024-01-03"],
      null_percentage: 0,
      unique_percentage: 100,
      has_formulas: false
    },
    {
      name: "Revenue",
      letter: "B",
      data_type: "number",
      business_relevance: "high",
      sample_values: ["1000", "1500", "2000"],
      null_percentage: 5,
      unique_percentage: 95,
      has_formulas: false
    },
    {
      name: "Customer_ID",
      letter: "C",
      data_type: "string",
      business_relevance: "medium",
      sample_values: ["C001", "C002", "C003"],
      null_percentage: 0,
      unique_percentage: 100,
      has_formulas: false
    },
    {
      name: "Product_Category",
      letter: "D",
      data_type: "string",
      business_relevance: "high",
      sample_values: ["Electronics", "Clothing", "Books"],
      null_percentage: 2,
      unique_percentage: 15,
      has_formulas: false
    },
    {
      name: "Sales_Rep",
      letter: "E",
      data_type: "string",
      business_relevance: "medium",
      sample_values: ["John", "Jane", "Mike"],
      null_percentage: 0,
      unique_percentage: 20,
      has_formulas: false
    },
    {
      name: "Region",
      letter: "F",
      data_type: "string",
      business_relevance: "high",
      sample_values: ["North", "South", "East", "West"],
      null_percentage: 0,
      unique_percentage: 4,
      has_formulas: false
    },
    {
      name: "Temp_Field",
      letter: "G",
      data_type: "string",
      business_relevance: "low",
      sample_values: ["temp1", "temp2", "temp3"],
      null_percentage: 80,
      unique_percentage: 20,
      has_formulas: false
    },
    {
      name: "Debug_Info",
      letter: "H",
      data_type: "string",
      business_relevance: "low",
      sample_values: ["debug1", "debug2", "debug3"],
      null_percentage: 90,
      unique_percentage: 10,
      has_formulas: false
    }
  ],
  data_quality: {
    completeness: 85,
    consistency: 78,
    accuracy: 92
  },
  summary: {
    numericColumns: 1,
    dateColumns: 1,
    textColumns: 6,
    formulaColumns: 0,
    emptyColumns: 0
  }
};

// Test MistralService functionality
async function testMistralService() {
  console.log('🧪 Testing Mistral AI Integration...\n');

  try {
    // Import the service (you'll need to adjust the path based on your setup)
    const { MistralService } = require('./src/lib/mistralService.ts');
    
    // Create service instance
    const service = new MistralService({
      apiKey: '', // No API key needed for local Mistral:instruct
      model: 'mistral:instruct',
      baseUrl: process.env.VITE_MISTRAL_BASE_URL || 'http://localhost:11434'
    });

    console.log('✅ MistralService instantiated successfully');

    // Test schema analysis
    console.log('\n🔍 Testing Schema Analysis...');
    try {
      const analysis = await service.analyzeSchema(testSchema);
      console.log('✅ Schema analysis completed successfully');
      console.log('📊 Analysis Results:');
      console.log(`   - Selected Columns: ${analysis.selected_columns.length}`);
      console.log(`   - Excluded Columns: ${analysis.excluded_count}`);
      console.log(`   - Rationale: ${analysis.selection_rationale}`);
      
      console.log('\n📋 Selected Columns:');
      analysis.selected_columns.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.name} (${col.type}) - ${col.business_relevance}`);
      });
      
         } catch (error) {
       console.log('❌ Schema analysis failed (expected without local Mistral:instruct running):', error.message);
     }

         // Test report prompt generation
     console.log('\n📝 Testing Report Prompt Generation...');
     try {
       const mockAnalysis = {
         selected_columns: [
           {
             name: "Revenue",
             type: "numeric",
             business_relevance: "Primary KPI",
             report_usage: "kpi"
           },
           {
             name: "Date",
             type: "date",
             business_relevance: "Temporal dimension",
             report_usage: "dimension"
           }
         ],
         excluded_count: 6,
         selection_rationale: "Focus on financial metrics and time dimensions"
       };

       const prompt = await service.generateReportPrompt(mockAnalysis, 'financial');
       console.log('✅ Report prompt generated successfully');
       console.log('📄 Prompt Preview:');
       console.log(prompt.substring(0, 200) + '...');
       
     } catch (error) {
       console.log('❌ Report prompt generation failed:', error.message);
     }

     // Test report template generation
     console.log('\n📋 Testing Report Template Generation...');
     try {
       const mockAnalysis = {
         selected_columns: [
           {
             name: "Revenue",
             type: "numeric",
             business_relevance: "Primary KPI",
             report_usage: "kpi"
           },
           {
             name: "Date",
             type: "date",
             business_relevance: "Temporal dimension",
             report_usage: "dimension"
           },
           {
             name: "Region",
             type: "string",
             business_relevance: "Geographic dimension",
             report_usage: "dimension"
           }
         ],
         excluded_count: 6,
         selection_rationale: "Focus on financial metrics and time dimensions"
       };

       const template = await service.generateReportTemplate(mockAnalysis);
       console.log('✅ Report template generated successfully');
       console.log('📊 Template Results:');
       console.log(`   - Report Type: ${template.report_type}`);
       console.log(`   - KPI Cards: ${template.kpi_cards.length}`);
       console.log(`   - Chart Suggestions: ${template.chart_suggestions.length}`);
       
     } catch (error) {
       console.log('❌ Report template generation failed (expected without local Mistral:instruct running):', error.message);
     }

     // Test connection (will fail without valid API key)
     console.log('\n🔌 Testing Connection...');
    try {
      const isConnected = await service.testConnection();
      if (isConnected) {
        console.log('✅ Connection test successful');
      } else {
        console.log('❌ Connection test failed');
      }
         } catch (error) {
       console.log('❌ Connection test failed (expected without local Mistral:instruct running):', error.message);
     }

  } catch (error) {
    console.log('❌ Failed to import or instantiate MistralService:', error.message);
  }

  console.log('\n🏁 Testing completed!');
  console.log('\n📝 Next Steps:');
  console.log('1. Ensure Ollama is running: ollama serve');
  console.log('2. Pull mistral:instruct model: ollama pull mistral:instruct');
  console.log('3. Test the integration in your React application');
}

// Run the test
testMistralService().catch(console.error);
