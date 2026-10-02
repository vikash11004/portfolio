/* Progressive motion enhancement: no animation dependency or scroll hijacking. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const cursor = document.querySelector('.custom-cursor');
  const portrait = document.querySelector('.hero__image-wrapper');
  const progress = document.querySelector('.reading-progress');
  let frame = 0;
  let targetX = 0, targetY = 0, x = 0, y = 0;
  let moving = false;

  function drawCursor() {
    x += (targetX - x) * .24;
    y += (targetY - y) * .24;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    if (moving && (Math.abs(targetX - x) > .1 || Math.abs(targetY - y) > .1)) {
      frame = requestAnimationFrame(drawCursor);
    } else frame = 0;
  }
  document.addEventListener('pointermove', event => {
    if (!finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
    targetX = event.clientX;
    targetY = event.clientY;
    if (!moving) { x = targetX; y = targetY; }
    moving = true;
    cursor.style.opacity = '1';
    const interactive = event.target.closest('a, button, [role="button"], input, textarea');
    cursor.classList.toggle('is-link', !!interactive);
    cursor.classList.toggle('is-project', !!event.target.closest('.project-card'));
    if (!frame) frame = requestAnimationFrame(drawCursor);
  }, { passive: true });
  function hideCursor() {
    moving = false;
    cursor.style.opacity = '0';
    cancelAnimationFrame(frame);
    frame = 0;
  }
  document.documentElement.addEventListener('pointerleave', hideCursor);
  window.addEventListener('blur', hideCursor);
  document.addEventListener('pointerdown', hideCursor, { passive: true });
  reducedMotion.addEventListener('change', hideCursor);
  finePointer.addEventListener('change', hideCursor);
  document.addEventListener('keydown', event => { if (event.key === 'Tab') hideCursor(); });

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
