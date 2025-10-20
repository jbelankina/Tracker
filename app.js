/* Simple Time Tracker with localStorage persistence */
const taskList = document.getElementById('taskList');
const addBtn = document.getElementById('addBtn');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const taskName = document.getElementById('taskName');

let tasks = {}; // id -> {title, running, startTime, elapsedMs}
let timers = {}; // id -> interval handle

function load() {
  const raw = localStorage.getItem('tt_tasks');
  tasks = raw ? JSON.parse(raw) : {};
  renderAll();
}

function save() {
  localStorage.setItem('tt_tasks', JSON.stringify(tasks));
}

function fmt(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600).toString().padStart(2,'0');
  const m = Math.floor((total % 3600) / 60).toString().padStart(2,'0');
  const s = (total % 60).toString().padStart(2,'0');
  return `${h}:${m}:${s}`;
}

function addTask(title) {
  const id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  tasks[id] = { title: title || 'Task', running: false, startTime: 0, elapsedMs: 0 };
  save();
  renderTask(id);
}

function removeTask(id) {
  stop(id);
  delete tasks[id];
  save();
  document.getElementById(id)?.remove();
}

function start(id) {
  const t = tasks[id];
  if (t.running) return;
  t.running = true;
  t.startTime = Date.now();
  save();
  timers[id] = setInterval(() => updateElapsed(id), 250);
  updateRowUI(id);
}

function stop(id) {
  const t = tasks[id];
  if (!t.running) return;
  t.running = false;
  const now = Date.now();
  t.elapsedMs += now - t.startTime;
  t.startTime = 0;
  save();
  clearInterval(timers[id]);
  updateRowUI(id);
}

function reset(id) {
  const t = tasks[id];
  t.running = false;
  t.startTime = 0;
  t.elapsedMs = 0;
  save();
  clearInterval(timers[id]);
  updateRowUI(id);
}

function updateElapsed(id) {
  const t = tasks[id];
  if (!t.running) return;
  const now = Date.now();
  const ms = t.elapsedMs + (now - t.startTime);
  const el = document.querySelector(`#${id} .badge`);
  if (el) el.textContent = fmt(ms);
}

function updateRowUI(id) {
  const t = tasks[id];
  const row = document.getElementById(id);
  if (!row) return;
  row.querySelector('.badge').textContent = fmt(t.elapsedMs);
  const startBtn = row.querySelector('.start');
  const stopBtn = row.querySelector('.stop');
  startBtn.disabled = t.running;
  stopBtn.disabled = !t.running;
}

function renderTask(id) {
  const t = tasks[id];
  const row = document.createElement('div');
  row.className = 'task';
  row.id = id;

  const title = document.createElement('input');
  title.className = 'title';
  title.value = t.title;
  title.addEventListener('change', () => { t.title = title.value; save(); });

  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.textContent = fmt(t.elapsedMs);

  const controls = document.createElement('div');
  controls.className = 'controls';
  const startBtn = document.createElement('button');
  startBtn.className = 'btn start';
  startBtn.textContent = 'Start';
  startBtn.onclick = () => start(id);

  const stopBtn = document.createElement('button');
  stopBtn.className = 'btn stop';
  stopBtn.textContent = 'Stop';
  stopBtn.onclick = () => stop(id);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn reset';
  resetBtn.textContent = 'Reset';
  resetBtn.onclick = () => reset(id);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn delete';
  delBtn.textContent = 'Delete';
  delBtn.onclick = () => removeTask(id);

  controls.append(startBtn, stopBtn, resetBtn, delBtn);

  row.append(title, badge, controls);
  taskList.prepend(row);

  updateRowUI(id);
  if (t.running) {
    timers[id] = setInterval(() => updateElapsed(id), 250);
  }
}

function renderAll() {
  taskList.innerHTML = '';
  Object.keys(tasks).forEach(renderTask);
}

/* Export CSV */
function exportCSV() {
  const rows = [['Task','Total Seconds','Formatted']];
  Object.values(tasks).forEach(t => {
    const totalSec = Math.floor(t.elapsedMs / 1000);
    rows.push([t.title.replace(/"/g,'""'), totalSec, fmt(t.elapsedMs)]);
  });
  const csv = rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'time_log.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* Clear all data */
function clearAll() {
  if (!confirm('Delete all tasks and times')) return;
  Object.keys(tasks).forEach(id => clearInterval(timers[id]));
  tasks = {};
  save();
  renderAll();
}

addBtn.addEventListener('click', () => {
  const name = taskName.value.trim();
  addTask(name);
  taskName.value = '';
  taskName.focus();
});

exportBtn.addEventListener('click', exportCSV);
clearBtn.addEventListener('click', clearAll);

load();
