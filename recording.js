let mediaRecorder;
let recordedChunks = [];
let startTime;
let timerInterval;
let audioStream;
let screenStream;
let combinedStream;

// Request microphone permission explicitly with a dialog
function requestMicrophonePermission() {
  return new Promise((resolve, reject) => {
    const permissionStatus = document.getElementById('status-message');
    permissionStatus.textContent = 'Requesting microphone access...';
    
    navigator.permissions.query({ name: 'microphone' })
      .then(result => {
        if (result.state === 'granted') {
          permissionStatus.textContent = 'Microphone permission already granted';
          resolve(true);
        } else if (result.state === 'prompt') {
          // This will trigger the permission dialog
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
              // Stop the stream immediately, we just needed the permission
              stream.getTracks().forEach(track => track.stop());
              permissionStatus.textContent = 'Microphone permission granted';
              resolve(true);
            })
            .catch(err => {
              console.error('Microphone permission denied:', err);
              permissionStatus.textContent = 'Microphone permission denied';
              reject(err);
            });
        } else if (result.state === 'denied') {
          permissionStatus.textContent = 'Microphone permission blocked';
          const error = new Error('Microphone permission blocked in browser settings');
          console.error(error);
          reject(error);
        }
      })
      .catch(err => {
        console.error('Error checking permission status:', err);
        // Fall back to direct request if permissions API fails
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            stream.getTracks().forEach(track => track.stop());
            permissionStatus.textContent = 'Microphone permission granted';
            resolve(true);
          })
          .catch(err => {
            permissionStatus.textContent = 'Microphone permission denied';
            reject(err);
          });
      });
  });
}

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
  
  // First explicitly request microphone permission with a dialog
  requestMicrophonePermission()
    .then(() => {
      // Now request screen capture
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
              
              // Now request audio again for actual recording
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
              
              // Add audio visualization indicator
              showAudioLevelIndicator(audioStream);
              
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
                try {
                  mediaRecorder = new MediaRecorder(combinedStream, {
                    mimeType: 'video/webm',
                  });
                } catch (e2) {
                  console.warn('WebM not supported, trying basic MediaRecorder', e2);
                  mediaRecorder = new MediaRecorder(combinedStream);
                }
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
      console.error('Microphone permission error:', audioError);
      hideLoadingOverlay();
      statusMessage.textContent = 'Microphone access is required';
      startButton.disabled = false;
      
      // Create more detailed help message with instructions
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.innerHTML = `
        <strong>Microphone access is required for recording.</strong><br>
        To fix this issue:
        <ol>
          <li>Click the lock/info icon in your browser's address bar</li>
          <li>Find "Microphone" in the permissions list</li>
          <li>Set it to "Allow"</li>
          <li>Reload this page and try again</li>
        </ol>
        <p>If you don't see a permission prompt, your browser settings may be blocking permission requests.</p>
      `;
      
      // Find a good place to insert the error message
      const container = document.querySelector('#recording-status') || startButton.parentNode;
      container.appendChild(errorDiv);
      
      // Clean up error after 20 seconds
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 20000);
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

// Add audio level visualization
function showAudioLevelIndicator(audioStream) {
  try {
    // Create audio level indicator if it doesn't exist
    let levelIndicator = document.getElementById('audio-level-indicator');
    if (!levelIndicator) {
      const recordingStatus = document.getElementById('recording-status');
      
      const levelContainer = document.createElement('div');
      levelContainer.style.marginTop = '10px';
      levelContainer.style.textAlign = 'center';
      
      levelIndicator = document.createElement('div');
      levelIndicator.id = 'audio-level-indicator';
      levelIndicator.style.height = '20px';
      levelIndicator.style.width = '100%';
      levelIndicator.style.backgroundColor = '#f0f0f0';
      levelIndicator.style.borderRadius = '10px';
      levelIndicator.style.overflow = 'hidden';
      levelIndicator.style.position = 'relative';
      
      const levelBar = document.createElement('div');
      levelBar.id = 'audio-level-bar';
      levelBar.style.height = '100%';
      levelBar.style.width = '0%';
      levelBar.style.backgroundColor = '#34a853';
      levelBar.style.position = 'absolute';
      levelBar.style.left = '0';
      levelBar.style.transition = 'width 0.1s';
      
      const levelText = document.createElement('div');
      levelText.id = 'audio-level-text';
      levelText.style.position = 'absolute';
      levelText.style.width = '100%';
      levelText.style.textAlign = 'center';
      levelText.style.color = '#333';
      levelText.style.fontWeight = 'bold';
      levelText.style.fontSize = '12px';
      levelText.textContent = 'Audio Level';
      
      levelIndicator.appendChild(levelBar);
      levelIndicator.appendChild(levelText);
      levelContainer.appendChild(levelIndicator);
      recordingStatus.appendChild(levelContainer);
    }
    
    // Set up audio analyzer
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(audioStream);
    
    microphone.connect(analyser);
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Update the level indicator
    const levelBar = document.getElementById('audio-level-bar');
    
    function updateAudioLevel() {
      if (!levelBar || document.getElementById('stop-recording').disabled) {
        return; // Stop updating when recording is stopped
      }
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Scale the level to 0-100%
      const scaledLevel = Math.min(100, Math.max(0, average * 100 / 255));
      
      // Update the level bar
      levelBar.style.width = scaledLevel + '%';
      
      // Change color based on level
      if (scaledLevel < 10) {
        levelBar.style.backgroundColor = '#ea4335'; // Red for low level
      } else if (scaledLevel < 30) {
        levelBar.style.backgroundColor = '#fbbc05'; // Yellow for medium level
      } else {
        levelBar.style.backgroundColor = '#34a853'; // Green for good level
      }
      
      requestAnimationFrame(updateAudioLevel);
    }
    
    updateAudioLevel();
  } catch (e) {
    console.warn('Could not create audio level indicator:', e);
  }
}
