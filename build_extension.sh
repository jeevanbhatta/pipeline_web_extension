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

# Create images directory
mkdir -p "$BUILD_DIR/images"
# Copy extension icons
cp -R images/* "$BUILD_DIR/images/" 2>/dev/null || :

# Copy all other files except build script and env files to build directory
rsync -av --progress *.js *.html *.txt *.css LICENSE README.md "$BUILD_DIR/" --exclude build

# Replace placeholder in manifest.json if still using one
if grep -q "\${CLIENT_ID}" manifest.json; then
  cp manifest.json "$BUILD_DIR/"
  # Use a temporary file for sed compatibility on macOS
  sed -i.bak "s|\${CLIENT_ID}|$CLIENT_ID|g" "$BUILD_DIR/manifest.json"
  rm "$BUILD_DIR/manifest.json.bak"
else
  # Just copy the manifest file as-is since client ID is hardcoded
  cp manifest.json "$BUILD_DIR/"
fi

echo "Build completed. Load the extension from the '$BUILD_DIR' directory."

# Calculate extension ID in a cross-platform way
if command -v sha256sum > /dev/null; then
  # Linux
  EXTENSION_ID=$(cd "$BUILD_DIR" && sha256sum manifest.json | head -c32)
elif command -v shasum > /dev/null; then
  # macOS
  EXTENSION_ID=$(cd "$BUILD_DIR" && shasum -a 256 manifest.json | awk '{print $1}' | head -c32)
else
  EXTENSION_ID="[Could not calculate extension ID - sha256sum/shasum not available]"
fi

echo "Extension ID: $EXTENSION_ID"
echo "Make sure this ID matches the one in Google Cloud Console OAuth configuration."
