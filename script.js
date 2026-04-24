/* ============================================
   PORTFOLIO — Script
   Routing, Data, Animations, Interactions
   ============================================ */

// ─── Project Data ───────────────────────────────
const FALLBACK_PROJECTS = [];

// ─── Supabase Config ────────────────────────────
const APP_CONFIG = window.PORTFOLIO_CONFIG || {};
const SUPABASE_URL = APP_CONFIG.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = APP_CONFIG.SUPABASE_ANON_KEY || '';
const OWNER_EMAIL = APP_CONFIG.OWNER_EMAIL || '';
const DEFAULT_THUMBNAIL = 'assets/images/project-1.png';

const CATEGORY_LABELS = {
  web: 'Web App',
  design: 'Design',
  oss: 'Open Source',
  software: 'Software'
};

let projectsState = [...FALLBACK_PROJECTS];
let supabaseClient = null;
let supabaseReady = false;
let currentUser = null;
let adminSessionChecked = false;

// ─── Skills Data ────────────────────────────────
const SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js',
  'Python', 'C++', 'HTML', 'CSS', 'Bootstrap',
  'PHP', 'Pandas', 'Power BI', 'MySQL', 'NoSQL',
  'PostgreSQL', 'MongoDB', 'Git', 'Figma', 'GraphQL',
  'REST APIs', 'TailwindCSS', 'AWS', 'Firebase', 'Vercel', 'Linux'
];


// ─── DOM References ─────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const loader = $('#loader');
const navbar = $('#navbar');
const navLinks = $('#navLinks');
const navToggle = $('#navToggle');
const pageTransition = $('#pageTransition');

const pages = {
  home: $('#page-home'),
  projects: $('#page-projects'),
  detail: $('#page-detail')
};

let currentPage = 'home';
let currentProjectId = null;


// ─── Initialization ─────────────────────────────
async function init() {
  if (window.__portfolioInitialized) return;
  window.__portfolioInitialized = true;

  setupSupabase();
  setupScrollEffects();
  setupIntersectionObserver();
  setupNavigation();
  setupFilterTabs();
  setupProjectNavigation();
  setupAdminEvents();
  setupContactForm();

  if (supabaseReady) {
    await restoreAuthSession();
  } else {
    updateAdminAvailability();
  }

  await loadProjects();

  updateNavbarTheme();
  updateHomeNavActiveState();

  populateFeaturedProjects();
  populateProjectsGrid();
  populateSkillsMarquee();
  renderAdminProjectsList();

  // Hide loader after a short delay for effect
  requestAnimationFrame(() => {
    setTimeout(hideLoader, 400);
  });
}

function hideLoader() {
  const loaderEl = document.getElementById('loader');
  if (!loaderEl) return;

  loaderEl.style.transition = 'opacity 0.5s ease, visibility 0.5s ease';
  loaderEl.style.opacity = '0';
  loaderEl.style.visibility = 'hidden';

  setTimeout(() => {
    if (loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl);
    triggerInitialReveals();
  }, 500);
}

function triggerInitialReveals() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;

  activePage.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 200) {
      el.classList.add('visible');
    }
  });
}

// Robust multi-trigger initialization
(function bootstrap() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init().catch(console.error);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      init().catch(console.error);
    });
  }
  // Absolute fallback
  setTimeout(() => {
    init().catch(console.error);
  }, 2000);
})();


// ─── Supabase / Auth / Data ─────────────────────
function setupSupabase() {
  const hasConfig =
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    OWNER_EMAIL &&
    !SUPABASE_URL.includes('YOUR_SUPABASE') &&
    !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE') &&
    !OWNER_EMAIL.includes('your-email');

  if (!hasConfig || !window.supabase || !window.supabase.createClient) {
    supabaseReady = false;
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  supabaseReady = true;

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;
    adminSessionChecked = true;
    updateAdminVisibility();
    updateAdminAvailability();
    renderAdminProjectsList();
  });
}

async function restoreAuthSession() {
  if (!supabaseReady) return;

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error('Unable to restore session:', error.message);
  }

  currentUser = data && data.session ? data.session.user : null;
  adminSessionChecked = true;
  updateAdminVisibility();
  updateAdminAvailability();
}

function isOwnerLoggedIn() {
  return !!currentUser && currentUser.email === OWNER_EMAIL;
}

function updateAdminVisibility() {
  // Admin now lives on a separate page.
}

function updateAdminAvailability() {
  const disabledBox = $('#adminDisabled');
  const panel = $('#adminPanel');
  const authStatus = $('#adminAuthStatus');

  if (!disabledBox || !panel || !authStatus) return;

  if (!supabaseReady) {
    disabledBox.hidden = false;
    panel.hidden = true;
    authStatus.textContent = 'Admin disabled until Supabase configuration is added in script.js.';
    return;
  }

  disabledBox.hidden = true;

  if (isOwnerLoggedIn()) {
    panel.hidden = false;
    authStatus.textContent = `Signed in as ${currentUser.email}`;
  } else if (adminSessionChecked && currentUser && currentUser.email !== OWNER_EMAIL) {
    panel.hidden = true;
    authStatus.textContent = 'This account is not authorized for admin access.';
  } else {
    panel.hidden = true;
    authStatus.textContent = 'Sign in as the owner to manage projects.';
  }
}

async function loadProjects() {
  if (!supabaseReady) {
    projectsState = [...FALLBACK_PROJECTS];
    return;
  }

  const { data, error } = await supabaseClient
    .from('projects')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed loading projects from Supabase:', error.message);
    projectsState = [...FALLBACK_PROJECTS];
    return;
  }

  projectsState = (data || []).map(mapDbProjectToViewModel);
}

function mapDbProjectToViewModel(row) {
  const screenshotUrls = parseUrlList(row.screenshot_urls, []);
  const categories = parseCategoryList(row.categories, row.category ? [row.category] : []);

  return {
    rowId: row.id,
    id: row.slug,
    title: row.title,
    category: categories[0] || row.category || 'web',
    categories,
    categoryLabel: formatCategoryLabel(categories),
    year: String(row.year || ''),
    role: row.role,
    thumbnail: row.thumbnail_url || DEFAULT_THUMBNAIL,
    screenshotUrls,
    description: row.description_html || '<p>No description provided.</p>',
    tech: Array.isArray(row.tech_stack) ? row.tech_stack : [],
    liveUrl: row.live_url,
    githubUrl: row.github_url,
    featured: !!row.featured,
    sortOrder: row.sort_order || 0
  };
}

function makeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseUrlList(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  return fallback;
}

function parseCategoryList(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  return fallback;
}

function formatCategoryLabel(categories) {
  return parseCategoryList(categories).map(category => CATEGORY_LABELS[category] || category).join(', ');
}


// ─── Populate Featured Projects ─────────────────
function populateFeaturedProjects() {
  const grid = $('#featuredGrid');
  const featured = projectsState.filter(p => p.featured);

  grid.innerHTML = featured.map(project => createProjectCard(project)).join('');

  // Attach click handlers
  grid.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.projectId;
      navigateToProject(id);
    });
  });

  // Re-observe featured cards for scroll reveal
  if (observer) {
    grid.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
      observer.observe(el);
    });
  }
}


// ─── Populate All Projects Grid ─────────────────
function populateProjectsGrid(filter = 'all') {
  const grid = $('#projectsGrid');
  const filtered = filter === 'all'
    ? projectsState
    : projectsState.filter(project => Array.isArray(project.categories) && project.categories.includes(filter));

  grid.innerHTML = filtered.map(project => createProjectCard(project)).join('');

  // Attach click handlers
  grid.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.projectId;
      navigateToProject(id);
    });
  });

  // Re-observe for scroll reveal
  if (observer) {
    grid.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
      observer.observe(el);
    });
  }
}


// ─── Create Project Card HTML ───────────────────
function createProjectCard(project) {
  return `
    <div class="project-card reveal" data-project-id="${project.id}" role="button" tabindex="0" aria-label="View ${project.title}">
      <div class="project-card__image-wrapper">
        <img src="${project.thumbnail}" alt="${project.title}" class="project-card__image" loading="lazy">
      </div>
      <div class="project-card__content">
        <div class="project-card__category">${project.categoryLabel} · ${project.year}</div>
        <div class="project-card__title">${project.title}</div>
        <div class="project-card__desc">${getProjectExcerpt(project)}</div>
      </div>
    </div>
  `;
}


function getProjectExcerpt(project) {
  const div = document.createElement('div');
  div.innerHTML = project.description;
  const firstP = div.querySelector('p');
  if (!firstP) return '';
  const text = firstP.textContent;
  return text.length > 120 ? text.substring(0, 120) + '…' : text;
}


// ─── Populate Skills Marquee ────────────────────
function populateSkillsMarquee() {
  const marquee = $('#skillsMarquee');
  // Duplicate skills for seamless infinite scroll
  const allSkills = [...SKILLS, ...SKILLS];
  marquee.innerHTML = allSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');
}


// ─── Navigation / Routing ───────────────────────
function setupNavigation() {
  // Nav link clicks
  document.addEventListener('click', (e) => {
    const navItem = e.target.closest('[data-nav]');
    if (navItem) {
      e.preventDefault();
      const target = navItem.dataset.nav;

      if (target === 'projects-scroll') {
        scrollToHomeSection('projects-preview');
        closeNav();
        return;
      }

      if (target === 'contact-scroll') {
        scrollToHomeSection('contact');
        closeNav();
        return;
      }

      if (target !== currentPage) {
        navigateTo(target);
      }
      closeNav();
    }

    // Scroll buttons
    const scrollItem = e.target.closest('[data-scroll]');
    if (scrollItem) {
      e.preventDefault();
      const targetSection = document.getElementById(scrollItem.dataset.scroll);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });

  // Keyboard support for project cards
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const card = e.target.closest('.project-card');
      if (card) {
        card.click();
      }
      const navBtn = e.target.closest('.project-nav__link');
      if (navBtn) {
        navBtn.click();
      }
      const scrollBtn = e.target.closest('[data-scroll]');
      if (scrollBtn) {
        scrollBtn.click();
      }
    }
  });

  // Mobile menu toggle
  navToggle.addEventListener('click', toggleNav);
}

function toggleNav() {
  navToggle.classList.toggle('open');
  navLinks.classList.toggle('open');
}

function closeNav() {
  navToggle.classList.remove('open');
  navLinks.classList.remove('open');
}

function setActiveNavLink(targetNav) {
  $$('.navbar__link').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === targetNav);
  });
}

function updateHomeNavActiveState() {
  if (currentPage !== 'home') return;

  const projectsSection = document.getElementById('projects-preview');
  const contactSection = document.getElementById('contact');

  if (!projectsSection || !contactSection) {
    setActiveNavLink('home');
    return;
  }

  const probePosition = window.scrollY + (window.innerHeight * 0.35);

  if (probePosition >= contactSection.offsetTop - 20) {
    setActiveNavLink('contact-scroll');
  } else if (probePosition >= projectsSection.offsetTop - 20) {
    setActiveNavLink('projects-scroll');
  } else {
    setActiveNavLink('home');
  }
}

function scrollToHomeSection(sectionId) {
  const doScroll = () => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
      setTimeout(updateHomeNavActiveState, 120);
    }
  };

  if (currentPage !== 'home') {
    navigateTo('home', () => {
      setTimeout(doScroll, 100);
    });
    return;
  }

  doScroll();
}

function updateNavbarTheme() {
  const useLightTheme = currentPage === 'projects' || currentPage === 'detail';
  navbar.classList.toggle('navbar--light', useLightTheme);
}


function navigateTo(page, callback) {
  if (page === 'admin' && !isOwnerLoggedIn()) {
    updateAdminAvailability();
    page = 'home';
  }

  if (page === currentPage) return;

  // Transition out
  pageTransition.classList.add('active');

  setTimeout(() => {
    // Hide all pages
    Object.values(pages).forEach(p => p.classList.remove('active'));

    // Show target page
    pages[page].classList.add('active');
    currentPage = page;
    updateNavbarTheme();
    window.scrollTo(0, 0);

    // Update nav active state
    const navTarget = page === 'projects' || page === 'detail' ? 'projects-scroll' : page;
    setActiveNavLink(navTarget);
    if (page === 'home') updateHomeNavActiveState();

    // Update page title
    updatePageTitle(page);

    // Re-observe reveal elements
    refreshObserver();

    // Transition in
    setTimeout(() => {
      pageTransition.classList.remove('active');
      if (callback) callback();
    }, 50);
  }, 300);
}


function navigateToProject(projectId) {
  currentProjectId = projectId;
  const project = projectsState.find(p => p.id === projectId);
  if (!project) return;

  // Populate detail page
  populateProjectDetail(project);

  // Transition
  pageTransition.classList.add('active');

  setTimeout(() => {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    pages.detail.classList.add('active');
    currentPage = 'detail';
    updateNavbarTheme();
    window.scrollTo(0, 0);

    // Update nav
    setActiveNavLink('projects-scroll');

    document.title = `${project.title} — Vikash Thyadi`;

    refreshObserver();

    setTimeout(() => {
      pageTransition.classList.remove('active');
    }, 50);
  }, 300);
}


function populateProjectDetail(project) {
  $('#detailTitle').textContent = project.title;

  // Meta
  $('#detailMeta').innerHTML = `
    <div class="project-detail__meta-item">
      <span class="project-detail__meta-label">Role</span>
      <span class="project-detail__meta-value">${project.role}</span>
    </div>
    <div class="project-detail__meta-item">
      <span class="project-detail__meta-label">Year</span>
      <span class="project-detail__meta-value">${project.year}</span>
    </div>
    <div class="project-detail__meta-item">
      <span class="project-detail__meta-label">Category</span>
      <span class="project-detail__meta-value">${project.categoryLabel}</span>
    </div>
  `;

  // Hero image
  const heroImg = $('#detailHeroImage');
  heroImg.src = project.thumbnail;
  heroImg.alt = project.title;

  // Description
  $('#detailDescription').innerHTML = project.description;

  // Tech tags
  $('#detailTechTags').innerHTML = project.tech.map(t => `<span class="tech-tag">${t}</span>`).join('');

  // Links
  let linksHTML = '';
  if (project.liveUrl) {
    linksHTML += `<a href="${project.liveUrl}" target="_blank" rel="noopener noreferrer" class="project-detail__link">Live Site →</a>`;
  }
  if (project.githubUrl) {
    linksHTML += `<a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer" class="project-detail__link">GitHub →</a>`;
  }
  $('#detailLinks').innerHTML = linksHTML;

  // Gallery
  const galleryContainer = $('#detailGallery .project-detail__gallery-container');
  const screenshotUrls = parseUrlList(project.screenshotUrls, []);
  const galleryImages = screenshotUrls.length ? screenshotUrls : [project.thumbnail];
  galleryContainer.innerHTML = galleryImages
    .map((url, index) => `<img src="${url}" alt="${project.title} — Screenshot ${index + 1}" loading="lazy">`)
    .join('');

  // Previous / Next navigation
  setupProjectNavigation();
}


function setupProjectNavigation() {
  if (!projectsState.length) return;

  const currentIndex = projectsState.findIndex(p => p.id === currentProjectId);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const prevIndex = safeCurrentIndex > 0 ? safeCurrentIndex - 1 : projectsState.length - 1;
  const nextIndex = safeCurrentIndex < projectsState.length - 1 ? safeCurrentIndex + 1 : 0;

  const prevProject = projectsState[prevIndex];
  const nextProject = projectsState[nextIndex];

  $('#prevProjectTitle').textContent = prevProject ? prevProject.title : '';
  $('#nextProjectTitle').textContent = nextProject ? nextProject.title : '';

  const prevEl = $('#prevProject');
  const nextEl = $('#nextProject');

  // Remove old handlers by cloning
  const newPrev = prevEl.cloneNode(true);
  const newNext = nextEl.cloneNode(true);
  prevEl.parentNode.replaceChild(newPrev, prevEl);
  nextEl.parentNode.replaceChild(newNext, nextEl);

  newPrev.addEventListener('click', () => navigateToProject(prevProject.id));
  newNext.addEventListener('click', () => navigateToProject(nextProject.id));
}


// Detail back button
document.addEventListener('click', (e) => {
  if (e.target.closest('#detailBack')) {
    e.preventDefault();
    navigateTo('projects');
  }
});


function updatePageTitle(page) {
  const titles = {
    home: 'Vikash Thyadi — Portfolio',
    projects: 'Projects — Vikash Thyadi',
    detail: 'Project — Vikash Thyadi',
    admin: 'Admin — Vikash Thyadi'
  };
  document.title = titles[page] || titles.home;
}


// ─── Scroll Effects ─────────────────────────────
function setupScrollEffects() {
  let lastScrollY = 0;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    // Navbar background on scroll
    if (scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    updateHomeNavActiveState();

    lastScrollY = scrollY;
  }, { passive: true });
}


// ─── Intersection Observer (Scroll Reveal) ──────
let observer;

function setupIntersectionObserver() {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  $$('.reveal, .reveal-left, .reveal-right').forEach(el => observer.observe(el));
}


function refreshObserver() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;

  // Wait for DOM layout to settle after page switch
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      activePage.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
        el.classList.remove('visible');
        const rect = el.getBoundingClientRect();
        // Immediately show elements already in viewport
        if (rect.top < window.innerHeight + 100 && rect.bottom > -100) {
          el.classList.add('visible');
        } else {
          observer.observe(el);
        }
      });
    });
  });
}


// ─── Filter Tabs ────────────────────────────────
function setupFilterTabs() {
  const filterContainer = $('#projectsFilter');
  if (!filterContainer) return;

  filterContainer.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;

    // Update active state
    filterContainer.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Filter projects
    const filter = tab.dataset.filter;
    populateProjectsGrid(filter);
  });
}


// ─── Contact Form ──────────────────────────────
function setupContactForm() {
  const form = $('#contactForm');
  const statusEl = $('#contactFormStatus');
  if (!form || !statusEl) return;

  if (!OWNER_EMAIL) {
    setContactFormStatus('Contact form is not configured yet.', true);
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const message = String(formData.get('message') || '').trim();

    if (!name || !email || !message) {
      setContactFormStatus('Please fill in name, email, and message.', true);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setContactFormStatus('Please enter a valid email address.', true);
      return;
    }

    setContactFormStatus('Sending your message...');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    formData.set('_captcha', 'false');
    formData.set('_subject', `Portfolio contact message from ${name}`);
    formData.set('_template', 'table');

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${OWNER_EMAIL}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        },
        body: formData
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === 'false') {
        throw new Error(result.message || 'Unable to send message right now.');
      }

      form.reset();
      setContactFormStatus('Thanks! Your message has been sent.', false, true);
    } catch (error) {
      setContactFormStatus(error.message || 'Something went wrong. Please try again.', true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    }
  });
}

function setContactFormStatus(message, isError = false, isSuccess = false) {
  const statusEl = $('#contactFormStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle('is-error', !!isError);
  statusEl.classList.toggle('is-success', !!isSuccess);
}


// ─── Admin Panel ────────────────────────────────
function setupAdminEvents() {
  const loginForm = $('#adminLoginForm');
  const signOutBtn = $('#adminSignOutBtn');
  const projectForm = $('#projectForm');
  const clearBtn = $('#clearProjectForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLogin);
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', handleAdminSignOut);
  }

  if (projectForm) {
    projectForm.addEventListener('submit', handleProjectSave);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', clearProjectForm);
  }

  const titleField = $('#projectTitle');
  const slugField = $('#projectSlug');
  if (titleField && slugField) {
    titleField.addEventListener('input', () => {
      if (!slugField.dataset.manual) {
        slugField.value = makeSlug(titleField.value);
      }
    });

    slugField.addEventListener('input', () => {
      slugField.dataset.manual = slugField.value ? '1' : '';
      slugField.value = makeSlug(slugField.value);
    });
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();
  if (!supabaseReady) return;

  const email = ($('#adminEmail') || {}).value || '';
  const password = ($('#adminPassword') || {}).value || '';

  if (email.trim() !== OWNER_EMAIL) {
    setAuthStatus('Only the configured owner email can access admin.');
    setFormMessage('Only the configured owner email can access admin.', true);
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email.trim(),
    password
  });

  if (error) {
    setAuthStatus(error.message);
    setFormMessage(error.message, true);
    return;
  }

  setAuthStatus('Signed in successfully.');
  setFormMessage('Signed in successfully.');
  updateAdminAvailability();
  renderAdminProjectsList();
}

async function handleAdminSignOut() {
  if (!supabaseReady) return;
  await supabaseClient.auth.signOut();
  clearProjectForm();
  updateAdminAvailability();
}

function setFormMessage(message, isError = false) {
  const el = $('#projectFormMessage');
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? '#d94000' : '#2a2529';
}

function setAuthStatus(message) {
  const el = $('#adminAuthStatus');
  if (!el) return;
  el.textContent = message;
}

function clearProjectForm() {
  const form = $('#projectForm');
  if (!form) return;

  form.reset();
  const rowId = $('#projectRowId');
  const slugField = $('#projectSlug');
  if (rowId) rowId.value = '';
  if (slugField) slugField.dataset.manual = '';
  setFormMessage('');
}

function getProjectPayloadFromForm() {
  const title = ($('#projectTitle') || {}).value || '';
  const slug = makeSlug((($('#projectSlug') || {}).value || title));
  const category = ($('#projectCategory') || {}).value || 'web';
  const year = Number((($('#projectYear') || {}).value || 0));
  const role = ($('#projectRole') || {}).value || '';
  const thumbnail = ($('#projectThumbnail') || {}).value || '';
  const screenshotsInput = ($('#projectScreenshots') || {}).value || '';
  const liveUrl = ($('#projectLiveUrl') || {}).value || null;
  const githubUrl = ($('#projectGithubUrl') || {}).value || null;
  const sortOrder = Number((($('#projectSortOrder') || {}).value || 0));
  const featured = ((($('#projectFeatured') || {}).value || 'false') === 'true');
  const techInput = ($('#projectTech') || {}).value || '';
  const descriptionHtml = ($('#projectDescription') || {}).value || '';

  return {
    title: title.trim(),
    slug,
    category,
    year: Number.isFinite(year) ? year : null,
    role: role.trim(),
    thumbnail_url: thumbnail.trim() || DEFAULT_THUMBNAIL,
    screenshot_urls: parseUrlList(screenshotsInput, []),
    description_html: descriptionHtml,
    tech_stack: techInput.split(',').map(item => item.trim()).filter(Boolean),
    live_url: liveUrl && liveUrl.trim() ? liveUrl.trim() : null,
    github_url: githubUrl && githubUrl.trim() ? githubUrl.trim() : null,
    featured,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0
  };
}

async function handleProjectSave(event) {
  event.preventDefault();
  if (!supabaseReady || !isOwnerLoggedIn()) {
    setFormMessage('You must be signed in as owner.', true);
    return;
  }

  const rowId = ($('#projectRowId') || {}).value || '';
  const payload = getProjectPayloadFromForm();

  if (!payload.title || !payload.slug || !payload.description_html) {
    setFormMessage('Title, slug, and description are required.', true);
    return;
  }

  let error = null;

  if (rowId) {
    ({ error } = await supabaseClient.from('projects').update(payload).eq('id', rowId));
  } else {
    ({ error } = await supabaseClient.from('projects').insert(payload));
  }

  if (error) {
    setFormMessage(error.message, true);
    return;
  }

  setFormMessage('Project saved.');
  clearProjectForm();
  await refreshProjectsEverywhere();
}

async function refreshProjectsEverywhere() {
  await loadProjects();
  populateFeaturedProjects();
  populateProjectsGrid(getCurrentFilter());
  renderAdminProjectsList();

  if (currentPage === 'detail' && currentProjectId) {
    const freshProject = projectsState.find(p => p.id === currentProjectId);
    if (freshProject) {
      populateProjectDetail(freshProject);
    }
  }
}

function getCurrentFilter() {
  const activeTab = document.querySelector('.filter-tab.active');
  return activeTab ? activeTab.dataset.filter : 'all';
}

function renderAdminProjectsList() {
  const list = $('#adminProjectList');
  if (!list) return;

  if (!supabaseReady) {
    list.innerHTML = '';
    return;
  }

  if (!isOwnerLoggedIn()) {
    list.innerHTML = '<p class="admin-list__empty">Sign in to view and manage projects.</p>';
    return;
  }

  if (!projectsState.length) {
    list.innerHTML = '<p class="admin-list__empty">No projects found. Add your first project.</p>';
    return;
  }

  list.innerHTML = projectsState.map(project => `
    <article class="admin-project-item" data-row-id="${project.rowId || ''}">
      <div>
        <h3>${project.title}</h3>
        <p>${project.categoryLabel} · ${project.year || 'N/A'} · Featured: ${project.featured ? 'Yes' : 'No'}</p>
      </div>
      <div class="admin-project-item__actions">
        <button class="btn btn--secondary" data-action="edit" data-id="${project.id}">Edit</button>
        <button class="btn btn--secondary" data-action="feature" data-id="${project.id}">${project.featured ? 'Unfeature' : 'Feature'}</button>
        <button class="btn btn--secondary" data-action="delete" data-id="${project.id}">Delete</button>
      </div>
    </article>
  `).join('');

  list.querySelectorAll('button[data-action]').forEach(button => {
    button.addEventListener('click', handleAdminListAction);
  });
}

async function handleAdminListAction(event) {
  const action = event.currentTarget.dataset.action;
  const projectId = event.currentTarget.dataset.id;
  const project = projectsState.find(item => item.id === projectId);

  if (!project) return;

  if (action === 'edit') {
    fillProjectForm(project);
    navigateTo('admin');
    return;
  }

  if (action === 'feature') {
    await updateProjectField(project.rowId, { featured: !project.featured });
    return;
  }

  if (action === 'delete') {
    const ok = window.confirm(`Delete ${project.title}? This cannot be undone.`);
    if (!ok) return;
    const { error } = await supabaseClient.from('projects').delete().eq('id', project.rowId);
    if (error) {
      setFormMessage(error.message, true);
      return;
    }
    await refreshProjectsEverywhere();
  }
}

function fillProjectForm(project) {
  ($('#projectRowId') || {}).value = project.rowId || '';
  ($('#projectTitle') || {}).value = project.title || '';
  ($('#projectSlug') || {}).value = project.id || '';
  ($('#projectCategory') || {}).value = project.category || 'web';
  ($('#projectYear') || {}).value = project.year || '';
  ($('#projectRole') || {}).value = project.role || '';
  ($('#projectThumbnail') || {}).value = project.thumbnail || '';
  ($('#projectScreenshots') || {}).value = Array.isArray(project.screenshotUrls) ? project.screenshotUrls.join('\n') : '';
  ($('#projectLiveUrl') || {}).value = project.liveUrl || '';
  ($('#projectGithubUrl') || {}).value = project.githubUrl || '';
  ($('#projectSortOrder') || {}).value = Number.isFinite(project.sortOrder) ? project.sortOrder : 0;
  ($('#projectFeatured') || {}).value = project.featured ? 'true' : 'false';
  ($('#projectTech') || {}).value = Array.isArray(project.tech) ? project.tech.join(', ') : '';
  ($('#projectDescription') || {}).value = project.description || '';
}

async function updateProjectField(rowId, patch) {
  if (!rowId) return;
  const { error } = await supabaseClient.from('projects').update(patch).eq('id', rowId);
  if (error) {
    setFormMessage(error.message, true);
    return;
  }
  await refreshProjectsEverywhere();
}
