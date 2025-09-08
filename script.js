// Timer app logic
const $ = id => document.getElementById(id);

let setsEl = $('sets');
let setsIncrease = $('sets-increase');
let setsDecrease = $('sets-decrease');
let workMin = $('work-min'), workSec = $('work-sec');
let restMin = $('rest-min'), restSec = $('rest-sec');
let startBtn = $('start'), pauseBtn = $('pause'), resetBtn = $('reset');
let statusEl = $('status'), timerEl = $('timer'), currentSetEl = $('current-set'), totalSetsEl = $('total-sets');
let barEl = $('bar');
let skipLastRest = $('skip-last-rest');

let totalSets = 3, currentSet = 0;
let running = false, paused = false;
let timerInterval = null;
let remaining = 0; // seconds
let phase = 'work'; // 'work' or 'rest'

function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

function renderSettings(){
  setsEl.textContent = totalSets;
  totalSetsEl.textContent = totalSets;
  currentSetEl.textContent = currentSet;
  // persist
  localStorage.setItem('timer_settings', JSON.stringify({
    totalSets, workMin: workMin.value, workSec: workSec.value,
    restMin: restMin.value, restSec: restSec.value, skipLastRest: skipLastRest.checked
  }));
}

function loadSettings(){
  let s = localStorage.getItem('timer_settings');
  if(s) try{
    let obj = JSON.parse(s);
    totalSets = obj.totalSets || totalSets;
    workMin.value = obj.workMin ?? workMin.value;
    workSec.value = obj.workSec ?? workSec.value;
    restMin.value = obj.restMin ?? restMin.value;
    restSec.value = obj.restSec ?? restSec.value;
    skipLastRest.checked = obj.skipLastRest ?? false;
  }catch(e){}
}

function secondsFromInputs(minEl, secEl){
  let m = clamp(parseInt(minEl.value||0,10) || 0,0,59);
  let s = clamp(parseInt(secEl.value||0,10) || 0,0,59);
  minEl.value = String(m);
  secEl.value = String(s);
  return m*60 + s;
}

function formatTime(s){
  s = Math.max(0, Math.floor(s));
  let m = Math.floor(s/60), sec = s%60;
  return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
}

function updateDisplay(){
  timerEl.textContent = formatTime(remaining);
  currentSetEl.textContent = currentSet;
  totalSetsEl.textContent = totalSets;
  // progress: if in work show percent through work else show through rest
  let totalPhase = phase === 'work' ? secondsFromInputs(workMin,workSec) : secondsFromInputs(restMin,restSec);
  let percent = totalPhase ? Math.round(((totalPhase - remaining) / totalPhase) * 100) : 0;
  barEl.style.width = percent + '%';
  statusEl.textContent = (running ? (phase === 'work' ? 'Робота' : 'Відпочинок') : 'Готово');
}

function startTimer(){
  if(running) return;
  totalSets = clamp(parseInt(setsEl.textContent||3,10)||3,1,10);
  currentSet = 0;
  phase = 'work';
  running = true;
  paused = false;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  resetBtn.disabled = false;
  nextStartPhase();
  renderSettings();
}

function pauseTimer(){
  if(!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? 'Продовжити' : 'Пауза';
  if(paused){
    clearInterval(timerInterval);
  } else {
    tick();
    timerInterval = setInterval(tick, 250);
  }
}

function resetTimer(){
  running = false;
  paused = false;
  clearInterval(timerInterval);
  startBtn.disabled = false;
  pauseBtn.disabled = true; pauseBtn.textContent = 'Пауза';
  resetBtn.disabled = true;
  currentSet = 0;
  remaining = 0;
  phase = 'work';
  updateDisplay();
}

function nextStartPhase(){
  // decide next phase
  if(phase === 'work'){
    currentSet++;
    remaining = secondsFromInputs(workMin, workSec);
    if(remaining <= 0){
      // immediately transition to rest or finish
      phase = 'rest';
      nextStartPhase();
      return;
    }
  } else { // rest finished, move to next work or end
    remaining = secondsFromInputs(restMin, restSec);
    if(remaining <= 0){
      // skip rest, advance
      phase = 'work';
      if(currentSet >= totalSets) { finishAll(); return; }
      nextStartPhase();
      return;
    }
  }
  updateDisplay();
  tick();
  clearInterval(timerInterval);
  timerInterval = setInterval(tick, 250);
}

function tick(){
  if(!running || paused) return;
  remaining -= 0.25;
  if(remaining <= 0.001){
    // phase ended
    if(phase === 'work'){
      // if last set and skip last rest => finish
      if(currentSet >= totalSets){
        if(skipLastRest.checked){ finishAll(); return; }
      }
      // switch to rest if rest > 0 and (not last rest skipped)
      let restSec = secondsFromInputs(restMin, restSec);
      if(currentSet >= totalSets && skipLastRest.checked){
        // finish
        finishAll();
        return;
      }
      phase = 'rest';
      remaining = secondsFromInputs(restMin, restSec);
      if(remaining <= 0){ // nothing to rest -> next work or finish
        phase = 'work';
        if(currentSet >= totalSets){ finishAll(); return; }
        nextStartPhase();
        return;
      }
    } else { // rest ended -> next work or finish
      if(currentSet >= totalSets){
        finishAll(); return;
      }
      phase = 'work';
      remaining = secondsFromInputs(workMin, workSec);
      if(remaining <= 0){
        finishAll(); return;
      }
    }
  }
  updateDisplay();
}

function finishAll(){
  clearInterval(timerInterval);
  running = false;
  paused = false;
  startBtn.disabled = false;
  pauseBtn.disabled = true; pauseBtn.textContent = 'Пауза';
  resetBtn.disabled = false;
  statusEl.textContent = 'Готово';
  remaining = 0;
  updateDisplay();
  // small vibration if available
  if(navigator.vibrate) navigator.vibrate([200,100,200]);
}

function incSets(delta){
  totalSets = clamp(totalSets + delta, 1, 10);
  renderSettings();
}

// event wiring
setsIncrease.addEventListener('click', ()=>{incSets(1);});
setsDecrease.addEventListener('click', ()=>{incSets(-1);});

document.querySelectorAll('.add').forEach(b=>b.addEventListener('click', e=>{
  let t = e.currentTarget.dataset.target;
  if(t==='work'){ let s = secondsFromInputs(workMin, workSec)+5; s = clamp(s,0,3599); workMin.value=Math.floor(s/60); workSec.value=s%60; }
  else { let s = secondsFromInputs(restMin, restSec)+5; s = clamp(s,0,3599); restMin.value=Math.floor(s/60); restSec.value=s%60; }
  renderSettings();
}));
document.querySelectorAll('.sub').forEach(b=>b.addEventListener('click', e=>{
  let t = e.currentTarget.dataset.target;
  if(t==='work'){ let s = secondsFromInputs(workMin, workSec)-5; s = clamp(s,0,3599); workMin.value=Math.floor(s/60); workSec.value=s%60; }
  else { let s = secondsFromInputs(restMin, restSec)-5; s = clamp(s,0,3599); restMin.value=Math.floor(s/60); restSec.value=s%60; }
  renderSettings();
}));

startBtn.addEventListener('click', ()=>startTimer());
pauseBtn.addEventListener('click', ()=>pauseTimer());
resetBtn.addEventListener('click', ()=>resetTimer());

// make sure number inputs remain in range
[workMin, workSec, restMin, restSec].forEach(inp=>{
  inp.addEventListener('change', ()=>{
    inp.value = clamp(parseInt(inp.value||0,10)||0, 0, 59);
    renderSettings();
  });
});

// init
loadSettings();
renderSettings();
updateDisplay();

// register service worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}
