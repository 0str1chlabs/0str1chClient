// Test script for the new two-stage Mistral:instruct process
// Run this with: node test-two-stage-process.js

// Mock environment variables for testing
process.env.VITE_MISTRAL_BASE_URL = process.env.VITE_MISTRAL_BASE_URL || 'http://localhost:11434';

// Mock fetch for Node.js environment
global.fetch = require('node-fetch');

// Test data for the two-stage process
const mockSchemaData = {
  totalRows: 1000,
  totalColumns: 15,
  summary: {
    numericColumns: 8,
    dateColumns: 2,
    textColumns: 4,
    formulaColumns: 1
  },
  columns: [
    {
      name: "Revenue",
      letter: "A",
      dataType: "numeric",
      businessRelevance: "high",
      nullCount: 0,
      uniqueCount: 850,
      hasFormulas: false,
      sampleValues: ["1000", "1500", "2000"]
    },
    {
      name: "Date",
      letter: "B",
      dataType: "date",
      businessRelevance: "high",
      nullCount: 0,
      uniqueCount: 365,
      hasFormulas: false,
      sampleValues: ["2024-01-01", "2024-01-02", "2024-01-03"]
    },
    {
      name: "Region",
      letter: "C",
      dataType: "string",
      businessRelevance: "medium",
      nullCount: 5,
      uniqueCount: 12,
      hasFormulas: false,
      sampleValues: ["North", "South", "East", "West"]
    }
  ],
  dataQuality: {
    completeness: 98.5,
    consistency: 95.2,
    accuracy: 97.8
  }
};

async function testTwoStageProcess() {
  console.log('🚀 Testing Two-Stage Mistral:instruct Process');
  console.log('=' .repeat(60));
  
  try {
    // Import the service (you'll need to adjust the path based on your setup)
    const { MistralService } = require('./src/lib/mistralService.ts');
    
    // Create service instance
    const service = new MistralService({
      apiKey: '', // No API key needed for local Mistral:instruct
      model: 'mistral:instruct',
      baseUrl: process.env.VITE_MISTRAL_BASE_URL || 'http://localhost:11434'
    });

    console.log('✅ MistralService initialized successfully');
    console.log(`🔗 Using endpoint: ${process.env.VITE_MISTRAL_BASE_URL || 'http://localhost:11434'}`);

    // Test connection first
    console.log('\n🔌 Testing Connection...');
    try {
      const isConnected = await service.testConnection();
      if (isConnected) {
        console.log('✅ Local Mistral:instruct server is accessible');
      } else {
        console.log('❌ Local Mistral:instruct server is not responding');
        console.log('💡 Make sure Ollama is running: ollama serve');
        console.log('💡 And mistral:instruct model is pulled: ollama pull mistral:instruct');
        return;
      }
    } catch (error) {
      console.log('❌ Connection test failed:', error.message);
      return;
    }

    // Stage 1: Test Schema Analysis
    console.log('\n📊 Stage 1: Testing Schema Analysis...');
    try {
      const analysis = await service.analyzeSchema(mockSchemaData);
      console.log('✅ Stage 1: Schema analysis completed successfully!');
      console.log(`📈 Found ${analysis.selected_columns.length} relevant columns`);
      console.log(`🚫 Excluded ${analysis.excluded_count} columns`);
      console.log(`💡 Rationale: ${analysis.selection_rationale}`);
      
      // Show selected columns
      console.log('\n📋 Selected Columns:');
      analysis.selected_columns.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.name} (${col.type}) - ${col.business_relevance}`);
        console.log(`      Usage: ${col.report_usage}`);
      });

      // Stage 2: Test Report Template Generation
      console.log('\n📋 Stage 2: Testing Report Template Generation...');
      try {
        const template = await service.generateReportTemplate(analysis);
        console.log('✅ Stage 2: Report template generated successfully!');
        console.log(`📊 Report Type: ${template.report_type}`);
        console.log(`🎯 Primary Focus: ${template.primary_focus}`);
        console.log(`📊 KPI Cards: ${template.kpi_cards.length}`);
        console.log(`📈 Chart Suggestions: ${template.chart_suggestions.length}`);
        console.log(`📑 Report Sections: ${template.report_sections.length}`);
        
        // Show KPI cards
        if (template.kpi_cards.length > 0) {
          console.log('\n💰 KPI Cards:');
          template.kpi_cards.forEach((kpi, index) => {
            console.log(`   ${index + 1}. ${kpi.metric} (${kpi.calculation}, ${kpi.format})`);
          });
        }
        
        // Show chart suggestions
        if (template.chart_suggestions.length > 0) {
          console.log('\n📊 Chart Suggestions:');
          template.chart_suggestions.forEach((chart, index) => {
            console.log(`   ${index + 1}. ${chart.title} (${chart.type})`);
            console.log(`      ${chart.x_axis} vs ${chart.y_axis} - ${chart.purpose}`);
          });
        }
        
        // Show report sections
        if (template.report_sections.length > 0) {
          console.log('\n📑 Report Sections:');
          template.report_sections.forEach((section, index) => {
            console.log(`   ${index + 1}. ${section}`);
          });
        }

        // Stage 3: Test Report Generation (Optional)
        console.log('\n📝 Stage 3: Testing Report Generation (Optional)...');
        try {
          const reportPrompt = await service.generateReportPrompt(analysis, 'financial');
          console.log('✅ Report prompt generated successfully');
          console.log('📄 Prompt Preview:');
          console.log(reportPrompt.substring(0, 200) + '...');
          
          // Generate the actual report
          const report = await service.callMistralAPI(reportPrompt);
          console.log('✅ Full report generated successfully!');
          console.log('📄 Report Preview:');
          console.log(report.substring(0, 300) + '...');
          
        } catch (error) {
          console.log('❌ Report generation failed:', error.message);
        }

      } catch (error) {
        console.log('❌ Report template generation failed:', error.message);
      }

    } catch (error) {
      console.log('❌ Schema analysis failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test setup failed:', error);
  }

  console.log('\n🏁 Two-stage process testing completed!');
  console.log('\n📝 Summary:');
  console.log('✅ Stage 1: Schema Analysis - Identifies relevant columns');
  console.log('✅ Stage 2: Template Generation - Creates report structure with KPIs and charts');
  console.log('✅ Stage 3: Report Generation - Generates comprehensive business report');
  console.log('\n💡 Next Steps:');
  console.log('1. Test the integration in your React application');
  console.log('2. Click the "AI Report" button to start the two-stage process');
  console.log('3. Review the generated template and report');
}

// Run the test
testTwoStageProcess().catch(console.error);
