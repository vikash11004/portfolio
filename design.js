/* Progressive motion enhancement: no animation dependency or scroll hijacking. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const portrait = document.querySelector('.hero__image-wrapper');
  const progress = document.querySelector('.reading-progress');
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
