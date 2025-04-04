let mediaRecorder;
let recordedChunks = [];
let startTime;
let timerInterval;
let audioStream;
let screenStream;
let combinedStream;

// Start screen and audio recording
function startRecording() {
  const startButton = document.getElementById('start-recording');
  const stopButton = document.getElementById('stop-recording');
  const statusMessage = document.getElementById('status-message');
  const timer = document.getElementById('timer');
  
  startButton.disabled = true;
  document.getElementById('next-task').disabled = true;
  
  // Display loading overlay while setting up recording
  showLoadingOverlay('Setting up recording...');
  
  // Request screen capture
  chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window', 'tab'], 
    function(streamId) {
      if (!streamId) {
        hideLoadingOverlay();
        statusMessage.textContent = 'Screen capture cancelled';
        startButton.disabled = false;
        return;
      }
      
      const constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId
          }
        }
      };
      
      // Get screen stream
      navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
          screenStream = stream;
          
          // Get audio stream
          return navigator.mediaDevices.getUserMedia({ audio: true });
        })
        .then(function(stream) {
          audioStream = stream;
          
          // Combine screen and audio streams
          const tracks = [...screenStream.getTracks(), ...audioStream.getAudioTracks()];
          combinedStream = new MediaStream(tracks);
          
          // Create media recorder
          mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm; codecs=vp9'
          });
          
          mediaRecorder.ondataavailable = handleDataAvailable;
          mediaRecorder.onstop = handleRecordingStopped;
          
          // Start recording
          recordedChunks = [];
          mediaRecorder.start(100);
          
          // Update UI
          startTime = new Date();
          timer.style.display = 'block';
          timerInterval = setInterval(updateTimer, 1000);
          
          statusMessage.textContent = 'Recording in progress...';
          stopButton.disabled = false;
          
          hideLoadingOverlay();
        })
        .catch(function(error) {
          console.error('Error starting recording:', error);
          statusMessage.textContent = 'Error: ' + error.message;
          startButton.disabled = false;
          hideLoadingOverlay();
        });
    }
  );
}

// Stop recording
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    
    // Stop all tracks
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
    }
    
    // Update UI
    clearInterval(timerInterval);
    
    document.getElementById('stop-recording').disabled = true;
    document.getElementById('submit-recording').disabled = false;
    document.getElementById('status-message').textContent = 'Recording stopped';
  }
}

// Handle data available event
function handleDataAvailable(event) {
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
  }
}

// Handle recording stopped event
function handleRecordingStopped() {
  console.log('Recording stopped');
}

// Update timer display
function updateTimer() {
  if (!startTime) return;
  
  const now = new Date();
  const elapsed = Math.floor((now - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  
  document.getElementById('timer').textContent = `${minutes}:${seconds}`;
}

// Submit recording
function submitRecording() {
  if (recordedChunks.length === 0) {
    alert('No recording available to submit');
    return;
  }
  
  showLoadingOverlay('Submitting recording...');
  
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  
  // Get current task information
  const currentTask = getCurrentTaskData();
  
  // Create metadata
  const metadata = {
    taskId: currentTask.id,
    taskText: currentTask.text,
    timestamp: new Date().toISOString(),
    duration: getRecordingDuration()
  };
  
  // Upload recording and metadata
  uploadRecording(blob, metadata)
    .then(() => {
      // Reset recording UI
      recordedChunks = [];
      document.getElementById('submit-recording').disabled = true;
      document.getElementById('start-recording').disabled = false;
      document.getElementById('next-task').disabled = false;
      document.getElementById('status-message').textContent = 'Recording submitted';
      document.getElementById('timer').style.display = 'none';
      
      // Dispatch custom event to enable download button
      document.dispatchEvent(new CustomEvent('recordingSubmitted'));
      
      hideLoadingOverlay();
    })
    .catch(error => {
      console.error('Error uploading recording:', error);
      document.getElementById('status-message').textContent = 'Error: ' + error.message;
      hideLoadingOverlay();
    });
}

// Calculate recording duration
function getRecordingDuration() {
  if (!startTime) return 0;
  
  const stopTime = new Date();
  return Math.floor((stopTime - startTime) / 1000);
}

// Show loading overlay
function showLoadingOverlay(message) {
  const overlay = document.getElementById('loading-overlay');
  const loadingMessage = document.getElementById('loading-message');
  
  loadingMessage.textContent = message || 'Processing...';
  overlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoadingOverlay() {
  document.getElementById('loading-overlay').style.display = 'none';
}
