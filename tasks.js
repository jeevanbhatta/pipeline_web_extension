// Sample tasks - in a real app, these would likely be loaded from a server
const tasks = [
  { id: 1, text: "Open a new browser tab and navigate to Wikipedia" },
  { id: 2, text: "Search for 'climate change' and read the first paragraph" },
  { id: 3, text: "Find and click on a link to an article about renewable energy" },
  { id: 4, text: "Create a bookmark for the current page" },
  { id: 5, text: "Go back to the previous page and search for a different topic" }
];

let currentTaskIndex = 0;

// Initialize tasks
function initializeTasks() {
  displayCurrentTask();
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
