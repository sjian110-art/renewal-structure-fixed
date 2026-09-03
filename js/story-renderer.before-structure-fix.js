/* ─────────────────────────────────────────────────────────────
   story-renderer.js  –  Procedural Canvas 2D Story Engine
   Continuous particle morphing, geometric wireframes, flow-fields,
   and dynamic color transitions across black1 ~ black23 scenes.

   Replaces static PNG cross-fading with 1,400 persistent particles &
   interactive wireframe morphing for MRI, Space, SMR, & Hands.
   ───────────────────────────────────────────────────────────── */
window.StoryRenderer = (() => {
 'use strict';

 const TAU = Math.PI * 2;
 const { sin, cos, sqrt, abs, min, max, round, floor, atan2 } = Math;
 const clamp = (v, lo = 0, hi = 1) => max(lo,min(hi, v));
 const sm = v => { v = clamp(v); return v * v * (3 - 2 * v); };
 const lerp = (a, b, t) => a + (b - a) * t;

 /* ── Seeded PRNG ────────────────────────────────────────────── */
 let _s = 4321;
 function rng() {
  _s |= 0; _s = _s + 0x6D2B79F5 | 0;
  let t = Math.imul(_s ^ _s >>> 15, 1 | _s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
 }

 const N = 1400; // Total main energy particles

 /* ── Color Helper ──────────────────────────────────────────── */
 function lerpColor(c1, c2, t) {
  return [
   round(lerp(c1[0], c2[0], t)),
   round(lerp(c1[1], c2[1], t)),
   round(lerp(c1[2], c2[2], t))
  ];
 }

 // Color Palettes
 // 0: Violet Atom (#8a2be2), 1: Teal MRI (#00f5d4), 2: Cosmic Purple (#9b59b6)
 // 3: SMR Blue (#00d2ff), 4: Human Cyan (#00e5ff), 5: Orange Hand (#ff7675)
 const PALETTES = [
  [138, 43, 226],  // 0: Deep Violet-Blue
  [0, 245, 212],   // 1: Bright Teal
  [155, 89, 182],  // 2: Royal Purple
  [0, 210, 255],   // 3: Energy Blue
  [0, 229, 255],   // 4: Human Cyan
  [255, 118, 117]  // 5: Warm Orange
 ];

 /* ── Target Shapes Anchor Generators ───────────────────────── */

 // 1. Atom Burst / Stream Flow (black1~2)
 function getAtomFlowPoints() {
  const pts = [];
  for (let i = 0; i < N; i++) {
   const a = rng() * TAU;
   const dist = 30 + Math.pow(rng(), 1.5) * 600;
   const speed = 0.5 + rng() * 1.5;
   pts.push({
    x: cos(a) * dist,
    y: sin(a) * dist * 0.5 + (rng() - 0.5) * 80,
    z: (rng() - 0.5) * 200,
    group: 0,
    speed
   });
  }
  return pts;
 }

 // 2. MRI Scanner (black3~5)
 function getMRIPoints() {
  const pts = [];
  // Outer / Inner Gantry Ring
  const nRing = 450;
  for (let i = 0; i < nRing; i++) {
   const a = (i / nRing) * TAU;
   const isOuter = i % 2 === 0;
   const r = isOuter ? 220 + (rng() - 0.5) * 12 : 160 + (rng() - 0.5) * 10;
   const z = (rng() - 0.5) * 120;
   pts.push({
    x: cos(a) * r + 150,
    y: sin(a) * r * 0.95 - 20,
    z,
    group: 1, // MRI Ring
    ringAngle: a
   });
  }

  // Patient Bed Platform (horizontal structure)
  const nBed = 300;
  for (let i = 0; i < nBed; i++) {
   const bx = -220 + (i / nBed) * 420;
   const by = 80 + (rng() - 0.5) * 18;
   const bz = (rng() - 0.5) * 100;
   pts.push({
    x: bx + 100,
    y: by,
    z: bz,
    group: 2 // MRI Bed
   });
  }

  // Organic Ambient Flow around MRI
  for (let i = pts.length; i < N; i++) {
   const a = rng() * TAU;
   const r = 260 + rng() * 250;
   pts.push({
    x: cos(a) * r + 80,
    y: sin(a) * r * 0.6,
    z: (rng() - 0.5) * 300,
    group: 0
   });
  }
  return pts;
 }

 // 3. Space Planet & Spacecraft (black6~8)
 function getSpacePoints() {
  const pts = [];
  // Central Planet Sphere (3D lat/lon)
  const nSphere = 400;
  for (let i = 0; i < nSphere; i++) {
   const phi = Math.acos(-1 + (2 * i) / nSphere);
   const theta = sqrt(nSphere * Math.PI) * phi;
   const r = 135;
   pts.push({
    x: r * sin(phi) * cos(theta) - 120,
    y: r * sin(phi) * sin(theta) - 10,
    z: r * cos(phi),
    group: 1 // Planet
   });
  }

  // Planetary Rings (2 tilted ellipses)
  const nRing = 350;
  for (let i = 0; i < nRing; i++) {
   const a = (i / nRing) * TAU;
   const r = (i % 2 === 0 ? 210 : 280) + (rng() - 0.5) * 15;
   const rx = cos(a) * r;
   const ry = sin(a) * r * 0.32;
   // Tilt transformation
   const tilt = 0.45;
   const x = rx * cos(tilt) - ry * sin(tilt) - 120;
   const y = rx * sin(tilt) + ry * cos(tilt) - 10;
   pts.push({
    x, y, z: (rng() - 0.5) * 80,
    group: 2 // Ring
   });
  }

  // Satellite / Spacecraft (Right side)
  const nCraft = 200;
  for (let i = 0; i < nCraft; i++) {
   const t = i / nCraft;
   // Wing + central body wireframe
   const cx = 280 + (t < 0.5 ? (t * 2 - 0.5) * 140 : 0);
   const cy = -60 + (t >= 0.5 ? (t * 2 - 1.5) * 120 : (rng() - 0.5) * 20);
   pts.push({
    x: cx,
    y: cy,
    z: (rng() - 0.5) * 60,
    group: 3 // Spacecraft
   });
  }

  // Cosmic Galaxy Vortex
  for (let i = pts.length; i < N; i++) {
   const a = rng() * TAU;
   const r = 100 + Math.pow(rng(), 1.2) * 550;
   pts.push({
    x: cos(a) * r,
    y: sin(a) * r * 0.7,
    z: (rng() - 0.5) * 250,
    group: 0
   });
  }
  return pts;
 }

 // 4. SMR Reactor Building (black9~12)
 function getSMRPoints() {
  const pts = [];
  // Central Dome Hemisphere
  const nDome = 380;
  for (let i = 0; i < nDome; i++) {
   const a = (i / nDome) * TAU * 4;
   const elev = (i / nDome) * (Math.PI / 2);
   const r = 140 * cos(elev);
   pts.push({
    x: cos(a) * r + 100,
    y: -sin(elev) * 140 + 60,
    z: sin(a) * r,
    group: 1 // Dome
   });
  }

  // Facility Cubes / Grid Wireframe
  const nGrid = 450;
  for (let i = 0; i < nGrid; i++) {
   const step = floor(i / 15);
   const gx = -220 + (step % 8) * 75;
   const gy = 60 + floor(step / 8) * 45;
   const gz = (rng() - 0.5) * 160;
   pts.push({
    x: gx,
    y: gy + (rng() - 0.5) * 10,
    z: gz,
    group: 2 // Building grid
   });
  }

  // Piping & Energy Nodes
  for (let i = pts.length; i < N; i++) {
   const a = rng() * TAU;
   const r = 80 + rng() * 450;
   pts.push({
    x: cos(a) * r + 50,
    y: sin(a) * r * 0.55 + 20,
    z: (rng() - 0.5) * 200,
    group: 0
   });
  }
  return pts;
 }

 // 5. Human & Heart Profile (black15~17)
 function getHumanPoints() {
  const pts = [];
  // Head & Neck Profile Outline
  const nHead = 350;
  for (let i = 0; i < nHead; i++) {
   const t = (i / nHead) * Math.PI;
   const hx = -150 + cos(t) * 90;
   const hy = -120 + sin(t) * 110;
   pts.push({
    x: hx,
    y: hy,
    z: (rng() - 0.5) * 40,
    group: 1 // Head
   });
  }

  // Beating Heart (Center-left chest)
  const nHeart = 300;
  for (let i = 0; i < nHeart; i++) {
   const t = (i / nHeart) * TAU;
   // Heart parametric formula
   const hx = 16 * Math.pow(sin(t), 3);
   const hy = -(13 * cos(t) - 5 * cos(2*t) - 2 * cos(3*t) - cos(4*t));
   pts.push({
    x: hx * 5 - 80,
    y: hy * 5 + 40,
    z: (rng() - 0.5) * 50,
    group: 2 // Heart
   });
  }

  // Extended Hand Line & Torso
  for (let i = pts.length; i < N; i++) {
   const t = (i - 650) / (N - 650);
   pts.push({
    x: -200 + t * 450,
    y: 80 + sin(t * 5) * 40 + (rng() - 0.5) * 30,
    z: (rng() - 0.5) * 120,
    group: 0
   });
  }
  return pts;
 }

 // 6. Blue Hand & Orange Hand Interaction (black18~22)
 function getHandsPoints() {
  const pts = [];
  const half = floor(N / 2);

  // Left Blue Hand (Arm reaching right)
  for (let i = 0; i < half; i++) {
   const finger = floor(i / 65) % 5;
   const progress = (i % 65) / 65;

   let x, y;
   if (i < 180) { // Palm & Wrist
    x = -320 + progress * 200;
    y = 30 + (rng() - 0.5) * 70;
   } else { // 5 Fingers
    const fAngle = -0.35 + finger * 0.18;
    const len = 110 + (finger === 2 ? 25 : finger === 0 ? -15 : 0);
    x = -120 + cos(fAngle) * progress * len;
    y = 20 + sin(fAngle) * progress * len + (finger - 2) * 12;
   }

   pts.push({
    x, y,
    z: (rng() - 0.5) * 50,
    hand: 'blue',
    finger,
    origIndex: i
   });
  }

  // Right Orange Hand (Arm reaching left)
  for (let i = half; i < N; i++) {
   const relI = i - half;
   const finger = floor(relI / 65) % 5;
   const progress = (relI % 65) / 65;

   let x, y;
   if (relI < 180) { // Palm & Wrist
    x = 320 - progress * 200;
    y = 30 + (rng() - 0.5) * 70;
   } else { // 5 Fingers
    const fAngle = Math.PI + 0.35 - finger * 0.18;
    const len = 110 + (finger === 2 ? 25 : finger === 0 ? -15 : 0);
    x = 120 + cos(fAngle) * progress * len;
    y = 20 - sin(fAngle) * progress * len + (finger - 2) * 12;
   }

   pts.push({
    x, y,
    z: (rng() - 0.5) * 50,
    hand: 'orange',
    finger,
    origIndex: i
   });
  }

  return pts;
 }

 /* ── Persistent Particle System Initialization ──────────────── */
 const SHAPES = [
  getAtomFlowPoints(), // 0: Atom Flow
  getMRIPoints(),      // 1: MRI
  getSpacePoints(),    // 2: Space
  getSMRPoints(),      // 3: SMR
  getHumanPoints(),    // 4: Human/Heart
  getHandsPoints()     // 5: Hands Interaction
 ];

 // Persistent particles state array
 const particles = Array.from({ length: N }, (_, i) => ({
  id: i,
  x: SHAPES[0][i].x,
  y: SHAPES[0][i].y,
  z: SHAPES[0][i].z,
  vx: (rng() - 0.5) * 2,
  vy: (rng() - 0.5) * 2,
  size: 1.2 + rng() * 2.6,
  jitterSpeed: 0.5 + rng() * 1.5,
  jitterPhase: rng() * TAU
 }));

 /* ── Main Draw Function ─────────────────────────────────────── */
 function draw(ctx, pos, t, cx, cy, sc, dark, still) {
  // Only execute within story scene range (frame 6.0 ~ 29.5)
  if (pos < 5.8 || pos > 29.2 || sc < 0.001) return;

  ctx.save();
  ctx.translate(cx, cy);

  /* ── 1. Map Position (6.0 ~ 29.0) to Story Stages ─────────── */
  // Keyframe Mapping:
  // pNorm: 0.0 (frame 6) -> 1.0 (frame 29)
  const pNorm = clamp((pos - 6.0) / 23.0);

  // Determine interpolation between shape indices [0 .. 5]
  // 0: AtomFlow (pNorm 0.0~0.1)
  // 1: MRI (pNorm 0.15~0.3)  -> Peak at frame 10 (pos 10)
  // 2: Space (pNorm 0.32~0.48) -> Peak at frame 13 (pos 13)
  // 3: SMR (pNorm 0.5~0.62) -> Peak at frame 17 (pos 17)
  // 4: Human (pNorm 0.65~0.78) -> Peak at frame 21 (pos 21)
  // 5: Hands (pNorm 0.8~1.0) -> Peak & Absorption (pos 24~28)

  let stageA = 0, stageB = 0, stageT = 0;
  if (pNorm < 0.15) {
   stageA = 0; stageB = 1; stageT = sm(pNorm / 0.15);
  } else if (pNorm < 0.32) {
   stageA = 1; stageB = 2; stageT = sm((pNorm - 0.24) / 0.08);
  } else if (pNorm < 0.50) {
   stageA = 2; stageB = 3; stageT = sm((pNorm - 0.40) / 0.10);
  } else if (pNorm < 0.68) {
   stageA = 3; stageB = 4; stageT = sm((pNorm - 0.58) / 0.10);
  } else {
   stageA = 4; stageB = 5; stageT = sm((pNorm - 0.72) / 0.12);
  }

  /* ── 2. Palette Color Interpolation ────────────────────────── */
  let palA = PALETTES[0], palB = PALETTES[1];
  if (pNorm < 0.18)      { palA = PALETTES[0]; palB = PALETTES[1]; } // Violet -> Teal (MRI)
  else if (pNorm < 0.38) { palA = PALETTES[1]; palB = PALETTES[2]; } // Teal -> Purple (Space)
  else if (pNorm < 0.56) { palA = PALETTES[2]; palB = PALETTES[3]; } // Purple -> Blue (SMR)
  else if (pNorm < 0.75) { palA = PALETTES[3]; palB = PALETTES[4]; } // Blue -> Cyan (Human)
  else                   { palA = PALETTES[4]; palB = PALETTES[4]; }

  const colCurrent = lerpColor(palA, palB, stageT);

  /* ── 3. Special Absorption Progress for Hands (pos 24~28) ─── */
  const absorptionT = sm(clamp((pos - 24.0) / 4.0));

  /* ── 4. Render Wireframe Connections for Key Structures ───── */
  const strokeAlpha = (1 - abs(stageT - 0.5) * 1.6) * 0.35;
  if (strokeAlpha > 0.02) {
   ctx.strokeStyle = `rgba(${colCurrent[0]},${colCurrent[1]},${colCurrent[2]},${strokeAlpha})`;
   ctx.lineWidth = 0.8 * sc;

   // Draw structural links for MRI / SMR / Space
   const shapePtsA = SHAPES[stageA];
   const shapePtsB = SHAPES[stageB];

   ctx.beginPath();
   for (let i = 0; i < 280; i += 4) {
    const pt1A = shapePtsA[i], pt1B = shapePtsB[i];
    const pt2A = shapePtsA[i + 1], pt2B = shapePtsB[i + 1];

    const x1 = lerp(pt1A.x, pt1B.x, stageT) * sc;
    const y1 = lerp(pt1A.y, pt1B.y, stageT) * sc;
    const x2 = lerp(pt2A.x, pt2B.x, stageT) * sc;
    const y2 = lerp(pt2A.y, pt2B.y, stageT) * sc;

    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
   }
   ctx.stroke();
  }

  /* ── 5. Particle Position & Render Loop ────────────────────── */
  const pulse = still ? 1 : 1 + 0.04 * sin(t * 3.0);
  const rotAngle = still ? 0 : t * 0.15; // Slow ambient rotation

  particles.forEach((p, i) => {
   const ptA = SHAPES[stageA][i];
   const ptB = SHAPES[stageB][i];

   // Base interpolated target position
   let targetX = lerp(ptA.x, ptB.x, stageT);
   let targetY = lerp(ptA.y, ptB.y, stageT);
   let targetZ = lerp(ptA.z, ptB.z, stageT);

   // Idle motion (Time-based vector offset)
   if (!still) {
    targetX += sin(t * p.jitterSpeed + p.jitterPhase) * 3.5;
    targetY += cos(t * p.jitterSpeed * 0.8 + p.jitterPhase) * 3.0;

    // Stage specific idle motions
    if (stageA === 2 || stageB === 2) { // Space rotation
     const rx = targetX * cos(rotAngle) - targetZ * sin(rotAngle);
     const rz = targetX * sin(rotAngle) + targetZ * cos(rotAngle);
     targetX = rx; targetZ = rz;
    } else if (stageA === 4 || stageB === 4) { // Heartbeat
     if (ptA.group === 2 || ptB.group === 2) {
      targetX *= 1 + 0.08 * sin(t * 5.0);
      targetY *= 1 + 0.08 * sin(t * 5.0);
     }
    }
   }

   // Hand Absorption Behavior (Blue hand particles flowing into Orange hand)
   let pColor = colCurrent;
   if (stageB === 5) {
    if (ptB.hand === 'orange') {
     pColor = PALETTES[5]; // Orange Hand
    } else { // Blue Hand
     pColor = PALETTES[4]; // Blue Hand
     if (absorptionT > 0.01) {
      // Flow towards orange hand (Rightwards + dissolve)
      const flowT = clamp((absorptionT - (i % 100) * 0.008) / 0.4);
      if (flowT > 0) {
       const destPt = SHAPES[5][(i + 700) % N];
       targetX = lerp(targetX, destPt.x, flowT);
       targetY = lerp(targetY, destPt.y + sin(flowT * Math.PI) * -60, flowT);
       // Color morphing to orange as it gets absorbed
       pColor = lerpColor(PALETTES[4], PALETTES[5], flowT);
      }
     }
    }
   }

   // Smooth particle position update towards target
   p.x = lerp(p.x, targetX, 0.25);
   p.y = lerp(p.y, targetY, 0.25);
   p.z = lerp(p.z, targetZ, 0.25);

   // Perspective 3D projection scale
   const pScale = sc * (1 + p.z / 1000) * pulse;
   const drawX = p.x * pScale;
   const drawY = p.y * pScale;
   const drawSz = p.size * pScale;

   // Render Particle Dot & Core Glow
   ctx.fillStyle = `rgb(${pColor[0]},${pColor[1]},${pColor[2]})`;
   ctx.beginPath();
   ctx.arc(drawX, drawY, drawSz, 0, TAU);
   ctx.fill();

   // Core bright highlight for center particles
   if (i % 5 === 0 && drawSz > 1.2) {
    ctx.fillStyle = `rgba(255,255,255,0.7)`;
    ctx.beginPath();
    ctx.arc(drawX - drawSz * 0.2, drawY - drawSz * 0.2, drawSz * 0.4, 0, TAU);
    ctx.fill();
   }
  });

  /* ── 6. Contact Focal Light Burst (Hands Contact pos 24~25) ── */
  if (pos >= 23.5 && pos <= 26.5) {
   const burstAlpha = sm(1 - abs(pos - 25.0) / 1.5) * 0.85;
   if (burstAlpha > 0.01) {
    ctx.fillStyle = `rgba(255, 235, 180, ${burstAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 20 * sc, 45 * sc * pulse, 0, TAU);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${burstAlpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(0, 20 * sc, 18 * sc, 0, TAU);
    ctx.fill();
   }
  }

  ctx.restore();
 }

 return { draw };
})();
