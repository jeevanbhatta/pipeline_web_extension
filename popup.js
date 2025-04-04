document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const authorizeButton = document.getElementById('authorize-button');
  const userInfoDiv = document.getElementById('user-info');
  const userEmailSpan = document.getElementById('user-email');
  const taskSection = document.getElementById('task-section');
  const statusMessage = document.getElementById('status-message');

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
