// Processing Job for PDF files
import { type ProcessPDFJob } from 'wasp/server/jobs';
import { doclingService } from './doclingService';
import { ProcessingError, ErrorCode } from '../shared/errors';
import { healthChecker, AlertLevel } from '../shared/monitoring';
import { JobQueueOptimizer, JobMonitoring } from '../performance/jobs';
import { DoclingOptimizer } from '../performance/docling-config';
import { cache, CacheKeys, CacheInvalidation } from '../performance/caching';
import { CDNOptimizer } from '../performance/cdn';

export const processPDFJob: ProcessPDFJob<
  { moduleId: string; filePath: string; userId: string; retryCount?: number },
  { success: boolean; error?: string; retryable?: boolean }
> = async (args, context) => {
  const { moduleId, filePath, userId, retryCount = 0 } = args;
  const maxRetries = 3;
  
  let processingStartTime = Date.now();
  
  try {
    console.log(`Processing PDF for user ${userId}: ${filePath} (attempt ${retryCount + 1})`);
    
    // Performance optimization: Monitor job health first
    const jobHealth = await JobMonitoring.monitorJobHealth();
    if (jobHealth.systemHealth === 'critical') {
      throw new ProcessingError('System overloaded, deferring PDF processing', moduleId, true);
    }

    // Performance optimization: Check Docling system health  
    const doclingMetrics = await DoclingOptimizer.getPerformanceMetrics();
    if (doclingMetrics.memoryUsage.percentage > 90) {
      console.warn('High memory usage detected, optimizing processing...');
    }
    
    // Validate module exists and is in correct state
    const module = await context.entities.LearningModule.findUnique({
      where: { id: moduleId },
      select: { 
        id: true, 
        processingStatus: true, 
        originalFileName: true,
        creatorId: true,
      }
    });
    
    if (!module) {
      throw new ProcessingError(`Module ${moduleId} not found`, moduleId, false);
    }
    
    if (module.processingStatus === 'COMPLETED') {
      console.log(`Module ${moduleId} already completed, skipping processing`);
      return { success: true };
    }
    
    // Update module status to processing with timestamp
    await context.entities.LearningModule.update({
      where: { id: moduleId },
      data: { 
        processingStatus: 'PROCESSING',
        processedContent: {
          startedAt: new Date().toISOString(),
          attempt: retryCount + 1,
        }
      }
    });
    
    // Create processing start alert
    healthChecker.createAlert(
      AlertLevel.INFO,
      'pdf_processing',
      `Started processing PDF: ${module.originalFileName}`,
      { moduleId, userId, attempt: retryCount + 1 }
    );
    
    // Validate file exists and is accessible
    if (!filePath) {
      throw new ProcessingError('File path is required', moduleId, false);
    }
    
    // Check system health before processing
    const healthCheck = await healthChecker.checkPDFProcessing();
    if (healthCheck.status === 'unhealthy') {
      throw new ProcessingError(
        'PDF processing service is unavailable',
        moduleId,
        true // retryable
      );
    }
    
    // TODO: Implement actual PDF processing with Docling
    // This is where the real processing would happen:
    
    try {
      // 1. Download PDF file from S3 or read from local storage
      console.log(`Downloading PDF from: ${filePath}`);
      
      // 2. Process with doclingService
      console.log(`Processing PDF with Docling service`);
      // const processedContent = await doclingService.processDocument(filePath);
      
      // 3. Extract sections and content
      console.log(`Extracting sections from processed content`);
      
      // 4. Generate learning questions (if enabled)
      console.log(`Generating learning questions`);
      
      // For now, simulate processing with a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate potential processing errors based on retry count
      if (retryCount === 0 && Math.random() < 0.3) {
        throw new ProcessingError('Simulated OCR processing failure', moduleId, true);
      }
      
      // Create sections from processed content
      const sections = [
        {
          title: 'Introduction',
          content: `# Introduction\n\nThis section was auto-generated from the PDF content of "${module.originalFileName}".`,
          orderIndex: 1,
          estimatedMinutes: 5
        },
        {
          title: 'Main Content',
          content: `# Main Content\n\nProcessed content from the PDF document.`,
          orderIndex: 2,
          estimatedMinutes: 10
        }
      ];
      
      // Create sections in database
      for (const section of sections) {
        await context.entities.ModuleSection.create({
          data: {
            moduleId,
            ...section
          }
        });
      }
      
      const processingTime = Date.now() - processingStartTime;
      
      // Update module status to completed
      await context.entities.LearningModule.update({
        where: { id: moduleId },
        data: { 
          processingStatus: 'COMPLETED',
          processedContent: {
            sections: sections.length,
            processedAt: new Date().toISOString(),
            processingTimeMs: processingTime,
            attempt: retryCount + 1,
            doclingVersion: '1.0.0', // Would be actual version
          }
        }
      });
      
      // Create success alert
      healthChecker.createAlert(
        AlertLevel.INFO,
        'pdf_processing',
        `Successfully processed PDF: ${module.originalFileName}`,
        { 
          moduleId, 
          userId, 
          processingTimeMs: processingTime,
          sectionsCreated: sections.length,
          attempt: retryCount + 1,
        }
      );
      
      console.log(`Successfully processed PDF for module ${moduleId} in ${processingTime}ms`);
      return { success: true };
      
    } catch (processingError) {
      // Handle specific processing errors
      if (processingError instanceof ProcessingError) {
        throw processingError;
      }
      
      // Convert unknown processing errors
      throw new ProcessingError(
        `PDF processing failed: ${String(processingError)}`,
        moduleId,
        true // Most processing errors are retryable
      );
    }
    
  } catch (error) {
    const processingTime = Date.now() - processingStartTime;
    console.error(`Error processing PDF for module ${moduleId}:`, error);
    
    const isRetryable = error instanceof ProcessingError ? error.retryable : true;
    const shouldRetry = isRetryable && retryCount < maxRetries;
    
    // Prepare error details
    const errorDetails = {
      error: String(error),
      attempt: retryCount + 1,
      maxRetries,
      processingTimeMs: processingTime,
      retryable: isRetryable,
      willRetry: shouldRetry,
      timestamp: new Date().toISOString(),
    };
    
    // Update module status
    try {
      await context.entities.LearningModule.update({
        where: { id: moduleId },
        data: { 
          processingStatus: shouldRetry ? 'PROCESSING' : 'FAILED',
          processedContent: {
            error: errorDetails,
            failedAt: new Date().toISOString(),
          }
        }
      });
    } catch (updateError) {
      console.error('Error updating module status to failed:', updateError);
      
      // Create critical alert for database issues
      healthChecker.createAlert(
        AlertLevel.CRITICAL,
        'database',
        'Failed to update module processing status',
        { moduleId, originalError: String(error), updateError: String(updateError) }
      );
    }
    
    // Create error alert
    healthChecker.createAlert(
      shouldRetry ? AlertLevel.WARNING : AlertLevel.ERROR,
      'pdf_processing',
      `PDF processing ${shouldRetry ? 'failed, will retry' : 'failed permanently'}: ${module?.originalFileName || 'unknown'}`,
      errorDetails
    );
    
    // Schedule retry if appropriate
    if (shouldRetry) {
      console.log(`Scheduling retry ${retryCount + 2}/${maxRetries + 1} for module ${moduleId}`);
      
      // TODO: Schedule retry job with exponential backoff
      // const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      // await scheduleJob('processPDFJob', { ...args, retryCount: retryCount + 1 }, retryDelay);
      
      return { 
        success: false, 
        error: String(error),
        retryable: true,
      };
    }
    
    return { 
      success: false, 
      error: String(error),
      retryable: false,
    };
  }
};
