/* ─────────────────────────────────────────────────────────────
   atom-renderer.js  –  Procedural Canvas 2D atom renderer
   Nucleus · Orbits · Particles each drawn & animated independently.
   No PNG dependency.  Scroll drives expansion / fission progress;
   a separate time axis drives idle pulse & orbital particle motion.

   Public API
     AtomRenderer.draw(ctx, progress, time, cx, cy, sc, dark, still)
       progress  0 – ~7   scroll position  (continuous)
       time      seconds  animation clock
       cx, cy    atom centre in CSS-pixel coords
       sc        viewport scale  (maps 1920×1024 ref → screen)
       dark      0 = white bg … 1 = black bg
       still     true  ⇒  prefers-reduced-motion
   ───────────────────────────────────────────────────────────── */
window.AtomRenderer = (() => {
 'use strict';

 /* ── Utilities ─────────────────────────────────────────────── */
 const TAU = Math.PI * 2;
 const {sin,cos,sqrt,abs,min,max,round,floor,atan2} = Math;
 const clamp = (v,lo=0,hi=1) => max(lo,min(hi,v));
 const sm    = v => { v = clamp(v); return v*v*(3-2*v); };
 const lerp  = (a,b,t) => a + (b-a)*t;

 /* ── Seeded PRNG (Mulberry-32, deterministic) ─────────────── */
 let _s = 7919;
 function rng(){
  _s|=0; _s=_s+0x6D2B79F5|0;
  let t=Math.imul(_s^_s>>>15,1|_s);
  t=t+Math.imul(t^t>>>7,61|t)^t;
  return((t^t>>>14)>>>0)/4294967296;
 }

 /* ── Fixed data (generated once at load, same every session) ─ */
 const GOLDEN = 2.399963;

 // 1 ▸ Nucleus cluster – 160 particles, golden-angle spiral
 const NUC = 160;
 const nuc = Array.from({length:NUC},(_,i)=>{
  const a=i*GOLDEN, r=sqrt((i+.5)/NUC);
  return {
   bx:cos(a)*r, by:sin(a)*r,
   sz:.7+rng()*2.1,  sh:.03+rng()*.28,
   jp:rng()*TAU, js:.6+rng()*1.3,
   side:cos(a)<0?-1:1
  };
 });

 // 2 ▸ Concentric-arc nucleus texture (9 arcs)
 const arcs = Array.from({length:9},(_,i)=>({
  r:2+i*2.6, st:rng()*TAU, len:1+rng()*3.5,
  w:.25+rng()*.5, op:.1+rng()*.28
 }));

 // 3 ▸ Radial rays (42)
 const NRAY=42;
 const rays = Array.from({length:NRAY},(_,i)=>{
  const a=(i/NRAY)*TAU+(rng()-.5)*.12, grp=floor(i/10);
  return {
   a, sL:15+rng()*18, lL:80+rng()*185,
   eSz:1.1+rng()*4.5, w:.22+rng()*.65,
   enter:grp*.22+rng()*.12, dash:rng()>.78,
   mids:Array.from({length:1+floor(rng()*3)},()=>({
    pos:.14+rng()*.6, sz:.6+rng()*2.2
   }))
  };
 });

 // 4 ▸ Elliptical orbits (12)
 const NORB=12, orbs=[];
 {
  const tilts=[.0,.55,-.42,1.12,-.78,.28,-1.18,.88,-.58,1.38,-.22,.72];
  for(let i=0;i<NORB;i++) orbs.push({
   a:125+i*28+rng()*30,  b:42+i*14+rng()*20,
   tilt:tilts[i]+(rng()-.5)*.14,
   w:.55+rng()*1.25, op:.18+rng()*.44,
   enter:2.5+i*.22+rng()*.08,
   wA:.7+rng()*1.4, wF:4+rng()*6
  });
 }

 // 5 ▸ Orbital particles (92)
 const NOP=92;
 const ops = Array.from({length:NOP},(_,i)=>{
  const oi=min(floor(i/7.7),NORB-1);
  return {
   oi, phase:rng()*TAU,
   spd:.09+rng()*.42, dir:rng()>.5?1:-1,
   sz:2.2+rng()*5.8, sh:.04+rng()*.22
  };
 });

 // 6 ▸ Ejected fission particles (60)
 const NEJ=60;
 const ejt = Array.from({length:NEJ},()=>({
  a:rng()*TAU, spd:140+rng()*560,
  sz:.6+rng()*2.3, delay:rng()*.35,
  trail:.035+rng()*.07
 }));

 // 7 ▸ Star / diamond decorations (28)
 const NSTR=28;
 const strs = Array.from({length:NSTR},()=>{
  const ag=rng()*TAU, d=65+rng()*400;
  return {
   x:cos(ag)*d, y:sin(ag)*d,
   sz:2+rng()*7, rot:rng()*Math.PI,
   enter:1.2+rng()*3.6, kind:rng()>.5?0:1
  };
 });

 // 8 ▸ Scattered atmosphere dots (68)
 const NDOT=68;
 const sdots = Array.from({length:NDOT},()=>{
  const ag=rng()*TAU, d=30+rng()*460;
  return {
   x:cos(ag)*d, y:sin(ag)*d,
   sz:.35+rng()*2.3, enter:rng()*3.8,
   sh:.06+rng()*.26
  };
 });

 /* ── Shape helpers ────────────────────────────────────────── */

 function star4(ctx,x,y,sz,rot){
  ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
  ctx.beginPath();
  for(let i=0;i<8;i++){
   const a=(i/8)*TAU, r=i%2===0?sz:sz*.26;
   ctx[i?'lineTo':'moveTo'](cos(a)*r,sin(a)*r);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
 }

 function diamond4(ctx,x,y,sz,rot){
  ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0,-sz); ctx.lineTo(sz*.3,0);
  ctx.lineTo(0,sz);  ctx.lineTo(-sz*.3,0);
  ctx.closePath(); ctx.fill(); ctx.restore();
 }

 /** 3-D sphere illusion: base + shadow-rim + highlight circle. */
 function sphere3d(ctx,x,y,r,shade,dk){
  const bc=max(0,min(255,round(lerp(shade*255,255-shade*185,dk))));
  const sc2=max(0,min(255,round(lerp(shade*140,255-shade*290,dk))));
  const hc=min(255,round(lerp(shade*255+105,255,dk)));
  ctx.fillStyle=`rgb(${bc},${bc},${bc})`;
  ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
  ctx.fillStyle=`rgba(${sc2},${sc2},${sc2},.35)`;
  ctx.beginPath(); ctx.arc(x+r*.08,y+r*.12,r*.82,0,TAU); ctx.fill();
  if(r>1.5){
   ctx.fillStyle=`rgba(${hc},${hc},${hc},.45)`;
   ctx.beginPath(); ctx.arc(x-r*.2,y-r*.24,r*.36,0,TAU); ctx.fill();
  }
 }

 /* ── Main draw ────────────────────────────────────────────── */

 function draw(ctx,p,t,cx,cy,sc,dk,still){
  if(p>7.2||sc<.001) return;
  p=max(0,p);
  ctx.save();
  ctx.translate(cx,cy);

  /* ── Common state ── */
  const pulse = still?1:1+.03*sin(t*2.5)+.012*sin(t*4.1);

  // Fission sub-phases (overlapping for smooth deformation)
  const elong   = sm(clamp((p-5.15)/.45));
  const neckP   = sm(clamp((p-5.35)/.35));
  const sepP    = sm(clamp((p-5.55)/.45));
  const burstP  = sm(clamp((p-5.8)/.7));
  const orbFade = 1-sm(clamp((p-5.45)/.7));
  const allFade = 1-sm(clamp((p-6.3)/.7));

  // Nucleus geometry
  const nucR    = (13+sm(clamp(p/5))*30)*sc*pulse;
  const dense   = sm(clamp((p-2)/2));        // 0=loose cluster, 1=tight sphere
  const sepDist = sepP*100*sc;

  // Base colour (dark↔light following background)
  const col  = round(lerp(40,220,dk));
  const colH = round(lerp(120,200,dk));

  /* ── 1  Scattered background dots ──────────────────────── */
  sdots.forEach(d=>{
   const al=sm(clamp((p-d.enter)/.6))*allFade;
   if(al<.01) return;
   const c=round(lerp(d.sh*255,255-d.sh*200,dk));
   ctx.fillStyle=`rgba(${c},${c},${c},${al})`;
   ctx.beginPath(); ctx.arc(d.x*sc,d.y*sc,d.sz*sc,0,TAU); ctx.fill();
  });

  /* ── 2  Star / diamond decorations ─────────────────────── */
  strs.forEach(s=>{
   const al=sm(clamp((p-s.enter)/.5))*allFade;
   if(al<.01) return;
   ctx.fillStyle=`rgba(${col},${col},${col},${al*.6})`;
   const sx=s.x*sc, sy=s.y*sc, ssz=s.sz*sc;
   s.kind===0 ? star4(ctx,sx,sy,ssz,s.rot)
              : diamond4(ctx,sx,sy,ssz,s.rot);
  });

  /* ── 3  Crosshair guide lines (stages 3+) ──────────────── */
  {
   const ca=sm(clamp((p-2.8)/.5))*orbFade*.065;
   if(ca>.004){
    ctx.strokeStyle=`rgba(${colH},${colH},${colH},${ca})`;
    ctx.lineWidth=.5*sc;
    ctx.beginPath(); ctx.moveTo(0,-360*sc); ctx.lineTo(0,360*sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-360*sc,0); ctx.lineTo(360*sc,0); ctx.stroke();
    ctx.setLineDash([4*sc,6*sc]);
    ctx.beginPath(); ctx.arc(0,0,78*sc,0,TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,135*sc,0,TAU); ctx.stroke();
    ctx.setLineDash([]);
   }
  }

  /* ── 4  Radial rays (stages 0–3) ───────────────────────── */
  {
   const rApp=sm(clamp(p/.5));
   const rFad=1-sm(clamp((p-2.2)/.8));
   if(rApp*rFad>.01){
    const lenF=sm(clamp((p-.2)/1.6));
    rays.forEach(r=>{
     const ea=sm(clamp((p-r.enter)/.4));
     const al=ea*rApp*rFad;
     if(al<.01) return;
     const len=lerp(r.sL,r.lL,lenF)*sc;
     const sR=nucR*.85;
     const c=cos(r.a), sn=sin(r.a);

     ctx.strokeStyle=`rgba(${col},${col},${col},${al*.5})`;
     ctx.lineWidth=r.w*sc;
     if(r.dash) ctx.setLineDash([3*sc,4*sc]);
     ctx.beginPath(); ctx.moveTo(c*sR,sn*sR); ctx.lineTo(c*len,sn*len); ctx.stroke();
     if(r.dash) ctx.setLineDash([]);

     ctx.fillStyle=`rgba(${col},${col},${col},${al*.72})`;
     const esz=r.eSz*sc*(.35+lenF*.65);
     ctx.beginPath(); ctx.arc(c*len,sn*len,esz,0,TAU); ctx.fill();

     r.mids.forEach(m=>{
      const ml=len*m.pos;
      ctx.beginPath(); ctx.arc(c*ml,sn*ml,m.sz*sc,0,TAU); ctx.fill();
     });
    });
   }
  }

  /* ── 5  Elliptical orbits (stages 3+) ──────────────────── */
  orbs.forEach(orb=>{
   const app=sm(clamp((p-orb.enter)/.6));
   const al=app*orbFade*orb.op;
   if(al<.01) return;

   const distX=1+elong*.25;
   const sa=orb.a*sc*app*distX;
   const sb=orb.b*sc*app*(1+elong*.1);
   const tl=orb.tilt+elong*.12;
   const cT=cos(tl), sT=sin(tl);

   ctx.strokeStyle=`rgba(${col},${col},${col},${al})`;
   ctx.lineWidth=orb.w*sc;

   const N=80;
   ctx.beginPath();
   for(let i=0;i<=N;i++){
    const th=(i/N)*TAU;
    const wv=(sin(th*orb.wF)*.55+sin(th*orb.wF*2.3+1)*.28)*orb.wA*sc*.22;
    const ex=(sa+wv)*cos(th), ey=(sb+wv*.4)*sin(th);
    const px=ex*cT-ey*sT, py=ex*sT+ey*cT;
    i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
   }
   ctx.closePath(); ctx.stroke();
  });

  /* ── 6  Nucleus particle cluster ───────────────────────── */
  {
   const nAl=allFade;
   if(nAl>.01){
    const lightA=-2.35;            // upper-left light source

    nuc.forEach(np=>{
     const jx=still?0:sin(t*np.js+np.jp)*1.2*sc;
     const jy=still?0:cos(t*np.js*.7+np.jp+1)*1.0*sc;

     let x=np.bx*nucR+jx;
     let y=np.by*nucR+jy;

     // Fission deformation: elongate → neck → separate
     if(elong>.001){
      x*=1+elong*.45;
      const cw=1-abs(np.bx)*.75;  // stronger narrowing near center
      y*=1-neckP*.42*cw;
      x+=np.side*sepDist;
     }

     const sz=np.sz*sc*pulse*lerp(.85,1.55,dense);

     // Directional shading for 3-D cluster illusion
     const dist=sqrt(np.bx*np.bx+np.by*np.by);
     const pA=atan2(np.by,np.bx);
     const lDot=cos(pA-lightA);
     const sOff=dense*lDot*.11;
     const eFad=dense*sm(clamp((dist-.62)/.38));

     const bSh=clamp(np.sh-dense*.08+sOff,0,.6);
     const c=round(lerp(bSh*255,255-bSh*185,dk));
     const a=nAl*(1-eFad*.5);
     if(a<.01) return;

     ctx.fillStyle=`rgba(${c},${c},${c},${a})`;
     ctx.beginPath(); ctx.arc(x,y,sz,0,TAU); ctx.fill();
    });

    // Concentric-arc texture (visible stages 0–3)
    const aAl=nAl*(1-dense)*(1-sepP*.7);
    if(aAl>.01){
     const cens=sepP>.04?[[-sepDist,0],[sepDist,0]]:[[0,0]];
     cens.forEach(([dx,dy])=>{
      arcs.forEach(arc=>{
       const r=arc.r*sc*pulse;
       ctx.strokeStyle=`rgba(${col},${col},${col},${arc.op*aAl})`;
       ctx.lineWidth=arc.w*sc;
       ctx.beginPath(); ctx.arc(dx,dy,r,arc.st,arc.st+arc.len); ctx.stroke();
      });
     });
    }

    // Specular highlight on the dense cluster (stages 3+)
    if(dense>.25 && sepP<.55){
     const hAl=dense*nAl*(1-sepP*1.8);
     if(hAl>.01){
      const hR=nucR*.22;
      const cens2=sepP>.04?[[-sepDist,0],[sepDist,0]]:[[0,0]];
      cens2.forEach(([dx,dy])=>{
       ctx.fillStyle=`rgba(255,255,255,${hAl*.45})`;
       ctx.beginPath();
       ctx.arc(dx-nucR*.17,dy-nucR*.2,hR,0,TAU);
       ctx.fill();
      });
     }
    }
   }
  }

  /* ── 7  Orbital particles (stages 3+) ──────────────────── */
  ops.forEach(op=>{
   const orb=orbs[op.oi];
   const app=sm(clamp((p-orb.enter-.15)/.5));
   const al=app*orbFade;
   if(al<.01) return;

   const distX=1+elong*.25;
   const sa=orb.a*sc*app*distX;
   const sb=orb.b*sc*app*(1+elong*.1);
   const tl=orb.tilt+elong*.12;

   const angle=op.phase+(still?0:t*op.spd*op.dir);
   const ex=sa*cos(angle), ey=sb*sin(angle);
   const cT=cos(tl), sT=sin(tl);
   const x=ex*cT-ey*sT, y=ex*sT+ey*cT;

   const sz=op.sz*sc*(.45+app*.55);
   ctx.globalAlpha=al;
   sphere3d(ctx,x,y,sz,op.sh,dk);
   ctx.globalAlpha=1;
  });

  /* ── 8  Ejected fission particles ──────────────────────── */
  if(burstP>.004){
   ejt.forEach(e=>{
    const tt=clamp((burstP-e.delay)/(1-e.delay));
    if(tt<.01) return;
    const d=e.spd*tt*sc;
    const x=cos(e.a)*d, y=sin(e.a)*d;
    const al=tt*(1-tt*tt)*.72*allFade;
    if(al<.01) return;

    // Trail
    ctx.strokeStyle=`rgba(${col},${col},${col},${al*.22})`;
    ctx.lineWidth=.5*sc;
    const td=d*(1-e.trail);
    ctx.beginPath();
    ctx.moveTo(cos(e.a)*td,sin(e.a)*td);
    ctx.lineTo(x,y); ctx.stroke();

    // Dot
    ctx.fillStyle=`rgba(${col},${col},${col},${al})`;
    ctx.beginPath(); ctx.arc(x,y,e.sz*sc,0,TAU); ctx.fill();
   });
  }

  ctx.restore();
 }

 return { draw };
})();
