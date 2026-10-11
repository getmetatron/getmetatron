(() => {
  'use strict';
  const slides = window.TALK_SLIDES;
  const image = document.getElementById('slide');
  const stage = document.getElementById('stage');
  const picker = document.getElementById('slide-picker');
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const present = document.getElementById('present');
  const offline = document.getElementById('offline');
  const status = document.getElementById('offline-status');
  let current = 1;
  let hideTimer;
  let wakeLock;
  const imageURL = n => `./slides/${String(n).padStart(2, '0')}.webp`;
  const fromHash = () => {
    const match = location.hash.match(/^#slide-(\d+)$/);
    return match ? Number(match[1]) : 1;
  };
  picker.replaceChildren(...slides.map((slide, i) => {
    const option = document.createElement('option');
    option.value = i + 1;
    option.textContent = `${i + 1} / ${slides.length} · ${i >= 18 ? 'Backup: ' : ''}${slide.title}`;
    return option;
  }));
  function show(n, updateHash = true) {
    current = Math.max(1, Math.min(slides.length, Number(n) || 1));
    const slide = slides[current - 1];
    document.getElementById('image-error').hidden = true;
    image.src = imageURL(current);
    image.alt = `Slide ${current}: ${slide.title}`;
    picker.value = current;
    previous.disabled = current === 1;
    next.disabled = current === slides.length;
    stage.setAttribute('aria-label', current === slides.length ? 'Final slide' : `Next slide; currently slide ${current}: ${slide.title}`);
    document.getElementById('announcement').textContent = `Slide ${current} of ${slides.length}: ${slide.title}`;
    document.getElementById('slide-text').textContent = slide.text;
    if (updateHash) history.replaceState(null, '', `#slide-${current}`);
    // Warm nearby slides before the presenter advances.
    for (const neighbor of [current + 1, current - 1]) {
      if (neighbor > 0 && neighbor <= slides.length) new Image().src = imageURL(neighbor);
    }
  }
  image.addEventListener('error', () => { document.getElementById('image-error').hidden = false; });
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  picker.addEventListener('change', () => show(picker.value));
  let swiped = false;
  let touchStart;
  stage.addEventListener('touchstart', e => { touchStart = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; swiped = false; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (!touchStart || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped = true;
      show(current + (dx < 0 ? 1 : -1));
    }
    touchStart = null;
  }, { passive: true });
  stage.addEventListener('click', () => { if (!swiped) show(current + 1); swiped = false; });
  window.addEventListener('hashchange', () => show(fromHash(), false));
  function revealControls() {
    clearTimeout(hideTimer);
    document.body.classList.remove('controls-hidden');
    if (document.body.classList.contains('presenting')) {
      hideTimer = setTimeout(() => {
        if (!document.getElementById('controls').contains(document.activeElement)) document.body.classList.add('controls-hidden');
      }, 2400);
    }
  }
  async function holdScreen() {
    if ('wakeLock' in navigator && document.body.classList.contains('presenting')) {
      try { wakeLock = await navigator.wakeLock.request('screen'); } catch { /* Presentation works without a wake lock. */ }
    }
  }
  function setPresenting(value) {
    document.body.classList.toggle('presenting', value);
    present.textContent = value ? 'Exit presentation' : 'Present ⛶';
    present.setAttribute('aria-pressed', String(value));
    if (value) { stage.focus({ preventScroll: true }); holdScreen(); }
    else { if (wakeLock) wakeLock.release().catch(() => {}); present.focus({ preventScroll: true }); }
    revealControls();
  }
  async function exitPresentation() {
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* Exit the page-level mode below. */ } }
    setPresenting(false);
  }
  async function togglePresentation() {
    if (document.body.classList.contains('presenting')) return exitPresentation();
    setPresenting(true);
    // CSS presentation mode is also available on browsers without Fullscreen API support.
    try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } catch { /* Keep the page-level presentation mode. */ }
  }
  present.addEventListener('click', togglePresentation);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) setPresenting(false); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') holdScreen(); });
  document.addEventListener('pointermove', revealControls);
  document.addEventListener('focusin', revealControls);
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || /^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.key === 'Escape') { if (document.body.classList.contains('presenting')) { e.preventDefault(); exitPresentation(); } return; }
    if (e.key.toLowerCase() === 'f') { e.preventDefault(); togglePresentation(); return; }
    // Preserve native Enter/Space activation on buttons and links.
    if ((e.key === ' ' || e.key === 'Enter') && e.target.closest('button, a, summary')) return;
    const forward = ['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key);
    const backward = ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key);
    if (forward || backward || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      show(e.key === 'Home' ? 1 : e.key === 'End' ? slides.length : current + (forward ? 1 : -1));
    }
  });
  show(fromHash(), false);
  if ('serviceWorker' in navigator) {
    const registration = navigator.serviceWorker.register('./sw.js');
    registration.catch(() => { status.textContent = 'Offline saving is unavailable here. Download the PDF as your backup.'; offline.disabled = true; });
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'OFFLINE_READY') {
        offline.disabled = false;
        offline.textContent = 'Saved offline ✓';
        status.textContent = 'All 24 slides and the PDF are saved in this browser on this computer. Reopen this same URL here to present offline; clearing browser data removes the saved copy.';
      } else if (e.data?.type === 'OFFLINE_ERROR') {
        offline.disabled = false;
        offline.textContent = 'Retry offline save';
        status.textContent = 'The complete deck could not be saved. Check your connection and try again, or download the PDF.';
      }
    });
    registration.then(() => navigator.serviceWorker.ready).then(ready => {
      ready.active.postMessage({ type: 'CHECK_OFFLINE' });
    }).catch(() => {});
    offline.addEventListener('click', async () => {
      offline.disabled = true;
      offline.textContent = 'Saving all slides…';
      status.textContent = 'Keep this page open while the slides and PDF are saved.';
      try {
        await registration;
        const ready = await navigator.serviceWorker.ready;
        ready.active.postMessage({ type: 'SAVE_OFFLINE' });
      } catch {
        offline.disabled = false;
        offline.textContent = 'Retry offline save';
        status.textContent = 'Offline saving failed. Download the PDF as your backup.';
      }
    });
  } else {
    offline.disabled = true;
    status.textContent = 'This browser does not support offline saving. Download the PDF as your backup.';
  }
})();
