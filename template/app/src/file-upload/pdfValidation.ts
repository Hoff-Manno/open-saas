// PDF file validation
import { ValidationError, ErrorCode } from '../shared/errors';

export const ALLOWED_PDF_FILE_TYPES = ['application/pdf'] as const;
export type AllowedPDFFileType = (typeof ALLOWED_PDF_FILE_TYPES)[number];

export const MAX_PDF_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MIN_PDF_FILE_SIZE = 1024; // 1KB minimum
export const MAX_PDF_FILE_SIZE_BYTES = MAX_PDF_FILE_SIZE; // Backward compatibility

// PDF file validation with comprehensive checks
export function validatePDFFile(file: File): string | null {
  try {
    // Check file type
    if (!ALLOWED_PDF_FILE_TYPES.includes(file.type as any)) {
      return 'Only PDF files are allowed. Please select a valid PDF document.';
    }

    // Check file size limits
    if (file.size > MAX_PDF_FILE_SIZE) {
      const maxSizeMB = Math.round(MAX_PDF_FILE_SIZE / (1024 * 1024));
      return `File size must be less than ${maxSizeMB}MB. Your file is ${Math.round(file.size / (1024 * 1024))}MB.`;
    }

    if (file.size < MIN_PDF_FILE_SIZE) {
      return 'File appears to be too small to be a valid PDF document.';
    }

    // Check file name
    if (!file.name || file.name.trim().length === 0) {
      return 'File must have a valid name.';
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) {
      return 'File must have a .pdf extension.';
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid filename characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])\.pdf$/i,  // Windows reserved names
      /^\./,  // Hidden files
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(fileName))) {
      return 'File name contains invalid characters or patterns.';
    }

    // Check file name length
    if (file.name.length > 255) {
      return 'File name is too long. Please use a shorter name.';
    }

    return null; // Valid file
  } catch (error) {
    console.error('Error validating PDF file:', error);
    return 'Unable to validate file. Please try again.';
  }
}

// Advanced PDF validation (for server-side use)
export function validatePDFFileAdvanced(
  file: { name: string; type: string; size: number },
  options: {
    maxSizeBytes?: number;
    minSizeBytes?: number;
    allowedExtensions?: string[];
    checkMimeType?: boolean;
  } = {}
): void {
  const {
    maxSizeBytes = MAX_PDF_FILE_SIZE,
    minSizeBytes = MIN_PDF_FILE_SIZE,
    allowedExtensions = ['.pdf'],
    checkMimeType = true,
  } = options;

  // Check MIME type
  if (checkMimeType && file.type !== 'application/pdf') {
    throw new ValidationError(
      'Invalid file type. Only PDF files are allowed.',
      'fileType',
      ErrorCode.INVALID_FILE_TYPE
    );
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
    throw new ValidationError(
      `File size exceeds the maximum limit of ${maxSizeMB}MB.`,
      'fileSize',
      ErrorCode.FILE_TOO_LARGE
    );
  }

  if (file.size < minSizeBytes) {
    throw new ValidationError(
      'File appears to be too small to be a valid PDF document.',
      'fileSize',
      ErrorCode.INVALID_PDF_FORMAT
    );
  }

  // Check file name
  if (!file.name || file.name.trim().length === 0) {
    throw new ValidationError(
      'File name is required.',
      'fileName',
      ErrorCode.MISSING_REQUIRED_FIELD
    );
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    throw new ValidationError(
      `File must have one of these extensions: ${allowedExtensions.join(', ')}`,
      'fileName',
      ErrorCode.INVALID_FILE_TYPE
    );
  }

  // Security checks
  const dangerousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])\.pdf$/i,  // Windows reserved names
    /^\./,  // Hidden files
    /\x00/,  // Null bytes
  ];

  if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
    throw new ValidationError(
      'File name contains invalid or potentially dangerous characters.',
      'fileName',
      ErrorCode.INVALID_FILE_TYPE
    );
  }

  // Check file name length
  if (file.name.length > 255) {
    throw new ValidationError(
      'File name is too long. Maximum length is 255 characters.',
      'fileName',
      ErrorCode.INVALID_FILE_TYPE
    );
  }
}

// PDF content validation (basic checks)
export async function validatePDFContent(fileBuffer: ArrayBuffer): Promise<void> {
  try {
    // Check PDF header
    const uint8Array = new Uint8Array(fileBuffer);
    const header = String.fromCharCode(...uint8Array.slice(0, 4));
    
    if (header !== '%PDF') {
      throw new ValidationError(
        'File does not appear to be a valid PDF document.',
        'fileContent',
        ErrorCode.INVALID_PDF_FORMAT
      );
    }

    // Check for minimum PDF structure
    const content = String.fromCharCode(...uint8Array);
    
    // Look for essential PDF elements
    const hasXref = content.includes('xref');
    const hasTrailer = content.includes('trailer');
    const hasEOF = content.includes('%%EOF');
    
    if (!hasXref || !hasTrailer || !hasEOF) {
      throw new ValidationError(
        'PDF file appears to be corrupted or incomplete.',
        'fileContent',
        ErrorCode.INVALID_PDF_FORMAT
      );
    }

    // Check for password protection (basic check)
    if (content.includes('/Encrypt')) {
      throw new ValidationError(
        'Password-protected PDFs are not supported. Please upload an unprotected PDF.',
        'fileContent',
        ErrorCode.INVALID_PDF_FORMAT
      );
    }

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    
    throw new ValidationError(
      'Unable to validate PDF content. The file may be corrupted.',
      'fileContent',
      ErrorCode.INVALID_PDF_FORMAT
    );
  }
}

// Batch PDF validation
export function validatePDFBatch(files: File[]): Array<{ file: File; error: string | null }> {
  const maxBatchSize = 10;
  
  if (files.length > maxBatchSize) {
    throw new ValidationError(
      `Cannot process more than ${maxBatchSize} files at once.`,
      'batch',
      ErrorCode.MISSING_REQUIRED_FIELD
    );
  }

  return files.map(file => ({
    file,
    error: validatePDFFile(file),
  }));
}

// Get validation summary
export function getValidationSummary(files: File[]): {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalSize: number;
  errors: string[];
} {
  const results = validatePDFBatch(files);
  const validFiles = results.filter(r => r.error === null);
  const invalidFiles = results.filter(r => r.error !== null);
  
  return {
    totalFiles: files.length,
    validFiles: validFiles.length,
    invalidFiles: invalidFiles.length,
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
    errors: invalidFiles.map(r => r.error!),
  };
}