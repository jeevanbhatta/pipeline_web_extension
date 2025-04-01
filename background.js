// Google OAuth2 configuration
const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com'; // Replace with your client ID
const REDIRECT_URI = chrome.identity.getRedirectURL();
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'email'];

// Handle messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'authenticate') {
    authenticate()
      .then(getUserInfo)
      .then(userInfo => {
        sendResponse({success: true, userInfo: userInfo});
      })
      .catch(error => {
        console.error('Auth error:', error);
        sendResponse({success: false, error: error.message});
      });
    return true; // Indicates async response
  }
  
  else if (request.action === 'checkAuth') {
    checkAuthToken()
      .then(token => {
        if (token) {
          return getUserInfo(token).then(userInfo => {
            sendResponse({isAuthenticated: true, userInfo: userInfo});
          });
        } else {
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
});

// Authenticate with Google
function authenticate() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({interactive: true}, function(token) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
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
        resolve(null); // Not authenticated, but not an error
      } else {
        resolve(token);
      }
    });
  });
}

// Get user information
function getUserInfo(token) {
  return fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to get user info');
    }
    return response.json();
  })
  .then(data => {
    return {
      email: data.email,
      name: data.name,
      id: data.id
    };
  });
}
