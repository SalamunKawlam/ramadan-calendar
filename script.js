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

// --- Marquee Logic ---
function setupMarquee() {
    const marqueeContent = document.getElementById('marqueeContent');
    const marqueeText = marqueeContent.querySelector('.marquee-text');
    if (!marqueeContent || !marqueeText) return;

    // Clear existing duplicated content (if any, during resize)
    const originalText = marqueeText.cloneNode(true);
    marqueeContent.innerHTML = '';
    marqueeContent.appendChild(originalText);

    const viewportWidth = window.innerWidth;
    let contentWidth = originalText.offsetWidth;

    // Safety check for offsetWidth being 0 (e.g. if Hidden)
    if (contentWidth === 0) contentWidth = 1000;

    // Duplicate until we have enough width for a seamless scroll
    // We need at least 2 * viewportWidth of content to translate -50% safely
    const repeatCount = Math.ceil((viewportWidth * 2) / contentWidth);

    // We want the total content to be perfectly halfable for the animation
    // So we'll create a single strip, then duplicate THAT strip once.
    for (let i = 1; i < repeatCount; i++) {
        marqueeContent.appendChild(originalText.cloneNode(true));
    }

    // Now double the entire content to make the -50% translation seamless
    const currentContent = marqueeContent.innerHTML;
    marqueeContent.innerHTML = currentContent + currentContent;
}

window.addEventListener('resize', setupMarquee);

// --- Animation Logic ---
function updateReminders() {
    if (commands.length === 0 || warnings.length === 0) return;

    const remindersBox = document.querySelector('.reminders-box');
    const commandWrapper = document.getElementById('commandWrapper');
    const warningWrapper = document.getElementById('warningWrapper');

    // 1. Capture Current Height
    const currentHeight = remindersBox.offsetHeight;
    remindersBox.style.height = `${currentHeight}px`;

    // 2. Slide Out (Up)
    commandWrapper.classList.remove('slide-in');
    warningWrapper.classList.remove('slide-in');
    commandWrapper.classList.add('slide-out');
    warningWrapper.classList.add('slide-out');

    setTimeout(() => {
        // 3. Update Indices
        commandIndex = (commandIndex + 1) % commands.length;
        warningIndex = (warningIndex + 1) % warnings.length;

        // 4. Update Text Content
        document.getElementById('commandText').textContent = commands[commandIndex].text;
        document.getElementById('commandSource').textContent = commands[commandIndex].source;

        document.getElementById('warningText').textContent = warnings[warningIndex].text;
        document.getElementById('warningSource').textContent = warnings[warningIndex].source;

        // 5. Measure New Height
        remindersBox.style.height = 'auto';
        const newHeight = remindersBox.scrollHeight;
        remindersBox.style.height = `${currentHeight}px`; // Force back to transition from

        // Force a reflow
        remindersBox.offsetHeight;

        // 6. Apply New Height & Slide In
        remindersBox.style.height = `${newHeight}px`;

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

function getSelectedDistrict() {
    return localStorage.getItem('selected-district') || 'Dhaka';
}

async function loadCalendar(simulatedToday = null) {
    try {
        if (!cachedData) {
            const response = await fetch('./data.json');
            cachedData = await response.json();
        }

        const district = getSelectedDistrict();
        const data = cachedData[district] || cachedData['Dhaka'];
        let htmlContent = '';

        // Use simulated date if provided, otherwise real today
        const referenceDate = simulatedToday ? new Date(simulatedToday) : new Date();
        referenceDate.setHours(0, 0, 0, 0);

        data.forEach(item => {
            // Parse date: "19 February" -> "19 February 2026"
            const dateStr = `${item.date} 2026`;
            const itemDate = new Date(dateStr);
            itemDate.setHours(0, 0, 0, 0);

            // Formatter for Date: "19 February" -> "FEB 19 | Thu"
            const parts = item.date.split(' ');
            const dayPart = parts[0];
            const monthPart = parts[1].substring(0, 3).toUpperCase();
            const dayOfWeek = itemDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const displayDate = `${monthPart} ${dayPart} <span class="date-separator">|</span> <span class="day-name">${dayOfWeek}</span>`;

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

// --- District Selector ---
(function initDistrictSelector() {
    const selector = document.getElementById('districtSelector');
    if (!selector) return;

    // Load saved district
    selector.value = getSelectedDistrict();

    selector.addEventListener('change', () => {
        localStorage.setItem('selected-district', selector.value);
        cachedData && loadCalendar(); // re-render with new district
        startCountdown();             // restart countdown for new times
    });
})();

// --- Debug Logic ---
const debugContainer = document.querySelector('.debug-controls');
const debugDateInput = document.getElementById('debugDate');
const debugTimeInput = document.getElementById('debugTime');

// Only show debug tools on local environments
const isLocal = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === ''; // For local file:// access

if (!isLocal && debugContainer) {
    debugContainer.style.display = 'none';
}

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
    const timerSubtext = document.getElementById('timerSubtext');

    countdownInterval = setInterval(() => {
        if (!cachedData) return;

        const districtData = cachedData[getSelectedDistrict()] || cachedData['Dhaka'];

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
        let currentDayData = null;

        // Find current or upcoming day data
        for (let i = 0; i < districtData.length; i++) {
            const item = districtData[i];
            const sehriTime = parseTime(item.date, item.sehri);
            const iftarTime = parseTime(item.date, item.iftar);

            // If we are before sehri or before iftar of this day, it's the current active day
            if (now < iftarTime) {
                currentDayData = item;
                if (now < sehriTime) {
                    targetDate = sehriTime;
                    targetLabel = `SEHRI ENDS (Day ${item.day})`;
                    eventType = "Sehri";
                } else {
                    targetDate = iftarTime;
                    targetLabel = `IFTAR TIME (Day ${item.day})`;
                    eventType = "Iftar";
                }
                break;
            }
        }

        // Display current day's Sehri/Iftar context
        if (currentDayData && timerSubtext) {
            timerSubtext.textContent = `Sehri: ${currentDayData.sehri} // Iftar: ${currentDayData.iftar}`;
        } else if (timerSubtext) {
            timerSubtext.textContent = "";
        }

        if (!targetDate) {
            const firstDay = parseTime(districtData[0].date, districtData[0].sehri);
            if (now < firstDay) {
                targetDate = firstDay;
                targetLabel = "RAMADAN STARTS IN";
            } else {
                timerLabel.textContent = "EID MUBARAK";
                timerValue.textContent = "00:00:00";
                return;
            }
        }

        // --- Notification Check (respects user preferences) ---
        const diff = targetDate - now;
        const notifPrefs = getNotificationPreferences();
        const minutesBefore = notifPrefs.minutesBefore * 60 * 1000;
        const eventId = `${targetDate.getTime()}`;

        const sehriEnabled = notifPrefs.sehri;
        const iftarEnabled = notifPrefs.iftar;
        const shouldNotify = (eventType === "Sehri" && sehriEnabled) || (eventType === "Iftar" && iftarEnabled);

        if (shouldNotify && diff <= minutesBefore && diff > 0 && !notifiedEvents.has(eventId)) {
            const message = eventType === "Sehri"
                ? `Sehri is ending in ${notifPrefs.minutesBefore} minutes!`
                : `Iftar is in ${notifPrefs.minutesBefore} minutes!`;
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
    setupMarquee();
});

// --- Test Notification Trigger ---
document.getElementById('testNotifyBtn').addEventListener('click', () => {
    const btn = document.getElementById('testNotifyBtn');
    btn.disabled = true;
    let count = 3;
    btn.textContent = count;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            btn.textContent = count;
        } else {
            clearInterval(interval);
            const messages = [
                { title: "Sehri Ending Soon", body: "Sehri ends in 15 minutes. Finish eating and prepare for Fajr." },
                { title: "Sehri Alert", body: "Only 5 minutes left for Sehri. Stop eating before the Adhan." },
                { title: "Iftar in 10 Minutes", body: "Iftar is almost here. Prepare to break your fast." },
                { title: "It's Iftar Time!", body: "Allahumma laka sumtu wa ala rizqika aftartu — break your fast now." },
            ];
            const msg = messages[Math.floor(Math.random() * messages.length)];
            sendNotification(msg.title, msg.body);
            btn.disabled = false;
            btn.textContent = "Test Notify";
        }
    }, 1000);
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
    const themeColorTag = document.getElementById('theme-color-tag');
    if (document.fullscreenElement) {
        countdownContainer.classList.add('fullscreen-active');
        iconExpand.style.display = 'none';
        iconCollapse.style.display = 'block';

        // Set status bar to black in fullscreen
        if (themeColorTag) themeColorTag.content = "#1a1a1a";
    } else {
        countdownContainer.classList.remove('fullscreen-active');
        iconExpand.style.display = 'block';
        iconCollapse.style.display = 'none';

        // Restore status bar color based on theme preference
        if (themeColorTag) {
            const theme = document.documentElement.dataset.theme || 'auto';
            let isDark = false;
            if (theme === 'dark') isDark = true;
            else if (theme === 'auto') isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            themeColorTag.content = isDark ? "#121212" : "#f4f3ef";
        }
    }
}

if (fullscreenToggleBtn) {
    fullscreenToggleBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', updateFullscreenUI);
}

// --- Debug Panel Toggle (local dev only) ---
const debugToggle = document.getElementById('debugToggle');
const debugPanel = document.getElementById('debugPanel');
const isLocalDev = ['localhost', '127.0.0.1', ''].includes(location.hostname);

if (debugPanel) {
    if (!isLocalDev) {
        debugPanel.style.display = 'none';
    } else if (debugToggle) {
        debugToggle.addEventListener('click', () => {
            debugPanel.classList.toggle('open');
        });
    }
}

// --- Theme Switcher ---
function initThemeSwitcher() {
    const themeColorTag = document.getElementById('theme-color-tag');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const htmlEl = document.documentElement;

    // Restore saved preference
    const saved = localStorage.getItem('theme-preference') || 'auto';
    applyTheme(saved);

    // Button click handlers
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.dataset.themeValue;
            localStorage.setItem('theme-preference', value);
            applyTheme(value);
        });
    });

    // Listen for system theme changes (for auto mode)
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (htmlEl.dataset.theme === 'auto') {
                updateThemeColorMeta();
            }
        });
    }

    function applyTheme(value) {
        htmlEl.dataset.theme = value;

        // Update active button
        themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.themeValue === value);
        });

        updateThemeColorMeta();
    }

    function updateThemeColorMeta() {
        if (!themeColorTag || document.fullscreenElement) return;

        const theme = htmlEl.dataset.theme;
        let isDark = false;

        if (theme === 'dark') {
            isDark = true;
        } else if (theme === 'auto') {
            isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        themeColorTag.content = isDark ? "#121212" : "#f4f3ef";
    }
}

initThemeSwitcher();

// --- PWA Install ---
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'flex';
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installBtn.style.display = 'none';
        }
        deferredPrompt = null;
    });
}

window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.style.display = 'none';
    deferredPrompt = null;
});

// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// --- Notification Preferences ---
function getNotificationPreferences() {
    return {
        sehri: localStorage.getItem('notif-sehri') !== 'false',
        iftar: localStorage.getItem('notif-iftar') !== 'false',
        minutesBefore: parseInt(localStorage.getItem('notif-minutes-before') || '10', 10)
    };
}

function saveNotificationPreferences(sehri, iftar, minutesBefore) {
    localStorage.setItem('notif-sehri', sehri);
    localStorage.setItem('notif-iftar', iftar);
    localStorage.setItem('notif-minutes-before', minutesBefore);
}

// --- Notification Modal Logic ---
(function initNotifModal() {
    const overlay = document.getElementById('notifModalOverlay');
    const openBtn = document.getElementById('notifSettingsBtn');
    const closeBtn = document.getElementById('notifModalClose');
    const saveBtn = document.getElementById('notifSaveBtn');
    const sehriToggle = document.getElementById('notifSehriToggle');
    const iftarToggle = document.getElementById('notifIftarToggle');
    const minutesInput = document.getElementById('notifMinutesBefore');
    const sliderValue = document.getElementById('notifSliderValue');

    if (!overlay || !openBtn) return;

    function updateSliderLabel() {
        sliderValue.textContent = `${minutesInput.value} min`;
    }

    minutesInput.addEventListener('input', updateSliderLabel);

    function openModal() {
        // Load current preferences into the form
        const prefs = getNotificationPreferences();
        sehriToggle.checked = prefs.sehri;
        iftarToggle.checked = prefs.iftar;
        minutesInput.value = prefs.minutesBefore;
        updateSliderLabel();
        overlay.classList.add('active');
    }

    function closeModal() {
        overlay.classList.remove('active');
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
    });

    // Save
    saveBtn.addEventListener('click', () => {
        const mins = Math.max(1, Math.min(60, parseInt(minutesInput.value) || 10));
        saveNotificationPreferences(sehriToggle.checked, iftarToggle.checked, mins);
        // Also request permission if enabling notifications for the first time
        if (sehriToggle.checked || iftarToggle.checked) {
            requestNotificationPermission();
        }
        closeModal();
    });
})();
