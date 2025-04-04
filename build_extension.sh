#!/bin/bash

# This script builds the extension by injecting environment variables into the manifest
# Ensure this file is executable with: chmod +x build_extension.sh

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check if CLIENT_ID is defined
if [ -z "$CLIENT_ID" ]; then
  echo "Error: CLIENT_ID is not defined. Please set it in .env file or environment."
  exit 1
fi

# Create build directory if it doesn't exist
BUILD_DIR="build"
rm -rf "$BUILD_DIR" # Clean previous build
mkdir -p "$BUILD_DIR"

# Copy all files except build script and env files to build directory
rsync -av --progress ./* "$BUILD_DIR/" --exclude build --exclude build_extension.sh --exclude '.env' --exclude '.git' --exclude '.gitignore'

# Replace placeholder in manifest with actual CLIENT_ID
# Use a temporary file for sed compatibility on macOS
sed -i.bak "s/\${CLIENT_ID}/$CLIENT_ID/g" "$BUILD_DIR/manifest.json"
rm "$BUILD_DIR/manifest.json.bak"

echo "Build completed. Load the extension from the '$BUILD_DIR' directory."
