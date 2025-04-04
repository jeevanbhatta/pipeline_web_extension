document.addEventListener('DOMContentLoaded', function() {
  // Determine if we're running in a popup or a tab
  const isPopup = location.pathname.endsWith('popup.html') && 
                 (window.innerWidth < 800) && // Typical popup dimensions
                 (!document.referrer || document.referrer === '');
  
  // If we're in the popup, automatically redirect to the tab version
  if (isPopup) {
    console.log('Detected popup mode, redirecting to tab...');
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    window.close(); // Close the popup
    return; // Stop further execution in the popup
  }
  
  // DOM elements
  const authorizeButton = document.getElementById('authorize-button');
  const userInfoDiv = document.getElementById('user-info');
  const userEmailSpan = document.getElementById('user-email');
  const taskSection = document.getElementById('task-section');
  const statusMessage = document.getElementById('status-message');
  const openTabButton = document.getElementById('open-tab-button');
  
  // Add close button if we're in a tab
  if (!isPopup) {
    addCloseButton();
  }
  
  // Hide the "Open in Tab" button since we're already redirecting automatically
  if (openTabButton) {
    openTabButton.style.display = 'none';
  }
  
  // Auth event listeners
  authorizeButton.addEventListener('click', function() {
    statusMessage.textContent = 'Signing in...';
    
    // Add visual feedback that the button was clicked
    authorizeButton.textContent = 'Signing in...';
    authorizeButton.disabled = true;
    
    chrome.runtime.sendMessage({action: 'authenticate'}, function(response) {
      authorizeButton.disabled = false;
      authorizeButton.textContent = 'Sign in with Google';
      
      if (response && response.success) {
        console.log('Authentication successful', response.userInfo);
        updateAuthUI(response.userInfo);
      } else {
        const errorMsg = response && response.error ? response.error : 'Unknown error';
        console.error('Authentication failed:', errorMsg);
        statusMessage.textContent = 'Sign-in failed: ' + errorMsg;
        
        // Display error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = 'Sign-in failed: ' + errorMsg;
        authorizeButton.parentNode.insertBefore(errorDiv, authorizeButton.nextSibling);
        
        // Clean up error after 5 seconds
        setTimeout(() => {
          if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
          }
        }, 5000);
      }
    });
  });
  
  // Check if user is already authenticated
  console.log('Checking authentication status');
  chrome.runtime.sendMessage({action: 'checkAuth'}, function(response) {
    console.log('Auth check response', response);
    
    if (response && response.isAuthenticated) {
      updateAuthUI(response.userInfo);
    }
  });
  
  function updateAuthUI(userInfo) {
    if (userInfo) {
      console.log('Updating UI for authenticated user', userInfo);
      authorizeButton.style.display = 'none';
      userInfoDiv.style.display = 'block';
      userEmailSpan.textContent = userInfo.email;
      taskSection.style.display = 'block';
      
      // Initialize tasks after authentication
      initializeTasks();
    } else {
      console.log('Updating UI for unauthenticated user');
      authorizeButton.style.display = 'block';
      userInfoDiv.style.display = 'none';
      taskSection.style.display = 'none';
    }
  }
  
  // Handle "Open in Tab" button
  // Hide the button if we're already in a tab
  if (window.location.protocol === 'chrome-extension:' && !chrome.action) {
    // We're already in a tab, hide the button
    openTabButton.style.display = 'none';
  }
  
  openTabButton.addEventListener('click', function() {
    // Open the extension in a new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    // Close the popup
    window.close();
  });
  
  // Initialize buttons
  const startRecordingButton = document.getElementById('start-recording');
  const stopRecordingButton = document.getElementById('stop-recording');
  const submitRecordingButton = document.getElementById('submit-recording');
  const downloadRecordingButton = document.getElementById('download-recording');
  const nextTaskButton = document.getElementById('next-task');
  
  startRecordingButton.addEventListener('click', startRecording);
  stopRecordingButton.addEventListener('click', stopRecording);
  submitRecordingButton.addEventListener('click', submitRecording);
  downloadRecordingButton.addEventListener('click', function() {
    if (downloadCurrentRecording()) {
      statusMessage.textContent = 'Recording downloaded successfully';
    } else {
      statusMessage.textContent = 'No recording available to download';
    }
  });
  nextTaskButton.addEventListener('click', moveToNextTask);
  
  // Custom handler for submission to enable download button
  document.addEventListener('recordingSubmitted', function() {
    downloadRecordingButton.disabled = false;
  });
});

// Add a close button to the top-right corner
function addCloseButton() {
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;'; // × symbol
  closeButton.className = 'close-button';
  closeButton.setAttribute('title', 'Close');
  closeButton.addEventListener('click', function() {
    window.close();
  });
  
  // Style the close button
  closeButton.style.position = 'absolute';
  closeButton.style.right = '15px';
  closeButton.style.top = '15px';
  closeButton.style.background = '#f44336';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '50%';
  closeButton.style.width = '30px';
  closeButton.style.height = '30px';
  closeButton.style.fontSize = '20px';
  closeButton.style.fontWeight = 'bold';
  closeButton.style.cursor = 'pointer';
  closeButton.style.zIndex = '1000';
  closeButton.style.display = 'flex';
  closeButton.style.alignItems = 'center';
  closeButton.style.justifyContent = 'center';
  
  // Add hover effect
  closeButton.addEventListener('mouseover', function() {
    this.style.background = '#d32f2f';
  });
  closeButton.addEventListener('mouseout', function() {
    this.style.background = '#f44336';
  });
  
  document.body.appendChild(closeButton);
}
