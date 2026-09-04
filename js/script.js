/* A single, reversible scene position drives background, artwork and dial.
   Video-scrubbed version (hero-v2): 10 MP4 segments tied to scroll position.
   Circular menu and 3D card flip section preserved. */
(() => {
'use strict';
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}
const $=s=>document.querySelector(s), clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);},mix=(a,b,t)=>a+(b-a)*t;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const hero=$('#hero-pin-section'), stage=$('#circular-stage'), menu=$('#circular-stage'), bg=$('#bg-layer'), text=$('#atom-text'), dial=$('#left-dial'), desc=$('#dial-text-box'), ending=$('#story-ending'), quickMenuBtn=$('#hero-quick-menu-btn');
const atomIdleStage=$('#atom-idle-stage');
const canvas=$('#atom-canvas'),ctx=canvas.getContext('2d');
const videoStage=$('#video-stage');

let toastTimer;function toast(message){const el=$('#toast-modal');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800);}

/* ── Timeline structure ─────────────────────────────────────── */

const chapters=[['LIFE SCIENCE','방사선 융합기술 개발'],['EXPLORATION','양자빔 활용 과학기술'],['FUTURE ENERGY','선진 원자로 기술개발']];

// SVG Dial structure: Center (-580, 512), Arc Radius 690, Step 24 deg
const ns = 'http://www.w3.org/2000/svg';
const dialRotator = $('#dial-rotator');
const dialNodes = [];
const DIAL_CX = -580, DIAL_CY = 512, DIAL_R = 690, DIAL_R_TEXT = 735, DIAL_STEP = 24;

if (dialRotator) {
  for (let i = 0; i < 4; i++) {
    const g = document.createElementNS(ns, 'g');
    const baseDeg = i * DIAL_STEP;
    const rad = (baseDeg * Math.PI) / 180;

    // Node ring on the arc
    const circle = document.createElementNS(ns, 'circle');
    const cx_node = DIAL_CX + DIAL_R * Math.cos(rad);
    const cy_node = DIAL_CY + DIAL_R * Math.sin(rad);
    circle.setAttribute('cx', String(cx_node));
    circle.setAttribute('cy', String(cy_node));
    circle.setAttribute('r', '4');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'rgba(255,255,255,0.45)');
    circle.setAttribute('stroke-width', '1.2');

    // Number text: 00., 01., 02., 03.
    const text = document.createElementNS(ns, 'text');
    const tx = DIAL_CX + DIAL_R_TEXT * Math.cos(rad);
    const ty = DIAL_CY + DIAL_R_TEXT * Math.sin(rad);
    text.setAttribute('x', String(tx));
    text.setAttribute('y', String(ty));
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('font-family', "'Outfit', sans-serif");
    text.setAttribute('font-size', '56');
    text.setAttribute('font-weight', '200');
    text.setAttribute('fill', 'rgba(255,255,255,0.35)');
    text.setAttribute('transform', `rotate(${baseDeg}, ${tx}, ${ty})`);
    text.textContent = `0${i}.`;

    g.append(circle, text);
    dialRotator.append(g);
    dialNodes.push({ g, circle, text, baseDeg, tx, ty });
  }
}

let unit=500,s=1,ox=0,oy=0,w=0,h=0,dpr=1,position=0,target=0,lastTime=0,raf=0,menuExit=0;

// Cumulative scroll positions
let cumulative=[];
let LAST=0;
let endingScrollStart=0;
let totalHeight=0;
const ENDING_UNITS = 5.6277; // 3x fast (1/3 of 16.883): 0.2667 video fade + 0.0833 text in + 2.0 text hold + 0.1 text out + 0.5 organic bloom & sequential entrance + 1.7777 circle hold + 1.0 sequential circle exit

function rebuildTimeline(){
 const videoUnits = VideoScrubber.totalScrollUnits;
 cumulative=[0];
 // Video section: mapped to videoUnits
 const videoScrollPx = videoUnits * unit;
 cumulative.push(cumulative.at(-1) + videoScrollPx);
 // Ending section: 16.533 scroll units
 const endingLength = ENDING_UNITS * unit;
 endingScrollStart = cumulative.at(-1);
 cumulative.push(cumulative.at(-1) + endingLength);

 LAST = cumulative.length - 1;
 totalHeight = cumulative.at(-1) + h;
 hero.style.height = totalHeight + 'px';
}

function setupSize(){
 w=innerWidth;h=innerHeight;s=Math.min(w/1920,h/1024);ox=(w-1920*s)/2;oy=(h-1024*s)/2;dpr=Math.min(devicePixelRatio||1,1.5);
 document.documentElement.style.setProperty('--s',s);
 unit=Math.max(420,h*.65);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 rebuildTimeline();
 VideoScrubber.resize();
 layoutMenu();
}

function getPosition(y){
 y=clamp(y,0,cumulative.at(-1));
 const videoStart = cumulative[0];
 const videoEnd = cumulative[1];
 if(y<=videoEnd){
  const videoProgress = clamp((y-videoStart)/(videoEnd-videoStart));
  return VideoScrubber.VIDEO_START + videoProgress * VideoScrubber.totalScrollUnits;
 }
 const endStart = cumulative[1];
 const endEnd = cumulative[2];
 const endProgress = clamp((y-endStart)/(endEnd-endStart));
 return VideoScrubber.VIDEO_START + VideoScrubber.totalScrollUnits + endProgress * ENDING_UNITS;
}

function goFrame(frame){window.scrollTo({top:0,behavior:reduced.matches?'auto':'smooth'});}
function visible(el,alpha){alpha=clamp(alpha);el.style.opacity=alpha;el.style.visibility=alpha>.001?'visible':'hidden';}

/* ── Video-aware blackness & vertical gradient ──────────────── */
function blackness(p){
 const videoEnd = VideoScrubber.VIDEO_START + VideoScrubber.totalScrollUnits;
 if(p<=videoEnd) return VideoScrubber.getBlackness(p);
 const overrun = p - videoEnd;
 if(overrun <= 2.35) return 1.0; // Opaque solid black (#000) during hand hold, video fade & text hold (1/3 of 7.05)
 return 1 - smooth(clamp((overrun - 2.35) / 0.5)); // 1/3 of 1.5
}

function getOrganicBloomBackground(t) {
 t = clamp(t);
 if (t <= 0) return 'rgb(0,0,0)';
 if (t >= 1) return 'rgb(255,255,255)';

 // 5 organic bloom focal points rising at varied speeds and heights (mimicking ink seepage on paper)
 const y1 = Math.round(112 - Math.pow(t, 0.85) * 132); // Left-center (28%): early energetic bloom
 const y2 = Math.round(118 - Math.pow(t, 1.05) * 136); // Right-center (74%): broad gentle bloom
 const y3 = Math.round(124 - Math.pow(t, 1.15) * 142); // Center (50%): towering smooth dome
 const y4 = Math.round(115 - Math.pow(t, 0.95) * 128); // Far left (10%): soft subtle flank
 const y5 = Math.round(120 - Math.pow(t, 1.00) * 132); // Far right (90%): soft subtle flank

 const baseRise = Math.round(112 - t * 120);
 const baseTop = Math.max(0, baseRise - 16);
 const baseBot = Math.min(100, baseRise + 18);

 return [
  `radial-gradient(ellipse 65% 52% at 28% ${y1}%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.96) 42%, rgba(255,255,255,0) 72%)`,
  `radial-gradient(ellipse 72% 56% at 74% ${y2}%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.94) 40%, rgba(255,255,255,0) 70%)`,
  `radial-gradient(ellipse 58% 54% at 50% ${y3}%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.96) 45%, rgba(255,255,255,0) 75%)`,
  `radial-gradient(ellipse 52% 46% at 10% ${y4}%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.90) 38%, rgba(255,255,255,0) 68%)`,
  `radial-gradient(ellipse 55% 48% at 90% ${y5}%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.90) 38%, rgba(255,255,255,0) 68%)`,
  `linear-gradient(to bottom, rgb(0,0,0) 0%, rgb(0,0,0) ${baseTop}%, rgb(255,255,255) ${baseBot}%, rgb(255,255,255) 100%)`
 ].join(', ');
}

function getOrganicBloomMask(t) {
 t = clamp(t);
 if (t <= 0) return 'none';
 if (t >= 1) return 'none';

 const y1 = Math.round(112 - Math.pow(t, 0.85) * 132);
 const y2 = Math.round(118 - Math.pow(t, 1.05) * 136);
 const y3 = Math.round(124 - Math.pow(t, 1.15) * 142);
 const y4 = Math.round(115 - Math.pow(t, 0.95) * 128);
 const y5 = Math.round(120 - Math.pow(t, 1.00) * 132);

 const baseRise = Math.round(112 - t * 120);
 const baseTop = Math.max(0, baseRise - 16);
 const baseBot = Math.min(100, baseRise + 18);

 return [
  `radial-gradient(ellipse 65% 52% at 28% ${y1}%, black 0%, black 42%, transparent 72%)`,
  `radial-gradient(ellipse 72% 56% at 74% ${y2}%, black 0%, black 40%, transparent 70%)`,
  `radial-gradient(ellipse 58% 54% at 50% ${y3}%, black 0%, black 45%, transparent 75%)`,
  `radial-gradient(ellipse 52% 46% at 10% ${y4}%, black 0%, black 38%, transparent 68%)`,
  `radial-gradient(ellipse 55% 48% at 90% ${y5}%, black 0%, black 38%, transparent 68%)`,
  `linear-gradient(to bottom, transparent 0%, transparent ${baseTop}%, black ${baseBot}%, black 100%)`
 ].join(', ');
}

/* ── Dial & Text (video-aware) ─────────────────────────────── */
function drawDialVideo(p){
 const state = VideoScrubber.getDialState(p);
 if(state && state.visible && state.dialAlpha > 0.001){
  visible(dial, state.dialAlpha);
  if (dialRotator) {
   dialRotator.setAttribute('transform', `rotate(${state.rotationDeg}, ${DIAL_CX}, ${DIAL_CY})`);
  }

  // Update active highlight and screen-relative rotation orientation for each number
  dialNodes.forEach((node) => {
   const currentAngleOnScreen = node.baseDeg + state.rotationDeg;
   const distToZero = Math.abs(currentAngleOnScreen);
   const isSelected = distToZero < 4.0;
   const selectWeight = smooth(clamp(1 - distToZero / 14.0));

   // Screen-relative target angle: curves along arc when far, smoothly reaches exactly 0deg (horizontal) at selector
   const targetScreenAngle = currentAngleOnScreen * (1 - selectWeight);
   const localTextRotation = targetScreenAngle - state.rotationDeg;

   node.text.setAttribute('transform', `rotate(${localTextRotation}, ${node.tx}, ${node.ty})`);

   if (isSelected) {
    node.text.setAttribute('fill', '#ffffff');
    node.text.setAttribute('font-size', '76');
    node.text.setAttribute('font-weight', '300');
    node.text.setAttribute('opacity', '1.0');
    node.circle.setAttribute('stroke', '#ffffff');
    node.circle.setAttribute('fill', '#ffffff');
   } else {
    node.text.setAttribute('fill', 'rgba(255,255,255,0.35)');
    node.text.setAttribute('font-size', '54');
    node.text.setAttribute('font-weight', '200');
    node.text.setAttribute('opacity', String(0.35 + selectWeight * 0.45));
    node.circle.setAttribute('stroke', 'rgba(255,255,255,0.45)');
    node.circle.setAttribute('fill', 'none');
   }
  });

   if (state.descAlpha > 0.01) {
    $('#dial-category').textContent = state.category || '';
    $('#dial-title').textContent = state.title || '';
    if (state.category === 'LIFE SCIENCE') currentDialIndex = 0;
    else if (state.category === 'EXPLORATION') currentDialIndex = 1;
    else if (state.category === 'FUTURE ENERGY') currentDialIndex = 2;
    visible(desc, state.descAlpha);
    desc.inert = state.descAlpha < 0.5;
   } else {
   visible(desc, 0);
   desc.inert = true;
  }
 } else {
  visible(dial, 0);
  visible(desc, 0);
  desc.inert = true;
 }
}

/* ── Main render loop ──────────────────────────────────────── */
function render(now){
 raf=0;if(document.hidden)return;
 const dt=lastTime?Math.min(64,now-lastTime):16;lastTime=now;
 target=getPosition(scrollY);
 position=reduced.matches?target:mix(position,target,1-Math.exp(-dt/60));
 if(Math.abs(position-target)<.0001)position=target;
 const t=reduced.matches?0:now/1000;

 const videoEnd = VideoScrubber.VIDEO_START + VideoScrubber.totalScrollUnits;
 const overrun = position - videoEnd;

 if (overrun > 2.35 && overrun < 2.85) {
  const gradT = clamp((overrun - 2.35) / 0.5);
  bg.style.background = getOrganicBloomBackground(gradT);
  document.body.classList.toggle('theme-dark', gradT <= 0.65);
  document.body.classList.toggle('theme-light', gradT > 0.65);
 } else if (overrun >= 2.85) {
  bg.style.background = 'rgb(255,255,255)';
  bg.style.maskImage = 'none';
  bg.style.webkitMaskImage = 'none';
  document.body.classList.remove('theme-dark');
  document.body.classList.add('theme-light');
 } else {
  const black = blackness(position);
  bg.style.background = `rgb(${Math.round(255*(1-black))},${Math.round(255*(1-black))},${Math.round(255*(1-black))})`;
  document.body.classList.toggle('theme-dark', black > 0.53);
  document.body.classList.toggle('theme-light', black <= 0.53);
 }

 const isInVideoRegion = position >= VideoScrubber.VIDEO_START && position <= VideoScrubber.VIDEO_START + VideoScrubber.totalScrollUnits;

 // Canvas unused in pure MP4 mode, hide canvas
 ctx.clearRect(0,0,w,h);
 canvas.style.zIndex = '0';

 // Video scrubber update
 VideoScrubber.update(position, dt);

 // Idle Atom Breathing & Smooth Video Hand-off
 if (atomIdleStage) {
  if (position <= 0.0167) {
   visible(atomIdleStage, 1.0);
   atomIdleStage.classList.remove('is-paused');
  } else if (position <= 0.15) {
   const idleAlpha = 1 - smooth((position - 0.0167) / 0.1333);
   visible(atomIdleStage, idleAlpha);
   atomIdleStage.classList.remove('is-paused');
  } else {
   visible(atomIdleStage, 0);
   atomIdleStage.classList.add('is-paused');
  }
 }

 // Initial atom text fade out
 visible(text, 1 - smooth((position - 0.0333) / 0.2));
 text.style.transform=`translateY(${-smooth((position - 0.0333) / 0.2)*18}px)`;

 // Dial & Description
 if(isInVideoRegion){
  drawDialVideo(position);
 } else {
  visible(dial,0); visible(desc,0); desc.inert=true;
 }

 // Quick menu jump button (visible ONLY during black video segments, hidden on white atom & ending text)
 if(quickMenuBtn){
  let qAlpha = 0;
  if(position >= 3.9 && overrun <= 0.1){
   if(position < 4.16) qAlpha = smooth((position - 3.9) / 0.26);
   else if(overrun > 0.0167) qAlpha = 1 - smooth((overrun - 0.0167) / 0.0833);
   else qAlpha = 1.0;
  }
  visible(quickMenuBtn, qAlpha);
  quickMenuBtn.style.pointerEvents = qAlpha > 0.5 ? 'auto' : 'none';
 }

 // Ending text (#story-ending):
 // 1. Hand hold: overrun 0.0 ~ 0.1
 // 2. Hand fadeout to black: overrun 0.1 ~ 0.2667
 // 3. Text entrance on solid black: overrun 0.2667 ~ 0.35 (0.0833 units)
 // 4. Text hold: overrun 0.35 ~ 2.35 (2.0 units fixed readable hold)
 // 5. Text fadeout: overrun 2.35 ~ 2.45 (0.1 units)
 let endingAlpha = 0;
 let endingY = 0;
 if (overrun > 0.2667 && overrun <= 2.45) {
  if (overrun <= 0.35) {
   const progress = smooth((overrun - 0.2667) / 0.0833);
   endingAlpha = progress;
   endingY = (1 - progress) * 8;
  } else if (overrun <= 2.35) {
   endingAlpha = 1.0;
   endingY = 0;
  } else {
   endingAlpha = 1.0 - smooth((overrun - 2.35) / 0.1);
   endingY = 0;
  }
 }
 visible(ending, endingAlpha);
 if (ending) ending.style.transform = `translate(-50%, calc(-50% + ${endingY}px))`;

 // Unified Circular menu: 1. Strict white-region mask, 2. Stagger entrance (0.5u), 3. Hold (1.7777u), 4. Sequential exit (1.0u)
 if (overrun < 2.35) {
  visible(stage, 0);
  stage.style.pointerEvents = 'none';
  stage.style.maskImage = 'none';
  stage.style.webkitMaskImage = 'none';
  renderEntrance(0);
 } else if (overrun < 2.85) {
  // Entrance with dynamic organic bloom mask tied to rising white ink seepage (0.5 units)
  const entranceProgress = clamp((overrun - 2.35) / 0.5);
  visible(stage, 1);
  stage.style.pointerEvents = 'auto';

  // Synchronized organic mask: clips circles strictly above the blooming white area
  const maskRule = getOrganicBloomMask(entranceProgress);
  stage.style.maskImage = maskRule;
  stage.style.webkitMaskImage = maskRule;

  renderEntrance(entranceProgress);
 } else if (overrun <= 4.6277) {
  // PINNED HOLD (1.7777 units): all circles fully landed, mask removed
  visible(stage, 1);
  stage.style.pointerEvents = 'auto';
  stage.style.maskImage = 'none';
  stage.style.webkitMaskImage = 'none';
  renderEntrance(1.0);
 } else {
  // Sequential top-to-bottom exit over dedicated 1.0 scroll units
  const exitProgress = clamp((overrun - 4.6277) / 1.0);
  visible(stage, 1);
  stage.style.maskImage = 'none';
  stage.style.webkitMaskImage = 'none';
  stage.style.pointerEvents = exitProgress >= 0.85 ? 'none' : 'auto';
  renderExit(exitProgress);
 }

  // Unified Section Scroll Indicator
  updateScrollIndicator();

  $('#atom-fallback').hidden=true;

  if(typeof updateCursorFromLoop === 'function') updateCursorFromLoop();

 if(scrollY < totalHeight || Math.abs(position-target) > .001) raf = requestAnimationFrame(render);
}

function wake(){if(!raf)raf=requestAnimationFrame(render);}

/* ── Circular Menu ─────────────────────────────────────────── */
const items=window.KAERI_MENU, els=new Map();let selected=null,selectedAtY=0;const small=[];
const menuPositions={intro:[960,620],news:[60,995],safety:[1530,365],rnd:[1455,875],visit:[1850,995],customer:[20,520],region:[355,335],achievement:[540,645],edu:[550,1000],info:[1160,320],tech:[1305,590],recruit:[1150,1000],video:[320,775],sns:[620,320],patent:[1800,665]};
items.forEach((item,index)=>{
 const coords=menuPositions[item.id]||[item.posX*19.2,item.posY*10.24];item.x=coords[0];item.y=coords[1];item.connected=false;
 const wrap=document.createElement('div');wrap.className='circle-position';wrap.id='menu-'+item.id;wrap.style.left=item.x+'px';wrap.style.top=item.y+'px';wrap.style.width=wrap.style.height=item.baseSize+'px';
 const exit=document.createElement('div');exit.className='circle-exit';
 const floatEl=document.createElement('div');floatEl.className='circle-float float-var-'+(index%8);floatEl.style.animationDuration=(5.2+(index%5)*0.7)+'s';floatEl.style.animationDelay=(-index*0.85)+'s';
 const circle=document.createElement('div');circle.className='menu-circle';circle.dataset.id=item.id;circle.style.setProperty('--hover',item.hoverColor);circle.style.setProperty('--ink',item.textColor);circle.style.setProperty('--title-size',Math.min(23,item.baseSize*.10)+'px');circle.style.setProperty('--desc-size',Math.min(17,item.baseSize*.075)+'px');
 const button=document.createElement('button');button.className='circle-select';button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',item.name);button.innerHTML=`<span class="circle-title">${item.name}</span><span class="circle-desc">${item.hoverText}</span>`;
 const detail=document.createElement('button');detail.className='circle-detail-btn';detail.textContent='자세히 보기 →';detail.tabIndex=-1;detail.setAttribute('aria-label',item.name+' 자세히 보기');detail.addEventListener('click',()=>toast(item.name+' 페이지는 아직 연결되지 않았습니다.'));
 const elRecord={wrap,exit,float:floatEl,circle,button,detail,index,x:item.x,y:item.y,size:item.baseSize,id:item.id,isHovered:false};
 button.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){e.preventDefault();button.focus({preventScroll:true});}});
 button.addEventListener('click',()=>selected===item.id?deselect():select(item.id));
 const setHover=on=>{elRecord.isHovered=on;circle.classList.toggle('is-hovered',on);if(on){floatEl.classList.add('is-paused');}else if(selected!==item.id){floatEl.classList.remove('is-paused');}};
 button.addEventListener('focus',()=>setHover(true));button.addEventListener('blur',()=>setHover(false));
 circle.addEventListener('mouseenter',()=>setHover(true));circle.addEventListener('mouseleave',()=>setHover(false));
 circle.append(button,detail);floatEl.append(circle);exit.append(floatEl);wrap.append(exit);
 $('#main-circles-container').append(wrap);els.set(item.id,elRecord);
});

const sp=[[135,215],[365,165],[750,300],[1000,190],[1340,235],[1870,220],[1750,310],[1450,570],[1180,850],[1610,990],[750,960],[200,760],[375,565],[1130,470],[225,415],[755,475]];
sp.forEach(([x,y],i)=>{
 const wrap=document.createElement('div');wrap.className='small-position';wrap.style.left=x+'px';wrap.style.top=y+'px';wrap.setAttribute('aria-hidden','true');
 const exit=document.createElement('div');exit.className='circle-exit';
 const pushEl=document.createElement('div');pushEl.className='small-push';
 const floatEl=document.createElement('div');floatEl.className='small-float small-var-'+(i%8);floatEl.style.animationDuration=(4.2+(i%6)*0.6)+'s';floatEl.style.animationDelay=(-i*0.7)+'s';
 const dot=document.createElement('div');dot.className='small-dot';
 floatEl.append(dot);pushEl.append(floatEl);exit.append(pushEl);wrap.append(exit);
 $('#small-circles-container').append(wrap);small.push({x,y,wrap,push:pushEl,exit,float:floatEl});
});

function push(el,x,y){el.style.setProperty('--push-x',x+'px');el.style.setProperty('--push-y',y+'px');}
function layoutMenu(){if(selected)select(selected);}
function select(id){
 selected=id;selectedAtY=scrollY;const a=items.find(i=>i.id===id);if(!a)return;
 const size=Math.min(a.hoverSize,Math.max(150,(h-180)/s));const xmin=(0-ox)/s,xmax=(w-ox)/s,ymin=(0-oy)/s,ymax=(h-oy)/s;
 const x=clamp(a.x,xmin+size/2+35,xmax-size/2-90),y=clamp(a.y,ymin+size/2+145,ymax-size/2-45);
 items.forEach(b=>{
  const e=els.get(b.id),active=b===a;
  e.circle.classList.toggle('is-selected',active);
  e.circle.classList.toggle('is-blurred',!active);
  e.wrap.style.zIndex=active?'50':'2';
  e.button.setAttribute('aria-expanded',String(active));
  e.detail.tabIndex=active?0:-1;
  e.circle.style.width=e.circle.style.height=(active?size:b.baseSize)+'px';
  if(active){e.float.classList.add('is-paused');push(e.circle,x-a.x-(size-a.baseSize)/2,y-a.y-(size-a.baseSize)/2);}
  else{if(!e.isHovered)e.float.classList.remove('is-paused');const dx=b.x-x,dy=b.y-y,dist=Math.hypot(dx,dy)||1,need=Math.max(0,(size+b.baseSize)/2+45-dist),fall=Math.max(.08,1-dist/1100),amt=Math.max(need,130*fall);push(e.circle,dx/dist*amt,dy/dist*amt);}
 });
 small.forEach(b=>{const dx=b.x-x,dy=b.y-y,d=Math.hypot(dx,dy)||1,amt=65*Math.max(0,1-d/900);push(b.push,dx/d*amt,dy/d*amt);b.push.classList.add('is-blurred');});
 document.querySelectorAll('.blur-element').forEach(e=>e.classList.add('is-blurred'));
}

function deselect(){
 selected=null;
 items.forEach(a=>{
  const e=els.get(a.id);
  e.circle.classList.remove('is-selected','is-blurred');
  e.button.setAttribute('aria-expanded','false');
  e.detail.tabIndex=-1;
  e.circle.style.width=e.circle.style.height=a.baseSize+'px';
  push(e.circle,0,0);
  e.wrap.style.zIndex='2';
  if(!e.isHovered)e.float.classList.remove('is-paused');
 });
 small.forEach(e=>{push(e.push,0,0);e.push.classList.remove('is-blurred');});
 document.querySelectorAll('.blur-element').forEach(e=>e.classList.remove('is-blurred'));
}

let sortedMainEntrance = [];
let sortedMainExit = [];
let sortedSmallEntrance = [];
let sortedSmallExit = [];

function setupSequences() {
 const mainArr = Array.from(els.values());
 // Entrance: Bottom to top (y descending: 1000 -> 320). If y close, sort by x
 sortedMainEntrance = [...mainArr].sort((a, b) => {
  if (Math.abs(b.y - a.y) > 2) return b.y - a.y;
  return a.x - b.x;
 });
 // Exit: Top to bottom (y ascending: 320 -> 1000). If y close, sort by x
 sortedMainExit = [...mainArr].sort((a, b) => {
  if (Math.abs(a.y - b.y) > 2) return a.y - b.y;
  return a.x - b.x;
 });

 // Small circles
 sortedSmallEntrance = [...small].sort((a, b) => {
  if (Math.abs(b.y - a.y) > 2) return b.y - a.y;
  return a.x - b.x;
 });
 sortedSmallExit = [...small].sort((a, b) => {
  if (Math.abs(a.y - b.y) > 2) return a.y - b.y;
  return a.x - b.x;
 });
}

function renderEntrance(t){
 t = clamp(t);
 if(!sortedMainEntrance.length || typeof sortedMainEntrance[0].y !== 'number') setupSequences();
 const dur = 0.32; // Each circle's movement duration
 const mainCount = sortedMainEntrance.length;
 sortedMainEntrance.forEach((e, idx) => {
  const startT = (idx / (mainCount - 1)) * (1 - dur); // Distinct start: 0.0 -> 0.68
  const progress = smooth(clamp((t - startT) / dur));
  const startOffsetY = Math.max(280, (1024 - e.y) + (e.size || 160) * 0.5 + 80);
  e.exit.style.transform = `translateY(${Math.round((1 - progress) * startOffsetY)}px)`;
  e.exit.style.opacity = String(clamp(progress * 1.8));
 });

 const smallCount = sortedSmallEntrance.length;
 sortedSmallEntrance.forEach((e, idx) => {
  const startT = (idx / (smallCount - 1)) * (1 - dur);
  const progress = smooth(clamp((t - startT) / dur));
  const startOffsetY = Math.max(300, (1024 - e.y) + 100);
  e.exit.style.transform = `translateY(${Math.round((1 - progress) * startOffsetY)}px)`;
  e.exit.style.opacity = String(clamp(progress * 1.8));
 });
}

function renderExit(p){
 p = clamp(p);
 if(!sortedMainExit.length || typeof sortedMainExit[0].y !== 'number') setupSequences();
 const dur = 0.32;
 const mainCount = sortedMainExit.length;
 sortedMainExit.forEach((e, idx) => {
  const startP = (idx / (mainCount - 1)) * (1 - dur); // Distinct start: 0.0 -> 0.68
  const rawP = clamp((p - startP) / dur);
  const itemP = rawP * rawP * (2.4 - 1.4 * rawP); // Smooth start, accelerating exit
  const travelY = e.y + (e.size || 160) + 120;
  e.exit.style.transform = `translateY(${-Math.round(itemP * travelY)}px)`;
  e.exit.style.opacity = String(1 - smooth((itemP - 0.45) / 0.55));
 });

 const smallCount = sortedSmallExit.length;
 sortedSmallExit.forEach((e, idx) => {
  const startP = (idx / (smallCount - 1)) * (1 - dur);
  const rawP = clamp((p - startP) / dur);
  const itemP = rawP * rawP * (2.4 - 1.4 * rawP);
  const travelY = e.y + 120;
  e.exit.style.transform = `translateY(${-Math.round(itemP * travelY)}px)`;
  e.exit.style.opacity = String(1 - smooth((itemP - 0.40) / 0.60));
 });
}
menu.addEventListener('click',e=>{if(!e.target.closest('.menu-circle'))deselect();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){const old=selected;deselect();if(old)els.get(old).button.focus({preventScroll:true});}});addEventListener('scroll',()=>{if(selected&&Math.abs(scrollY-selectedAtY)>.5)deselect();wake();},{passive:true});
function openMenu(id){
 deselect();
 const targetScroll = cumulative[1] + (8.55 + 2.667) * unit;
 window.scrollTo({top: targetScroll, behavior:'auto'});
 wake();
 if(id&&els.has(id)){select(id);els.get(id).button.focus({preventScroll:true});}
}
/* ── Dial Detail Modal Controller ───────────────────────────── */
const DIAL_DETAILS = [
  {
    category: '01. LIFE SCIENCE',
    title: '방사선 융합기술 개발',
    image: 'assets/story-05-medical-device.png',
    imageAlt: '방사선 및 바이오 의료 융합기술 시각화 그래픽',
    desc: '방사선 및 동위원소 기술을 바이오·의료 및 첨단 신소재 분야에 융합하여 국민 건강 증진과 삶의 질 향상에 기여합니다. 정밀 진단과 질환 치료를 위한 방사성의약품 및 방사선 생명공학 연구를 지속적으로 추진하고 있습니다.',
    examples: [
      '방사성동위원소 기반 정밀 진단·치료 기술 연구',
      '방사선 조사 기술을 활용한 바이오·신소재 융합 연구'
    ]
  },
  {
    category: '02. EXPLORATION',
    title: '양자빔 활용 과학기술',
    image: 'assets/story-08-planets.png',
    imageAlt: '우주 및 극한 환경 양자빔 연구 시각화 그래픽',
    desc: '중성자, 양성자, 전자 등 첨단 양자빔을 활용하여 미세 물질의 특성을 정밀 분석하고 기초·응용 과학기술의 지평을 넓힙니다. 우주 및 극한 환경을 모사한 물질 탐구와 차세대 부품 성능 검증을 종합적으로 지원합니다.',
    examples: [
      '양자빔 및 중성자를 이용한 극한 환경 나노 구조 분석',
      '우주·항공용 극한 내방사선 부품 검증 및 신소재 평가'
    ]
  },
  {
    category: '03. FUTURE ENERGY',
    title: '선진 원자로 기술개발',
    image: 'assets/story-12-reactor.png',
    imageAlt: '혁신 소형모듈원자로 SMR 연구 시각화 그래픽',
    desc: '탄소중립과 미래 에너지 자립을 선도하기 위해 혁신적인 소형모듈원자로(SMR) 및 다목적 선진 원자로를 개발합니다. 높은 고유 안전성과 유연성을 바탕으로 전력 생산뿐만 아니라 열 공급, 청정 수소 생산 등 다양한 에너지 수요에 대응합니다.',
    examples: [
      '혁신 소형모듈원자로(SMR) 핵심 기술 개발 및 안전성 검증',
      '청정 수소 생산 및 다목적 산업용 고온 열 공급 기술'
    ]
  }
];

let currentDialIndex = 0;
let lastFocusedElement = null;

function openDialModal(idx) {
  const detail = DIAL_DETAILS[idx] || DIAL_DETAILS[0];
  const modal = $('#dial-modal');
  if (!modal) return;

  $('#dial-modal-category').textContent = detail.category;
  $('#dial-modal-title').textContent = detail.title;
  $('#dial-modal-desc').textContent = detail.desc;
  
  const img = $('#dial-modal-img');
  if (img) {
    img.src = detail.image;
    img.alt = detail.imageAlt;
  }

  const list = $('#dial-examples-list');
  if (list) {
    list.innerHTML = detail.examples.map(ex => `
      <li>
        <span class="example-bullet">•</span>
        <span class="example-text">${ex}</span>
      </li>
    `).join('');
  }

  lastFocusedElement = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    modal.classList.add('is-open');
    const closeBtn = $('#dial-modal-close');
    if (closeBtn) closeBtn.focus();
  });
}

function closeDialModal() {
  const modal = $('#dial-modal');
  if (!modal || modal.hidden) return;

  modal.classList.remove('is-open');
  document.body.style.overflow = '';

  setTimeout(() => {
    modal.hidden = true;
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }, 280);
}

$('#hamburger-btn').addEventListener('click',()=>openMenu());if(quickMenuBtn)quickMenuBtn.addEventListener('click',()=>openMenu());$('.lang-btn').addEventListener('click',()=>toast('영문 페이지는 준비 중입니다.'));
const dialDetailBtn = $('#dial-detail-btn');
if (dialDetailBtn) {
  dialDetailBtn.addEventListener('click', () => {
    openDialModal(currentDialIndex);
  });
}
const modalCloseBtn = $('#dial-modal-close');
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeDialModal);
const modalBackdrop = $('#dial-modal-backdrop');
if (modalBackdrop) modalBackdrop.addEventListener('click', closeDialModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = $('#dial-modal');
    if (modal && !modal.hidden) {
      closeDialModal();
    }
  }
});
document.querySelectorAll('.shortcut-sns-widget button').forEach(b=>b.addEventListener('click',()=>toast(b.getAttribute('aria-label')+' 링크는 아직 연결되지 않았습니다.')));
const topBtn = $('#footer-top-btn');if(topBtn){topBtn.addEventListener('click',()=>{deselect();window.scrollTo({top:0,behavior:reduced.matches?'auto':'smooth'});wake();});}
document.querySelectorAll('.footer-policy-nav a').forEach(a=>{a.addEventListener('click',e=>{e.preventDefault();toast(a.textContent+' 페이지는 준비 중입니다.');});});
document.querySelectorAll('.header a,.shortcut-bar a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const hash=a.getAttribute('href');if(hash==='#home'){goFrame(0);return;}openMenu(hash.replace('#menu-','').replace('#',''));}));
/* ── Unified Global Scroll Indicator Controller ───────────── */
const indicatorEl = $('#scroll-indicator');
const indicatorTextEl = indicatorEl ? indicatorEl.querySelector('.scroll-text') : null;

function updateScrollIndicator() {
  if (!indicatorEl) return;

  const scroll = window.scrollY || document.documentElement.scrollTop;
  const heroHeight = hero ? hero.offsetHeight : 20000;
  const footer = $('#site-footer');

  // ⑦ Footer: completely hidden
  if (footer) {
    const fRect = footer.getBoundingClientRect();
    if (fRect.top <= window.innerHeight * 0.92) {
      indicatorEl.classList.remove('is-visible');
      return;
    }
  }

  // ⑥ Card Flip Section (scrollY >= heroHeight)
  if (scroll >= heroHeight - 20) {
    const cardState = window.cardIndicatorState;
    if (cardState && cardState.visible) {
      if (indicatorTextEl) {
        indicatorTextEl.textContent = cardState.text;
        indicatorTextEl.style.display = cardState.text ? 'inline-block' : 'none';
      }
      indicatorEl.classList.add('is-visible');
    } else {
      indicatorEl.classList.remove('is-visible');
    }
    return;
  }

  // ① ~ ⑤ Hero Section Timeline (based on position & overrun)
  const videoEnd = VideoScrubber.VIDEO_START + VideoScrubber.totalScrollUnits;
  const overrun = position - videoEnd;

  let isVisible = false;
  let text = '';
  let showText = true;

  if (position <= 0.85) {
    // ① First white atom main
    isVisible = true;
    text = '스크롤하여 원자의 흐름을 따라가세요.';
  } else if (overrun <= 0) {
    // Video region
    const dialState = VideoScrubber.getDialState(position);
    if (dialState && dialState.visible && dialState.descAlpha > 0.5) {
      // ② MRI · Space · SMR dial hold section
      isVisible = true;
      text = '스크롤';
    } else {
      // ③ Transition between atoms, or hands touch & absorption: hidden
      isVisible = false;
    }
  } else if (overrun <= 0.2667) {
    // ③ Hand hold & fadeout: hidden
    isVisible = false;
  } else if (overrun > 0.35 && overrun <= 2.35) {
    // ④ Ending text (#story-ending) hold section: arrow only!
    isVisible = true;
    text = '';
    showText = false;
  } else if (overrun > 2.35 && overrun < 2.85) {
    // Ink bloom & menu entrance: hidden
    isVisible = false;
  } else if (overrun >= 2.85 && overrun <= 4.6277) {
    // ⑤ Circular menu hold section
    isVisible = true;
    text = '스크롤하여 연구 이야기 더 보기';
  } else {
    // Menu exit transition (overrun > 4.6277): hidden
    isVisible = false;
  }

  if (indicatorTextEl) {
    indicatorTextEl.textContent = text;
    indicatorTextEl.style.display = showText && text ? 'inline-block' : 'none';
  }

  if (isVisible) {
    indicatorEl.classList.add('is-visible');
  } else {
    indicatorEl.classList.remove('is-visible');
  }
}

window.updateScrollIndicator = updateScrollIndicator;

addEventListener('scroll', () => {
  updateScrollIndicator();
}, { passive: true });

addEventListener('resize',()=>{setupSize();position=target=getPosition(scrollY);updateScrollIndicator();wake();});
document.addEventListener('visibilitychange',()=>{lastTime=0;wake();});
reduced.addEventListener('change',wake);

/* ── Custom Cursor Controller ───────────────────────────────── */
let updateCursorFromLoop = null;

function initCustomCursor() {
  const cursor = $('#custom-cursor');
  if (!cursor) return;
  const dot = cursor.querySelector('.cursor-dot');
  const ring = cursor.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  let mouseX = -100, mouseY = -100;
  let ringX = -100, ringY = -100;
  let isHovered = false;
  let isPressed = false;
  let isVisible = false;
  let cursorRaf = 0;

  // 2D Geometric ink bloom containment check
  function isInsideInkBloom(mx, my, t) {
    if (t <= 0.01) return false;
    if (t >= 0.98) return true;

    const nx = (mx / Math.max(1, w)) * 100;
    const ny = (my / Math.max(1, h)) * 100;

    // Base rising line
    const baseRise = 112 - t * 120;
    if (ny >= baseRise) return true;

    // 5 Bloom ellipses
    const y1 = 112 - Math.pow(t, 0.85) * 132;
    const y2 = 118 - Math.pow(t, 1.05) * 136;
    const y3 = 124 - Math.pow(t, 1.15) * 142;
    const y4 = 115 - Math.pow(t, 0.95) * 128;
    const y5 = 120 - Math.pow(t, 1.00) * 132;

    const ellipses = [
      { cx: 28, cy: y1, rx: 32.5, ry: 26 },
      { cx: 74, cy: y2, rx: 36.0, ry: 28 },
      { cx: 50, cy: y3, rx: 29.0, ry: 27 },
      { cx: 10, cy: y4, rx: 26.0, ry: 23 },
      { cx: 90, cy: y5, rx: 27.5, ry: 24 }
    ];

    for (const e of ellipses) {
      const dx = (nx - e.cx) / e.rx;
      const dy = (ny - e.cy) / e.ry;
      if (dx * dx + dy * dy <= 1.0) {
        return true;
      }
    }
    return false;
  }

  function checkPointIsDark(mx, my, pos) {
    const scroll = window.scrollY || document.documentElement.scrollTop;
    const heroHeight = hero ? hero.offsetHeight : 20000;

    if (scroll < heroHeight) {
      const videoEnd = VideoScrubber.VIDEO_START + VideoScrubber.totalScrollUnits;
      const overrun = pos - videoEnd;

      // 1. Video region: use exact blackness calculation (white atom: blackness ~0, black videos: blackness ~1)
      if (overrun <= 0) {
        const blackness = VideoScrubber.getBlackness(pos);
        return blackness > 0.45;
      }

      // 2. Black ending text region (overrun 0.0 ~ 2.35)
      if (overrun <= 2.35) {
        return true;
      }

      // 3. Organic ink bloom region (overrun 2.35 ~ 2.85)
      if (overrun < 2.85) {
        const t = clamp((overrun - 2.35) / 0.5);
        const inWhiteBloom = isInsideInkBloom(mx, my, t);
        return !inWhiteBloom;
      }

      // 4. Circular menu stage (overrun >= 2.85)
      return false;
    } else {
      // 5. Card flip & Footer
      const footer = $('#site-footer');
      if (footer) {
        const fRect = footer.getBoundingClientRect();
        if (my >= fRect.top && my <= fRect.bottom && mx >= fRect.left && mx <= fRect.right) {
          return true; // Dark charcoal footer
        }
      }
      return false; // White cards & last screen
    }
  }

  function updateHoverState() {
    if (!isVisible || mouseX < 0 || mouseY < 0) return;
    const target = document.elementFromPoint(mouseX, mouseY);
    if (!target) return;

    const isInput = target.closest('input, textarea, [contenteditable="true"], select');
    if (isInput) {
      cursor.classList.add('is-hidden');
      document.body.classList.add('native-cursor-active');
      return;
    } else {
      cursor.classList.remove('is-hidden');
      document.body.classList.remove('native-cursor-active');
    }

    const isInteractive = target.closest('a, button, [role="button"], .circle-select, .policy-link, .hero-quick-menu-btn, .footer-top-btn, .card-btn, #hamburger-btn, .lang-btn, .shortcut-tab-widget a, .shortcut-sns-widget button');
    const isSmallDeco = target.closest('.small-position, .small-dot, .small-push, .small-float');

    const shouldHover = Boolean(isInteractive && !isSmallDeco);
    if (shouldHover !== isHovered) {
      isHovered = shouldHover;
      cursor.classList.toggle('is-hovered', isHovered);
    }
  }

  function updateColorState() {
    if (!isVisible || mouseX < 0 || mouseY < 0) return;
    const isDark = checkPointIsDark(mouseX, mouseY, position);
    cursor.classList.toggle('theme-dark', isDark);
    cursor.classList.toggle('theme-light', !isDark);
  }

  updateCursorFromLoop = () => {
    if (!isVisible) return;
    updateHoverState();
    updateColorState();
  };

  function renderCursor() {
    cursorRaf = 0;
    if (!isVisible) return;

    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;

    ringX += (mouseX - ringX) * 0.28;
    ringY += (mouseY - ringY) * 0.28;
    ring.style.transform = `translate(${Math.round(ringX * 10) / 10}px, ${Math.round(ringY * 10) / 10}px) translate(-50%, -50%)${isPressed ? (isHovered ? ' scale(0.88)' : ' scale(0.80)') : ''}`;

    updateColorState();

    if (Math.abs(mouseX - ringX) > 0.1 || Math.abs(mouseY - ringY) > 0.1) {
      cursorRaf = requestAnimationFrame(renderCursor);
    }
  }

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isVisible) {
      isVisible = true;
      ringX = mouseX;
      ringY = mouseY;
      cursor.classList.add('is-visible');
      cursor.classList.remove('is-hidden');
    }

    updateHoverState();

    if (!cursorRaf) {
      cursorRaf = requestAnimationFrame(renderCursor);
    }
  }, { passive: true });

  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      isPressed = true;
      cursor.classList.add('is-pressed');
      if (!cursorRaf) cursorRaf = requestAnimationFrame(renderCursor);
    }
  });

  window.addEventListener('mouseup', () => {
    isPressed = false;
    cursor.classList.remove('is-pressed');
    if (!cursorRaf) cursorRaf = requestAnimationFrame(renderCursor);
  });

  document.addEventListener('mouseleave', () => {
    isVisible = false;
    cursor.classList.remove('is-visible');
    cursor.classList.add('is-hidden');
  });

  document.addEventListener('mouseenter', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    ringX = mouseX;
    ringY = mouseY;
    isVisible = true;
    cursor.classList.add('is-visible');
    cursor.classList.remove('is-hidden');
    updateHoverState();
    if (!cursorRaf) cursorRaf = requestAnimationFrame(renderCursor);
  });
}

/* ── Init ───────────────────────────────────────────────────── */
VideoScrubber.init(videoStage, bg);
visible(stage, 0);
renderEntrance(0);
setupSize();position=target=getPosition(scrollY);wake();
initCustomCursor();

const footerTopBtn = $('#footer-top-btn');
if (footerTopBtn) {
  footerTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
  });
}

if (quickMenuBtn) {
  quickMenuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof deselect === 'function') deselect();

    // Target overrun 2.90 ensures being safely inside hold section (2.85 ~ 4.6277) without subpixel rounding issues
    const targetY = Math.round(cumulative[1] + 2.90 * unit);

    const htmlStyle = document.documentElement.style;
    const prevScrollBehavior = htmlStyle.scrollBehavior;
    htmlStyle.scrollBehavior = 'auto';

    target = getPosition(targetY);
    position = target;

    // 1. Move scroll position immediately
    window.scrollTo({
      top: targetY,
      behavior: 'auto'
    });

    // 2. Clear any lingering transition masks on stage & background
    stage.style.maskImage = 'none';
    stage.style.webkitMaskImage = 'none';
    bg.style.maskImage = 'none';
    bg.style.webkitMaskImage = 'none';

    // 3. Update ScrollTrigger
    if (typeof ScrollTrigger !== 'undefined' && ScrollTrigger.update) {
      ScrollTrigger.update();
    }

    // 4. Force synchronous render pass before browser paint
    render(performance.now());

    // 5. Sync progress & re-confirm on next rAF
    requestAnimationFrame(() => {
      position = target = getPosition(window.scrollY);
      stage.style.maskImage = 'none';
      stage.style.webkitMaskImage = 'none';
      bg.style.maskImage = 'none';
      bg.style.webkitMaskImage = 'none';
      visible(stage, 1);
      stage.style.pointerEvents = 'auto';
      renderEntrance(1.0);
      render(performance.now());

      if (typeof ScrollTrigger !== 'undefined' && ScrollTrigger.update) {
        ScrollTrigger.update();
      }

      htmlStyle.scrollBehavior = prevScrollBehavior;

      requestAnimationFrame(() => {
        if (typeof ScrollTrigger !== 'undefined' && ScrollTrigger.update) {
          ScrollTrigger.update();
        }
      });
    });
  });
}

// Re-sync timeline once video metadata is loaded (durations may differ from defaults)
const checkVideoReady = setInterval(()=>{
 if(VideoScrubber.ready){
  clearInterval(checkVideoReady);
  rebuildTimeline();
  position=target=getPosition(scrollY);
  VideoScrubber.resize();
  wake();
 }
},200);
})();
