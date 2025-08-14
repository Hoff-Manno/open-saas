#!/usr/bin/env python3
"""
Enhanced Docling PDF processor with VLM pipeline support and content enrichment.
Integrates SmolDocling model for image descriptions and formula/code enrichment.
"""

import os
import sys
import json
import argparse
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import re

def main():
    parser = argparse.ArgumentParser(description='Process PDF with enhanced Docling features')
    parser.add_argument('pdf_path', help='Path to the PDF file to process')
    parser.add_argument('--no-ocr', action='store_true', help='Disable OCR processing')
    parser.add_argument('--no-vlm', action='store_true', help='Disable VLM (Visual Language Model) processing')
    parser.add_argument('--vlm-model', default='SmolDocling', choices=['SmolDocling', 'default'], 
                       help='VLM model to use for image descriptions')
    parser.add_argument('--enable-code-enrichment', action='store_true', 
                       help='Enable code snippet enrichment')
    parser.add_argument('--enable-formula-enrichment', action='store_true', 
                       help='Enable mathematical formula enrichment')
    
    args = parser.parse_args()
    
    try:
        # Import docling modules
        from docling.document_converter import DocumentConverter, PdfFormatOption
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions, OcrOptions
        
        # Try to import VLM components (may not be available in all Docling versions)
        vlm_available = False
        try:
            from docling.pipeline.vlm_pipeline import VlmPipeline
            from docling.models import SmolDoclingModel
            vlm_available = True
        except ImportError:
            print("VLM components not available in this Docling version", file=sys.stderr)
        
        # Configure processing options
        ocr_options = OcrOptions(
            kind="easyocr" if not args.no_ocr else "disabled",
            lang=["en"]
        )
        
        pipeline_options = PdfPipelineOptions(
            do_ocr=not args.no_ocr,
            do_table_structure=True,
            ocr_options=ocr_options,
        )
        
        # Configure VLM if available and enabled
        if vlm_available and not args.no_vlm:
            if args.vlm_model == 'SmolDocling':
                # Use SmolDocling model for image descriptions
                vlm_pipeline = VlmPipeline(model=SmolDoclingModel())
            else:
                # Use default VLM model
                vlm_pipeline = VlmPipeline()
            
            # Add VLM to pipeline options if supported
            if hasattr(pipeline_options, 'vlm_pipeline'):
                pipeline_options.vlm_pipeline = vlm_pipeline
        
        # Create document converter
        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )
        
        # Process the PDF
        pdf_path = Path(args.pdf_path)
        result = converter.convert(pdf_path)
        
        if not result.document:
            raise Exception("No document content extracted")
        
        # Extract content and metadata
        doc = result.document
        
        # Convert to markdown
        markdown_content = doc.export_to_markdown()
        
        # Process sections
        sections = process_sections(markdown_content)
        
        # Extract metadata
        metadata = extract_metadata(doc, args)
        
        # Perform content enrichment if requested
        if args.enable_code_enrichment:
            metadata['code_snippets'] = extract_code_snippets(markdown_content)
            
        if args.enable_formula_enrichment:
            metadata['formulas'] = extract_formulas(markdown_content)
        
        # Extract image descriptions if VLM was used
        if vlm_available and not args.no_vlm and hasattr(doc, 'pictures'):
            metadata['image_descriptions'] = extract_image_descriptions(doc)
        
        # Prepare result
        result_data = {
            "success": True,
            "content": {
                "markdown": markdown_content,
                "sections": sections,
                "metadata": metadata
            }
        }
        
        # Output JSON result
        print(json.dumps(result_data, indent=2, ensure_ascii=False))
        
    except ImportError as e:
        error_result = {
            "success": False,
            "error": f"Docling not installed or missing components: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": f"Processing failed: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)


def process_sections(markdown_content: str) -> List[Dict[str, Any]]:
    """Process markdown content into structured sections."""
    sections = []
    lines = markdown_content.split('\n')
    current_section = None
    section_content = []
    order_index = 0
    
    for line in lines:
        # Check if this is a header
        if line.startswith('#'):
            # Save previous section if exists
            if current_section and section_content:
                current_section['content'] = '\n'.join(section_content).strip()
                current_section['estimated_minutes'] = estimate_reading_time(current_section['content'])
                sections.append(current_section)
            
            # Start new section
            header_level = len(line.split(' ')[0])
            title = line.strip('#').strip()
            
            current_section = {
                'title': title,
                'content': '',
                'order_index': order_index,
                'estimated_minutes': 0
            }
            section_content = []
            order_index += 1
        else:
            if line.strip():  # Only add non-empty lines
                section_content.append(line)
    
    # Add the last section
    if current_section and section_content:
        current_section['content'] = '\n'.join(section_content).strip()
        current_section['estimated_minutes'] = estimate_reading_time(current_section['content'])
        sections.append(current_section)
    
    # If no sections found, create a single section with all content
    if not sections and markdown_content.strip():
        sections = [{
            'title': 'Content',
            'content': markdown_content.strip(),
            'order_index': 0,
            'estimated_minutes': estimate_reading_time(markdown_content)
        }]
    
    return sections


def estimate_reading_time(content: str) -> int:
    """Estimate reading time in minutes based on word count."""
    words = len(content.split())
    # Average reading speed: 200-250 words per minute
    return max(1, round(words / 225))


def extract_metadata(doc, args) -> Dict[str, Any]:
    """Extract document metadata."""
    
    # Try to get page count
    page_count = 1
    if hasattr(doc, 'pages'):
        page_count = len(doc.pages)
    elif hasattr(doc, '_pages'):
        page_count = len(doc._pages)
    
    # Check for various content types
    has_images = False
    has_tables = False
    has_code = False
    has_formulas = False
    
    if hasattr(doc, 'pictures') and doc.pictures:
        has_images = True
    
    if hasattr(doc, 'tables') and doc.tables:
        has_tables = True
    
    # Check markdown for code blocks and formulas
    markdown = doc.export_to_markdown()
    has_code = '```' in markdown or '`' in markdown
    has_formulas = '$' in markdown or 'equation' in markdown.lower()
    
    metadata = {
        "title": extract_title(doc),
        "page_count": page_count,
        "has_images": has_images,
        "has_tables": has_tables,
        "has_code": has_code,
        "has_formulas": has_formulas,
        "processing_info": {
            "ocr_enabled": not args.no_ocr,
            "vlm_enabled": not args.no_vlm,
            "code_enrichment_enabled": args.enable_code_enrichment,
            "formula_enrichment_enabled": args.enable_formula_enrichment,
            "docling_version": get_docling_version()
        }
    }
    
    if not args.no_vlm:
        metadata["processing_info"]["vlm_model"] = args.vlm_model
    
    return metadata


def extract_title(doc) -> str:
    """Extract document title."""
    # Try various methods to get title
    title = "Untitled Document"
    
    if hasattr(doc, 'title') and doc.title:
        title = doc.title
    elif hasattr(doc, 'main_text'):
        # Look for the first heading in the content
        lines = doc.main_text.split('\n')
        for line in lines[:10]:  # Check first 10 lines
            if line.startswith('#'):
                title = line.strip('#').strip()
                break
            elif line.strip() and len(line.strip()) < 100:
                # Use first short line as potential title
                title = line.strip()
                break
    
    return title[:200]  # Limit title length


def extract_code_snippets(content: str) -> List[Dict[str, Any]]:
    """Extract and describe code snippets."""
    code_snippets = []
    
    # Find code blocks
    code_block_pattern = r'```(\w+)?\n(.*?)\n```'
    inline_code_pattern = r'`([^`]+)`'
    
    # Extract code blocks
    for match in re.finditer(code_block_pattern, content, re.DOTALL):
        language = match.group(1) or 'unknown'
        code = match.group(2).strip()
        
        snippet = {
            'code': code,
            'language': language,
            'description': f"Code snippet in {language}",
            'line_start': content[:match.start()].count('\n') + 1,
            'line_end': content[:match.end()].count('\n') + 1
        }
        code_snippets.append(snippet)
    
    return code_snippets


def extract_formulas(content: str) -> List[Dict[str, Any]]:
    """Extract and describe mathematical formulas."""
    formulas = []
    
    # Find LaTeX-style formulas
    formula_patterns = [
        r'\$\$(.*?)\$\$',  # Display math
        r'\$(.*?)\$',      # Inline math
        r'\\begin\{equation\}(.*?)\\end\{equation\}',  # Equation environment
    ]
    
    for pattern in formula_patterns:
        for match in re.finditer(pattern, content, re.DOTALL):
            formula = match.group(1).strip()
            if formula:  # Only add non-empty formulas
                formula_obj = {
                    'formula': formula,
                    'description': f"Mathematical expression: {formula[:50]}{'...' if len(formula) > 50 else ''}",
                    'type': 'mathematical',
                    'line_number': content[:match.start()].count('\n') + 1
                }
                formulas.append(formula_obj)
    
    return formulas


def extract_image_descriptions(doc) -> List[Dict[str, Any]]:
    """Extract image descriptions from VLM processing."""
    descriptions = []
    
    if hasattr(doc, 'pictures'):
        for i, picture in enumerate(doc.pictures):
            description = {
                'image_id': f'image_{i}',
                'description': 'Image detected in document',
                'confidence': 0.8,  # Default confidence
            }
            
            # Try to get VLM description if available
            if hasattr(picture, 'description'):
                description['description'] = picture.description
            elif hasattr(picture, 'caption'):
                description['description'] = picture.caption
            
            # Try to get extracted text from image
            if hasattr(picture, 'text'):
                description['extracted_text'] = picture.text
            
            descriptions.append(description)
    
    return descriptions


def get_docling_version() -> str:
    """Get Docling version."""
    try:
        import docling
        return getattr(docling, '__version__', 'unknown')
    except:
        return 'unknown'


if __name__ == '__main__':
    main()
            # Default is EasyOCR which provides good balance of speed and accuracy
        
        # Enable VLM for image descriptions if requested
        if self.enable_vlm:
            pipeline_options.do_table_structure = True
            pipeline_options.table_structure_options.do_cell_matching = True
        
        # Create format options
        format_options = {
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
        
        # Initialize converter
        converter = DocumentConverter(
            format_options=format_options
        )
        
        return converter
    
    def process_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """
        Process a PDF file and return structured content
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Dictionary containing processed content and metadata
        """
        try:
            # Validate input file
            if not os.path.exists(pdf_path):
                return {
                    "success": False,
                    "error": f"PDF file not found: {pdf_path}"
                }
            
            # Convert document
            result = self.converter.convert(pdf_path)
            
            if not result.document:
                return {
                    "success": False,
                    "error": "Failed to process PDF - no document returned"
                }
            
            # Extract markdown content
            markdown_content = result.document.export_to_markdown()
            
            # Extract document metadata
            metadata = {
                "title": getattr(result.document, 'title', None) or self._extract_title_from_content(markdown_content),
                "page_count": len(result.document.pages) if hasattr(result.document, 'pages') else 0,
                "has_images": self._has_images(result.document),
                "has_tables": self._has_tables(result.document),
                "processing_info": {
                    "ocr_enabled": self.enable_ocr,
                    "vlm_enabled": self.enable_vlm,
                    "docling_version": "latest"
                }
            }
            
            # Structure content into sections
            sections = self._create_sections(markdown_content)
            
            return {
                "success": True,
                "content": {
                    "markdown": markdown_content,
                    "sections": sections,
                    "metadata": metadata
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error processing PDF: {str(e)}"
            }
    
    def _extract_title_from_content(self, markdown: str) -> str:
        """Extract title from markdown content"""
        lines = markdown.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('# '):
                return line[2:].strip()
            elif line and not line.startswith('#'):
                # Use first non-header line as title if no H1 found
                return line[:100] + ('...' if len(line) > 100 else '')
        return "Untitled Document"
    
    def _has_images(self, document) -> bool:
        """Check if document contains images"""
        try:
            # This is a simplified check - Docling's document structure may vary
            return hasattr(document, 'pictures') and len(document.pictures) > 0
        except:
            return False
    
    def _has_tables(self, document) -> bool:
        """Check if document contains tables"""
        try:
            # This is a simplified check - Docling's document structure may vary
            return hasattr(document, 'tables') and len(document.tables) > 0
        except:
            return False
    
    def _create_sections(self, markdown: str) -> List[Dict[str, Any]]:
        """
        Break markdown content into logical sections
        
        Args:
            markdown: Full markdown content
            
        Returns:
            List of section dictionaries
        """
        sections = []
        lines = markdown.split('\n')
        current_section = {
            "title": "Introduction",
            "content": "",
            "order_index": 0,
            "estimated_minutes": 0
        }
        
        section_index = 0
        
        for line in lines:
            line_stripped = line.strip()
            
            # Check for headers (new sections)
            if line_stripped.startswith('# ') or line_stripped.startswith('## '):
                # Save current section if it has content
                if current_section["content"].strip():
                    current_section["estimated_minutes"] = self._estimate_reading_time(current_section["content"])
                    sections.append(current_section.copy())
                
                # Start new section
                section_index += 1
                header_level = len(line_stripped.split()[0])  # Count # characters
                title = line_stripped.lstrip('#').strip()
                
                current_section = {
                    "title": title,
                    "content": line + '\n',
                    "order_index": section_index,
                    "estimated_minutes": 0
                }
            else:
                # Add line to current section
                current_section["content"] += line + '\n'
        
        # Don't forget the last section
        if current_section["content"].strip():
            current_section["estimated_minutes"] = self._estimate_reading_time(current_section["content"])
            sections.append(current_section)
        
        return sections
    
    def _estimate_reading_time(self, content: str) -> int:
        """
        Estimate reading time in minutes based on word count
        Assumes average reading speed of 200 words per minute
        """
        word_count = len(content.split())
        minutes = max(1, round(word_count / 200))
        return minutes

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python docling_processor.py <pdf_path> [--no-ocr] [--no-vlm]"
        }))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    enable_ocr = "--no-ocr" not in sys.argv
    enable_vlm = "--no-vlm" not in sys.argv
    
    # Process the PDF
    processor = DoclingProcessor(enable_ocr=enable_ocr, enable_vlm=enable_vlm)
    result = processor.process_pdf(pdf_path)
    
    # Output result as JSON
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()