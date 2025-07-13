
import { Upload, FileSpreadsheet, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface WelcomeScreenProps {
  onUploadCSV: () => void;
  onCreateSheet: () => void;
  onStartAI: () => void;
}

export const WelcomeScreen = ({ onUploadCSV, onCreateSheet, onStartAI }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            SheetScribe AI
          </h1>
          <p className="text-xl text-muted-foreground">
            The intelligent spreadsheet that thinks with you
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onUploadCSV}>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Upload CSV</CardTitle>
              <CardDescription>
                Import your existing data and start analyzing immediately
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full">
                Choose File
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onCreateSheet}>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>New Sheet</CardTitle>
              <CardDescription>
                Start fresh with a blank spreadsheet
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full">
                Create Sheet
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onStartAI}>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Talk to AI</CardTitle>
              <CardDescription>
                Let our AI assistant help you create and analyze data
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="secondary" className="w-full">
                Start Chat
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Or create something custom with AI assistance
          </p>
          <Button variant="ghost" onClick={onStartAI}>
            <Bot className="w-4 h-4 mr-2" />
            Ask AI to generate data for you
          </Button>
        </div>
      </div>
    </div>
  );
};
