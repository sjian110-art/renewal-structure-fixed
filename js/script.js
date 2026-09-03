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
const hero=$('#hero-pin-section'), menu=$('#circular-menu-section'),stage=$('#circular-stage'),bg=$('#bg-layer'),text=$('#atom-text'),dial=$('#left-dial'),desc=$('#dial-text-box'),ending=$('#story-ending');
const canvas=$('#atom-canvas'),ctx=canvas.getContext('2d');
const videoStage=$('#video-stage');

let toastTimer;function toast(message){const el=$('#toast-modal');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800);}

/* ── Timeline structure ─────────────────────────────────────── */

const chapters=[['LIFE SCIENCE','방사선 융합기술 개발'],['EXPLORATION','양자빔 활용 과학기술'],['FUTURE ENERGY','선진 원자로 기술개발']];

// SVG dial numbers
const ns='http://www.w3.org/2000/svg';const numbers=Array.from({length:4},(_,i)=>{const g=document.createElementNS(ns,'g'),c=document.createElementNS(ns,'circle'),t=document.createElementNS(ns,'text');c.setAttribute('r','6');c.setAttribute('stroke','currentColor');c.setAttribute('fill','none');t.setAttribute('x','16');t.setAttribute('y','29');t.setAttribute('class','dial-number');t.textContent=`0${i}.`;g.append(c,t);$('#dial-numbers').append(g);return g;});

let unit=500,s=1,ox=0,oy=0,w=0,h=0,dpr=1,position=0,target=0,lastTime=0,raf=0,menuExit=0;

// Cumulative scroll positions
let cumulative=[];
let LAST=0;
let endingScrollStart=0;
let totalHeight=0;
const ENDING_UNITS = 7.26; // 0.4 video fade out + 0.3 text fade in + 6.0 text hold + 0.24 text fade out + 0.32 gradient & circle entrance (80% transition)

function rebuildTimeline(){
 const videoUnits = VideoScrubber.totalScrollUnits;
 cumulative=[0];
 // Video section: mapped to videoUnits
 const videoScrollPx = videoUnits * unit;
 cumulative.push(cumulative.at(-1) + videoScrollPx);
 // Ending section: 7.26 scroll units
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
 if(overrun <= 6.7) return 1.0; // Opaque solid black (#000) during video fade & text hold
 return 1 - smooth(clamp((overrun - 6.7) / 0.56));
}

function getGradientBackground(t) {
 t = clamp(t);
 if (t <= 0) return 'rgb(0,0,0)';
 if (t >= 1) return 'rgb(255,255,255)';
 
 // 7 smooth vertical stops from top (0%) to bottom (100%)
 const stops = [0, 0.15, 0.35, 0.5, 0.65, 0.85, 1.0];
 const cssStops = stops.map(y => {
  // As t increases from 0 to 1, white wave moves from bottom (y=1) up to top (y=0)
  const raw = (t * 1.7 - (1 - y) * 1.1) / 0.6;
  const l = smooth(clamp(raw));
  const val = Math.round(255 * l);
  return `rgb(${val},${val},${val}) ${Math.round(y * 100)}%`;
 });
 return `linear-gradient(to bottom, ${cssStops.join(', ')})`;
}

/* ── Dial & Text (video-aware) ─────────────────────────────── */
function drawDialVideo(p){
 const state = VideoScrubber.getDialState(p);
 if(state && state.visible){
  $('#dial-category').textContent = state.category || '';
  $('#dial-title').textContent = state.title || '';
  visible(desc, state.descAlpha);
  desc.inert = state.descAlpha < 0.5;
  numbers.forEach((g, i) => {
   g.classList.toggle('is-active', i + 1 === state.chapter);
  });
  visible(dial, state.dialAlpha);
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

 if (overrun > 6.7) {
  const gradT = clamp((overrun - 6.7) / 0.56);
  bg.style.background = getGradientBackground(gradT);
  // Header theme according to top area brightness
  const topL = smooth(clamp((gradT * 1.7 - 1.1) / 0.6));
  document.body.classList.toggle('theme-dark', topL <= 0.45);
  document.body.classList.toggle('theme-light', topL > 0.45);
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
 VideoScrubber.update(position);

 // Initial atom text fade out
 visible(text, 1 - smooth((position - 0.1) / 0.6));
 text.style.transform=`translateY(${-smooth((position - 0.1) / 0.6)*18}px)`;

 // Dial & Description
 if(isInVideoRegion){
  drawDialVideo(position);
 } else {
  visible(dial,0); visible(desc,0); desc.inert=true;
 }

 // Ending text (shown ONLY on solid black after video 10 is completely hidden)
 let endingAlpha = 0;
 if (overrun > 0.4 && overrun <= 6.94) {
  if (overrun <= 0.7) {
   endingAlpha = smooth((overrun - 0.4) / 0.3); // Fade in (0.4 to 0.7)
  } else if (overrun <= 6.7) {
   endingAlpha = 1.0; // Fixed readable hold section (0.7 to 6.7, 6.0 units hold)
  } else {
   endingAlpha = 1.0 - smooth((overrun - 6.7) / 0.24); // Fade out (6.7 to 6.94)
  }
 }
 visible(ending, endingAlpha);

 // Circular menu section entrance, hold and exit
 const menuRect = menu.getBoundingClientRect();
 const menuScroll = -menuRect.top;
 const holdPx = h * 1.5; // 1.5x viewport height hold section
 const exitPx = h * 1.0; // 1.0x viewport height exit section

 if (menuScroll <= 0) {
  const entranceProgress = overrun >= 6.7 ? clamp((overrun - 6.7) / 0.56) : 0;
  renderEntrance(entranceProgress);
 } else if (menuScroll <= holdPx) {
  // PERFECT PINNED HOLD: All circles 100% visible & fully interactive
  renderEntrance(1.0);
 } else {
  // Exit after hold section is completed
  const exitProgress = clamp((menuScroll - holdPx) / exitPx);
  renderExit(exitProgress);
 }

 // Scroll indicator
 const indicator=$('#scroll-indicator');
 const videoScrollHidden = VideoScrubber.isScrollIndicatorHidden(position) || overrun > 0.1;
 const pastMenu = scrollY>menu.offsetTop+holdPx+h*.3;
 indicator.style.opacity = (pastMenu || videoScrollHidden) ? '0' : '1';
 $('.scroll-text').textContent=position<.8?'스크롤하여 원자의 흐름을 따라가세요.':'스크롤';

 // Theme override: when scroll reaches circular menu (white background)
 if(scrollY >= hero.offsetHeight - h - 5){
  document.body.classList.remove('theme-dark');
  document.body.classList.add('theme-light');
 }

 $('#atom-fallback').hidden=true;

 const totalInteractiveHeight = hero.offsetHeight + holdPx + exitPx + h;
 if(scrollY < totalInteractiveHeight || Math.abs(position-target) > .001) raf = requestAnimationFrame(render);
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
 const elRecord={wrap,exit,float:floatEl,circle,button,detail,index,isHovered:false};
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

function renderEntrance(t){
 t = clamp(t);
 els.forEach(e => {
  const yNorm = clamp(e.y / 1024); // 0 (top) ~ 1 (bottom)
  const startT = (1 - yNorm) * 0.40;
  const endT = startT + 0.60;
  const itemProgress = smooth(clamp((t - startT) / (endT - startT)));
  const startOffsetY = 280 + (e.index % 5) * 60;
  e.exit.style.transform = `translateY(${Math.round((1 - itemProgress) * startOffsetY)}px)`;
  e.exit.style.opacity = String(itemProgress);
 });
 small.forEach((e, i) => {
  const yNorm = clamp(e.y / 1024);
  const startT = (1 - yNorm) * 0.40;
  const endT = startT + 0.60;
  const itemProgress = smooth(clamp((t - startT) / (endT - startT)));
  const startOffsetY = 320 + (i % 4) * 70;
  e.exit.style.transform = `translateY(${Math.round((1 - itemProgress) * startOffsetY)}px)`;
  e.exit.style.opacity = String(itemProgress);
 });
}

function renderExit(p){
 els.forEach(e=>{e.exit.style.transform=`translateY(${-p*(220+(e.index%5)*65)}px)`;e.exit.style.opacity=1-smooth((p-.45)/.55);});
 small.forEach((e,i)=>{e.exit.style.transform=`translateY(${-p*(310+i%4*70)}px)`;e.exit.style.opacity=1-smooth((p-.4)/.6);});
}
menu.addEventListener('click',e=>{if(!e.target.closest('.menu-circle'))deselect();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){const old=selected;deselect();if(old)els.get(old).button.focus({preventScroll:true});}});addEventListener('scroll',()=>{if(selected&&Math.abs(scrollY-selectedAtY)>.5)deselect();wake();},{passive:true});
function openMenu(id){deselect();window.scrollTo({top:menu.offsetTop,behavior:'auto'});wake();if(id&&els.has(id)){select(id);els.get(id).button.focus({preventScroll:true});}}
$('#hamburger-btn').addEventListener('click',()=>openMenu());$('.lang-btn').addEventListener('click',()=>toast('영문 페이지는 준비 중입니다.'));$('#dial-detail-btn').addEventListener('click',()=>toast('해당 연구 상세 페이지는 아직 연결되지 않았습니다.'));document.querySelectorAll('.shortcut-sns-widget button').forEach(b=>b.addEventListener('click',()=>toast(b.getAttribute('aria-label')+' 링크는 아직 연결되지 않았습니다.')));
document.querySelectorAll('.header a,.shortcut-bar a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const hash=a.getAttribute('href');if(hash==='#home'){goFrame(0);return;}openMenu(hash.replace('#menu-','').replace('#',''));}));
addEventListener('resize',()=>{setupSize();position=target=getPosition(scrollY);wake();});document.addEventListener('visibilitychange',()=>{lastTime=0;wake();});reduced.addEventListener('change',wake);

/* ── Init ───────────────────────────────────────────────────── */
VideoScrubber.init(videoStage, bg);
setupSize();position=target=getPosition(scrollY);wake();

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
