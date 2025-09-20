import { SheetData, Cell } from '@/types/spreadsheet';

export interface ResearchSource {
  id: number;
  title: string;
  url: string;
  content: string;
  relevance_score: number;
  published_date?: string;
  domain: string;
  raw_content?: string;
  score?: number;
  images?: string[];
  language?: string;
  location?: string;
  author?: string;
  category?: string;
}

export interface ResearchData {
  success: boolean;
  query: string;
  summary: string;
  sources: ResearchSource[];
  follow_up_questions: string[];
  images: string[];
  metadata: {
    total_sources: number;
    search_depth: string;
    timestamp: string;
    processing_time: number;
  };
}

export class ResearchService {
  /**
   * Helper function to create a cell with proper interface
   */
  private static createCell(value: string | number, isHeader: boolean = false): Cell {
    return {
      value,
      style: isHeader ? { bold: true, backgroundColor: '#f8f9fa' } : undefined
    };
  }

  /**
   * Creates a new sheet from research data
   */
  static createResearchSheet(researchData: any, sheetName?: string): SheetData {
    try {
      console.log('🔍 ResearchService.createResearchSheet called with:', researchData);
      
      // Generate a unique sheet ID
      const sheetId = `research-sheet-${Date.now()}`;
      
      // Create sheet name from research query or use provided name
      const query = researchData.researchPlan?.queries?.[0] || researchData.query || 'Research Results';
      const finalSheetName = sheetName || `Research: ${query.substring(0, 30)}${query.length > 30 ? '...' : ''}`;
      
      // Create empty sheet structure
      const newSheet: SheetData = {
        id: sheetId,
        name: finalSheetName,
        cells: {},
        rowCount: 1000,
        colCount: 26
      };
      
      // Embed research data into the new sheet
      return this.embedResearchData(newSheet, researchData);
    } catch (error) {
      console.error('❌ Error in createResearchSheet:', error);
      throw new Error(`Research sheet creation failed: ${error.message}`);
    }
  }

  /**
   * Embeds multi-agent research data into a spreadsheet
   */
  static embedResearchData(sheet: SheetData, researchData: any): SheetData {
    try {
      console.log('🔍 ResearchService.embedResearchData called with:', researchData);
      console.log('🔍 Sheet data:', {
        id: sheet.id,
        rowCount: sheet.rowCount,
        colCount: sheet.colCount,
        cellCount: Object.keys(sheet.cells).length
      });
      
      const newSheet = { ...sheet };
      const cells = { ...newSheet.cells };
      
      // Find the next available row
      const maxRow = this.getMaxRow(cells);
      let currentRow = maxRow + 2; // Add some spacing
      
      console.log('📊 Starting at row:', currentRow, 'Max row found:', maxRow);
      
      // Check if this is the new multi-agent format
      const isMultiAgentFormat = researchData.spreadsheetData && researchData.researchPlan;
      console.log('🤖 Is multi-agent format:', isMultiAgentFormat);
    
    if (isMultiAgentFormat) {
      // === MULTI-AGENT RESEARCH OVERVIEW ===
      cells[`A${currentRow}`] = {
        value: `🤖 MULTI-AGENT RESEARCH RESULTS`,
        style: { bold: true, fontSize: 14, backgroundColor: '#f0f9ff' }
      };
      currentRow++;
      
      cells[`A${currentRow}`] = this.createCell('Research Query:', true);
      cells[`B${currentRow}`] = this.createCell(researchData.researchPlan?.queries?.[0] || 'Unknown');
      currentRow++;
      
      cells[`A${currentRow}`] = this.createCell('Research Strategy:', true);
      cells[`B${currentRow}`] = this.createCell(researchData.researchPlan?.researchStrategy || 'Multi-agent research');
      currentRow++;
      
      cells[`A${currentRow}`] = this.createCell('Data Quality:', true);
      cells[`B${currentRow}`] = this.createCell(researchData.spreadsheetData?.metadata?.dataQuality || 'Unknown');
      currentRow++;
      
      cells[`A${currentRow}`] = this.createCell('Total Rows:', true);
      cells[`B${currentRow}`] = this.createCell(researchData.spreadsheetData?.metadata?.totalRows?.toString() || '0');
      currentRow++;
      
      cells[`A${currentRow}`] = this.createCell('Source Count:', true);
      cells[`B${currentRow}`] = this.createCell(researchData.spreadsheetData?.metadata?.sourceCount?.toString() || '0');
      currentRow++;
      
      cells[`A${currentRow}`] = this.createCell('Confidence Score:', true);
      cells[`B${currentRow}`] = this.createCell(`${researchData.spreadsheetData?.metadata?.confidence || 0}%`);
      currentRow++;
      
      cells[`A${currentRow}`] = this.createCell('Processing Time:', true);
      cells[`B${currentRow}`] = this.createCell(`${researchData.processingTime || 0}ms`);
      currentRow++;
      
      cells[`A${currentRow}`] = this.createCell('Research Date:', true);
      cells[`B${currentRow}`] = this.createCell(new Date(researchData.timestamp || Date.now()).toLocaleString());
      currentRow += 2;
      
      // === STRUCTURED DATA TABLE ===
      if (researchData.spreadsheetData?.columns && researchData.spreadsheetData?.rows) {
        cells[`A${currentRow}`] = {
          value: `📊 STRUCTURED RESEARCH DATA (${researchData.spreadsheetData.rows.length} rows)`,
          style: { bold: true, fontSize: 14, backgroundColor: '#f0f9ff' }
        };
        currentRow++;
        
        // Add column headers
        researchData.spreadsheetData.columns.forEach((column: string, index: number) => {
          const col = String.fromCharCode(65 + index); // A, B, C, D, E, F, G, H, I, J, K, L
          cells[`${col}${currentRow}`] = this.createCell(column, true);
        });
        currentRow++;
        
        // Add data rows
        researchData.spreadsheetData.rows.forEach((row: any[], rowIndex: number) => {
          row.forEach((cellValue: any, colIndex: number) => {
            const col = String.fromCharCode(65 + colIndex);
            cells[`${col}${currentRow + rowIndex}`] = this.createCell(String(cellValue || ''));
          });
        });
        
        currentRow += researchData.spreadsheetData.rows.length + 2;
      }
      
      // === SOURCES ATTRIBUTION ===
      if (researchData.sources && researchData.sources.length > 0) {
        cells[`A${currentRow}`] = {
          value: `📚 SOURCES ATTRIBUTION (${researchData.sources.length} sources)`,
          style: { bold: true, fontSize: 14, backgroundColor: '#f0f9ff' }
        };
        currentRow++;
        
        // Source headers
        const sourceHeaders = ['ID', 'Title', 'URL', 'Domain', 'Relevance Score', 'Used For'];
        sourceHeaders.forEach((header, index) => {
          const col = String.fromCharCode(65 + index);
          cells[`${col}${currentRow}`] = this.createCell(header, true);
        });
        currentRow++;
        
        // Source rows
        researchData.sources.forEach((source: any, index: number) => {
          const sourceRow = currentRow + index;
          cells[`A${sourceRow}`] = this.createCell(source.id?.toString() || (index + 1).toString());
          cells[`B${sourceRow}`] = this.createCell(source.title || 'N/A');
          cells[`C${sourceRow}`] = this.createCell(source.url || 'N/A');
          cells[`D${sourceRow}`] = this.createCell(source.domain || 'N/A');
          cells[`E${sourceRow}`] = this.createCell(source.relevanceScore?.toString() || 'N/A');
          cells[`F${sourceRow}`] = this.createCell(source.usedFor?.join(', ') || 'N/A');
        });
        
        currentRow += researchData.sources.length + 2;
      }
      
      // === RESEARCH QUERIES USED ===
      if (researchData.researchPlan?.queries) {
        cells[`A${currentRow}`] = {
          value: `🔍 RESEARCH QUERIES USED (${researchData.researchPlan.queries.length} queries)`,
          style: { bold: true, fontSize: 14, backgroundColor: '#f0f9ff' }
        };
        currentRow++;
        
        researchData.researchPlan.queries.forEach((query: string, index: number) => {
          cells[`A${currentRow + index}`] = this.createCell(`${index + 1}. ${query}`);
        });
        
        currentRow += researchData.researchPlan.queries.length + 1;
      }
      
    } else {
      // Fallback to old format for backward compatibility
      cells[`A${currentRow}`] = {
        value: `🔍 RESEARCH OVERVIEW`,
        style: { bold: true, fontSize: 14, backgroundColor: '#f0f9ff' }
      };
      currentRow++;
      
      cells[`A${currentRow}`] = this.createCell('Research Query:', true);
      cells[`B${currentRow}`] = this.createCell(researchData.query || 'Unknown');
      currentRow++;
      
      cells[`A${currentRow}`] = this.createCell('Research Summary:', true);
      cells[`B${currentRow}`] = this.createCell(researchData.summary || 'No summary available');
      currentRow++;
      
      cells[`A${currentRow}`] = this.createCell('Total Sources Found:', true);
      cells[`B${currentRow}`] = this.createCell(researchData.metadata?.total_sources?.toString() || '0');
      currentRow++;
      
      cells[`A${currentRow}`] = this.createCell('Research Date:', true);
      cells[`B${currentRow}`] = this.createCell(new Date(researchData.metadata?.timestamp || Date.now()).toLocaleString());
      currentRow += 2;
    }
    
    console.log('✅ Research data embedded successfully');
    
    return {
      ...newSheet,
      cells
    };
    } catch (error) {
      console.error('❌ Error in embedResearchData:', error);
      console.error('Research data that caused error:', researchData);
      throw new Error(`Sheet generation failed: ${error.message}`);
    }
  }
  
  /**
   * Get the maximum row number in the spreadsheet
   */
  private static getMaxRow(cells: Record<string, Cell>): number {
    let maxRow = 0;
    Object.keys(cells).forEach(cellId => {
      const match = cellId.match(/([A-Z]+)(\d+)/);
      if (match) {
        const row = parseInt(match[2]);
        if (row > maxRow) {
          maxRow = row;
        }
      }
    });
    return maxRow;
  }
  
  /**
   * Extract research data from a spreadsheet
   */
  static extractResearchData(sheet: SheetData): ResearchData | null {
    const cells = sheet.cells;
    const researchRows: string[] = [];
    
    // Find research section
    let researchStartRow = -1;
    Object.keys(cells).forEach(cellId => {
      const cell = cells[cellId];
      if (cell?.value?.toString().startsWith('Research:')) {
        const match = cellId.match(/([A-Z]+)(\d+)/);
        if (match) {
          researchStartRow = parseInt(match[2]);
        }
      }
    });
    
    if (researchStartRow === -1) {
      return null; // No research data found
    }
    
    // Extract research data from the spreadsheet
    // This is a simplified extraction - you might want to make it more robust
    const sources: ResearchSource[] = [];
    let summary = '';
    let query = '';
    
    // Find summary
    for (let row = researchStartRow + 1; row < researchStartRow + 10; row++) {
      const summaryCell = cells[`A${row}`];
      if (summaryCell?.value === 'Summary:') {
        const summaryValue = cells[`B${row}`]?.value;
        if (summaryValue) {
          summary = summaryValue.toString();
        }
        break;
      }
    }
    
    // Find query from the research header
    const researchHeader = cells[`A${researchStartRow}`];
    if (researchHeader?.value) {
      query = researchHeader.value.toString().replace('Research: ', '');
    }
    
    return {
      success: true,
      query,
      summary,
      sources,
      follow_up_questions: [],
      images: [],
      metadata: {
        total_sources: sources.length,
        search_depth: 'advanced',
        timestamp: new Date().toISOString(),
        processing_time: 0
      }
    };
  }
}