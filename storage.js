// Save recording locally
function uploadRecording(blob, metadata) {
  return new Promise((resolve, reject) => {
    // First, save task completion status locally
    saveTaskCompletion(metadata.taskId, metadata)
      .then(() => {
        // Then save the recording to local storage
        return saveRecordingLocally(blob, metadata);
      })
      .then(fileId => {
        console.log('Recording saved locally with ID:', fileId);
        resolve(fileId);
      })
      .catch(error => {
        console.error('Error in save process:', error);
        reject(error);
      });
  });
}

// Save recording to browser's local storage
function saveRecordingLocally(blob, metadata) {
  return new Promise((resolve, reject) => {
    // Create a unique ID for this recording
    const recordingId = `recording_${metadata.taskId}_${new Date().getTime()}`;
    
    // Convert the blob to a base64 string
    const reader = new FileReader();
    reader.onloadend = function() {
      // Get the base64 data URL
      const base64data = reader.result;
      
      // Data to store
      const recordingData = {
        id: recordingId,
        blob: base64data,
        metadata: metadata,
        savedAt: new Date().toISOString()
      };
      
      // Save to chrome.storage.local
      // Note: This may fail for large recordings due to storage limits
      chrome.storage.local.get('recordings', function(result) {
        const recordings = result.recordings || [];
        recordings.push(recordingData);
        
        chrome.storage.local.set({ recordings: recordings }, function() {
          if (chrome.runtime.lastError) {
            console.error('Storage error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            // Also try to save this specific recording to a downloadable file
            try {
              const downloadUrl = URL.createObjectURL(blob);
              const fileName = `Task_${metadata.taskId}_${new Date().toISOString().replace(/:/g, '-')}.webm`;
              
              // Create a metadata file
              const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {type: 'application/json'});
              const metadataUrl = URL.createObjectURL(metadataBlob);
              
              // Set these URLs for download in the UI
              window.recordingDownloadUrl = {
                video: { url: downloadUrl, fileName: fileName },
                metadata: { url: metadataUrl, fileName: fileName.replace('.webm', '_metadata.json') }
              };
              
              resolve(recordingId);
            } catch (e) {
              console.warn('Could not create download URL, but recording was saved to storage:', e);
              resolve(recordingId);
            }
          }
        });
      });
    };
    
    reader.onerror = function() {
      reject(new Error('Failed to read the recording blob'));
    };
    
    reader.readAsDataURL(blob);
  });
}

// Check if there are too many recordings and clean up if needed
function cleanupOldRecordings() {
  chrome.storage.local.get('recordings', function(result) {
    const recordings = result.recordings || [];
    
    // If we have more than 5 recordings, remove the oldest ones
    if (recordings.length > 5) {
      const sortedRecordings = recordings.sort((a, b) => 
        new Date(a.savedAt) - new Date(b.savedAt)
      );
      
      const recordingsToKeep = sortedRecordings.slice(-5); // Keep the 5 most recent
      
      chrome.storage.local.set({ recordings: recordingsToKeep }, function() {
        console.log('Cleaned up old recordings, keeping the 5 most recent ones');
      });
    }
  });
}

// Initialize cleanup on module load
cleanupOldRecordings();

// Helper function to download current recording
function downloadCurrentRecording() {
  if (window.recordingDownloadUrl) {
    // Create and trigger download links
    const videoLink = document.createElement('a');
    videoLink.href = window.recordingDownloadUrl.video.url;
    videoLink.download = window.recordingDownloadUrl.video.fileName;
    document.body.appendChild(videoLink);
    videoLink.click();
    document.body.removeChild(videoLink);
    
    // Also download metadata
    const metadataLink = document.createElement('a');
    metadataLink.href = window.recordingDownloadUrl.metadata.url;
    metadataLink.download = window.recordingDownloadUrl.metadata.fileName;
    document.body.appendChild(metadataLink);
    metadataLink.click();
    document.body.removeChild(metadataLink);
    
    return true;
  }
  return false;
}
