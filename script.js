
// ==================================
// STUDYMATE JAVASCRIPT
// ==================================

const $ = id => document.getElementById(id);

// THEME
const themeToggle = $("themeToggle");
const savedTheme = localStorage.getItem("studymate_theme");

function updateBrowserThemeColor() {
    const themeColor = getComputedStyle(document.body)
        .getPropertyValue("--theme-color")
        .trim();
    document.querySelector('meta[name="theme-color"]').content = themeColor;
}

function setTheme(theme) {
    const isDark = theme === "dark";

    document.body.dataset.theme = isDark ? "dark" : "light";
    updateBrowserThemeColor();
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute(
        "aria-label",
        `Switch to ${isDark ? "light" : "dark"} mode`
    );
    themeToggle.title = `Switch to ${isDark ? "light" : "dark"} mode`;
    $("themeIcon").textContent = isDark ? "☀️" : "🌙";
}

setTheme(savedTheme === "dark" ? "dark" : "light");

themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    localStorage.setItem("studymate_theme", nextTheme);
});

// THEME COLOUR
const paletteNames = ["sage", "mint", "lavender", "rose", "sky", "peach"];
const paletteButton = $("paletteButton");
const paletteModal = $("paletteModal");
const paletteOptions = document.querySelectorAll(".palette-option");
const themeColorDot = $("themeColorDot");

function setPalette(palette) {
    const selectedPalette = paletteNames.includes(palette) ? palette : "sage";

    document.body.dataset.palette = selectedPalette;
    themeColorDot.dataset.palette = selectedPalette;
    paletteOptions.forEach(option => {
        option.setAttribute(
            "aria-pressed",
            String(option.dataset.palette === selectedPalette)
        );
    });

    updateBrowserThemeColor();
}

setPalette(localStorage.getItem("studymate_palette"));

function openPaletteModal() {
    paletteModal.classList.add("show");
    paletteModal.setAttribute("aria-hidden", "false");
    paletteModal.querySelector('[aria-pressed="true"]').focus();
}

function closePaletteModal() {
    paletteModal.classList.remove("show");
    paletteModal.setAttribute("aria-hidden", "true");
    paletteButton.focus();
}

paletteButton.addEventListener("click", openPaletteModal);
$("closePaletteModal").addEventListener("click", closePaletteModal);
paletteModal.addEventListener("click", event => {
    if (event.target === paletteModal) closePaletteModal();
});
paletteOptions.forEach(option => {
    option.addEventListener("click", () => {
        setPalette(option.dataset.palette);
        localStorage.setItem("studymate_palette", option.dataset.palette);
    });
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && paletteModal.classList.contains("show")) {
        closePaletteModal();
    }
});

// DATE
const today = new Date();

$("today").textContent = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
}).toUpperCase();

function localDate(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// ==================================
// DATA STORAGE
// ==================================

let tasks = JSON.parse(localStorage.getItem("studymate_tasks")) || [
    {
        id: 1,
        name: "Review lecture notes",
        date: localDate(),
        priority: "High",
        category: "Study",
        completed: false
    },
    {
        id: 2,
        name: "Complete assignment",
        date: localDate(),
        priority: "Medium",
        category: "Study",
        completed: false
    },
    {
        id: 3,
        name: "Organize weekly schedule",
        date: localDate(),
        priority: "Low",
        category: "Personal",
        completed: true
    }
];

let sessions = Number(localStorage.getItem("studymate_sessions")) || 0;
const storedSessionHistory = JSON.parse(
    localStorage.getItem("studymate_session_history") || "[]"
);
let sessionHistory = Array.isArray(storedSessionHistory)
    ? storedSessionHistory.filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
    : [];
const savedWeeklyGoal = Number(localStorage.getItem("studymate_weekly_goal"));
let weeklyGoal = Number.isInteger(savedWeeklyGoal) &&
    savedWeeklyGoal >= 1 && savedWeeklyGoal <= 40
    ? savedWeeklyGoal
    : 5;
let remindersEnabled =
    localStorage.getItem("studymate_reminders_enabled") === "true";

function saveData() {
    localStorage.setItem("studymate_tasks", JSON.stringify(tasks));
    localStorage.setItem("studymate_sessions", sessions);
    localStorage.setItem("studymate_session_history", JSON.stringify(sessionHistory));
}

function currentWeekStart() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return localDate(start);
}

function updateWeeklyGoal() {
    const todayDate = localDate();
    const weekStart = currentWeekStart();
    const completedThisWeek = sessionHistory.filter(
        date => date >= weekStart && date <= todayDate
    ).length;
    const percentage = Math.min(
        100,
        Math.round((completedThisWeek / weeklyGoal) * 100)
    );
    const startLabel = new Date(`${weekStart}T00:00:00`).toLocaleDateString(
        undefined,
        { month: "short", day: "numeric" }
    );

    $("weeklyGoalWeek").textContent = `Week of ${startLabel}`;
    $("weeklyGoalSummary").textContent =
        `${completedThisWeek} of ${weeklyGoal} sessions`;
    $("weeklyGoalPercent").textContent = `${percentage}%`;
    $("weeklyGoalProgress").setAttribute("aria-valuenow", String(percentage));
    $("weeklyGoalBar").style.width = `${percentage}%`;
}

// ACCOUNT AND CLOUD SYNC
const syncStatus = $("syncStatus");
const accountButton = $("accountButton");
const accountModal = $("accountModal");
const authForm = $("authForm");
const authStatus = $("authStatus");
const authSubmit = $("authSubmit");
const authModeToggle = $("authModeToggle");
const signOutButton = $("signOutButton");
const supabaseConfig = window.STUDYMATE_SUPABASE || {};
const supabaseUrl = String(supabaseConfig.url || "").replace(/\/+$/, "");
const supabaseAnonKey = String(supabaseConfig.anonKey || "");

let authSession = JSON.parse(localStorage.getItem("studymate_auth") || "null");
let currentUser = authSession && authSession.user ? authSession.user : null;
let authMode = "signin";
let syncQueue = Promise.resolve();

function isSupabaseConfigured() {
    return Boolean(supabaseUrl && supabaseAnonKey);
}

function setSyncStatus(message) {
    syncStatus.textContent = message;
}

function updateAccountButton() {
    accountButton.textContent = currentUser ? "Account" : "Sign in";
    accountButton.setAttribute(
        "aria-label",
        currentUser ? `Account for ${currentUser.email}` : "Sign in to sync tasks"
    );
}

async function supabaseRequest(path, options = {}) {
    if (!isSupabaseConfigured()) {
        throw new Error("Sync is not configured.");
    }

    const headers = {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
    };

    if (options.session && options.session.access_token) {
        headers.Authorization = `Bearer ${options.session.access_token}`;
    }

    if (options.headers) {
        Object.assign(headers, options.headers);
    }

    const response = await fetch(`${supabaseUrl}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const responseText = await response.text();
    let responseData = null;

    if (responseText) {
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { message: responseText };
        }
    }

    if (!response.ok) {
        const message = responseData && (responseData.msg || responseData.message);
        throw new Error(message || `Sync request failed (${response.status}).`);
    }

    return responseData;
}

function storeAuthSession(data) {
    const expiresIn = Number(data.expires_in) || 3600;
    const refreshToken = data.refresh_token ||
        (authSession && authSession.refresh_token);
    const user = data.user || (authSession && authSession.user);

    if (!data.access_token || !refreshToken || !user || !user.id) {
        throw new Error("The authentication response did not include a valid session.");
    }

    authSession = {
        access_token: data.access_token,
        refresh_token: refreshToken,
        expires_at: data.expires_at
            ? Number(data.expires_at) * 1000
            : Date.now() + expiresIn * 1000,
        user,
    };

    currentUser = user;
    localStorage.setItem("studymate_auth", JSON.stringify(authSession));
    updateAccountButton();
}

async function getValidAuthSession() {
    if (!authSession || !authSession.refresh_token) {
        return null;
    }

    if (!navigator.onLine) {
        return authSession;
    }

    if (authSession.expires_at && authSession.expires_at > Date.now() + 60000) {
        return authSession;
    }

    const refreshed = await supabaseRequest(
        "/auth/v1/token?grant_type=refresh_token",
        {
            method: "POST",
            body: { refresh_token: authSession.refresh_token },
        }
    );

    storeAuthSession(refreshed);
    return authSession;
}

function taskToRemoteRow(task, userId) {
    return {
        id: String(task.id),
        user_id: userId,
        name: task.name,
        due_date: task.date,
        priority: task.priority,
        category: task.category,
        completed: Boolean(task.completed),
    };
}

function taskFromRemoteRow(row) {
    const id = /^\d+$/.test(row.id) && Number.isSafeInteger(Number(row.id))
        ? Number(row.id)
        : row.id;

    return {
        id,
        name: row.name,
        date: row.due_date,
        priority: row.priority,
        category: row.category,
        completed: Boolean(row.completed),
    };
}

function pendingOperationsKey(userId) {
    return `studymate_pending_${userId}`;
}

function readPendingOperations(userId) {
    const stored = localStorage.getItem(pendingOperationsKey(userId));
    const operations = stored ? JSON.parse(stored) : [];

    if (!Array.isArray(operations)) {
        throw new Error("Saved sync changes could not be read.");
    }

    return operations;
}

function queueTaskOperation(operation, userId) {
    const operations = readPendingOperations(userId);
    const operationId = String(operation.id);
    const remaining = operations.filter(item => String(item.id) !== operationId);

    operation.queueId =
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    remaining.push(operation);
    localStorage.setItem(
        pendingOperationsKey(userId),
        JSON.stringify(remaining)
    );
}

async function sendTaskOperation(operation, session) {
    if (operation.type === "delete") {
        const id = encodeURIComponent(String(operation.id));
        const userId = encodeURIComponent(session.user.id);

        await supabaseRequest(
            `/rest/v1/studymate_tasks?id=eq.${id}&user_id=eq.${userId}`,
            { method: "DELETE", session }
        );
        return;
    }

    await supabaseRequest(
        "/rest/v1/studymate_tasks?on_conflict=user_id,id",
        {
            method: "POST",
            session,
            headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
            body: taskToRemoteRow(operation.task, session.user.id),
        }
    );
}

async function flushPendingOperations() {
    if (!currentUser || !navigator.onLine) {
        return;
    }

    const session = await getValidAuthSession();

    if (!session) {
        return;
    }

    const userId = session.user.id;
    const operations = readPendingOperations(userId);

    if (operations.length === 0) {
        return;
    }

    setSyncStatus("Syncing saved changes...");

    for (const operation of operations) {
        await sendTaskOperation(operation, session);

        const remaining = readPendingOperations(userId)
            .filter(item => item.queueId !== operation.queueId);
        localStorage.setItem(
            pendingOperationsKey(userId),
            JSON.stringify(remaining)
        );
    }
}

function enqueueSync(work) {
    syncQueue = syncQueue
        .then(work)
        .catch(error => {
            setSyncStatus(
                `Sync failed. Changes are saved here and will retry: ${error.message}`
            );
        });

    return syncQueue;
}

function syncTaskChange(operation) {
    if (!isSupabaseConfigured()) {
        setSyncStatus("Tasks are saved on this device. Add Supabase settings to sync.");
        return;
    }

    if (!currentUser || !authSession) {
        setSyncStatus("Tasks are saved on this device. Sign in to sync them.");
        return;
    }

    try {
        queueTaskOperation(operation, currentUser.id);
    } catch (error) {
        setSyncStatus(`Could not queue this change for sync: ${error.message}`);
        return;
    }

    if (!navigator.onLine) {
        setSyncStatus("Offline. Changes will sync when you're back online.");
        return;
    }

    enqueueSync(async () => {
        await flushPendingOperations();
        if (readPendingOperations(currentUser.id).length === 0) {
            setSyncStatus("All tasks synced.");
        }
    });
}

async function syncTasksFromCloud() {
    if (!currentUser || !navigator.onLine) {
        return;
    }

    await flushPendingOperations();

    const session = await getValidAuthSession();

    if (!session) {
        return;
    }

    const userId = session.user.id;
    const query =
        "/rest/v1/studymate_tasks?select=id,name,due_date,priority,category,completed&order=updated_at.asc";
    let rows = await supabaseRequest(query, { session });
    const syncedKey = `studymate_synced_${userId}`;

    if (localStorage.getItem(syncedKey) !== "true") {
        const remoteIds = new Set(rows.map(row => String(row.id)));
        const localTasks = tasks.filter(task => !remoteIds.has(String(task.id)));

        if (localTasks.length > 0) {
            await supabaseRequest(
                "/rest/v1/studymate_tasks?on_conflict=user_id,id",
                {
                    method: "POST",
                    session,
                    headers: {
                        Prefer: "resolution=merge-duplicates,return=minimal",
                    },
                    body: localTasks.map(task => taskToRemoteRow(task, userId)),
                }
            );
            rows = await supabaseRequest(query, { session });
        }

        localStorage.setItem(syncedKey, "true");
    }

    tasks = rows.map(taskFromRemoteRow);
    saveData();
    render();
    setSyncStatus("Tasks synced to your account.");
}

function updateAccountModal() {
    const configured = isSupabaseConfigured();
    const signedIn = Boolean(currentUser);

    $("accountTitle").textContent = signedIn
        ? "Your StudyMate account"
        : "Sync across devices";
    $("accountDescription").textContent = signedIn
        ? `Signed in as ${currentUser.email}.`
        : "Sign in to access your study tasks on your other devices.";

    authForm.hidden = !configured || signedIn;
    authModeToggle.hidden = !configured || signedIn;
    signOutButton.hidden = !signedIn;

    if (!configured) {
        authStatus.textContent =
            "To enable sync, add your Supabase project URL and public anon key to supabase-config.js.";
    } else if (signedIn) {
        authStatus.textContent = "";
    } else {
        authStatus.textContent = "";
    }
}

function openAccountModal() {
    updateAccountModal();
    accountModal.classList.add("show");
    accountModal.setAttribute("aria-hidden", "false");

    if (currentUser) {
        signOutButton.focus();
    } else if (isSupabaseConfigured()) {
        $("authEmail").focus();
    } else $("closeAccountModal").focus();
}

function closeAccountModal() {
    accountModal.classList.remove("show");
    accountModal.setAttribute("aria-hidden", "true");
    accountButton.focus();
}

async function initializeSync() {
    updateAccountButton();

    if (!isSupabaseConfigured()) {
        setSyncStatus("Local-only mode. Configure Supabase to sync tasks across devices.");
        return;
    }

    if (!authSession) {
        setSyncStatus("Sign in to sync tasks across devices.");
        return;
    }

    if (!navigator.onLine) {
        setSyncStatus("Offline. Saved tasks will sync when you're back online.");
        return;
    }

    try {
        const session = await getValidAuthSession();
        currentUser = session ? session.user : null;
        updateAccountButton();
        await syncTasksFromCloud();
    } catch (error) {
        setSyncStatus(`Could not sync tasks: ${error.message}`);
    }

    updateAccountButton();
    updateAccountModal();
}

accountButton.addEventListener("click", openAccountModal);
$("closeAccountModal").addEventListener("click", closeAccountModal);

accountModal.addEventListener("click", event => {
    if (event.target === accountModal) closeAccountModal();
});

authModeToggle.addEventListener("click", () => {
    authMode = authMode === "signin" ? "signup" : "signin";
    $("accountTitle").textContent =
        authMode === "signup" ? "Create your account" : "Sync across devices";
    authSubmit.textContent = authMode === "signup" ? "Create account" : "Sign in";
    authModeToggle.textContent =
        authMode === "signup"
            ? "Already have an account? Sign in"
            : "Need an account? Sign up";
    $("authPassword").autocomplete =
        authMode === "signup" ? "new-password" : "current-password";
    authStatus.textContent = "";
});

authForm.addEventListener("submit", async event => {
    event.preventDefault();

    authSubmit.disabled = true;
    authStatus.textContent =
        authMode === "signup" ? "Creating your account..." : "Signing in...";

    try {
        const email = $("authEmail").value.trim();
        const password = $("authPassword").value;
        const result = authMode === "signup"
            ? await supabaseRequest("/auth/v1/signup", {
                method: "POST",
                body: { email, password },
            })
            : await supabaseRequest("/auth/v1/token?grant_type=password", {
                method: "POST",
                body: { email, password },
            });

        if (!result.access_token) {
            authStatus.textContent =
                "Check your email to confirm your account, then sign in.";
            return;
        }

        storeAuthSession(result);
        updateAccountModal();
        await syncTasksFromCloud();
        authForm.reset();
        closeAccountModal();
    } catch (error) {
        authStatus.textContent = error.message;
    } finally {
        authSubmit.disabled = false;
    }
});

signOutButton.addEventListener("click", async () => {
    signOutButton.disabled = true;

    try {
        if (authSession && navigator.onLine && isSupabaseConfigured()) {
            await supabaseRequest("/auth/v1/logout", {
                method: "POST",
                session: authSession,
            });
        }

        localStorage.removeItem("studymate_auth");
        authSession = null;
        currentUser = null;
        tasks = [];
        saveData();
        render();
        updateAccountButton();
        updateAccountModal();
        setSyncStatus("Signed out. Sign in again to sync your tasks.");
    } catch (error) {
        authStatus.textContent = `Could not sign out: ${error.message}`;
    } finally {
        signOutButton.disabled = false;
    }
});

window.addEventListener("online", () => {
    if (currentUser) {
        enqueueSync(syncTasksFromCloud);
    }
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden && currentUser && navigator.onLine) {
        enqueueSync(syncTasksFromCloud);
    }
});

// ==================================
// PAGE NAVIGATION
// ==================================

document.querySelectorAll(".nav-btn").forEach(button => {

    button.addEventListener("click", () => {

        document.querySelectorAll(".nav-btn")
            .forEach(btn => btn.classList.remove("active"));

        document.querySelectorAll(".page")
            .forEach(page => page.classList.remove("active"));

        button.classList.add("active");

        const page = button.dataset.page;

        $(page).classList.add("active");

    });

});

// ==================================
// TASK MANAGER
// ==================================

const modal = $("taskModal");
const weeklyGoalModal = $("weeklyGoalModal");

$("addTaskBtn").onclick = openModal;
$("addTaskBtn2").onclick = openModal;
$("editWeeklyGoal").addEventListener("click", () => {
    $("weeklyGoalInput").value = String(weeklyGoal);
    weeklyGoalModal.classList.add("show");
    weeklyGoalModal.setAttribute("aria-hidden", "false");
    $("weeklyGoalInput").focus();
});

function closeWeeklyGoalModal() {
    weeklyGoalModal.classList.remove("show");
    weeklyGoalModal.setAttribute("aria-hidden", "true");
    $("editWeeklyGoal").focus();
}

$("closeWeeklyGoalModal").addEventListener("click", closeWeeklyGoalModal);
weeklyGoalModal.addEventListener("click", event => {
    if (event.target === weeklyGoalModal) closeWeeklyGoalModal();
});
$("weeklyGoalForm").addEventListener("submit", event => {
    event.preventDefault();
    const newGoal = Number($("weeklyGoalInput").value);

    if (!Number.isInteger(newGoal) || newGoal < 1 || newGoal > 40) {
        $("taskActionStatus").textContent = "Choose a goal from 1 to 40 sessions.";
        return;
    }

    weeklyGoal = newGoal;
    localStorage.setItem("studymate_weekly_goal", String(weeklyGoal));
    updateWeeklyGoal();
    closeWeeklyGoalModal();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && weeklyGoalModal.classList.contains("show")) {
        closeWeeklyGoalModal();
    }
});

["taskSearch", "taskStatusFilter", "taskPriorityFilter", "taskCategoryFilter", "taskSort"]
    .forEach(id => {
        $(id).addEventListener(id === "taskSearch" ? "input" : "change", render);
    });

$("clearTaskFilters").addEventListener("click", () => {
    $("taskSearch").value = "";
    $("taskStatusFilter").value = "all";
    $("taskPriorityFilter").value = "all";
    $("taskCategoryFilter").value = "all";
    $("taskSort").value = "soonest";
    render();
});

document.querySelectorAll(".stat-card-button").forEach(button => {
    button.addEventListener("click", () => {
        $("taskSearch").value = "";
        $("taskStatusFilter").value = button.dataset.taskFilter;
        $("taskPriorityFilter").value = "all";
        $("taskCategoryFilter").value = "all";
        document.querySelector('.nav-btn[data-page="tasks"]').click();
        render();
    });
});

function openModal() {
    $("taskDate").value = localDate();
    modal.classList.add("show");
    $("taskName").focus();
}

function closeModal() {
    modal.classList.remove("show");
}

$("closeModal").onclick = closeModal;

modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
});

$("taskForm").addEventListener("submit", event => {

    event.preventDefault();

    const task = {
        id: Date.now(),
        name: $("taskName").value.trim(),
        date: $("taskDate").value,
        priority: $("taskPriority").value,
        category: $("taskCategory").value,
        completed: false
    };

    if (!task.name || !task.date) return;

    tasks.push(task);

    saveData();
    syncTaskChange({ type: "upsert", id: task.id, task });
    render();

    $("taskForm").reset();
    closeModal();

    alert("Task added successfully!");

});

// SAFE TEXT DISPLAY
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function taskHTML(task) {

    return `
        <div class="task ${task.completed ? "done" : ""}">

            <button class="task-check" type="button"
                data-task-action="toggle"
                data-task-id="${escapeHTML(task.id)}"
                aria-label="${task.completed ? "Mark incomplete" : "Mark complete"}: ${escapeHTML(task.name)}">
                ${task.completed ? "✓" : ""}
            </button>

            <div class="task-info">
                <div class="task-name">
                    ${escapeHTML(task.name)}
                </div>

                <div class="task-meta">
                    ${escapeHTML(task.category)}
                    · Due ${new Date(task.date + "T00:00:00")
                        .toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short"
                        })}
                </div>
            </div>

            <span class="priority ${escapeHTML(task.priority)}">
                ${escapeHTML(task.priority)}
            </span>

            <button class="delete-btn" type="button"
                data-task-action="delete"
                data-task-id="${escapeHTML(task.id)}"
                aria-label="Delete: ${escapeHTML(task.name)}">
                ×
            </button>

        </div>
    `;
}

function toggleTask(id) {

    const task = tasks.find(item => String(item.id) === String(id));

    if (!task) return;

    task.completed = !task.completed;

    saveData();
    syncTaskChange({ type: "upsert", id: task.id, task });
    render();

}

function deleteTask(id) {

    const task = tasks.find(item => String(item.id) === String(id));
    if (!task) return;

    tasks = tasks.filter(item => String(item.id) !== String(id));
    saveData();
    syncTaskChange({ type: "delete", id: task.id });
    render();

}

window.toggleTask = toggleTask;
window.deleteTask = deleteTask;

document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest("[data-task-action]");
    if (!button) return;

    if (button.dataset.taskAction === "toggle") {
        toggleTask(button.dataset.taskId);
    } else if (button.dataset.taskAction === "delete") {
        deleteTask(button.dataset.taskId);
    }
});

// ==================================
// DASHBOARD AND PROGRESS
// ==================================

function render() {

    const completed = tasks.filter(task => task.completed).length;

    const total = tasks.length;

    const remaining = total - completed;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    // Dashboard statistics

    $("totalTasks").textContent = total;
    $("completedTasks").textContent = completed;
    $("focusSessions").textContent = sessions;
    $("completionRate").textContent = percentage + "%";

    // Progress page

    $("pTotal").textContent = total;
    $("pCompleted").textContent = completed;
    $("pSessions").textContent = sessions;
    $("pRemaining").textContent = remaining;

    $("bigProgress").textContent = percentage + "%";

    $("bigBar").style.width = percentage + "%";

    $("dailyPercentage").textContent = percentage + "%";

    $("dailyBar").style.width = percentage + "%";
    updateWeeklyGoal();

    const priorityRank = { High: 0, Medium: 1, Low: 2 };
    const sortMode = $("taskSort").value;
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) {
            return Number(a.completed) - Number(b.completed);
        }

        if (sortMode === "latest") {
            return b.date.localeCompare(a.date);
        }
        if (sortMode === "priority") {
            return priorityRank[a.priority] - priorityRank[b.priority];
        }
        if (sortMode === "name") {
            return a.name.localeCompare(b.name);
        }
        return a.date.localeCompare(b.date);
    });

    // Dashboard shows first five tasks

    $("dashboardTasks").innerHTML =
        sortedTasks.slice(0, 5).map(taskHTML).join("") ||
        "<p>No tasks yet. Add your first task!</p>";

    // All tasks page

    const searchTerm = $("taskSearch").value.trim().toLocaleLowerCase();
    const statusFilter = $("taskStatusFilter").value;
    const priorityFilter = $("taskPriorityFilter").value;
    const categoryFilter = $("taskCategoryFilter").value;
    const filteredTasks = sortedTasks.filter(task => {
        const matchesSearch = !searchTerm ||
            `${task.name} ${task.category} ${task.priority}`
                .toLocaleLowerCase()
                .includes(searchTerm);
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "completed" ? task.completed : !task.completed);
        const matchesPriority = priorityFilter === "all" ||
            task.priority === priorityFilter;
        const matchesCategory = categoryFilter === "all" ||
            task.category === categoryFilter;

        return matchesSearch && matchesStatus &&
            matchesPriority && matchesCategory;
    });

    $("taskResultCount").textContent =
        `${filteredTasks.length} of ${tasks.length} tasks`;
    $("allTasks").innerHTML =
        filteredTasks.map(taskHTML).join("") ||
        (tasks.length === 0
            ? "<p>No tasks yet. Add your first task!</p>"
            : "<p>No tasks match these filters.</p>");

    checkDueTaskReminders();

}

function downloadFile(filename, contents, type) {
    const file = new Blob([contents], { type });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("exportCsvBtn").addEventListener("click", () => {
    const rows = [
        ["Task", "Due date", "Priority", "Category", "Completed"],
        ...tasks.map(task => [
            task.name,
            task.date,
            task.priority,
            task.category,
            task.completed ? "Yes" : "No",
        ]),
    ];
    const csv = rows
        .map(row => row.map(value =>
            `"${String(value).replace(/"/g, '""')}"`
        ).join(","))
        .join("\r\n");

    downloadFile(
        `studymate-tasks-${localDate()}.csv`,
        `\uFEFF${csv}`,
        "text/csv;charset=utf-8"
    );
    $("taskActionStatus").textContent = "Tasks exported as a CSV file.";
});

$("backupJsonBtn").addEventListener("click", () => {
    const backup = {
        format: "StudyMate backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks,
        sessions,
        sessionHistory,
        weeklyGoal,
        theme: document.body.dataset.theme,
        palette: document.body.dataset.palette,
    };

    downloadFile(
        `studymate-backup-${localDate()}.json`,
        JSON.stringify(backup, null, 2),
        "application/json"
    );
    $("taskActionStatus").textContent = "StudyMate JSON backup downloaded.";
});

function updateReminderControl() {
    const button = $("reminderToggle");
    const supported = window.isSecureContext && "Notification" in window;

    button.disabled = !supported || Notification.permission === "denied";

    if (!supported) {
        button.textContent = "Reminders need HTTPS";
        button.title = "Browser reminders require HTTPS or localhost.";
    } else if (Notification.permission === "denied") {
        button.textContent = "Notifications blocked";
        button.title = "Allow notifications in your browser settings to use reminders.";
    } else {
        button.textContent = remindersEnabled
            ? "Turn off reminders"
            : "Enable reminders";
        button.title = "Remind about unfinished tasks due today or tomorrow.";
    }
}

async function toggleReminders() {
    const taskActionStatus = $("taskActionStatus");

    if (!window.isSecureContext || !("Notification" in window)) {
        taskActionStatus.textContent =
            "Browser reminders require HTTPS or localhost and notification support.";
        updateReminderControl();
        return;
    }

    if (remindersEnabled) {
        remindersEnabled = false;
        localStorage.removeItem("studymate_reminders_enabled");
        taskActionStatus.textContent = "Task reminders are off.";
        updateReminderControl();
        return;
    }

    try {
        const permission = Notification.permission === "default"
            ? await Notification.requestPermission()
            : Notification.permission;

        if (permission !== "granted") {
            taskActionStatus.textContent = permission === "denied"
                ? "Notifications are blocked. Allow them in your browser settings to use reminders."
                : "Notification permission was not granted.";
            updateReminderControl();
            return;
        }

        remindersEnabled = true;
        localStorage.setItem("studymate_reminders_enabled", "true");
        taskActionStatus.textContent =
            "Reminders are on while StudyMate is open.";
        updateReminderControl();
        checkDueTaskReminders();
    } catch (error) {
        taskActionStatus.textContent =
            `Could not enable reminders: ${error.message}`;
    }
}

function checkDueTaskReminders() {
    if (!remindersEnabled || !window.isSecureContext ||
        !("Notification" in window) || Notification.permission !== "granted") {
        return;
    }

    let sentReminders;
    try {
        sentReminders = JSON.parse(
            localStorage.getItem("studymate_reminders_sent") || "[]"
        );
    } catch {
        $("taskActionStatus").textContent =
            "Saved reminder history could not be read; reminders were not sent.";
        return;
    }

    if (!Array.isArray(sentReminders)) {
        $("taskActionStatus").textContent =
            "Saved reminder history is invalid; reminders were not sent.";
        return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayDate = localDate();
    const tomorrowDate = localDate(tomorrow);

    for (const task of tasks) {
        if (task.completed || task.date < todayDate || task.date > tomorrowDate) {
            continue;
        }

        const reminderKey = `${task.id}:${task.date}`;
        if (sentReminders.includes(reminderKey)) continue;

        const dueLabel = task.date === todayDate ? "today" : "tomorrow";
        try {
            const notification = new Notification("StudyMate task due soon", {
                body: `${task.name} is due ${dueLabel}.`,
                tag: `studymate-${reminderKey}`,
            });
            notification.onclick = () => {
                window.focus();
                $("taskSearch").value = task.name;
                $("taskStatusFilter").value = "open";
                $("taskPriorityFilter").value = "all";
                $("taskCategoryFilter").value = "all";
                document.querySelector('.nav-btn[data-page="tasks"]').click();
                render();
                notification.close();
            };
            sentReminders.push(reminderKey);
        } catch (error) {
            $("taskActionStatus").textContent =
                `Could not show a task reminder: ${error.message}`;
        }
    }

    localStorage.setItem(
        "studymate_reminders_sent",
        JSON.stringify(sentReminders)
    );
}

$("reminderToggle").addEventListener("click", toggleReminders);
window.setInterval(checkDueTaskReminders, 60 * 60 * 1000);

// ==================================
// LECTURE TIMETABLE AND NOTES
// ==================================

const lectureDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const lectureForm = $("lectureForm");
const lectureStatus = $("lectureStatus");
const recordingStatus = $("recordingStatus");
const summaryStatus = $("summaryStatus");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let lectures = [];
let lectureRecordings = [];
let currentRecordingId = null;
let mediaRecorder = null;
let microphoneStream = null;
let speechRecognition = null;
let recordingActive = false;
let speechRecognitionDisabled = false;
let recordingStartedAt = 0;
let recordingInterval = null;
let lectureAudioDbPromise = null;

try {
    const savedLectures = JSON.parse(localStorage.getItem("studymate_lectures") || "[]");
    const savedRecordings = JSON.parse(localStorage.getItem("studymate_lecture_recordings") || "[]");
    lectures = Array.isArray(savedLectures) ? savedLectures : [];
    lectureRecordings = Array.isArray(savedRecordings) ? savedRecordings : [];
} catch (error) {
    lectureStatus.textContent = `Saved lecture data could not be read: ${error.message}`;
}

function saveLectures(statusElement = recordingStatus) {
    try {
        localStorage.setItem("studymate_lectures", JSON.stringify(lectures));
        localStorage.setItem("studymate_lecture_recordings", JSON.stringify(lectureRecordings));
        return true;
    } catch (error) {
        statusElement.textContent = `Could not save lecture data on this device: ${error.message}`;
        return false;
    }
}

function openLectureAudioDb() {
    if (!window.indexedDB) {
        return Promise.reject(new Error("This browser does not support local audio storage."));
    }

    if (!lectureAudioDbPromise) {
        lectureAudioDbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open("studymate_lecture_audio", 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains("audio")) {
                    request.result.createObjectStore("audio", { keyPath: "id" });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Could not open local audio storage."));
        });
    }

    return lectureAudioDbPromise;
}

async function saveLectureAudio(id, blob) {
    const db = await openLectureAudioDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("audio", "readwrite");
        transaction.objectStore("audio").put({ id, blob });
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error("Could not save the recording."));
        transaction.onabort = () => reject(transaction.error || new Error("Saving the recording was interrupted."));
    });
}

async function getLectureAudio(id) {
    const db = await openLectureAudioDb();
    return new Promise((resolve, reject) => {
        const request = db.transaction("audio", "readonly").objectStore("audio").get(id);
        request.onsuccess = () => resolve(request.result ? request.result.blob : null);
        request.onerror = () => reject(request.error || new Error("Could not load the recording."));
    });
}

async function deleteLectureAudio(id) {
    const db = await openLectureAudioDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("audio", "readwrite");
        transaction.objectStore("audio").delete(id);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error("Could not delete the recording."));
    });
}

function renderLectures() {
    const dayRank = day => (Number(day) + 6) % 7;
    const sortedLectures = [...lectures].sort((a, b) =>
        dayRank(a.day) - dayRank(b.day) || a.start.localeCompare(b.start)
    );

    $("lectureList").innerHTML = sortedLectures.length
        ? sortedLectures.map(lecture => `
            <article class="lecture-item">
              <div>
                <h3>${escapeHTML(lecture.name)}</h3>
                <p>${escapeHTML(lectureDays[Number(lecture.day)] || "Unknown day")} · ${escapeHTML(lecture.start)}–${escapeHTML(lecture.end)}${lecture.location ? ` · ${escapeHTML(lecture.location)}` : ""}</p>
              </div>
              <button class="delete-btn" type="button" data-lecture-action="delete" data-lecture-id="${escapeHTML(lecture.id)}" aria-label="Remove ${escapeHTML(lecture.name)}">×</button>
            </article>
        `).join("")
        : "<p class=\"empty-state\">No lectures added yet.</p>";

    const lectureSelect = $("recordingLecture");
    const selectedLectureId = lectureSelect.value;
    lectureSelect.innerHTML = '<option value="">No scheduled lecture</option>' +
        sortedLectures.map(lecture => `
            <option value="${escapeHTML(lecture.id)}">${escapeHTML(lectureDays[Number(lecture.day)] || "Unknown day")} · ${escapeHTML(lecture.start)} · ${escapeHTML(lecture.name)}</option>
        `).join("");
    if (lectures.some(lecture => String(lecture.id) === selectedLectureId)) {
        lectureSelect.value = selectedLectureId;
    }

    $("recordingList").innerHTML = lectureRecordings.length
        ? [...lectureRecordings]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map(recording => `
                <article class="saved-recording">
                  <div class="saved-recording-heading">
                    <div>
                      <h3>${escapeHTML(recording.title)}</h3>
                      <p>${escapeHTML(new Date(recording.createdAt).toLocaleString())}${recording.audioSaved ? " · Audio saved on this device" : " · Notes only"}</p>
                    </div>
                    <div class="recording-buttons">
                      ${recording.audioSaved ? `<button class="secondary-btn" type="button" data-recording-action="play" data-recording-id="${escapeHTML(recording.id)}">Play audio</button>` : ""}
                      <button class="secondary-btn" type="button" data-recording-action="edit" data-recording-id="${escapeHTML(recording.id)}">Edit notes</button>
                      <button class="delete-btn" type="button" data-recording-action="delete" data-recording-id="${escapeHTML(recording.id)}" aria-label="Delete ${escapeHTML(recording.title)}">×</button>
                    </div>
                  </div>
                  <p class="saved-note">${escapeHTML(recording.summary || "No summary saved yet.")}</p>
                  <div class="audio-player" data-audio-player="${escapeHTML(recording.id)}"></div>
                </article>
            `).join("")
        : "<p class=\"empty-state\">Record a lecture or paste a transcript to start your notes.</p>";
}

lectureForm.addEventListener("submit", event => {
    event.preventDefault();
    const lecture = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: $("lectureName").value.trim(),
        day: $("lectureDay").value,
        start: $("lectureStart").value,
        end: $("lectureEnd").value,
        location: $("lectureLocation").value.trim(),
    };

    if (lecture.end <= lecture.start) {
        lectureStatus.textContent = "The end time must be later than the start time.";
        $("lectureEnd").focus();
        return;
    }

    lectures.push(lecture);
    if (saveLectures(lectureStatus)) {
        lectureStatus.textContent = `${lecture.name} added to your weekly timetable.`;
        lectureForm.reset();
    }
    renderLectures();
});

$("lectureList").addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("[data-lecture-action='delete']");
    if (!button) return;

    lectures = lectures.filter(lecture => String(lecture.id) !== button.dataset.lectureId);
    saveLectures();
    renderLectures();
    lectureStatus.textContent = "Lecture removed from your timetable.";
});

$("recordingLecture").addEventListener("change", event => {
    const lecture = lectures.find(item => String(item.id) === event.target.value);
    if (lecture) $("recordingTitle").value = lecture.name;
});

function updateRecordingTime() {
    const elapsedSeconds = Math.floor((Date.now() - recordingStartedAt) / 1000);
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
    const seconds = String(elapsedSeconds % 60).padStart(2, "0");
    $("recordingTime").textContent = `${minutes}:${seconds}`;
}

function startSpeechTranscription() {
    if (!SpeechRecognition) {
        recordingStatus.textContent =
            "Recording started. Live transcription is not supported in this browser; you can type or paste a transcript after recording.";
        return;
    }

    speechRecognitionDisabled = false;
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = navigator.language || "en-US";
    speechRecognition.onresult = event => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript.trim())
            .filter(Boolean)
            .join(" ");
        $("lectureTranscript").value = transcript;
        $("saveLectureNote").disabled = recordingActive;
    };
    speechRecognition.onerror = event => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            speechRecognitionDisabled = true;
            recordingStatus.textContent =
                "Recording audio, but microphone access for live transcription was denied. You can enter a transcript manually.";
        } else if (event.error !== "no-speech") {
            speechRecognitionDisabled = true;
            recordingStatus.textContent =
                `Recording audio, but live transcription stopped: ${event.error}. You can enter the transcript manually.`;
        }
    };
    speechRecognition.onend = () => {
        if (recordingActive && speechRecognition && !speechRecognitionDisabled) {
            try {
                speechRecognition.start();
            } catch {
                recordingStatus.textContent =
                    "Recording audio. Live transcription paused; enter any missing transcript text manually.";
            }
        }
    };

    try {
        speechRecognition.start();
        recordingStatus.textContent =
            "Recording in progress. Live transcription is on; check the transcript for recognition errors.";
    } catch (error) {
        recordingStatus.textContent =
            `Recording audio, but live transcription could not start: ${error.message}`;
    }
}

$("startRecording").addEventListener("click", async () => {
    if (!window.isSecureContext || !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        recordingStatus.textContent =
            "Microphone recording requires a supported browser and HTTPS or localhost.";
        return;
    }

    $("startRecording").disabled = true;
    recordingStatus.textContent = "Requesting microphone access…";

    try {
        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const options = {};
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            options.mimeType = "audio/webm;codecs=opus";
        }
        mediaRecorder = new MediaRecorder(microphoneStream, options);
        const chunks = [];
        mediaRecorder.addEventListener("dataavailable", event => {
            if (event.data.size) chunks.push(event.data);
        });
        mediaRecorder.addEventListener("stop", async () => {
            recordingActive = false;
            clearInterval(recordingInterval);
            if (speechRecognition) {
                speechRecognition.onend = null;
                speechRecognition.stop();
                speechRecognition = null;
            }
            microphoneStream.getTracks().forEach(track => track.stop());
            microphoneStream = null;

            const id = currentRecordingId;
            const audio = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
            const entry = {
                id,
                title: $("recordingTitle").value.trim() || "Untitled lecture",
                createdAt: new Date().toISOString(),
                durationSeconds: Math.floor((Date.now() - recordingStartedAt) / 1000),
                transcript: $("lectureTranscript").value.trim(),
                summary: "",
                audioSaved: false,
            };

            try {
                await saveLectureAudio(id, audio);
                entry.audioSaved = true;
                recordingStatus.textContent =
                    "Recording saved on this device. Create a summary from the transcript and save your notes.";
            } catch (error) {
                recordingStatus.textContent =
                    `Audio could not be saved: ${error.message} Your transcript can still be saved as notes.`;
            }

            lectureRecordings.unshift(entry);
            saveLectures();
            currentRecordingId = id;
            $("saveLectureNote").disabled = false;
            $("stopRecording").disabled = true;
            $("startRecording").disabled = false;
            renderLectures();
        });

        currentRecordingId = `recording-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        $("lectureTranscript").value = "";
        $("lectureSummary").value = "";
        $("saveLectureNote").disabled = true;
        mediaRecorder.start();
        recordingStartedAt = Date.now();
        recordingActive = true;
        $("stopRecording").disabled = false;
        $("recordingTime").textContent = "00:00";
        recordingInterval = window.setInterval(updateRecordingTime, 1000);
        startSpeechTranscription();
    } catch (error) {
        if (microphoneStream) {
            microphoneStream.getTracks().forEach(track => track.stop());
            microphoneStream = null;
        }
        $("startRecording").disabled = false;
        recordingStatus.textContent = `Could not start recording: ${error.message}`;
    }
});

$("stopRecording").addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        recordingActive = false;
        $("stopRecording").disabled = true;
        $("recordingStatus").textContent = "Finishing and saving your recording…";
        mediaRecorder.stop();
    }
});

const MAX_SUMMARY_TRANSCRIPT_LENGTH = 30000;

$("summarizeLecture").addEventListener("click", async () => {
    const transcript = $("lectureTranscript").value.trim();
    if (!transcript) {
        summaryStatus.textContent = "Add or record a transcript before generating an AI summary.";
        $("lectureTranscript").focus();
        return;
    }

    if (recordingActive) {
        summaryStatus.textContent = "Stop the recording before generating a summary.";
        return;
    }

    if (transcript.length > MAX_SUMMARY_TRANSCRIPT_LENGTH) {
        summaryStatus.textContent =
            `This transcript is too long. Keep it under ${MAX_SUMMARY_TRANSCRIPT_LENGTH.toLocaleString()} characters and try again.`;
        return;
    }

    const summarizeButton = $("summarizeLecture");
    summarizeButton.disabled = true;
    summaryStatus.textContent = "Generating a structured AI summary…";

    try {
        if (!navigator.onLine) {
            throw new Error("Connect to the internet to generate an AI summary.");
        }
        if (!isSupabaseConfigured()) {
            throw new Error("Configure Supabase and deploy the AI summary function first.");
        }

        const session = await getValidAuthSession();
        if (!session) {
            throw new Error("Sign in to StudyMate to generate an AI summary.");
        }

        const result = await supabaseRequest(
            "/functions/v1/summarize-lecture",
            {
                method: "POST",
                session,
                body: { transcript },
            }
        );
        if (!result || typeof result.summary !== "string" || !result.summary.trim()) {
            throw new Error("The AI service returned an empty summary. Please try again.");
        }

        $("lectureSummary").value = result.summary.trim();
        $("saveLectureNote").disabled = false;
        summaryStatus.textContent =
            "AI summary created. Review and edit it before saving your notes.";
    } catch (error) {
        summaryStatus.textContent = `Could not generate an AI summary: ${error.message}`;
    } finally {
        summarizeButton.disabled = false;
    }
});

$("saveLectureNote").addEventListener("click", () => {
    if (recordingActive) {
        summaryStatus.textContent = "Stop the recording before saving your notes.";
        return;
    }

    const transcript = $("lectureTranscript").value.trim();
    const summary = $("lectureSummary").value.trim();
    if (!transcript) {
        summaryStatus.textContent = "Add a transcript before saving notes.";
        return;
    }

    let recording = lectureRecordings.find(item => item.id === currentRecordingId);
    if (!recording) {
        recording = {
            id: `notes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: new Date().toISOString(),
            audioSaved: false,
            durationSeconds: 0,
        };
        lectureRecordings.unshift(recording);
        currentRecordingId = recording.id;
    }

    recording.title = $("recordingTitle").value.trim() || "Lecture notes";
    recording.transcript = transcript;
    recording.summary = summary;
    if (saveLectures(summaryStatus)) {
        summaryStatus.textContent = "Lecture transcript and notes saved on this device.";
        renderLectures();
    }
});

$("recordingList").addEventListener("click", async event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("[data-recording-action]");
    if (!button) return;

    const recording = lectureRecordings.find(item => item.id === button.dataset.recordingId);
    if (!recording) return;

    if (button.dataset.recordingAction === "edit") {
        currentRecordingId = recording.id;
        $("recordingTitle").value = recording.title;
        $("lectureTranscript").value = recording.transcript || "";
        $("lectureSummary").value = recording.summary || "";
        $("saveLectureNote").disabled = false;
        summaryStatus.textContent = `Editing notes for ${recording.title}.`;
        $("lectureTranscript").focus();
        return;
    }

    if (button.dataset.recordingAction === "delete") {
        const previousRecordings = lectureRecordings;
        lectureRecordings = lectureRecordings.filter(item => item.id !== recording.id);
        if (!saveLectures(summaryStatus)) {
            lectureRecordings = previousRecordings;
            renderLectures();
            return;
        }
        try {
            if (recording.audioSaved) await deleteLectureAudio(recording.id);
            renderLectures();
            summaryStatus.textContent = "Saved lecture notes and audio deleted from this device.";
        } catch (error) {
            lectureRecordings = previousRecordings;
            saveLectures(summaryStatus);
            summaryStatus.textContent = `Could not delete the saved audio: ${error.message}`;
            renderLectures();
        }
        return;
    }

    if (button.dataset.recordingAction === "play") {
        const playerContainer = $("recordingList").querySelector(
            `[data-audio-player="${recording.id}"]`
        );
        try {
            const audio = await getLectureAudio(recording.id);
            if (!audio) throw new Error("The audio file is no longer available.");
            const player = document.createElement("audio");
            player.controls = true;
            player.src = URL.createObjectURL(audio);
            playerContainer.replaceChildren(player);
            summaryStatus.textContent = "Audio player loaded. Press play in the player to listen.";
        } catch (error) {
            summaryStatus.textContent = `Could not play this recording: ${error.message}`;
        }
    }
});

renderLectures();

// ==================================
// POMODORO TIMER
// ==================================

const MIN_FOCUS_DURATION = 5;
const MAX_FOCUS_DURATION = 180;
const savedFocusDuration = Number(
    localStorage.getItem("studymate_focus_duration")
);
let focusDurationMinutes = Number.isInteger(savedFocusDuration) &&
    savedFocusDuration >= MIN_FOCUS_DURATION &&
    savedFocusDuration <= MAX_FOCUS_DURATION
    ? savedFocusDuration
    : 25;

let duration = focusDurationMinutes * 60;

let remaining = duration;

let timerInterval = null;

let running = false;

let isBreak = false;

function updateTimerDisplay() {

    const minutes = Math.floor(remaining / 60);

    const seconds = remaining % 60;

    const display =
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");

    $("mainTimer").textContent = display;
    $("dashboardTimer").textContent = display;

    const mode = isBreak ? "SHORT BREAK" : "FOCUS SESSION";

    $("timerMode").textContent = mode;
    $("dashboardTimerMode").textContent = mode;

}

function stopTimer() {

    running = false;

    clearInterval(timerInterval);

    timerInterval = null;

    updateDurationControls();

}

function startTimer() {

    if (running) return;

    running = true;

    updateDurationControls();

    timerInterval = setInterval(() => {

        remaining--;

        updateTimerDisplay();

        if (remaining <= 0) {

            stopTimer();

            if (!isBreak) {

                sessions++;
                sessionHistory.push(localDate());

                saveData();

                render();

                alert("Focus session completed! Take a short break.");

            } else {

                alert("Break completed! Ready to focus again?");

            }

        }

    }, 1000);

}

function pauseTimer() {
    stopTimer();
}

function resetTimer() {

    stopTimer();

    remaining = duration;

    updateTimerDisplay();

}

$("startTimer").onclick = startTimer;

$("pauseTimer").onclick = pauseTimer;

$("resetTimer").onclick = resetTimer;

// Dashboard timer button

$("dashboardStart").onclick = () => {

    if (!running) {
        startTimer();
    } else {
        pauseTimer();
    }

};

function updateDurationControls() {

    const disabled = running || isBreak;

    $("focusDurationInput").disabled = disabled;
    $("decreaseFocusDuration").disabled =
        disabled || focusDurationMinutes <= MIN_FOCUS_DURATION;
    $("increaseFocusDuration").disabled =
        disabled || focusDurationMinutes >= MAX_FOCUS_DURATION;
    $("focusMode").textContent = `${focusDurationMinutes} Min Focus`;
    $("dashboardStart").textContent = running
        ? (isBreak ? "Pause Break" : "Pause Focus")
        : (isBreak ? "Start Break" : "Start Focus");

}

function setFocusDuration(value) {

    const minutes = Number(value);

    if (running || isBreak || !Number.isInteger(minutes)) {
        $("focusDurationInput").value = String(focusDurationMinutes);
        return;
    }

    focusDurationMinutes = Math.min(
        MAX_FOCUS_DURATION,
        Math.max(MIN_FOCUS_DURATION, minutes)
    );
    localStorage.setItem(
        "studymate_focus_duration",
        String(focusDurationMinutes)
    );
    duration = focusDurationMinutes * 60;
    remaining = duration;
    $("focusDurationInput").value = String(focusDurationMinutes);
    updateDurationControls();
    updateTimerDisplay();

}

$("focusDurationInput").value = String(focusDurationMinutes);
$("focusDurationInput").addEventListener("change", event => {
    setFocusDuration(event.target.value);
});

$("decreaseFocusDuration").onclick = () => {
    setFocusDuration(focusDurationMinutes - 5);
};

$("increaseFocusDuration").onclick = () => {
    setFocusDuration(focusDurationMinutes + 5);
};

// Timer modes

$("focusMode").onclick = () => {

    stopTimer();

    isBreak = false;

    duration = focusDurationMinutes * 60;

    remaining = duration;

    updateDurationControls();
    updateTimerDisplay();

};

$("breakMode").onclick = () => {

    stopTimer();

    isBreak = true;

    duration = 5 * 60;

    remaining = duration;

    updateDurationControls();
    updateTimerDisplay();

};

// ==================================
// DAILY MOTIVATION
// ==================================

const quotes = [
    "Success starts with a single step. Keep moving!",
    "Believe in your progress, even when it feels small.",
    "Focus on your goals, not your distractions.",
    "Every completed task is a step forward.",
    "Your future is created by what you do today."
];

const quoteIndex = new Date().getDate() % quotes.length;

$("motivationText").textContent = quotes[quoteIndex];

// ==================================
// INITIALIZE WEBSITE
// ==================================

render();

updateReminderControl();
updateDurationControls();
updateTimerDisplay();

const installButton = $("installButton");
let installPrompt = null;

window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.hidden = true;
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch(error => {
            console.error("StudyMate offline support could not start:", error);
        });
    });
}

window.addEventListener("offline", () => {
    if (currentUser) {
        setSyncStatus("Offline. Changes will sync when you're back online.");
    }
});

void initializeSync();
