#!/bin/bash

# Setup script for Docling PDF processing dependencies
# This script installs the required Python packages for PDF processing

echo "Setting up Docling PDF processing dependencies..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    echo "Please install Python 3 and try again."
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is required but not installed."
    echo "Please install pip3 and try again."
    exit 1
fi

# Install requirements
echo "Installing Python dependencies..."
pip3 install -r scripts/requirements.txt

# Verify installation
echo "Verifying Docling installation..."
python3 -c "import docling; print('✅ Docling installed successfully')" || {
    echo "❌ Docling installation failed"
    exit 1
}

echo "✅ Setup complete! Docling is ready for PDF processing."
echo ""
echo "Note: For production deployment, make sure to:"
echo "1. Install Python 3.8+ on your server"
echo "2. Run this setup script on your server"
echo "3. Set PYTHON_EXECUTABLE environment variable if needed"