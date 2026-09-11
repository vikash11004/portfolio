/* ============================================
   PORTFOLIO — Script
   Routing, Data, Animations, Interactions
   ============================================ */

// ─── Project Data ───────────────────────────────

// ─── Firebase Config ────────────────────────────
const APP_CONFIG = window.PORTFOLIO_CONFIG || {};
const FIREBASE_CONFIG = APP_CONFIG.FIREBASE_CONFIG || null;
const OWNER_EMAIL = APP_CONFIG.OWNER_EMAIL || '';
const DEFAULT_THUMBNAIL = 'assets/images/project-1.png';

const CATEGORY_LABELS = {
  web: 'Web App',
  design: 'Design',
  oss: 'Open Source',
  software: 'Software'
};

const SITE_CONTENT_ROW_ID = 'portfolio_site';
const SITE_CONTENT_SYNC_KEY = 'portfolio-site-content-sync';

const DEFAULT_SITE_CONTENT = {
  "projectsPreview": {
    "titleLine2": "Projects",
    "titleLine1": "Featured",
    "ctaText": "See All Projects",
    "sectionLabel": "Selected Work"
  },
  "brand": {
    "resumeFileName": "Vikash-Thyadi-Resume.pdf",
    "logoUrl": "assets/images/logo1.png",
    "resumeUrl": "assets/resume/VikashThyadi_Resume.pdf",
    "name": "Vikash Thyadi"
  },
  "projectsPage": {
    "subtitle": "A collection of work spanning web applications, design systems, creative coding, and open-source contributions.",
    "titleLine1": "All",
    "sectionLabel": "Archive",
    "titleLine2": "Projects"
  },
  "seo": {
    "detailTitleTemplate": "{project} — Vikash Thyadi",
    "faviconEmoji": "⚡",
    "description": "Vikash Thyadi — Developer & Designer. A refined brutalist portfolio showcasing projects, skills, and creative work.",
    "projectsTitle": "Projects — Vikash Thyadi",
    "homeTitle": "Vikash Thyadi — Portfolio",
    "themeColor": "#2A2529"
  },
  "skills": {
    "sectionLabel": "Capabilities",
    "items": [
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "Node.js",
      "Python",
      "C++",
      "HTML",
      "CSS",
      "Bootstrap",
      "PHP",
      "Pandas",
      "Power BI",
      "MySQL",
      "NoSQL",
      "PostgreSQL",
      "MongoDB",
      "Git",
      "Figma",
      "GraphQL",
      "REST APIs",
      "TailwindCSS",
      "AWS",
      "Firebase",
      "Vercel",
      "Linux"
    ],
    "resumeButtonText": "Download Resume",
    "headingLine2": "I Work With",
    "headingLine1": "Tools & Technologies"
  },
  "contact": {
    "subtext": "Have a project in mind, or just want to say hello? I'm always open to discussing new ideas and opportunities.",
    "recipientEmail": "",
    "headingLine1": "Let's Work",
    "linkedinText": "LinkedIn →",
    "githubText": "GitHub →",
    "sectionLabel": "Get In Touch",
    "headingLine2": "Together",
    "instagramUrl": "https://www.instagram.com/vikash.thyadi/",
    "githubUrl": "https://github.com/vikash11004",
    "instagramText": "Instagram →",
    "linkedinUrl": "https://www.linkedin.com/in/vikashthyadi/"
  },
  "about": {
    "bio": "I'm a developer and designer who believes great software should feel inevitable intuitive, precise, and expressive. I approach every project with the discipline of an engineer and the curiosity of a craftsman, turning complex problems into clean, purposeful interfaces.",
    "educationItems": [
      {
        "year": "2023 — Present",
        "title": "B.Tech in Computer Science & Engineering (Data Science)",
        "detail": "Aditya Institute of Technology and Management, Tekkali, Andhra Pradesh<br>CGPA: 7.99<br>Focus Areas: Web Development, Data Analysis, Data Engineering, Artificial Intelligence, Machine Learning"
      },
      {
        "year": "Achievements",
        "title": "Hackathons & Competitive Work",
        "detail": "Secured 2nd place in a 24-hour hackathon conducted by AITAM, building under time pressure with real constraints.<br>Awarded a medal at a 7-hour hackathon conducted by V Cube Software Solutions."
      },
      {
        "year": "Certifications",
        "title": "Professional Certifications",
        "detail": "Earned the ServiceNow Certified System Administrator (CSA) and Certified Application Developer (CAD) certifications, validating expertise in platform administration and application development.<br>Successfully completed NPTEL Python for Data Science, strengthening skills in Python, data analysis, and machine learning fundamentals."
      }
    ],
    "imageAlt": "Vikash working at desk",
    "headingLine1": "Education &",
    "sectionLabel": "Background",
    "imageUrl": "assets/images/about.jpeg",
    "headingLine2": "Experience"
  },
  "footer": {
    "copyright": "© 2026 Vikash Thyadi. All rights reserved.",
    "backToTopLabel": "↑ Back to Top"
  },
  "hero": {
    "primaryButtonText": "View Work",
    "titleLine1": "Vikash",
    "secondaryButtonText": "Download Resume",
    "titleLine2": "Thyadi",
    "imageAlt": "Vikash Thyadi — Portrait",
    "scrollCueText": "About Me",
    "subtitle": "Highly motivated and curious engineering student.",
    "label": "Developer & Designer",
    "imageUrl": "assets/images/profile.jpeg"
  },
  "navbar": {
    "contactLabel": "Contact",
    "homeLabel": "Home",
    "projectsLabel": "Projects"
  }
};

let projectsState = [];
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;
let firebaseReady = false;
let currentUser = null;
let adminSessionChecked = false;
let siteContentState = deepMerge(DEFAULT_SITE_CONTENT, {});
let projectsUnsubscribe = null;
let siteContentUnsubscribe = null;

function applySyncedSiteContent(rawValue) {
  if (!rawValue) return false;

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') return false;

    const content = parsed.content || parsed;
    siteContentState = deepMerge(DEFAULT_SITE_CONTENT, content || {});
    applySiteContent();
    setupContactForm();
    return true;
  } catch (_error) {
    return false;
  }
}


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
let projectDescriptionRequestId = 0;
const markdownSourceCache = new Map();


// ─── Keyboard Shortcuts ────────────────────────
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

function deepMerge(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? [...override] : [...base];
  }

  if (!base || typeof base !== 'object') {
    return override !== undefined ? override : base;
  }

  const result = { ...base };
  const source = override && typeof override === 'object' ? override : {};

  Object.keys(source).forEach((key) => {
    const baseValue = result[key];
    const overrideValue = source[key];

    if (Array.isArray(baseValue)) {
      result[key] = Array.isArray(overrideValue) ? [...overrideValue] : [...baseValue];
      return;
    }

    if (baseValue && typeof baseValue === 'object') {
      result[key] = deepMerge(baseValue, overrideValue);
      return;
    }

    result[key] = overrideValue;
  });

  return result;
}


// ─── Initialization ─────────────────────────────
async function init() {
  if (window.__portfolioInitialized) return;
  window.__portfolioInitialized = true;

  setupFirebase();
  setupScrollEffects();
  setupIntersectionObserver();
  setupNavigation();
  setupKeyboardShortcuts();
  setupFilterTabs();
  setupProjectNavigation();

  if (firebaseReady) {
    await restoreAuthSession();
    startLiveSync();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== SITE_CONTENT_SYNC_KEY || !event.newValue) return;
      if (!applySyncedSiteContent(event.newValue)) {
        loadSiteContent().then(applySiteContent).catch(console.error);
      }
    });
  }

  await loadSiteContent();
  try {
    const cachedSync = localStorage.getItem(SITE_CONTENT_SYNC_KEY);
    if (cachedSync) applySyncedSiteContent(cachedSync);
  } catch (_error) {
    // Ignore storage access errors; Firestore load still runs.
  }
  applySiteContent();
  setupContactForm();

  await loadProjects();

  updateNavbarTheme();
  updateHomeNavActiveState();

  populateFeaturedProjects();
  populateProjectsGrid();
  populateSkillsMarquee();

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


// ─── Firebase / Auth / Data ─────────────────────
function setupFirebase() {
  const hasConfig =
    FIREBASE_CONFIG &&
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.authDomain &&
    FIREBASE_CONFIG.projectId &&
    OWNER_EMAIL &&
    !String(FIREBASE_CONFIG.apiKey).includes('YOUR_') &&
    !String(FIREBASE_CONFIG.projectId).includes('YOUR_') &&
    !OWNER_EMAIL.includes('your-email');

  if (!hasConfig || !window.firebase || !window.firebase.initializeApp) {
    firebaseReady = false;
    return;
  }

  firebaseApp = window.firebase.apps.length
    ? window.firebase.app()
    : window.firebase.initializeApp(FIREBASE_CONFIG);
  firebaseDb = firebaseApp.firestore();
  firebaseAuth = firebaseApp.auth();
  firebaseReady = true;

  firebaseAuth.onAuthStateChanged((user) => {
    currentUser = user || null;
    adminSessionChecked = true;
  });
}

function startLiveSync() {
  if (!firebaseReady || !firebaseDb) return;

  if (typeof siteContentUnsubscribe === 'function') {
    siteContentUnsubscribe();
    siteContentUnsubscribe = null;
  }

  if (typeof projectsUnsubscribe === 'function') {
    projectsUnsubscribe();
    projectsUnsubscribe = null;
  }

  siteContentUnsubscribe = firebaseDb.collection('site_content').doc(SITE_CONTENT_ROW_ID)
    .onSnapshot((snap) => {
      if (snap.exists) {
        const data = snap.data() || {};
        siteContentState = deepMerge(DEFAULT_SITE_CONTENT, data.content || {});
      } else {
        siteContentState = deepMerge(DEFAULT_SITE_CONTENT, {});
      }
      applySiteContent();
      setupContactForm();
    }, (error) => {
      console.error('Live site content sync failed:', error.message || error);
    });

  projectsUnsubscribe = firebaseDb.collection('projects').onSnapshot((snap) => {
    const rows = snap.docs.map((docSnap) => ({ docId: docSnap.id, ...docSnap.data() }));

    if (!rows.length) {
      console.warn('No projects loaded from Firebase.');
    } else {
      rows.sort((a, b) => {
        const orderA = Number.isFinite(a.sort_order) ? a.sort_order : Number.isFinite(a.sortOrder) ? a.sortOrder : 0;
        const orderB = Number.isFinite(b.sort_order) ? b.sort_order : Number.isFinite(b.sortOrder) ? b.sortOrder : 0;
        if (orderA !== orderB) return orderA - orderB;

        const timeA = a.created_at && typeof a.created_at.toMillis === 'function'
          ? a.created_at.toMillis()
          : Date.parse(a.created_at || 0) || 0;
        const timeB = b.created_at && typeof b.created_at.toMillis === 'function'
          ? b.created_at.toMillis()
          : Date.parse(b.created_at || 0) || 0;

        return timeB - timeA;
      });

      projectsState = rows.map(mapDbProjectToViewModel);
    }

    prefetchMarkdownDescriptions(projectsState);

    populateFeaturedProjects();
    populateProjectsGrid(getCurrentFilter());

    if (currentPage === 'detail' && currentProjectId) {
      const project = projectsState.find((item) => item.id === currentProjectId);
      if (project) {
        populateProjectDetail(project);
      }
    }
  }, (error) => {
    console.error('Live project sync failed:', error.message || error);
    projectsState = [];
    populateFeaturedProjects();
    populateProjectsGrid(getCurrentFilter());
  });
}

async function restoreAuthSession() {
  if (!firebaseReady || !firebaseAuth) return;

  currentUser = firebaseAuth.currentUser || null;
  adminSessionChecked = true;
}

async function loadSiteContent() {
  siteContentState = deepMerge(DEFAULT_SITE_CONTENT, {});

  if (!firebaseReady || !firebaseDb) {
    return;
  }

  try {
    const snap = await firebaseDb.collection('site_content').doc(SITE_CONTENT_ROW_ID).get();
    if (snap.exists) {
      const data = snap.data() || {};
      siteContentState = deepMerge(DEFAULT_SITE_CONTENT, data.content || {});
    } else {
      siteContentState = deepMerge(DEFAULT_SITE_CONTENT, {});
    }
  } catch (error) {
    console.warn('Site content unavailable:', error.message || error);
  }
}

function setText(sel, value) {
  const el = $(sel);
  if (el && value !== undefined && value !== null) {
    el.textContent = String(value);
  }
}

function setAttr(sel, attr, value) {
  const el = $(sel);
  if (el && value !== undefined && value !== null && value !== '') {
    el.setAttribute(attr, String(value));
  }
}

function setAllText(sel, value) {
  if (value === undefined || value === null) return;
  $$(sel).forEach((el) => {
    el.textContent = String(value);
  });
}

function renderAboutEducationItems(items) {
  const list = $('#aboutEducationList');
  if (!list) return;

  const safeItems = Array.isArray(items) && items.length
    ? items
    : DEFAULT_SITE_CONTENT.about.educationItems;

  list.innerHTML = safeItems.map(item => `
    <div class="education-item reveal">
      <div class="education-item__year">${item.year || ''}</div>
      <div class="education-item__title">${item.title || ''}</div>
      <div class="education-item__detail">${item.detail || ''}</div>
    </div>
  `).join('');

  if (observer) {
    list.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => observer.observe(el));
  }
}

function applySiteContent() {
  const content = deepMerge(DEFAULT_SITE_CONTENT, siteContentState);

  setAttr('#metaDescription', 'content', content.seo.description);
  setAttr('meta[name="theme-color"]', 'content', content.seo.themeColor);
  const icon = $('#siteFavicon');
  if (icon) {
    icon.setAttribute('href', `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${encodeURIComponent(content.seo.faviconEmoji || '⚡')}</text></svg>`);
  }

  setAttr('#siteLogoImage', 'src', content.brand.logoUrl);
  setAttr('#heroSecondaryBtn', 'href', content.brand.resumeUrl);
  setAttr('#heroSecondaryBtn', 'download', content.brand.resumeFileName);
  setAttr('#skillsResumeBtn', 'href', content.brand.resumeUrl);
  setAttr('#skillsResumeBtn', 'download', content.brand.resumeFileName);

  setText('#navHomeLabel', content.navbar.homeLabel);
  setText('#navProjectsLabel', content.navbar.projectsLabel);
  setText('#navContactLabel', content.navbar.contactLabel);

  setText('#heroLabel', content.hero.label);
  setText('#heroTitleLine1', content.hero.titleLine1);
  setText('#heroTitleLine2', content.hero.titleLine2);
  setText('#heroSubtitle', content.hero.subtitle);
  setText('#heroPrimaryBtn', content.hero.primaryButtonText);
  setText('#heroSecondaryBtn', content.hero.secondaryButtonText);
  setText('#heroScrollCueLabel', content.hero.scrollCueText);
  setAttr('#heroImage', 'src', content.hero.imageUrl);
  setAttr('#heroImage', 'alt', content.hero.imageAlt);

  setText('#aboutSectionLabel', content.about.sectionLabel);
  setText('#aboutHeadingLine1', content.about.headingLine1);
  setText('#aboutHeadingLine2', content.about.headingLine2);
  setText('#aboutBio', content.about.bio);
  setAttr('#aboutImage', 'src', content.about.imageUrl);
  setAttr('#aboutImage', 'alt', content.about.imageAlt);
  renderAboutEducationItems(content.about.educationItems);

  setText('#featuredSectionLabel', content.projectsPreview.sectionLabel);
  setText('#featuredTitleLine1', content.projectsPreview.titleLine1);
  setText('#featuredTitleLine2', content.projectsPreview.titleLine2);
  setText('#featuredCtaText', content.projectsPreview.ctaText);

  setText('#skillsSectionLabel', content.skills.sectionLabel);
  setText('#skillsHeadingLine1', content.skills.headingLine1);
  setText('#skillsHeadingLine2', content.skills.headingLine2);
  setText('#skillsResumeBtnText', content.skills.resumeButtonText);

  setText('#contactSectionLabel', content.contact.sectionLabel);
  setText('#contactHeadingLine1', content.contact.headingLine1);
  setText('#contactHeadingLine2', content.contact.headingLine2);
  setText('#contactSubtext', content.contact.subtext);
  setText('#contactInstagramLink', content.contact.instagramText);
  setAttr('#contactInstagramLink', 'href', content.contact.instagramUrl);
  setText('#contactGithubLink', content.contact.githubText);
  setAttr('#contactGithubLink', 'href', content.contact.githubUrl);
  setText('#contactLinkedinLink', content.contact.linkedinText);
  setAttr('#contactLinkedinLink', 'href', content.contact.linkedinUrl);

  setText('#archiveSectionLabel', content.projectsPage.sectionLabel);
  setText('#archiveTitleLine1', content.projectsPage.titleLine1);
  setText('#archiveTitleLine2', content.projectsPage.titleLine2);
  setText('#archiveSubtitle', content.projectsPage.subtitle);

  setAllText('#footerCopyHome, #footerCopyProjects, #footerCopyDetail', content.footer.copyright);
  setAllText('#footerBackTopHome, #footerBackTopProjects, #footerBackTopDetail', content.footer.backToTopLabel);

  populateSkillsMarquee();
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

  if (!firebaseReady) {
    disabledBox.hidden = false;
    panel.hidden = true;
    authStatus.textContent = 'Admin disabled until Firebase configuration is added in config.js.';
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
  if (!firebaseReady || !firebaseDb) {
    projectsState = [];
    return;
  }

  try {
    const snap = await firebaseDb.collection('projects').get();
    const rows = snap.docs.map((docSnap) => ({
      docId: docSnap.id,
      ...docSnap.data()
    }));

    rows.sort((a, b) => {
      const orderA = Number.isFinite(a.sort_order) ? a.sort_order : Number.isFinite(a.sortOrder) ? a.sortOrder : 0;
      const orderB = Number.isFinite(b.sort_order) ? b.sort_order : Number.isFinite(b.sortOrder) ? b.sortOrder : 0;
      if (orderA !== orderB) return orderA - orderB;

      const timeA = a.created_at && typeof a.created_at.toMillis === 'function'
        ? a.created_at.toMillis()
        : Date.parse(a.created_at || 0) || 0;
      const timeB = b.created_at && typeof b.created_at.toMillis === 'function'
        ? b.created_at.toMillis()
        : Date.parse(b.created_at || 0) || 0;

      return timeB - timeA;
    });

    projectsState = rows.length ? rows.map(mapDbProjectToViewModel) : [];
    prefetchMarkdownDescriptions(projectsState);
  } catch (error) {
    console.error('Failed loading projects from Firestore:', error.message || error);
    projectsState = [];
  }
}

function mapDbProjectToViewModel(row) {
  const screenshotUrls = parseUrlList(row.screenshot_urls || row.screenshotUrls, []);
  const categories = parseCategoryList(row.categories, row.category ? [row.category] : []);
  const techStack = Array.isArray(row.tech_stack) ? row.tech_stack : Array.isArray(row.techStack) ? row.techStack : [];
  const slug = row.slug || row.id || row.docId || '';

  return {
    rowId: row.docId || row.id || slug,
    id: slug,
    title: row.title,
    category: categories[0] || row.category || 'web',
    categories,
    categoryLabel: formatCategoryLabel(categories),
    year: String(row.year || ''),
    role: row.role,
    thumbnail: row.thumbnail_url || row.thumbnailUrl || DEFAULT_THUMBNAIL,
    screenshotUrls,
    description: row.description_html || row.descriptionHtml || '<p>No description provided.</p>',
    shortDescription: row.short_description || row.shortDescription || row.excerpt || '',
    tech: techStack,
    liveUrl: row.live_url || row.liveUrl || null,
    githubUrl: row.github_url || row.githubUrl || null,
    featured: !!row.featured,
    sortOrder: row.sort_order || row.sortOrder || 0
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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
}

function looksLikeMarkdown(value) {
  const source = String(value || '');
  return /(^|\n)\s{0,3}(#{1,6}\s+|```|[-*+]\s+|\d+\.\s+|>\s?|\|.+\|)/.test(source)
    || /\*\*[^*]+\*\*/.test(source)
    || /`[^`]+`/.test(source)
    || /\[[^\]]+\]\([^)]+\)/.test(source);
}

function normalizeMarkdownSource(value) {
  let source = String(value || '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .trim();

  const realLineCount = source.split('\n').length;
  const flattenedHeadingCount = (source.match(/\s#{1,6}\s+/g) || []).length;

  if (realLineCount <= 3 && flattenedHeadingCount) {
    source = source
      .replace(/\s+(#{1,6}\s+)/g, '\n$1')
      .replace(/\s+(```[a-zA-Z0-9_-]*)\s*/g, '\n$1\n')
      .replace(/\s+```/g, '\n```')
      .replace(/\s+([-*+]\s+)(?=\S)/g, '\n$1')
      .replace(/\s+(\d+\.\s+)(?=\S)/g, '\n$1');
  }

  return source;
}

function looksLikeMarkdownFileSource(value) {
  const source = String(value || '').trim();
  return /\.md(?:[?#].*)?$/i.test(source);
}

async function loadMarkdownSource(value) {
  const source = String(value || '').trim();
  if (!source) return '';

  if (markdownSourceCache.has(source)) {
    return markdownSourceCache.get(source);
  }

  const loadPromise = fetch(source, { cache: 'force-cache' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load markdown (${response.status})`);
      }

      return response.text();
    })
    .catch(() => source);

  markdownSourceCache.set(source, loadPromise);
  return loadPromise;
}

function prefetchMarkdownDescriptions(projects) {
  if (!Array.isArray(projects) || !projects.length) return;

  const sources = projects
    .map(project => String(project && project.description ? project.description : '').trim())
    .filter(looksLikeMarkdownFileSource);

  if (!sources.length) return;

  const run = () => {
    sources.forEach((source) => {
      void loadMarkdownSource(source);
    });
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 1000 });
    return;
  }

  setTimeout(run, 0);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function sanitizeMarkdownUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';

  if (/^(https?:|mailto:|tel:|\/|\.\/|\.\.\/|#)/i.test(url)) {
    return url;
  }

  return '';
}

function splitMarkdownCells(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim());
}

function formatMarkdownInline(value) {
  let output = escapeHtml(String(value || ''));

  output = output.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, rawUrl) => {
    const url = sanitizeMarkdownUrl(rawUrl);
    if (!url) return escapeHtml(_match);
    return `<img src="${escapeAttribute(url)}" alt="${escapeHtml(alt)}">`;
  });

  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, rawUrl) => {
    const url = sanitizeMarkdownUrl(rawUrl);
    if (!url) return escapeHtml(_match);
    return `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  output = output.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  output = output.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  output = output.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');

  return output;
}

function renderMarkdownTable(lines) {
  if (lines.length < 2) return '';

  const headers = splitMarkdownCells(lines[0]);
  const separator = splitMarkdownCells(lines[1]);

  if (!headers.length || separator.length !== headers.length || !separator.every(cell => /^:?-{3,}:?$/.test(cell))) {
    return '';
  }

  const bodyRows = lines.slice(2).map((line) => {
    const cells = splitMarkdownCells(line);
    return `<tr>${cells.map(cell => `<td>${formatMarkdownInline(cell)}</td>`).join('')}</tr>`;
  });

  return `
    <table>
      <thead><tr>${headers.map(header => `<th>${formatMarkdownInline(header)}</th>`).join('')}</tr></thead>
      <tbody>${bodyRows.join('')}</tbody>
    </table>
  `;
}

function renderMarkdownBlocks(source) {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^```/.test(trimmed)) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      const level = trimmed.match(/^#{1,6}/)[0].length;
      const text = trimmed.replace(/^#{1,6}\s+/, '');
      blocks.push(`<h${level}>${formatMarkdownInline(text)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push('<hr>');
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(`<blockquote><p>${formatMarkdownInline(quoteLines.join(' '))}</p></blockquote>`);
      continue;
    }

    if (/^(\*|-|\+)\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items = [];

      while (index < lines.length) {
        const current = lines[index].trim();
        if (!(ordered ? /^\d+\.\s+/.test(current) : /^(\*|-|\+)\s+/.test(current))) break;
        items.push(current.replace(ordered ? /^\d+\.\s+/ : /^(\*|-|\+)\s+/, ''));
        index += 1;
      }

      const tag = ordered ? 'ol' : 'ul';
      blocks.push(`<${tag}>${items.map(item => `<li>${formatMarkdownInline(item)}</li>`).join('')}</${tag}>`);
      continue;
    }

    const nextLine = index + 1 < lines.length ? lines[index + 1].trim() : '';
    const isTableSeparator = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(nextLine);
    const currentLooksLikeTable = trimmed.includes('|') && isTableSeparator;
    let tableHtml = '';
    let tableLinesCount = 0;

    if (currentLooksLikeTable) {
      const tableLines = [trimmed, nextLine];
      let lookahead = index + 2;
      while (lookahead < lines.length && lines[lookahead].includes('|') && lines[lookahead].trim()) {
        tableLines.push(lines[lookahead].trim());
        lookahead += 1;
        if (tableLines.length >= 12) break;
      }

      tableHtml = renderMarkdownTable(tableLines);
      tableLinesCount = tableLines.length;
    }

    if (tableHtml) {
      blocks.push(tableHtml);
      index += tableLinesCount;
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next) break;
      if (/^#{1,6}\s+/.test(next) || /^>\s?/.test(next) || /^(\*|-|\+)\s+/.test(next) || /^\d+\.\s+/.test(next) || /^```/.test(next) || /^(-{3,}|\*{3,}|_{3,})$/.test(next)) {
        break;
      }
      paragraphLines.push(next);
      index += 1;
    }

    blocks.push(`<p>${formatMarkdownInline(paragraphLines.join(' '))}</p>`);
  }

  return blocks.join('');
}

function renderProjectDescriptionHtml(value) {
  const source = normalizeMarkdownSource(value);
  if (!source) return '<p>No description provided.</p>';

  if (looksLikeHtml(source) && !looksLikeMarkdown(source)) {
    return source;
  }

  if (window.marked && typeof window.marked.parse === 'function') {
    const rendered = window.marked.parse(source, {
      gfm: true,
      breaks: false,
      mangle: false,
      headerIds: false
    });

    if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
      return window.DOMPurify.sanitize(rendered, {
        USE_PROFILES: { html: true }
      });
    }

    return rendered;
  }

  return renderMarkdownBlocks(source);
}

async function renderProjectDescriptionHtmlAsync(value) {
  const source = normalizeMarkdownSource(value);
  if (!source) return '<p>No description provided.</p>';

  if (looksLikeHtml(source) && !looksLikeMarkdown(source)) {
    return source;
  }

  const markdownSource = looksLikeMarkdownFileSource(source)
    ? await loadMarkdownSource(source)
    : source;

  return renderProjectDescriptionHtml(markdownSource);
}

function extractTextFromDescription(value) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderProjectDescriptionHtml(value);
  return (wrapper.textContent || wrapper.innerText || '').replace(/\s+/g, ' ').trim();
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
  const metaText = [project.categoryLabel, project.year].filter(Boolean).join(' · ');
  const cardDesc = project.shortDescription && String(project.shortDescription).trim()
    ? escapeHtml(String(project.shortDescription).trim())
    : getProjectExcerpt(project);

  return `
    <div class="project-card reveal" data-project-id="${project.id}" role="button" tabindex="0" aria-label="View ${project.title}">
      <div class="project-card__image-wrapper">
        <img src="${project.thumbnail}" alt="${project.title}" class="project-card__image" loading="lazy">
      </div>
      <div class="project-card__content">
        <div class="project-card__category">${metaText}</div>
        <div class="project-card__title">${project.title}</div>
        <div class="project-card__desc">${cardDesc}</div>
      </div>
    </div>
  `;
}


function getProjectExcerpt(project) {
  const text = extractTextFromDescription(project.description);
  if (!text) return '';
  return text.length > 120 ? text.substring(0, 120) + '…' : text;
}


// ─── Populate Skills Marquee ────────────────────
function populateSkillsMarquee() {
  const marquee = $('#skillsMarquee');
  const skills = Array.isArray(siteContentState.skills?.items) && siteContentState.skills.items.length
    ? siteContentState.skills.items
    : DEFAULT_SITE_CONTENT.skills.items;
  // Duplicate skills for seamless infinite scroll
  const allSkills = [...skills, ...skills];
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

      // If clicking Home while on home page, scroll to top
      if (target === 'home' && currentPage === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const shouldBeActive = link.dataset.nav === targetNav;
    if (!shouldBeActive && link.classList.contains('active')) {
      link.classList.remove('active');
    }
  });
  
  // Add active class to target with a small delay to prevent overlap
  const targetLink = $$(`.navbar__link[data-nav="${targetNav}"]`)[0];
  if (targetLink) {
    requestAnimationFrame(() => {
      targetLink.classList.add('active');
    });
  }
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

    const detailTemplate = siteContentState.seo?.detailTitleTemplate || DEFAULT_SITE_CONTENT.seo.detailTitleTemplate;
    document.title = detailTemplate.replace('{project}', project.title);

    refreshObserver();

    setTimeout(() => {
      pageTransition.classList.remove('active');
    }, 50);
  }, 300);
}


async function populateProjectDetail(project) {
  const requestId = ++projectDescriptionRequestId;

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
  const detailDescription = $('#detailDescription');
  if (detailDescription) {
    detailDescription.innerHTML = '<p>Loading project description...</p>';
  }

  const renderedDescription = await renderProjectDescriptionHtmlAsync(project.description);
  if (requestId === projectDescriptionRequestId && detailDescription) {
    detailDescription.innerHTML = renderedDescription;
  }

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
    home: siteContentState.seo?.homeTitle || DEFAULT_SITE_CONTENT.seo.homeTitle,
    projects: siteContentState.seo?.projectsTitle || DEFAULT_SITE_CONTENT.seo.projectsTitle,
    detail: siteContentState.seo?.detailTitleTemplate?.replace('{project}', 'Project') || DEFAULT_SITE_CONTENT.seo.detailTitleTemplate.replace('{project}', 'Project'),
    admin: `Admin — ${siteContentState.brand?.name || DEFAULT_SITE_CONTENT.brand.name}`
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

  const recipientEmail = siteContentState.contact?.recipientEmail || OWNER_EMAIL;

  if (!recipientEmail) {
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
      const response = await fetch(`https://formsubmit.co/ajax/${recipientEmail}`, {
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
