// PDF-specific validation for learning modules
// Set this to the max PDF file size (currently 50MB for large documents)
export const MAX_PDF_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// Only allow PDF files for learning modules
export const ALLOWED_PDF_FILE_TYPES = ['application/pdf'] as const;

export type AllowedPDFFileType = (typeof ALLOWED_PDF_FILE_TYPES)[number];