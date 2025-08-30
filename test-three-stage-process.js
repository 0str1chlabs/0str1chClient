// Test script for the new three-stage AI process
// Run this with: node test-three-stage-process.js

// Mock environment variables for testing
process.env.VITE_MISTRAL_BASE_URL = process.env.VITE_MISTRAL_BASE_URL || 'http://localhost:11434';
process.env.VITE_AISERVER_URL = process.env.VITE_AISERVER_URL || 'http://localhost:3001';

// Mock fetch for Node.js environment
global.fetch = require('node-fetch');

// Test data for the three-stage process
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

async function testThreeStageProcess() {
  console.log('🚀 Testing Three-Stage AI Process (Mistral + Gemini)');
  console.log('=' .repeat(70));
  
  try {
    // Import the services
    const { MistralService } = require('./src/lib/mistralService.ts');
    const { GeminiService } = require('./src/lib/geminiService.ts');
    
    // Create service instances
    const mistralService = new MistralService({
      apiKey: '', // No API key needed for local Mistral:instruct
      model: 'mistral:instruct',
      baseUrl: process.env.VITE_MISTRAL_BASE_URL || 'http://localhost:11434'
    });

    const geminiService = new GeminiService({
      baseUrl: process.env.VITE_AISERVER_URL || 'http://localhost:3001'
    });

    console.log('✅ Services initialized successfully');
    console.log(`🔗 Mistral endpoint: ${process.env.VITE_MISTRAL_BASE_URL || 'http://localhost:11434'}`);
    console.log(`🔗 AISERVER endpoint: ${process.env.VITE_AISERVER_URL || 'http://localhost:3001'}`);

    // Test Mistral connection first
    console.log('\n🔌 Testing Mistral Connection...');
    try {
      const isMistralConnected = await mistralService.testConnection();
      if (isMistralConnected) {
        console.log('✅ Local Mistral:instruct server is accessible');
      } else {
        console.log('❌ Local Mistral:instruct server is not responding');
        console.log('💡 Make sure Ollama is running: ollama serve');
        console.log('💡 And mistral:instruct model is pulled: ollama pull mistral:instruct');
        return;
      }
    } catch (error) {
      console.log('❌ Mistral connection test failed:', error.message);
      return;
    }

    // Test AISERVER connection
    console.log('\n🔌 Testing AISERVER Connection...');
    try {
      const isAIServerConnected = await geminiService.testConnection();
      if (isAIServerConnected) {
        console.log('✅ AISERVER is accessible');
      } else {
        console.log('❌ AISERVER is not accessible');
        console.log('💡 Make sure AISERVER is running on port 3001');
        console.log('💡 Check if AISERVER has the Gemini API key configured');
        return;
      }
    } catch (error) {
      console.log('❌ AISERVER connection test failed:', error.message);
      return;
    }

    // Stage 1: Test Mistral Schema Analysis
    console.log('\n📊 Stage 1: Testing Mistral Schema Analysis...');
    try {
      const analysis = await mistralService.analyzeSchema(mockSchemaData);
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

      // Stage 2: Test Mistral Report Template Generation
      console.log('\n📋 Stage 2: Testing Mistral Report Template Generation...');
      try {
        const template = await mistralService.generateReportTemplate(analysis);
        console.log('✅ Stage 2: Report template generated successfully!');
        console.log(`📊 Report Type: ${template.report_type}`);
        console.log(`🎯 Primary Focus: ${template.primary_focus}`);
        console.log(`📊 KPI Cards: ${template.kpi_cards.length}`);
        console.log(`📈 Chart Suggestions: ${template.chart_suggestions.length}`);
        console.log(`📑 Report Sections: ${template.report_sections.length}`);
        
        // Stage 3: Test Gemini Chart & KPI Config Generation
        console.log('\n🔮 Stage 3: Testing Gemini Chart & KPI Config Generation...');
        try {
          const geminiConfigs = await geminiService.generateChartAndKPIConfigs(analysis, template);
          console.log('✅ Stage 3: Gemini configs generated successfully!');
          console.log(`📊 Charts: ${geminiConfigs.charts.length}`);
          console.log(`💰 KPIs: ${geminiConfigs.kpis.length}`);
          
          // Show KPI configs
          if (geminiConfigs.kpis.length > 0) {
            console.log('\n💰 KPI Configs:');
            geminiConfigs.kpis.forEach((kpi, index) => {
              console.log(`   ${index + 1}. ${kpi.name}`);
              console.log(`      Column: ${kpi.column} • Calc: ${kpi.calc} • Format: ${kpi.format}`);
            });
          }
          
          // Show chart configs
          if (geminiConfigs.charts.length > 0) {
            console.log('\n📊 Chart Configs:');
            geminiConfigs.charts.forEach((chart, index) => {
              console.log(`   ${index + 1}. ${chart.title} (${chart.type})`);
              console.log(`      ${chart.x_column} vs ${chart.y_column} - ${chart.chart_purpose}`);
            });
          }

          // Stage 4: Test Report Generation (Optional)
          console.log('\n📝 Stage 4: Testing Report Generation (Optional)...');
          try {
            const reportPrompt = await mistralService.generateReportPrompt(analysis, 'financial');
            console.log('✅ Report prompt generated successfully');
            console.log('📄 Prompt Preview:');
            console.log(reportPrompt.substring(0, 200) + '...');
            
            // Generate the actual report
            const report = await mistralService.callMistralAPI(reportPrompt);
            console.log('✅ Full report generated successfully!');
            console.log('📄 Report Preview:');
            console.log(report.substring(0, 300) + '...');
            
          } catch (error) {
            console.log('❌ Report generation failed:', error.message);
          }

        } catch (error) {
          console.log('❌ Gemini config generation failed:', error.message);
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

  console.log('\n🏁 Three-stage process testing completed!');
  console.log('\n📝 Summary:');
  console.log('✅ Stage 1: Mistral Schema Analysis - Identifies relevant columns');
  console.log('✅ Stage 2: Mistral Template Generation - Creates report structure');
  console.log('✅ Stage 3: Gemini Config Generation - Creates actionable chart/KPI configs');
  console.log('✅ Stage 4: Report Generation - Generates comprehensive business report');
  console.log('\n💡 Next Steps:');
  console.log('1. Test the integration in your React application');
  console.log('2. Click the "AI Report" button to start the three-stage process');
  console.log('3. Review the generated template, Gemini configs, and report');
  console.log('\n🔑 Required Services:');
  console.log('   - Mistral: None (local Ollama)');
  console.log('   - Gemini: AISERVER with Gemini API key configured');
}

// Run the test
testThreeStageProcess().catch(console.error);
