// Upload recording and metadata to Google Drive
function uploadRecording(blob, metadata) {
  return new Promise((resolve, reject) => {
    // First, save task completion status locally
    saveTaskCompletion(metadata.taskId, metadata)
      .then(() => {
        // Then upload the video file to Google Drive
        return uploadToDrive(blob, metadata);
      })
      .then(fileId => {
        console.log('File uploaded successfully, ID:', fileId);
        resolve(fileId);
      })
      .catch(error => {
        console.error('Error in upload process:', error);
        reject(error);
      });
  });
}

// Upload file to Google Drive
function uploadToDrive(blob, metadata) {
  return new Promise((resolve, reject) => {
    // Get auth token
    chrome.runtime.sendMessage({action: 'getAuthToken'}, function(response) {
      if (!response || !response.token) {
        reject(new Error('Not authenticated'));
        return;
      }
      
      const token = response.token;
      
      // Create file name based on task and timestamp
      const fileName = `Task_${metadata.taskId}_${new Date().toISOString().replace(/:/g, '-')}.webm`;
      
      // Create metadata file content
      const metadataContent = JSON.stringify(metadata, null, 2);
      
      // First upload the video file
      uploadFile(blob, fileName, 'video/webm', token)
        .then(fileId => {
          // Then upload the metadata file
          const metadataBlob = new Blob([metadataContent], {type: 'application/json'});
          const metadataFileName = fileName.replace('.webm', '_metadata.json');
          return uploadFile(metadataBlob, metadataFileName, 'application/json', token)
            .then(metadataFileId => {
              // Return video file ID
              resolve(fileId);
            });
        })
        .catch(error => {
          reject(error);
        });
    });
  });
}

// Helper function to upload a file to Google Drive
function uploadFile(blob, fileName, mimeType, token) {
  return new Promise((resolve, reject) => {
    // First create the file metadata
    const metadata = {
      name: fileName,
      mimeType: mimeType
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', blob);
    
    fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: form
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`Upload failed: ${response.status} ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      resolve(data.id);
    })
    .catch(error => {
      console.error('Upload error:', error);
      reject(error);
    });
  });
}
