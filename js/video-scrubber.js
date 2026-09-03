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
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 9.6 } // Atom formation (doubled to 9.6)
      ]
    },
    {
      id: '02-atom-to-mri',
      src: 'assets/videos/hero-v2-scrub/02-atom-to-mri.mp4.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 0.65, scrollWeight: 5.4 },  // Atom -> MRI transition (doubled to 5.4)
        { ratioStart: 0.65, ratioEnd: 1.0, scrollWeight: 26.4 }  // MRI completed form hold (doubled to 26.4)
      ]
    },
    {
      id: '03-mri-to-space',
      src: 'assets/videos/hero-v2-scrub/03-mri-to-space.mp4.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 0.50, scrollWeight: 6.0 },  // MRI -> Space transition (doubled to 6.0)
        { ratioStart: 0.50, ratioEnd: 1.0, scrollWeight: 30.0 }  // Space completed form hold (doubled to 30.0)
      ]
    },
    {
      id: '04-space-to-smr',
      src: 'assets/videos/hero-v2-scrub/04-space-to-smr.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 0.50, scrollWeight: 6.0 },  // Space -> SMR transition (doubled to 6.0)
        { ratioStart: 0.50, ratioEnd: 1.0, scrollWeight: 30.0 }  // SMR completed form hold (doubled to 30.0)
      ]
    },
    {
      id: '05-smr-to-head',
      src: 'assets/videos/hero-v2-scrub/05-smr-to-head.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 4.8 }   // SMR -> Head transition (doubled to 4.8)
      ]
    },
    {
      id: '06-head-to-heart',
      src: 'assets/videos/hero-v2-scrub/06-head-to-heart.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 4.8 }   // Head -> Heart transition (doubled to 4.8)
      ]
    },
    {
      id: '07-heart-to-hand',
      src: 'assets/videos/hero-v2-scrub/07-heart-to-hand.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 5.4 }   // Heart -> Hand transition (doubled to 5.4)
      ]
    },
    {
      id: '08-hands-touch',
      src: 'assets/videos/hero-v2-scrub/08-hands-touch.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 3.6 }   // Hands touch (doubled to 3.6)
      ]
    },
    {
      id: '09-handshake',
      src: 'assets/videos/hero-v2-scrub/09-handshake.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 3.6 }   // Handshake (doubled to 3.6)
      ]
    },
    {
      id: '10-energy-transfer',
      src: 'assets/videos/hero-v2-scrub/10-energy-transfer.mp4',
      subSegments: [
        { ratioStart: 0.0, ratioEnd: 1.0, scrollWeight: 4.8 }   // Energy transfer & final absorption (doubled to 4.8)
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
    blacknessRamp: { video: 0, fadeStartRatio: 0.3, fadeEndRatio: 1.0 }
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
      video.preload = 'auto';
      video.src = cfg.src;
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.removeAttribute('controls');
      video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;pointer-events:none;opacity:0;will-change:opacity;z-index:0;visibility:hidden;';

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
        if (seekVideoIdx === i && pendingSeekTime >= 0) {
          const t = pendingSeekTime;
          pendingSeekTime = -1;
          performSeek(video, t);
        }
      });

      video.addEventListener('error', (e) => {
        const status = document.getElementById('video-load-status');
        if (status) {
          status.hidden = false;
          status.textContent = '영상 파일을 불러오지 못했습니다: ' + cfg.src;
        }
        console.warn(`[VideoScrubber] Error loading video ${i}: ${cfg.src}`, e);
      });

      videoEls.push(video);
      container.appendChild(video);

      try { video.load(); } catch (err) { /* ignore */ }
    });
  }

  function resize() {
    // CSS object-fit:contain handles video sizing automatically.
  }

  /* ── Update Loop (called on render frame) ─────────────────── */

  function update(position) {
    if (!ready || !container) return;

    const videoPos = position - VIDEO_START;
    if (videoPos < -0.3 || videoPos > totalScrollUnits + 0.45) {
      hideAll();
      currentVideoIndex = -1;
      return;
    }

    const { videoIndex, targetTime } = getVideoTimeAndIndex(videoPos);

    switchToVideo(videoIndex);
    container.style.opacity = String(getVideoOpacity(position));

    seekVideoIdx = videoIndex;
    seekTarget = targetTime;
    applySeek();

    preloadAdjacent(videoIndex);
  }

  function performSeek(video, targetTime) {
    if (!video || video.readyState < 1) return;
    if (Math.abs(video.currentTime - targetTime) > 0.002) {
      try {
        video.currentTime = targetTime;
      } catch (err) {
        /* ignore */
      }
    }
  }

  function applySeek() {
    if (seekVideoIdx < 0 || seekTarget < 0) return;
    const video = videoEls[seekVideoIdx];
    if (!video || video.readyState < 1) return;

    const dur = video.duration || durations[seekVideoIdx] || 8.0;
    const t = clamp(seekTarget, 0, dur - 0.001);

    pendingSeekTime = t;
    if (!video.seeking) {
      performSeek(video, t);
    }
  }

  function switchToVideo(idx) {
    if (currentVideoIndex === idx) return;
    const prevIdx = currentVideoIndex;
    currentVideoIndex = idx;

    videoEls.forEach((v, i) => {
      if (i === idx) {
        v.style.zIndex = '2';
        v.style.visibility = 'visible';
        v.style.opacity = '1';
      } else if (i === prevIdx) {
        v.style.zIndex = '1';
        requestAnimationFrame(() => {
          if (currentVideoIndex !== prevIdx) {
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

    // Boundary pre-seeking for seamless forward/reverse transitions
    if (idx + 1 < videoEls.length) {
      const nextVid = videoEls[idx + 1];
      if (nextVid && nextVid.readyState >= 1 && !nextVid.seeking && nextVid.currentTime > 0.1) {
        try { nextVid.currentTime = 0; } catch (e) {}
      }
    }
    if (idx - 1 >= 0) {
      const prevVid = videoEls[idx - 1];
      if (prevVid && prevVid.readyState >= 1 && !prevVid.seeking) {
        const prevDur = prevVid.duration || durations[idx - 1] || 8.0;
        if (prevVid.currentTime < prevDur - 0.2) {
          try { prevVid.currentTime = Math.max(0, prevDur - 0.01); } catch (e) {}
        }
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

    if (videoPos < totalScrollUnits) return 1;

    const overrun = videoPos - totalScrollUnits;
    return 1 - smooth(clamp(overrun / 0.5));
  }

  /* ── Dial & Text State (hiding text/dials until step 2) ────── */

  function getDialState(position) {
    const videoPos = position - VIDEO_START;
    if (!ready || videoPos < 0 || videoPos > totalScrollUnits) {
      return { visible: false, descVisible: false, chapter: 1, dialAlpha: 0, descAlpha: 0, category: '', title: '' };
    }
    const { videoIndex, targetRatio } = getVideoTimeAndIndex(videoPos);
    for (const d of UI_CONFIG.dial) {
      if (videoIndex === d.video && targetRatio >= d.minRatio && targetRatio <= d.maxRatio) {
        const segProgress = (targetRatio - d.minRatio) / Math.max(0.001, d.maxRatio - d.minRatio);
        let alpha = 1.0;
        if (segProgress < 0.1) alpha = smooth(segProgress / 0.1);
        else if (segProgress > 0.9) alpha = 1.0 - smooth((segProgress - 0.9) / 0.1);
        return {
          visible: true,
          descVisible: d.showDesc,
          chapter: d.chapter,
          dialAlpha: alpha,
          descAlpha: d.showDesc ? alpha : 0,
          category: d.category,
          title: d.title
        };
      }
    }
    return { visible: false, descVisible: false, chapter: 1, dialAlpha: 0, descAlpha: 0, category: '', title: '' };
  }

  function isScrollIndicatorHidden(position) {
    const videoPos = position - VIDEO_START;
    if (!ready || videoPos < 0 || videoPos > totalScrollUnits) return false;
    return videoPos > 0.5;
  }

  function getVideoOpacity(position) {
    if (!ready) return 0;
    const videoPos = position - VIDEO_START;
    if (videoPos < -0.3) return 0;
    if (videoPos > totalScrollUnits + 0.4) return 0;
    if (videoPos > totalScrollUnits) {
      return 1 - smooth((videoPos - totalScrollUnits) / 0.4);
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
