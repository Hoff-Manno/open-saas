import * as z from 'zod';
import { HttpError } from 'wasp/server';
import { type File } from 'wasp/entities';
import {
  type CreateFile,
  type GetAllFilesByUser,
  type GetDownloadFileSignedURL,
} from 'wasp/server/operations';

import { getUploadFileSignedURLFromS3, getDownloadFileSignedURLFromS3 } from './s3Utils';
import { getPDFUploadSignedURLFromS3, getPDFDownloadSignedURLFromS3 } from './pdfS3Utils';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation';
import { ALLOWED_FILE_TYPES } from './validation';
import { ALLOWED_PDF_FILE_TYPES } from './pdfValidation';
import { handleError, createHttpError, ErrorCode } from '../shared/errors';
import { validateFile } from '../shared/validation';
import { checkRateLimit } from '../shared/rateLimiting';
import { healthChecker } from '../shared/monitoring';

const createFileInputSchema = z.object({
  fileType: z.enum(ALLOWED_FILE_TYPES),
  fileName: z.string().nonempty(),
});

type CreateFileInput = z.infer<typeof createFileInputSchema>;

export const createFile: CreateFile<
  CreateFileInput,
  {
    s3UploadUrl: string;
    s3UploadFields: Record<string, string>;
  }
> = async (rawArgs, context) => {
  try {
    if (!context.user) {
      throw createHttpError(401, ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const { fileType, fileName } = ensureArgsSchemaOrThrowHttpError(createFileInputSchema, rawArgs);

    // Rate limiting for file uploads
    await checkRateLimit(context.user.id, 'PDF_UPLOAD');

    // Validate file
    validateFile(
      { name: fileName, type: fileType, size: 0 }, // Size will be validated on actual upload
      {
        maxSizeBytes: 100 * 1024 * 1024, // 100MB for general files
        allowedTypes: ALLOWED_FILE_TYPES,
      }
    );

    // Check storage health
    const storageHealth = await healthChecker.checkStorage();
    if (storageHealth.status === 'unhealthy') {
      throw createHttpError(503, ErrorCode.STORAGE_ERROR, storageHealth.details, true, 60);
    }

    const { s3UploadUrl, s3UploadFields, key } = await getUploadFileSignedURLFromS3({
      fileType,
      fileName,
      userId: context.user.id,
    });

    await context.entities.File.create({
      data: {
        name: fileName,
        key,
        uploadUrl: s3UploadUrl,
        type: fileType,
        user: { connect: { id: context.user.id } },
      },
    });

    // Create upload tracking alert
    healthChecker.createAlert(
      'info',
      'file_upload',
      `File upload initiated: ${fileName}`,
      { userId: context.user.id, fileType, key }
    );

    return {
      s3UploadUrl,
      s3UploadFields,
    };
  } catch (error) {
    throw handleError(error, 'createFile');
  }
};

export const getAllFilesByUser: GetAllFilesByUser<void, File[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  return context.entities.File.findMany({
    where: {
      user: {
        id: context.user.id,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

const getDownloadFileSignedURLInputSchema = z.object({ key: z.string().nonempty() });

type GetDownloadFileSignedURLInput = z.infer<typeof getDownloadFileSignedURLInputSchema>;

export const getDownloadFileSignedURL: GetDownloadFileSignedURL<
  GetDownloadFileSignedURLInput,
  string
> = async (rawArgs, _context) => {
  const { key } = ensureArgsSchemaOrThrowHttpError(getDownloadFileSignedURLInputSchema, rawArgs);
  return await getDownloadFileSignedURLFromS3({ key });
};

// PDF-specific operations
const createPDFFileInputSchema = z.object({
  fileType: z.enum(ALLOWED_PDF_FILE_TYPES),
  fileName: z.string().nonempty(),
});

type CreatePDFFileInput = z.infer<typeof createPDFFileInputSchema>;

export const createPDFFile: CreateFile<
  CreatePDFFileInput,
  {
    s3UploadUrl: string;
    s3UploadFields: Record<string, string>;
  }
> = async (rawArgs, context) => {
  try {
    if (!context.user) {
      throw createHttpError(401, ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const { fileType, fileName } = ensureArgsSchemaOrThrowHttpError(createPDFFileInputSchema, rawArgs);

    // Rate limiting for PDF uploads (more restrictive)
    await checkRateLimit(context.user.id, 'PDF_UPLOAD');

    // Validate PDF file specifically
    validateFile(
      { name: fileName, type: fileType, size: 0 }, // Size will be validated on actual upload
      {
        maxSizeBytes: 50 * 1024 * 1024, // 50MB for PDFs
        allowedTypes: ALLOWED_PDF_FILE_TYPES,
        requirePDF: true,
      }
    );

    // Check storage health
    const storageHealth = await healthChecker.checkStorage();
    if (storageHealth.status === 'unhealthy') {
      throw createHttpError(503, ErrorCode.STORAGE_ERROR, storageHealth.details, true, 60);
    }

    // Check if user has reached file upload limits
    const userFileCount = await context.entities.File.count({
      where: { 
        userId: context.user.id,
        type: 'application/pdf',
      },
    });

    // Basic limit check (could be subscription-based)
    if (userFileCount >= 1000) { // Reasonable limit
      throw createHttpError(429, ErrorCode.UPLOAD_RATE_LIMIT, {
        currentCount: userFileCount,
        limit: 1000,
      });
    }

    const { s3UploadUrl, s3UploadFields, key } = await getPDFUploadSignedURLFromS3({
      fileType,
      fileName,
      userId: context.user.id,
    });

    await context.entities.File.create({
      data: {
        name: fileName,
        key,
        uploadUrl: s3UploadUrl,
        type: fileType,
        user: { connect: { id: context.user.id } },
      },
    });

    // Create PDF upload tracking alert
    healthChecker.createAlert(
      'info',
      'pdf_upload',
      `PDF upload initiated: ${fileName}`,
      { userId: context.user.id, fileType, key, userFileCount: userFileCount + 1 }
    );

    return {
      s3UploadUrl,
      s3UploadFields,
    };
  } catch (error) {
    throw handleError(error, 'createPDFFile');
  }
};

export const getAllPDFFilesByUser: GetAllFilesByUser<void, File[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  return context.entities.File.findMany({
    where: {
      user: {
        id: context.user.id,
      },
      type: 'application/pdf', // Only return PDF files
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getPDFDownloadSignedURL: GetDownloadFileSignedURL<
  GetDownloadFileSignedURLInput,
  string
> = async (rawArgs, _context) => {
  const { key } = ensureArgsSchemaOrThrowHttpError(getDownloadFileSignedURLInputSchema, rawArgs);
  return await getPDFDownloadSignedURLFromS3({ key });
};
