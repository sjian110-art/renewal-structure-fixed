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

 // Shape-indexed palettes: flow, MRI mint, space violet, SMR blue, human, hands.
 const PALETTES = [
  [138, 43, 226],  // 0: Deep Violet-Blue
  [151, 224, 222],   // 1: Bright Teal
  [185, 143, 245],  // 2: Royal Purple
  [89, 168, 255],   // 3: Energy Blue
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

 // Structural targets share the exact projection used by the visible mesh.
 function getMRIPoints() { return KaeriStoryGeometry.sample(1, N); }
 function getSpacePoints() { return KaeriStoryGeometry.sample(2, N); }
 function getSMRPoints() { return KaeriStoryGeometry.sample(3, N); }

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
  // Palette and geometry MUST share stage indices and interpolation.
  const palA = PALETTES[stageA], palB = PALETTES[stageB];

  const colCurrent = lerpColor(palA, palB, stageT);

  /* ── 3. Special Absorption Progress for Hands (pos 24~28) ─── */
  const absorptionT = sm(clamp((pos - 24.0) / 4.0));

  /* ── 4. Render Wireframe Connections for Key Structures ───── */
  const structureWeight = (stageA >= 1 && stageA <= 3 ? 1-stageT : 0)
                        + (stageB >= 1 && stageB <= 3 ? stageT : 0);
  ctx.globalAlpha = sm((pos-6)/0.9) * (1-sm((pos-28.5)/0.7));
  KaeriStoryGeometry.draw(ctx, stageA, 1-stageT, sc, colCurrent, still ? 0 : t);
  KaeriStoryGeometry.draw(ctx, stageB, stageT, sc, colCurrent, still ? 0 : t);

  /* ── 5. Particle Position & Render Loop ────────────────────── */
  const pulse = still ? 1 : 1 + (1-structureWeight) * 0.04 * sin(t * 3.0);

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

    // Structural particles stay anchored; only ambient particles drift.
    const anchored = lerp(ptA.group ? 1 : 0, ptB.group ? 1 : 0, stageT) * structureWeight;
    targetX -= sin(t * p.jitterSpeed + p.jitterPhase) * 3.5 * anchored * 0.90;
    targetY -= cos(t * p.jitterSpeed * 0.8 + p.jitterPhase) * 3.0 * anchored * 0.90;
    if (stageA === 4 && ptA.group === 2) {
     targetY += sin(t*5) * 3 * (1-stageT);
    }
   }

   // Hand Absorption Behavior (Blue hand particles flowing into Orange hand)
   let pColor = colCurrent;
   if (stageB === 5) {
    if (ptB.hand === 'orange') {
     pColor = lerpColor(colCurrent, PALETTES[5], stageT); // Orange Hand
    } else { // Blue Hand
     pColor = lerpColor(colCurrent, PALETTES[4], stageT); // Blue Hand
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

   // Scroll position is already smoothed by the main controller.
   // Direct evaluation keeps reverse scrolling independent of frame history.
   p.x = targetX;
   p.y = targetY;
   p.z = targetZ;

   // Perspective 3D projection scale
   const pScale = sc * (1 + p.z / 1000) * pulse;
   const drawX = p.x * pScale;
   const drawY = p.y * pScale;
   const drawSz = p.size * pScale * (1-structureWeight*0.73);

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
