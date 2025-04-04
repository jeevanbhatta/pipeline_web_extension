// This file contains sensitive configuration that should not be committed to version control
const CONFIG = {
  // Your Google OAuth Client ID - copied directly from manifest.json
  CLIENT_ID: chrome.runtime.getManifest().oauth2.client_id,
  
  // Required scopes for the application - copied directly from manifest.json
  SCOPES: chrome.runtime.getManifest().oauth2.scopes
};

console.log('Config loaded, CLIENT_ID:', CONFIG.CLIENT_ID);
