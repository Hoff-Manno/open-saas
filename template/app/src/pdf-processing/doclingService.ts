import { PythonShell } from 'python-shell';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export interface DoclingProcessingOptions {
  enableOcr?: boolean;
  enableVlm?: boolean;
  enableCodeEnrichment?: boolean;
  enableFormulaEnrichment?: boolean;
  vlmModel?: 'SmolDocling' | 'default';
}

export interface DoclingSection {
  title: string;
  content: string;
  order_index: number;
  estimated_minutes: number;
}

export interface DoclingImageDescription {
  image_id: string;
  description: string;
  confidence: number;
  extracted_text?: string;
}

export interface DoclingCodeSnippet {
  code: string;
  language?: string;
  description: string;
  line_start: number;
  line_end: number;
}

export interface DoclingFormula {
  formula: string;
  description: string;
  type: 'mathematical' | 'chemical' | 'other';
  line_number: number;
}

export interface DoclingMetadata {
  title: string;
  page_count: number;
  has_images: boolean;
  has_tables: boolean;
  has_code: boolean;
  has_formulas: boolean;
  processing_info: {
    ocr_enabled: boolean;
    vlm_enabled: boolean;
    vlm_model?: string;
    code_enrichment_enabled: boolean;
    formula_enrichment_enabled: boolean;
    docling_version: string;
  };
  image_descriptions?: DoclingImageDescription[];
  code_snippets?: DoclingCodeSnippet[];
  formulas?: DoclingFormula[];
}

export interface DoclingResult {
  success: boolean;
  content?: {
    markdown: string;
    sections: DoclingSection[];
    metadata: DoclingMetadata;
  };
  error?: string;
}

export class DoclingService {
  private pythonScriptPath: string;
  private pythonExecutable: string;

  constructor() {
    // Path to our Python script
    this.pythonScriptPath = path.join(process.cwd(), 'scripts', 'docling_processor.py');
    
    // Try to find Python executable
    this.pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';
  }

  /**
   * Check if Docling dependencies are installed
   */
  async checkDependencies(): Promise<{ installed: boolean; error?: string }> {
    try {
      const result = await this.runPythonScript(['-c', 'import docling; print("OK")']);
      return { installed: result.includes('OK') };
    } catch (error) {
      return { 
        installed: false, 
        error: `Docling not available: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Process a PDF file using Docling with enhanced AI features
   */
  async processPDF(
    pdfBuffer: Buffer, 
    originalFileName: string,
    options: DoclingProcessingOptions = {}
  ): Promise<DoclingResult> {
    let tempFilePath: string | null = null;

    try {
      // Check dependencies first
      const depCheck = await this.checkDependencies();
      if (!depCheck.installed) {
        return {
          success: false,
          error: depCheck.error || 'Docling dependencies not installed'
        };
      }

      // Create temporary file for the PDF
      tempFilePath = await this.createTempFile(pdfBuffer, originalFileName);

      // Prepare Python script arguments with enhanced options
      const args = [this.pythonScriptPath, tempFilePath];
      
      if (!options.enableOcr) {
        args.push('--no-ocr');
      }
      
      if (!options.enableVlm) {
        args.push('--no-vlm');
      } else {
        // Use SmolDocling model for VLM by default
        const vlmModel = options.vlmModel || 'SmolDocling';
        args.push('--vlm-model', vlmModel);
      }

      if (options.enableCodeEnrichment) {
        args.push('--enable-code-enrichment');
      }

      if (options.enableFormulaEnrichment) {
        args.push('--enable-formula-enrichment');
      }

      // Run the Python script
      const output = await this.runPythonScript(args);
      
      // Parse the JSON result
      const result: DoclingResult = JSON.parse(output);
      
      return result;

    } catch (error) {
      console.error('Error in DoclingService.processPDF:', error);
      return {
        success: false,
        error: `PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      // Clean up temporary file
      if (tempFilePath) {
        try {
          await unlink(tempFilePath);
        } catch (cleanupError) {
          console.warn('Failed to clean up temp file:', cleanupError);
        }
      }
    }
  }

  /**
   * Create a temporary file from buffer
   */
  private async createTempFile(buffer: Buffer, originalFileName: string): Promise<string> {
    const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
    const fileExtension = path.extname(originalFileName) || '.pdf';
    const tempFileName = `docling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    await writeFile(tempFilePath, buffer);
    return tempFilePath;
  }

  /**
   * Run Python script and return output
   */
  private async runPythonScript(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        mode: 'text' as const,
        pythonPath: this.pythonExecutable,
        pythonOptions: ['-u'], // Unbuffered output
        scriptPath: '', // We're passing the full path in args
        args: args.slice(1), // Remove script path from args
      };

      let output = '';
      let errorOutput = '';

      const pyshell = new PythonShell(args[0], options);

      pyshell.on('message', (message) => {
        output += message + '\n';
      });

      pyshell.on('stderr', (stderr) => {
        errorOutput += stderr + '\n';
      });

      pyshell.end((err) => {
        if (err) {
          reject(new Error(`Python script error: ${err.message}\nStderr: ${errorOutput}`));
        } else {
          resolve(output.trim());
        }
      });
    });
  }

  /**
   * Install Docling dependencies (for development/setup)
   */
  async installDependencies(): Promise<{ success: boolean; error?: string }> {
    try {
      const requirementsPath = path.join(process.cwd(), 'scripts', 'requirements.txt');
      
      if (!fs.existsSync(requirementsPath)) {
        return {
          success: false,
          error: 'requirements.txt not found'
        };
      }

      await this.runPythonScript(['-m', 'pip', 'install', '-r', requirementsPath]);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to install dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const doclingService = new DoclingService();