// State management
const state = {
    completedWorkouts: {},
    exerciseProgress: {},  // Track individual exercise checkboxes
    exerciseLogs: {},      // Track weight/reps for each exercise
    skippedDates: [],      // Dates to skip (custom rest days)
    startDate: null,
    currentMonth: null,
    currentDay: null,
    pendingSync: false     // Track if we have unsynced changes
};

// JSONBin.io configuration - SET THESE VALUES
const JSONBIN_CONFIG = {
    binId: '', // Will be set after first save or from localStorage
    apiKey: '' // Get free API key from jsonbin.io
};

// Load config from localStorage
function loadConfig() {
    const savedBinId = localStorage.getItem('jsonbin_binId');
    const savedApiKey = localStorage.getItem('jsonbin_apiKey');
    if (savedBinId) JSONBIN_CONFIG.binId = savedBinId;
    if (savedApiKey) JSONBIN_CONFIG.apiKey = savedApiKey;
}

// Save config to localStorage
function saveConfig() {
    if (JSONBIN_CONFIG.binId) localStorage.setItem('jsonbin_binId', JSONBIN_CONFIG.binId);
    if (JSONBIN_CONFIG.apiKey) localStorage.setItem('jsonbin_apiKey', JSONBIN_CONFIG.apiKey);
}

// Load data from JSONBin or localStorage
async function loadFromServer() {
    loadConfig();

    // Try to load from JSONBin if configured
    if (JSONBIN_CONFIG.binId && JSONBIN_CONFIG.apiKey) {
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.binId}/latest`, {
                headers: {
                    'X-Access-Key': JSONBIN_CONFIG.apiKey
                }
            });
            if (response.ok) {
                const result = await response.json();
                const data = result.record;
                state.completedWorkouts = data.completedWorkouts || {};
                state.exerciseProgress = data.exerciseProgress || {};
                state.exerciseLogs = data.exerciseLogs || {};
                state.skippedDates = data.skippedDates || [];
                state.startDate = data.startDate || null;
                console.log('Loaded data from JSONBin');
                updateOnlineStatus(true);
                // Also save to localStorage as backup
                saveToLocalStorage();
                return true;
            }
        } catch (e) {
            console.log('JSONBin not available, using localStorage', e);
        }
    }

    // Fallback to localStorage
    state.completedWorkouts = JSON.parse(localStorage.getItem('completedWorkouts') || '{}');
    state.exerciseProgress = JSON.parse(localStorage.getItem('exerciseProgress') || '{}');
    state.exerciseLogs = JSON.parse(localStorage.getItem('exerciseLogs') || '{}');
    state.skippedDates = JSON.parse(localStorage.getItem('skippedDates') || '[]');
    state.startDate = localStorage.getItem('startDate') || null;
    console.log('Loaded data from localStorage');
    updateOnlineStatus(JSONBIN_CONFIG.apiKey ? false : true);
    return false;
}

function getStateForSave() {
    return {
        completedWorkouts: state.completedWorkouts,
        exerciseProgress: state.exerciseProgress,
        exerciseLogs: state.exerciseLogs,
        skippedDates: state.skippedDates,
        startDate: state.startDate
    };
}

function saveToLocalStorage() {
    const data = getStateForSave();
    localStorage.setItem('completedWorkouts', JSON.stringify(data.completedWorkouts));
    localStorage.setItem('exerciseProgress', JSON.stringify(data.exerciseProgress));
    localStorage.setItem('exerciseLogs', JSON.stringify(data.exerciseLogs));
    localStorage.setItem('skippedDates', JSON.stringify(data.skippedDates));
    localStorage.setItem('startDate', data.startDate);
    localStorage.setItem('lastModified', Date.now().toString());
}

async function saveToServer() {
    // Always save to localStorage first
    saveToLocalStorage();

    // Try to save to JSONBin if configured
    if (JSONBIN_CONFIG.apiKey) {
        try {
            let response;
            const data = getStateForSave();

            if (JSONBIN_CONFIG.binId) {
                // Update existing bin
                response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.binId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Access-Key': JSONBIN_CONFIG.apiKey
                    },
                    body: JSON.stringify(data)
                });
            } else {
                // Create new bin
                response = await fetch('https://api.jsonbin.io/v3/b', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Access-Key': JSONBIN_CONFIG.apiKey,
                        'X-Bin-Name': '300-workout-tracker'
                    },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    const result = await response.json();
                    JSONBIN_CONFIG.binId = result.metadata.id;
                    saveConfig();
                    console.log('Created new JSONBin:', JSONBIN_CONFIG.binId);
                }
            }

            if (response.ok) {
                console.log('Saved to JSONBin');
                state.pendingSync = false;
                updateOnlineStatus(true);
                showSaveIndicator('Synced!');
                return;
            }
        } catch (e) {
            console.log('Could not save to JSONBin', e);
            state.pendingSync = true;
            updateOnlineStatus(false);
        }
    }

    showSaveIndicator('Saved locally');
}

// No-op for localStorage-only version
async function syncToServer() {
    // Nothing to sync - data is in localStorage
}

// Update online/offline status indicator
function updateOnlineStatus(online) {
    const indicator = document.getElementById('online-status');
    if (indicator) {
        indicator.textContent = 'Local Storage';
        indicator.className = 'online-status online';
    }
}

// Visual save indicator
function showSaveIndicator(message = 'Saved!') {
    const indicator = document.getElementById('save-indicator');
    if (indicator) {
        indicator.textContent = message;
        indicator.classList.add('show');
        setTimeout(() => indicator.classList.remove('show'), 1500);
    }
}

// DOM Elements
const tabButtons = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const modal = document.getElementById('workout-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-workout-content');
const modalComplete = document.getElementById('modal-complete');
const closeBtn = document.querySelector('.close');
const startDateInput = document.getElementById('start-date');
const resetScheduleBtn = document.getElementById('reset-schedule');
const clearProgressBtn = document.getElementById('clear-progress');

// Initialize app
async function init() {
    await loadWorkoutData();

    if (!workoutData) {
        console.error('Failed to load workout data');
        return;
    }

    // Load saved data from server (or localStorage fallback)
    await loadFromServer();

    setupTabs();
    setupModal();
    setupSchedule();
    setupSettings();
    renderAllMonths();
    updateProgress();
    updateCurrentDateDisplay();
}

// Settings functionality
function setupSettings() {
    const apiKeyInput = document.getElementById('api-key-input');
    const binIdInput = document.getElementById('bin-id-input');
    const saveSettingsBtn = document.getElementById('save-settings');
    const clearSettingsBtn = document.getElementById('clear-settings');
    const exportDataBtn = document.getElementById('export-data');
    const importDataBtn = document.getElementById('import-data');
    const importFileInput = document.getElementById('import-file');
    const syncStatus = document.getElementById('sync-status');

    // Load current settings
    loadConfig();
    if (JSONBIN_CONFIG.apiKey) apiKeyInput.value = JSONBIN_CONFIG.apiKey;
    if (JSONBIN_CONFIG.binId) binIdInput.value = JSONBIN_CONFIG.binId;

    // Save settings
    saveSettingsBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            syncStatus.textContent = 'Please enter an API key';
            syncStatus.className = 'sync-status error';
            return;
        }

        JSONBIN_CONFIG.apiKey = apiKey;
        saveConfig();
        syncStatus.textContent = 'Saving...';
        syncStatus.className = 'sync-status';

        await saveToServer();

        binIdInput.value = JSONBIN_CONFIG.binId || '';
        syncStatus.textContent = JSONBIN_CONFIG.binId ? 'Connected and synced!' : 'Failed to connect';
        syncStatus.className = JSONBIN_CONFIG.binId ? 'sync-status success' : 'sync-status error';
    });

    // Clear settings
    clearSettingsBtn.addEventListener('click', () => {
        if (confirm('Clear cloud sync settings? Your local data will be kept.')) {
            JSONBIN_CONFIG.apiKey = '';
            JSONBIN_CONFIG.binId = '';
            localStorage.removeItem('jsonbin_apiKey');
            localStorage.removeItem('jsonbin_binId');
            apiKeyInput.value = '';
            binIdInput.value = '';
            syncStatus.textContent = 'Settings cleared';
            syncStatus.className = 'sync-status';
            updateOnlineStatus(true);
        }
    });

    // Export data
    exportDataBtn.addEventListener('click', () => {
        const data = getStateForSave();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '300-workout-data.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import data
    importDataBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            state.completedWorkouts = data.completedWorkouts || {};
            state.exerciseProgress = data.exerciseProgress || {};
            state.exerciseLogs = data.exerciseLogs || {};
            state.skippedDates = data.skippedDates || [];
            state.startDate = data.startDate || null;

            await saveToServer();
            renderAllMonths();
            updateProgress();
            renderSchedule();

            alert('Data imported successfully!');
        } catch (err) {
            alert('Failed to import data: ' + err.message);
        }

        importFileInput.value = '';
    });
}

// Tab functionality
function setupTabs() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;

            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Modal functionality
function setupModal() {
    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    modalComplete.addEventListener('change', async (e) => {
        if (state.currentMonth && state.currentDay) {
            const key = `${state.currentMonth}-${state.currentDay}`;
            if (e.target.checked) {
                state.completedWorkouts[key] = true;
            } else {
                delete state.completedWorkouts[key];
            }
            await saveToServer();
            updateWorkoutCard(state.currentMonth, state.currentDay);
            updateProgress();
            renderSchedule();
        }
    });

    clearProgressBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all progress? This cannot be undone.')) {
            state.completedWorkouts = {};
            await saveToServer();
            renderAllMonths();
            updateProgress();
            renderSchedule();
        }
    });
}

function openModal(month, day) {
    state.currentMonth = month;
    state.currentDay = day;

    const monthData = workoutData[month];
    const dayData = monthData.days.find(d => d.day === day);

    if (!dayData) return;

    const monthNum = month.replace('month', '');
    const workoutType = getWorkoutType(dayData.content);
    const key = `${month}-${day}`;

    modalTitle.textContent = `Month ${monthNum} - Day ${day}`;
    document.getElementById('modal-workout-type').textContent = workoutType;

    // Render workout content as Excel-style table
    modalContent.innerHTML = renderWorkoutTable(dayData.content, key);

    // Restore exercise checkbox states
    const savedProgress = state.exerciseProgress[key] || [];
    const checkboxes = modalContent.querySelectorAll('.exercise-check');
    checkboxes.forEach((cb, index) => {
        cb.checked = savedProgress.includes(index);
        cb.dataset.index = index;
        cb.addEventListener('change', handleExerciseCheck);
        // Apply visual style for checked rows
        if (savedProgress.includes(index)) {
            cb.closest('tr').classList.add('exercise-done');
        }
    });

    // Setup log buttons and restore saved logs
    const logButtons = modalContent.querySelectorAll('.log-btn');
    logButtons.forEach(btn => {
        btn.addEventListener('click', () => openLogInput(btn));
    });

    // Restore saved exercise logs
    const savedLogs = state.exerciseLogs[key] || {};
    Object.keys(savedLogs).forEach(exerciseIndex => {
        const logsContainer = modalContent.querySelector(`.set-logs[data-index="${exerciseIndex}"]`);
        if (logsContainer) {
            renderExerciseLogs(logsContainer, savedLogs[exerciseIndex]);
        }
    });

    // Set workout complete checkbox state
    modalComplete.checked = state.completedWorkouts[key] || false;

    // Update stats
    const exerciseCount = countExercises(dayData.content);
    const completedCount = savedProgress.length;
    document.getElementById('modal-stats').textContent = `${completedCount}/${exerciseCount} exercises done`;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Open inline log input
function openLogInput(btn) {
    const index = btn.dataset.index;
    const cell = btn.closest('.log-cell');

    // Check if input already exists
    if (cell.querySelector('.log-input-row')) {
        return;
    }

    const inputRow = document.createElement('div');
    inputRow.className = 'log-input-row';
    inputRow.innerHTML = `
        <input type="number" class="log-weight" placeholder="Weight" min="0" step="0.5">
        <span class="log-unit">lbs</span>
        <span class="log-x">x</span>
        <input type="number" class="log-reps" placeholder="Reps" min="0">
        <button class="log-save-btn">Add</button>
        <button class="log-cancel-btn">X</button>
    `;

    cell.insertBefore(inputRow, cell.querySelector('.set-logs'));

    // Focus weight input
    inputRow.querySelector('.log-weight').focus();

    // Handle save
    inputRow.querySelector('.log-save-btn').addEventListener('click', () => {
        saveExerciseLog(index, inputRow);
    });

    // Handle enter key
    inputRow.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveExerciseLog(index, inputRow);
        });
    });

    // Handle cancel
    inputRow.querySelector('.log-cancel-btn').addEventListener('click', () => {
        inputRow.remove();
    });
}

// Save exercise log entry
async function saveExerciseLog(exerciseIndex, inputRow) {
    const key = `${state.currentMonth}-${state.currentDay}`;
    const weight = parseFloat(inputRow.querySelector('.log-weight').value) || 0;
    const reps = parseInt(inputRow.querySelector('.log-reps').value) || 0;

    console.log('Saving log:', { key, exerciseIndex, weight, reps });

    if (weight === 0 && reps === 0) {
        inputRow.remove();
        return;
    }

    // Initialize if needed
    if (!state.exerciseLogs[key]) {
        state.exerciseLogs[key] = {};
    }
    if (!state.exerciseLogs[key][exerciseIndex]) {
        state.exerciseLogs[key][exerciseIndex] = [];
    }

    // Add the log entry
    const logEntry = {
        weight,
        reps,
        timestamp: Date.now()
    };
    state.exerciseLogs[key][exerciseIndex].push(logEntry);

    console.log('State after adding:', JSON.stringify(state.exerciseLogs));

    // Update the display
    const logsContainer = inputRow.closest('.log-cell').querySelector('.set-logs');
    renderExerciseLogs(logsContainer, state.exerciseLogs[key][exerciseIndex]);

    // Remove input row
    inputRow.remove();

    // Save to server
    await saveToServer();
}

// Render exercise logs
function renderExerciseLogs(container, logs) {
    if (!logs || logs.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = logs.map((log, index) => `
        <span class="set-tag" data-log-index="${index}">
            S${index + 1}: ${log.weight}lbs x ${log.reps}
            <button class="remove-log" data-log-index="${index}">&times;</button>
        </span>
    `).join('');

    // Add remove handlers
    container.querySelectorAll('.remove-log').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeExerciseLog(container.dataset.index, parseInt(btn.dataset.logIndex));
        });
    });
}

// Remove a log entry
async function removeExerciseLog(exerciseIndex, logIndex) {
    const key = `${state.currentMonth}-${state.currentDay}`;

    if (state.exerciseLogs[key] && state.exerciseLogs[key][exerciseIndex]) {
        state.exerciseLogs[key][exerciseIndex].splice(logIndex, 1);

        // Update display
        const logsContainer = modalContent.querySelector(`.set-logs[data-index="${exerciseIndex}"]`);
        renderExerciseLogs(logsContainer, state.exerciseLogs[key][exerciseIndex]);

        // Save to server
        await saveToServer();
    }
}

// Handle individual exercise checkbox changes
async function handleExerciseCheck(e) {
    const key = `${state.currentMonth}-${state.currentDay}`;
    const index = parseInt(e.target.dataset.index);
    const row = e.target.closest('tr');

    if (!state.exerciseProgress[key]) {
        state.exerciseProgress[key] = [];
    }

    if (e.target.checked) {
        if (!state.exerciseProgress[key].includes(index)) {
            state.exerciseProgress[key].push(index);
        }
        row.classList.add('exercise-done');
    } else {
        state.exerciseProgress[key] = state.exerciseProgress[key].filter(i => i !== index);
        row.classList.remove('exercise-done');
    }

    // Update the stats display
    const checkboxes = modalContent.querySelectorAll('.exercise-check');
    const completedCount = state.exerciseProgress[key].length;
    document.getElementById('modal-stats').textContent = `${completedCount}/${checkboxes.length} exercises done`;

    // Auto-save
    await saveToServer();
}

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    state.currentMonth = null;
    state.currentDay = null;
}

function renderWorkoutTable(content, workoutKey) {
    let rowNum = 0;

    const rows = content.map(line => {
        const trimmed = line.trim();
        const lower = trimmed.toLowerCase();

        // Skip empty lines
        if (!trimmed) return '';

        // Section headers (Workout:, etc.)
        if (lower === 'workout:') {
            return ''; // Skip the "Workout:" header
        }

        // Then markers - visual separator
        if (lower === 'then:' || lower === 'then') {
            return `
                <tr class="then-row">
                    <td colspan="5">THEN</td>
                </tr>
            `;
        }

        // Rest day content
        if (lower.includes('rest') && lower.includes('or')) {
            rowNum++;
            return `
                <tr class="rest-row">
                    <td class="row-number">${rowNum}</td>
                    <td class="exercise-cell" colspan="3">${trimmed}</td>
                    <td class="checkbox-cell"><input type="checkbox" class="exercise-check"></td>
                </tr>
            `;
        }

        // Section/named workout headers
        if ((lower.endsWith(':') && trimmed.length < 40) ||
            (trimmed.startsWith('"') || trimmed.startsWith('"'))) {
            return `
                <tr class="section-row">
                    <td colspan="5">${trimmed}</td>
                </tr>
            `;
        }

        const currentRowNum = rowNum;
        rowNum++;

        // Get exercise description if available
        const descInfo = getExerciseDescription(trimmed);
        const description = descInfo ? descInfo.description : '';

        // Check if this looks like an exercise that needs weight tracking
        const needsWeightTracking = /\d+x|\d+\s*(rep|set)|@|#|kg|lb|%/i.test(trimmed) ||
                                    descInfo !== null;

        return `
            <tr data-exercise-index="${currentRowNum}">
                <td class="row-number">${rowNum}</td>
                <td class="exercise-cell">${trimmed}</td>
                <td class="log-cell">
                    ${needsWeightTracking ? `<button class="log-btn" data-index="${currentRowNum}">+ Log</button>
                    <div class="set-logs" data-index="${currentRowNum}"></div>` : ''}
                </td>
                <td class="checkbox-cell"><input type="checkbox" class="exercise-check"></td>
            </tr>
        `;
    }).join('');

    return `
        <table class="workout-table">
            <thead>
                <tr>
                    <th style="width: 40px">#</th>
                    <th>Exercise</th>
                    <th style="width: 180px">Log (Weight/Reps)</th>
                    <th style="width: 50px">Done</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

function countExercises(content) {
    return content.filter(line => {
        const lower = line.toLowerCase().trim();
        return lower &&
               lower !== 'workout:' &&
               lower !== 'then:' &&
               lower !== 'then' &&
               !lower.endsWith(':');
    }).length;
}

// Render all months
function renderAllMonths() {
    ['month1', 'month2', 'month3'].forEach(renderMonth);
}

function renderMonth(monthKey) {
    const container = document.getElementById(`${monthKey}-workouts`);
    const monthData = workoutData[monthKey];

    if (!container || !monthData) return;

    container.innerHTML = monthData.days.map(day => {
        const key = `${monthKey}-${day.day}`;
        const isCompleted = state.completedWorkouts[key];
        const workoutType = getWorkoutType(day.content);
        const preview = getWorkoutPreview(day.content);

        return `
            <div class="workout-card ${isCompleted ? 'completed' : ''}"
                 data-month="${monthKey}"
                 data-day="${day.day}">
                <h3>Day ${day.day}</h3>
                <span class="workout-type">${workoutType}</span>
                <div class="workout-preview">${preview}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.workout-card').forEach(card => {
        card.addEventListener('click', () => {
            const month = card.dataset.month;
            const day = parseInt(card.dataset.day);
            openModal(month, day);
        });
    });
}

function updateWorkoutCard(month, day) {
    const card = document.querySelector(`.workout-card[data-month="${month}"][data-day="${day}"]`);
    if (card) {
        const key = `${month}-${day}`;
        card.classList.toggle('completed', state.completedWorkouts[key]);
    }
}

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Check if a date is a skipped/rest day
function isSkippedDate(date) {
    const dateStr = formatDate(date);
    return state.skippedDates.includes(dateStr);
}

// Add a rest day
async function addRestDay(dateStr) {
    if (!state.skippedDates.includes(dateStr)) {
        state.skippedDates.push(dateStr);
        await saveToServer();
        renderSchedule();
    }
}

// Remove a rest day
async function removeRestDay(dateStr) {
    state.skippedDates = state.skippedDates.filter(d => d !== dateStr);
    await saveToServer();
    renderSchedule();
}

// Push all workouts from a date by one day
async function pushWorkoutsFromDate(fromDateStr) {
    // Add the fromDate as a rest day, which will push everything after it
    await addRestDay(fromDateStr);
}

// Schedule functionality
function setupSchedule() {
    // Initialize start date - default to tomorrow
    if (state.startDate) {
        startDateInput.value = state.startDate;
    } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = formatDate(tomorrow);
        startDateInput.value = tomorrowStr;
        state.startDate = tomorrowStr;

        // Add Dec 19 and 20 as default rest days
        state.skippedDates = ['2025-12-19', '2025-12-20'];
        saveToServer();
    }

    startDateInput.addEventListener('change', async (e) => {
        state.startDate = e.target.value;
        await saveToServer();
        renderSchedule();
    });

    resetScheduleBtn.addEventListener('click', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        startDateInput.value = formatDate(tomorrow);
        state.startDate = formatDate(tomorrow);
        await saveToServer();
        renderSchedule();
    });

    renderSchedule();
}

function renderSchedule() {
    const container = document.getElementById('schedule-calendar');
    if (!container || !workoutData) return;

    const startDate = new Date(state.startDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate all workout days, skipping Fridays and custom rest days
    const scheduleItems = [];
    let currentDate = new Date(startDate);
    let workoutIndex = 0;

    // Flatten all workouts
    const allWorkouts = [];
    ['month1', 'month2', 'month3'].forEach(monthKey => {
        const monthData = workoutData[monthKey];
        monthData.days.forEach(day => {
            allWorkouts.push({ month: monthKey, day: day.day, content: day.content });
        });
    });

    while (workoutIndex < allWorkouts.length) {
        const dayOfWeek = currentDate.getDay();
        const dateStr = formatDate(currentDate);
        const isCustomRestDay = isSkippedDate(currentDate);

        // Skip Fridays (dayOfWeek === 5) or custom rest days
        if (dayOfWeek === 5) {
            scheduleItems.push({
                date: new Date(currentDate),
                dateStr,
                isRestDay: true,
                isFriday: true,
                isCustomRest: false
            });
        } else if (isCustomRestDay) {
            scheduleItems.push({
                date: new Date(currentDate),
                dateStr,
                isRestDay: true,
                isFriday: false,
                isCustomRest: true
            });
        } else {
            const workout = allWorkouts[workoutIndex];
            scheduleItems.push({
                date: new Date(currentDate),
                dateStr,
                ...workout,
                isRestDay: false
            });
            workoutIndex++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Render schedule
    container.innerHTML = scheduleItems.map(item => {
        const dateStr = item.date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        const isToday = item.date.getTime() === today.getTime();
        const isPast = item.date < today;

        if (item.isFriday) {
            return `
                <div class="schedule-day rest-day ${isToday ? 'today' : ''}" data-date="${item.dateStr}">
                    <div class="schedule-day-header">
                        <span class="schedule-day-date">${dateStr}</span>
                        <span class="schedule-day-label">Friday Rest</span>
                    </div>
                    <div class="schedule-day-preview">Rest Day - No workout scheduled</div>
                </div>
            `;
        }

        if (item.isCustomRest) {
            return `
                <div class="schedule-day rest-day custom-rest ${isToday ? 'today' : ''}" data-date="${item.dateStr}">
                    <div class="schedule-day-header">
                        <span class="schedule-day-date">${dateStr}</span>
                        <span class="schedule-day-label">Rest Day</span>
                        <button class="remove-rest-btn" data-date="${item.dateStr}" title="Remove rest day">&times;</button>
                    </div>
                    <div class="schedule-day-preview">Custom Rest Day</div>
                </div>
            `;
        }

        const key = `${item.month}-${item.day}`;
        const isCompleted = state.completedWorkouts[key];
        const monthNum = item.month.replace('month', '');
        const workoutType = getWorkoutType(item.content);
        const preview = getWorkoutPreview(item.content, 2);

        return `
            <div class="schedule-day ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}"
                 data-month="${item.month}"
                 data-day="${item.day}"
                 data-date="${item.dateStr}">
                <div class="schedule-day-header">
                    <span class="schedule-day-date">${dateStr}</span>
                    <span class="schedule-day-label">M${monthNum} D${item.day} - ${workoutType}</span>
                    <button class="push-btn" data-date="${item.dateStr}" title="Push this workout to next day">Push</button>
                </div>
                <div class="schedule-day-preview">${preview}</div>
            </div>
        `;
    }).join('');

    // Add click handlers for workout days
    container.querySelectorAll('.schedule-day:not(.rest-day)').forEach(day => {
        day.addEventListener('click', (e) => {
            // Don't open modal if clicking the push button
            if (e.target.classList.contains('push-btn')) return;

            const month = day.dataset.month;
            const dayNum = parseInt(day.dataset.day);
            openModal(month, dayNum);
        });
    });

    // Add push button handlers
    container.querySelectorAll('.push-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dateStr = btn.dataset.date;
            if (confirm(`Push this workout to the next day? This will add ${btn.closest('.schedule-day').querySelector('.schedule-day-date').textContent} as a rest day.`)) {
                pushWorkoutsFromDate(dateStr);
            }
        });
    });

    // Add remove rest day handlers
    container.querySelectorAll('.remove-rest-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dateStr = btn.dataset.date;
            removeRestDay(dateStr);
        });
    });
}

// Progress tracking
function updateProgress() {
    const total = Object.keys(state.completedWorkouts).length;
    const month1 = Object.keys(state.completedWorkouts).filter(k => k.startsWith('month1')).length;
    const month2 = Object.keys(state.completedWorkouts).filter(k => k.startsWith('month2')).length;
    const month3 = Object.keys(state.completedWorkouts).filter(k => k.startsWith('month3')).length;

    document.getElementById('total-workouts').textContent = total;
    document.getElementById('month1-progress').textContent = month1;
    document.getElementById('month2-progress').textContent = month2;
    document.getElementById('month3-progress').textContent = month3;

    const percentage = (total / 86) * 100;
    document.getElementById('overall-progress').style.width = `${percentage}%`;
}

// Update current date display
function updateCurrentDateDisplay() {
    const today = new Date();
    document.getElementById('current-date').textContent = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Find next workout
    if (state.startDate && workoutData) {
        const startDate = new Date(state.startDate + 'T00:00:00');
        let currentDate = new Date(startDate);
        let workoutIndex = 0;

        const allWorkouts = [];
        ['month1', 'month2', 'month3'].forEach(monthKey => {
            const monthData = workoutData[monthKey];
            monthData.days.forEach(day => {
                allWorkouts.push({ month: monthKey, day: day.day });
            });
        });

        while (workoutIndex < allWorkouts.length) {
            const dayOfWeek = currentDate.getDay();
            const isCustomRest = isSkippedDate(currentDate);

            // Skip Fridays and custom rest days
            if (dayOfWeek !== 5 && !isCustomRest) {
                const workout = allWorkouts[workoutIndex];
                const key = `${workout.month}-${workout.day}`;

                if (!state.completedWorkouts[key] && currentDate >= today) {
                    const dateStr = currentDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    });
                    document.getElementById('next-workout').textContent =
                        `Next: Month ${workout.month.replace('month', '')} Day ${workout.day} (${dateStr})`;
                    break;
                }
                workoutIndex++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
