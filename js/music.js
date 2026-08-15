/* ============================================================
   MUSIC — procedural 16-bit chiptune engine (Web Audio API)
   ============================================================ */
const Music=(function(){
let ctx=null, master=null, filter=null;
let curTrack=null, curTrackName=null;
let step=0, nextTime=0;
let timer=null;
let muted=false;
let started=false;

function m2f(m){return 440*Math.pow(2,(m-69)/12);}

/* ---- tracks: 16-step patterns; null = rest ---- */
const TRACKS={
  title:{
    bpm:80, wave:"triangle", leadWave:"square", bassVol:0.22, leadVol:0.10,
    bass:[45,null,null,null, 45,null,null,null, 43,null,null,null, 40,null,null,null],
    lead:[null,null,76,null, null,79,null,null, 81,null,null,79, null,null,76,null],
    perc:[]
  },
  workbench:{
    bpm:128, wave:"square", leadWave:"square", bassVol:0.18, leadVol:0.09,
    bass:[36,null,36,null, 43,null,43,null, 45,null,45,null, 41,null,41,null],
    lead:[72,76,79,76, 74,77,81,77, 76,79,81,84, 72,77,76,72],
    perc:["k",null,"h",null, null,"h",null,"h", "k",null,"h",null, null,"h","h","h"]
  },
  map:{
    bpm:122, wave:"square", leadWave:"square", bassVol:0.20, leadVol:0.10,
    bass:[45,null,null,45, 45,null,null,null, 43,null,null,43, 41,null,null,null],
    lead:[76,null,79,null, 81,null,79,76, 74,null,76,null, 72,null,74,76],
    perc:["k",null,"h",null, "s",null,"h",null, "k",null,"h",null, "s",null,"h","h"]
  },
  pokedex:{
    bpm:96, wave:"triangle", leadWave:"square", bassVol:0.18, leadVol:0.08,
    bass:[48,null,null,null, 55,null,null,null, 52,null,null,null, 55,null,null,null],
    lead:[72,null,76,null, 79,null,null,null, 77,null,74,null, 72,null,null,null],
    perc:[]
  }
};

function ensure(){
  if(ctx)return;
  ctx=new (window.AudioContext||window.webkitAudioContext)();
  master=ctx.createGain(); master.gain.value=muted?0:0.5;
  filter=ctx.createBiquadFilter(); filter.type="lowpass"; filter.frequency.value=3200;
  filter.connect(master); master.connect(ctx.destination);
}

function env(g,t,attack,decay,peak){
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(peak,t+attack);
  g.gain.exponentialRampToValueAtTime(0.0001,t+attack+decay);
}

function playNote(freq,t,dur,wave,peak){
  if(!freq)return;
  const o=ctx.createOscillator(); const g=ctx.createGain();
  o.type=wave; o.frequency.setValueAtTime(freq,t);
  g.connect(filter); o.connect(g);
  env(g,t,0.01,Math.max(0.05,dur),peak);
  o.start(t); o.stop(t+dur+0.05);
  // slight detune second osc for richness on lead
  if(wave==="square"){
    const o2=ctx.createOscillator(); const g2=ctx.createGain();
    o2.type="square"; o2.frequency.setValueAtTime(freq*1.003,t); o2.detune.value=4;
    g2.connect(filter); o2.connect(g2); env(g2,t,0.01,dur,peak*0.5);
    o2.start(t); o2.stop(t+dur+0.05);
  }
}

function noiseBurst(t,dur,peak,type){
  const len=Math.floor(ctx.sampleRate*dur);
  const buf=ctx.createBuffer(1,len,ctx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1);
  const src=ctx.createBufferSource(); src.buffer=buf;
  const g=ctx.createGain(); const f=ctx.createBiquadFilter();
  f.type=type; f.frequency.value=type==="highpass"?7000:1800;
  src.connect(f); f.connect(g); g.connect(filter);
  env(g,t,0.001,dur,peak);
  src.start(t); src.stop(t+dur+0.02);
}
function kick(t){
  const o=ctx.createOscillator(); const g=ctx.createGain();
  o.type="sine"; o.frequency.setValueAtTime(130,t); o.frequency.exponentialRampToValueAtTime(48,t+0.12);
  g.connect(filter); o.connect(g); env(g,t,0.003,0.18,0.5);
  o.start(t); o.stop(t+0.22);
}
function snare(t){ noiseBurst(t,0.14,0.25,"highpass"); }
function hat(t){ noiseBurst(t,0.05,0.12,"highpass"); }

function playStep(i,t){
  const tr=curTrack; if(!tr)return;
  const sd=60/tr.bpm/4; // 16th
  const b=tr.bass[i]; if(b) playNote(m2f(b),t, sd*1.8, tr.wave, tr.bassVol);
  const l=tr.lead[i]; if(l) playNote(m2f(l+12),t, sd*0.9, tr.leadWave, tr.leadVol);
  const p=tr.perc[i];
  if(p==="k")kick(t); else if(p==="s"){snare(t);} else if(p==="h")hat(t);
}

function scheduler(){
  if(!ctx||!curTrack)return;
  while(nextTime < ctx.currentTime + 0.12){
    playStep(step, nextTime);
    const sd=60/curTrack.bpm/4;
    nextTime += sd;
    step=(step+1)%curTrack.bass.length;
  }
}

function start(trackName){
  ensure();
  if(ctx.state==="suspended")ctx.resume();
  if(curTrackName===trackName && timer)return;
  curTrackName=trackName;
  curTrack=TRACKS[trackName]||TRACKS.workbench;
  step=0; nextTime=ctx.currentTime+0.08;
  if(timer)clearInterval(timer);
  timer=setInterval(scheduler,25);
  started=true;
}
function stop(){ if(timer){clearInterval(timer);timer=null;} curTrack=null; curTrackName=null; }
function setMuted(m){ muted=m; if(master)master.gain.setTargetAtTime(m?0:0.5, ctx.currentTime, 0.02); }
function isMuted(){return muted;}
function toggleMute(){ setMuted(!muted); return muted; }

/* one-shot stingers */
function stinger(type){
  ensure();
  if(ctx.state==="suspended")ctx.resume();
  const t0=ctx.currentTime+0.02;
  if(type==="win"){
    const seq=[60,64,67,72,76,79];
    seq.forEach((m,i)=>playNote(m2f(m),t0+i*0.09,0.22,"square",0.16));
    // bass chord
    [36,43].forEach(m=>playNote(m2f(m),t0,0.7,"triangle",0.18));
    playNote(m2f(84),t0+0.5,0.5,"square",0.12);
  } else if(type==="fail"){
    const seq=[74,72,69,65];
    seq.forEach((m,i)=>playNote(m2f(m),t0+i*0.12,0.3,"triangle",0.16));
  } else if(type==="craft"){
    [72,76,79].forEach((m,i)=>playNote(m2f(m),t0+i*0.05,0.12,"square",0.12));
  } else if(type==="click"){
    playNote(m2f(76),t0,0.06,"square",0.08);
  } else if(type==="place"){
    playNote(m2f(48),t0,0.1,"sine",0.2); noiseBurst(t0,0.05,0.08,"lowpass");
  } else if(type==="berry"){
    playNote(m2f(84),t0,0.05,"square",0.06);
  }
}

return { start, stop, setMuted, isMuted, toggleMute, stinger,
  get started(){return started;}, get current(){return curTrackName;} };
})();
