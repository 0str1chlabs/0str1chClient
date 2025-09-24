import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Search, Brain, Globe, Database, CheckCircle, Bot, Zap, Target } from '@/lib/icons';
import { ResearchOrchestrator, FinalResearchResult } from '@/lib/researchAgents';

interface ResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResearchComplete: (data: any) => void;
}

const thinkingMessages = [
  "🤖 Agent 1: Research Planner analyzing your request...",
  "📋 Creating strategic research queries...",
  "🌐 Agent 2: Web Researcher executing searches...",
  "📚 Gathering comprehensive data sources...",
  "🧠 Agent 3: Data Structurer processing findings...",
  "📊 Structuring data for spreadsheet integration...",
  "✅ Multi-agent research complete! Preparing your data..."
];

export const ResearchModal: React.FC<ResearchModalProps> = ({ 
  isOpen, 
  onClose, 
  onResearchComplete 
}) => {
  const [researchPrompt, setResearchPrompt] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [researchResults, setResearchResults] = useState<any>(null);

  const handleResearch = async () => {
    if (!researchPrompt.trim()) {
      setError('Please enter a research prompt');
      return;
    }

    setIsResearching(true);
    setError(null);
    setCurrentMessageIndex(0);

    // Cycle through thinking messages
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % thinkingMessages.length);
    }, 2000);

    try {
      console.log('🚀 Starting multi-agent research for:', researchPrompt);
      
      // Use the new multi-agent research orchestrator
      const researchResult: FinalResearchResult = await ResearchOrchestrator.executeFullResearch(researchPrompt);
      
      clearInterval(messageInterval);
      setResearchResults(researchResult);
      setIsResearching(false);
      
      console.log('✅ Multi-agent research completed:', researchResult);
      
      // Call the completion handler but don't auto-close the modal
      console.log('📊 Calling onResearchComplete with result...');
      onResearchComplete(researchResult);
      console.log('✅ onResearchComplete called successfully');

    } catch (err) {
      clearInterval(messageInterval);
      console.error('❌ Multi-agent research failed:', err);
      setError(err instanceof Error ? err.message : 'Multi-agent research failed');
      setIsResearching(false);
    }
  };

  const handleClose = () => {
    if (!isResearching) {
      setResearchPrompt('');
      setError(null);
      setResearchResults(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            Research Assistant
          </CardTitle>
          <CardDescription>
            Enter your research topic and I'll gather comprehensive data for your spreadsheet
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!isResearching && !researchResults && (
            <>
              <div className="space-y-2">
                <Label htmlFor="research-prompt">Research Topic</Label>
                <Input
                  id="research-prompt"
                  placeholder="e.g., 'Market trends for electric vehicles in 2024' or 'Latest AI developments in healthcare'"
                  value={researchPrompt}
                  onChange={(e) => setResearchPrompt(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={handleResearch} 
                  className="flex-1 h-12"
                  disabled={!researchPrompt.trim()}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Start Research
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="h-12"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}

          {isResearching && (
            <div className="text-center space-y-6 py-8">
              <div className="relative">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <Brain className="h-8 w-8 text-white animate-spin" />
                </div>
                <div className="flex justify-center space-x-1 mt-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {thinkingMessages[currentMessageIndex]}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This may take 30-60 seconds depending on the complexity
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          )}

          {researchResults && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                  Research Complete!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Found {researchResults.sources?.length || 0} sources with relevant data
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Research Summary
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {researchResults.summary || 'Research data has been processed and is ready for integration.'}
                </p>
              </div>

              {/* Sources Used Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Sources Used ({researchResults.sources?.length || 0})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {researchResults.sources?.slice(0, 5).map((source: any, index: number) => (
                    <div key={index} className="text-xs bg-white dark:bg-gray-700 p-2 rounded border">
                      <div className="font-medium text-blue-600 dark:text-blue-400 truncate">
                        {source.title}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 truncate">
                        {source.domain} • Score: {source.relevance_score}
                      </div>
                    </div>
                  ))}
                  {researchResults.sources?.length > 5 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      ... and {researchResults.sources.length - 5} more sources
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Data Integration
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  The research data has been automatically embedded into your spreadsheet with comprehensive details including sources, statistics, and analysis.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleClose}
                  className="flex-1"
                  variant="default"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Close & View Sheet
                </Button>
                <Button 
                  onClick={() => {
                    setResearchResults(null);
                    setResearchPrompt('');
                    setError(null);
                  }}
                  variant="outline"
                >
                  Research Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
