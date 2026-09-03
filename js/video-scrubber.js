/* ─────────────────────────────────────────────────────────────
   video-scrubber.js  –  Scroll-scrubbed Video Engine
   Manages 9 MP4 segments tied to scroll position.
   Replaces StoryRenderer / StoryGeometry / KaeriEnergy for the
   black-background hero section.

   Public API
     VideoScrubber.init(container, bgLayer)
     VideoScrubber.update(position, dt)
     VideoScrubber.resize()
     VideoScrubber.getBlackness(position)
     VideoScrubber.isScrollIndicatorHidden(position)
     VideoScrubber.getDialState(position)
     VideoScrubber.totalScrollUnits  (read-only)
     VideoScrubber.VIDEO_START       frame where videos begin
   ───────────────────────────────────────────────────────────── */
window.VideoScrubber = (() => {
 'use strict';

 /* ── Configuration ─────────────────────────────────────────── */

 const VIDEOS = [
  { src: 'assets/videos/hero-01-atom-to-mri.mp4',   scrollWeight: 2.4 },
  { src: 'assets/videos/hero-02-mri-to-space.mp4',   scrollWeight: 2.8 },
  { src: 'assets/videos/hero-03-space-to-smr.mp4',   scrollWeight: 2.8 },
  { src: 'assets/videos/hero-04-smr-to-head.mp4',    scrollWeight: 2.4 },
  { src: 'assets/videos/hero-05-head-to-heart.mp4',  scrollWeight: 2.4 },
  { src: 'assets/videos/hero-06-heart-to-hand.mp4',  scrollWeight: 2.4 },
  { src: 'assets/videos/hero-07-hands-touch.mp4',    scrollWeight: 3.0 },
  { src: 'assets/videos/hero-08-handshake.mp4',      scrollWeight: 3.0 },
  { src: 'assets/videos/hero-09-energy-transfer.mp4', scrollWeight: 3.0 },
 ];

 const VIDEO_START = 7; // after atom fission completes

 const UI_CONFIG = {
  // Dial visibility: MRI, Space, SMR scenes
  // The video file itself contains the dial graphics (circle + 01., 02., 03. numbers),
  // so SVG #left-dial is hidden to prevent duplication. Only text/button (#dial-text-box) is displayed.
  dial: [
   { video: 0, startTime: 5.0, endTime: 8.0, chapter: 1, showDesc: false },
   { video: 1, startTime: 0.0, endTime: 3.0, chapter: 1, showDesc: true  },
   { video: 1, startTime: 3.0, endTime: 8.0, chapter: 2, showDesc: false },
   { video: 2, startTime: 0.0, endTime: 5.0, chapter: 2, showDesc: true  },
   { video: 2, startTime: 5.0, endTime: 8.0, chapter: 3, showDesc: false },
   { video: 3, startTime: 0.0, endTime: 3.0, chapter: 3, showDesc: true  },
  ],
  blacknessRamp: { video: 0, startTime: 0.5, endTime: 3.5 },
  scrollIndicatorHidden: [
   { video: 0, startTime: 0.0, endTime: 2.5 },
  ],
 };

 /* ── State ──────────────────────────────────────────────────── */

 let container = null;
 let bgLayer = null;
 const videoEls = [];
 const durations = VIDEOS.map(() => 8.0); // 8.0s initial fallback duration
 let ready = false;
 let currentVideoIndex = -1;
 let totalScrollUnits = 0;
 let segmentStarts = [];
 let seekTarget = -1;
 let seekVideoIdx = -1;


 const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
 const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };

 /* ── Initialization ────────────────────────────────────────── */

 function init(containerEl, bgLayerEl) {
  container = containerEl;
  bgLayer = bgLayerEl;

  computeSegments();
  ready = true; // Set ready immediately so scroll scrubbing works from frame 1

  VIDEOS.forEach((cfg, i) => {
   const video = document.createElement('video');
   video.muted = true;
   video.playsInline = true;
   video.preload = 'auto';
   video.src = cfg.src; // Direct src assignment for instant browser media load
   video.setAttribute('playsinline', '');
   video.setAttribute('muted', '');
   video.removeAttribute('controls');
   video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;pointer-events:none;opacity:0;will-change:opacity;z-index:0;visibility:hidden;';

   video.addEventListener('loadedmetadata', () => {
    if (video.duration && !isNaN(video.duration) && video.duration > 0) {
     durations[i] = video.duration;
     computeSegments();
    }
   });

   video.addEventListener('canplay', () => {
    if (seekVideoIdx === i && seekTarget >= 0) {
     applySeek();
    }
   });

   video.addEventListener('seeked', () => {
    if (seekVideoIdx === i) applySeek();
   });

   video.addEventListener('error', (e) => {
    const status = document.getElementById('video-load-status');
    if (status) { status.hidden = false; status.textContent = '영상 파일을 불러오지 못했습니다: ' + cfg.src; }
    console.warn(`[VideoScrubber] Error loading video ${i}: ${cfg.src}`, e);
   });

   videoEls.push(video);
   container.appendChild(video);
   
   // Trigger browser media pipeline load
   try { video.load(); } catch (err) { /* ignore */ }
  });
 }

 function computeSegments() {
  const totalWeight = VIDEOS.reduce((s, v) => s + v.scrollWeight, 0);
  segmentStarts = [0];
  VIDEOS.forEach((v, i) => {
   segmentStarts.push(segmentStarts[i] + v.scrollWeight);
  });
  totalScrollUnits = totalWeight;
 }

 function resize() {
  // CSS object-fit:contain handles video sizing automatically.
 }

 /* ── Update (called every render frame) ─────────────────────── */

 function update(position) {
  if (!ready || !container) return;

  const videoPos = position - VIDEO_START;
  if (videoPos < -0.3 || videoPos > totalScrollUnits + 0.5) {
   hideAll();
   currentVideoIndex = -1;
   return;
  }

  const clampedPos = clamp(videoPos, 0, totalScrollUnits);

  let vidIdx = 0;
  for (let i = 0; i < VIDEOS.length; i++) {
   if (clampedPos >= segmentStarts[i] && clampedPos < segmentStarts[i + 1]) {
    vidIdx = i;
    break;
   }
   if (i === VIDEOS.length - 1) vidIdx = i;
  }

  const segStart = segmentStarts[vidIdx];
  const segEnd = segmentStarts[vidIdx + 1];
  const segProgress = clamp((clampedPos - segStart) / (segEnd - segStart));

  const targetTime = segProgress * (durations[vidIdx] || 8.0);

  // Show active video and hide inactive ones with z-index stacking
  switchToVideo(vidIdx);

  container.style.opacity = String(getVideoOpacity(position));

  // Seek video to target time
  seekVideoIdx = vidIdx;
  seekTarget = targetTime;
  applySeek();

  preloadAdjacent(vidIdx);
 }

 function applySeek() {
  if (seekVideoIdx < 0 || seekTarget < 0) return;
  const video = videoEls[seekVideoIdx];
  if (!video) return;

  if (video.readyState < 1 || !Number.isFinite(video.duration)) return;
  const dur = video.duration;
  const t = clamp(seekTarget, 0, dur - 0.01);

  if (Math.abs(video.currentTime - t) > 0.015) {
   if (!video.seeking) {
    try {
     video.currentTime = t;
    } catch (err) {
     /* ignore seeking errors on uninitialized media */
    }
   }
  }
 }

 function switchToVideo(idx) {
  if (currentVideoIndex === idx) return;

  videoEls.forEach((v, i) => {
   if (i === idx) {
    v.style.zIndex = '2';
    v.style.visibility = 'visible';
    v.style.opacity = '1';
   } else if (i === currentVideoIndex) {
    v.style.zIndex = '1';
    requestAnimationFrame(() => {
     if (currentVideoIndex !== i) {
      v.style.opacity = '0';
      v.style.visibility = 'hidden';
      v.style.zIndex = '0';
     }
    });
   } else {
    v.style.zIndex = '0';
    v.style.opacity = '0';
    v.style.visibility = 'hidden';
   }
  });

  currentVideoIndex = idx;
 }

 function hideAll() {
  videoEls.forEach(v => {
   v.style.opacity = '0';
   v.style.visibility = 'hidden';
   v.style.zIndex = '0';
  });
 }

 function preloadAdjacent(idx) {
  videoEls.forEach((v, i) => {
   if (i === idx || i === idx - 1 || i === idx + 1) {
    v.preload = 'auto';
   }
  });
 }

 /* ── Blackness (background color) ───────────────────────────── */

 function getBlackness(position) {
  const videoPos = position - VIDEO_START;
  if (videoPos < 0) return 0;
  if (!ready) return 0;

  const ramp = UI_CONFIG.blacknessRamp;
  if (videoPos < segmentStarts[1]) {
   const segProgress = clamp(videoPos / (segmentStarts[1] || 1));
   const currentTime = segProgress * (durations[0] || 8.0);
   const t = clamp((currentTime - ramp.startTime) / (ramp.endTime - ramp.startTime));
   return smooth(t);
  }

  if (videoPos < totalScrollUnits) return 1;

  const overrun = videoPos - totalScrollUnits;
  return 1 - smooth(clamp(overrun / 0.5));
 }

 /* ── Dial State ─────────────────────────────────────────────── */

 function getDialState(position) {
  const videoPos = position - VIDEO_START;
  if (!ready || videoPos < 0 || videoPos > totalScrollUnits) {
   return { visible: false, descVisible: false, chapter: 1, dialAlpha: 0, descAlpha: 0 };
  }

  let vidIdx = 0;
  for (let i = 0; i < VIDEOS.length; i++) {
   if (videoPos >= segmentStarts[i] && videoPos < segmentStarts[i + 1]) {
    vidIdx = i;
    break;
   }
   if (i === VIDEOS.length - 1) vidIdx = i;
  }

  const segProgress = clamp((videoPos - segmentStarts[vidIdx]) / (segmentStarts[vidIdx + 1] - segmentStarts[vidIdx]));
  const currentTime = segProgress * (durations[vidIdx] || 8.0);

  let dialVisible = 0;
  let descVisible = 0;
  let chapter = 1;

  for (const d of UI_CONFIG.dial) {
   if (d.video === vidIdx && currentTime >= d.startTime && currentTime <= d.endTime) {
    const fadeIn = smooth(clamp((currentTime - d.startTime) / 0.5));
    const fadeOut = smooth(clamp((d.endTime - currentTime) / 0.5));
    const alpha = Math.min(fadeIn, fadeOut);
    dialVisible = Math.max(dialVisible, alpha);
    if (d.showDesc) descVisible = Math.max(descVisible, alpha);
    chapter = d.chapter;
   }
  }

  return { visible: dialVisible > 0.01, descVisible: descVisible > 0.01, chapter, dialAlpha: dialVisible, descAlpha: descVisible };
 }

 function isScrollIndicatorHidden(position) {
  const videoPos = position - VIDEO_START;
  if (!ready || videoPos < 0 || videoPos > totalScrollUnits) return false;

  let vidIdx = 0;
  for (let i = 0; i < VIDEOS.length; i++) {
   if (videoPos >= segmentStarts[i] && videoPos < segmentStarts[i + 1]) {
    vidIdx = i;
    break;
   }
   if (i === VIDEOS.length - 1) vidIdx = i;
  }

  const segProgress = clamp((videoPos - segmentStarts[vidIdx]) / (segmentStarts[vidIdx + 1] - segmentStarts[vidIdx]));
  const currentTime = segProgress * (durations[vidIdx] || 8.0);

  for (const range of UI_CONFIG.scrollIndicatorHidden) {
   if (range.video === vidIdx && currentTime >= range.startTime && currentTime <= range.endTime) {
    return true;
   }
  }
  return false;
 }

 function getVideoOpacity(position) {
  if (!ready) return 0;
  const videoPos = position - VIDEO_START;
  if (videoPos < -0.3) return 0;
  if (videoPos > totalScrollUnits) return 1 - smooth((videoPos - totalScrollUnits) / 0.5);
  if (videoPos > 0.3) return 1;
  return smooth((videoPos + 0.3) / 0.6);
 }

 function getVideoProgress(position) {
  if (!ready) return 0;
  const videoPos = position - VIDEO_START;
  return clamp(videoPos / totalScrollUnits);
 }

 function getCurrentInfo(position) {
  const videoPos = position - VIDEO_START;
  if (!ready || videoPos < 0 || videoPos > totalScrollUnits) return null;

  let vidIdx = 0;
  for (let i = 0; i < VIDEOS.length; i++) {
   if (videoPos >= segmentStarts[i] && videoPos < segmentStarts[i + 1]) {
    vidIdx = i;
    break;
   }
   if (i === VIDEOS.length - 1) vidIdx = i;
  }

  const segProgress = clamp((videoPos - segmentStarts[vidIdx]) / (segmentStarts[vidIdx + 1] - segmentStarts[vidIdx]));
  const currentTime = segProgress * (durations[vidIdx] || 8.0);
  return { videoIndex: vidIdx, currentTime, segProgress, duration: durations[vidIdx] || 8.0 };
 }

 function getDialRotation(position) {
  const state = getDialState(position);
  if (!state.visible) return 0;
  const videoPos = position - VIDEO_START;
  const normalizedProgress = clamp(videoPos / totalScrollUnits);
  return (state.chapter - 1) + smooth(clamp((normalizedProgress - 0.05) / 0.4));
 }

 return {
  init,
  update,
  resize,
  getBlackness,
  getDialState,
  getDialRotation,
  isScrollIndicatorHidden,
  getVideoOpacity,
  getVideoProgress,
  getCurrentInfo,
  get totalScrollUnits() { return totalScrollUnits || 24.2; },
  get ready() { return ready; },
  VIDEO_START,
  VIDEOS,
  UI_CONFIG,
 };
})();
