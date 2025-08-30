import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Brain, 
  Database, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Lightbulb,
  TrendingUp,
  BarChart3,
  X,
  Eye,
  Download,
  Copy,
  RefreshCw,
  LayoutTemplate
} from 'lucide-react';
import { SheetData } from '@/types/spreadsheet';
import { extractSheetSchema, createSimplifiedSchema, SheetSchema } from '@/lib/schemaUtils';
import { mistralService, SchemaAnalysisResponse, ReportTemplateResponse } from '@/lib/mistralService';
import { geminiService, GeminiResponse } from '@/lib/geminiService';
import { ChartVisualizer } from '@/components/ChartVisualizer';
import { toast } from '@/hooks/use-toast';

interface AIReportGeneratorProps {
  activeSheet: SheetData;
  isOpen: boolean;
  onClose: () => void;
}

export const AIReportGenerator: React.FC<AIReportGeneratorProps> = ({
  activeSheet,
  isOpen,
  onClose
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [isGeneratingGeminiConfigs, setIsGeneratingGeminiConfigs] = useState(false);
  const [schemaAnalysis, setSchemaAnalysis] = useState<SchemaAnalysisResponse | null>(null);
  const [reportTemplate, setReportTemplate] = useState<ReportTemplateResponse | null>(null);
  const [geminiConfigs, setGeminiConfigs] = useState<GeminiResponse | null>(null);
  const [sheetSchema, setSheetSchema] = useState<SheetSchema | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSchemaDetails, setShowSchemaDetails] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  // Extract schema when component mounts or sheet changes
  useEffect(() => {
    if (isOpen && activeSheet) {
      try {
        const schema = extractSheetSchema(activeSheet);
        setSheetSchema(schema);
        console.log('📊 Extracted sheet schema:', schema);
      } catch (error) {
        console.error('❌ Error extracting schema:', error);
        setError('Failed to extract sheet schema');
      }
    }
  }, [isOpen, activeSheet]);

  // Analyze schema with Mistral AI (Stage 1)
  const analyzeSchema = async () => {
    if (!sheetSchema) {
      toast({
        title: "Error",
        description: "No schema available for analysis",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Test local Mistral:instruct connection first
      const isConnected = await mistralService.testConnection();
      if (!isConnected) {
        throw new Error('Local Mistral:instruct service is not accessible. Please ensure Ollama is running with mistral:instruct model.');
      }

      // Create simplified schema for AI processing
      const simplifiedSchema = createSimplifiedSchema(sheetSchema);
      console.log('🔍 Stage 1: Sending schema to Mistral for analysis:', simplifiedSchema);

      // Stage 1: Analyze schema with Mistral
      const analysis = await mistralService.analyzeSchema(simplifiedSchema);
      setSchemaAnalysis(analysis);
      
      toast({
        title: "Success",
        description: `Stage 1 Complete! Schema analyzed successfully! Found ${analysis.selected_columns.length} relevant columns.`,
      });

      console.log('✅ Stage 1: Schema analysis completed:', analysis);

      // Automatically proceed to Stage 2: Generate report template
      await generateReportTemplate(analysis);
      
      // Automatically proceed to Stage 3: Generate Gemini chart and KPI configs
      // We need to wait for the template to be generated first
      // This will be called after the template is ready

    } catch (error) {
      console.error('❌ Schema analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: `Schema analysis failed: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate report template using Mistral AI (Stage 2)
  const generateReportTemplate = async (analysis: SchemaAnalysisResponse) => {
    setIsGeneratingTemplate(true);
    setError(null);

    try {
      console.log('🔍 Stage 2: Generating report template based on schema analysis...');
      
      // Stage 2: Generate detailed report template
      const template = await mistralService.generateReportTemplate(analysis);
      setReportTemplate(template);
      
      toast({
        title: "Success",
        description: `Stage 2 Complete! Report template generated successfully!`,
      });

      console.log('✅ Stage 2: Report template generated:', template);

      // Now proceed to Stage 3: Generate Gemini configs
      await generateGeminiConfigs(analysis);

    } catch (error) {
      console.error('❌ Report template generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: `Report template generation failed: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  // Generate Gemini chart and KPI configs (Stage 3)
  const generateGeminiConfigs = async (analysis: SchemaAnalysisResponse) => {
    setIsGeneratingGeminiConfigs(true);
    setError(null);

    try {
      console.log('🔍 Stage 3: Generating Gemini chart and KPI configs...');
      
      // Stage 3: Use Gemini to generate actionable chart and KPI configs
      const configs = await geminiService.generateChartAndKPIConfigs(analysis, reportTemplate);
      setGeminiConfigs(configs);
      
      toast({
        title: "Success",
        description: `Stage 3 Complete! Gemini configs generated successfully!`,
      });

      console.log('✅ Stage 3: Gemini configs generated:', configs);

    } catch (error) {
      console.error('❌ Gemini config generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: `Gemini config generation failed: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingGeminiConfigs(false);
    }
  };

  // Generate comprehensive report using Mistral (Stage 3 - Optional)
  const generateReport = async () => {
    if (!schemaAnalysis) {
      toast({
        title: "Error",
        description: "Please analyze the schema first",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingReport(true);
    setError(null);

    try {
      // Generate report prompt based on schema analysis
      const reportPrompt = await mistralService.generateReportPrompt(
        schemaAnalysis, 
        'business' // Default category
      );

      console.log('📝 Stage 3: Generated report prompt:', reportPrompt);

      // Call Mistral to generate the report
      const response = await mistralService.callMistralAPI(reportPrompt);
      setGeneratedReport(response);
      
              toast({
          title: "Success",
          description: "Stage 4 Complete! AI report generated successfully!",
        });

    } catch (error) {
      console.error('❌ Report generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: `Report generation failed: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Copy schema analysis to clipboard
  const copySchemaAnalysis = async () => {
    if (!schemaAnalysis) return;
    
    try {
      const analysisText = JSON.stringify(schemaAnalysis, null, 2);
      await navigator.clipboard.writeText(analysisText);
      toast({
        title: "Success",
        description: "Schema analysis copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  // Copy report template to clipboard
  const copyReportTemplate = async () => {
    if (!reportTemplate) return;
    
    try {
      const templateText = JSON.stringify(reportTemplate, null, 2);
      await navigator.clipboard.writeText(templateText);
      toast({
        title: "Success",
        description: "Report template copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  // Copy generated report to clipboard
  const copyGeneratedReport = async () => {
    if (!generatedReport) return;
    
    try {
      await navigator.clipboard.writeText(generatedReport);
      toast({
        title: "Success",
        description: "Report copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  // Reset all states
  const resetStates = () => {
    setSchemaAnalysis(null);
    setReportTemplate(null);
    setGeminiConfigs(null);
    setGeneratedReport(null);
    setError(null);
    setCustomPrompt('');
  };

  // Handle close with cleanup
  const handleClose = () => {
    resetStates();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[98vw] h-[95vh] max-w-[98vw] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI-Powered Report Generator (Three-Stage Process)
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Stage 1: Mistral schema analysis → Stage 2: Mistral template → Stage 3: Gemini chart/KPI configs
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="w-full space-y-8">
            {/* Schema Analysis Section */}
            <div className="w-full">
              {/* Schema Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <span>Sheet Schema Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sheetSchema ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{sheetSchema.totalRows}</div>
                          <div className="text-sm text-blue-600">Total Rows</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{sheetSchema.totalColumns}</div>
                          <div className="text-sm text-green-600">Total Columns</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{sheetSchema.summary.numericColumns}</div>
                          <div className="text-sm text-purple-600">Numeric</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{sheetSchema.summary.dateColumns}</div>
                          <div className="text-sm text-orange-600">Date</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Text Columns:</span>
                          <Badge variant="outline">{sheetSchema.summary.textColumns}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Formula Columns:</span>
                          <Badge variant="outline">{sheetSchema.summary.formulaColumns}</Badge>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowSchemaDetails(!showSchemaDetails)}
                          className="w-full"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {showSchemaDetails ? 'Hide' : 'Show'} Detailed Schema
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Extracting schema...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stage 1: Schema Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <span>Stage 1: AI Schema Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!schemaAnalysis ? (
                    <div className="space-y-4">
                                              <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click the button below to start the three-stage AI analysis process. 
                          This will analyze your sheet schema, generate a report template, and create chart/KPI configs.
                        </p>
                        
                        <Button 
                          onClick={analyzeSchema}
                          disabled={isAnalyzing || !sheetSchema}
                          className="w-full"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Stage 1: Analyzing Schema...
                            </>
                          ) : (
                            <>
                              <Brain className="h-4 w-4 mr-2" />
                              Start Three-Stage Analysis
                            </>
                          )}
                        </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Stage 1 Complete</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={copySchemaAnalysis}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Selected Columns:</span>
                          <Badge variant="default">{schemaAnalysis.selected_columns.length}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Excluded Columns:</span>
                          <Badge variant="secondary">{schemaAnalysis.excluded_count}</Badge>
                        </div>
                      </div>

                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Selection Rationale:</h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {schemaAnalysis.selection_rationale}
                        </p>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSchemaAnalysis(null)}
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Re-analyze Schema
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Report Template */}
            <div className="space-y-6">
              {/* Stage 2: Report Template Generation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <LayoutTemplate className="h-5 w-5 text-orange-600" />
                    <span>Stage 2: Report Template</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!reportTemplate ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Report template will be automatically generated after schema analysis is complete.
                      </p>
                      
                      {isGeneratingTemplate && (
                        <div className="flex items-center space-x-2 text-orange-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Generating report template...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Stage 2 Complete</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={copyReportTemplate}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Report Type:</span>
                          <Badge variant="default">{reportTemplate.report_type}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>KPI Cards:</span>
                          <Badge variant="secondary">{reportTemplate.kpi_cards.length}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Chart Suggestions:</span>
                          <Badge variant="outline">{reportTemplate.chart_suggestions.length}</Badge>
                        </div>
                      </div>

                      <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                        <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">Primary Focus:</h4>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          {reportTemplate.primary_focus}
                        </p>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setReportTemplate(null)}
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Template
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stage 3: Gemini Chart & KPI Configs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    <span>Stage 3: Gemini Configs</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!geminiConfigs ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Gemini chart and KPI configs will be automatically generated after template generation.
                      </p>
                      
                      {isGeneratingGeminiConfigs && (
                        <div className="flex items-center space-x-2 text-green-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Generating Gemini configs...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Stage 3 Complete</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const configText = JSON.stringify(geminiConfigs, null, 2);
                            navigator.clipboard.writeText(configText);
                            toast({
                              title: "Success",
                              description: "Gemini configs copied to clipboard",
                            });
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Charts:</span>
                          <Badge variant="default">{geminiConfigs.charts.length}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>KPIs:</span>
                          <Badge variant="secondary">{geminiConfigs.kpis.length}</Badge>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setGeminiConfigs(null)}
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Configs
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Selected Columns Display */}
              {schemaAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-green-600" />
                      <span>Selected Columns ({schemaAnalysis.selected_columns.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {schemaAnalysis.selected_columns.map((column, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {column.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Type: {column.type} • Usage: {column.report_usage}
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {column.business_relevance}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Report Generation & Template Details - Full Width */}
            <div className="w-full space-y-6">
              {/* Report Template Details */}
              {reportTemplate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <span>Template Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-4">
                        {/* KPI Cards */}
                        <div>
                          <h4 className="font-medium mb-2">KPI Cards:</h4>
                          <div className="space-y-2">
                            {reportTemplate.kpi_cards.map((kpi, index) => (
                              <div key={index} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                                <div className="font-medium">{kpi.metric}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {kpi.calculation} • {kpi.format}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Chart Suggestions */}
                        <div>
                          <h4 className="font-medium mb-2">Chart Suggestions:</h4>
                          <div className="space-y-2">
                            {reportTemplate.chart_suggestions.map((chart, index) => (
                              <div key={index} className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                                <div className="font-medium">{chart.title}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {chart.type} • {chart.x_axis} vs {chart.y_axis}
                                </div>
                                <div className="text-xs text-gray-500">{chart.purpose}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Report Sections */}
                        <div>
                          <h4 className="font-medium mb-2">Report Sections:</h4>
                          <div className="flex flex-wrap gap-1">
                            {reportTemplate.report_sections.map((section, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {section}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Gemini Config Details */}
              {geminiConfigs && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-green-600" />
                      <span>Gemini Config Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-4">
                        {/* KPI Configs */}
                        <div>
                          <h4 className="font-medium mb-2">KPI Configs:</h4>
                          <div className="space-y-2">
                            {geminiConfigs.kpis.map((kpi, index) => (
                              <div key={index} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                                <div className="font-medium">{kpi.name}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  Column: {kpi.column} • Calc: {kpi.calc} • Format: {kpi.format}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Chart Configs */}
                        <div>
                          <h4 className="font-medium mb-2">Chart Configs:</h4>
                          <div className="space-y-2">
                            {geminiConfigs.charts.map((chart, index) => (
                              <div key={index} className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                                <div className="font-medium">{chart.title}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  Type: {chart.type} • {chart.x_column} vs {chart.y_column}
                                </div>
                                <div className="text-xs text-gray-500">Purpose: {chart.chart_purpose}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Live Charts & KPIs Visualization - Full Width */}
              {geminiConfigs && (
                <div className="col-span-full w-full">
                  <Card className="w-full">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-lg">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                        <span>Live Charts & KPIs</span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Interactive visualizations and key performance indicators based on your data
                      </p>
                    </CardHeader>
                    <CardContent className="px-6 py-4">
                      <ChartVisualizer 
                        charts={geminiConfigs.charts}
                        kpis={geminiConfigs.kpis}
                        sheetData={(() => {
                          // Convert sheet cells to tabular data for charts
                          const rows: any[] = [];
                          const headers = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
                          
                          console.log('🔍 Converting sheet data for charts:', {
                            rowCount: activeSheet.rowCount,
                            colCount: activeSheet.colCount,
                            totalCells: Object.keys(activeSheet.cells).length,
                            sampleCells: Object.entries(activeSheet.cells).slice(0, 5)
                          });
                          
                          // Create tabular data structure
                          for (let row = 1; row <= Math.min(activeSheet.rowCount, 100); row++) {
                            const rowData: any = {};
                            headers.forEach(header => {
                              const cellKey = `${header}${row}`;
                              const cell = activeSheet.cells[cellKey];
                              rowData[header] = cell?.value || '';
                            });
                            
                            // Only add rows that have some data
                            const hasData = Object.values(rowData).some(val => val !== '');
                            if (hasData) {
                              rows.push(rowData);
                            }
                          }
                          
                          console.log('✅ Converted sheet data:', {
                            totalRows: rows.length,
                            sampleRows: rows.slice(0, 3)
                          });
                          
                          return rows;
                        })()}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Stage 4: Report Generation (Optional) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>Stage 4: AI Report Generation (Optional)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!generatedReport ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Generate a comprehensive business report based on the analyzed schema, template, and Gemini configs. 
                        This is an optional fourth stage.
                      </p>
                      
                      <Button 
                        onClick={generateReport}
                        disabled={isGeneratingReport || !schemaAnalysis}
                        className="w-full"
                      >
                        {isGeneratingReport ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Generating Report...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4 mr-2" />
                            Generate AI Report
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Report Generated</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={copyGeneratedReport}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      
                      <ScrollArea className="h-64">
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {generatedReport}
                          </pre>
                        </div>
                      </ScrollArea>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setGeneratedReport(null)}
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate New Report
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Detailed Schema Modal */}
          {showSchemaDetails && sheetSchema && (
            <Dialog open={showSchemaDetails} onOpenChange={setShowSchemaDetails}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Detailed Sheet Schema</DialogTitle>
                  <DialogDescription>
                    Complete schema analysis for {sheetSchema.sheetName}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Data Quality Metrics */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Data Quality Metrics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{sheetSchema.dataQuality.completeness}%</div>
                        <div className="text-sm text-blue-600">Completeness</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{sheetSchema.dataQuality.consistency}%</div>
                        <div className="text-sm text-green-600">Consistency</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{sheetSchema.dataQuality.accuracy}%</div>
                        <div className="text-sm text-purple-600">Accuracy</div>
                      </div>
                    </div>
                  </div>

                  {/* Column Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Column Analysis</h3>
                    <ScrollArea className="h-96">
                      <div className="space-y-3">
                        {sheetSchema.columns.map((column, index) => (
                          <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{column.name} ({column.letter})</div>
                              <div className="flex space-x-2">
                                <Badge variant="outline">{column.dataType}</Badge>
                                <Badge variant={column.businessRelevance === 'high' ? 'default' : 
                                               column.businessRelevance === 'medium' ? 'secondary' : 'outline'}>
                                  {column.businessRelevance}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <div>
                                <span className="font-medium">Null Count:</span> {column.nullCount}
                              </div>
                              <div>
                                <span className="font-medium">Unique Values:</span> {column.uniqueCount}
                              </div>
                              <div>
                                <span className="font-medium">Has Formulas:</span> {column.hasFormulas ? 'Yes' : 'No'}
                              </div>
                              <div>
                                <span className="font-medium">Sample Values:</span> {column.sampleValues.slice(0, 3).join(', ')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
};
