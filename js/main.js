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
  if (reduceMotion || typeof gsap === 'undefined') return; // 모션 없이 전부 표시

  gsap.registerPlugin(ScrollTrigger);

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
