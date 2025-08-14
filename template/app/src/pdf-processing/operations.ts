// PDF Processing Operations
import { HttpError } from 'wasp/server'
import { type ProcessPDF, type GetProcessingStatus, type GetUserLearningModules, type RetryPDFProcessing, type CheckDoclingHealth } from 'wasp/server/operations'
import * as z from 'zod'
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation'
import { canUserCreateModule, getSubscriptionErrorMessage } from '../payment/subscriptionUtils'
import { handleError, createHttpError, ErrorCode, ProcessingError } from '../shared/errors'
import { validateSubscriptionLimits, validateFile } from '../shared/validation'
import { checkRateLimit } from '../shared/rateLimiting'
import { healthChecker } from '../shared/monitoring'

const processPDFSchema = z.object({
  fileUrl: z.string().url(),
  fileName: z.string().optional(),
  fileKey: z.string().optional()
})

export const processPDF: ProcessPDF<
  z.infer<typeof processPDFSchema>,
  { success: boolean; processingId: string; message: string }
> = async (rawArgs, context) => {
  try {
    if (!context.user) {
      throw createHttpError(401, ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    
    const args = ensureArgsSchemaOrThrowHttpError(processPDFSchema, rawArgs);
    
    // Rate limiting check
    await checkRateLimit(context.user.id, 'PDF_PROCESSING');
    
    // Validate subscription limits
    await validateSubscriptionLimits(context.user, 'create_module', context);
    
    // Validate file if we have file info
    if (args.fileName) {
      // Extract file info from URL or use provided info
      const fileInfo = {
        name: args.fileName,
        type: 'application/pdf',
        size: 0, // Would need to get actual size
      };
      
      validateFile(fileInfo, {
        maxSizeBytes: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['application/pdf'],
        requirePDF: true,
      });
    }
    
    // Check system health before processing
    const healthCheck = await healthChecker.checkPDFProcessing();
    if (healthCheck.status === 'unhealthy') {
      throw createHttpError(503, ErrorCode.DOCLING_SERVICE_UNAVAILABLE, healthCheck.details, true, 60);
    }
    
    // Create a learning module record
    const module = await context.entities.LearningModule.create({
      data: {
        title: args.fileName || 'Untitled PDF',
        description: 'Processing PDF document...',
        originalFileName: args.fileName || 'document.pdf',
        fileKey: args.fileKey || '',
        processedContent: {},
        processingStatus: 'PROCESSING',
        creatorId: context.user.id,
        organizationId: context.user.organizationId || 'default-org'
      }
    });
    
    // Create alert for processing start
    healthChecker.createAlert(
      'info',
      'pdf_processing',
      `PDF processing started for module ${module.id}`,
      { userId: context.user.id, fileName: args.fileName }
    );
    
    // TODO: Queue background job for actual PDF processing
    console.log(`Processing PDF: ${args.fileUrl} for user ${context.user.id}`);
    
    return { 
      success: true, 
      processingId: module.id,
      message: 'PDF processing started successfully'
    };
  } catch (error) {
    return handleError(error, 'processPDF');
  }
};

const getProcessingStatusSchema = z.object({
  processingId: z.string()
})

export const getProcessingStatus: GetProcessingStatus<
  z.infer<typeof getProcessingStatusSchema>,
  { processingId: string; status: string; progress: number; message: string; retryable?: boolean; errorDetails?: any }
> = async (rawArgs, context) => {
  try {
    if (!context.user) {
      throw createHttpError(401, ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    
    const args = ensureArgsSchemaOrThrowHttpError(getProcessingStatusSchema, rawArgs);
    
    // Rate limiting for status checks
    await checkRateLimit(context.user.id, 'API_GENERAL');
    
    const module = await context.entities.LearningModule.findUnique({
      where: { id: args.processingId },
      select: {
        id: true,
        processingStatus: true,
        title: true,
        creatorId: true,
        processedContent: true,
        updatedAt: true,
      }
    });
    
    if (!module) {
      throw createHttpError(404, ErrorCode.MISSING_REQUIRED_FIELD, { field: 'processingId' });
    }
    
    // Validate access permissions
    if (module.creatorId !== context.user.id && !context.user.isAdmin) {
      throw createHttpError(403, ErrorCode.MODULE_ACCESS_DENIED);
    }
    
    const statusMap = {
      'PENDING': { 
        progress: 0, 
        message: 'Processing queued and waiting to start',
        retryable: false 
      },
      'PROCESSING': { 
        progress: 50, 
        message: 'Processing in progress - extracting content from PDF',
        retryable: false 
      },
      'COMPLETED': { 
        progress: 100, 
        message: 'Processing completed successfully',
        retryable: false 
      },
      'FAILED': { 
        progress: 0, 
        message: 'Processing failed - please try again or contact support',
        retryable: true 
      }
    };
    
    const statusInfo = statusMap[module.processingStatus as keyof typeof statusMap] || statusMap.PENDING;
    
    // Add additional details for failed processing
    let errorDetails;
    if (module.processingStatus === 'FAILED' && module.processedContent) {
      errorDetails = (module.processedContent as any).error;
    }
    
    return {
      processingId: args.processingId,
      status: module.processingStatus,
      progress: statusInfo.progress,
      message: statusInfo.message,
      retryable: statusInfo.retryable,
      ...(errorDetails && { errorDetails }),
    };
  } catch (error) {
    throw handleError(error, 'getProcessingStatus');
  }
};

export const getUserLearningModules: GetUserLearningModules<
  void,
  Array<{
    id: string;
    title: string;
    description: string | null;
    processingStatus: string;
    createdAt: Date;
    sectionsCount: number;
  }>
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }
  
  try {
    const modules = await context.entities.LearningModule.findMany({
      where: {
        OR: [
          { creatorId: context.user.id },
          { 
            assignments: {
              some: { userId: context.user.id }
            }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        description: true,
        processingStatus: true,
        createdAt: true,
        sections: {
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return modules.map(module => ({
      id: module.id,
      title: module.title,
      description: module.description,
      processingStatus: module.processingStatus,
      createdAt: module.createdAt,
      sectionsCount: module.sections.length
    }));
  } catch (error) {
    console.error('Error fetching user learning modules:', error);
    throw new HttpError(500, 'Failed to fetch learning modules');
  }
};

const retryPDFProcessingSchema = z.object({
  processingId: z.string()
})

export const retryPDFProcessing: RetryPDFProcessing<
  z.infer<typeof retryPDFProcessingSchema>,
  { success: boolean; newProcessingId: string; message: string }
> = async (rawArgs, context) => {
  try {
    if (!context.user) {
      throw createHttpError(401, ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    
    const args = ensureArgsSchemaOrThrowHttpError(retryPDFProcessingSchema, rawArgs);
    
    // Rate limiting for retry operations
    await checkRateLimit(context.user.id, 'PDF_PROCESSING');
    
    const module = await context.entities.LearningModule.findUnique({
      where: { id: args.processingId },
      select: {
        id: true,
        creatorId: true,
        processingStatus: true,
        originalFileName: true,
        updatedAt: true,
      }
    });
    
    if (!module) {
      throw createHttpError(404, ErrorCode.MISSING_REQUIRED_FIELD, { field: 'processingId' });
    }
    
    // Validate access permissions
    if (module.creatorId !== context.user.id && !context.user.isAdmin) {
      throw createHttpError(403, ErrorCode.MODULE_ACCESS_DENIED);
    }
    
    // Check if processing is already in progress
    if (module.processingStatus === 'PROCESSING') {
      throw createHttpError(400, ErrorCode.PDF_PROCESSING_FAILED, {
        reason: 'Processing is already in progress',
        processingId: args.processingId,
      });
    }
    
    // Check if module was recently updated (prevent spam retries)
    const timeSinceLastUpdate = Date.now() - module.updatedAt.getTime();
    if (timeSinceLastUpdate < 30000) { // 30 seconds
      throw createHttpError(429, ErrorCode.PROCESSING_RATE_LIMIT, null, true, 30);
    }
    
    // Check system health before retry
    const healthCheck = await healthChecker.checkPDFProcessing();
    if (healthCheck.status === 'unhealthy') {
      throw createHttpError(503, ErrorCode.DOCLING_SERVICE_UNAVAILABLE, healthCheck.details, true, 60);
    }
    
    // Reset processing status and clear error details
    await context.entities.LearningModule.update({
      where: { id: args.processingId },
      data: { 
        processingStatus: 'PROCESSING',
        processedContent: {}, // Clear previous error details
        updatedAt: new Date()
      }
    });
    
    // Create alert for retry
    healthChecker.createAlert(
      'info',
      'pdf_processing',
      `PDF processing retry initiated for module ${args.processingId}`,
      { 
        userId: context.user.id, 
        fileName: module.originalFileName,
        previousStatus: module.processingStatus 
      }
    );
    
    // TODO: Queue background job for retry
    console.log(`Retrying PDF processing for module ${args.processingId}`);
    
    return {
      success: true,
      newProcessingId: args.processingId,
      message: 'PDF processing retry initiated successfully'
    };
  } catch (error) {
    throw handleError(error, 'retryPDFProcessing');
  }
};

export const checkDoclingHealth: CheckDoclingHealth<
  void,
  { 
    status: string; 
    timestamp: string; 
    services: Record<string, string>;
    metrics?: any;
    alerts?: any[];
  }
> = async (_args, context) => {
  try {
    if (!context.user) {
      throw createHttpError(401, ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    
    if (!context.user.isAdmin) {
      throw createHttpError(403, ErrorCode.ADMIN_REQUIRED);
    }
    
    // Perform comprehensive health check
    const healthCheck = await healthChecker.performHealthCheck(context);
    const metrics = await healthChecker.collectMetrics(context);
    const activeAlerts = healthChecker.getActiveAlerts();
    
    return {
      status: healthCheck.overall,
      timestamp: healthCheck.timestamp,
      services: healthCheck.services.reduce((acc, service) => {
        acc[service.service] = service.status;
        return acc;
      }, {} as Record<string, string>),
      metrics: {
        database: metrics.database,
        processing: metrics.processing,
        storage: metrics.storage,
        users: metrics.users,
      },
      alerts: activeAlerts.map(alert => ({
        id: alert.id,
        level: alert.level,
        service: alert.service,
        message: alert.message,
        timestamp: alert.timestamp,
      })),
    };
  } catch (error) {
    // Even if health check fails, try to return some status
    console.error('Error checking system health:', error);
    
    healthChecker.createAlert(
      'error',
      'health_check',
      'Health check operation failed',
      { error: String(error) }
    );
    
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        docling: 'unknown',
        api: 'error',
        database: 'unknown',
        storage: 'unknown',
        queue: 'unknown',
      },
      alerts: [{
        id: 'health_check_error',
        level: 'error',
        service: 'health_check',
        message: 'Health check operation failed',
        timestamp: new Date().toISOString(),
      }],
    };
  }
};
