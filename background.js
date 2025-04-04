// Get configuration directly from manifest
const CLIENT_ID = chrome.runtime.getManifest().oauth2.client_id;
const SCOPES = chrome.runtime.getManifest().oauth2.scopes;
const REDIRECT_URI = chrome.identity.getRedirectURL();

console.log('Background script initialized with:');
console.log('- CLIENT_ID:', CLIENT_ID);
console.log('- SCOPES:', SCOPES);
console.log('- REDIRECT_URI:', REDIRECT_URI);

// Validate client ID format
if (!CLIENT_ID || !CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
  console.error('CLIENT_ID appears to be invalid:', CLIENT_ID);
  console.error('Must end with .apps.googleusercontent.com and not contain variables like ${CLIENT_ID}');
}

// Handle messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'authenticate') {
    console.log('Authenticate request received');
    
    // Verify client ID format before attempting authentication
    if (!CLIENT_ID || !CLIENT_ID.endsWith('.apps.googleusercontent.com') || CLIENT_ID.includes('${')) {
      const error = 'Invalid Client ID format in manifest. Must be a valid Google OAuth Client ID ending with .apps.googleusercontent.com';
      console.error(error, CLIENT_ID);
      sendResponse({success: false, error: error});
      return true;
    }
    
    authenticate()
      .then(token => {
        console.log('Authentication successful, token received');
        return getUserInfo(token);
      })
      .then(userInfo => {
        console.log('User info retrieved:', userInfo);
        sendResponse({success: true, userInfo: userInfo});
      })
      .catch(error => {
        console.error('Auth error:', error);
        sendResponse({success: false, error: error.message || 'Authentication failed'});
      });
    return true; // Indicates async response
  }
  
  else if (request.action === 'checkAuth') {
    checkAuthToken()
      .then(token => {
        if (token) {
          console.log('Valid auth token found');
          return getUserInfo(token).then(userInfo => {
            sendResponse({isAuthenticated: true, userInfo: userInfo});
          });
        } else {
          console.log('No valid auth token found');
          sendResponse({isAuthenticated: false});
        }
      })
      .catch(error => {
        console.error('Check auth error:', error);
        sendResponse({isAuthenticated: false, error: error.message});
      });
    return true; // Indicates async response
  }
  
  else if (request.action === 'getAuthToken') {
    checkAuthToken()
      .then(token => {
        sendResponse({token: token});
      })
      .catch(error => {
        console.error('Get token error:', error);
        sendResponse({error: error.message});
      });
    return true; // Indicates async response
  }
  
  else if (request.action === 'logDebugInfo') {
    console.log('Debug info:', request.data);
    sendResponse({success: true});
    return false;
  }
  
  else if (request.action === 'getOAuthConfig') {
    // Return OAuth configuration for debugging
    sendResponse({
      clientId: CLIENT_ID,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
      manifestVersion: chrome.runtime.getManifest().manifest_version,
      extensionId: chrome.runtime.id
    });
    return false;
  }
  
  else if (request.action === 'openPersistentWindow') {
    console.log('Opening persistent window');
    
    // Calculate centered position
    const width = 500;
    const height = 600;
    const left = Math.round((screen.width - width) / 2);
    const top = Math.round((screen.height - height) / 2);
    
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html?mode=window'),
      type: 'popup',
      width: width,
      height: height,
      left: left,
      top: top,
      focused: true
    }, function(win) {
      // Store the window ID to potentially reference it later
      chrome.storage.local.set({ persistentWindowId: win.id });
      sendResponse({ success: true, windowId: win.id });
    });
    return true; // Indicates async response
  }
});

// Authenticate with Google - improved error handling
function authenticate() {
  return new Promise((resolve, reject) => {
    console.log('Starting authentication with client ID:', CLIENT_ID);
    
    // First, clear any cached tokens that might be causing issues
    chrome.identity.clearAllCachedAuthTokens(() => {
      console.log('Cleared all cached auth tokens');
      
      // Now attempt to get a new token with more detailed options
      const authParams = {
        interactive: true,
        // Don't include scopes here, they're defined in the manifest
      };
      
      chrome.identity.getAuthToken(authParams, function(token) {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          
          // Log the full error for debugging
          console.error('Chrome identity raw error:', error);
          try {
            console.error('Error details:', JSON.stringify(error));
          } catch (e) {
            console.error('Error cannot be stringified');
          }
          
          // Extract error message safely
          let errorMessage = 'Authentication failed';
          if (typeof error === 'object' && error !== null && error.message) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          
          console.error('Formatted error message:', errorMessage);
          reject(new Error(errorMessage));
        } else if (!token) {
          reject(new Error('No token returned from authentication'));
        } else {
          console.log('Token acquired successfully');
          resolve(token);
        }
      });
    });
  });
}

// Check if user is authenticated
function checkAuthToken() {
  return new Promise((resolve, reject) => {
    const authParams = {
      interactive: false
      // Don't include scopes here, they're defined in the manifest
    };
    
    chrome.identity.getAuthToken(authParams, function(token) {
      if (chrome.runtime.lastError) {
        console.log('Auth check error (not authenticated):', chrome.runtime.lastError);
        // This is expected for unauthenticated users, so we resolve with null
        // instead of rejecting with an error
        resolve(null);
      } else if (!token) {
        // No token but also no error - handle as not authenticated
        resolve(null);
      } else {
        resolve(token);
      }
    });
  });
}

// Get user information with better error handling
function getUserInfo(token) {
  console.log('Fetching user info with token');
  return fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      console.error('User info fetch error:', response.status, response.statusText);
      return response.text().then(text => {
        throw new Error(`Failed to get user info: ${response.status} ${text}`);
      });
    }
    return response.json();
  })
  .then(data => {
    console.log('User info retrieved successfully');
    return {
      email: data.email,
      name: data.name,
      id: data.id
    };
  });
}
