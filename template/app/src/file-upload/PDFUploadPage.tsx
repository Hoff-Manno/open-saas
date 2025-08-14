import { FormEvent, useEffect, useState } from 'react';
import { getAllPDFFilesByUser, getPDFDownloadSignedURL, useQuery } from 'wasp/client/operations';
import type { File } from 'wasp/entities';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { cn } from '../lib/utils';
import {
  type PDFUploadError,
  type PDFFileWithValidType,
  uploadPDFWithProgress,
  validatePDFFile,
} from './pdfUploading';
import { ALLOWED_PDF_FILE_TYPES } from './pdfValidation';

export default function PDFUploadPage() {
  const [fileKeyForS3, setFileKeyForS3] = useState<File['key']>('');
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const [uploadError, setUploadError] = useState<PDFUploadError | null>(null);

  const allUserPDFs = useQuery(getAllPDFFilesByUser, undefined, {
    // We disable automatic refetching because otherwise files would be refetched after `createPDFFile` is called and the S3 URL is returned,
    // which happens before the file is actually fully uploaded. Instead, we manually (re)fetch on mount and after the upload is complete.
    enabled: false,
  });
  const { isLoading: isDownloadUrlLoading, refetch: refetchDownloadUrl } = useQuery(
    getPDFDownloadSignedURL,
    { key: fileKeyForS3 },
    { enabled: false }
  );

  useEffect(() => {
    allUserPDFs.refetch();
  }, []);

  useEffect(() => {
    if (fileKeyForS3.length > 0) {
      refetchDownloadUrl()
        .then((urlQuery) => {
          switch (urlQuery.status) {
            case 'error':
              console.error('Error fetching download URL', urlQuery.error);
              alert('Error fetching download');
              return;
            case 'success':
              window.open(urlQuery.data, '_blank');
              return;
          }
        })
        .finally(() => {
          setFileKeyForS3('');
        });
    }
  }, [fileKeyForS3]);

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();

      const formElement = e.target;
      if (!(formElement instanceof HTMLFormElement)) {
        throw new Error('Event target is not a form element');
      }

      const formData = new FormData(formElement);
      const file = formData.get('pdf-upload');

      if (!file || !(file instanceof File)) {
        setUploadError({
          message: 'Please select a PDF file to upload.',
          code: 'NO_FILE',
        });
        return;
      }

      const fileValidationError = validatePDFFile(file);
      if (fileValidationError !== null) {
        setUploadError(fileValidationError);
        return;
      }

      await uploadPDFWithProgress({ file: file as PDFFileWithValidType, setUploadProgressPercent });
      formElement.reset();
      allUserPDFs.refetch();
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setUploadError({
        message:
          error instanceof Error ? error.message : 'An unexpected error occurred while uploading the PDF.',
        code: 'UPLOAD_FAILED',
      });
    } finally {
      setUploadProgressPercent(0);
    }
  };

  return (
    <div className='py-10 lg:mt-10'>
      <div className='mx-auto max-w-7xl px-6 lg:px-8'>
        <div className='mx-auto max-w-4xl text-center'>
          <h2 className='mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl'>
            <span className='text-primary'>PDF</span> Learning Modules
          </h2>
        </div>
        <p className='mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-muted-foreground'>
          Upload PDF documents to automatically convert them into interactive learning modules. 
          Our AI-powered system will process your PDFs and create structured learning experiences.
        </p>
        <Card className='my-8'>
          <CardContent className='space-y-10 my-10 py-8 px-4 mx-auto sm:max-w-lg'>
            <form onSubmit={handleUpload} className='flex flex-col gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='pdf-upload' className='text-sm font-medium text-foreground'>
                  Select a PDF file to upload (max 50MB)
                </Label>
                <Input
                  type='file'
                  id='pdf-upload'
                  name='pdf-upload'
                  accept={ALLOWED_PDF_FILE_TYPES.join(',')}
                  onChange={() => setUploadError(null)}
                  className='cursor-pointer'
                />
                <p className='text-xs text-muted-foreground'>
                  Supported formats: PDF files only. Complex layouts, tables, and images are supported.
                </p>
              </div>
              <div className='space-y-2'>
                <Button type='submit' disabled={uploadProgressPercent > 0} className='w-full'>
                  {uploadProgressPercent > 0 ? `Uploading ${uploadProgressPercent}%` : 'Upload PDF'}
                </Button>
                {uploadProgressPercent > 0 && <Progress value={uploadProgressPercent} className='w-full' />}
              </div>
              {uploadError && (
                <Alert variant='destructive'>
                  <AlertDescription>{uploadError.message}</AlertDescription>
                </Alert>
              )}
            </form>
            <div className='border-b-2 border-border'></div>
            <div className='space-y-4 col-span-full'>
              <CardTitle className='text-xl font-bold text-foreground'>Uploaded PDFs</CardTitle>
              {allUserPDFs.isLoading && <p className='text-muted-foreground'>Loading...</p>}
              {allUserPDFs.error && (
                <Alert variant='destructive'>
                  <AlertDescription>Error: {allUserPDFs.error.message}</AlertDescription>
                </Alert>
              )}
              {!!allUserPDFs.data && allUserPDFs.data.length > 0 && !allUserPDFs.isLoading ? (
                <div className='space-y-3'>
                  {allUserPDFs.data.map((file: File) => (
                    <Card key={file.key} className='p-4'>
                      <div
                        className={cn(
                          'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3',
                          {
                            'opacity-70': file.key === fileKeyForS3 && isDownloadUrlLoading,
                          }
                        )}
                      >
                        <div className='flex-1'>
                          <p className='text-foreground font-medium'>{file.name}</p>
                          <p className='text-xs text-muted-foreground'>
                            Uploaded {new Date(file.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className='flex gap-2'>
                          <Button
                            onClick={() => setFileKeyForS3(file.key)}
                            disabled={file.key === fileKeyForS3 && isDownloadUrlLoading}
                            variant='outline'
                            size='sm'
                          >
                            {file.key === fileKeyForS3 && isDownloadUrlLoading ? 'Loading...' : 'Download'}
                          </Button>
                          <Button
                            variant='default'
                            size='sm'
                            onClick={() => {
                              // TODO: Navigate to module creation/processing page
                              console.log('Process PDF:', file.key);
                            }}
                          >
                            Process
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8'>
                  <p className='text-muted-foreground'>No PDFs uploaded yet</p>
                  <p className='text-sm text-muted-foreground mt-2'>
                    Upload your first PDF to get started with creating learning modules
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}