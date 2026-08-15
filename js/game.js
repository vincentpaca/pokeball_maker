/* ============================================================
   GAME — main logic
   ============================================================ */
const Game=(function(){
const SAVE_KEY="pokeball_workshop_save_v1";

/* ---------- state ---------- */
let state=null;
let currentScreen="title";
let curBiome=0;
let curLocation=null;       // generated location for map view
let cauldron=[];            // array of berry ids (max 5)
let selPlaceBall=null;      // ball id selected for placing
let rafId=null;
let lastTick=0;
let captureSeq=null;        // capture animation state
let forageCdEnd=0;

const $=id=>document.getElementById(id);

/* ---------- save / load ---------- */
function defaultState(){
  const berries={};
  GAME.BERRIES.forEach(b=>berries[b.id]= b.rare?1:8);
  // generous starting stock
  berries.oran=12; berries.sitrus=12; berries.pecha=10; berries.leppa=10; berries.razz=8;
  berries.chesto=8; berries.rawst=8; berries.pinap=8;
  return {
    berries,
    balls:[],          // [{key, name, pal, stats, type, count}]
    dex:{},            // {pokeId: {count, firstAt}}
    expeditions:[],    // [{id, biomeId, seed, time, weather, name, ballKey, pal, start, duration, resolved, result}]
    day:1,
    totalCaptures:0,
    totalAttempts:0,
    forageCdEnd:0,
    nextBallKey:1,
    nextExpId:1,
  };
}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){}}
function load(){try{const s=localStorage.getItem(SAVE_KEY);if(!s)return null;return JSON.parse(s);}catch(e){return null;}}
function hasSave(){return !!localStorage.getItem(SAVE_KEY);}

/* ---------- helpers ---------- */
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function pick(weights,r){let tot=0;for(const k in weights)tot+=weights[k];let x=(r()*tot);for(const k in weights){x-=weights[k];if(x<=0)return k;}return Object.keys(weights)[0];}
function berryObj(id){return GAME.BERRIES.find(b=>b.id===id);}
function ballByKey(key){return state.balls.find(b=>b.key===key);}

/* ---------- ball crafting ---------- */
const FLAVOR_KEYS=["sweet","spicy","dry","bitter","sour"];
function computeStats(berryIds){
  const sum={sweet:0,spicy:0,dry:0,bitter:0,sour:0};
  let typeTally={};
  berryIds.forEach(id=>{const b=berryObj(id);if(!b)return;for(const f in b.flavors)sum[f]+=b.flavors[f];typeTally[b.type]=(typeTally[b.type]||0)+1;});
  const catchRate=clamp(Math.round(28+sum.sweet*6),0,95);
  const lure=clamp(Math.round(sum.spicy*8),0,100);
  const biases={
    rare:clamp(Math.round(sum.sweet*0.6+8),0,100),
    legendary:clamp(Math.round(sum.dry*7),0,100),
    mythical:clamp(Math.round(sum.bitter*7),0,100),
    ub:clamp(Math.round(sum.sour*7),0,100),
  };
  // type affinity = most common berry type
  let topType="normal",topN=0;for(const t in typeTally){if(typeTally[t]>topN){topN=typeTally[t];topType=t;}}
  // palette: average berry colors weighted by flavor sum
  const cols=berryIds.map(id=>{const b=berryObj(id);const w=Object.values(b.flavors).reduce((a,c)=>a+c,0);return{c:b.c,w};});
  let r=0,g=0,b=0,tw=0;cols.forEach(o=>{const rgb=ART.hexToRgb(o.c);r+=rgb[0]*o.w;g+=rgb[1]*o.w;b+=rgb[2]*o.w;tw+=o.w;});
  if(tw===0){r=232;g=72;b=59;}
  const topCol=ART.rgbStr(r/tw,g/tw,b/tw);
  const accent=GAME.TYPES[topType]?GAME.TYPES[topType].c:"#fff";
  // name by dominant bias
  const biasEntries=[["ub",biases.ub],["mythical",biases.mythical],["legendary",biases.legendary],["rare",biases.rare]];
  biasEntries.sort((a,b)=>b[1]-a[1]);
  const nameMap={ub:"Beast",mythical:"Mythic",legendary:"Legend",rare:"Net"};
  // lure-dominant special
  let name;
  if(sum.spicy>=8 && sum.spicy>sum.dry && sum.spicy>sum.bitter && sum.spicy>sum.sour) name="Lure";
  else name=nameMap[biasEntries[0][0]];
  return {stats:{catchRate,lure,biases},type:topType,pal:{top:topCol,bot:"#f4f4f4",accent},name};
}
function craftBall(){
  if(cauldron.length===0){modal("Add at least one berry to the cauldron.");return;}
  const st=computeStats(cauldron);
  // stack with identical existing ball (same stats+type+pal)
  const sig=JSON.stringify(st);
  let existing=state.balls.find(b=>b.sig===sig);
  if(existing){existing.count++;}
  else{
    const ball={key:state.nextBallKey++,sig,name:st.name,pal:st.pal,stats:st.stats,type:st.type,count:1};
    state.balls.push(ball);
  }
  // consume berries
  cauldron.forEach(id=>{state.berries[id]=Math.max(0,(state.berries[id]||0)-1);});
  cauldron=[];
  Music.stinger("craft");
  save();renderWorkbench();renderTopbar();
  flashTip("Forged a "+st.name+" Ball!");
}

/* ---------- forage ---------- */
function forage(){
  if(Date.now()<state.forageCdEnd)return;
  const common=GAME.BERRIES.filter(b=>!b.rare);
  const r=ART.rng(Date.now()&0xffffff);
  const n=3+Math.floor(r()*3);
  const gained={};
  for(let i=0;i<n;i++){const b=common[Math.floor(r()*common.length)];state.berries[b.id]=(state.berries[b.id]||0)+1;gained[b.id]=(gained[b.id]||0)+1;}
  state.forageCdEnd=Date.now()+60000;
  save();renderWorkbench();renderTopbar();
  const lines=Object.keys(gained).map(id=>`+${gained[id]} ${berryObj(id).name}`);
  flashTip("Foraged: "+lines.join(", "));
}

/* ---------- map / locations ---------- */
function genLocation(biomeId,seed){
  const r=ART.rng(seed);
  const biome=GAME.BIOMES.find(b=>b.id===biomeId);
  const time=ART.TIMES[Math.floor(r()*ART.TIMES.length)];
  // weather themed to biome
  const wp={forest:["clear","rain","fog"],mountain:["clear","fog","rain"],cave:["fog","clear"],
    ocean:["clear","rain","fog"],volcano:["clear","sparks"],sky:["clear","fog","aurora"],
    distortion:["glitch","fog","clear"],tundra:["snow","snow","clear","aurora"],desert:["sandstorm","clear","clear"],powerplant:["sparks","clear","fog"]};
  const weather=wp[biomeId][Math.floor(r()*wp[biomeId].length)];
  const adj=GAME.LOC_ADJ[Math.floor(r()*GAME.LOC_ADJ.length)];
  const noun=GAME.LOC_NOUN[Math.floor(r()*GAME.LOC_NOUN.length)];
  return {biomeId,seed,time:time.id,timeLabel:time.label,weather,name:adj+" "+noun,ballPal:null};
}
function selectBiome(idx){
  curBiome=idx;
  const biome=GAME.BIOMES[idx];
  curLocation=genLocation(biome.id, (Date.now()&0xffff)+idx*97);
  renderMap();
}
function wander(){
  if(!curLocation)return;
  curLocation=genLocation(GAME.BIOMES[curBiome].id, Math.floor(Math.random()*1e9));
  renderMap();
}
function choosePlaceBall(key){
  selPlaceBall=key;renderMap();
}
function leaveBall(){
  if(!selPlaceBall||!curLocation){modal("Pick a Pokéball first.");return;}
  if(state.expeditions.length>=6){modal("You can only run 6 expeditions at once. Check on one first.");return;}
  const ball=ballByKey(selPlaceBall);
  if(!ball||ball.count<=0){modal("That ball is unavailable.");return;}
  // consume one ball
  ball.count--;if(ball.count<=0)state.balls=state.balls.filter(b=>b.key!==ball.key);
  // duration: base 18s, lure reduces
  const dur=Math.round(clamp(18 - ball.stats.lure*0.08,8,18))*1000;
  const loc={...curLocation,ballPal:ball.pal};
  const exp={
    id:state.nextExpId++,biomeId:loc.biomeId,seed:loc.seed,time:loc.time,weather:loc.weather,
    name:loc.name,ballKey:ball.key,ballName:ball.name,pal:ball.pal,stats:ball.stats,type:ball.type,
    start:Date.now(),duration:dur,resolved:false,result:null
  };
  state.expeditions.push(exp);
  selPlaceBall=null;
  Music.stinger("place");
  save();renderMap();renderTopbar();
  flashTip("Ball left at "+loc.name+"!");
}

/* ---------- expedition resolution ---------- */
function resolveExpedition(exp){
  state.totalAttempts++;
  const r=ART.rng(exp.seed+Date.now());
  const biome=GAME.BIOMES.find(b=>b.id===exp.biomeId);
  // tier weights: biome + ball biases + lure push
  const w={};
  for(const t in biome.tierWeights){
    w[t]=biome.tierWeights[t];
  }
  w.legendary+=exp.stats.biases.legendary*0.8;
  w.mythical+=exp.stats.biases.mythical*0.8;
  w.ub+=exp.stats.biases.ub*0.8;
  w.rare+=exp.stats.biases.rare*0.4;
  // lure pushes toward higher tiers
  const lurePush=exp.stats.lure*0.25;
  w.legendary+=lurePush*0.4;w.mythical+=lurePush*0.35;w.ub+=lurePush*0.25;
  const tier=pick(w,r);
  // pokemon from biome pool of that tier
  const pool=GAME.biomePool[exp.biomeId];
  const tierPool={};
  for(const pid in pool){const p=GAME.pokeById[pid];if(p&&p.tier===tier)tierPool[pid]=pool[pid];}
  let pokeId;
  if(Object.keys(tierPool).length===0){
    // fallback: any pokemon of that tier
    const all=GAME.POKEMON.filter(p=>p.tier===tier);
    pokeId=all[Math.floor(r()*all.length)].id;
  } else {
    pokeId=pick(tierPool,r);
  }
  const poke=GAME.pokeById[pokeId];
  // catch chance
  const difficulty=GAME.TIERS[tier].difficulty;
  const tierBias=exp.stats.biases[tier]||0;
  const typeBonus=poke.types.includes(exp.type)?12:0;
  const roll=exp.stats.catchRate + tierBias*1.5 + typeBonus + exp.stats.lure*0.15;
  const chance=clamp(0.08,0.97,0.5+(roll-difficulty)/80);
  const success=r()<chance;
  if(success){
    state.totalCaptures++;
    state.dex[pokeId]=(state.dex[pokeId]||{count:0,firstAt:Date.now()});
    state.dex[pokeId].count++;
    // berry yield
    const yieldBerries=berryYield(poke,r);
    yieldBerries.forEach(o=>{state.berries[o.id]=(state.berries[o.id]||0)+o.count;});
    exp.result={success:true,pokeId,yield:yieldBerries};
    state.day=1+Math.floor(state.totalCaptures/3);
  } else {
    // consolation: 1 berry
    const common=GAME.BERRIES.filter(b=>!b.rare);
    const cb=common[Math.floor(r()*common.length)];
    state.berries[cb.id]=(state.berries[cb.id]||0)+1;
    exp.result={success:false,pokeId,consolation:cb.id};
  }
  exp.resolved=true;
  save();renderTopbar();
}
function berryYield(poke,r){
  const r2=r||ART.rng(poke.seed*7+Date.now());
  const mult=GAME.TIERS[poke.tier].rewardMult;
  const out={};
  // berries matching types
  const matching=GAME.BERRIES.filter(b=>poke.types.includes(b.type));
  const source=matching.length?matching:GAME.BERRIES.filter(b=>!b.rare);
  const count=mult+1; // base count
  for(let i=0;i<count;i++){
    const b=source[Math.floor(r2()*source.length)];
    out[b.id]=(out[b.id]||0)+1;
  }
  // chance of a rare berry for high tiers
  if((poke.tier==="mythical"||poke.tier==="ub"||poke.tier==="legendary") && r2()<0.5){
    const rares=GAME.BERRIES.filter(b=>b.rare);
    const rb=rares[Math.floor(r2()*rares.length)];
    out[rb.id]=(out[rb.id]||0)+1;
  }
  return Object.keys(out).map(id=>({id,count:out[id]}));
}
function checkExpedition(id){
  const exp=state.expeditions.find(e=>e.id===id);
  if(!exp)return;
  if(!exp.resolved){modal("This expedition is still in progress.");return;}
  // launch capture animation
  startCapture(exp);
}

/* ---------- capture animation ---------- */
function startCapture(exp){
  const ov=$("capture-overlay");ov.classList.remove("hidden");
  captureSeq={exp,phase:"approach",t0:performance.now(),last:performance.now()};
}
function updateCapture(now){
  if(!captureSeq)return;
  const cv=$("capture-canvas");const ctx=cv.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  const W=cv.width,H=cv.height;
  const exp=captureSeq.exp;
  const loc={biomeId:exp.biomeId,seed:exp.seed,time:exp.time,weather:exp.weather,name:exp.name,ballPal:exp.pal};
  const elapsed=now-captureSeq.t0;
  // phases: approach(0-800) -> shake(800-2200) -> flash(2200-2600) -> reveal(2600+)
  let phase=captureSeq.phase;
  if(elapsed<800)phase="approach";
  else if(elapsed<2400)phase="shake";
  else if(elapsed<2800)phase="flash";
  else phase="reveal";
  if(phase==="reveal" && !captureSeq.stinger){captureSeq.stinger=true;Music.stinger(exp.result&&exp.result.success?"win":"fail");}
  captureSeq.phase=phase;

  let ballState="waiting";
  if(phase==="approach")ballState="waiting";
  else if(phase==="shake")ballState="shaking";
  else if(phase==="flash")ballState="flash";
  else ballState="reveal";

  // draw scene
  ART.drawScene(ctx,loc,now, phase==="approach"?"waiting":(phase==="shake"?"shaking":"placed"));
  // flash
  if(phase==="flash"){
    ctx.fillStyle="rgba(255,255,255,"+clamp((2800-elapsed)/400,0,1)+")";
    ctx.fillRect(0,0,W,H);
  }
  if(phase==="reveal"){
    // dark overlay
    ctx.fillStyle="rgba(10,12,24,0.6)";ctx.fillRect(0,0,W,H);
    const poke=GAME.pokeById[exp.result.pokeId];
    const bob=Math.sin(now/400)*4;
    // platform
    ctx.fillStyle="rgba(0,0,0,0.4)";ctx.beginPath();ctx.ellipse(W/2,H*0.86,70,10,0,0,Math.PI*2);ctx.fill();
    ART.drawPokemon(ctx,poke,W/2,H*0.84+bob,150);
    // text
    ctx.fillStyle="#fff";ctx.font='10px "Press Start 2P", monospace';ctx.textAlign="center";
    if(exp.result.success){
      ctx.fillStyle=GAME.TIERS[poke.tier].color;
      ctx.fillText("Caught!",W/2,28);
      ctx.fillStyle="#fff";ctx.font='12px "Press Start 2P", monospace';
      ctx.fillText(poke.name,W/2,H-44);
      ctx.font='8px "Press Start 2P", monospace';ctx.fillStyle="#ffcd75";
      ctx.fillText(GAME.TIERS[poke.tier].label.toUpperCase(),W/2,H-30);
      ctx.fillStyle="#9ad06a";ctx.font='7px "Press Start 2P", monospace';
      const ystr=exp.result.yield.map(o=>`+${o.count} ${berryObj(o.id).name}`).join("  ");
      ctx.fillText("Berries: "+ystr,W/2,H-16);
      ctx.fillStyle="#a7b0c7";
      if(Math.floor(now/500)%2===0)ctx.fillText("Tap to continue",W/2,H-4);
    } else {
      ctx.fillStyle="#b13e53";ctx.font='12px "Press Start 2P", monospace';
      ctx.fillText("It broke free!",W/2,30);
      ctx.fillStyle="#fff";ctx.font='9px "Press Start 2P", monospace';
      ctx.fillText(poke.name+" escaped",W/2,H-44);
      ctx.fillStyle="#ffcd75";ctx.font='7px "Press Start 2P", monospace';
      ctx.fillText("Found 1 "+berryObj(exp.result.consolation).name+" Berry",W/2,H-28);
      ctx.fillStyle="#a7b0c7";
      ctx.fillText("Tap to continue",W/2,H-12);
    }
    ctx.textAlign="left";
  }
}
function endCapture(){
  if(!captureSeq)return;
  const exp=captureSeq.exp;
  // remove expedition
  state.expeditions=state.expeditions.filter(e=>e.id!==exp.id);
  $("capture-overlay").classList.add("hidden");
  captureSeq=null;
  save();renderMap();renderPokedex();renderTopbar();
  if(exp.result && exp.result.success){
    const poke=GAME.pokeById[exp.result.pokeId];
    modal(`You caught ${poke.name}!\n${GAME.TIERS[poke.tier].label} • ${poke.types.map(t=>t).join("/")}\n\nBerries gained:\n`+exp.result.yield.map(o=>`+${o.count} ${berryObj(o.id).name}`).join("\n"));
  }
}

/* ---------- rendering: topbar ---------- */
function renderTopbar(){
  const berryCount=Object.values(state.berries).reduce((a,c)=>a+c,0);
  const ballCount=state.balls.reduce((a,b)=>a+b.count,0);
  const dexCount=Object.keys(state.dex).length;
  $("tb-berries").querySelector("[data-val]").textContent=berryCount;
  $("tb-balls").querySelector("[data-val]").textContent=ballCount;
  $("tb-dex").querySelector("[data-val]").textContent=dexCount;
  $("tb-day").querySelector("[data-val]").textContent=state.day;
}

/* ---------- rendering: workbench ---------- */
function renderWorkbench(){
  // berry list
  const list=$("berry-list");list.innerHTML="";
  GAME.BERRIES.forEach(b=>{
    const count=state.berries[b.id]||0;
    const el=document.createElement("div");
    el.className="berry-item"+(cauldron.includes(b.id)?" selected":"");
    el.innerHTML=`<canvas class="b-ic" width="14" height="14"></canvas><span class="b-name">${b.name}</span><span class="b-count">×${count}</span>`;
    if(count<=0)el.classList.add("disabled"),el.style.opacity=0.4;
    list.appendChild(el);
    ART.drawBerry(el.querySelector("canvas").getContext("2d"),b,0,0,1);
    el.onclick=()=>{
      if(count<=0){return;}
      // toggle into cauldron (max 5)
      const idx=cauldron.indexOf(b.id);
      if(idx>=0)cauldron.splice(idx,1);
      else if(cauldron.length>=5){flashTip("Cauldron is full (5 max).");return;}
      else cauldron.push(b.id);
      Music.stinger("berry");
      renderWorkbench();
    };
  });
  // cauldron slots
  const slots=$("cauldron-slots");slots.innerHTML="";
  for(let i=0;i<5;i++){
    const s=document.createElement("div");s.className="cslot"+(cauldron[i]?" filled":"");
    if(cauldron[i]){const b=berryObj(cauldron[i]);const cv=document.createElement("canvas");cv.width=14;cv.height=14;s.appendChild(cv);ART.drawBerry(cv.getContext("2d"),b,0,0,1);s.title=b.name;s.onclick=()=>{cauldron.splice(i,1);renderWorkbench();};}
    slots.appendChild(s);
  }
  $("slot-count").textContent=cauldron.length+"/5";
  // preview + stats
  const pctx=$("ball-preview").getContext("2d");pctx.imageSmoothingEnabled=false;
  pctx.clearRect(0,0,120,120);
  const tip=$("wb-tip");
  renderBallInventory();
  if(cauldron.length===0){
    tip.textContent="Add berries to see ball stats.";
    ["st-catch","st-lure","st-rare","st-myth","st-ub"].forEach(id=>$(id).style.width="0%");
    return;
  }
  const st=computeStats(cauldron);
  ART.drawPokeball(pctx,st.pal,10,10,100, st.stats.lure>40?"#ffe060":null);
  $("st-catch").style.width=st.stats.catchRate+"%";
  $("st-lure").style.width=st.stats.lure+"%";
  $("st-rare").style.width=st.stats.biases.rare+"%";
  $("st-myth").style.width=st.stats.biases.mythical+"%";
  $("st-ub").style.width=st.stats.biases.ub+"%";
  // also show legendary bar in 'rare' slot? we have 5 bars: catch,lure,rare,myth,ub. Show legend in tip.
  tip.innerHTML=`<b style="color:#ffcd75">${st.name} Ball</b> • ${st.type}-type lure<br>Legend bias ${st.stats.biases.legendary}`;
}
function renderBallInventory(){
  const inv=$("ball-inventory");inv.innerHTML="";
  if(state.balls.length===0){inv.innerHTML='<p class="ball-empty">No balls crafted yet.<br>Blend berries →</p>';return;}
  state.balls.forEach(ball=>{
    const el=document.createElement("div");el.className="ball-card";
    el.innerHTML=`<canvas width="34" height="34"></canvas><div class="bc-stats">
      <b>${ball.name} Ball</b><br>
      Catch <b>${ball.stats.catchRate}</b> · Lure <b>${ball.stats.lure}</b><br>
      Leg ${ball.stats.biases.legendary} · Myth ${ball.stats.biases.mythical} · UB ${ball.stats.biases.ub}<br>
      <span class="bc-count">×${ball.count}</span></div>`;
    inv.appendChild(el);
    ART.drawPokeball(el.querySelector("canvas").getContext("2d"),ball.pal,0,0,34, ball.stats.lure>40?"#ffe060":null);
  });
}

/* ---------- rendering: map ---------- */
function renderMap(){
  // biome chips
  const chips=$("biome-chips");chips.innerHTML="";
  GAME.BIOMES.forEach((b,i)=>{
    const c=document.createElement("button");c.className="chip"+(i===curBiome?" active":"");c.textContent=b.name;
    c.onclick=()=>selectBiome(i);chips.appendChild(c);
  });
  // location info
  if(!curLocation)selectBiome(curBiome);
  const loc=curLocation;
  const biome=GAME.BIOMES.find(b=>b.id===loc.biomeId);
  $("loc-name").textContent=loc.name;
  $("loc-desc").textContent=biome.desc;
  const tags=$("loc-tags");tags.innerHTML="";
  const tagArr=[biome.name,loc.timeLabel,loc.weather];
  // tier flavor
  const tw=biome.tierWeights;
  const topTier=Object.keys(tw).reduce((a,k)=>tw[k]>tw[a]?k:a,"rare");
  tagArr.push("Best: "+GAME.TIERS[topTier].label);
  tagArr.forEach(t=>{const e=document.createElement("span");e.className="loc-tag";e.textContent=t;tags.appendChild(e);});
  // wander button (append to tags)
  const wbtn=document.createElement("button");wbtn.className="pk-btn small";wbtn.textContent="Wander";wbtn.onclick=wander;tags.appendChild(wbtn);

  // place panel
  const pp=$("place-panel");
  if(selPlaceBall){
    pp.classList.remove("hidden");
    const pb=$("place-balls");pb.innerHTML="";
    state.balls.forEach(ball=>{
      const el=document.createElement("div");el.className="pball"+(ball.key===selPlaceBall?" sel":"");
      el.innerHTML=`<canvas width="26" height="26"></canvas><span>×${ball.count}</span>`;
      pb.appendChild(el);
      ART.drawPokeball(el.querySelector("canvas").getContext("2d"),ball.pal,0,0,26);
      el.onclick=()=>choosePlaceBall(ball.key);
    });
  } else {
    pp.classList.remove("hidden");
    const pb=$("place-balls");pb.innerHTML="";
    if(state.balls.length===0){pb.innerHTML='<p class="empty" style="grid-column:1/-1">Craft a ball at the Bench first.</p>';}
    else state.balls.forEach(ball=>{
      const el=document.createElement("div");el.className="pball";
      el.innerHTML=`<canvas width="26" height="26"></canvas><span>×${ball.count}</span>`;
      pb.appendChild(el);
      ART.drawPokeball(el.querySelector("canvas").getContext("2d"),ball.pal,0,0,26);
      el.onclick=()=>choosePlaceBall(ball.key);
    });
  }
  $("btn-leave").onclick=leaveBall;
  $("btn-cancel-place").onclick=()=>{selPlaceBall=null;renderMap();};

  // expeditions list
  renderExpeditions();
}
function renderExpeditions(){
  const el=$("exp-list");
  if(state.expeditions.length===0){el.innerHTML='<p class="empty">No balls placed. Leave one in the wild!</p>';return;}
  el.innerHTML="";
  state.expeditions.forEach(exp=>{
    const prog=clamp((Date.now()-exp.start)/exp.duration,0,1);
    const done=exp.resolved;
    const card=document.createElement("div");card.className="exp-card"+(done?" done":"");
    const biome=GAME.BIOMES.find(b=>b.id===exp.biomeId);
    const mini=document.createElement("canvas");mini.className="ec-mini";mini.width=34;mini.height=34;
    const mctx=mini.getContext("2d");
    mctx.fillStyle=biome.palette[2];mctx.fillRect(0,0,34,34);
    ART.drawPokeball(mctx,exp.pal,2,2,30);
    card.appendChild(mini);
    const info=document.createElement("div");info.className="ec-info";
    info.innerHTML=`<b>${exp.name}</b><br>${biome.name} · ${exp.ballName} Ball<br>${done?"Ready to check!":Math.ceil((exp.duration-(Date.now()-exp.start))/1000)+"s left"}`;
    const bar=document.createElement("div");bar.className="exp-bar";const i=document.createElement("i");i.style.width=(prog*100)+"%";bar.appendChild(i);
    info.appendChild(bar);
    const btn=document.createElement("button");btn.className="pk-btn ec-btn";btn.textContent=done?"Check!":"Waiting...";btn.disabled=!done;btn.onclick=()=>checkExpedition(exp.id);
    info.appendChild(btn);
    card.appendChild(info);
    el.appendChild(card);
  });
}

/* ---------- rendering: pokedex ---------- */
let dexFilter="all";
function renderPokedex(){
  const total=GAME.POKEMON.length;
  const caught=Object.keys(state.dex).length;
  $("dex-sub").textContent=`${caught} / ${total} discovered`;
  const filters=$("dex-filters");filters.innerHTML="";
  const fset=[["all","All"],["rare","Rare"],["legendary","Legendary"],["mythical","Mythical"],["ub","Ultra Beast"]];
  fset.forEach(f=>{const b=document.createElement("button");b.className="chip"+(dexFilter===f[0]?" active":"");b.textContent=f[1];b.onclick=()=>{dexFilter=f[0];renderPokedex();};filters.appendChild(b);});
  const grid=$("dex-grid");grid.innerHTML="";
  GAME.POKEMON.filter(p=>dexFilter==="all"||p.tier===dexFilter).forEach(p=>{
    const has=!!state.dex[p.id];
    const card=document.createElement("div");card.className="dex-card"+(has?"":" locked");
    const cv=document.createElement("canvas");cv.className="dc-sprite";cv.width=96;cv.height=96;
    const ctx=cv.getContext("2d");ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,96,96);
    if(has)ART.drawPokemon(ctx,p,48,90,84);
    else {ctx.fillStyle="#1a1c2c";ctx.fillRect(0,0,96,96);ctx.fillStyle="#3a3a4a";ctx.font='40px "Press Start 2P", monospace';ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("?",48,50);ctx.textAlign="left";ctx.textBaseline="alphabetic";}
    card.appendChild(cv);
    // scale via CSS
    const name=document.createElement("div");name.className="dc-name";name.textContent=has?p.name:"???";card.appendChild(name);
    const tier=document.createElement("div");tier.className="dc-tier t-"+p.tier;tier.textContent=GAME.TIERS[p.tier].label;card.appendChild(tier);
    const types=document.createElement("div");types.className="dc-types";
    p.types.forEach(t=>{const s=document.createElement("span");s.textContent=t;s.style.color=GAME.TYPES[t].c;types.appendChild(s);});
    card.appendChild(types);
    if(has){
      const y=document.createElement("div");y.className="dc-yield";
      const yld=berryYield(p,ART.rng(p.seed*5));
      y.textContent="Berries: "+yld.map(o=>o.id).map(id=>berryObj(id).name).slice(0,3).join(", ");
      card.appendChild(y);
    }
    grid.appendChild(card);
  });
}

/* ---------- modals / tips ---------- */
function modal(text){
  $("modal-content").textContent=text;
  $("modal-overlay").classList.remove("hidden");
}
let tipTimer=null;
function flashTip(text){
  const tip=$("wb-tip");if(tip){tip.innerHTML=`<b style="color:#9ad06a">${text}</b>`;}
  clearTimeout(tipTimer);tipTimer=setTimeout(()=>{if(currentScreen==="workbench")renderWorkbench();},2200);
}

/* ---------- screen nav ---------- */
function showScreen(name){
  currentScreen=name;
  ["title","workbench","map","pokedex"].forEach(s=>$(s+"-screen").classList.toggle("hidden",s!==name));
  $("topbar").classList.toggle("hidden",name==="title");
  $("navbar").classList.toggle("hidden",name==="title");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.screen===name));
  if(name==="workbench"){renderWorkbench();Music.start("workbench");}
  if(name==="map"){renderMap();Music.start("map");}
  if(name==="pokedex"){renderPokedex();Music.start("pokedex");}
}

/* ---------- main loop ---------- */
function loop(now){
  // resolve finished expeditions server-side (auto)
  if(state){
    state.expeditions.forEach(exp=>{
      if(!exp.resolved && Date.now()-exp.start>=exp.duration){resolveExpedition(exp);}
    });
    // update forage cd
    const cd=$("forage-cd");if(cd){const left=Math.ceil((state.forageCdEnd-Date.now())/1000);cd.textContent=left>0?`(${left}s)`:"";}
    // throttled DOM updates for expeditions
    if(currentScreen==="map" && now-lastTick>500){renderExpeditions();lastTick=now;}
  }
  // draw animated canvases
  if(currentScreen==="title"){ART.drawTitle($("title-canvas").getContext("2d"),now);}
  if(currentScreen==="map" && curLocation){
    const ctx=$("map-canvas").getContext("2d");ctx.imageSmoothingEnabled=false;
    ART.drawScene(ctx,curLocation,now,"placed");
  }
  if(captureSeq){
    updateCapture(now);
    // auto-end reveal after a while if success (let user tap)
  }
  rafId=requestAnimationFrame(loop);
}

/* ---------- init ---------- */
function newGame(){
  state=defaultState();save();
  curBiome=0;curLocation=null;cauldron=[];selPlaceBall=null;
  ART.preloadSprites(GAME.POKEMON.map(p=>p.dex));
  Music.start("workbench");
  showScreen("workbench");renderTopbar();
  modal("Welcome, Trainer!\n\nYou run a Pokéball Workshop.\n\n1) BENCH — blend berries to craft balls.\n2) MAP — pick a biome, leave a ball in the wild.\n3) Wait for the expedition, then CHECK it to see what you caught!\n\nLegendary, Mythical & Ultra Beasts await.");
}
function continueGame(){
  const s=load();if(!s){newGame();return;}
  state=s;renderTopbar();
  ART.preloadSprites(GAME.POKEMON.map(p=>p.dex));
  Music.start("workbench");
  showScreen("workbench");
}
function init(){
  // sprite load -> re-render pokedex (debounced)
  let dexTimer=null;
  ART.onSpriteLoad=()=>{ if(currentScreen!=="pokedex")return; clearTimeout(dexTimer); dexTimer=setTimeout(renderPokedex,60); };
  // mute button
  $("btn-mute").onclick=()=>{ const m=Music.toggleMute(); $("mute-label").textContent=m?"OFF":"ON"; };
  // title buttons
  $("btn-new").onclick=()=>newGame();
  if(hasSave())$("btn-continue").classList.remove("hidden");
  $("btn-continue").onclick=()=>continueGame();
  // nav
  document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>showScreen(b.dataset.screen));
  // workbench buttons
  $("btn-craft").onclick=craftBall;
  $("btn-clear").onclick=()=>{cauldron=[];renderWorkbench();};
  $("btn-forage").onclick=forage;
  // modal
  $("modal-close").onclick=()=>$("modal-overlay").classList.add("hidden");
  $("modal-overlay").onclick=(e)=>{if(e.target.id==="modal-overlay")$("modal-overlay").classList.add("hidden");};
  // capture overlay: tap to close after reveal
  $("capture-overlay").onclick=()=>{
    if(captureSeq && captureSeq.phase==="reveal"){endCapture();}
  };
  // keyboard
  window.addEventListener("keydown",e=>{
    if(e.key==="Escape"){
      if(captureSeq && captureSeq.phase==="reveal")endCapture();
      else $("modal-overlay").classList.add("hidden");
    }
  });
  rafId=requestAnimationFrame(loop);
}

document.addEventListener("DOMContentLoaded",init);
return {init};
})();
