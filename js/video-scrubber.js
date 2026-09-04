/* ─────────────────────────────────────────────────────────────
   video-scrubber.js  –  Continuous High-Performance Video Engine (hero-v2)
   Manages 10 MP4 segments from assets/videos/hero-v2/ tied to scroll position.
   Provides silky-smooth, continuous 60 FPS video scrubbing with non-blocking seek queuing.

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

  /* ── Configuration (10 Videos in hero-v2) ─────────────────── */

  // Sub-segment configurations per video (100% full duration coverage for each video):
  //   - ratioStart: start fraction of video duration (0.0)
  //   - ratioEnd: end fraction of video duration (1.0)
  //   - scrollWeight: relative scroll distance assigned to this portion
  const VIDEOS = [
    {
      id: '01-atom-formation',
      src: 'assets/videos/hero-v2-scrub/01-atom-formation.mp4.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 28.8 } // Atom formation (3x: 9.6 -> 28.8)
      ]
    },
    {
      id: '02-atom-to-mri',
      src: 'assets/videos/hero-v2-scrub/02-atom-to-mri.mp4.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 0.65, scrollWeight: 16.2 },   // Atom -> MRI transition (3x: 5.4 -> 16.2)
        { ratioStart: 0.65, ratioEnd: 1.0, scrollWeight: 44.352 } // MRI completed form hold (3x: 14.784 -> 44.352)
      ]
    },
    {
      id: '03-mri-to-space',
      src: 'assets/videos/hero-v2-scrub/03-mri-to-space.mp4.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 0.50, scrollWeight: 18.0 },   // MRI -> Space transition (3x: 6.0 -> 18.0)
        { ratioStart: 0.50, ratioEnd: 1.0, scrollWeight: 63.0 }   // Space completed form hold (3x: 21.0 -> 63.0)
      ]
    },
    {
      id: '04-space-to-smr',
      src: 'assets/videos/hero-v2-scrub/04-space-to-smr.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 0.50, scrollWeight: 18.0 },   // Space -> SMR transition (3x: 6.0 -> 18.0)
        { ratioStart: 0.50, ratioEnd: 1.0, scrollWeight: 63.0 }   // SMR completed form hold (3x: 21.0 -> 63.0)
      ]
    },
    {
      id: '05-smr-to-head',
      src: 'assets/videos/hero-v2-scrub/05-smr-to-head.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 14.4 }   // SMR -> Head transition (3x: 4.8 -> 14.4)
      ]
    },
    {
      id: '06-head-to-heart',
      src: 'assets/videos/hero-v2-scrub/06-head-to-heart.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 14.4 }   // Head -> Heart transition (3x: 4.8 -> 14.4)
      ]
    },
    {
      id: '07-heart-to-hand',
      src: 'assets/videos/hero-v2-scrub/07-heart-to-hand.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 16.2 }   // Heart -> Hand transition (3x: 5.4 -> 16.2)
      ]
    },
    {
      id: '08-hands-touch',
      src: 'assets/videos/hero-v2-scrub/08-hands-touch.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 0.20, scrollWeight: 2.4 },  // Hands approach (3x: 0.8 -> 2.4)
        { ratioStart: 0.20, ratioEnd: 0.80, scrollWeight: 10.8 }, // Touch & spark flash peak to settle (3x: 3.6 -> 10.8)
        { ratioStart: 0.80, ratioEnd: 1.00, scrollWeight: 2.4 }  // Handshake settle (3x: 0.8 -> 2.4)
      ]
    },
    {
      id: '09-handshake',
      src: 'assets/videos/hero-v2-scrub/09-handshake.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 10.8 }   // Handshake (3x: 3.6 -> 10.8)
      ]
    },
    {
      id: '10-energy-transfer',
      src: 'assets/videos/hero-v2-scrub/10-energy-transfer.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 14.4 }   // Energy transfer & final absorption (3x: 4.8 -> 14.4)
      ]
    }
  ];

  const VIDEO_START = 0;

  const UI_CONFIG = {
    dial: [
      { video: 1, minRatio: 0.65, maxRatio: 1.0, chapter: 1, category: 'LIFE SCIENCE', title: '방사선 융합기술 개발', showDesc: true },
      { video: 2, minRatio: 0.50, maxRatio: 1.0, chapter: 2, category: 'EXPLORATION', title: '양자빔 활용 과학기술', showDesc: true },
      { video: 3, minRatio: 0.50, maxRatio: 1.0, chapter: 3, category: 'FUTURE ENERGY', title: '선진 원자로 기술개발', showDesc: true }
    ],
    blacknessRamp: { video: 0, fadeStartRatio: 0.90, fadeEndRatio: 1.0 }
  };

  /* ── State ──────────────────────────────────────────────────── */

  let container = null;
  let bgLayer = null;
  const videoEls = [];
  const durations = VIDEOS.map(() => 8.0);
  let ready = false;
  let currentVideoIndex = -1;
  let totalScrollUnits = 0;
  let allSubSegments = [];
  let seekTarget = -1;
  let seekVideoIdx = -1;
  let pendingSeekTime = -1;

  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };

  /* ── Segment Computation ──────────────────────────────────── */

  function computeSegments() {
    allSubSegments = [];
    let currentScroll = 0;

    VIDEOS.forEach((vid, videoIndex) => {
      vid.subSegments.forEach((sub, subIndex) => {
        const scrollStart = currentScroll;
        const scrollEnd = currentScroll + sub.scrollWeight;
        currentScroll = scrollEnd;

        allSubSegments.push({
          videoIndex,
          subIndex,
          ratioStart: sub.ratioStart,
          ratioEnd: sub.ratioEnd,
          scrollWeight: sub.scrollWeight,
          scrollStart,
          scrollEnd
        });
      });
    });

    totalScrollUnits = currentScroll;
  }

  function getVideoTimeAndIndex(videoPos) {
    const clampedPos = clamp(videoPos, 0, totalScrollUnits);

    let sub = allSubSegments[0];
    for (let i = 0; i < allSubSegments.length; i++) {
      const s = allSubSegments[i];
      if (clampedPos >= s.scrollStart && clampedPos <= s.scrollEnd) {
        sub = s;
        break;
      }
      if (i === allSubSegments.length - 1) sub = s;
    }

    const segLen = Math.max(0.001, sub.scrollEnd - sub.scrollStart);
    const progress = clamp((clampedPos - sub.scrollStart) / segLen);
    const targetRatio = sub.ratioStart + progress * (sub.ratioEnd - sub.ratioStart);
    const vidDur = durations[sub.videoIndex] || 8.0;
    const targetTime = targetRatio * vidDur;

    return {
      videoIndex: sub.videoIndex,
      targetTime,
      targetRatio,
      subSegment: sub
    };
  }

  /* ── Initialization ────────────────────────────────────────── */

  function init(containerEl, bgLayerEl) {
    container = containerEl;
    bgLayer = bgLayerEl;

    computeSegments();
    ready = true;

    VIDEOS.forEach((cfg, i) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.removeAttribute('controls');
      video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;pointer-events:none;opacity:0;will-change:opacity;z-index:0;visibility:hidden;';
      video._hasSrc = false;
      video._isLoaded = false;
      video._isSeeking = false;
      video._pendingSeekTime = -1;

      video.addEventListener('loadedmetadata', () => {
        if (video.duration && !isNaN(video.duration) && video.duration > 0) {
          durations[i] = video.duration;
          computeSegments();
        }
      });

      video.addEventListener('loadeddata', () => {
        video._isLoaded = true;
        // When initial video (index 0) finishes loading, preload next video (index 1) in background
        if (i === 0 && videoEls[1]) {
          ensureVideoLoaded(1, false);
        }
      });

      video.addEventListener('canplay', () => {
        if (video._pendingSeekTime >= 0) {
          const t = video._pendingSeekTime;
          video._pendingSeekTime = -1;
          seekVideo(i, t);
        }
      });

      video.addEventListener('seeked', () => {
        video._isSeeking = false;
        if (video._pendingSeekTime >= 0 && Math.abs(video.currentTime - video._pendingSeekTime) > 0.003) {
          const nextT = video._pendingSeekTime;
          video._pendingSeekTime = -1;
          seekVideo(i, nextT);
        }
      });

      video.addEventListener('error', (e) => {
        const status = document.getElementById('video-load-status');
        if (status) {
          status.hidden = false;
          status.textContent = '영상을 불러오는 데 문제가 발생했습니다. 새로고침을 시도해 주세요.';
        }
        console.warn(`[VideoScrubber] Error loading video ${i} (${cfg.src}):`, e);
      });

      videoEls.push(video);
      container.appendChild(video);
    });

    // Priority load only the first video (01-atom-formation) at entry
    ensureVideoLoaded(0, true);
  }

  function ensureVideoLoaded(idx, priority = false) {
    if (idx < 0 || idx >= videoEls.length) return;
    const video = videoEls[idx];
    if (!video._hasSrc) {
      video._hasSrc = true;
      video.src = VIDEOS[idx].src;
      video.preload = priority ? 'auto' : 'metadata';
      try { video.load(); } catch (err) { /* ignore */ }
    } else if (priority && video.preload !== 'auto') {
      video.preload = 'auto';
    }
  }

  function resize() {
    // CSS object-fit:contain handles video sizing automatically.
  }

  /* ── Update Loop (called on render frame) ─────────────────── */

  function update(position) {
    if (!ready || !container) return;

    const videoPos = position - VIDEO_START;

    // Hand hold and smooth fadeout to black:
    // videoPos > totalScrollUnits:
    // 0.0 ~ 0.9 units (0.9 screen height): Hold orange hand at last frame (opacity 1.0)
    // 0.9 ~ 2.4 units (1.5 screen height): Fade out orange hand (opacity 1.0 -> 0.0)
    // > 2.4 units: Video completely hidden
    if (videoPos > totalScrollUnits) {
      const overrun = videoPos - totalScrollUnits;
      if (overrun <= 2.4) {
        const lastIdx = videoEls.length - 1;
        ensureVideoLoaded(lastIdx, true);
        const lastDur = durations[lastIdx] || 8.0;
        seekVideo(lastIdx, Math.max(0, lastDur - 0.001));

        let handOpacity = 1.0;
        if (overrun > 0.9) {
          handOpacity = 1 - smooth((overrun - 0.9) / 1.5);
        }

        container.style.opacity = String(handOpacity);
        container.style.visibility = handOpacity > 0.001 ? 'visible' : 'hidden';

        videoEls.forEach((v, i) => {
          if (i === lastIdx) {
            v.style.zIndex = '2';
            v.style.visibility = 'visible';
            v.style.opacity = '1';
          } else {
            v.style.zIndex = '0';
            v.style.visibility = 'hidden';
            v.style.opacity = '0';
          }
        });
        currentVideoIndex = lastIdx;
        return;
      } else {
        container.style.opacity = '0';
        container.style.visibility = 'hidden';
        hideAll();
        currentVideoIndex = -1;
        return;
      }
    }

    if (videoPos < -0.3) {
      container.style.opacity = '0';
      container.style.visibility = 'hidden';
      hideAll();
      currentVideoIndex = -1;
      return;
    }

    container.style.opacity = '1';
    container.style.visibility = 'visible';

    const { videoIndex, targetTime, targetRatio } = getVideoTimeAndIndex(videoPos);

    // Ensure active video is loaded with high priority
    ensureVideoLoaded(videoIndex, true);

    // Seek active video
    seekVideo(videoIndex, targetTime);

    // Render active videos with dual-buffer blending on specific boundary transitions (1->2, 2->3)
    renderActiveVideos(videoIndex, targetRatio, targetTime);

    preloadAdjacent(videoIndex, targetRatio);
  }

  function seekVideo(idx, targetTime) {
    if (idx < 0 || idx >= videoEls.length) return;
    const video = videoEls[idx];
    if (!video || !video._hasSrc || video.readyState < 1) {
      if (video) video._pendingSeekTime = targetTime;
      return;
    }

    const dur = video.duration || durations[idx] || 8.0;
    const t = clamp(targetTime, 0, dur - 0.001);

    video._pendingSeekTime = t;
    if (!video._isSeeking && !video.seeking) {
      if (Math.abs(video.currentTime - t) > 0.002) {
        try {
          video._isSeeking = true;
          video.currentTime = t;
        } catch (err) {}
      }
    }
  }

  function renderActiveVideos(videoIndex, targetRatio, targetTime) {
    // Boundary transition 1: 02-atom-to-mri (idx 1) -> 03-mri-to-space (idx 2)
    const isBoundary1 = (videoIndex === 2 && targetRatio < 0.06);
    // Boundary transition 2: 03-mri-to-space (idx 2) -> 04-space-to-smr (idx 3)
    const isBoundary2 = (videoIndex === 3 && targetRatio < 0.06);

    videoEls.forEach((v, i) => {
      if (isBoundary1) {
        if (i === 2) {
          const blend = smooth(targetRatio / 0.06);
          v.style.zIndex = '2';
          v.style.visibility = 'visible';
          v.style.opacity = String(blend);
        } else if (i === 1) {
          // Keep previous MRI video showing its clean end frame underneath
          ensureVideoLoaded(1, true);
          const prevDur = durations[1] || 8.0;
          seekVideo(1, prevDur - 0.01);
          v.style.zIndex = '1';
          v.style.visibility = 'visible';
          v.style.opacity = '1';
        } else {
          v.style.zIndex = '0';
          v.style.visibility = 'hidden';
          v.style.opacity = '0';
        }
      } else if (isBoundary2) {
        if (i === 3) {
          const blend = smooth(targetRatio / 0.06);
          v.style.zIndex = '2';
          v.style.visibility = 'visible';
          v.style.opacity = String(blend);
        } else if (i === 2) {
          // Keep previous Space video showing its clean end frame underneath
          ensureVideoLoaded(2, true);
          const prevDur = durations[2] || 8.0;
          seekVideo(2, prevDur - 0.01);
          v.style.zIndex = '1';
          v.style.visibility = 'visible';
          v.style.opacity = '1';
        } else {
          v.style.zIndex = '0';
          v.style.visibility = 'hidden';
          v.style.opacity = '0';
        }
      } else {
        if (i === videoIndex) {
          v.style.zIndex = '2';
          v.style.visibility = 'visible';
          v.style.opacity = '1';
        } else {
          v.style.zIndex = '0';
          v.style.visibility = 'hidden';
          v.style.opacity = '0';
        }
      }
    });

    currentVideoIndex = videoIndex;
  }

  function hideAll() {
    videoEls.forEach(v => {
      v.style.opacity = '0';
      v.style.visibility = 'hidden';
      v.style.zIndex = '0';
    });
  }

  function preloadAdjacent(idx, ratio = 0.5) {
    // Intelligent progressive preload of forward, backward, and next-ahead video
    if (idx + 1 < videoEls.length) {
      ensureVideoLoaded(idx + 1, ratio > 0.5);
      if (ratio > 0.85) {
        seekVideo(idx + 1, 0);
      }
    }
    if (idx + 2 < videoEls.length && ratio > 0.7) {
      ensureVideoLoaded(idx + 2, false);
    }
    if (idx - 1 >= 0) {
      ensureVideoLoaded(idx - 1, ratio < 0.5);
      if (ratio < 0.15) {
        const prevDur = durations[idx - 1] || 8.0;
        seekVideo(idx - 1, Math.max(0, prevDur - 0.01));
      }
    }
  }

  /* ── Blackness (Background Color) ─────────────────────────── */

  function getBlackness(position) {
    const videoPos = position - VIDEO_START;
    if (videoPos <= 0 || !ready) return 0;

    const { videoIndex, targetRatio } = getVideoTimeAndIndex(videoPos);

    if (videoIndex === 0) {
      const ramp = UI_CONFIG.blacknessRamp;
      const t = clamp((targetRatio - ramp.fadeStartRatio) / (ramp.fadeEndRatio - ramp.fadeStartRatio));
      return smooth(t);
    }

    // All video segments and subsequent ending sequence are solid black (#000)
    return 1.0;
  }

  /* ── Dial & Text State (scroll-linked rotation 00 -> 01 -> 02 -> 03) ────── */

  function getDialState(position) {
    const videoPos = position - VIDEO_START;
    if (!ready || videoPos < 0 || videoPos > totalScrollUnits) {
      return { visible: false, dialAlpha: 0, descAlpha: 0, rotationDeg: 0, activeIndex: -1, category: '', title: '' };
    }
    const { videoIndex, targetRatio } = getVideoTimeAndIndex(videoPos);

    // videoIndex 0: atom formation (dial hidden initially, appears near end)
    if (videoIndex === 0) {
      if (targetRatio < 0.90) {
        return { visible: false, dialAlpha: 0, descAlpha: 0, rotationDeg: 0, activeIndex: -1, category: '', title: '' };
      }
      const fadeIn = smooth((targetRatio - 0.90) / 0.10);
      return { visible: true, dialAlpha: fadeIn, descAlpha: 0, rotationDeg: 0, activeIndex: 0, category: '', title: '' };
    }

    // videoIndex 1: 02-atom-to-mri (00. -> 01. LIFE SCIENCE)
    if (videoIndex === 1) {
      let rot = 0;
      let descAlpha = 0;
      if (targetRatio < 0.65) {
        const t = smooth(targetRatio / 0.65);
        rot = 0 - t * 24; // Rotates 0deg -> -24deg
      } else {
        rot = -24; // Settles exactly at 01.
        const holdProgress = (targetRatio - 0.65) / 0.35;
        if (holdProgress < 0.12) descAlpha = smooth(holdProgress / 0.12);
        else if (holdProgress > 0.88) descAlpha = 1 - smooth((holdProgress - 0.88) / 0.12);
        else descAlpha = 1.0;
      }
      return {
        visible: true,
        dialAlpha: 1.0,
        descAlpha,
        rotationDeg: rot,
        activeIndex: targetRatio >= 0.65 ? 1 : 0,
        category: 'LIFE SCIENCE',
        title: '방사선 융합기술 개발'
      };
    }

    // videoIndex 2: 03-mri-to-space (01. -> 02. EXPLORATION)
    if (videoIndex === 2) {
      let rot = -24;
      let descAlpha = 0;
      if (targetRatio < 0.50) {
        const t = smooth(targetRatio / 0.50);
        rot = -24 - t * 24; // Rotates -24deg -> -48deg
      } else {
        rot = -48; // Settles exactly at 02.
        const holdProgress = (targetRatio - 0.50) / 0.50;
        if (holdProgress < 0.12) descAlpha = smooth(holdProgress / 0.12);
        else if (holdProgress > 0.88) descAlpha = 1 - smooth((holdProgress - 0.88) / 0.12);
        else descAlpha = 1.0;
      }
      return {
        visible: true,
        dialAlpha: 1.0,
        descAlpha,
        rotationDeg: rot,
        activeIndex: targetRatio >= 0.50 ? 2 : 1,
        category: 'EXPLORATION',
        title: '양자빔 활용 과학기술'
      };
    }

    // videoIndex 3: 04-space-to-smr (02. -> 03. FUTURE ENERGY)
    if (videoIndex === 3) {
      let rot = -48;
      let descAlpha = 0;
      if (targetRatio < 0.50) {
        const t = smooth(targetRatio / 0.50);
        rot = -48 - t * 24; // Rotates -48deg -> -72deg
      } else {
        rot = -72; // Settles exactly at 03.
        const holdProgress = (targetRatio - 0.50) / 0.50;
        if (holdProgress < 0.12) descAlpha = smooth(holdProgress / 0.12);
        else if (holdProgress > 0.88) descAlpha = 1 - smooth((holdProgress - 0.88) / 0.12);
        else descAlpha = 1.0;
      }
      return {
        visible: true,
        dialAlpha: 1.0,
        descAlpha,
        rotationDeg: rot,
        activeIndex: targetRatio >= 0.50 ? 3 : 2,
        category: 'FUTURE ENERGY',
        title: '선진 원자로 기술개발'
      };
    }

    // videoIndex 4: smr-to-head (graceful fade out of dial)
    if (videoIndex === 4) {
      const fadeOut = 1 - smooth(clamp(targetRatio / 0.35));
      return {
        visible: fadeOut > 0.01,
        dialAlpha: fadeOut,
        descAlpha: 0,
        rotationDeg: -72,
        activeIndex: 3,
        category: '',
        title: ''
      };
    }

    return { visible: false, dialAlpha: 0, descAlpha: 0, rotationDeg: -72, activeIndex: -1, category: '', title: '' };
  }

  function isScrollIndicatorHidden(position) {
    const videoPos = position - VIDEO_START;
    if (!ready || videoPos < 0 || videoPos > totalScrollUnits) return false;
    return videoPos > 1.5;
  }

  function getVideoOpacity(position) {
    if (!ready) return 0;
    const videoPos = position - VIDEO_START;
    if (videoPos < -0.9) return 0;
    if (videoPos > totalScrollUnits + 2.4) return 0;
    if (videoPos > totalScrollUnits) {
      return 1 - smooth((videoPos - totalScrollUnits) / 2.4);
    }
    return 1;
  }

  function getVideoProgress(position) {
    if (!ready) return 0;
    const videoPos = position - VIDEO_START;
    return clamp(videoPos / totalScrollUnits);
  }

  function getCurrentInfo(position) {
    const videoPos = position - VIDEO_START;
    if (!ready || videoPos < 0 || videoPos > totalScrollUnits) return null;
    const { videoIndex, targetTime, targetRatio } = getVideoTimeAndIndex(videoPos);
    return { videoIndex, currentTime: targetTime, targetRatio, duration: durations[videoIndex] || 8.0 };
  }

  return {
    init,
    update,
    resize,
    getBlackness,
    getDialState,
    isScrollIndicatorHidden,
    getVideoOpacity,
    getVideoProgress,
    getCurrentInfo,
    get totalScrollUnits() { return totalScrollUnits || 15.1; },
    get ready() { return ready; },
    VIDEO_START,
    VIDEOS,
    UI_CONFIG
  };
})();
