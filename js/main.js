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

  // ── 히어로 인트로
  const lines = document.querySelectorAll('.hero-title .line');
  lines.forEach((line) => {
    const inner = document.createElement('span');
    inner.className = 'word';
    while (line.firstChild) inner.appendChild(line.firstChild);
    line.appendChild(inner);
  });
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero-eyebrow', { y: 18, opacity: 0, duration: 0.7 }, 0.15)
    .from('.hero-title .word', { yPercent: 112, duration: 1.0, stagger: 0.12 }, 0.25)
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

  // ── P.01 파이프라인 다이어그램 — 스크롤 핀 스토리텔링
  //    화면을 고정한 채 스크롤 진행도가 파이프라인 조립 순서를 재생한다(역스크롤 = 되감기).
  //    좁은 화면에서는 핀 없이 순차 등장으로 폴백.
  const dgEls = gsap.utils.toArray('#pipeline .dg');
  if (dgEls.length) {
    const lines = gsap.utils.toArray('#pipeline > line.dg');
    const stages = [
      '#dg-zone',        // 무인 동작 경계
      '#dg-a',           // 하이웍스 메일함
      lines[0], '#dg-b', // → 자동 수집
      lines[1], '#dg-c', // → AI 진단
      '#dg-know',        // 위키·앱 코드 교차검증
      lines[2], '#dg-d', // → 답변 초안
      '#dg-e',           // → 담당자 검토
      '#dg-loop',        // 원클릭 발송 루프 완성
    ];
    const groups = stages.filter((s) => typeof s === 'string');
    gsap.set(dgEls, { opacity: 0 });
    gsap.set(groups, { y: 16 });

    if (window.matchMedia('(min-width: 900px)').matches) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.diagram',
          start: 'top 16%',
          end: '+=1500',
          pin: true,
          scrub: 0.4,
          anticipatePin: 1,
        },
      });
      stages.forEach((s) => {
        tl.to(s, { opacity: 1, y: 0, duration: 1, ease: 'none' }, '>-0.25');
      });
      tl.to({}, { duration: 1.2 }); // 완성된 그림을 잠시 감상할 여백
    } else {
      ScrollTrigger.create({
        trigger: '#pipeline',
        start: 'top 78%',
        once: true,
        onEnter: () => gsap.to(stages, { opacity: 1, y: 0, duration: 0.55, stagger: 0.2, ease: 'power2.out' }),
      });
    }
  }
})();
