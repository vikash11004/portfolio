/* Progressive motion enhancement: no animation dependency or scroll hijacking. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const portrait = document.querySelector('.hero__image-wrapper');
  const progress = document.querySelector('.reading-progress');
  const cursor = document.querySelector('.custom-cursor');
  let cursorFrame = 0;
  let pointerX = 0, pointerY = 0;
  const resetCursor = () => {
    document.body.classList.remove('cursor-active');
    cursor?.classList.remove('is-pressed');
    cancelAnimationFrame(cursorFrame);
    cursorFrame = 0;
  };
  document.addEventListener('pointermove', event => {
    if (!cursor || !finePointer.matches || reducedMotion.matches || event.pointerType === 'touch' || event.target.closest('input, textarea, select, [contenteditable], :disabled')) {
      resetCursor();
      return;
    }
    pointerX = event.clientX;
    pointerY = event.clientY;
    cursor.classList.toggle('is-link', !!event.target.closest('a, button, [role="button"]'));
    if (!cursorFrame) cursorFrame = requestAnimationFrame(() => {
      cursor.style.transform = `translate3d(${pointerX - 15}px, ${pointerY - 15}px, 0)`;
      document.body.classList.add('cursor-active');
      cursorFrame = 0;
    });
  }, { passive: true });
  document.addEventListener('pointerdown', () => cursor?.classList.add('is-pressed'), { passive: true });
  document.addEventListener('pointerup', () => cursor?.classList.remove('is-pressed'), { passive: true });
  document.documentElement.addEventListener('pointerleave', resetCursor);
  window.addEventListener('blur', resetCursor);
  document.addEventListener('keydown', resetCursor);
  finePointer.addEventListener('change', resetCursor);
  reducedMotion.addEventListener('change', resetCursor);
  portrait.addEventListener('pointermove', event => {
    if (reducedMotion.matches || !finePointer.matches) return;
    const bounds = portrait.getBoundingClientRect();
    portrait.style.setProperty('--portrait-x', `${(event.clientX - bounds.left - bounds.width / 2) * .025}px`);
    portrait.style.setProperty('--portrait-y', `${(event.clientY - bounds.top - bounds.height / 2) * .025}px`);
  }, { passive: true });
  portrait.addEventListener('pointerleave', () => {
    portrait.style.setProperty('--portrait-x', '0px');
    portrait.style.setProperty('--portrait-y', '0px');
  });
  let scrollPending = false;
  function updateProgress() {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${available > 0 ? Math.min(1, window.scrollY / available) : 0})`;
    scrollPending = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  document.querySelector('.skip-link').addEventListener('click', event => {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    event.preventDefault();
    activePage.tabIndex = -1;
    activePage.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });
  new MutationObserver(() => toggle.setAttribute('aria-expanded', String(links.classList.contains('open'))))
    .observe(links, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && links.classList.contains('open')) {
      toggle.click();
      toggle.focus();
    }
  });
})();
