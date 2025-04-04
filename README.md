# Screen Recording Data Collector

A Chrome extension that allows users to:
1. Read task instructions
2. Record screen and audio
3. Save recordings locally
4. Download recordings as files

## Setup Instructions

### 1. Client ID Configuration

The extension uses Google OAuth for authentication. Make sure your client ID is correctly configured:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Create a new OAuth client ID
   - Application type: Chrome App
   - Name: Screen Recording Data Collector
   - Application ID: Use your extension ID (see below)

### 2. Finding Your Extension ID

After building the extension:
- Load the extension in Chrome from the `build` directory
- Go to `chrome://extensions/`
- Find your extension in the list and copy the ID

Alternatively, run the build script which will show the expected extension ID:
```bash
chmod +x build_extension.sh
./build_extension.sh
```

### 3. Building and Installing

1. Make sure your `.env` file contains your Client ID:
   ```
   CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

2. Run the build script:
   ```bash
   chmod +x build_extension.sh
   ./build_extension.sh
   ```

3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build` folder

4. Reload the extension if you make changes:
   - Run the build script again
   - Click the refresh icon on your extension in Chrome

## Usage

1. Click the extension icon to open the popup
2. Sign in with your Google account
3. Read the current task
4. Record your screen while completing the task
5. Submit and download your recording
6. Move to the next task

## Troubleshooting

### Authentication Issues

- Ensure your Client ID in `.env` is correct and ends with `.apps.googleusercontent.com`
- Make sure you've set the Application ID in Google Cloud Console to match your extension ID
- Try clearing cached tokens by going to `chrome://identity-internals/` and removing Chrome tokens

### Recording Issues

- Make sure you've granted the extension permissions to capture your screen
- For larger recordings, download immediately as storage is limited

## Data Storage

Recordings are stored:
- Temporarily in Chrome's local storage (limited to ~5MB)
- Available for download as .webm files
- With accompanying JSON metadata files