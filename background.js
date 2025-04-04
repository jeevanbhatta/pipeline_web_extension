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
});

// Authenticate with Google - improved error handling
function authenticate() {
  return new Promise((resolve, reject) => {
    console.log('Starting authentication with client ID:', CLIENT_ID);
    
    chrome.identity.getAuthToken({interactive: true}, function(token) {
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError;
        console.error('Chrome identity error:', error);
        
        // Specific handling for common errors
        if (error.message && error.message.includes('bad client id')) {
          reject(new Error('OAuth2 request failed: The Client ID in manifest.json is invalid or malformed'));
        } else if (error.message && error.message.includes('not authorized')) {
          reject(new Error('Your Google account is not authorized to use this application'));
        } else {
          reject(new Error(error.message || 'Authentication failed'));
        }
      } else if (!token) {
        reject(new Error('No token returned from authentication'));
      } else {
        console.log('Token acquired successfully');
        resolve(token);
      }
    });
  });
}

// Check if user is authenticated
function checkAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({interactive: false}, function(token) {
      if (chrome.runtime.lastError) {
        console.log('Auth check error (not authenticated):', chrome.runtime.lastError);
        resolve(null); // Not authenticated, but not an error
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
