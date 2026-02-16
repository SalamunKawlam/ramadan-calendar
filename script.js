// --- Global State ---
let commands = [];
let warnings = [];
let commandIndex = 0;
let warningIndex = 0;

// --- Date Display Logic ---
function updateDateDisplay(referenceDate = null) {
    const dateDisplay = document.getElementById('dateDisplay');
    if (!dateDisplay) return;

    // Use simulated offset if available, or just the provided date
    const now = getSimulatedNow();

    // Hijri Calculation (Est. Ramadan 1 1447 = Feb 19 2026)
    const startOfRamadan = new Date('2026-02-19T00:00:00');
    // Reset time components for accurate day diff
    const nowDate = new Date(now);
    nowDate.setHours(0, 0, 0, 0);

    const diffTime = nowDate - startOfRamadan;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    let hijriDate = "";
    if (diffDays >= 1 && diffDays <= 30) {
        hijriDate = `${diffDays} Ramadan 1447`;
    } else if (diffDays < 1) {
        hijriDate = "Sha'ban 1447";
    } else {
        hijriDate = "Shawwal 1447";
    }

    // Gregorian Format
    const options = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
    const gregDate = now.toLocaleDateString('en-GB', options);

    dateDisplay.textContent = `${hijriDate} // ${gregDate}`;
}

// --- Animation Logic ---
function updateReminders() {
    if (commands.length === 0 || warnings.length === 0) return;

    const commandWrapper = document.getElementById('commandWrapper');
    const warningWrapper = document.getElementById('warningWrapper');

    // 1. Slide Out (Up)
    commandWrapper.classList.remove('slide-in');
    warningWrapper.classList.remove('slide-in');
    commandWrapper.classList.add('slide-out');
    warningWrapper.classList.add('slide-out');

    setTimeout(() => {
        // 2. Update Indices
        commandIndex = (commandIndex + 1) % commands.length;
        warningIndex = (warningIndex + 1) % warnings.length;

        // 3. Update Text Content
        document.getElementById('commandText').textContent = commands[commandIndex].text;
        document.getElementById('commandSource').textContent = commands[commandIndex].source;

        document.getElementById('warningText').textContent = warnings[warningIndex].text;
        document.getElementById('warningSource').textContent = warnings[warningIndex].source;

        // 4. Slide In (from Bottom)
        commandWrapper.classList.remove('slide-out');
        warningWrapper.classList.remove('slide-out');
        commandWrapper.classList.add('slide-in');
        warningWrapper.classList.add('slide-in');
    }, 500); // Wait for CSS transition (0.5s) to finish
}

// --- Data Fetching ---
async function loadReminders() {
    try {
        const response = await fetch('./reminders.json');
        const data = await response.json();

        commands = data.commands;
        warnings = data.warnings;

        // Initialize first render if needed (HTML has default content, but we can overwrite to be sure)
        // document.getElementById('commandText').textContent = commands[0].text;
        // ...

        // Start the cycle
        setInterval(updateReminders, 10000);

    } catch (e) {
        console.error("Could not load reminders.json", e);
    }
}

loadReminders();

// --- Calendar Logic ---
const grid = document.getElementById('calendarGrid');
let cachedData = null; // Store data to avoid re-fetching

async function loadCalendar(simulatedToday = null) {
    try {
        if (!cachedData) {
            const response = await fetch('./data.json');
            cachedData = await response.json();
        }

        const data = cachedData;
        let htmlContent = '';

        // Use simulated date if provided, otherwise real today
        const referenceDate = simulatedToday ? new Date(simulatedToday) : new Date();
        referenceDate.setHours(0, 0, 0, 0);

        data.forEach(item => {
            // Parse date: "19 February" -> "19 February 2026"
            const dateStr = `${item.date} 2026`;
            const itemDate = new Date(dateStr);
            itemDate.setHours(0, 0, 0, 0);

            // Formatter for Date: "19 February" -> "FEB 19"
            const parts = item.date.split(' ');
            const dayPart = parts[0];
            const monthPart = parts[1].substring(0, 3).toUpperCase();
            const displayDate = `${monthPart} ${dayPart}`;

            // Formatter for Time: "5:12 AM" -> "5:12<span class="ampm">AM</span>"
            const formatTimeStr = (t) => {
                const [time, period] = t.split(' ');
                return `${time}<span class="ampm">${period}</span>`;
            };

            let cardClass = 'day-card';
            if (itemDate < referenceDate) {
                cardClass += ' completed';
            } else if (itemDate.getTime() === referenceDate.getTime()) {
                cardClass += ' active';
            }

            htmlContent += `
                <div class="${cardClass}">
                    <div class="card-header">
                        <span>${displayDate}</span>
                        <span class="ramadan-day">${item.day.toString().padStart(2, '0')}</span>
                    </div>
                    <div class="card-body">
                        <div class="time-group">
                            <span class="label">Sehri</span>
                            <span class="time-value">${formatTimeStr(item.sehri)}</span>
                        </div>
                        <div class="time-group">
                            <span class="label">Iftar</span>
                            <span class="time-value">${formatTimeStr(item.iftar)}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = htmlContent;

    } catch (e) {
        console.error("Could not load calendar data", e);
        grid.innerHTML = '<p style="text-align:center; padding: 2rem;">Error loading calendar data. Please ensure you are running this on a local server (e.g., Live Server).</p>';
    }
}

// --- Debug Logic ---
const debugDateInput = document.getElementById('debugDate');
const debugTimeInput = document.getElementById('debugTime');

let simulatedOffset = 0; // ms difference from real time

// Initialize with current system time
function setInitialDebugTime() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    debugDateInput.value = `${yyyy}-${mm}-${dd}`;
    debugTimeInput.value = `${hh}:${min}:${ss}`;
    simulatedOffset = 0;
}
setInitialDebugTime();

function updateSimulatedOffset() {
    if (!debugDateInput.value || !debugTimeInput.value) {
        simulatedOffset = 0;
        return;
    }
    const simulatedDate = new Date(`${debugDateInput.value}T${debugTimeInput.value}`);
    simulatedOffset = simulatedDate.getTime() - Date.now();
}

// Listener
[debugDateInput, debugTimeInput].forEach(input => {
    input.addEventListener('change', () => {
        updateSimulatedOffset();
        loadCalendar(debugDateInput.value);
        updateDateDisplay();
    });
});

// Helper to get current (simulated) "now"
function getSimulatedNow() {
    return new Date(Date.now() + simulatedOffset);
}

// --- Notification Logic ---
let notifiedEvents = new Set();

async function requestNotificationPermission() {
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            await Notification.requestPermission();
        }
    }
}
requestNotificationPermission();

function sendNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
    } else {
        console.log(`NOTIFICATION: ${title} - ${body}`);
    }
}

// --- Countdown Logic ---
let countdownInterval = null;

function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);

    const timerLabel = document.getElementById('timerLabel');
    const timerValue = document.getElementById('timerValue');

    countdownInterval = setInterval(() => {
        if (!cachedData) return;

        const now = getSimulatedNow();

        const parseTime = (dateStr, timeStr) => {
            const d = new Date(`${dateStr} 2026`);
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours);
            minutes = parseInt(minutes);
            if (hours === 12 && modifier === 'AM') hours = 0;
            if (hours !== 12 && modifier === 'PM') hours += 12;
            d.setHours(hours, minutes, 0, 0);
            return d;
        };

        let targetDate = null;
        let targetLabel = "";
        let eventType = "";

        for (let i = 0; i < cachedData.length; i++) {
            const item = cachedData[i];
            const sehriTime = parseTime(item.date, item.sehri);
            const iftarTime = parseTime(item.date, item.iftar);

            if (now < sehriTime) {
                targetDate = sehriTime;
                targetLabel = `SEHRI ENDS (Day ${item.day})`;
                eventType = "Sehri";
                break;
            }

            if (now < iftarTime) {
                targetDate = iftarTime;
                targetLabel = `IFTAR TIME (Day ${item.day})`;
                eventType = "Iftar";
                break;
            }
        }

        if (!targetDate) {
            const firstDay = parseTime(cachedData[0].date, cachedData[0].sehri);
            if (now < firstDay) {
                targetDate = firstDay;
                targetLabel = "RAMADAN STARTS IN";
            } else {
                timerLabel.textContent = "EID MUBARAK";
                timerValue.textContent = "00:00:00";
                return;
            }
        }

        // --- Notification Check (10 mins = 600,000ms) ---
        const diff = targetDate - now;
        const tenMinutes = 10 * 60 * 1000;
        const eventId = `${targetDate.getTime()}`;

        if (diff <= tenMinutes && diff > 0 && !notifiedEvents.has(eventId)) {
            const message = eventType === "Sehri"
                ? "Sehri is ending in 10 minutes!"
                : "Iftar is in 10 minutes!";
            sendNotification(`Ramadan Tracker: ${eventType} Warning`, message);
            notifiedEvents.add(eventId);
        }

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        timerLabel.textContent = targetLabel;
        timerValue.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    }, 1000);
}

// Initial Load
loadCalendar(debugDateInput.value).then(() => {
    startCountdown();
    updateDateDisplay();
});

// --- Test Notification Trigger ---
document.getElementById('testNotifyBtn').addEventListener('click', () => {
    const btn = document.getElementById('testNotifyBtn');
    btn.disabled = true;
    btn.textContent = "Triggering in 3s...";

    setTimeout(() => {
        sendNotification("Test Notification", "This is a 3-second test notification for the Ramadan Tracker.");
        btn.disabled = false;
        btn.textContent = "Test Notify (3s)";
    }, 3000);
});
// --- Fullscreen Logic ---
const fullscreenToggleBtn = document.getElementById('fullscreenToggle');
const countdownContainer = document.getElementById('countdownDisplay');
const iconExpand = document.querySelector('.icon-expand');
const iconCollapse = document.querySelector('.icon-collapse');

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        countdownContainer.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

function updateFullscreenUI() {
    if (document.fullscreenElement) {
        countdownContainer.classList.add('fullscreen-active');
        iconExpand.style.display = 'none';
        iconCollapse.style.display = 'block';
    } else {
        countdownContainer.classList.remove('fullscreen-active');
        iconExpand.style.display = 'block';
        iconCollapse.style.display = 'none';

        // Removed forced reflow hack to allow smooth CSS transition
    }
}

if (fullscreenToggleBtn) {
    fullscreenToggleBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', updateFullscreenUI);
}
