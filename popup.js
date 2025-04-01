document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const authorizeButton = document.getElementById('authorize-button');
  const userInfoDiv = document.getElementById('user-info');
  const userEmailSpan = document.getElementById('user-email');
  const taskSection = document.getElementById('task-section');
  
  // Auth event listeners
  authorizeButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: 'authenticate'}, function(response) {
      if (response && response.success) {
        updateAuthUI(response.userInfo);
      } else {
        console.error('Authentication failed:', response ? response.error : 'Unknown error');
      }
    });
  });
  
  // Check if user is already authenticated
  chrome.runtime.sendMessage({action: 'checkAuth'}, function(response) {
    if (response && response.isAuthenticated) {
      updateAuthUI(response.userInfo);
    }
  });
  
  function updateAuthUI(userInfo) {
    if (userInfo) {
      authorizeButton.style.display = 'none';
      userInfoDiv.style.display = 'block';
      userEmailSpan.textContent = userInfo.email;
      taskSection.style.display = 'block';
      
      // Initialize tasks after authentication
      initializeTasks();
    } else {
      authorizeButton.style.display = 'block';
      userInfoDiv.style.display = 'none';
      taskSection.style.display = 'none';
    }
  }
  
  // Initialize buttons
  const startRecordingButton = document.getElementById('start-recording');
  const stopRecordingButton = document.getElementById('stop-recording');
  const submitRecordingButton = document.getElementById('submit-recording');
  const nextTaskButton = document.getElementById('next-task');
  
  startRecordingButton.addEventListener('click', startRecording);
  stopRecordingButton.addEventListener('click', stopRecording);
  submitRecordingButton.addEventListener('click', submitRecording);
  nextTaskButton.addEventListener('click', moveToNextTask);
});
