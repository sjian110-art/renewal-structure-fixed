/* ── Card Flip 3D Grid Section ───────────────────────────────────── */
(() => {
  'use strict';

  const SCREENS = [
    {
      id: 'experience',
      label: 'EXPERIENCE',
      image: 'assets/hero-photo-experience.png',
      textCardIndex: 3, // row 2, col 1 (Card 4)
      title: '직접 보고 경험하는<br>원자력 이야기',
      btnText: '견학 안내',
      btnTarget: 'visit'
    },
    {
      id: 'research',
      label: 'RESEARCH',
      image: 'assets/hero-photo-research.png',
      textCardIndex: 0, // row 1, col 1 (Card 1)
      title: '오늘의 연구로 만드는<br>더 나은 내일',
      btnText: '연구 알아보기',
      btnTarget: 'rnd'
    },
    {
      id: 'energy',
      label: 'ENERGY',
      image: 'assets/hero-photo-energy.png',
      textCardIndex: 5, // row 2, col 3 (Card 6)
      title: '내일을 움직이는 힘,<br>원자력에서 시작됩니다.',
      btnText: '기술 알아보기',
      btnTarget: 'tech'
    }
  ];

  // Preload images
  SCREENS.forEach(screen => {
    const img = new Image();
    img.src = screen.image;
  });

  function renderCardFront(cardIndex, screenIndex) {
    const screen = SCREENS[screenIndex];
    const row = Math.floor(cardIndex / 3);
    const col = cardIndex % 3;

    if (cardIndex === screen.textCardIndex) {
      return `
        <div class="card-text-content">
          <h3 class="card-title">${screen.title}</h3>
          <button type="button" class="card-btn" data-target="${screen.btnTarget}">
            <span>${screen.btnText}</span>
            <span class="btn-arrow">&rsaquo;</span>
          </button>
        </div>
      `;
    } else {
      return `
        <div class="card-photo-wrapper">
          <img src="${screen.image}" class="card-photo-img slice-col-${col} slice-row-${row}" alt="${screen.label} Photo">
        </div>
      `;
    }
  }

  function initCardFlip() {
    const section = document.querySelector('#card-flip-section');
    const grid = document.querySelector('#card-grid');
    const labelWrapEl = document.querySelector('#card-flip-label-wrap');
    const labelEl = document.querySelector('#card-flip-label');
    const pageEl = document.querySelector('#card-flip-page');
    if (!section || !grid || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const LABEL_PAGES = {
      'EXPERIENCE': '01 / 03',
      'RESEARCH': '02 / 03',
      'ENERGY': '03 / 03'
    };

    // Render 6 cards
    grid.innerHTML = '';
    const cardEls = [];
    const cardInners = [];
    const cardFronts = [];
    const cardStates = [];

    for (let i = 0; i < 6; i++) {
      const card = document.createElement('div');
      card.className = 'flip-card';
      card.dataset.index = i;

      const inner = document.createElement('div');
      inner.className = 'flip-card-inner';

      const front = document.createElement('div');
      front.className = 'flip-card-face flip-card-front';
      front.innerHTML = renderCardFront(i, 0);

      const back = document.createElement('div');
      back.className = 'flip-card-face flip-card-back';
      back.innerHTML = `<div class="card-back-content"><span class="card-back-logo">KAERI</span></div>`;

      inner.append(front, back);
      card.append(inner);
      grid.append(card);

      cardEls.push(card);
      cardInners.push(inner);
      cardFronts.push(front);

      cardStates.push({
        rotation: 0,
        currentScreenIndex: 0
      });
    }

    // Delegation for button clicks
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.card-btn');
      if (!btn) return;
      const target = btn.dataset.target;
      if (target && typeof window.openMenu === 'function') {
        window.openMenu(target);
      } else if (typeof window.toast === 'function') {
        window.toast('페이지 준비 중입니다.');
      }
    });

    // Update individual card state & rendering
    function updateCardRender(i) {
      const state = cardStates[i];
      const rot = state.rotation;

      // Determine screen index based on rotation angle:
      // rot < 180 -> Screen 0 (EXPERIENCE)
      // 180 <= rot < 540 -> Screen 1 (RESEARCH)
      // 540 <= rot -> Screen 2 (ENERGY)
      let targetScreen = 0;
      if (rot >= 540) {
        targetScreen = 2;
      } else if (rot >= 180) {
        targetScreen = 1;
      }

      if (state.currentScreenIndex !== targetScreen) {
        state.currentScreenIndex = targetScreen;
        cardFronts[i].innerHTML = renderCardFront(i, targetScreen);
      }

      // Apply 3D Y rotation
      cardInners[i].style.transform = `rotateY(${rot}deg)`;

      // Accessibility / button focus check
      const normAngle = ((rot % 360) + 360) % 360;
      const isFrontVisible = (normAngle < 85 || normAngle > 275);
      const btn = cardFronts[i].querySelector('.card-btn');
      if (btn) {
        if (isFrontVisible) {
          btn.tabIndex = 0;
          btn.style.pointerEvents = 'auto';
        } else {
          btn.tabIndex = -1;
          btn.style.pointerEvents = 'none';
        }
      }
    }

    // Master GSAP Timeline (Total: 10.6667 Units = 3733px, 3x faster than original baseline)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#card-flip-section',
        start: 'top top',
        end: '+=3733',
        pin: '.card-flip-sticky-wrapper',
        scrub: 0.6,
        anticipatePin: 1
      },
      onUpdate: () => {
        // Called on every frame during timeline interpolation even when scroll stops
        for (let i = 0; i < 6; i++) {
          updateCardRender(i);
        }
        // Label synchronization tied directly to timeline time
        const curTime = tl.time();
        let activeLabel = 'EXPERIENCE';
        if (curTime >= 7.333) {
          activeLabel = 'ENERGY';
        } else if (curTime >= 3.0) {
          activeLabel = 'RESEARCH';
        }
        if (labelEl && labelEl.textContent !== activeLabel) {
          labelEl.textContent = activeLabel;
          if (pageEl) {
            pageEl.textContent = LABEL_PAGES[activeLabel] || '01 / 03';
          }
        }

        // Section Scroll Indicator state for Card Screens:
        // Screen 1 hold: 0.00 <= curTime <= 2.00 -> '스크롤하여 다음 이야기'
        // Screen 2 hold: 4.32 <= curTime <= 6.32 -> '스크롤하여 다음 이야기'
        // Screen 3 hold: 8.64 <= curTime <= 10.6667 -> '스크롤하여 아래로'
        // Flipping transitions: hidden
        let cardIndicatorVisible = false;
        let cardIndicatorText = '';
        if (curTime >= 0 && curTime <= 2.00) {
          cardIndicatorVisible = true;
          cardIndicatorText = '스크롤하여 다음 이야기';
        } else if (curTime >= 4.32 && curTime <= 6.32) {
          cardIndicatorVisible = true;
          cardIndicatorText = '스크롤하여 다음 이야기';
        } else if (curTime >= 8.64 && curTime <= 10.6667) {
          cardIndicatorVisible = true;
          cardIndicatorText = '스크롤하여 아래로';
        } else {
          cardIndicatorVisible = false;
        }

        window.cardIndicatorState = {
          active: true,
          visible: cardIndicatorVisible,
          text: cardIndicatorText
        };

        if (typeof window.updateScrollIndicator === 'function') {
          window.updateScrollIndicator();
        }
      }
    });

    // ── Timeline Keyframes (Total: 10.6667 Units, 700px reading hold for all 3 screens) ──
    // Screen 1 (EXPERIENCE) reading hold: 0.00 ~ 2.00 (2.00 Units = 700px)

    // Transition 1 (Screen 1 -> Screen 2): Cards flip 0 -> 180 (pause) -> 360
    for (let i = 0; i < 6; i++) {
      const startTime = 2.00 + i * 0.24;
      const cardTl = gsap.timeline();
      cardTl.to(cardStates[i], { rotation: 180, duration: 0.48, ease: 'power1.in' })
            .to(cardStates[i], { rotation: 180, duration: 0.16 }) // readable pause at common back face
            .to(cardStates[i], { rotation: 360, duration: 0.48, ease: 'power1.out' });
      tl.add(cardTl, startTime);
    }

    const fadeTarget = labelWrapEl || labelEl;

    // Label Fade 1 (EXPERIENCE -> RESEARCH)
    if (fadeTarget) {
      tl.to(fadeTarget, { opacity: 0, duration: 0.2667, ease: 'power1.in' }, 2.833)
        .to(fadeTarget, { opacity: 1, duration: 0.2667, ease: 'power1.out' }, 3.2);
    }

    // Screen 2 (RESEARCH) reading hold: 4.32 ~ 6.32 (2.00 Units = 700px)

    // Transition 2 (Screen 2 -> Screen 3): Cards flip 360 -> 540 (pause) -> 720
    for (let i = 0; i < 6; i++) {
      const startTime = 6.32 + i * 0.24;
      const cardTl = gsap.timeline();
      cardTl.to(cardStates[i], { rotation: 540, duration: 0.48, ease: 'power1.in' })
            .to(cardStates[i], { rotation: 540, duration: 0.16 }) // readable pause at common back face
            .to(cardStates[i], { rotation: 720, duration: 0.48, ease: 'power1.out' });
      tl.add(cardTl, startTime);
    }

    // Label Fade 2 (RESEARCH -> ENERGY)
    if (fadeTarget) {
      tl.to(fadeTarget, { opacity: 0, duration: 0.2667, ease: 'power1.in' }, 7.1667)
        .to(fadeTarget, { opacity: 1, duration: 0.2667, ease: 'power1.out' }, 7.533);
    }

    // Screen 3 (ENERGY) reading hold: 8.64 ~ 10.6667 (2.0267 Units = 709px)
    tl.to({}, { duration: 2.0267 }, 8.64);

    // Initial render pass
    for (let i = 0; i < 6; i++) {
      updateCardRender(i);
    }

    // Refresh ScrollTrigger calculations
    ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCardFlip);
  } else {
    initCardFlip();
  }
})();
