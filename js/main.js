/* 스크롤 연출 + 동적 데이터 */
(function () {
  // ── 경력 기간 자동 계산 — 2022.08 입사 기준
  try {
    const startDate = new Date(2022, 7, 1);
    const now = new Date();
    let months = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
    if (months < 0) months = 0;
    const y = Math.floor(months / 12), m = months % 12;
    const hero = document.getElementById('expYears');
    if (hero) hero.innerHTML = y + '<span class="u">년</span>' + (m ? ' ' + m + '<span class="u">개월</span>' : '');
    const tile = document.getElementById('expYears2');
    if (tile) tile.textContent = m === 0 ? y + '년' : y + '년 ' + m + '개월';
  } catch (e) { /* 실패 시 정적 텍스트 유지 */ }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── 스크린샷 확대 — 모션을 끈 사용자도 써야 하므로 early return 앞에 둔다
  (function lightbox() {
    const box = document.getElementById('lightbox');
    if (!box) return;
    const stage = box.querySelector('.lightbox-stage');
    const cap = box.querySelector('.lightbox-cap');
    const closeBtn = box.querySelector('.lightbox-close');
    const canFlip = !reduceMotion && typeof gsap !== 'undefined' && typeof Flip !== 'undefined';
    if (canFlip) gsap.registerPlugin(Flip);

    let clone = null;
    let opener = null;
    let savedY = 0;

    document.querySelectorAll('.phone, .auto-shot').forEach((frame) => {
      const img = frame.querySelector('img');
      if (!img) return;
      frame.tabIndex = 0;
      frame.setAttribute('role', 'button');
      frame.setAttribute('aria-label', (img.alt || '스크린샷') + ' — 확대해서 보기');
      frame.addEventListener('click', () => open(frame, img));
      frame.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(frame, img); }
      });
    });

    // 원본은 그대로 두고 복제본만 띄운다 — .auto-shot이 overflow:hidden이라 원본을 옮기면 잘린다
    function open(frame, img) {
      if (clone) return;
      opener = frame;
      const figcap = frame.parentElement && frame.parentElement.querySelector('figcaption');
      cap.textContent = figcap ? figcap.textContent : (img.alt || '');

      // 배경이 스크롤되면 닫을 때 썸네일 좌표가 어긋나므로 멈춰둔다
      const sm = typeof ScrollSmoother !== 'undefined' ? ScrollSmoother.get() : null;
      if (sm) { savedY = sm.scrollTop(); sm.paused(true); }

      clone = img.cloneNode(true);
      clone.removeAttribute('loading');
      const r = img.getBoundingClientRect();
      // 시작 상태 = 썸네일 자리
      clone.style.cssText = 'position:fixed;margin:0;left:' + r.left + 'px;top:' + r.top +
        'px;width:' + r.width + 'px;height:' + r.height + 'px;object-fit:cover;border-radius:22px;';
      stage.appendChild(clone);
      box.hidden = false;

      // 끝 상태 크기를 직접 계산한다 — width/height:auto에 맡기면 복제본이
      // 아직 디코딩 전일 때 naturalWidth가 0이라 0x0으로 접힌다
      const nw = img.naturalWidth || r.width;
      const nh = img.naturalHeight || r.height;
      const scale = Math.min(Math.min(window.innerWidth * 0.92, 1100) / nw, window.innerHeight * 0.84 / nh);
      const endCss = 'width:' + Math.round(nw * scale) + 'px;height:' + Math.round(nh * scale) + 'px;';

      if (canFlip) {
        const start = Flip.getState(clone);
        clone.style.cssText = endCss;
        gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power1.out' });
        Flip.from(start, { duration: 0.5, ease: 'power2.inOut', absolute: true, props: 'borderRadius' });
      } else {
        clone.style.cssText = endCss;
      }
      // preventScroll 없이 포커스하면 브라우저가 스크롤을 건드려 smoother가 통째로 점프한다
      closeBtn.focus({ preventScroll: true });
      document.addEventListener('keydown', onKey);
    }

    function close() {
      if (!clone) return;
      const c = clone;
      clone = null;
      document.removeEventListener('keydown', onKey);

      const sm = typeof ScrollSmoother !== 'undefined' ? ScrollSmoother.get() : null;
      const finish = () => {
        c.remove(); box.hidden = true; box.style.opacity = '';
        // paused()가 네이티브 스크롤바까지 막지는 못해 해제 시 그쪽으로 튄다 — 열 때 위치로 되돌린다
        if (sm) { sm.paused(false); sm.scrollTop(savedY); }
      };
      const img = opener && opener.querySelector('img');
      if (canFlip && img) {
        const start = Flip.getState(c);
        const r = img.getBoundingClientRect();
        c.style.cssText = 'position:fixed;margin:0;left:' + r.left + 'px;top:' + r.top +
          'px;width:' + r.width + 'px;height:' + r.height + 'px;object-fit:cover;border-radius:22px;';
        Flip.from(start, { duration: 0.42, ease: 'power2.inOut', absolute: true, props: 'borderRadius' });
        gsap.to(box, { opacity: 0, duration: 0.34, delay: 0.08, onComplete: finish });
      } else {
        finish();
      }
      if (opener) opener.focus({ preventScroll: true });
    }

    function onKey(e) { if (e.key === 'Escape') close(); }
    closeBtn.addEventListener('click', close);
    box.addEventListener('click', (e) => { if (e.target === box || e.target === stage) close(); });
  })();

  if (reduceMotion || typeof gsap === 'undefined') return; // 모션 없이 전부 표시

  gsap.registerPlugin(ScrollTrigger);

  // ── 관성 스무스 스크롤 — 다른 ScrollTrigger보다 먼저 만들어야 좌표가 맞는다
  let smoother = null;
  if (typeof ScrollSmoother !== 'undefined' && document.getElementById('smooth-wrapper')) {
    gsap.registerPlugin(ScrollSmoother);
    smoother = ScrollSmoother.create({ smooth: 1.1, effects: false });

    // smoother가 스크롤을 가로채므로 앵커 이동을 직접 위임한다
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        smoother.scrollTo(target, true, 'top 64px');
      });
    });
  }

  // ── 상단 진행 바
  gsap.to('#progressBar', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
  });

  // ── 히어로 인트로 — SplitText로 어절 단위 분해. 플러그인이 없으면 줄 단위로 폴백
  let heroParts;
  if (typeof SplitText !== 'undefined') {
    gsap.registerPlugin(SplitText);
    // 한국어는 Intl.Segmenter가 조사까지 쪼갤 수 있어 공백 기준으로 고정
    heroParts = new SplitText('.hero-title', { type: 'words', wordsClass: 'word', wordDelimiter: ' ' }).words;
  } else {
    document.querySelectorAll('.hero-title .line').forEach((line) => {
      const inner = document.createElement('span');
      inner.className = 'word';
      while (line.firstChild) inner.appendChild(line.firstChild);
      line.appendChild(inner);
    });
    heroParts = document.querySelectorAll('.hero-title .word');
  }
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero-eyebrow', { y: 18, opacity: 0, duration: 0.7 }, 0.15)
    .from(heroParts, { yPercent: 112, duration: 1.0, stagger: 0.09 }, 0.25)
    .from('.hero-sub', { y: 22, opacity: 0, duration: 0.8 }, 0.75)
    .from('.hero-stats > div', { y: 24, opacity: 0, duration: 0.7, stagger: 0.1 }, 0.95)
    .from('.scroll-cue', { opacity: 0, duration: 0.8 }, 1.3);

  // ── 히어로 패럴랙스 아웃
  gsap.to('.hero-inner', {
    yPercent: -14,
    opacity: 0.18,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('#net', {
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true },
  });

  // ── 공통 리빌
  gsap.utils.toArray('.rv').forEach((el) => {
    gsap.from(el, {
      y: 28,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%' },
    });
  });

  // ── 경력 타임라인 스파인 — 스크롤 진행에 맞춰 차오름
  gsap.to('.tl-fill', {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: { trigger: '#timeline', start: 'top 70%', end: 'bottom 55%', scrub: 0.4 },
  });

  // ── P.01 파이프라인 다이어그램 — 흐름 순서대로 조립
  const dgEls = gsap.utils.toArray('#pipeline .dg');
  if (dgEls.length) {
    gsap.set(dgEls, { opacity: 0 });
    ScrollTrigger.create({
      trigger: '#pipeline',
      start: 'top 78%',
      once: true,
      onEnter: () => gsap.to(dgEls, { opacity: 1, duration: 0.55, stagger: 0.22, ease: 'power2.out' }),
    });
  }
})();
