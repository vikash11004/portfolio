/* Reparent existing controls so switching sections never discards a draft. */
window.AdminWorkspace = (() => {
  const panes = new Map();
  const buttons = new Map();
  let sectionSelect;
  let initialized = false;
  function show(key) {
    if (!panes.has(key)) return;
    panes.forEach((pane, id) => { pane.hidden = id !== key; });
    buttons.forEach((button, id) => {
      button.setAttribute('aria-pressed', String(id === key));
    });
    if (sectionSelect) sectionSelect.value = key;
  }
  function init() {
    const form = document.getElementById('siteContentForm');
    if (!form || initialized) return;
    initialized = true;
    const names = {
      hero: 'Home introduction', background: 'Section headings',
      education: 'Education', experience: 'Experience', certification: 'Certifications', achievement: 'Achievements',
      skills: 'Capabilities', contact: 'Contact & socials', navigation: 'Navigation & footer'
    };
    const headings = {
      'Hero Section': 'hero', 'Background & Professional Journey': 'background',
      'Skills & Capabilities': 'skills', 'Contact & Social Links': 'contact',
      'Navigation, Archive & Footer': 'navigation'
    };
    const nav = document.createElement('nav');
    nav.className = 'content-workspace-nav';
    nav.setAttribute('aria-label', 'Website content sections');
    const mobileNav = document.createElement('label');
    mobileNav.className = 'content-workspace-mobile';
    mobileNav.textContent = 'Content section';
    sectionSelect = document.createElement('select');
    sectionSelect.className = 'workspace-section-select';
    sectionSelect.addEventListener('change', () => show(sectionSelect.value));
    // Navigation is not a content edit and must not mark the form dirty.
    sectionSelect.addEventListener('input', event => event.stopPropagation());
    mobileNav.append(sectionSelect);
    const body = document.createElement('div');
    body.className = 'content-workspace-body';
    const savebar = document.createElement('div');
    savebar.className = 'content-workspace-savebar';
    let current;
    for (const child of [...form.children]) {
      if (child.matches('.project-form__actions, #siteFormMessage')) {
        savebar.append(child);
        continue;
      }
      if (child.matches('.admin-section-divider')) {
        const key = headings[child.querySelector('h3')?.textContent.trim()];
        if (!key) { child.remove(); current = null; continue; }
        current = document.createElement('section');
        current.dataset.contentPane = key;
        current.id = `content-pane-${key}`;
        current.setAttribute('aria-label', names[key]);
        panes.set(key, current);
        body.append(current);
      }
      if (child.id === 'educationItemsContainer') {
        body.append(child);
        child.querySelectorAll('[data-collection]').forEach(collection => {
          const key = collection.dataset.collection;
          collection.dataset.contentPane = key;
          collection.id = `content-pane-${key}`;
          panes.set(key, collection);
        });
      } else if (current) current.append(child);
    }
    for (const [key, title] of Object.entries(names)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = title;
      button.setAttribute('aria-controls', `content-pane-${key}`);
      button.addEventListener('click', () => show(key));
      nav.append(button);
      buttons.set(key, button);
      const option = document.createElement('option');
      option.value = key;
      option.textContent = title;
      sectionSelect.append(option);
    }
    const status = document.createElement('span');
    status.className = 'workspace-save-state';
    status.setAttribute('role', 'status');
    const updateStatus = () => {
      status.textContent = form.dataset.saving === 'true' ? 'Saving changes...' : form.dataset.dirty === 'true' ? 'Unsaved changes' : 'No unsaved changes';
    };
    new MutationObserver(updateStatus).observe(form, { attributes: true, attributeFilter: ['data-dirty', 'data-saving'] });
    updateStatus();
    savebar.prepend(status);
    form.classList.add('content-workspace');
    form.append(nav, mobileNav, body, savebar);
    document.getElementById('siteFormMessage').setAttribute('role', 'status');
    form.addEventListener('invalid', event => {
      // Every invalid control fires an event; keep the first one visible for browser focus.
      const target = form.querySelector('input:invalid, textarea:invalid, select:invalid') || event.target;
      const pane = target.closest('[data-content-pane]');
      if (pane) show(pane.dataset.contentPane);
      const entry = target.closest('details');
      if (entry) entry.open = true;
    }, true);
    show('education');
  }
  return { init, show };
})();
