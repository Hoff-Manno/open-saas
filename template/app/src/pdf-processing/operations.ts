// PDF Processing Operations
import { HttpError } from 'wasp/server'
import { type ProcessPDF, type GetProcessingStatus, type GetUserLearningModules, type RetryPDFProcessing, type CheckDoclingHealth } from 'wasp/server/operations'
import * as z from 'zod'
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation'
import { canUserCreateModule, getSubscriptionErrorMessage } from '../payment/subscriptionUtils'

const processPDFSchema = z.object({
  fileUrl: z.string().url(),
  fileName: z.string().optional(),
  fileKey: z.string().optional()
})

export const processPDF: ProcessPDF<
  z.infer<typeof processPDFSchema>,
  { success: boolean; processingId: string; message: string }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }
  
  const args = ensureArgsSchemaOrThrowHttpError(processPDFSchema, rawArgs);
  
  // Check subscription limits for module creation
  if (context.user.organizationId) {
    const currentModuleCount = await context.entities.LearningModule.count({
      where: { organizationId: context.user.organizationId }
    });
    
    if (!canUserCreateModule(context.user, currentModuleCount)) {
      throw new HttpError(402, getSubscriptionErrorMessage('create_module'));
    }
  }
  
  try {
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
    
    // TODO: Queue background job for actual PDF processing
    console.log(`Processing PDF: ${args.fileUrl} for user ${context.user.id}`);
    
    return { 
      success: true, 
      processingId: module.id,
      message: 'PDF processing started'
    };
  } catch (error) {
    console.error('Error creating learning module:', error);
    throw new HttpError(500, 'Failed to start PDF processing');
  }
};

const getProcessingStatusSchema = z.object({
  processingId: z.string()
})

export const getProcessingStatus: GetProcessingStatus<
  z.infer<typeof getProcessingStatusSchema>,
  { processingId: string; status: string; progress: number; message: string }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }
  
  const args = ensureArgsSchemaOrThrowHttpError(getProcessingStatusSchema, rawArgs);
  
  try {
    const module = await context.entities.LearningModule.findUnique({
      where: { id: args.processingId },
      select: {
        id: true,
        processingStatus: true,
        title: true,
        creatorId: true
      }
    });
    
    if (!module) {
      throw new HttpError(404, 'Processing job not found');
    }
    
    if (module.creatorId !== context.user.id && !context.user.isAdmin) {
      throw new HttpError(403, 'Access denied');
    }
    
    const statusMap = {
      'PENDING': { progress: 0, message: 'Processing queued' },
      'PROCESSING': { progress: 50, message: 'Processing in progress' },
      'COMPLETED': { progress: 100, message: 'Processing completed successfully' },
      'FAILED': { progress: 0, message: 'Processing failed' }
    };
    
    const statusInfo = statusMap[module.processingStatus as keyof typeof statusMap] || statusMap.PENDING;
    
    return {
      processingId: args.processingId,
      status: module.processingStatus,
      progress: statusInfo.progress,
      message: statusInfo.message
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error('Error getting processing status:', error);
    throw new HttpError(500, 'Failed to get processing status');
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
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }
  
  const args = ensureArgsSchemaOrThrowHttpError(retryPDFProcessingSchema, rawArgs);
  
  try {
    const module = await context.entities.LearningModule.findUnique({
      where: { id: args.processingId },
      select: {
        id: true,
        creatorId: true,
        processingStatus: true
      }
    });
    
    if (!module) {
      throw new HttpError(404, 'Processing job not found');
    }
    
    if (module.creatorId !== context.user.id && !context.user.isAdmin) {
      throw new HttpError(403, 'Access denied');
    }
    
    if (module.processingStatus === 'PROCESSING') {
      throw new HttpError(400, 'Processing is already in progress');
    }
    
    // Reset processing status
    await context.entities.LearningModule.update({
      where: { id: args.processingId },
      data: { 
        processingStatus: 'PROCESSING',
        updatedAt: new Date()
      }
    });
    
    // TODO: Queue background job for retry
    console.log(`Retrying PDF processing for module ${args.processingId}`);
    
    return {
      success: true,
      newProcessingId: args.processingId,
      message: 'PDF processing retry initiated'
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error('Error retrying PDF processing:', error);
    throw new HttpError(500, 'Failed to retry PDF processing');
  }
};

export const checkDoclingHealth: CheckDoclingHealth<
  void,
  { status: string; timestamp: string; services: Record<string, string> }
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }
  
  if (!context.user.isAdmin) {
    throw new HttpError(403, 'Admin access required');
  }
  
  try {
    // TODO: Implement actual health checks for Docling service
    // For now, return basic health status
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        docling: 'operational',
        api: 'operational',
        database: 'operational'
      }
    };
  } catch (error) {
    console.error('Error checking Docling health:', error);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        docling: 'error',
        api: 'operational',
        database: 'operational'
      }
    };
  }
};
