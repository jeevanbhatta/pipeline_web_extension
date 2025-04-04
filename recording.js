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
  
  // First, check if we have audio permission before attempting screen capture
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(audioStream) {
      // We got audio permission, now we can request screen capture
      audioStream.getTracks().forEach(track => track.stop()); // Stop temporary audio stream
      
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
              
              // Now request audio again for recording
              return navigator.mediaDevices.getUserMedia({ 
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  sampleRate: 44100
                }
              });
            })
            .then(function(stream) {
              audioStream = stream;
              
              // Combine screen and audio streams
              const tracks = [...screenStream.getTracks(), ...audioStream.getAudioTracks()];
              combinedStream = new MediaStream(tracks);
              
              // Log the tracks to verify both audio and video are present
              console.log('Tracks in combined stream:', tracks.map(t => `${t.kind}: ${t.label} (enabled: ${t.enabled})`));
              
              // Create media recorder with better codec support
              try {
                // Try with best quality first
                mediaRecorder = new MediaRecorder(combinedStream, {
                  mimeType: 'video/webm; codecs=vp9,opus',
                  videoBitsPerSecond: 3000000,
                  audioBitsPerSecond: 128000
                });
              } catch (e) {
                console.warn('VP9/Opus not supported, falling back to default codec', e);
                mediaRecorder = new MediaRecorder(combinedStream);
              }
              
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
    })
    .catch(function(audioError) {
      console.error('Audio permission denied:', audioError);
      hideLoadingOverlay();
      statusMessage.textContent = 'Please allow microphone access to record audio';
      startButton.disabled = false;
      
      // Show a more helpful error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.innerHTML = 'Microphone access is required for recording.<br>Please check your browser settings and ensure microphone permissions are allowed for this extension.';
      startButton.parentNode.insertBefore(errorDiv, startButton.nextSibling);
      
      // Clean up error after 10 seconds
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 10000);
    });
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
