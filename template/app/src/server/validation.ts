import { HttpError } from 'wasp/server';
import * as z from 'zod';
import { createHttpError, ErrorCode, ValidationError } from '../shared/errors';

export function ensureArgsSchemaOrThrowHttpError<Schema extends z.ZodType>(
  schema: Schema,
  rawArgs: unknown
): z.infer<Schema> {
  const parseResult = schema.safeParse(rawArgs);
  if (!parseResult.success) {
    console.error('Validation failed:', parseResult.error);
    
    // Extract the first error for user-friendly message
    const firstError = parseResult.error.errors[0];
    const fieldName = firstError.path.join('.');
    const message = firstError.message;
    
    throw createHttpError(400, ErrorCode.MISSING_REQUIRED_FIELD, {
      field: fieldName,
      message,
      errors: parseResult.error.errors,
    });
  } else {
    return parseResult.data;
  }
}

// Enhanced validation with custom error messages
export function validateWithCustomErrors<Schema extends z.ZodType>(
  schema: Schema,
  rawArgs: unknown,
  fieldMessages?: Record<string, string>
): z.infer<Schema> {
  const parseResult = schema.safeParse(rawArgs);
  if (!parseResult.success) {
    const errors = parseResult.error.errors.map(error => {
      const fieldName = error.path.join('.');
      const customMessage = fieldMessages?.[fieldName];
      
      return {
        field: fieldName,
        message: customMessage || error.message,
        code: error.code,
      };
    });
    
    const firstError = errors[0];
    throw new ValidationError(
      firstError.message,
      firstError.field,
      ErrorCode.MISSING_REQUIRED_FIELD
    );
  }
  
  return parseResult.data;
}

// Validation schemas for common patterns
export const commonSchemas = {
  id: z.string().uuid('Invalid ID format'),
  email: z.string().email('Invalid email address'),
  fileName: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .refine(name => !name.includes('..'), 'Invalid file name'),
  fileSize: z.number()
    .min(1, 'File cannot be empty')
    .max(50 * 1024 * 1024, 'File too large (max 50MB)'),
  organizationName: z.string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name too long'),
  moduleTitle: z.string()
    .min(1, 'Module title is required')
    .max(200, 'Module title too long'),
  sectionContent: z.string()
    .min(1, 'Section content is required')
    .max(50000, 'Section content too long'),
  timeSpent: z.number()
    .min(0, 'Time spent cannot be negative')
    .max(24 * 60, 'Time spent seems unrealistic'),
  progressPercentage: z.number()
    .min(0, 'Progress cannot be negative')
    .max(100, 'Progress cannot exceed 100%'),
};

// Batch validation helper
export function validateBatch<T>(
  items: T[],
  validator: (item: T, index: number) => void,
  maxBatchSize: number = 100
): void {
  if (items.length > maxBatchSize) {
    throw new ValidationError(
      `Batch size cannot exceed ${maxBatchSize} items`,
      'batch',
      ErrorCode.MISSING_REQUIRED_FIELD
    );
  }

  const errors: Array<{ index: number; error: string }> = [];

  items.forEach((item, index) => {
    try {
      validator(item, index);
    } catch (error) {
      errors.push({
        index,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  if (errors.length > 0) {
    throw new ValidationError(
      `Validation failed for ${errors.length} items`,
      'batch',
      ErrorCode.MISSING_REQUIRED_FIELD
    );
  }
}

// Sanitization helpers
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"|?*]/g, '') // Remove invalid characters
    .replace(/\.\./g, '') // Remove directory traversal
    .replace(/^\./g, '') // Remove leading dots
    .trim()
    .substring(0, 255); // Limit length
}

export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, use a proper library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

// Rate limiting validation
export function validateRateLimit(
  userId: string,
  action: string,
  windowMs: number,
  maxRequests: number,
  store: Map<string, { count: number; resetTime: number }> = new Map()
): void {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    throw createHttpError(429, ErrorCode.API_RATE_LIMIT, null, true, retryAfter);
  }

  entry.count++;
  store.set(key, entry);
}
