// Auth guard
const token = localStorage.getItem('taskify_token');
if (!token) {
  window.location.href = './index.html';
}

function initials(name) {
  return name
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Maps the real current weekday to this app's Mon-first chart scheme
// (day_label letters M,T,W,T,F,S,S and sort_order 1-7). Used both to
// highlight today in the calendar and to log hours against the right bar.
function getTodayWeekdayInfo() {
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const jsDay = new Date().getDay(); // 0 = Sun ... 6 = Sat
  const monIndex = (jsDay + 6) % 7; // 0 = Mon ... 6 = Sun
  return { label: dayLabels[monIndex], sortOrder: monIndex + 1 };
}

function renderProfile(user) {
  document.getElementById('greetName').textContent = user.name.split(' ')[0];
  document.getElementById('profileName').textContent = user.name;
  document.getElementById('profileRole').textContent = user.role;
  const avatar = document.getElementById('profileAvatar');
  avatar.textContent = initials(user.name);
  avatar.style.backgroundColor = user.avatar_color || '#6D28D9';
}

// Renders the current real week (Mon-Sun) for the actual current month/year,
// with today's real date highlighted. Re-computed from `new Date()` on every load,
// so it always reflects the machine's actual current date - no hardcoded month.
function renderCalendar() {
  const today = new Date();
  const monthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  document.getElementById('calendarMonthLabel').textContent = monthLabel;

  // Find Monday of the current week
  const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const dayLabels = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = d.toDateString() === today.toDateString();

    const cell = document.createElement('div');
    cell.className = isToday ? 'bg-primary text-white rounded-full py-1' : '';
    cell.innerHTML = `${d.getDate()}<br><span class="${isToday ? 'text-white/80' : 'text-ink-muted'}">${dayLabels[i]}</span>`;
    grid.appendChild(cell);
  }
}

function renderTaskCards(tasks) {
  const container = document.getElementById('taskCards');
  container.innerHTML = '';

  if (tasks.length === 0) {
    container.innerHTML = '<p class="text-sm text-ink-muted col-span-full">No tasks yet. Create one to see it here.</p>';
    return;
  }

  tasks.forEach((task) => {
    const dueLabel = task.due_date
      ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';
    const card = document.createElement('div');
    card.className = 'card flex flex-col gap-3';
    card.innerHTML = `
      <p class="text-xs text-ink-muted">${dueLabel}</p>
      <div>
        <p class="font-bold">${task.title}</p>
        <p class="text-xs text-ink-muted">${task.category}</p>
      </div>
      <div class="flex items-center justify-between text-xs mb-1">
        <span class="text-ink-muted">Progress</span>
        <span class="font-semibold" style="color:${task.color}">${task.progress}%</span>
      </div>
      <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full rounded-full" style="width:${task.progress}%; background-color:${task.color}"></div>
      </div>
      <div class="flex items-center justify-between mt-1">
        <div class="flex -space-x-2">
          <div class="w-6 h-6 rounded-full border-2 border-white" style="background-color:${task.color}"></div>
          <div class="w-6 h-6 rounded-full border-2 border-white bg-primary-light"></div>
        </div>
        ${task.days_left != null
          ? `<span class="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary-pale text-primary">${task.days_left} days left</span>`
          : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

function renderChart(progressLog) {
  const bars = document.getElementById('chartBars');
  const labels = document.getElementById('chartLabels');
  bars.innerHTML = '';
  labels.innerHTML = '';

  const totalHours = progressLog.reduce((sum, p) => sum + Number(p.hours), 0);
  const daysLogged = progressLog.filter(p => Number(p.hours) > 0).length;
  const avgPerDay = daysLogged > 0 ? totalHours / daysLogged : 0;

  document.getElementById('statTimeSpent').textContent = `${totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h`;
  document.getElementById('statDaysLogged').textContent = `${daysLogged}/7`;
  document.getElementById('statAvgPerDay').textContent = `${avgPerDay % 1 === 0 ? avgPerDay : avgPerDay.toFixed(1)}h`;

  if (progressLog.length === 0) {
    bars.innerHTML = '<p class="text-xs text-ink-muted self-center">No activity logged yet.</p>';
    return;
  }

  const max = Math.max(...progressLog.map(p => Number(p.hours)), 1);
  progressLog.forEach(p => {
    const pct = Math.round((Number(p.hours) / max) * 100);
    const bar = document.createElement('div');
    bar.className = 'flex-1 bg-primary-pale rounded-t-lg relative flex items-end';
    bar.style.height = '100%';
    bar.innerHTML = `<div class="w-full bg-primary rounded-t-lg" style="height:${pct}%"></div>`;
    bars.appendChild(bar);

    const label = document.createElement('span');
    label.textContent = p.day_label;
    label.className = 'flex-1 text-center';
    labels.appendChild(label);
  });
}

function renderAssignments(assignments, summary) {
  const list = document.getElementById('assignmentList');
  list.innerHTML = '';
  document.getElementById('assignmentSummary').textContent = `${summary.completed}/${summary.total}`;

  if (assignments.length === 0) {
    list.innerHTML = '<p class="text-sm text-ink-muted">No assignments yet.</p>';
    return;
  }

  assignments.forEach(a => {
    const dueLabel = a.due_date
      ? new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';
    const li = document.createElement('li');
    li.className = 'flex items-center justify-between text-sm';
    li.innerHTML = `
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" data-id="${a.id}" class="assignment-check w-4 h-4 accent-primary rounded" ${a.completed ? 'checked' : ''} />
        <span class="${a.completed ? 'line-through text-ink-muted' : ''}">${a.title}</span>
      </label>
      <div class="text-right">
        <p class="text-xs text-ink-muted">${dueLabel}</p>
        <p class="text-xs font-semibold text-primary">${a.grade || ''}</p>
      </div>
    `;
    list.appendChild(li);
  });

  document.querySelectorAll('.assignment-check').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      try {
        await TaskifyAPI.toggleAssignment(e.target.dataset.id);
        loadAssignments();
      } catch (err) {
        console.error(err);
      }
    });
  });
}

function renderBatchmates(batchmates) {
  const list = document.getElementById('batchmateList');
  const empty = document.getElementById('batchmateEmpty');
  list.innerHTML = '';

  if (batchmates.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  batchmates.forEach(b => {
    const li = document.createElement('li');
    li.className = 'flex items-center gap-3';
    li.innerHTML = `
      <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style="background-color:${b.avatar_color}">
        ${initials(b.name)}
      </div>
      <div class="flex-1">
        <p class="text-sm font-semibold">${b.name}</p>
        <p class="text-xs text-ink-muted">${b.role}</p>
      </div>
      <button data-id="${b.id}" class="remove-batchmate text-ink-muted hover:text-danger text-xs">&times;</button>
    `;
    list.appendChild(li);
  });

  document.querySelectorAll('.remove-batchmate').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      try {
        await TaskifyAPI.removeBatchmate(e.target.dataset.id);
        loadBatchmates();
      } catch (err) {
        console.error(err);
      }
    });
  });
}

async function loadAssignments() {
  const { assignments, summary } = await TaskifyAPI.getAssignments();
  renderAssignments(assignments, summary);
}

async function loadTasks() {
  const { tasks, progressLog } = await TaskifyAPI.getTasks();
  renderTaskCards(tasks);
  renderChart(progressLog);
}

async function loadBatchmates() {
  const { batchmates } = await TaskifyAPI.getBatchmates();
  renderBatchmates(batchmates);
}

async function loadDashboard() {
  try {
    renderCalendar();

    const { user } = await TaskifyAPI.me();
    renderProfile(user);

    await loadTasks();
    await loadAssignments();
    await loadBatchmates();
  } catch (err) {
    console.error(err);
    if (err.message.includes('token') || err.message.includes('Authorization')) {
      clearSession();
      window.location.href = './index.html';
    }
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearSession();
  window.location.href = './index.html';
});

// Add-team-member inline form
const toggleAddBatchmateBtn = document.getElementById('toggleAddBatchmate');
const addBatchmateForm = document.getElementById('addBatchmateForm');
const cancelAddBatchmateBtn = document.getElementById('cancelAddBatchmate');
const batchmateFormError = document.getElementById('batchmateFormError');

toggleAddBatchmateBtn.addEventListener('click', () => {
  addBatchmateForm.classList.remove('hidden');
  addBatchmateForm.classList.add('flex');
  toggleAddBatchmateBtn.classList.add('hidden');
});

cancelAddBatchmateBtn.addEventListener('click', () => {
  addBatchmateForm.classList.add('hidden');
  addBatchmateForm.classList.remove('flex');
  toggleAddBatchmateBtn.classList.remove('hidden');
  batchmateFormError.classList.add('hidden');
  addBatchmateForm.reset();
});

addBatchmateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  batchmateFormError.classList.add('hidden');

  const name = document.getElementById('batchmateName').value.trim();
  const role = document.getElementById('batchmateRole').value.trim();

  if (!name || !role) {
    batchmateFormError.textContent = 'Please enter both a name and a role.';
    batchmateFormError.classList.remove('hidden');
    return;
  }

  try {
    await TaskifyAPI.addBatchmate(name, role);
    addBatchmateForm.reset();
    addBatchmateForm.classList.add('hidden');
    addBatchmateForm.classList.remove('flex');
    toggleAddBatchmateBtn.classList.remove('hidden');
    await loadBatchmates();
  } catch (err) {
    batchmateFormError.textContent = err.message;
    batchmateFormError.classList.remove('hidden');
  }
});

// Add-task inline form
const toggleAddTaskBtn = document.getElementById('toggleAddTask');
const calendarAddTaskLink = document.getElementById('calendarAddTaskLink');
const addTaskForm = document.getElementById('addTaskForm');
const cancelAddTaskBtn = document.getElementById('cancelAddTask');
const taskFormError = document.getElementById('taskFormError');

const TASK_COLORS = ['#6D28D9', '#A78BFA', '#F59E0B', '#5B21B6', '#8B5CF6'];
let taskColorIndex = 0;

function openAddTaskForm() {
  addTaskForm.classList.remove('hidden');
  addTaskForm.classList.add('flex');
  toggleAddTaskBtn.classList.add('hidden');
  document.getElementById('taskTitle').focus();
}

function closeAddTaskForm() {
  addTaskForm.classList.add('hidden');
  addTaskForm.classList.remove('flex');
  toggleAddTaskBtn.classList.remove('hidden');
  taskFormError.classList.add('hidden');
  addTaskForm.reset();
}

toggleAddTaskBtn.addEventListener('click', openAddTaskForm);
calendarAddTaskLink.addEventListener('click', openAddTaskForm);
cancelAddTaskBtn.addEventListener('click', closeAddTaskForm);

addTaskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  taskFormError.classList.add('hidden');

  const title = document.getElementById('taskTitle').value.trim();
  const category = document.getElementById('taskCategory').value.trim();
  const dueDateValue = document.getElementById('taskDueDate').value;
  const progressValue = document.getElementById('taskProgress').value;

  if (!title || !category) {
    taskFormError.textContent = 'Please enter at least a title and a category.';
    taskFormError.classList.remove('hidden');
    return;
  }

  let daysLeft = null;
  if (dueDateValue) {
    const due = new Date(dueDateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  }

  const color = TASK_COLORS[taskColorIndex % TASK_COLORS.length];
  taskColorIndex++;

  try {
    await TaskifyAPI.createTask({
      title,
      category,
      progress: progressValue ? Number(progressValue) : 0,
      due_date: dueDateValue || null,
      days_left: daysLeft,
      color,
    });
    closeAddTaskForm();
    await loadTasks();
  } catch (err) {
    taskFormError.textContent = err.message;
    taskFormError.classList.remove('hidden');
  }
});

// Sidebar navigation - every section is now fully built and backed by real data.
const navLinks = document.querySelectorAll('.nav-link');
const allViews = {
  dashboard: document.getElementById('dashboardView'),
  track: document.getElementById('trackView'),
  projects: document.getElementById('projectsView'),
  reports: document.getElementById('reportsView'),
  support: document.getElementById('supportView'),
  settings: document.getElementById('settingsView'),
};

const viewDisplayClass = {
  dashboard: 'grid',
  track: 'flex',
  projects: 'flex',
  reports: 'flex',
  support: 'flex',
  settings: 'flex',
};

navLinks.forEach(link => {
  link.addEventListener('click', async () => {
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    const view = link.dataset.view;
    Object.entries(allViews).forEach(([name, el]) => {
      const isActive = name === view;
      el.classList.toggle('hidden', !isActive);
      el.classList.toggle(viewDisplayClass[name], isActive);
    });

    if (view === 'track') await loadTrack();
    if (view === 'projects') await loadProjects();
    if (view === 'reports') await loadReports();
    if (view === 'settings') await loadSettings();
  });
});

// --- Track: editable task list ---
async function loadTrack() {
  const { tasks } = await TaskifyAPI.getTasks();
  const list = document.getElementById('trackList');
  const empty = document.getElementById('trackEmpty');
  list.innerHTML = '';

  if (tasks.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tasks.forEach(task => {
    const row = document.createElement('div');
    row.className = 'card flex flex-col sm:flex-row sm:items-center gap-3';
    row.innerHTML = `
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm">${task.title}</p>
        <p class="text-xs text-ink-muted">${task.category}</p>
      </div>
      <div class="flex items-center gap-2 flex-1">
        <input type="range" min="0" max="100" value="${task.progress}" data-id="${task.id}" class="track-progress-slider flex-1 accent-primary" />
        <span class="track-progress-value text-xs font-semibold w-10 text-right" style="color:${task.color}">${task.progress}%</span>
      </div>
      <button data-id="${task.id}" class="track-delete text-ink-muted hover:text-danger text-xs shrink-0">Delete</button>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('.track-progress-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      e.target.parentElement.querySelector('.track-progress-value').textContent = `${e.target.value}%`;
    });
    slider.addEventListener('change', async (e) => {
      try {
        await TaskifyAPI.updateTask(e.target.dataset.id, { progress: Number(e.target.value) });
      } catch (err) {
        console.error(err);
      }
    });
  });

  list.querySelectorAll('.track-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      try {
        await TaskifyAPI.deleteTask(e.target.dataset.id);
        await loadTrack();
      } catch (err) {
        console.error(err);
      }
    });
  });
}

// --- Projects: tasks grouped by category ---
async function loadProjects() {
  const { tasks } = await TaskifyAPI.getTasks();
  const list = document.getElementById('projectsList');
  const empty = document.getElementById('projectsEmpty');
  list.innerHTML = '';

  if (tasks.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const groups = {};
  tasks.forEach(t => {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  });

  Object.entries(groups).forEach(([category, groupTasks]) => {
    const avgProgress = Math.round(groupTasks.reduce((sum, t) => sum + t.progress, 0) / groupTasks.length);
    const card = document.createElement('div');
    card.className = 'card flex flex-col gap-3';
    card.innerHTML = `
      <p class="font-bold">${category}</p>
      <p class="text-xs text-ink-muted">${groupTasks.length} task${groupTasks.length === 1 ? '' : 's'}</p>
      <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full bg-primary rounded-full" style="width:${avgProgress}%"></div>
      </div>
      <p class="text-xs text-ink-muted">${avgProgress}% average progress</p>
    `;
    list.appendChild(card);
  });
}

// --- Reports: real aggregate stats ---
async function loadReports() {
  const { tasks, assignments, hours, team, byCategory } = await TaskifyAPI.getReportsSummary();

  document.getElementById('reportTaskCount').textContent = tasks.task_count;
  document.getElementById('reportAvgProgress').textContent = `${tasks.avg_progress}%`;
  document.getElementById('reportAssignments').textContent = `${assignments.completed}/${assignments.total}`;
  document.getElementById('reportHours').textContent = `${hours.total_hours % 1 === 0 ? hours.total_hours : hours.total_hours.toFixed(1)}h`;

  const list = document.getElementById('reportCategoryList');
  const empty = document.getElementById('reportCategoryEmpty');
  list.innerHTML = '';

  if (byCategory.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  byCategory.forEach(c => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 text-sm';
    row.innerHTML = `
      <span class="w-28 shrink-0 font-medium">${c.category}</span>
      <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full bg-primary rounded-full" style="width:${c.avg_progress}%"></div>
      </div>
      <span class="w-10 text-right text-ink-muted text-xs">${c.avg_progress}%</span>
    `;
    list.appendChild(row);
  });
}

// --- Settings: real profile edit + password change ---
async function loadSettings() {
  const { user } = await TaskifyAPI.me();
  document.getElementById('settingsName').value = user.name;
  document.getElementById('settingsRole').value = user.role;
}

const profileForm = document.getElementById('profileForm');
const profileFormSuccess = document.getElementById('profileFormSuccess');
const profileFormError = document.getElementById('profileFormError');

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  profileFormSuccess.classList.add('hidden');
  profileFormError.classList.add('hidden');

  const name = document.getElementById('settingsName').value.trim();
  const role = document.getElementById('settingsRole').value.trim();

  if (!name || !role) {
    profileFormError.textContent = 'Name and role cannot be empty.';
    profileFormError.classList.remove('hidden');
    return;
  }

  try {
    const { user } = await TaskifyAPI.updateProfile({ name, role });
    localStorage.setItem('taskify_user', JSON.stringify(user));
    renderProfile(user);
    profileFormSuccess.classList.remove('hidden');
  } catch (err) {
    profileFormError.textContent = err.message;
    profileFormError.classList.remove('hidden');
  }
});

const passwordForm = document.getElementById('passwordForm');
const passwordFormSuccess = document.getElementById('passwordFormSuccess');
const passwordFormError = document.getElementById('passwordFormError');

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  passwordFormSuccess.classList.add('hidden');
  passwordFormError.classList.add('hidden');

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;

  if (!currentPassword || !newPassword) {
    passwordFormError.textContent = 'Please fill in both fields.';
    passwordFormError.classList.remove('hidden');
    return;
  }

  try {
    await TaskifyAPI.changePassword(currentPassword, newPassword);
    passwordForm.reset();
    passwordFormSuccess.classList.remove('hidden');
  } catch (err) {
    passwordFormError.textContent = err.message;
    passwordFormError.classList.remove('hidden');
  }
});

// Add-assignment inline form
const toggleAddAssignmentBtn = document.getElementById('toggleAddAssignment');
const addAssignmentForm = document.getElementById('addAssignmentForm');
const cancelAddAssignmentBtn = document.getElementById('cancelAddAssignment');
const assignmentFormError = document.getElementById('assignmentFormError');

toggleAddAssignmentBtn.addEventListener('click', () => {
  addAssignmentForm.classList.remove('hidden');
  addAssignmentForm.classList.add('flex');
  toggleAddAssignmentBtn.classList.add('hidden');
});

cancelAddAssignmentBtn.addEventListener('click', () => {
  addAssignmentForm.classList.add('hidden');
  addAssignmentForm.classList.remove('flex');
  toggleAddAssignmentBtn.classList.remove('hidden');
  assignmentFormError.classList.add('hidden');
  addAssignmentForm.reset();
});

addAssignmentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  assignmentFormError.classList.add('hidden');

  const title = document.getElementById('assignmentTitle').value.trim();
  const dueDate = document.getElementById('assignmentDueDate').value;
  const grade = document.getElementById('assignmentGrade').value.trim();

  if (!title) {
    assignmentFormError.textContent = 'Please enter a title.';
    assignmentFormError.classList.remove('hidden');
    return;
  }

  try {
    await TaskifyAPI.createAssignment(title, dueDate || null, grade || null);
    addAssignmentForm.reset();
    addAssignmentForm.classList.add('hidden');
    addAssignmentForm.classList.remove('flex');
    toggleAddAssignmentBtn.classList.remove('hidden');
    await loadAssignments();
  } catch (err) {
    assignmentFormError.textContent = err.message;
    assignmentFormError.classList.remove('hidden');
  }
});

// Log-hours inline form (adds to today's real weekday bar in the chart)
const toggleLogHoursBtn = document.getElementById('toggleLogHours');
const logHoursForm = document.getElementById('logHoursForm');
const cancelLogHoursBtn = document.getElementById('cancelLogHours');
const logHoursError = document.getElementById('logHoursError');

toggleLogHoursBtn.addEventListener('click', () => {
  logHoursForm.classList.remove('hidden');
  logHoursForm.classList.add('flex');
  toggleLogHoursBtn.classList.add('hidden');
  document.getElementById('logHoursInput').focus();
});

cancelLogHoursBtn.addEventListener('click', () => {
  logHoursForm.classList.add('hidden');
  logHoursForm.classList.remove('flex');
  toggleLogHoursBtn.classList.remove('hidden');
  logHoursError.classList.add('hidden');
  logHoursForm.reset();
});

logHoursForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  logHoursError.classList.add('hidden');

  const hours = document.getElementById('logHoursInput').value;
  if (!hours || Number(hours) <= 0) {
    logHoursError.textContent = 'Enter a number of hours greater than 0.';
    logHoursError.classList.remove('hidden');
    return;
  }

  const { label, sortOrder } = getTodayWeekdayInfo();

  try {
    await TaskifyAPI.logProgress(label, sortOrder, Number(hours));
    logHoursForm.reset();
    logHoursForm.classList.add('hidden');
    logHoursForm.classList.remove('flex');
    toggleLogHoursBtn.classList.remove('hidden');
    await loadTasks();
  } catch (err) {
    logHoursError.textContent = err.message;
    logHoursError.classList.remove('hidden');
  }
});

loadDashboard();