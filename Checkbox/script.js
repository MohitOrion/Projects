// =============================================
// Black Hole Checkbox — Point of No Return (v2)
// Fixed: animation loop stability, void scene
// =============================================

(function () {
  'use strict';

  // --- DOM ---
  const bgCanvas = document.getElementById('bgCanvas');
  const bhCanvas = document.getElementById('blackholeCanvas');
  const bgCtx = bgCanvas.getContext('2d');
  const bhCtx = bhCanvas.getContext('2d');
  const checkbox = document.getElementById('blackholeCheckbox');
  const wrapper = document.getElementById('checkboxWrapper');
  const container = document.getElementById('container');
  const title = document.getElementById('title');
  const subtitle = document.getElementById('subtitle');
  const statusBar = document.getElementById('statusBar');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const warningOverlay = document.getElementById('warningOverlay');
  const hoverWarning = document.getElementById('hoverWarning');
  const voidScene = document.getElementById('voidScene');
  const voidReset = document.getElementById('voidReset');

  // --- State ---
  let phase = 'idle'; // idle | consuming | consumed
  let consumeProgress = 0; // 0 -> 1 (smoothly animated)
  let consumeTarget = 0;   // target for consumeProgress

  // Black hole center — captured once on click, never drifts
  let bhCenterX = 0;
  let bhCenterY = 0;
  let bhCenterLocked = false;

  // --- Stars ---
  let stars = [];
  const STAR_COUNT = 350;

  // --- Accretion disk ---
  const accretionSegments = [];
  const ACCRETION_COUNT = 200;

  // --- Swirl particles ---
  const swirlParticles = [];
  const MAX_SWIRL = 400;

  // =============================================
  // Canvas Setup
  // =============================================
  function resizeCanvases() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    for (const c of [bgCanvas, bhCanvas]) {
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
      c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  // =============================================
  // Stars
  // =============================================
  function createStars() {
    stars = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < STAR_COUNT; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      stars.push({
        x, y, origX: x, origY: y,
        size: Math.random() * 2.2 + 0.3,
        brightness: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.8 ? (Math.random() > 0.5 ? 220 : 30) : 0,
        saturation: Math.random() > 0.8 ? 60 : 0,
        alive: true,
      });
    }
  }

  function drawStars(time) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    bgCtx.clearRect(0, 0, w, h);

    // Nebula background
    const ng = bgCtx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.6);
    ng.addColorStop(0, 'rgba(124, 58, 237, 0.03)');
    ng.addColorStop(0.5, 'rgba(59, 7, 100, 0.02)');
    ng.addColorStop(1, 'transparent');
    bgCtx.fillStyle = ng;
    bgCtx.fillRect(0, 0, w, h);

    const p = consumeProgress;

    for (const star of stars) {
      if (!star.alive) continue;

      let dx = star.origX - bhCenterX;
      let dy = star.origY - bhCenterY;
      let dist = Math.sqrt(dx * dx + dy * dy);

      let drawX = star.origX;
      let drawY = star.origY;
      let drawSize = star.size;

      if (p > 0.001 && bhCenterLocked) {
        const eventHorizon = 50 + 350 * p;
        const influence = 200 + 900 * p;

        if (dist < influence && dist > 1) {
          const strength = (1 - dist / influence) * p;
          const pull = strength * strength;
          const angle = Math.atan2(dy, dx);
          const spiralAngle = angle + pull * 3.5 * p;
          const newDist = dist * (1 - pull * 0.9);

          drawX = bhCenterX + Math.cos(spiralAngle) * newDist;
          drawY = bhCenterY + Math.sin(spiralAngle) * newDist;

          // Stretch near event horizon
          if (dist < eventHorizon * 1.8 && dist > 1) {
            drawSize *= 1 + (1 - dist / (eventHorizon * 1.8)) * 6 * p;
          }

          // Star consumed
          if (newDist < 12 || dist < eventHorizon * 0.25) {
            star.alive = false;
            continue;
          }
        }
      }

      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
      const alpha = star.brightness * twinkle;

      bgCtx.beginPath();
      bgCtx.arc(drawX, drawY, Math.max(0.1, drawSize), 0, Math.PI * 2);
      bgCtx.fillStyle = star.saturation > 0
        ? `hsla(${star.hue}, ${star.saturation}%, 80%, ${alpha})`
        : `rgba(232, 230, 240, ${alpha})`;
      bgCtx.fill();

      // Glow on bright stars
      if (drawSize > 1.5) {
        bgCtx.beginPath();
        bgCtx.arc(drawX, drawY, drawSize * 3, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(232, 230, 240, ${alpha * 0.06})`;
        bgCtx.fill();
      }
    }
  }

  // =============================================
  // Accretion Disk
  // =============================================
  function createAccretionDisk() {
    accretionSegments.length = 0;
    for (let i = 0; i < ACCRETION_COUNT; i++) {
      accretionSegments.push({
        angle: (i / ACCRETION_COUNT) * Math.PI * 2,
        radius: 80 + Math.random() * 80,
        thickness: 2 + Math.random() * 7,
        speed: 0.4 + Math.random() * 0.8,
        brightness: 0.4 + Math.random() * 0.6,
        hue: Math.random() > 0.45 ? 20 + Math.random() * 20 : 270 + Math.random() * 35,
      });
    }
  }

  // =============================================
  // Swirl Particles
  // =============================================
  function spawnSwirl() {
    if (swirlParticles.length >= MAX_SWIRL) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = 150 + Math.random() * 400;
    swirlParticles.push({
      x: bhCenterX + Math.cos(angle) * dist,
      y: bhCenterY + Math.sin(angle) * dist,
      vx: 0, vy: 0,
      size: 0.5 + Math.random() * 3,
      life: 1,
      decay: 0.002 + Math.random() * 0.004,
      hue: Math.random() > 0.3 ? 20 + Math.random() * 25 : 265 + Math.random() * 40,
      trail: [],
    });
  }

  function updateSwirls() {
    const p = consumeProgress;
    for (let i = swirlParticles.length - 1; i >= 0; i--) {
      const s = swirlParticles[i];
      const dx = bhCenterX - s.x;
      const dy = bhCenterY - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 3) {
        const grav = 1200 * p;
        const force = grav / (dist * dist + 1);
        s.vx += (dx / dist) * force;
        s.vy += (dy / dist) * force;
        const tanForce = 500 * p / (dist * dist + 1);
        s.vx += (-dy / dist) * tanForce;
        s.vy += (dx / dist) * tanForce;
        s.vx *= 0.985;
        s.vy *= 0.985;
        s.x += s.vx;
        s.y += s.vy;
      }

      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 15) s.trail.shift();
      s.life -= s.decay;

      if (s.life <= 0 || dist < 15) {
        swirlParticles.splice(i, 1);
      }
    }
  }

  // =============================================
  // Draw Black Hole
  // =============================================
  function drawBlackHole(time) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    bhCtx.clearRect(0, 0, w, h);

    const p = consumeProgress;
    if (p < 0.005) return;

    const cx = bhCenterX;
    const cy = bhCenterY;
    const scale = 1 + p * 3.5;

    // --- Outer glow (grows massive) ---
    const outerR = Math.max(1, (200 + p * 600) * p);
    const outerGlow = bhCtx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
    outerGlow.addColorStop(0, `rgba(124, 58, 237, ${0.22 * p})`);
    outerGlow.addColorStop(0.2, `rgba(124, 58, 237, ${0.12 * p})`);
    outerGlow.addColorStop(0.5, `rgba(80, 20, 180, ${0.04 * p})`);
    outerGlow.addColorStop(1, 'transparent');
    bhCtx.beginPath();
    bhCtx.arc(cx, cy, outerR, 0, Math.PI * 2);
    bhCtx.fillStyle = outerGlow;
    bhCtx.fill();

    // --- Gravitational lensing ring (Einstein ring) ---
    const lensR = Math.max(1, 130 * p * scale);
    const lensGrad = bhCtx.createRadialGradient(cx, cy, Math.max(0.5, lensR - 20), cx, cy, lensR + 20);
    lensGrad.addColorStop(0, 'transparent');
    lensGrad.addColorStop(0.3, `rgba(96, 165, 250, ${0.1 * p})`);
    lensGrad.addColorStop(0.5, `rgba(96, 165, 250, ${0.2 * p})`);
    lensGrad.addColorStop(0.7, `rgba(96, 165, 250, ${0.1 * p})`);
    lensGrad.addColorStop(1, 'transparent');
    bhCtx.beginPath();
    bhCtx.arc(cx, cy, lensR + 20, 0, Math.PI * 2);
    bhCtx.fillStyle = lensGrad;
    bhCtx.fill();

    // --- Accretion disk (tilted, spinning faster as it consumes) ---
    const diskSpeed = 1 + p * 10;
    bhCtx.save();
    bhCtx.translate(cx, cy);
    bhCtx.scale(1, 0.3);

    for (const seg of accretionSegments) {
      seg.angle += seg.speed * 0.01 * diskSpeed * p;
      const r = Math.max(0.1, seg.radius * p * scale);
      const sx = Math.cos(seg.angle) * r;
      const sy = Math.sin(seg.angle) * r;
      const a = seg.brightness * p;
      const gl = Math.max(0.1, seg.thickness * p * scale);

      // Outer glow
      bhCtx.beginPath();
      bhCtx.arc(sx, sy, gl + 3, 0, Math.PI * 2);
      bhCtx.fillStyle = `hsla(${seg.hue}, 100%, 65%, ${a * 0.12})`;
      bhCtx.fill();

      // Core
      bhCtx.beginPath();
      bhCtx.arc(sx, sy, gl * 0.5, 0, Math.PI * 2);
      bhCtx.fillStyle = `hsla(${seg.hue}, 100%, 85%, ${a * 0.65})`;
      bhCtx.fill();
    }

    // Accretion ring glow
    const ringR = Math.max(1, 170 * p * scale);
    const ringGlow = bhCtx.createRadialGradient(0, 0, Math.max(0.5, 80 * p * scale), 0, 0, ringR);
    ringGlow.addColorStop(0, `rgba(255, 107, 0, ${0.1 * p})`);
    ringGlow.addColorStop(0.5, `rgba(255, 157, 0, ${0.05 * p})`);
    ringGlow.addColorStop(1, 'transparent');
    bhCtx.beginPath();
    bhCtx.arc(0, 0, ringR, 0, Math.PI * 2);
    bhCtx.fillStyle = ringGlow;
    bhCtx.fill();

    bhCtx.restore();

    // --- Photon sphere ---
    const photonR = Math.max(1, 85 * p * scale);
    bhCtx.beginPath();
    bhCtx.arc(cx, cy, photonR, 0, Math.PI * 2);
    bhCtx.strokeStyle = `rgba(255, 200, 100, ${0.25 * p})`;
    bhCtx.lineWidth = 2 * p;
    bhCtx.stroke();

    bhCtx.beginPath();
    bhCtx.arc(cx, cy, photonR + 5 * p, 0, Math.PI * 2);
    bhCtx.strokeStyle = `rgba(168, 85, 247, ${0.18 * p})`;
    bhCtx.lineWidth = 1.5 * p;
    bhCtx.stroke();

    // --- Event horizon (the abyss, growing) ---
    const eventR = Math.max(1, (50 + p * 300) * p);
    const eventGrad = bhCtx.createRadialGradient(cx, cy, 0, cx, cy, eventR);
    eventGrad.addColorStop(0, `rgba(0, 0, 0, ${p})`);
    eventGrad.addColorStop(0.75, `rgba(0, 0, 0, ${p})`);
    eventGrad.addColorStop(0.92, `rgba(3, 3, 5, ${0.95 * p})`);
    eventGrad.addColorStop(1, `rgba(5, 5, 10, ${0.4 * p})`);
    bhCtx.beginPath();
    bhCtx.arc(cx, cy, eventR, 0, Math.PI * 2);
    bhCtx.fillStyle = eventGrad;
    bhCtx.fill();

    // --- Hawking radiation shimmer ---
    if (p > 0.15) {
      for (let i = 0; i < 12; i++) {
        const a = (time * 0.0004 + (i / 12) * Math.PI * 2) % (Math.PI * 2);
        const r = eventR + 3 + Math.sin(time * 0.003 + i * 1.5) * 4;
        const hx = cx + Math.cos(a) * r;
        const hy = cy + Math.sin(a) * r;
        const ha = (Math.sin(time * 0.005 + i * 2) * 0.3 + 0.3) * p;
        bhCtx.beginPath();
        bhCtx.arc(hx, hy, 1.5, 0, Math.PI * 2);
        bhCtx.fillStyle = `rgba(200, 180, 255, ${ha})`;
        bhCtx.fill();
      }
    }

    // --- Swirl particles ---
    for (const sp of swirlParticles) {
      if (sp.trail.length > 1) {
        bhCtx.beginPath();
        bhCtx.moveTo(sp.trail[0].x, sp.trail[0].y);
        for (let j = 1; j < sp.trail.length; j++) {
          bhCtx.lineTo(sp.trail[j].x, sp.trail[j].y);
        }
        bhCtx.strokeStyle = `hsla(${sp.hue}, 100%, 70%, ${sp.life * 0.25})`;
        bhCtx.lineWidth = sp.size * 0.5;
        bhCtx.stroke();
      }
      bhCtx.beginPath();
      bhCtx.arc(sp.x, sp.y, Math.max(0.1, sp.size * sp.life), 0, Math.PI * 2);
      bhCtx.fillStyle = `hsla(${sp.hue}, 100%, 75%, ${sp.life * 0.8})`;
      bhCtx.fill();
    }

    // --- Gravitational wave ripples ---
    if (p > 0.1) {
      const wt = time * 0.001;
      const maxWR = 400 * p;
      for (let i = 0; i < 4; i++) {
        const wr = ((wt * 50 + i * 100) % maxWR);
        const wa = (1 - wr / maxWR) * 0.06 * p;
        if (wa > 0.001) {
          bhCtx.beginPath();
          bhCtx.arc(cx, cy, wr + eventR, 0, Math.PI * 2);
          bhCtx.strokeStyle = `rgba(124, 58, 237, ${wa})`;
          bhCtx.lineWidth = 1;
          bhCtx.stroke();
        }
      }
    }

    // --- Space distortion overlay ---
    if (p > 0.3) {
      const distR = Math.max(1, 350 * p);
      const distGrad = bhCtx.createRadialGradient(cx, cy, eventR, cx, cy, distR);
      distGrad.addColorStop(0, `rgba(3, 3, 5, ${0.4 * p})`);
      distGrad.addColorStop(0.5, `rgba(3, 3, 5, ${0.15 * p})`);
      distGrad.addColorStop(1, 'transparent');
      bhCtx.beginPath();
      bhCtx.arc(cx, cy, distR, 0, Math.PI * 2);
      bhCtx.fillStyle = distGrad;
      bhCtx.fill();
    }

    // --- Final blackout ---
    if (p > 0.82) {
      const blackout = Math.min(1, (p - 0.82) / 0.18);
      bhCtx.fillStyle = `rgba(3, 3, 5, ${blackout})`;
      bhCtx.fillRect(0, 0, w, h);
    }
  }

  // =============================================
  // UI Spaghettification (elements pulled in)
  // =============================================
  function applySpaghettification() {
    const p = consumeProgress;
    const elements = [
      { el: title, rotDir: 5 },
      { el: subtitle, rotDir: -3 },
      { el: wrapper, rotDir: 2 },
      { el: statusBar, rotDir: -4 },
      { el: hoverWarning, rotDir: 1 },
    ];

    for (const { el, rotDir } of elements) {
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      const elCx = rect.left + rect.width / 2;
      const elCy = rect.top + rect.height / 2;
      const dx = bhCenterX - elCx;
      const dy = bhCenterY - elCy;
      const angle = Math.atan2(dy, dx);

      // Accelerating pull
      const pull = p * p * p * 120;
      const tx = Math.cos(angle) * pull;
      const ty = Math.sin(angle) * pull;

      // Shrink into singularity
      const scale = Math.max(0, 1 - p * p * 1.3);

      // Fade out
      const opacity = Math.max(0, 1 - p * 1.6);

      // Blur as stretched
      const blur = p * p * 12;

      el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${p * p * rotDir}deg)`;
      el.style.opacity = String(opacity);
      el.style.filter = `blur(${blur}px)`;
    }
  }

  // =============================================
  // Screen Shake
  // =============================================
  function applyShake(time) {
    if (phase !== 'consuming') {
      document.body.style.transform = '';
      return;
    }
    const intensity = consumeProgress * 7;
    const ox = Math.sin(time * 0.017) * intensity * (0.6 + Math.random() * 0.4);
    const oy = Math.cos(time * 0.019) * intensity * (0.6 + Math.random() * 0.4);
    const rot = Math.sin(time * 0.011) * intensity * 0.04;
    document.body.style.transform = `translate(${ox}px, ${oy}px) rotate(${rot}deg)`;
  }

  // =============================================
  // Hover Warning
  // =============================================
  wrapper.addEventListener('mouseenter', () => {
    if (phase !== 'idle') return;
    hoverWarning.classList.add('visible');
    warningOverlay.classList.add('visible');
    statusDot.style.background = '#ef4444';
    statusDot.style.boxShadow = '0 0 12px #ef4444';
    statusText.style.color = '#ef4444';
    statusText.textContent = '⚠ DANGER';
  });

  wrapper.addEventListener('mouseleave', () => {
    if (phase !== 'idle') return;
    hoverWarning.classList.remove('visible');
    warningOverlay.classList.remove('visible');
    statusDot.style.background = '';
    statusDot.style.boxShadow = '';
    statusText.style.color = '';
    statusText.textContent = 'Awaiting activation';
  });

  // =============================================
  // THE CLICK — No Going Back
  // =============================================
  checkbox.addEventListener('change', function () {
    if (!this.checked || phase !== 'idle') return;

    // Lock the black hole center at the checkbox position BEFORE any transforms
    const rect = wrapper.getBoundingClientRect();
    bhCenterX = rect.left + rect.width / 2;
    bhCenterY = rect.top + rect.height / 2;
    bhCenterLocked = true;

    // Disable forever
    this.disabled = true;
    phase = 'consuming';
    consumeTarget = 1;

    // Clear warnings
    hoverWarning.classList.remove('visible');
    warningOverlay.classList.remove('visible');

    // Update status
    statusDot.style.background = '#f97316';
    statusDot.style.boxShadow = '0 0 15px #f97316, 0 0 30px rgba(249, 115, 22, 0.4)';
    statusText.style.color = '#f97316';
    statusText.textContent = 'SINGULARITY FORMING...';

    container.classList.add('consumed');

    // Initial burst shake
    document.body.style.animation = 'heavyShake 0.6s ease-out';
    setTimeout(() => { document.body.style.animation = ''; }, 650);
  });

  // =============================================
  // Reset Universe
  // =============================================
  voidReset.addEventListener('click', () => {
    phase = 'idle';
    consumeProgress = 0;
    consumeTarget = 0;
    bhCenterLocked = false;
    checkbox.checked = false;
    checkbox.disabled = false;

    // Reset all UI
    container.classList.remove('consumed');
    voidScene.classList.remove('visible');

    const els = [title, subtitle, wrapper, statusBar, hoverWarning];
    for (const el of els) {
      if (!el) continue;
      el.style.transform = '';
      el.style.opacity = '';
      el.style.filter = '';
    }
    document.body.style.transform = '';
    statusDot.style.background = '';
    statusDot.style.boxShadow = '';
    statusText.style.color = '';
    statusText.textContent = 'Awaiting activation';

    // Reinit everything
    createStars();
    swirlParticles.length = 0;
  });

  // =============================================
  // Main Loop (bulletproof)
  // =============================================
  let lastSpawn = 0;
  let voidShown = false;

  function animate(time) {
    // ALWAYS schedule next frame first, so loop never dies
    requestAnimationFrame(animate);

    try {
      // --- Smooth progress animation ---
      if (phase === 'consuming') {
        // Ease in: slow start, accelerating
        consumeProgress += (consumeTarget - consumeProgress) * 0.008;
        // Ensure it reaches 1
        if (consumeTarget === 1 && consumeProgress > 0.995) {
          consumeProgress = 1;
        }

        // Spawn swirl particles
        if (time - lastSpawn > 25) {
          for (let i = 0; i < 5; i++) spawnSwirl();
          lastSpawn = time;
        }

        // Update status text at milestones
        if (consumeProgress > 0.15 && consumeProgress < 0.45) {
          statusText.textContent = 'CONSUMING SPACETIME...';
        } else if (consumeProgress >= 0.45 && consumeProgress < 0.75) {
          statusText.textContent = 'REALITY COLLAPSING...';
        } else if (consumeProgress >= 0.75) {
          statusText.textContent = 'BEYOND THE HORIZON';
        }

        applySpaghettification();
        applyShake(time);

        // Done consuming
        if (consumeProgress >= 1 && !voidShown) {
          voidShown = true;
          phase = 'consumed';
          document.body.style.transform = '';
          setTimeout(() => {
            voidScene.classList.add('visible');
          }, 600);
        }
      }

      // Reset void tracking
      if (phase === 'idle') {
        voidShown = false;
      }

      updateSwirls();
      drawStars(time);
      drawBlackHole(time);

    } catch (err) {
      console.error('Animation error:', err);
    }
  }

  // =============================================
  // Init
  // =============================================
  function init() {
    resizeCanvases();
    createStars();
    createAccretionDisk();

    // Initial center (will be locked on click)
    const rect = wrapper.getBoundingClientRect();
    bhCenterX = rect.left + rect.width / 2;
    bhCenterY = rect.top + rect.height / 2;

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => {
    resizeCanvases();
    if (phase === 'idle') createStars();
  });

  init();
})();
