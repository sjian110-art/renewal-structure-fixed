/**
 * KAERI Web Renewal - Hero Scroll Sequence & Left Circular Dial System
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Data Definitions for 15 Circular Menu Items
    const MENU_ITEMS = [
        {
            id: 'intro',
            name: 'KAERI 소개',
            baseSize: 368,
            hoverSize: 550,
            posX: 48.2,
            posY: 61.0,
            baseColor: '#E9E9E9',
            hoverColor: '#6C63FF',
            hoverText: '연구원을 소개합니다',
            textColor: '#FFFFFF',
            href: '#intro',
            connected: true
        },
        {
            id: 'news',
            name: '보도자료',
            baseSize: 423,
            hoverSize: 550,
            posX: 6.8,
            posY: 91.8,
            baseColor: '#E9E9E9',
            hoverColor: '#A2A2A2',
            hoverText: '최신 연구소식',
            textColor: '#FFFFFF',
            href: '#news',
            connected: true
        },
        {
            id: 'safety',
            name: '안전정보',
            baseSize: 300,
            hoverSize: 375,
            posX: 80.7,
            posY: 36.6,
            baseColor: '#E9E9E9',
            hoverColor: '#FAAD69',
            hoverText: '안전을 최우선으로',
            textColor: '#FFFFFF',
            href: '#safety',
            connected: true
        },
        {
            id: 'rnd',
            name: '연구개발',
            baseSize: 300,
            hoverSize: 375,
            posX: 75.3,
            posY: 80.6,
            baseColor: '#E9E9E9',
            hoverColor: '#F0B3F9',
            hoverText: '미래 원자력 기술',
            textColor: '#1A1A1A',
            href: '#rnd',
            connected: true
        },
        {
            id: 'visit',
            name: '방문신청',
            baseSize: 300,
            hoverSize: 375,
            posX: 95.0,
            posY: 92.3,
            baseColor: '#E9E9E9',
            hoverColor: '#EB5757',
            hoverText: '견학을 신청하세요',
            textColor: '#FFFFFF',
            href: '#visit',
            connected: true
        },
        {
            id: 'customer',
            name: '고객참여',
            baseSize: 272,
            hoverSize: 340,
            posX: 3.4,
            posY: 50.3,
            baseColor: '#E9E9E9',
            hoverColor: '#2F80ED',
            hoverText: '국민과 함께합니다',
            textColor: '#FFFFFF',
            href: '#customer',
            connected: true
        },
        {
            id: 'region',
            name: '지역협력',
            baseSize: 211,
            hoverSize: 264,
            posX: 20.1,
            posY: 32.2,
            baseColor: '#E9E9E9',
            hoverColor: '#2D9CDB',
            hoverText: '지역사회와 함께',
            textColor: '#FFFFFF',
            href: '#region',
            connected: false
        },
        {
            id: 'achievement',
            name: '연구성과',
            baseSize: 186,
            hoverSize: 232.5,
            posX: 28.9,
            posY: 58.6,
            baseColor: '#E9E9E9',
            hoverColor: '#4EBC7D',
            hoverText: '주요 연구성과',
            textColor: '#FFFFFF',
            href: '#achievement',
            connected: false
        },
        {
            id: 'edu',
            name: '원자력교육센터',
            baseSize: 255,
            hoverSize: 318.75,
            posX: 29.2,
            posY: 90.8,
            baseColor: '#E9E9E9',
            hoverColor: '#9AFFC4',
            hoverText: '교육 프로그램 안내',
            textColor: '#1A1A1A',
            href: '#edu',
            connected: false
        },
        {
            id: 'info',
            name: '정보공개',
            baseSize: 216,
            hoverSize: 270,
            posX: 59.4,
            posY: 31.7,
            baseColor: '#E9E9E9',
            hoverColor: '#4F4F4F',
            hoverText: '투명한 정보 제공',
            textColor: '#FFFFFF',
            href: '#info',
            connected: true
        },
        {
            id: 'tech',
            name: '기술이전',
            baseSize: 208,
            hoverSize: 260,
            posX: 66.1,
            posY: 57.6,
            baseColor: '#E9E9E9',
            hoverColor: '#738AC3',
            hoverText: '연구성과를 산업으로',
            textColor: '#FFFFFF',
            href: '#tech',
            connected: false
        },
        {
            id: 'recruit',
            name: '채용정보',
            baseSize: 228,
            hoverSize: 285,
            posX: 60.4,
            posY: 93.3,
            baseColor: '#E9E9E9',
            hoverColor: '#DDE2FF',
            hoverText: '함께할 인재 모집',
            textColor: '#1A1A1A',
            href: '#recruit',
            connected: false
        },
        {
            id: 'patent',
            name: '특허·사업화',
            baseSize: 152,
            hoverSize: 190,
            posX: 90.1,
            posY: 64.5,
            baseColor: '#E9E9E9',
            hoverColor: '#8D1E10',
            hoverText: '기술 사업화',
            textColor: '#FFFFFF',
            href: '#patent',
            connected: false
        },
        {
            id: 'video',
            name: '홍보영상',
            baseSize: 119,
            hoverSize: 148.75,
            posX: 18.2,
            posY: 72.8,
            baseColor: '#E9E9E9',
            hoverColor: '#313131',
            hoverText: 'KAERI TOUR',
            textColor: '#FFFFFF',
            href: '#video',
            connected: false
        },
        {
            id: 'sns',
            name: 'SNS',
            baseSize: 99,
            hoverSize: 123.75,
            posX: 33.1,
            posY: 32.2,
            baseColor: '#E9E9E9',
            hoverColor: '#FFFF98',
            hoverText: 'KAERI 채널',
            textColor: '#1A1A1A',
            href: '#sns',
            connected: false
        }
    ];

    // 2. Data Definitions for 16 Small Decorative Circles
    const SMALL_CIRCLES = [
        { id: 'sc-1', posX: 11.5, posY: 17.5, dx: 10, dy: -12, duration: 5.5, delay: 0.2 },
        { id: 'sc-2', posX: 21.5, posY: 13.0, dx: -8, dy: 14, duration: 6.2, delay: 0.8 },
        { id: 'sc-3', posX: 39.5, posY: 26.5, dx: 12, dy: -8, duration: 4.8, delay: 0.1 },
        { id: 'sc-4', posX: 51.0, posY: 19.5, dx: -10, dy: -10, duration: 7.0, delay: 1.2 },
        { id: 'sc-5', posX: 70.0, posY: 21.0, dx: 8, dy: 12, duration: 5.0, delay: 0.5 },
        { id: 'sc-6', posX: 97.5, posY: 18.5, dx: -12, dy: 8, duration: 6.5, delay: 1.5 },
        { id: 'sc-7', posX: 91.5, posY: 28.0, dx: 9, dy: -14, duration: 5.8, delay: 0.7 },
        { id: 'sc-8', posX: 75.5, posY: 55.0, dx: -11, dy: 9, duration: 6.8, delay: 0.3 },
        { id: 'sc-9', posX: 62.0, posY: 81.0, dx: 14, dy: -11, duration: 4.5, delay: 1.0 },
        { id: 'sc-10', posX: 84.0, posY: 94.5, dx: -7, dy: 13, duration: 7.5, delay: 0.4 },
        { id: 'sc-11', posX: 38.8, posY: 91.0, dx: 11, dy: -7, duration: 5.2, delay: 1.1 },
        { id: 'sc-12', posX: 10.5, posY: 72.5, dx: -9, dy: 10, duration: 6.0, delay: 0.6 },
        { id: 'sc-13', posX: 19.5, posY: 54.5, dx: 13, dy: -9, duration: 5.4, delay: 1.3 },
        { id: 'sc-14', posX: 59.0, posY: 45.0, dx: -8, dy: 11, duration: 6.7, delay: 0.9 },
        { id: 'sc-15', posX: 11.8, posY: 39.0, dx: 10, dy: -13, duration: 4.9, delay: 0.2 },
        { id: 'sc-16', posX: 39.5, posY: 45.5, dx: -12, dy: 7, duration: 7.2, delay: 1.4 }
    ];

    // 3. Left Circular Arc Dial Chapters Data
    const DIAL_CHAPTERS = [
        { index: 0, num: '00.', category: 'KAERI RESEARCH', title: '원자력 기술 개요', href: '#overview' },
        { index: 1, num: '01.', category: 'LIFE SCIENCE', title: '방사선 융합기술 개발', href: '#life-science' },
        { index: 2, num: '02.', category: 'EXPLORATION', title: '양자빔 활용 과학기술', href: '#exploration' },
        { index: 3, num: '03.', category: 'FUTURE ENERGY', title: '선진 원자로 기술개발', href: '#future-energy' },
        { index: 4, num: '04.', category: 'HUMAN & LIFE', title: '미래 인류 공존 기술', href: '#human-coexistence' }
    ];

    // Circular Arc Geometry Definitions (hero-main-black5)
    // Center at X = -450px, Y = 500px, Radius R = 750px
    const ARC_CX = -450;
    const ARC_CY = 500;
    const ARC_R = 750;
    const STEP_ANGLE = 24.5;

    let currentDialAngleOffset = 0;
    let currentChapterIndex = 1;

    // State Variables for Circular Menu
    let selectedId = null;
    let hoveredId = null;

    const mainContainer = document.getElementById('main-circles-container');
    const smallContainer = document.getElementById('small-circles-container');
    const stage = document.getElementById('circular-stage');
    const backdrop = document.getElementById('circular-backdrop');
    const blurElements = document.querySelectorAll('.blur-element');
    const toastModal = document.getElementById('toast-modal');
    const toastMessage = document.getElementById('toast-message');

    // Dial DOM Elements
    const leftDial = document.getElementById('left-dial');
    const dialItemsContainer = document.getElementById('dial-items-container');
    const dialTextBox = document.getElementById('dial-text-box');
    const dialCategory = document.getElementById('dial-category');
    const dialTitle = document.getElementById('dial-title');
    const dialDetailBtn = document.getElementById('dial-detail-btn');

    let toastTimer = null;

    function showToast(message) {
        if (!toastModal || !toastMessage) return;
        toastMessage.textContent = message;
        toastModal.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastModal.classList.remove('show');
        }, 3000);
    }

    // 4. Render Left Circular Arc Dial Items
    function renderDialItems() {
        if (!dialItemsContainer) return;
        dialItemsContainer.innerHTML = '';

        DIAL_CHAPTERS.forEach((ch) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'dial-item';
            itemEl.dataset.index = ch.index;
            itemEl.innerHTML = `
                <span class="dial-dot"></span>
                <span class="dial-num">${ch.num}</span>
            `;
            dialItemsContainer.appendChild(itemEl);
        });

        updateDialPositions(0, 1);
    }

    // Mathematical Circular Arc Positioning
    function updateDialPositions(targetAngleOffset, activeIdx) {
        currentDialAngleOffset = targetAngleOffset;
        currentChapterIndex = activeIdx;

        DIAL_CHAPTERS.forEach((ch) => {
            const itemEl = dialItemsContainer.querySelector(`[data-index="${ch.index}"]`);
            if (!itemEl) return;

            const baseAngleDeg = (ch.index - 1) * STEP_ANGLE;
            const netAngleDeg = baseAngleDeg + targetAngleOffset;
            const rad = (netAngleDeg * Math.PI) / 180;

            const px = ARC_CX + ARC_R * Math.cos(rad);
            const py = ARC_CY + ARC_R * Math.sin(rad);

            const rotDeg = netAngleDeg;
            const isActive = ch.index === activeIdx;

            gsap.to(itemEl, {
                left: `${px}px`,
                top: `${py}px`,
                rotation: rotDeg,
                duration: 0.55,
                ease: 'power2.out',
                overwrite: 'auto',
                onStart: () => {
                    if (isActive) itemEl.classList.add('active');
                    else itemEl.classList.remove('active');
                }
            });
        });

        const activeCh = DIAL_CHAPTERS.find(c => c.index === activeIdx);
        if (activeCh && dialCategory && dialTitle && dialDetailBtn) {
            dialCategory.textContent = activeCh.category;
            dialTitle.textContent = activeCh.title;
            dialDetailBtn.href = activeCh.href;
        }
    }

    // Scene-by-Scene Dial & Topic Description Matrix Controller
    function setDialState(dialVisible, descVisible, activeIndex) {
        // Compute target angle offset for active index
        const angleOffset = -(activeIndex - 1) * STEP_ANGLE;
        updateDialPositions(angleOffset, activeIndex);

        if (leftDial) {
            if (dialVisible) leftDial.classList.add('visible');
            else leftDial.classList.remove('visible');
        }

        if (dialTextBox) {
            if (descVisible) dialTextBox.classList.add('visible');
            else dialTextBox.classList.remove('visible');
        }
    }

    if (dialDetailBtn) {
        dialDetailBtn.addEventListener('click', (e) => {
            const ch = DIAL_CHAPTERS.find(c => c.index === currentChapterIndex);
            if (ch && ch.href.startsWith('#')) {
                const targetSec = document.querySelector(ch.href);
                if (!targetSec) {
                    e.preventDefault();
                    showToast(`[${ch.title}] 세부 연구 페이지는 서비스 준비 중입니다.`);
                }
            }
        });
    }

    renderDialItems();

    // 5. Render Circular Menu Section Elements (Section 7)
    function renderCircularMenu() {
        if (!mainContainer || !smallContainer) return;

        mainContainer.innerHTML = '';
        smallContainer.innerHTML = '';

        // Render 15 Main Circles
        MENU_ITEMS.forEach(item => {
            const circle = document.createElement('div');
            circle.className = 'menu-circle';
            circle.dataset.id = item.id;
            circle.tabIndex = 0;
            circle.setAttribute('role', 'button');
            circle.setAttribute('aria-expanded', 'false');
            circle.setAttribute('aria-label', `${item.name}: ${item.hoverText}`);

            circle.style.left = `${item.posX}%`;
            circle.style.top = `${item.posY}%`;
            circle.style.width = `${item.baseSize}px`;
            circle.style.height = `${item.baseSize}px`;
            circle.style.backgroundColor = item.baseColor;

            circle.innerHTML = `
                <div class="circle-content">
                    <span class="circle-title">${item.name}</span>
                    <span class="circle-desc">${item.hoverText}</span>
                    <a href="${item.href}" class="circle-detail-btn" tabindex="-1" aria-label="${item.name} 자세히 보기">
                        자세히 보기 &rarr;
                    </a>
                </div>
            `;

            circle.addEventListener('mouseenter', () => handleCircleHover(item.id));
            circle.addEventListener('mouseleave', () => handleCircleLeave(item.id));

            circle.addEventListener('click', (e) => {
                if (e.target.closest('.circle-detail-btn')) return;
                toggleSelectCircle(item.id);
            });

            circle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSelectCircle(item.id);
                }
            });

            const detailBtn = circle.querySelector('.circle-detail-btn');
            if (detailBtn) {
                detailBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!item.connected) {
                        e.preventDefault();
                        showToast(`해당 서비스(${item.name})는 현재 서비스 준비 중입니다.`);
                    }
                });
            }

            mainContainer.appendChild(circle);
        });

        // Render 16 Small Floating Circles
        SMALL_CIRCLES.forEach(sc => {
            const el = document.createElement('div');
            el.className = 'small-circle';
            el.dataset.id = sc.id;
            el.style.left = `${sc.posX}%`;
            el.style.top = `${sc.posY}%`;
            el.style.setProperty('--dx', `${sc.dx}px`);
            el.style.setProperty('--dy', `${sc.dy}px`);
            el.style.setProperty('--duration', `${sc.duration}s`);
            el.style.setProperty('--delay', `${sc.delay}s`);

            smallContainer.appendChild(el);
        });
    }

    function handleCircleHover(id) {
        hoveredId = id;
        const item = MENU_ITEMS.find(m => m.id === id);
        const circleEl = mainContainer.querySelector(`[data-id="${id}"]`);
        if (!item || !circleEl) return;

        circleEl.classList.add('is-hovered');
        circleEl.style.backgroundColor = item.hoverColor;

        const titleEl = circleEl.querySelector('.circle-title');
        const descEl = circleEl.querySelector('.circle-desc');
        if (titleEl) titleEl.style.color = item.textColor;
        if (descEl) descEl.style.color = item.textColor;
    }

    function handleCircleLeave(id) {
        if (hoveredId === id) hoveredId = null;
        const item = MENU_ITEMS.find(m => m.id === id);
        const circleEl = mainContainer.querySelector(`[data-id="${id}"]`);
        if (!item || !circleEl) return;

        if (selectedId === id) return;

        circleEl.classList.remove('is-hovered');
        circleEl.style.backgroundColor = item.baseColor;

        const titleEl = circleEl.querySelector('.circle-title');
        const descEl = circleEl.querySelector('.circle-desc');
        if (titleEl) titleEl.style.color = '#1a1a1a';
        if (descEl) descEl.style.color = '#1a1a1a';
    }

    function toggleSelectCircle(id) {
        if (selectedId === id) {
            deselectAll();
        } else {
            selectCircle(id);
        }
    }

    function selectCircle(id) {
        const item = MENU_ITEMS.find(m => m.id === id);
        const targetEl = mainContainer.querySelector(`[data-id="${id}"]`);
        if (!item || !targetEl || !stage) return;

        if (selectedId && selectedId !== id) {
            resetCircleElement(selectedId);
        }

        selectedId = id;
        targetEl.setAttribute('aria-expanded', 'true');

        const detailBtn = targetEl.querySelector('.circle-detail-btn');
        if (detailBtn) detailBtn.tabIndex = 0;

        const stageRect = stage.getBoundingClientRect();
        const stageW = stageRect.width || window.innerWidth;
        const stageH = stageRect.height || window.innerHeight;

        const targetBaseX = (item.posX / 100) * stageW;
        const targetBaseY = (item.posY / 100) * stageH;

        const safeMinX = 40 + item.hoverSize / 2;
        const safeMaxX = stageW - 140 - item.hoverSize / 2;
        const safeMinY = 100 + item.hoverSize / 2;
        const safeMaxY = stageH - 50 - item.hoverSize / 2;

        let correctedX = targetBaseX;
        let correctedY = targetBaseY;

        if (correctedX < safeMinX) correctedX = safeMinX;
        if (correctedX > safeMaxX) correctedX = safeMaxX;
        if (correctedY < safeMinY) correctedY = safeMinY;
        if (correctedY > safeMaxY) correctedY = safeMaxY;

        const targetDeltaX = correctedX - targetBaseX;
        const targetDeltaY = correctedY - targetBaseY;

        gsap.to(targetEl, {
            width: item.hoverSize,
            height: item.hoverSize,
            x: targetDeltaX,
            y: targetDeltaY,
            backgroundColor: item.hoverColor,
            duration: 0.55,
            ease: 'power2.out',
            overwrite: 'auto',
            onStart: () => {
                targetEl.classList.add('is-selected');
                const titleEl = targetEl.querySelector('.circle-title');
                const descEl = targetEl.querySelector('.circle-desc');
                if (titleEl) titleEl.style.color = item.textColor;
                if (descEl) descEl.style.color = item.textColor;
            }
        });

        MENU_ITEMS.forEach(other => {
            if (other.id === id) return;
            const otherEl = mainContainer.querySelector(`[data-id="${other.id}"]`);
            if (!otherEl) return;

            const otherBaseX = (other.posX / 100) * stageW;
            const otherBaseY = (other.posY / 100) * stageH;

            const dx = otherBaseX - targetBaseX;
            const dy = otherBaseY - targetBaseY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const ux = dx / dist;
            const uy = dy / dist;

            const expansionRadius = (item.hoverSize - item.baseSize) / 2;
            const falloff = Math.max(0.1, 1.0 - dist / 1100);
            const pushDist = (expansionRadius + 70) * falloff;

            gsap.to(otherEl, {
                x: ux * pushDist,
                y: uy * pushDist,
                duration: 0.55,
                ease: 'power2.out',
                overwrite: 'auto'
            });
        });

        SMALL_CIRCLES.forEach(sc => {
            const scEl = smallContainer.querySelector(`[data-id="${sc.id}"]`);
            if (!scEl) return;

            const scBaseX = (sc.posX / 100) * stageW;
            const scBaseY = (sc.posY / 100) * stageH;

            const dx = scBaseX - targetBaseX;
            const dy = scBaseY - targetBaseY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const ux = dx / dist;
            const uy = dy / dist;

            const expansionRadius = (item.hoverSize - item.baseSize) / 2;
            const falloff = Math.max(0.1, 1.0 - dist / 1100);
            const pushDist = (expansionRadius + 70) * falloff * 0.4;

            gsap.to(scEl, {
                x: ux * pushDist,
                y: uy * pushDist,
                duration: 0.55,
                ease: 'power2.out',
                overwrite: 'auto'
            });
        });

        setTimeout(() => {
            if (selectedId !== id) return;
            const allCircles = mainContainer.querySelectorAll('.menu-circle');
            const allSmallCircles = smallContainer.querySelectorAll('.small-circle');

            allCircles.forEach(c => {
                if (c !== targetEl) c.classList.add('is-blurred');
            });
            allSmallCircles.forEach(sc => sc.classList.add('is-blurred'));
            blurElements.forEach(el => el.classList.add('is-blurred'));
        }, 100);
    }

    function resetCircleElement(id) {
        const item = MENU_ITEMS.find(m => m.id === id);
        const el = mainContainer.querySelector(`[data-id="${id}"]`);
        if (!item || !el) return;

        el.setAttribute('aria-expanded', 'false');
        el.classList.remove('is-selected');

        const detailBtn = el.querySelector('.circle-detail-btn');
        if (detailBtn) detailBtn.tabIndex = -1;

        const isHovered = hoveredId === id;

        gsap.to(el, {
            width: item.baseSize,
            height: item.baseSize,
            x: 0,
            y: 0,
            backgroundColor: isHovered ? item.hoverColor : item.baseColor,
            duration: 0.45,
            ease: 'power2.inOut',
            overwrite: 'auto',
            onComplete: () => {
                if (!isHovered) {
                    el.classList.remove('is-hovered');
                    const titleEl = el.querySelector('.circle-title');
                    const descEl = el.querySelector('.circle-desc');
                    if (titleEl) titleEl.style.color = '#1a1a1a';
                    if (descEl) descEl.style.color = '#1a1a1a';
                }
            }
        });
    }

    function deselectAll() {
        if (!selectedId) return;

        const prevId = selectedId;
        selectedId = null;

        resetCircleElement(prevId);

        MENU_ITEMS.forEach(item => {
            if (item.id === prevId) return;
            const el = mainContainer.querySelector(`[data-id="${item.id}"]`);
            if (el) {
                gsap.to(el, {
                    x: 0,
                    y: 0,
                    duration: 0.45,
                    ease: 'power2.inOut',
                    overwrite: 'auto'
                });
            }
        });

        SMALL_CIRCLES.forEach(sc => {
            const scEl = smallContainer.querySelector(`[data-id="${sc.id}"]`);
            if (scEl) {
                gsap.to(scEl, {
                    x: 0,
                    y: 0,
                    duration: 0.45,
                    ease: 'power2.inOut',
                    overwrite: 'auto'
                });
            }
        });

        const allCircles = mainContainer.querySelectorAll('.menu-circle');
        const allSmallCircles = smallContainer.querySelectorAll('.small-circle');
        allCircles.forEach(c => c.classList.remove('is-blurred'));
        allSmallCircles.forEach(sc => sc.classList.remove('is-blurred'));
        blurElements.forEach(el => el.classList.remove('is-blurred'));
    }

    if (backdrop) backdrop.addEventListener('click', () => deselectAll());

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') deselectAll();
    });

    renderCircularMenu();

    // 6. GSAP & ScrollTrigger Setup for Hero Sequence & Dial Scene Matrix
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        const pinSection = document.getElementById('hero-pin-section');
        const bgLayer = document.getElementById('bg-layer');
        const atomWrapper = document.getElementById('atom-sequence');
        const storyWrapper = document.getElementById('story-sequence');
        const bodyEl = document.body;

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: pinSection,
                start: 'top top',
                end: '+=8000',
                pin: true,
                scrub: 1,
                anticipatePin: 1
            }
        });

        // Ensure outer wrapper #atom-scroll-01 and initial light theme are set
        gsap.set('#atom-scroll-01', { opacity: 1, scale: 1 });
        bodyEl.classList.remove('theme-dark');
        bodyEl.classList.add('theme-light');

        // Step 6A: White Atom Sequence Expansion (hero-main ~ hero-main6)
        // 1. hero-main (atom-01-core + text)
        tl.to('#atom-text', { opacity: 1, duration: 0.5 })
          
          // 2. hero-main2 (atom-02-expanding)
          .to('#atom-scroll-01', { scale: 1.8, duration: 1 })
          .to('#atom-scroll-02', { opacity: 1, scale: 1, duration: 1 }, '<0.2')
          .to('#atom-text', { opacity: 0, y: -25, duration: 0.8 }, '<0.3')

          // 3. hero-main3 (atom-03-radial)
          .to('#atom-scroll-02', { scale: 1.4, duration: 1 })
          .to('#atom-scroll-03', { opacity: 1, scale: 1, rotation: -15, duration: 1 }, '<0.2')

          // 4. hero-main4 (atom-04-orbits)
          .to('#atom-scroll-03', { scale: 1.3, duration: 1 })
          .to('#atom-scroll-04', { opacity: 1, scale: 1, rotation: 25, duration: 1 }, '<0.2')

          // 5. hero-main5 (atom-05-orbits-expanded)
          .to('#atom-scroll-04', { scale: 1.25, duration: 1 })
          .to('#atom-scroll-05', { opacity: 1, scale: 1, rotation: -35, duration: 1 }, '<0.2')

          // 6. hero-main6 (atom-06-orbits-full)
          .to('#atom-scroll-05', { scale: 1.2, duration: 1 })
          .to('#atom-scroll-06', { opacity: 1, scale: 1, rotation: 45, duration: 1.2 }, '<0.2');

        // Step 6B: Nuclear Fission Core Splitting & Dark Theme Transition
        tl.to('#atom-scroll-06', { scale: 4.8, opacity: 0, duration: 1.5 })
          .to(atomWrapper, { opacity: 0, duration: 1.2 }, '<')
          .to(bgLayer, { backgroundColor: '#080c14', duration: 1.5 }, '<')
          .call(() => {
              bodyEl.classList.remove('theme-light');
              bodyEl.classList.add('theme-dark');
          }, null, '<0.5')
          .to(storyWrapper, { opacity: 1, duration: 1.5 }, '<0.5');

        // Step 6C: Dark Story Sequence with Exact Scene-by-Scene Dial Visibility Matrix
        
        // --- Scenes black1 ~ black3 (story-01 ~ story-03): Dial Hidden, Desc Hidden ---
        tl.call(() => setDialState(false, false, 1))
          .to('#story-01', { opacity: 1, scale: 1, duration: 1 })
          .to('#story-02', { opacity: 1, scale: 1, duration: 1 }, '<0.3')
          .to('#story-03', { opacity: 1, scale: 1, duration: 1 }, '<0.3')

        // --- Scene black4 (story-04): Dial Appears, Desc HIDDEN ---
          .call(() => setDialState(true, false, 1))
          .to('#story-04', { opacity: 1, scale: 1, duration: 1 }, '<')
          .to(['#story-01', '#story-02', '#story-03'], { opacity: 0, duration: 0.8 }, '<')

        // --- Scene black5 (story-05 Medical Device): Dial Active 01 + Desc VISIBLE ---
          .call(() => setDialState(true, true, 1))
          .to('#story-05', { opacity: 1, scale: 1, duration: 1.2 })
          .to('#story-06', { opacity: 1, scale: 1, duration: 1.2 }, '<0.3')

        // --- Scene black6 (story-06 end / transition): Dial & Desc HIDDEN ---
          .to(['#story-04', '#story-05', '#story-06'], { opacity: 0, duration: 0.8 })
          .call(() => setDialState(false, false, 1), null, '<')

        // --- Scene black7 (story-07 Galaxy): Dial Appears (02 rotated), Desc HIDDEN ---
          .call(() => setDialState(true, false, 2))
          .to('#story-07', { opacity: 1, scale: 1, duration: 1.2 }, '<')

        // --- Scene black8 (story-08 Planets/Rocket): Dial Active 02 + Desc VISIBLE ---
          .call(() => setDialState(true, true, 2))
          .to('#story-08', { opacity: 1, scale: 1, duration: 1.2 })
          .to('#story-09', { opacity: 1, scale: 1, duration: 1.2 }, '<0.3')

        // --- Scenes black9 ~ black10 (story-09 ~ story-10): Dial & Desc HIDDEN ---
          .to(['#story-07', '#story-08', '#story-09'], { opacity: 0, duration: 0.8 })
          .call(() => setDialState(false, false, 2), null, '<')
          .to('#story-10', { opacity: 1, scale: 1, duration: 1 }, '<0.2')

        // --- Scene black11 (story-11 Particles): Dial Appears (03 rotated), Desc HIDDEN ---
          .call(() => setDialState(true, false, 3))
          .to('#story-11', { opacity: 1, scale: 1, duration: 1 }, '<')

        // --- Scene black12 (story-12 Reactor): Dial Active 03 + Desc VISIBLE ---
          .call(() => setDialState(true, true, 3))
          .to('#story-12', { opacity: 1, scale: 1, duration: 1.2 })
          .to('#story-13', { opacity: 1, scale: 1, duration: 1.2 }, '<0.3')

        // --- Scenes black13 ~ black23 (story-13 ~ story-22): Dial & Desc HIDDEN ---
          .to(['#story-10', '#story-11', '#story-12', '#story-13'], { opacity: 0, duration: 0.8 })
          .call(() => setDialState(false, false, 3), null, '<')
          .to('#story-14', { opacity: 1, scale: 1, duration: 1 }, '<0.2')
          .to('#story-15', { opacity: 1, scale: 1, duration: 1.2 }, '<0.2')
          .to('#story-16', { opacity: 1, scale: 1, duration: 1.2 }, '<0.3')

          .to(['#story-14', '#story-15', '#story-16'], { opacity: 0, duration: 0.8 })
          .to('#story-17', { opacity: 1, scale: 1, duration: 1 }, '<0.2')
          .to('#story-18', { opacity: 1, scale: 1, duration: 1 }, '<0.3')
          .to('#story-19', { opacity: 1, scale: 1, duration: 1 }, '<0.3')
          .to('#story-20', { opacity: 1, scale: 1, duration: 1.2 }, '<0.3')
          .to('#story-21', { opacity: 1, scale: 1, duration: 1.2 }, '<0.3')
          .to('#story-22', { opacity: 1, scale: 1, duration: 1.2 }, '<0.3');

        // Step 6D: Reverse Scroll Restoration & Transition into Section 7
        tl.to(storyWrapper, { opacity: 0, scale: 1.05, duration: 1.5 })
          .to(bgLayer, { backgroundColor: '#ffffff', duration: 1.5 }, '<')
          .call(() => {
              bodyEl.classList.remove('theme-dark');
              bodyEl.classList.add('theme-light');
              setDialState(false, false, 1);
          }, null, '<0.5');

        // Section 7 Exit Scroll Trigger
        const circularSection = document.getElementById('circular-menu-section');
        if (circularSection) {
            ScrollTrigger.create({
                trigger: circularSection,
                start: 'top top',
                end: 'bottom top',
                onUpdate: (self) => {
                    if (self.progress > 0.05 && selectedId) {
                        deselectAll();
                    }
                }
            });

            const exitTl = gsap.timeline({
                scrollTrigger: {
                    trigger: circularSection,
                    start: 'center center',
                    end: 'bottom top',
                    scrub: 0.8
                }
            });

            MENU_ITEMS.forEach((item, index) => {
                const el = mainContainer.querySelector(`[data-id="${item.id}"]`);
                if (el) {
                    const offsetY = -280 - (index % 5) * 45;
                    exitTl.to(el, { yPercent: offsetY / 5, opacity: 0.2, ease: 'none' }, 0);
                }
            });

            SMALL_CIRCLES.forEach((sc, index) => {
                const scEl = smallContainer.querySelector(`[data-id="${sc.id}"]`);
                if (scEl) {
                    const offsetY = -350 - (index % 4) * 50;
                    exitTl.to(scEl, { yPercent: offsetY / 5, opacity: 0.1, ease: 'none' }, 0);
                }
            });
        }
    }
});
