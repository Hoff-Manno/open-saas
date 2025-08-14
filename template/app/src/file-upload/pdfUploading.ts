import { createPDFFile } from 'wasp/client/operations';
import axios from 'axios';
import { ALLOWED_PDF_FILE_TYPES, MAX_PDF_FILE_SIZE_BYTES, type AllowedPDFFileType } from './pdfValidation';

export type PDFFileWithValidType = Omit<File, 'type'> & { type: AllowedPDFFileType };

interface PDFUploadProgress {
  file: PDFFileWithValidType;
  setUploadProgressPercent: (percentage: number) => void;
}

export async function uploadPDFWithProgress({ file, setUploadProgressPercent }: PDFUploadProgress) {
  const { s3UploadUrl, s3UploadFields } = await createPDFFile({ fileType: file.type, fileName: file.name });

  const formData = getPDFUploadFormData(file, s3UploadFields);

  return axios.post(s3UploadUrl, formData, {
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        setUploadProgressPercent(percentage);
      }
    },
  });
}

function getPDFUploadFormData(file: File, s3UploadFields: Record<string, string>) {
  const formData = new FormData();
  Object.entries(s3UploadFields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', file);
  return formData;
}

export interface PDFUploadError {
  message: string;
  code: 'NO_FILE' | 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE' | 'UPLOAD_FAILED';
}

export function validatePDFFile(file: File): PDFUploadError | null {
  if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
    return {
      message: `PDF file size exceeds ${MAX_PDF_FILE_SIZE_BYTES / 1024 / 1024}MB limit.`,
      code: 'FILE_TOO_LARGE' as const,
    };
  }

  if (!isAllowedPDFFileType(file.type)) {
    return {
      message: `File type '${file.type}' is not supported. Only PDF files are allowed.`,
      code: 'INVALID_FILE_TYPE' as const,
    };
  }

  return null;
}

function isAllowedPDFFileType(fileType: string): fileType is AllowedPDFFileType {
  return (ALLOWED_PDF_FILE_TYPES as readonly string[]).includes(fileType);
}