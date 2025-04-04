// Variable to store tasks
let tasks = [];
let currentTaskIndex = 0;

// Load tasks from text file
function loadTasksFromFile() {
  return new Promise((resolve, reject) => {
    fetch('tasks.txt')
      .then(response => response.text())
      .then(text => {
        // Parse tasks (assuming format: "Task X: description")
        tasks = text.split('\n')
          .filter(line => line.trim() !== '')
          .map((line, index) => {
            const taskText = line.includes(':') ? line.split(':')[1].trim() : line.trim();
            return { id: index + 1, text: taskText };
          });
        
        console.log('Loaded tasks:', tasks);
        resolve(tasks);
      })
      .catch(error => {
        console.error('Error loading tasks:', error);
        // Fallback to default tasks if file can't be loaded
        tasks = [
          { id: 1, text: "Open a new browser tab and navigate to Wikipedia" },
          { id: 2, text: "Search for 'climate change' and read the first paragraph" }
        ];
        reject(error);
      });
  });
}

// Initialize tasks
function initializeTasks() {
  loadTasksFromFile().then(() => {
    displayCurrentTask();
  });
}

// Display the current task
function displayCurrentTask() {
  const currentTaskElement = document.getElementById('current-task');
  if (currentTaskIndex < tasks.length) {
    currentTaskElement.textContent = tasks[currentTaskIndex].text;
  } else {
    currentTaskElement.textContent = "All tasks completed! Thank you for your participation.";
    document.getElementById('start-recording').disabled = true;
    document.getElementById('next-task').disabled = true;
  }
}

// Move to the next task
function moveToNextTask() {
  currentTaskIndex++;
  displayCurrentTask();
  
  // Reset UI for new task
  document.getElementById('submit-recording').disabled = true;
  document.getElementById('start-recording').disabled = false;
  document.getElementById('status-message').textContent = 'Ready to record';
  document.getElementById('next-task').disabled = true;
}

// Get current task data
function getCurrentTaskData() {
  return currentTaskIndex < tasks.length ? tasks[currentTaskIndex] : null;
}

// Save task completion status
function saveTaskCompletion(taskId, metadata) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('completedTasks', function(result) {
      const completedTasks = result.completedTasks || [];
      completedTasks.push({
        taskId: taskId,
        completedAt: new Date().toISOString(),
        metadata: metadata
      });
      
      chrome.storage.local.set({ completedTasks: completedTasks }, function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  });
}
