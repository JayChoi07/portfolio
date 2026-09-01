/* 히어로 노드 네트워크 — 커스텀 캔버스 3D 투영 (외부 3D 라이브러리 없이 ~5KB) */
(function () {
  const canvas = document.getElementById('net');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const N = 110;           // 노드 수
  const LINK_DIST = 176;   // 3D 거리 연결 임계값
  const FOV = 900;

  // 시드 고정 난수 — 로드할 때마다 같은(검증된) 배치가 나오게 한다
  let seed = 20260813;
  function rnd() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }
  const ACC = '21, 121, 63';    // #15793f — 밝은 배경에서도 선명한 딥 그린
  const INK = '20, 24, 31';     // #14181f — 오프화이트 위 잉크

  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0;
  let rotY = 0, rotX = -0.18;
  let targetRX = -0.18, targetRY = 0;
  let intro = reduceMotion ? 1 : 0; // 조립 진행도 0→1
  let running = true, raf = 0;
  const start = performance.now();

  // 납작한 타원체 클라우드에 점 분포 — 화면 우측에 중심
  const pts = [];
  for (let i = 0; i < N; i++) {
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    const r = 175 + rnd() * 140;
    const x = r * Math.sin(ph) * Math.cos(th) * 1.35;
    const y = r * Math.cos(ph) * 0.62;
    const z = r * Math.sin(ph) * Math.sin(th);
    const sc = 2.4 + rnd() * 1.4; // 흩어진 시작 위치 배율
    pts.push({
      x, y, z,
      sx: x * sc + (rnd() - 0.5) * 300,
      sy: y * sc + (rnd() - 0.5) * 300,
      sz: z * sc,
      accent: i % 7 === 0,
      delay: rnd() * 0.35,
      drift: rnd() * Math.PI * 2,
    });
  }

  // 엣지를 따라 흐르는 펄스(데이터 패킷)
  const pulses = Array.from({ length: 5 }, () => ({ a: 0, b: 0, t: 2 }));

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W > 760 ? W * 0.66 : W * 0.5;
    cy = H * 0.44;
  }

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    if (!running) return;
    const t = (now - start) / 1000;
    if (!reduceMotion) intro = Math.min(1, (now - start) / 1900);

    rotY += 0.0016 + (targetRY - rotY) * 0.03;
    rotX += (targetRX - rotX) * 0.04;
    const sy = Math.sin(rotY), cyr = Math.cos(rotY);
    const sx = Math.sin(rotX), cxr = Math.cos(rotX);

    ctx.clearRect(0, 0, W, H);

    // 3D 회전 + 투영
    const proj = [];
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      const k = ease(Math.max(0, Math.min(1, (intro - p.delay) / 0.65)));
      const wob = reduceMotion ? 0 : Math.sin(t * 0.7 + p.drift) * 6;
      const px = p.sx + (p.x - p.sx) * k;
      const py = p.sy + (p.y + wob - p.sy) * k;
      const pz = p.sz + (p.z - p.sz) * k;
      const x1 = px * cyr - pz * sy;
      const z1 = px * sy + pz * cyr;
      const y1 = py * cxr - z1 * sx;
      const z2 = py * sx + z1 * cxr;
      // 카메라 뒤로 넘어간 점은 투영 배율이 음수가 된다(인트로 산개 좌표에서 발생) — 클리핑
      if (z2 <= -FOV * 0.8) { proj.push({ x: 0, y: 0, s: 0, k: 0, x3: px, y3: py, z3: pz }); continue; }
      const s = Math.min(FOV / (FOV + z2), 2.2);
      proj.push({ x: cx + x1 * s, y: cy + y1 * s, s, x3: px, y3: py, z3: pz, k });
    }

    // 엣지
    ctx.lineWidth = 1;
    const edges = [];
    for (let i = 0; i < N; i++) {
      const a = proj[i];
      if (a.k <= 0) continue;
      for (let j = i + 1; j < N; j++) {
        const b = proj[j];
        if (b.k <= 0) continue;
        const dx = a.x3 - b.x3, dy = a.y3 - b.y3, dz = a.z3 - b.z3;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > LINK_DIST) continue;
        const alpha = (1 - d / LINK_DIST) * 0.22 * Math.min(a.s, b.s) * Math.min(a.k, b.k);
        ctx.strokeStyle = 'rgba(' + INK + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        edges.push([i, j]);
      }
    }

    // 펄스 — 초록 점이 엣지를 타고 이동
    if (!reduceMotion && edges.length) {
      for (const pl of pulses) {
        pl.t += 0.014;
        if (pl.t >= 1) {
          const e = edges[(Math.random() * edges.length) | 0];
          pl.a = e[0]; pl.b = e[1]; pl.t = 0;
        }
        const a = proj[pl.a], b = proj[pl.b];
        if (!a || !b || a.k <= 0 || b.k <= 0) continue;
        const px = a.x + (b.x - a.x) * pl.t;
        const py = a.y + (b.y - a.y) * pl.t;
        const fade = Math.sin(pl.t * Math.PI);
        ctx.fillStyle = 'rgba(' + ACC + ',' + (1 * fade).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(px, py, 1.8 * a.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 노드
    for (let i = 0; i < N; i++) {
      const p = pts[i], q = proj[i];
      if (q.k <= 0) continue;
      const depth = 0.35 + 0.65 * q.s;
      if (p.accent) {
        ctx.shadowColor = 'rgba(' + ACC + ',.5)';
        ctx.shadowBlur = 4 * q.s;
        ctx.fillStyle = 'rgba(' + ACC + ',' + (1 * depth * q.k).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(q.x, q.y, 2.4 * q.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(' + INK + ',' + (0.58 * depth * q.k).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(q.x, q.y, 1.4 * q.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (reduceMotion) return; // 정지 프레임 한 장만
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('pointermove', (e) => {
    const nx = e.clientX / W - 0.5, ny = e.clientY / H - 0.5;
    targetRY = nx * 0.35;
    targetRX = -0.18 + ny * 0.22;
  }, { passive: true });

  window.addEventListener('resize', resize);

  // 히어로가 화면 밖이면 루프 정지 (배터리 보호)
  const hero = canvas.closest('.hero');
  if ('IntersectionObserver' in window && hero && !reduceMotion) {
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !running) { running = true; raf = requestAnimationFrame(frame); }
      else if (!en.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0.02 }).observe(hero);
  }

  resize();
  raf = requestAnimationFrame(frame);
})();
