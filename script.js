const STORAGE_KEY = "simple-alarms";

const clockEl = document.getElementById("clock");
const timeInput = document.getElementById("alarmTime");
const labelInput = document.getElementById("alarmLabel");
const addBtn = document.getElementById("addBtn");
const listEl = document.getElementById("alarmList");
const emptyMsg = document.getElementById("emptyMsg");

const ringOverlay = document.getElementById("ringOverlay");
const ringLabel = document.getElementById("ringLabel");
const ringTime = document.getElementById("ringTime");
const snoozeBtn = document.getElementById("snoozeBtn");
const stopBtn = document.getElementById("stopBtn");

let alarms = loadAlarms();
let ringingAlarmId = null;
let firedToday = new Set();
let audioCtx = null;
let beepInterval = null;

function loadAlarms() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveAlarms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function updateClock() {
  const now = new Date();
  clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function render() {
  listEl.innerHTML = "";
  emptyMsg.style.display = alarms.length === 0 ? "block" : "none";

  alarms
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((alarm) => {
      const li = document.createElement("li");
      li.className = "alarm-item" + (alarm.enabled ? "" : " disabled");

      li.innerHTML = `
        <div class="alarm-info">
          <span class="time">${alarm.time}</span>
          <span class="label">${alarm.label || ""}</span>
        </div>
        <div class="alarm-actions">
          <label class="switch">
            <input type="checkbox" ${alarm.enabled ? "checked" : ""} data-id="${alarm.id}" class="toggle">
            <span class="slider"></span>
          </label>
          <button class="delete-btn" data-id="${alarm.id}">✕</button>
        </div>
      `;
      listEl.appendChild(li);
    });
}

function addAlarm() {
  const time = timeInput.value;
  if (!time) return;

  alarms.push({
    id: Date.now(),
    time,
    label: labelInput.value.trim(),
    enabled: true,
  });

  saveAlarms();
  render();
  timeInput.value = "";
  labelInput.value = "";
}

listEl.addEventListener("click", (e) => {
  if (e.target.classList.contains("toggle")) {
    const id = Number(e.target.dataset.id);
    const alarm = alarms.find((a) => a.id === id);
    if (alarm) {
      alarm.enabled = e.target.checked;
      saveAlarms();
    }
  }

  if (e.target.classList.contains("delete-btn")) {
    const id = Number(e.target.dataset.id);
    alarms = alarms.filter((a) => a.id !== id);
    saveAlarms();
    render();
  }
});

addBtn.addEventListener("click", addAlarm);

function playBeep() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.value = 880;
  gain.gain.value = 0.2;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

function startRinging(alarm) {
  ringingAlarmId = alarm.id;
  ringLabel.textContent = alarm.label || "알람";
  ringTime.textContent = alarm.time;
  ringOverlay.classList.add("active");

  playBeep();
  beepInterval = setInterval(playBeep, 700);
}

function stopRinging() {
  ringOverlay.classList.remove("active");
  ringingAlarmId = null;
  clearInterval(beepInterval);
  beepInterval = null;
}

stopBtn.addEventListener("click", stopRinging);

snoozeBtn.addEventListener("click", () => {
  const alarm = alarms.find((a) => a.id === ringingAlarmId);
  stopRinging();
  if (!alarm) return;

  const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);
  alarms.push({
    id: Date.now(),
    time: `${pad(snoozeTime.getHours())}:${pad(snoozeTime.getMinutes())}`,
    label: (alarm.label ? alarm.label + " " : "") + "(스누즈)",
    enabled: true,
  });
  saveAlarms();
  render();
});

function checkAlarms() {
  const now = new Date();
  const current = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  if (now.getSeconds() === 0) {
    firedToday.clear();
  }

  alarms.forEach((alarm) => {
    if (
      alarm.enabled &&
      alarm.time === current &&
      !firedToday.has(alarm.id) &&
      ringingAlarmId === null
    ) {
      firedToday.add(alarm.id);
      startRinging(alarm);
    }
  });
}

setInterval(() => {
  updateClock();
  checkAlarms();
}, 1000);

updateClock();
render();

const weatherEl = document.getElementById("weather");
const WEATHER_LAT = 37.5665;
const WEATHER_LON = 126.9780;

async function loadWeather() {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${WEATHER_LAT}&lon=${WEATHER_LON}&appid=${WEATHER_API_KEY}&units=metric`
    );
    if (!res.ok) throw new Error("weather request failed");
    const data = await res.json();
    weatherEl.textContent = `서울 현재 기온: ${Math.round(data.main.temp)}°C`;
  } catch {
    weatherEl.textContent = "기온 정보를 불러올 수 없습니다.";
  }
}

loadWeather();
