// Error Handling Components for Frontend
import React from 'react';
import { AlertTriangle, RefreshCw, ExternalLink, HelpCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

// Error types that match backend error codes
export enum ErrorCode {
  // Validation errors
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_PDF_FORMAT = 'INVALID_PDF_FORMAT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Processing errors
  PDF_PROCESSING_FAILED = 'PDF_PROCESSING_FAILED',
  DOCLING_SERVICE_UNAVAILABLE = 'DOCLING_SERVICE_UNAVAILABLE',
  OCR_PROCESSING_FAILED = 'OCR_PROCESSING_FAILED',
  CONTENT_EXTRACTION_FAILED = 'CONTENT_EXTRACTION_FAILED',
  
  // Permission errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  MODULE_ACCESS_DENIED = 'MODULE_ACCESS_DENIED',
  ORGANIZATION_ACCESS_DENIED = 'ORGANIZATION_ACCESS_DENIED',
  ADMIN_REQUIRED = 'ADMIN_REQUIRED',
  
  // Subscription errors
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  MODULE_LIMIT_EXCEEDED = 'MODULE_LIMIT_EXCEEDED',
  USER_LIMIT_EXCEEDED = 'USER_LIMIT_EXCEEDED',
  API_ACCESS_REQUIRED = 'API_ACCESS_REQUIRED',
  
  // Rate limiting errors
  PROCESSING_RATE_LIMIT = 'PROCESSING_RATE_LIMIT',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  UPLOAD_RATE_LIMIT = 'UPLOAD_RATE_LIMIT',
  
  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  QUEUE_ERROR = 'QUEUE_ERROR',
}

// Recovery action interface
export interface RecoveryAction {
  action: string;
  label: string;
  url?: string;
  onClick?: () => void;
  primary?: boolean;
}

// Error response interface
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    retryable?: boolean;
    retryAfter?: number;
  };
}

// Props for error components
interface ErrorDisplayProps {
  error: ErrorResponse['error'] | Error | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

// Main error display component
export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  showDetails = false,
  className = '' 
}: ErrorDisplayProps) {
  const errorInfo = parseError(error);
  const recoveryActions = getRecoveryActions(errorInfo.code, { onRetry });

  return (
    <Alert className={`border-red-200 bg-red-50 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-800">
        {getErrorTitle(errorInfo.code)}
      </AlertTitle>
      <AlertDescription className="text-red-700">
        <div className="space-y-3">
          <p>{errorInfo.message}</p>
          
          {errorInfo.retryAfter && (
            <p className="text-sm">
              Please wait {errorInfo.retryAfter} seconds before trying again.
            </p>
          )}
          
          {showDetails && errorInfo.details && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Technical Details</summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                {JSON.stringify(errorInfo.details, null, 2)}
              </pre>
            </details>
          )}
          
          {recoveryActions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {recoveryActions.map((action, index) => (
                <RecoveryButton key={index} action={action} />
              ))}
            </div>
          )}
          
          {onDismiss && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              className="mt-2"
            >
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Compact error banner for inline display
export function ErrorBanner({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  const errorInfo = parseError(error);
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-red-800">{errorInfo.message}</p>
          {(onRetry || onDismiss) && (
            <div className="mt-2 flex gap-2">
              {onRetry && errorInfo.retryable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
              )}
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-red-700 hover:bg-red-100"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Error card for dedicated error pages
export function ErrorCard({ error, onRetry, className = '' }: ErrorDisplayProps) {
  const errorInfo = parseError(error);
  const recoveryActions = getRecoveryActions(errorInfo.code, { onRetry });

  return (
    <Card className={`border-red-200 ${className}`}>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-red-800">
          {getErrorTitle(errorInfo.code)}
        </CardTitle>
        <CardDescription className="text-red-600">
          {errorInfo.message}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recoveryActions.length > 0 && (
          <div className="flex flex-col gap-2">
            {recoveryActions.map((action, index) => (
              <RecoveryButton key={index} action={action} variant="full" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Recovery action button
function RecoveryButton({ 
  action, 
  variant = 'compact' 
}: { 
  action: RecoveryAction; 
  variant?: 'compact' | 'full' 
}) {
  const buttonProps = {
    variant: action.primary ? 'default' : 'outline' as const,
    size: variant === 'compact' ? 'sm' : 'default' as const,
    className: variant === 'full' ? 'w-full justify-start' : '',
  };

  if (action.url) {
    return (
      <Button
        {...buttonProps}
        onClick={() => window.open(action.url, '_blank')}
      >
        {action.label}
        <ExternalLink className="h-3 w-3 ml-1" />
      </Button>
    );
  }

  return (
    <Button {...buttonProps} onClick={action.onClick}>
      {action.action === 'retry' && <RefreshCw className="h-3 w-3 mr-1" />}
      {action.action === 'help' && <HelpCircle className="h-3 w-3 mr-1" />}
      {action.label}
    </Button>
  );
}

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<{ error: Error; retry: () => void }> }>,
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      return (
        <ErrorCard
          error={this.state.error}
          onRetry={this.retry}
          className="m-4"
        />
      );
    }

    return this.props.children;
  }
}

// Utility functions
function parseError(error: ErrorResponse['error'] | Error | string) {
  if (typeof error === 'string') {
    return {
      code: ErrorCode.DATABASE_ERROR,
      message: error,
      retryable: false,
    };
  }

  if (error instanceof Error) {
    return {
      code: ErrorCode.DATABASE_ERROR,
      message: error.message,
      retryable: false,
    };
  }

  return error;
}

function getErrorTitle(code: ErrorCode): string {
  const titles: Record<ErrorCode, string> = {
    [ErrorCode.INVALID_FILE_TYPE]: 'Invalid File Type',
    [ErrorCode.FILE_TOO_LARGE]: 'File Too Large',
    [ErrorCode.INVALID_PDF_FORMAT]: 'Invalid PDF',
    [ErrorCode.MISSING_REQUIRED_FIELD]: 'Missing Information',
    [ErrorCode.PDF_PROCESSING_FAILED]: 'Processing Failed',
    [ErrorCode.DOCLING_SERVICE_UNAVAILABLE]: 'Service Unavailable',
    [ErrorCode.OCR_PROCESSING_FAILED]: 'Text Extraction Failed',
    [ErrorCode.CONTENT_EXTRACTION_FAILED]: 'Content Extraction Failed',
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Access Denied',
    [ErrorCode.MODULE_ACCESS_DENIED]: 'Module Access Denied',
    [ErrorCode.ORGANIZATION_ACCESS_DENIED]: 'Organization Access Denied',
    [ErrorCode.ADMIN_REQUIRED]: 'Admin Access Required',
    [ErrorCode.SUBSCRIPTION_REQUIRED]: 'Subscription Required',
    [ErrorCode.MODULE_LIMIT_EXCEEDED]: 'Module Limit Reached',
    [ErrorCode.USER_LIMIT_EXCEEDED]: 'User Limit Reached',
    [ErrorCode.API_ACCESS_REQUIRED]: 'API Access Required',
    [ErrorCode.PROCESSING_RATE_LIMIT]: 'Processing Rate Limited',
    [ErrorCode.API_RATE_LIMIT]: 'Rate Limited',
    [ErrorCode.UPLOAD_RATE_LIMIT]: 'Upload Rate Limited',
    [ErrorCode.DATABASE_ERROR]: 'System Error',
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'Service Error',
    [ErrorCode.STORAGE_ERROR]: 'Storage Error',
    [ErrorCode.QUEUE_ERROR]: 'Processing Queue Error',
  };

  return titles[code] || 'Unknown Error';
}

function getRecoveryActions(
  code: ErrorCode, 
  options: { onRetry?: () => void } = {}
): RecoveryAction[] {
  const { onRetry } = options;

  const actionMap: Partial<Record<ErrorCode, RecoveryAction[]>> = {
    [ErrorCode.INVALID_FILE_TYPE]: [
      { action: 'retry', label: 'Upload Different File', onClick: onRetry, primary: true },
      { action: 'help', label: 'Supported File Types', url: '/help/file-types' },
    ],
    [ErrorCode.FILE_TOO_LARGE]: [
      { action: 'retry', label: 'Upload Smaller File', onClick: onRetry, primary: true },
      { action: 'help', label: 'Compress PDF', url: '/help/compress-pdf' },
    ],
    [ErrorCode.PDF_PROCESSING_FAILED]: [
      { action: 'retry', label: 'Try Again', onClick: onRetry, primary: true },
      { action: 'help', label: 'Contact Support', url: '/support' },
    ],
    [ErrorCode.MODULE_LIMIT_EXCEEDED]: [
      { action: 'upgrade', label: 'Upgrade Plan', url: '/pricing', primary: true },
      { action: 'manage', label: 'Manage Modules', url: '/modules' },
    ],
    [ErrorCode.USER_LIMIT_EXCEEDED]: [
      { action: 'upgrade', label: 'Upgrade Plan', url: '/pricing', primary: true },
      { action: 'manage', label: 'Manage Team', url: '/team' },
    ],
    [ErrorCode.SUBSCRIPTION_REQUIRED]: [
      { action: 'subscribe', label: 'Choose Plan', url: '/pricing', primary: true },
      { action: 'trial', label: 'Start Free Trial', url: '/trial' },
    ],
  };

  const actions = actionMap[code] || [];
  
  // Add default retry action if retryable and no specific retry action exists
  if (onRetry && !actions.some(a => a.action === 'retry')) {
    actions.unshift({ action: 'retry', label: 'Try Again', onClick: onRetry });
  }

  // Add default support action if no other actions
  if (actions.length === 0) {
    actions.push(
      { action: 'retry', label: 'Try Again', onClick: onRetry },
      { action: 'help', label: 'Contact Support', url: '/support' }
    );
  }

  return actions.filter(Boolean);
}

// Hook for handling errors in components
export function useErrorHandler() {
  const [error, setError] = React.useState<ErrorResponse['error'] | null>(null);

  const handleError = React.useCallback((err: any) => {
    console.error('Handled error:', err);
    
    // Parse different error formats
    if (err?.error) {
      setError(err.error);
    } else if (err instanceof Error) {
      setError({
        code: ErrorCode.DATABASE_ERROR,
        message: err.message,
        retryable: false,
      });
    } else if (typeof err === 'string') {
      setError({
        code: ErrorCode.DATABASE_ERROR,
        message: err,
        retryable: false,
      });
    } else {
      setError({
        code: ErrorCode.DATABASE_ERROR,
        message: 'An unexpected error occurred',
        retryable: false,
      });
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    hasError: error !== null,
  };
}