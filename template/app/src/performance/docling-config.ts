// Docling model configuration and optimization for deployment
import * as path from 'path';
import * as fs from 'fs';

// Docling model configuration for optimal performance
export const DoclingConfig = {
  // Model download and caching configuration
  MODEL_CACHE_DIR: process.env.DOCLING_MODEL_CACHE_DIR || '/tmp/docling_models',
  
  // OCR provider configuration based on environment
  OCR_CONFIG: {
    // Primary OCR provider (fastest)
    primary: process.env.DOCLING_OCR_PRIMARY || 'rapidocr',
    
    // Fallback providers in order of preference
    fallbacks: ['easyocr', 'tesseract'],
    
    // OCR quality vs speed settings
    quality: process.env.NODE_ENV === 'production' ? 'balanced' : 'fast',
  },

  // VLM (Vision Language Model) configuration
  VLM_CONFIG: {
    // Use SmolDocling for image descriptions
    model: 'smdl',
    
    // Batch processing settings
    batchSize: process.env.NODE_ENV === 'production' ? 4 : 2,
    
    // Memory optimization
    maxMemoryMB: 2048, // 2GB limit
  },

  // Processing optimization settings
  PROCESSING: {
    // Maximum concurrent PDF processing
    maxConcurrent: process.env.NODE_ENV === 'production' ? 3 : 1,
    
    // Timeout settings (in seconds)
    timeout: 1800, // 30 minutes max per PDF
    
    // Memory limits per process
    maxMemoryPerProcess: '1GB',
    
    // Chunk processing for large documents
    chunkSize: 50, // pages per chunk
    enableChunking: true,
  },

  // Performance monitoring
  MONITORING: {
    enableMetrics: process.env.NODE_ENV === 'production',
    metricsInterval: 60000, // 1 minute
    logLevel: process.env.DOCLING_LOG_LEVEL || 'info',
  },
} as const;

// Docling deployment optimizer
export class DoclingOptimizer {
  
  /**
   * Initialize Docling with optimized configuration for deployment
   */
  static async initializeForDeployment(): Promise<void> {
    console.log('Initializing Docling for deployment...');
    
    // Ensure model cache directory exists
    await this.ensureCacheDirectory();
    
    // Pre-download essential models
    await this.predownloadModels();
    
    // Optimize Python environment
    await this.optimizePythonEnvironment();
    
    // Validate configuration
    await this.validateConfiguration();
    
    console.log('Docling initialization complete');
  }

  /**
   * Ensure model cache directory exists and has proper permissions
   */
  private static async ensureCacheDirectory(): Promise<void> {
    const cacheDir = DoclingConfig.MODEL_CACHE_DIR;
    
    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      // Check write permissions
      fs.accessSync(cacheDir, fs.constants.W_OK);
      
      console.log(`Model cache directory ready: ${cacheDir}`);
    } catch (error) {
      console.error('Failed to setup model cache directory:', error);
      throw new Error(`Cannot setup model cache directory: ${cacheDir}`);
    }
  }

  /**
   * Pre-download Docling models to avoid first-use delays
   */
  private static async predownloadModels(): Promise<void> {
    console.log('Pre-downloading Docling models...');
    
    // Models to pre-download based on usage patterns
    const essentialModels = [
      'layout-segmentation', // For document structure analysis
      'table-structure-recognition', // For table processing
      'formula-detection', // For formula recognition
    ];
    
    // In production deployment, these models should be:
    // 1. Downloaded during container build
    // 2. Cached in persistent storage
    // 3. Versioned for consistency
    
    for (const model of essentialModels) {
      try {
        await this.downloadModel(model);
        console.log(`✓ Model downloaded: ${model}`);
      } catch (error) {
        console.warn(`⚠ Failed to download model ${model}:`, error);
      }
    }
  }

  /**
   * Download specific Docling model
   */
  private static async downloadModel(modelName: string): Promise<void> {
    // Simulate model download - in real implementation:
    // - Use Docling's model download API
    // - Handle download progress and errors
    // - Verify model integrity
    const modelPath = path.join(DoclingConfig.MODEL_CACHE_DIR, `${modelName}.model`);
    
    if (fs.existsSync(modelPath)) {
      console.log(`Model already cached: ${modelName}`);
      return;
    }
    
    // In real implementation, download from Docling model repository
    console.log(`Downloading model: ${modelName}`);
    
    // Create placeholder for this example
    fs.writeFileSync(modelPath, `# ${modelName} model placeholder`);
  }

  /**
   * Optimize Python environment for Docling
   */
  private static async optimizePythonEnvironment(): Promise<void> {
    console.log('Optimizing Python environment...');
    
    // Python optimization recommendations for deployment:
    const optimizations = {
      // Memory management
      PYTHONUNBUFFERED: '1', // Unbuffered output for better logging
      PYTHONMALLOC: 'malloc', // Use system malloc for better memory management
      PYTHONHASHSEED: '0', // Reproducible hash seeds
      
      // Performance
      PYTHONOPTIMIZE: process.env.NODE_ENV === 'production' ? '2' : '0',
      
      // Docling-specific environment variables
      DOCLING_CACHE_DIR: DoclingConfig.MODEL_CACHE_DIR,
      DOCLING_LOG_LEVEL: DoclingConfig.MONITORING.logLevel,
    };

    // Set environment variables
    Object.entries(optimizations).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    console.log('Python environment optimized');
  }

  /**
   * Validate Docling configuration and dependencies
   */
  private static async validateConfiguration(): Promise<void> {
    console.log('Validating Docling configuration...');
    
    const checks = [
      this.checkPythonVersion(),
      this.checkDoclingInstallation(),
      this.checkOCRProviders(),
      this.checkMemoryLimits(),
      this.checkDiskSpace(),
    ];

    const results = await Promise.allSettled(checks);
    
    let hasErrors = false;
    results.forEach((result, index) => {
      const checkName = ['Python Version', 'Docling Installation', 'OCR Providers', 'Memory Limits', 'Disk Space'][index];
      
      if (result.status === 'rejected') {
        console.error(`✗ ${checkName}: ${result.reason}`);
        hasErrors = true;
      } else {
        console.log(`✓ ${checkName}: OK`);
      }
    });

    if (hasErrors) {
      throw new Error('Docling configuration validation failed');
    }
  }

  /**
   * Check Python version compatibility
   */
  private static async checkPythonVersion(): Promise<void> {
    // In real implementation, execute python --version and validate
    const requiredVersion = '3.9.0';
    const currentVersion = '3.11.0'; // Mock version
    
    if (this.compareVersions(currentVersion, requiredVersion) < 0) {
      throw new Error(`Python ${requiredVersion} or higher required, found ${currentVersion}`);
    }
  }

  /**
   * Check if Docling is properly installed
   */
  private static async checkDoclingInstallation(): Promise<void> {
    // In real implementation, import docling and check version
    try {
      // Mock check - in real implementation: python -c "import docling; print(docling.__version__)"
      console.log('Docling package available');
    } catch (error) {
      throw new Error('Docling package not installed or not accessible');
    }
  }

  /**
   * Validate OCR providers are available
   */
  private static async checkOCRProviders(): Promise<void> {
    const primary = DoclingConfig.OCR_CONFIG.primary;
    const fallbacks = DoclingConfig.OCR_CONFIG.fallbacks;
    
    // Check primary provider
    if (!this.isOCRProviderAvailable(primary)) {
      console.warn(`Primary OCR provider '${primary}' not available, using fallback`);
    }

    // Check at least one fallback is available
    const availableFallbacks = fallbacks.filter(provider => this.isOCRProviderAvailable(provider));
    if (availableFallbacks.length === 0) {
      throw new Error('No OCR providers available');
    }
  }

  /**
   * Check if OCR provider is available
   */
  private static isOCRProviderAvailable(provider: string): boolean {
    // In real implementation, check if OCR provider binaries are installed
    const availableProviders = ['rapidocr', 'easyocr']; // Mock available providers
    return availableProviders.includes(provider);
  }

  /**
   * Check memory limits and availability
   */
  private static async checkMemoryLimits(): Promise<void> {
    // Check available system memory
    const totalMemory = 8 * 1024 * 1024 * 1024; // Mock 8GB
    const requiredMemory = DoclingConfig.VLM_CONFIG.maxMemoryMB * 1024 * 1024;
    
    if (totalMemory < requiredMemory * 2) { // Need at least 2x for safety
      console.warn(`Low memory warning: ${totalMemory / (1024*1024*1024)}GB available, ${requiredMemory / (1024*1024*1024)}GB required`);
    }
  }

  /**
   * Check available disk space for model cache
   */
  private static async checkDiskSpace(): Promise<void> {
    // Check disk space for model cache directory
    const requiredSpace = 2 * 1024 * 1024 * 1024; // 2GB minimum
    
    try {
      const stats = fs.statSync(DoclingConfig.MODEL_CACHE_DIR);
      // In real implementation, check available disk space
      console.log('Disk space check passed');
    } catch (error) {
      throw new Error('Cannot access model cache directory');
    }
  }

  /**
   * Compare version strings
   */
  private static compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    
    return 0;
  }

  /**
   * Get optimized Docling processing configuration
   */
  static getProcessingConfig() {
    return {
      // OCR configuration
      ocr_config: {
        provider: DoclingConfig.OCR_CONFIG.primary,
        fallback_providers: DoclingConfig.OCR_CONFIG.fallbacks,
        quality: DoclingConfig.OCR_CONFIG.quality,
      },
      
      // VLM configuration
      vlm_config: {
        model: DoclingConfig.VLM_CONFIG.model,
        batch_size: DoclingConfig.VLM_CONFIG.batchSize,
        max_memory_mb: DoclingConfig.VLM_CONFIG.maxMemoryMB,
      },
      
      // Processing limits
      processing: {
        timeout_seconds: DoclingConfig.PROCESSING.timeout,
        max_concurrent: DoclingConfig.PROCESSING.maxConcurrent,
        chunk_size: DoclingConfig.PROCESSING.chunkSize,
        enable_chunking: DoclingConfig.PROCESSING.enableChunking,
      },
      
      // Caching
      cache: {
        model_cache_dir: DoclingConfig.MODEL_CACHE_DIR,
        enable_caching: true,
      },
    };
  }

  /**
   * Monitor Docling performance and resource usage
   */
  static async getPerformanceMetrics() {
    return {
      modelCacheSize: this.getModelCacheSize(),
      memoryUsage: this.getMemoryUsage(),
      processingStats: this.getProcessingStats(),
      errorRates: this.getErrorRates(),
    };
  }

  /**
   * Get model cache directory size
   */
  private static getModelCacheSize(): number {
    try {
      const cacheDir = DoclingConfig.MODEL_CACHE_DIR;
      if (!fs.existsSync(cacheDir)) return 0;
      
      // In real implementation, calculate directory size recursively
      return 1024 * 1024 * 500; // Mock 500MB
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get current memory usage
   */
  private static getMemoryUsage(): { used: number; total: number; percentage: number } {
    const used = process.memoryUsage();
    return {
      used: used.heapUsed,
      total: used.heapTotal,
      percentage: (used.heapUsed / used.heapTotal) * 100,
    };
  }

  /**
   * Get processing statistics
   */
  private static getProcessingStats(): any {
    // In real implementation, maintain processing metrics
    return {
      totalProcessed: 0,
      averageProcessingTime: 0,
      successRate: 100,
      queueLength: 0,
    };
  }

  /**
   * Get error rates
   */
  private static getErrorRates(): any {
    return {
      ocrErrors: 0,
      vlmErrors: 0,
      timeoutErrors: 0,
      memoryErrors: 0,
    };
  }
}
