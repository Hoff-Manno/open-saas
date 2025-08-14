# PDF Processing with Docling Integration - Task 3 ✅ COMPLETED

This module provides PDF-to-learning-module conversion using Mozilla AI's Docling library with comprehensive OCR support, background job processing, and error handling.

## Overview

Task 3 has been successfully implemented, integrating Mozilla AI's Docling library for advanced PDF-to-markdown conversion. The system provides:

- **Advanced PDF parsing** using Mozilla AI's Docling DocumentConverter
- **OCR support** for scanned documents (EasyOCR, Tesseract, RapidOCR) 
- **Vision Language Model** integration for image descriptions using SmolDocling
- **Background job processing** using PgBoss for scalability
- **Intelligent content sectioning** based on document structure
- **Progress tracking** with real-time status updates
- **Comprehensive error handling** and retry mechanisms

## Implementation Status ✅

### ✅ Completed Components

1. **DoclingService** (`doclingService.ts`) - Python integration service
2. **Background Jobs** (`jobs.ts`) - PgBoss job processing 
3. **Operations** (`operations.ts`) - API endpoints for processing requests
4. **Python Script** (`scripts/docling_processor.py`) - Docling integration
5. **Setup Script** (`scripts/setup_docling.sh`) - Dependency installation
6. **Wasp Integration** - Actions, queries, and job definitions

### ✅ Key Features Implemented

- ✅ Docling Python package integration (v2.44.0)
- ✅ Server-side PDF processing service using DocumentConverter
- ✅ OCR options configuration (EasyOCR, Tesseract, RapidOCR)
- ✅ Background job processing using existing PgBoss system
- ✅ Processing status tracking and error handling
- ✅ Malformed PDF error handling

## Architecture

```
PDF Upload → S3 Storage → Background Job Queue → Docling Processing → Structured Content → Database
```

## Setup

### 1. Install Python Dependencies

```bash
# Run the setup script
./scripts/setup_docling.sh

# Or manually install
pip3 install -r scripts/requirements.txt
```

### 2. Environment Variables

Add to your `.env.server`:

```bash
# Optional: Specify Python executable path
PYTHON_EXECUTABLE=python3
```

### 3. Verify Installation

```bash
# Check if Docling is available
python3 -c "import docling; print('Docling ready!')"
```

## Usage

### Processing a PDF

```typescript
import { processPDF } from '@wasp/actions';

// Start PDF processing
const result = await processPDF({
  fileId: 'uploaded-file-id',
  processingOptions: {
    enableOcr: true,  // Enable OCR for scanned documents
    enableVlm: true   // Enable Vision Language Model for images
  }
});

console.log('Module ID:', result.moduleId);
```

### Checking Processing Status

```typescript
import { getProcessingStatus } from '@wasp/queries';

const status = await getProcessingStatus({
  moduleId: 'learning-module-id'
});

console.log('Status:', status.status);     // PENDING, PROCESSING, COMPLETED, FAILED
console.log('Progress:', status.progress); // 0-100
console.log('Error:', status.error);       // Error message if failed
```

### Getting User's Learning Modules

```typescript
import { getUserLearningModules } from '@wasp/queries';

const modules = await getUserLearningModules({
  status: 'COMPLETED', // Optional filter
  limit: 10,
  offset: 0
});

console.log('Modules:', modules.modules);
console.log('Total:', modules.total);
```

## Processing Options

### OCR Configuration

Docling supports multiple OCR engines:

- **EasyOCR** (default) - Good balance of speed and accuracy
- **Tesseract** - High accuracy, slower processing
- **RapidOCR** - Fast processing, good for simple documents
- **OcrMac** - macOS native OCR (macOS only)

### Vision Language Model

When enabled, Docling uses SmolDocling VLM to:

- Generate descriptive alt text for images
- Extract context from charts and diagrams
- Classify document images
- Enhance accessibility

## Error Handling

The system handles various error scenarios:

### PDF Processing Errors

- **Invalid PDF format** - Returns clear error message
- **Corrupted files** - Graceful failure with retry option
- **OCR failures** - Falls back to text extraction without OCR
- **Memory issues** - Automatic cleanup of temporary files

### System Errors

- **Python not available** - Clear setup instructions
- **Docling not installed** - Dependency check with install guidance
- **S3 download failures** - Retry mechanism with exponential backoff
- **Database errors** - Transaction rollback and error logging

## Background Jobs

PDF processing runs as background jobs using PgBoss:

```typescript
// Job configuration in main.wasp
job processPDFJob {
  executor: PgBoss,
  perform: {
    fn: import { processPDFJob } from "@src/pdf-processing/jobs"
  },
  entities: [User, LearningModule, ModuleSection]
}
```

### Job Features

- **Retry logic** - Up to 3 retries with 1-minute delays
- **Timeout handling** - Jobs expire after 1 hour
- **Progress tracking** - Real-time status updates
- **Error recovery** - Failed jobs can be manually retried

## Performance Considerations

### Processing Time

- **Simple PDFs** - 10-30 seconds
- **Complex layouts** - 1-3 minutes
- **Scanned documents** - 2-5 minutes (with OCR)
- **Large files (>50MB)** - 5-10 minutes

### Resource Usage

- **Memory** - 500MB-2GB per processing job
- **CPU** - High during OCR and VLM processing
- **Storage** - Temporary files cleaned up automatically
- **Network** - S3 download/upload bandwidth

### Scaling

- **Horizontal scaling** - Multiple worker processes
- **Queue management** - PgBoss handles job distribution
- **Resource limits** - Configure based on server capacity
- **Monitoring** - Job status and error tracking

## Troubleshooting

### Common Issues

1. **"Docling not installed"**
   ```bash
   pip3 install docling
   ```

2. **"Python not found"**
   ```bash
   export PYTHON_EXECUTABLE=/usr/bin/python3
   ```

3. **"Processing stuck at PROCESSING"**
   - Check server logs for Python errors
   - Verify PDF file is not corrupted
   - Restart background job workers

4. **"OCR not working"**
   ```bash
   pip3 install easyocr pytesseract
   ```

### Debug Mode

Enable debug logging:

```bash
export DEBUG=pdf-processing
```

### Health Check

Check system health:

```typescript
import { checkDoclingHealth } from '@wasp/queries';

const health = await checkDoclingHealth({});
console.log('Available:', health.available);
console.log('Error:', health.error);
```

## Development

### Testing

```bash
# Test Python script directly
python3 scripts/docling_processor.py path/to/test.pdf

# Test with OCR disabled
python3 scripts/docling_processor.py path/to/test.pdf --no-ocr

# Test with VLM disabled
python3 scripts/docling_processor.py path/to/test.pdf --no-vlm
```

### Adding Features

1. **New processing options** - Update `DoclingProcessingOptions` interface
2. **Custom OCR engines** - Modify Python script OCR configuration
3. **Additional metadata** - Extend `DoclingMetadata` interface
4. **Custom section splitting** - Update `_create_sections` method

## Production Deployment

### Server Requirements

- **Python 3.8+** with pip
- **Memory** - Minimum 4GB RAM
- **Storage** - SSD recommended for temporary files
- **Network** - Stable connection to S3

### Environment Setup

```bash
# Install system dependencies
apt-get update
apt-get install python3 python3-pip

# Install Python packages
pip3 install -r scripts/requirements.txt

# Verify installation
python3 -c "import docling; print('Ready for production!')"
```

### Monitoring

- **Job queue status** - Monitor PgBoss dashboard
- **Processing times** - Track average processing duration
- **Error rates** - Monitor failed job percentage
- **Resource usage** - CPU, memory, and storage monitoring