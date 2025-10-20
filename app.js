/* Time Tracker v4 */
const taskList = document.getElementById('taskList');
const addBtn = document.getElementById('addBtn');
const exportBtn = document.getElementById('exportBtn');
const taskName = document.getElementById('taskName');

let tasks = {}; // id -> {title, running, startTime, elapsedMs, lastStartISO}
let timers = {};

function load() {
  const raw = localStorage.getItem('tt_tasks_v4');
  if (raw) {
    tasks = JSON.parse(raw);
  } else {
    const migrate = localStorage.getItem('tt_tasks_v3') || localStorage.getItem('tt_tasks_v2');
    tasks = migrate ? JSON.parse(migrate) : {};
  }
  save();
  renderAll();
}

function save() {
  localStorage.setItem('tt_tasks_v4', JSON.stringify(tasks));
}

function fmt(ms) {
  const totalMs = Math.max(0, Math.floor(ms));
  const totalSec = Math.floor(totalMs / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2,'0');
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2,'0');
  const s = (totalSec % 60).toString().padStart(2,'0');
  const milli = (totalMs % 1000).toString().padStart(3,'0');
  return `${h}:${m}:${s}.${milli}`;
}

function tsISOWithMillis(date) {
  const pad = (n,l=2)=>n.toString().padStart(l,'0');
  const y = date.getFullYear();
  const mo = pad(date.getMonth()+1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(),3);
  return `${y}-${mo}-${d} ${h}:${mi}:${s}.${ms}`;
}

function addTask(title) {
  const id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  tasks[id] = { title: title || 'Task', running: false, startTime: 0, elapsedMs: 0, lastStartISO: '' };
  save();
  renderTask(id);
}

function removeTask(id) {
  pause(id);
  delete tasks[id];
  save();
  document.getElementById(id)?.remove();
}

function start(id) {
  const t = tasks[id];
  if (t.running) return;
  t.running = true;
  t.startTime = Date.now();
  if (t.elapsedMs === 0) {
    t.lastStartISO = tsISOWithMillis(new Date());
  }
  save();
  timers[id] = setInterval(() => updateElapsed(id), 50);
  updateRowUI(id);
}

function pause(id) {
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
  t.lastStartISO = '';
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
  row.querySelector('.badge').textContent = t.running ? fmt(t.elapsedMs + (Date.now() - t.startTime)) : fmt(t.elapsedMs);
  row.querySelector('.start-time').textContent = t.lastStartISO ? `Started: ${t.lastStartISO}` : 'Not started yet';
  row.querySelector('.start').disabled = t.running;
  row.querySelector('.pause').disabled = !t.running;
}

function renderTask(id) {
  const t = tasks[id];
  const row = document.createElement('div');
  row.className = 'task';
  row.id = id;

  const meta = document.createElement('div');
  meta.className = 'meta';

  const title = document.createElement('input');
  title.className = 'title';
  title.value = t.title;
  title.addEventListener('change', () => { t.title = title.value; save(); });

  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.textContent = fmt(t.elapsedMs);

  const startTime = document.createElement('div');
  startTime.className = 'start-time';
  startTime.textContent = t.lastStartISO ? `Started: ${t.lastStartISO}` : 'Not started yet';

  meta.append(title, badge, startTime);

  const controls = document.createElement('div');
  controls.className = 'controls';
  const startBtn = document.createElement('button');
  startBtn.className = 'btn start';
  startBtn.textContent = 'Start';
  startBtn.onclick = () => start(id);

  const pauseBtn = document.createElement('button');
  pauseBtn.className = 'btn pause';
  pauseBtn.textContent = 'Pause';
  pauseBtn.onclick = () => pause(id);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn reset';
  resetBtn.textContent = 'Reset';
  resetBtn.onclick = () => reset(id);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn delete';
  delBtn.textContent = 'Delete';
  delBtn.onclick = () => removeTask(id);

  controls.append(startBtn, pauseBtn, resetBtn, delBtn);

  row.append(meta, controls);
  taskList.prepend(row);

  updateRowUI(id);
  if (t.running) {
    timers[id] = setInterval(() => updateElapsed(id), 50);
  }
}

function renderAll() {
  taskList.innerHTML = '';
  Object.keys(tasks).forEach(renderTask);
}

/* Export CSV */
function exportCSV() {
  const rows = [['Task','Start timestamp','Total seconds','Formatted']];
  Object.values(tasks).forEach(t => {
    const totalSec = Math.floor(t.elapsedMs / 1000);
    rows.push([t.title.replace(/"/g,'""'), t.lastStartISO || '', totalSec, fmt(t.elapsedMs)]);
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

addBtn.addEventListener('click', () => {
  const name = taskName.value.trim();
  addTask(name);
  taskName.value = '';
  taskName.focus();
});

exportBtn.addEventListener('click', exportCSV);

load();
