#!/bin/bash

# This script builds the extension by injecting environment variables into the manifest and config files
# Ensure this file is executable with: chmod +x build_extension.sh

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check required environment variables
REQUIRED_VARS=("CLIENT_ID" "FIREBASE_API_KEY" "FIREBASE_AUTH_DOMAIN" "FIREBASE_PROJECT_ID" "FIREBASE_STORAGE_BUCKET" "FIREBASE_MESSAGING_SENDER_ID" "FIREBASE_APP_ID")
MISSING_VARS=()
for VAR_NAME in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR_NAME}" ]; then
    MISSING_VARS+=("$VAR_NAME")
  fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo "Error: The following environment variables are not defined. Please set them in .env file or environment:"
  for VAR_NAME in "${MISSING_VARS[@]}"; do
    echo " - $VAR_NAME"
  done
  exit 1
fi

# Create build directory if it doesn't exist
BUILD_DIR="build"
rm -rf "$BUILD_DIR" # Clean previous build
mkdir -p "$BUILD_DIR"

# Copy all files except build script and env files to build directory
# Explicitly copy vendor directory first to ensure it's included
if [ -d "vendor" ]; then
  cp -R vendor "$BUILD_DIR/"
fi
rsync -av --progress ./* "$BUILD_DIR/" --exclude build --exclude build_extension.sh --exclude '.env' --exclude '.env.example' --exclude '.git' --exclude '.gitignore' --exclude 'vendor' # Exclude vendor from rsync as it's already copied

# Replace placeholders in manifest with actual CLIENT_ID
# Use a temporary file for sed compatibility on macOS
sed -i.bak "s/\${CLIENT_ID}/$CLIENT_ID/g" "$BUILD_DIR/manifest.json"
rm "$BUILD_DIR/manifest.json.bak"

# Replace placeholders in config.js
sed -i.bak "s/\${FIREBASE_API_KEY}/$FIREBASE_API_KEY/g" "$BUILD_DIR/config.js"
sed -i.bak "s/\${FIREBASE_AUTH_DOMAIN}/$FIREBASE_AUTH_DOMAIN/g" "$BUILD_DIR/config.js"
sed -i.bak "s/\${FIREBASE_PROJECT_ID}/$FIREBASE_PROJECT_ID/g" "$BUILD_DIR/config.js"
sed -i.bak "s/\${FIREBASE_STORAGE_BUCKET}/$FIREBASE_STORAGE_BUCKET/g" "$BUILD_DIR/config.js"
sed -i.bak "s/\${FIREBASE_MESSAGING_SENDER_ID}/$FIREBASE_MESSAGING_SENDER_ID/g" "$BUILD_DIR/config.js"
sed -i.bak "s/\${FIREBASE_APP_ID}/$FIREBASE_APP_ID/g" "$BUILD_DIR/config.js"
rm "$BUILD_DIR/config.js.bak"

# Replace placeholders in background.js
sed -i.bak "s/\${FIREBASE_API_KEY}/$FIREBASE_API_KEY/g" "$BUILD_DIR/background.js"
sed -i.bak "s/\${FIREBASE_AUTH_DOMAIN}/$FIREBASE_AUTH_DOMAIN/g" "$BUILD_DIR/background.js"
sed -i.bak "s/\${FIREBASE_PROJECT_ID}/$FIREBASE_PROJECT_ID/g" "$BUILD_DIR/background.js"
sed -i.bak "s/\${FIREBASE_STORAGE_BUCKET}/$FIREBASE_STORAGE_BUCKET/g" "$BUILD_DIR/background.js"
sed -i.bak "s/\${FIREBASE_MESSAGING_SENDER_ID}/$FIREBASE_MESSAGING_SENDER_ID/g" "$BUILD_DIR/background.js"
sed -i.bak "s/\${FIREBASE_APP_ID}/$FIREBASE_APP_ID/g" "$BUILD_DIR/background.js"
rm "$BUILD_DIR/background.js.bak"

# Replace placeholders in storage.js (if any - added for consistency)
sed -i.bak "s/\${FIREBASE_API_KEY}/$FIREBASE_API_KEY/g" "$BUILD_DIR/storage.js"
sed -i.bak "s/\${FIREBASE_AUTH_DOMAIN}/$FIREBASE_AUTH_DOMAIN/g" "$BUILD_DIR/storage.js"
sed -i.bak "s/\${FIREBASE_PROJECT_ID}/$FIREBASE_PROJECT_ID/g" "$BUILD_DIR/storage.js"
sed -i.bak "s/\${FIREBASE_STORAGE_BUCKET}/$FIREBASE_STORAGE_BUCKET/g" "$BUILD_DIR/storage.js"
sed -i.bak "s/\${FIREBASE_MESSAGING_SENDER_ID}/$FIREBASE_MESSAGING_SENDER_ID/g" "$BUILD_DIR/storage.js"
sed -i.bak "s/\${FIREBASE_APP_ID}/$FIREBASE_APP_ID/g" "$BUILD_DIR/storage.js"
rm "$BUILD_DIR/storage.js.bak"


echo "Build completed. Load the extension from the '$BUILD_DIR' directory."
