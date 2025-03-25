// DOM Elements
const taskForm = document.getElementById('taskForm');
const todoList = document.getElementById('todoList');
const overdueList = document.getElementById('overdueList');
const completedList = document.getElementById('completedList');

// Priority order for sorting
const priorityOrder = {
    'high': 1,
    'medium': 2,
    'low': 3
};

// Load tasks from localStorage
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// Create clock element
const clockContainer = document.createElement('div');
clockContainer.className = 'next-task-clock';
document.body.appendChild(clockContainer);

// Format date and time
function formatDateTime(date, time) {
    const [year, month, day] = date.split('-');
    const [hours, minutes] = time.split(':');
    return new Date(year, month - 1, day, hours, minutes);
}

// Format datetime for display
function formatDateTimeDisplay(datetime) {
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Check if a task is overdue
function isTaskOverdue(task) {
    return new Date(task.endDateTime) < new Date() && !task.completed;
}

// Sort tasks by priority
function sortTasksByPriority(tasksList) {
    return tasksList.sort((a, b) => {
        // First sort by priority
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // If same priority, sort by due date
        return new Date(a.endDateTime) - new Date(b.endDateTime);
    });
}

// Update next task countdown
function updateNextTaskCountdown() {
    const incompleteTasks = tasks.filter(task => !task.completed && !isTaskOverdue(task));
    if (incompleteTasks.length === 0) {
        clockContainer.innerHTML = 'No upcoming tasks';
        return;
    }

    const sortedTasks = sortTasksByPriority(incompleteTasks);
    const nextTask = sortedTasks[0];
    const now = new Date();
    const timeLeft = new Date(nextTask.endDateTime) - now;
    
    if (timeLeft < 0) {
        clockContainer.innerHTML = `
            <div class="next-task-info">
                <div class="next-task-title">Next: ${nextTask.title}</div>
                <div class="next-task-time overdue">Overdue!</div>
            </div>
        `;
    } else {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        clockContainer.innerHTML = `
            <div class="next-task-info">
                <div class="next-task-title">Next: ${nextTask.title}</div>
                <div class="next-task-time">${days}d ${hours}h ${minutes}m</div>
            </div>
        `;
    }
}

// Check and move overdue tasks with notification
function checkAndMoveOverdueTasks() {
    const taskElements = todoList.querySelectorAll('.task-item');
    taskElements.forEach(taskElement => {
        const taskId = taskElement.querySelector('.task-timer').getAttribute('data-task-id');
        const task = tasks.find(t => t.id === parseInt(taskId));
        if (task && isTaskOverdue(task)) {
            moveTaskToOverdue(taskElement);
            // Show notification for newly overdue tasks
            if (!task.notifiedOverdue) {
                showOverdueNotification(task);
                task.notifiedOverdue = true;
                saveTasks();
            }
        }
    });
}

// Show overdue notification
function showOverdueNotification(task) {
    const notification = document.createElement('div');
    notification.className = 'notification overdue-notification';
    notification.innerHTML = `
        <div class="notification-content">
            Task "${task.title}" is now overdue!
        </div>
    `;
    document.body.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Update all task timers
function updateTaskTimers() {
    const now = new Date();
    document.querySelectorAll('.task-timer').forEach(timer => {
        const taskId = timer.getAttribute('data-task-id');
        const task = tasks.find(t => t.id === parseInt(taskId));
        if (!task) return;

        // Clear timer for completed tasks
        if (task.completed) {
            timer.textContent = '';
            return;
        }

        const timeLeft = new Date(task.endDateTime) - now;
        if (timeLeft < 0) {
            timer.textContent = 'Overdue!';
            timer.classList.add('overdue');
            // Move task to overdue list if it's in todo list
            const taskElement = timer.closest('.task-item');
            if (taskElement.parentElement === todoList) {
                moveTaskToOverdue(taskElement);
                // Show notification only if not previously notified
                if (!task.notifiedOverdue) {
                    showOverdueNotification(task);
                    task.notifiedOverdue = true;
                    saveTasks();
                }
            }
        } else {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            if (days > 0) {
                timer.textContent = `${days}d ${hours}h ${minutes}m`;
            } else if (hours > 0) {
                timer.textContent = `${hours}h ${minutes}m ${seconds}s`;
            } else {
                timer.textContent = `${minutes}m ${seconds}s`;
            }
            timer.classList.remove('overdue');
        }
    });
}

// Start timer updates with more frequent checks
setInterval(() => {
    updateTaskTimers();
    updateNextTaskCountdown();
    checkAndMoveOverdueTasks();
}, 1000); // Update every second

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    updateNextTaskCountdown();
}

// Load tasks when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Set default time when page loads
    document.getElementById('taskEndTime').value = '00:00';
    
    renderTasks();
    updateNextTaskCountdown();
    // Immediate check for overdue tasks
    updateTaskTimers();
    checkAndMoveOverdueTasks();
});

// Handle form submission
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle').value;
    const priority = document.getElementById('taskPriority').value;
    const endDate = document.getElementById('taskEndDate').value;
    const endTime = document.getElementById('taskEndTime').value || '00:00'; // Set default time if none selected
    
    const task = {
        id: Date.now(),
        title,
        priority,
        endDate,
        endTime,
        endDateTime: formatDateTime(endDate, endTime).toISOString(),
        completed: false
    };
    
    tasks.push(task);
    saveTasks();
    renderTask(task);
    taskForm.reset();
    
    // Set default time for the next task
    document.getElementById('taskEndTime').value = '00:00';
});

// Render all tasks
function renderTasks() {
    todoList.innerHTML = '';
    overdueList.innerHTML = '';
    completedList.innerHTML = '';
    
    // Split tasks into different categories
    const allTasks = [...tasks];
    const completedTasks = allTasks.filter(task => task.completed);
    const incompleteTasks = allTasks.filter(task => !task.completed);
    const overdueTasks = incompleteTasks.filter(isTaskOverdue);
    const todoTasks = incompleteTasks.filter(task => !isTaskOverdue(task));
    
    // Sort and render each category
    sortTasksByPriority(todoTasks).forEach(task => renderTask(task));
    sortTasksByPriority(overdueTasks).forEach(task => renderTask(task));
    sortTasksByPriority(completedTasks).forEach(task => renderTask(task));
}

// Render a single task
function renderTask(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.priority}-priority ${task.completed ? 'completed' : ''}`;
    
    // Create the datetime inputs for editing
    const dateTimeContainer = document.createElement('div');
    dateTimeContainer.className = 'edit-datetime';
    dateTimeContainer.style.display = 'none';

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = task.endDate;
    dateInput.className = 'edit-date-input';

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.value = task.endTime;
    timeInput.className = 'edit-time-input';

    dateTimeContainer.appendChild(dateInput);
    dateTimeContainer.appendChild(timeInput);

    taskElement.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <div class="task-content">
            <div class="task-title">${task.title}</div>
            <div class="task-details">
                Priority: ${task.priority} | Due: <span class="date-display">${formatDateTimeDisplay(task.endDateTime)}</span>
                <div class="task-timer" data-task-id="${task.id}"></div>
            </div>
        </div>
        <button class="edit-date-btn">Edit Time</button>
        <button class="delete-btn">Delete</button>
    `;
    
    // Insert the datetime container after the task details
    const taskDetails = taskElement.querySelector('.task-details');
    taskDetails.appendChild(dateTimeContainer);

    // Update the timer immediately
    const timer = taskElement.querySelector('.task-timer');
    const now = new Date();
    const timeLeft = new Date(task.endDateTime) - now;
    if (timeLeft < 0) {
        timer.textContent = 'Overdue!';
        timer.classList.add('overdue');
    } else {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        timer.textContent = `${days}d ${hours}h ${minutes}m`;
    }

    // Handle edit button
    const editDateBtn = taskElement.querySelector('.edit-date-btn');
    const dateDisplay = taskElement.querySelector('.date-display');
    
    editDateBtn.addEventListener('click', () => {
        if (dateTimeContainer.style.display === 'none') {
            // Show datetime inputs
            dateTimeContainer.style.display = 'flex';
            dateDisplay.style.display = 'none';
            editDateBtn.textContent = 'Save';
        } else {
            // Save new datetime
            task.endDate = dateInput.value;
            task.endTime = timeInput.value;
            task.endDateTime = formatDateTime(dateInput.value, timeInput.value).toISOString();
            dateDisplay.textContent = formatDateTimeDisplay(task.endDateTime);
            dateTimeContainer.style.display = 'none';
            dateDisplay.style.display = 'inline';
            editDateBtn.textContent = 'Edit Time';
            saveTasks();
            
            // Check if task should move to overdue
            if (isTaskOverdue(task) && taskElement.parentElement === todoList) {
                moveTaskToOverdue(taskElement);
            } else if (!isTaskOverdue(task) && taskElement.parentElement === overdueList) {
                moveTaskToTodo(taskElement);
            }
        }
    });

    // Handle checkbox change
    const checkbox = taskElement.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        taskElement.classList.toggle('completed');
        // Clear timer when task is completed
        const timer = taskElement.querySelector('.task-timer');
        if (task.completed) {
            timer.textContent = '';
        }
        saveTasks();
        moveTask(taskElement, task.completed);
        updateNextTaskCountdown();
    });
    
    // Handle delete button
    const deleteBtn = taskElement.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
        tasks = tasks.filter(t => t.id !== task.id);
        saveTasks();
        taskElement.remove();
    });
    
    // Add to appropriate list
    if (task.completed) {
        completedList.appendChild(taskElement);
    } else if (isTaskOverdue(task)) {
        overdueList.appendChild(taskElement);
    } else {
        todoList.appendChild(taskElement);
    }
}

// Move task to overdue list
function moveTaskToOverdue(taskElement) {
    if (taskElement.parentElement === todoList) {
        todoList.removeChild(taskElement);
        overdueList.appendChild(taskElement);
    }
}

// Move task to todo list
function moveTaskToTodo(taskElement) {
    if (taskElement.parentElement === overdueList) {
        overdueList.removeChild(taskElement);
        todoList.appendChild(taskElement);
    }
}

// Move task between lists
function moveTask(taskElement, isCompleted) {
    const taskId = taskElement.querySelector('.task-timer').getAttribute('data-task-id');
    const task = tasks.find(t => t.id === parseInt(taskId));
    
    if (isCompleted) {
        // If completed, move to completed list
        if (taskElement.parentElement === todoList || taskElement.parentElement === overdueList) {
            taskElement.parentElement.removeChild(taskElement);
            completedList.appendChild(taskElement);
        }
    } else {
        // If uncompleted, move to appropriate list based on due date
        if (taskElement.parentElement === completedList) {
            taskElement.parentElement.removeChild(taskElement);
            if (isTaskOverdue(task)) {
                overdueList.appendChild(taskElement);
            } else {
                todoList.appendChild(taskElement);
            }
        }
    }
} 