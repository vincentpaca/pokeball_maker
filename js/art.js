/* ============================================================
   ART — procedural 16-bit style pixel rendering
   ============================================================ */
const ART = (function(){
/* seeded RNG */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function rng(seed){return mulberry32(seed>>>0);}

/* ---------- color helpers ---------- */
function hexToRgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255];}
function rgbStr(r,g,b,a){return a===undefined?`rgb(${r|0},${g|0},${b|0})`:`rgba(${r|0},${g|0},${b|0},${a})`;}
function mix(c1,c2,t){const a=hexToRgb(c1),b=hexToRgb(c2);return rgbStr(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t);}
function darken(hex,t){const r=hexToRgb(hex);return rgbStr(r[0]*(1-t),r[1]*(1-t),r[2]*(1-t));}
function lighten(hex,t){const r=hexToRgb(hex);return rgbStr(r[0]+(255-r[0])*t,r[1]+(255-r[1])*t,r[2]+(255-r[2])*t);}

/* pixel helper: draw a grid sprite from a 2D array of color keys onto ctx at x,y,scale */
function drawGrid(ctx,grid,palette,x,y,scale){
  for(let r=0;r<grid.length;r++){
    const row=grid[r];
    for(let c=0;c<row.length;c++){
      const k=row[c];
      if(!k)continue;
      const col=palette[k]||k;
      ctx.fillStyle=col;
      ctx.fillRect(x+c*scale,y+r*scale,scale,scale);
    }
  }
}

/* ============================================================
   BERRY sprite (16x16)
   ============================================================ */
const berryCache={};
function berrySprite(berry){
  const key=berry.id;
  if(berryCache[key])return berryCache[key];
  const r=rng(berry.id.charCodeAt(0)+berry.id.charCodeAt(1)*7+berry.id.length*131);
  const W=14,H=14,grid=Array.from({length:H},()=>Array(W).fill(0));
  const base=berry.c, dark=darken(base,0.45), light=lighten(base,0.5), stem="#5a3a1a", leaf="#3a8a3a";
  // body: an oval-ish blob
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const dx=(x-(W-1)/2)/((W-1)/2);
      const dy=(y-(H-1)/2)/((H-1)/2);
      const d=dx*dx+dy*dy*1.2;
      if(d<=1){
        let col='b';
        // highlight upper-left
        if(x<5&&y<5&&d<0.5)col='l';
        else if(d>0.8)col='d';
        grid[y][x]=col;
      }
    }
  }
  // little bumps
  for(let i=0;i<3;i++){
    const bx=3+Math.floor(r()*8), by=4+Math.floor(r()*6);
    if(grid[by]&&grid[by][bx]==='b')grid[by][bx]='d';
  }
  // stem
  grid[2][6]=stem;grid[1][6]=stem;grid[3][6]=stem;
  // leaf
  grid[1][7]=leaf;grid[1][8]=leaf;grid[0][8]=leaf;grid[2][7]=leaf;
  const pal={b:base,d:dark,l:light,s:stem,f:leaf};
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');
  drawGrid(ctx,grid,pal,0,0,1);
  berryCache[key]={canvas,grid,pal};
  return berryCache[key];
}
function drawBerry(ctx,berry,x,y,scale){
  const s=berrySprite(berry);
  drawGrid(ctx,s.grid,s.pal,x,y,scale);
}

/* ============================================================
   POKEBALL sprite — colored by berry palette + stats aura
   pal: {top, bot, accent}
   ============================================================ */
function drawPokeball(ctx, pal, x, y, size, glow){
  const s=size/16;
  const cx=x+size/2, cy=y+size/2, R=size*0.42;
  // glow
  if(glow){
    const g=ctx.createRadialGradient(cx,cy,R*0.5,cx,cy,R*1.6);
    g.addColorStop(0,glow);g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(x-size*0.3,y-size*0.3,size*1.6,size*1.6);
  }
  // top hemisphere
  ctx.fillStyle=pal.top;
  ctx.beginPath();ctx.arc(cx,cy,R,Math.PI,0);ctx.closePath();ctx.fill();
  // bottom hemisphere
  ctx.fillStyle=pal.bot;
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI);ctx.closePath();ctx.fill();
  // outline
  ctx.fillStyle='#101018';
  ctx.beginPath();ctx.arc(cx,cy,R+Math.max(1,s*0.5),0,Math.PI*2);ctx.fill();
  // redraw fill on top to keep outline as ring
  ctx.fillStyle=pal.top;ctx.beginPath();ctx.arc(cx,cy,R,Math.PI,0);ctx.closePath();ctx.fill();
  ctx.fillStyle=pal.bot;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI);ctx.closePath();ctx.fill();
  // band
  ctx.fillStyle='#101018';ctx.fillRect(cx-R,cy-s*1.1,R*2,s*2.2);
  // button
  const by=cy;
  ctx.fillStyle='#101018';ctx.beginPath();ctx.arc(cx,by,s*3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f4f4f4';ctx.beginPath();ctx.arc(cx,by,s*2.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=pal.accent||'#fff';ctx.beginPath();ctx.arc(cx,by,s*1.1,0,Math.PI*2);ctx.fill();
  // top highlight
  ctx.fillStyle='rgba(255,255,255,0.35)';
  ctx.beginPath();ctx.ellipse(cx-R*0.45,cy-R*0.55,R*0.28,R*0.16,-0.5,0,Math.PI*2);ctx.fill();
}
// simpler: render pokeball to a small offscreen canvas for inventory reuse
const ballCache={};
function pokeballCanvas(pal, glow){
  const key=pal.top+'|'+pal.bot+'|'+pal.accent+'|'+(glow||'');
  if(ballCache[key])return ballCache[key];
  const cv=document.createElement('canvas');cv.width=40;cv.height=40;
  drawPokeball(cv.getContext('2d'),pal,0,0,40,glow);
  ballCache[key]=cv;return cv;
}

/* ============================================================
   POKEMON sprite — procedural creature, 20x20, mirrored
   palette from types + seed
   ============================================================ */
const monCache={};
function pokemonSprite(poke){
  if(monCache[poke.id])return monCache[poke.id];
  const W=20,H=20;
  const r=rng(poke.seed*13+1);
  const types=poke.types;
  const c0=GAME.TYPES[types[0]].c, c1=GAME.TYPES[types[1]]?GAME.TYPES[types[1]].c:darken(c0,0.3);
  const pal={
    a:c0, b:lighten(c0,0.35), c:darken(c0,0.4),
    d:c1, e:darken(c1,0.4), f:lighten(c1,0.4),
    k:'#1a1020', w:'#ffffff', bl:'#1a1020', acc:'#ffcd75'
  };
  const grid=Array.from({length:H},()=>Array(W).fill(0));

  // body shape parameters
  const bodyType=Math.floor(r()*4); // 0 round, 1 tall, 2 wide, 3 blobby
  const cy=11+Math.floor(r()*3);
  const bw=5+Math.floor(r()*3); // half width
  const bh=4+Math.floor(r()*3); // half height

  function inBody(x,y){
    const dx=(x-9.5)/bw, dy=(y-cy)/bh;
    if(bodyType===0)return dx*dx+dy*dy<=1.05;
    if(bodyType===1)return dx*dx*1.3+dy*dy*0.7<=1.05;
    if(bodyType===2)return dx*dx*0.7+dy*dy*1.3<=1.05;
    // blobby: combine two circles
    const d1=((x-7)/bw)**2+((y-cy)/bh)**2;
    const d2=((x-12)/bw)**2+((y-cy+1)/bh)**2;
    return d1<=1.1||d2<=1.1;
  }

  // fill body (only left half, then mirror)
  for(let y=0;y<H;y++){
    for(let x=0;x<=9;x++){
      if(inBody(x,y)){
        let key='a';
        // shading by position
        if(y<cy-bh*0.4)key='b';
        else if(y>cy+bh*0.4)key='c';
        // belly patch of second color
        if(inBody(x,y) && x>5 && y>cy-1 && r()<0.6 && ((x-7)**2+(y-cy+1)**2)<(bw*0.7)**2)key='d';
        grid[y][x]=key;
        grid[y][19-x]=key; // mirror
      }
    }
  }
  // outline (find border pixels)
  for(let y=1;y<H-1;y++){
    for(let x=1;x<W-1;x++){
      if(grid[y][x]&&(!grid[y-1][x]||!grid[y+1][x]||!grid[y][x-1]||!grid[y][x+1])){
        // set as outline (overwrite) — but keep mirror symmetry
        if(x<=9){grid[y][x]='k';grid[y][19-x]='k';}
      }
    }
  }
  // eyes (symmetric)
  const ex=7, ey=cy-1;
  if(grid[ey]&&grid[ey][ex]&&grid[ey][ex]!=='k'){
    grid[ey][ex]='w';grid[ey][ex+1]='w';grid[ey+1][ex]='bl';grid[ey+1][ex+1]='bl';
    grid[ey][19-ex]='w';grid[ey][18-ex]='w';grid[ey+1][19-ex]='bl';grid[ey+1][18-ex]='bl';
  } else {
    // place eyes somewhere on body
    for(let yy=cy-2;yy<=cy;yy++){for(let xx=6;xx<=8;xx++){if(grid[yy]&&grid[yy][xx]&&grid[yy][xx]!=='k'){grid[yy][xx]='w';grid[yy][19-xx]='w';grid[yy+1][xx]='bl';grid[yy+1][19-xx]='bl';yy=cy+1;break;}}}
  }

  // type-specific features
  const has=type=>types.includes(type);
  function set(x,y,k){if(grid[y]&&x>=0&&x<W){grid[y][x]=k;}}
  // wings (flying)
  if(has('flying')||r()<0.25){
    for(let i=0;i<4;i++){set(2+i,cy-2+i,'d');set(3+i,cy-2+i,'e');set(17-i,cy-2+i,'d');set(16-i,cy-2+i,'e');}
  }
  // horns (dragon)
  if(has('dragon')||r()<0.2){
    set(7,cy-bh-1,'d');set(8,cy-bh-2,'d');set(12,cy-bh-1,'d');set(11,cy-bh-2,'d');
  }
  // flames (fire)
  if(has('fire')){
    set(9,cy-bh-1,'acc');set(9,cy-bh-2,'#ff8a40');set(10,cy-bh-1,'acc');set(10,cy-bh-2,'#ff8a40');
    set(8,cy-bh-1,'#ff5a3c');
  }
  // ice crystals (ice)
  if(has('ice')){
    set(5,cy-bh,'w');set(14,cy-bh,'w');set(9,cy-bh-2,'w');set(10,cy-bh-2,'w');
  }
  // electric sparks
  if(has('electric')){
    set(3,cy-3,'acc');set(4,cy-2,'acc');set(16,cy-3,'acc');set(15,cy-2,'acc');
  }
  // ears (fairy/normal)
  if(has('fairy')||has('normal')){
    set(6,cy-bh,'b');set(7,cy-bh-1,'b');set(13,cy-bh,'b');set(12,cy-bh-1,'b');
  }
  // ghost tail wisp
  if(has('ghost')){
    set(9,H-1,'d');set(10,H-1,'d');set(8,H-2,'d');set(11,H-2,'d');
  }
  // bug antennae
  if(has('bug')){
    set(7,cy-bh-1,'b');set(7,cy-bh-2,'b');set(12,cy-bh-1,'b');set(12,cy-bh-2,'b');
  }
  // steel spikes
  if(has('steel')||has('rock')){
    set(2,cy,'w');set(17,cy,'w');set(9,cy-bh-2,'w');
  }
  // ground feet
  if(has('ground')){
    set(6,H-2,'e');set(8,H-2,'e');set(11,H-2,'e');set(13,H-2,'e');set(6,H-1,'e');set(8,H-1,'e');set(11,H-1,'e');set(13,H-1,'e');
  }

  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  drawGrid(ctx,grid,pal,0,0,1);
  monCache[poke.id]={canvas,grid,pal};
  return monCache[poke.id];
}
/* ---- Real sprite loading (PokeAPI sprites CDN) ---- */
const SPRITE_BASE="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const spriteCache={};
let onSpriteLoadCb=null;
function loadSprite(dexId){
  if(!dexId){return {state:'fail',img:null};}
  if(spriteCache[dexId])return spriteCache[dexId];
  const entry={state:'loading',img:null};
  spriteCache[dexId]=entry;
  const urls=[
    `${SPRITE_BASE}/versions/generation-iii/firered-leafgreen/${dexId}.png`,
    `${SPRITE_BASE}/versions/generation-v/black-white/${dexId}.png`,
    `${SPRITE_BASE}/${dexId}.png`,
  ];
  let i=0;
  const tryNext=()=>{
    if(i>=urls.length){entry.state='fail';if(onSpriteLoadCb)onSpriteLoadCb(dexId);return;}
    const img=new Image();
    img.onload=()=>{entry.img=img;entry.state='ok';if(onSpriteLoadCb)onSpriteLoadCb(dexId);};
    img.onerror=()=>{i++;tryNext();};
    img.src=urls[i];
  };
  tryNext();
  return entry;
}
function preloadSprites(dexIds){dexIds.forEach(loadSprite);}

/* drawPokemon(ctx, poke, cx, by, box)
   cx = horizontal center, by = bottom anchor, box = target pixel height.
   Uses real sprite when available (pixelated), procedural fallback otherwise. */
function drawPokemon(ctx,poke,cx,by,box){
  box=box||20;
  const entry=loadSprite(poke.dex);
  if(entry.state==='ok' && entry.img && entry.img.complete && entry.img.naturalWidth){
    const img=entry.img;
    const iw=img.naturalWidth, ih=img.naturalHeight;
    const h=box, w=box*(iw/ih);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img, cx-w/2, by-h, w, h);
  } else {
    const s=pokemonSprite(poke);
    const sc=box/20;
    drawGrid(ctx,s.grid,s.pal, cx-box/2, by-box, sc);
  }
}

/* ============================================================
   BIOME SCENE — procedural location
   location: {biomeId, seed, time, weather, name}
   ============================================================ */
const TIMES=[
  {id:"dawn",label:"Dawn",skyShift:[20,-10,30]},
  {id:"day",label:"Day",skyShift:[0,0,0]},
  {id:"dusk",label:"Dusk",skyShift:[40,-20,-30]},
  {id:"night",label:"Night",skyShift:[-60,-60,-20]},
];
const WEATHERS=["clear","rain","snow","fog","aurora","sandstorm","sparks","glitch"];

function drawScene(ctx, loc, t, ballState){
  const W=ctx.canvas.width, H=ctx.canvas.height;
  const biome=GAME.BIOMES.find(b=>b.id===loc.biomeId);
  const pal=biome.palette;
  const r=rng(loc.seed);
  const time=TIMES.find(tm=>tm.id===loc.time)||TIMES[1];
  const weather=loc.weather;
  const ss=time.skyShift;

  // sky gradient
  function shift(hex,s){const c=hexToRgb(hex);return rgbStr(Math.max(0,Math.min(255,c[0]+s[0])),Math.max(0,Math.min(255,c[1]+s[1])),Math.max(0,Math.min(255,c[2]+s[2])));}
  const skyTop=shift(pal[0],ss), skyBot=shift(pal[1],ss);
  const grad=ctx.createLinearGradient(0,0,0,H*0.7);
  grad.addColorStop(0,skyTop);grad.addColorStop(1,skyBot);
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);

  // celestial body
  if(time.id==="night"){
    // stars
    ctx.fillStyle="#fff";
    const sr=rng(loc.seed^0xABCDEF);
    for(let i=0;i<40;i++){const sx=sr()*W, sy=sr()*H*0.6, tw=Math.sin(t/300+i)*0.5+0.5;ctx.globalAlpha=0.4+tw*0.6;ctx.fillRect(sx|0,sy|0,1,1);}
    ctx.globalAlpha=1;
    // moon
    ctx.fillStyle="#e8e8d0";ctx.beginPath();ctx.arc(W*0.8,H*0.18,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=skyTop;ctx.beginPath();ctx.arc(W*0.8+4,H*0.16,9,0,Math.PI*2);ctx.fill();
  } else {
    // sun
    const sunC=time.id==="dusk"?"#ff8a40":(time.id==="dawn"?"#ffd070":"#fff6c8");
    ctx.fillStyle=sunC;ctx.beginPath();ctx.arc(W*0.78,H*0.2,9,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=0.3;ctx.beginPath();ctx.arc(W*0.78,H*0.2,14,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }

  // background silhouette layer (mountains/trees/dunes)
  const groundY=Math.floor(H*0.62);
  ctx.fillStyle=darken(pal[2],0.25);
  ctx.beginPath();ctx.moveTo(0,groundY);
  const peaks=6;
  for(let i=0;i<=peaks;i++){
    const px=(i/peaks)*W;
    const ph=Math.floor((r()*0.5+0.2)*H*0.3);
    ctx.lineTo(px,groundY-ph);
  }
  ctx.lineTo(W,groundY);ctx.closePath();ctx.fill();

  // mid layer
  ctx.fillStyle=darken(pal[4],0.1);
  const midY=groundY+8;
  ctx.beginPath();ctx.moveTo(0,midY);
  for(let i=0;i<=peaks+2;i++){
    const px=(i/(peaks+2))*W;
    const ph=Math.floor((r()*0.4+0.1)*H*0.18);
    ctx.lineTo(px,midY-ph*0.6);
  }
  ctx.lineTo(W,midY);ctx.closePath();ctx.fill();

  // ground
  ctx.fillStyle=pal[2];ctx.fillRect(0,groundY+8,W,H-groundY-8);
  // ground texture stripes
  ctx.fillStyle=darken(pal[2],0.12);
  for(let y=groundY+12;y<H;y+=6){ctx.fillRect(0,y,W,2);}

  // water band if ocean
  if(biome.id==="ocean"){
    ctx.fillStyle=pal[5];ctx.fillRect(0,groundY,W,8);
    ctx.fillStyle=lighten(pal[5],0.3);
    for(let i=0;i<W;i+=6){const wy=groundY+2+Math.sin(t/200+i*0.3)*1.5;ctx.fillRect(i,wy,4,1);}
  }

  // place foreground features (seeded)
  const feats=biome.features;
  const nFeats=6;
  for(let i=0;i<nFeats;i++){
    const fx=Math.floor(((i+0.5)/nFeats)*W + (r()*30-15));
    const fy=groundY+10+Math.floor(r()*20);
    const feat=feats[Math.floor(r()*feats.length)];
    drawFeature(ctx,feat,fx,fy,pal,r,t);
  }

  // the "spot" — where ball sits (center-ish, in front)
  const spotX=W*0.5, spotY=groundY+22;
  // shadow
  ctx.fillStyle="rgba(0,0,0,0.25)";ctx.beginPath();ctx.ellipse(spotX,spotY+10,14,4,0,0,Math.PI*2);ctx.fill();

  // ball / state
  if(ballState){
    if(ballState==="placed"||ballState==="waiting"){
      // pokeball sitting, wobble
      const wob=Math.sin(t/400)*3;
      const pal2=loc.ballPal||{top:"#e8483b",bot:"#f4f4f4",accent:"#fff"};
      drawPokeball(ctx,pal2,spotX-14,spotY-14+wob*0.2,28);
      // sparkle waiting
      if(ballState==="waiting"){
        ctx.fillStyle="#fff";ctx.globalAlpha=0.5+Math.sin(t/200)*0.5;
        for(let i=0;i<3;i++){const a=t/300+i*2.1;ctx.fillRect(spotX+Math.cos(a)*18|0,spotY-14+Math.sin(a)*10|0,2,2);}
        ctx.globalAlpha=1;
      }
    } else if(ballState==="shaking"){
      const wob=Math.sin(t/120)*8;
      const pal2=loc.ballPal||{top:"#e8483b",bot:"#f4f4f4",accent:"#fff"};
      drawPokeball(ctx,pal2,spotX-14+wob*0.3,spotY-14,28);
    } else if(ballState==="caught"||ballState==="success"){
      // ball + flash handled separately; draw ball with glow
      const pal2=loc.ballPal||{top:"#e8483b",bot:"#f4f4f4",accent:"#fff"};
      drawPokeball(ctx,pal2,spotX-14,spotY-14,28,"#ffe060");
    }
  }

  // weather overlay
  drawWeather(ctx,weather,W,H,t,r);

  // vignette
  const vg=ctx.createRadialGradient(W/2,H/2,H*0.3,W/2,H/2,H*0.75);
  vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,0.35)");
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
}

function drawFeature(ctx,type,x,y,pal,r,t){
  const cx=x;
  switch(type){
    case "tree": case "snowtree":{
      ctx.fillStyle=darken(pal[4],0.2);ctx.fillRect(cx-2,y,4,y>0?6:6);
      ctx.fillStyle=type==="snowtree"?lighten(pal[4],0.3):pal[4];
      for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(cx,y-i*6-2);ctx.lineTo(cx-7-i,y+4-i*6);ctx.lineTo(cx+7+i,y+4-i*6);ctx.closePath();ctx.fill();}
      if(type==="snowtree"){ctx.fillStyle="#fff";ctx.fillRect(cx-3,y-18,6,2);}
      break;}
    case "bush": ctx.fillStyle=pal[4];ctx.beginPath();ctx.arc(cx,y,6,Math.PI,0);ctx.fill();ctx.fillRect(cx-6,y,12,4);break;
    case "flower": ctx.fillStyle=pal[3];ctx.fillRect(cx,y,1,4);ctx.fillRect(cx-1,y-1,3,3);break;
    case "log": ctx.fillStyle="#6a4a2a";ctx.fillRect(cx-6,y,12,4);ctx.fillStyle="#3a2a1a";ctx.fillRect(cx-6,y,2,4);break;
    case "rock": ctx.fillStyle=darken(pal[2],0.2);ctx.beginPath();ctx.moveTo(cx-6,y+5);ctx.lineTo(cx-3,y-3);ctx.lineTo(cx+3,y-4);ctx.lineTo(cx+7,y+5);ctx.closePath();ctx.fill();ctx.fillStyle=lighten(pal[2],0.2);ctx.fillRect(cx-2,y-2,3,2);break;
    case "crystal": ctx.fillStyle=lighten(pal[3],0.4);ctx.beginPath();ctx.moveTo(cx,y+8);ctx.lineTo(cx-3,y-2);ctx.lineTo(cx,y-8);ctx.lineTo(cx+3,y-2);ctx.closePath();ctx.fill();ctx.fillStyle=pal[3];ctx.fillRect(cx-1,y-6,2,10);break;
    case "ledge": ctx.fillStyle=darken(pal[2],0.3);ctx.fillRect(cx-10,y,20,6);ctx.fillStyle=lighten(pal[2],0.15);ctx.fillRect(cx-10,y,20,2);break;
    case "grass": ctx.fillStyle=lighten(pal[2],0.3);for(let i=0;i<3;i++)ctx.fillRect(cx+i*3,y,1,4);break;
    case "stalactite": ctx.fillStyle=darken(pal[1],0.4);ctx.beginPath();ctx.moveTo(cx-3,0);ctx.lineTo(cx,8+Math.floor(r()*8));ctx.lineTo(cx+3,0);ctx.closePath();ctx.fill();break;
    case "puddle": ctx.fillStyle=lighten(pal[5],0.3);ctx.beginPath();ctx.ellipse(cx,y+4,7,2,0,0,Math.PI*2);ctx.fill();break;
    case "mushroom": ctx.fillStyle="#d04040";ctx.fillRect(cx-3,y,6,3);ctx.fillStyle="#f4f4f4";ctx.fillRect(cx-1,y+3,2,4);break;
    case "wave": ctx.fillStyle=lighten(pal[5],0.3);ctx.beginPath();ctx.arc(cx,y,6,Math.PI,0);ctx.fill();break;
    case "coral": ctx.fillStyle="#ff8a8a";ctx.fillRect(cx,y,2,8);ctx.fillRect(cx-3,y+3,2,5);ctx.fillRect(cx+3,y+2,2,6);ctx.fillStyle="#ffb0b0";ctx.fillRect(cx-1,y,4,2);break;
    case "shell": ctx.fillStyle="#ffd0a0";ctx.beginPath();ctx.arc(cx,y+4,5,Math.PI,0);ctx.fill();ctx.fillStyle="#e8a878";for(let i=0;i<3;i++)ctx.fillRect(cx-3+i*2,y-1,1,5);break;
    case "lavarock": ctx.fillStyle=darken(pal[2],0.3);ctx.fillRect(cx-5,y,10,5);ctx.fillStyle="#ff6020";ctx.fillRect(cx-3,y+1,6,2);break;
    case "vent": ctx.fillStyle=darken(pal[2],0.4);ctx.fillRect(cx-3,y,6,4);ctx.fillStyle="rgba(200,80,40,0.5)";for(let i=0;i<4;i++)ctx.fillRect(cx-1+Math.sin(t/200+i)*1|0,y-i*4,2,3);break;
    case "cinder": ctx.fillStyle="#ff5020";ctx.fillRect(cx,y,2,2);break;
    case "cloud": ctx.fillStyle="rgba(255,255,255,0.8)";ctx.beginPath();ctx.arc(cx,y,7,0,Math.PI*2);ctx.arc(cx+6,y+1,5,0,Math.PI*2);ctx.arc(cx-6,y+1,5,0,Math.PI*2);ctx.fill();break;
    case "pillar": ctx.fillStyle=lighten(pal[2],0.1);ctx.fillRect(cx-3,y-10,6,18);ctx.fillStyle=darken(pal[2],0.2);ctx.fillRect(cx-4,y-12,8,3);break;
    case "wind": ctx.strokeStyle="rgba(255,255,255,0.4)";ctx.beginPath();ctx.moveTo(cx,y);ctx.lineTo(cx+10,y+Math.sin(t/300+cx)*2);ctx.stroke();break;
    case "glitch": for(let i=0;i<3;i++){ctx.fillStyle=Math.floor(t/100+r()*999)%2?pal[3]:pal[5];ctx.fillRect(cx+Math.sin(t/200+i*2)*4|0,y+i*3,5,2);}break;
    case "orb": ctx.fillStyle=pal[3];ctx.beginPath();ctx.arc(cx,y,4,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.fillRect(cx-1,y-1,2,2);break;
    case "rift": ctx.strokeStyle=pal[3];ctx.beginPath();ctx.moveTo(cx,y+8);ctx.lineTo(cx+Math.sin(t/300)*3,y-8);ctx.stroke();break;
    case "icicle": ctx.fillStyle=lighten(pal[1],0.2);ctx.beginPath();ctx.moveTo(cx-2,y);ctx.lineTo(cx,y-8);ctx.lineTo(cx+2,y);ctx.closePath();ctx.fill();break;
    case "snowpatch": ctx.fillStyle="#fff";ctx.fillRect(cx-4,y,8,2);break;
    case "dune": ctx.fillStyle=lighten(pal[2],0.15);ctx.beginPath();ctx.arc(cx,y+6,10,Math.PI,0);ctx.fill();break;
    case "cactus": ctx.fillStyle="#4a8a4a";ctx.fillRect(cx,y-8,3,12);ctx.fillRect(cx-3,y-4,3,4);ctx.fillRect(cx+3,y-6,3,4);break;
    case "skull": ctx.fillStyle="#e8e0d0";ctx.fillRect(cx-3,y,6,4);ctx.fillRect(cx-2,y-2,4,2);ctx.fillStyle="#101018";ctx.fillRect(cx-2,y+1,1,1);ctx.fillRect(cx+1,y+1,1,1);break;
    case "coil": ctx.strokeStyle=pal[3];ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<8;i++)ctx.lineTo(cx+Math.cos(i*0.8)*3|0,y-i*2);ctx.stroke();ctx.lineWidth=1;break;
    case "pipe": ctx.fillStyle=darken(pal[2],0.3);ctx.fillRect(cx-3,y,6,5);ctx.fillStyle=darken(pal[2],0.5);ctx.fillRect(cx-3,y,6,2);break;
    case "spark": ctx.fillStyle=pal[3];ctx.globalAlpha=0.5+Math.sin(t/100+cx)*0.5;ctx.fillRect(cx,y,2,2);ctx.globalAlpha=1;break;
  }
}

function drawWeather(ctx,weather,W,H,t,r){
  switch(weather){
    case "rain": ctx.strokeStyle="rgba(180,200,255,0.5)";for(let i=0;i<30;i++){const x=(r()*W+t/3)%W,y=(r()*H+t/8)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-2,y+6);ctx.stroke();}break;
    case "snow": ctx.fillStyle="rgba(255,255,255,0.8)";for(let i=0;i<25;i++){const x=(r()*W+t/20)%W,y=(r()*H+t/30)%H;ctx.fillRect(x|0,y|0,1,1);}break;
    case "fog": ctx.fillStyle="rgba(220,230,240,0.25)";ctx.fillRect(0,0,W,H);break;
    case "aurora": {const g=ctx.createLinearGradient(0,0,0,H*0.4);g.addColorStop(0,"rgba(80,255,180,0.0)");g.addColorStop(0.5,`rgba(80,255,180,${0.2+Math.sin(t/800)*0.1})`);g.addColorStop(1,"rgba(160,120,255,0)");ctx.fillStyle=g;ctx.fillRect(0,0,W,H*0.5);}break;
    case "sandstorm": ctx.fillStyle="rgba(220,200,120,0.18)";ctx.fillRect(0,0,W,H);ctx.fillStyle="rgba(240,220,150,0.5)";for(let i=0;i<20;i++){const x=(r()*W+t/2)%W,y=r()*H;ctx.fillRect(x|0,y|0,2,1);}break;
    case "sparks": ctx.fillStyle="#ffd060";for(let i=0;i<15;i++){const x=(r()*W+t/5)%W,y=(H-(t/4+r()*H)%H);ctx.fillRect(x|0,y|0,1,1);}break;
    case "glitch": for(let i=0;i<6;i++){if(Math.floor(t/120+i)%2){ctx.fillStyle=i%2?pal3(0):pal3(1);ctx.fillRect(0,r()*H|0,W,2+Math.floor(r()*4));}}function pal3(k){return["rgba(224,72,208,0.15)","rgba(72,224,208,0.15)"][k];}break;
  }
}

/* ============================================================
   TITLE background — drifting pokeballs + gradient
   ============================================================ */
function drawTitle(ctx,t){
  const W=ctx.canvas.width,H=ctx.canvas.height;
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#2a1a4a");g.addColorStop(0.5,"#1a2a5a");g.addColorStop(1,"#0a1428");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // stars
  const r=rng(12345);
  ctx.fillStyle="#fff";
  for(let i=0;i<60;i++){const x=r()*W,y=r()*H;const tw=Math.sin(t/400+i)*0.5+0.5;ctx.globalAlpha=0.2+tw*0.6;ctx.fillRect(x|0,y|0,1,1);}
  ctx.globalAlpha=1;
  // drifting pokeballs
  for(let i=0;i<6;i++){
    const bx=((t/30+i*70)%(W+60))-30;
    const by=40+i*38+Math.sin(t/600+i)*8;
    const cols=[{top:"#e8483b",bot:"#f4f4f4",accent:"#fff"},{top:"#3a7bd5",bot:"#f4f4f4",accent:"#fff"},{top:"#f6c844",bot:"#f4f4f4",accent:"#fff"},{top:"#5fbf5f",bot:"#f4f4f4",accent:"#fff"}];
    drawPokeball(ctx,cols[i%cols.length],bx,by,24);
  }
  // ground silhouette
  ctx.fillStyle="#0a0a18";ctx.beginPath();ctx.moveTo(0,H-30);
  for(let x=0;x<=W;x+=20){ctx.lineTo(x,H-30-Math.sin(x*0.05)*8-10);}
  ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
}

return {
  mulberry32, rng, drawBerry, drawPokeball, pokeballCanvas,
  drawPokemon, pokemonSprite, drawScene, drawTitle,
  hexToRgb, darken, lighten, mix, rgbStr, TIMES, WEATHERS,
  drawGrid, loadSprite, preloadSprites,
  set onSpriteLoad(cb){onSpriteLoadCb=cb;},
  get onSpriteLoad(){return onSpriteLoadCb;}
};
})();
