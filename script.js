/* ============================================
   PORTFOLIO — Script
   Routing, Data, Animations, Interactions
   ============================================ */

// ─── Project Data ───────────────────────────────

// ─── Firebase Config ────────────────────────────
const APP_CONFIG = window.PORTFOLIO_CONFIG || {};
const FIREBASE_CONFIG = APP_CONFIG.FIREBASE_CONFIG || null;
const OWNER_EMAIL = APP_CONFIG.OWNER_EMAIL || '';
const WEB3FORMS_ACCESS_KEY = APP_CONFIG.WEB3FORMS_ACCESS_KEY || '';
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
  "footer": {
    "backToTopLabel": "↑ Back to Top",
    "copyright": "© 2026 Vikash Thyadi. All rights reserved."
  },
  "contact": {
    "instagramText": "Instagram →",
    "linkedinUrl": "https://www.linkedin.com/in/vikashthyadi/",
    "githubUrl": "https://github.com/vikash11004",
    "linkedinText": "LinkedIn →",
    "headingLine1": "Let's Work",
    "subtext": "Have a project in mind, or just want to say hello? I'm always open to discussing new ideas and opportunities.",
    "sectionLabel": "Get In Touch",
    "githubText": "GitHub →",
    "recipientEmail": "",
    "web3formsKey": "",
    "headingLine2": "Together",
    "instagramUrl": "https://www.instagram.com/vikash.thyadi/"
  },
  "about": {
    "imageUrl": "assets/images/about.jpeg",
    "educationItems": [
      {
        "title": "B.Tech in Computer Science & Engineering (Data Science)",
        "year": "2023 — Present",
        "detail": "Aditya Institute of Technology and Management, Tekkali, Andhra Pradesh<br>CGPA: 7.99<br>Focus Areas: Web Development, Data Analysis, Data Engineering, Artificial Intelligence, Machine Learning"
      },
      {
        "title": "Hackathons & Competitive Work",
        "year": "Achievements",
        "detail": "Secured 2nd place in a 24-hour hackathon conducted by AITAM, building under time pressure with real constraints.<br>Awarded a medal at a 7-hour hackathon conducted by V Cube Software Solutions."
      },
      {
        "year": "Certifications",
        "detail": "Earned the ServiceNow Certified System Administrator (CSA) and Certified Application Developer (CAD) certifications, validating expertise in platform administration and application development.<br>Successfully completed NPTEL Python for Data Science, strengthening skills in Python, data analysis, and machine learning fundamentals.",
        "title": "Professional Certifications"
      }
    ],
    "sectionLabel": "Background",
    "headingLine2": "Experience",
    "imageAlt": "Vikash working at desk",
    "bio": "I'm a developer and designer who believes great software should feel inevitable intuitive, precise, and expressive. I approach every project with the discipline of an engineer and the curiosity of a craftsman, turning complex problems into clean, purposeful interfaces.",
    "headingLine1": "Education &"
  },
  "seo": {
    "detailTitleTemplate": "{project} — Vikash Thyadi",
    "homeTitle": "Vikash Thyadi — Portfolio",
    "themeColor": "#2A2529",
    "faviconEmoji": "⚡",
    "projectsTitle": "Projects — Vikash Thyadi",
    "description": "Vikash Thyadi — Developer & Designer. A refined brutalist portfolio showcasing projects, skills, and creative work."
  },
  "aiConfig": {
    "groqApiKey": "",
    "customEndpoint": "",
    "groqModel": "openai/gpt-oss-120b",
    "provider": "proxy",
    "proxyUrl": "https://gven-ai-proxy.vikashthyadi1104.workers.dev/",
    "openrouterApiKey": "",
    "customModel": "",
    "customApiKey": ""
  },
  "navbar": {
    "contactLabel": "Contact",
    "projectsLabel": "Projects",
    "homeLabel": "Home"
  },
  "projectsPreview": {
    "sectionLabel": "Selected Work",
    "ctaText": "See All Projects",
    "titleLine2": "Projects",
    "titleLine1": "Featured"
  },
  "projectsPage": {
    "titleLine2": "Projects",
    "titleLine1": "All",
    "subtitle": "A collection of work spanning web applications, design systems, creative coding, and open-source contributions.",
    "sectionLabel": "Archive"
  },
  "brand": {
    "resumeUrl": "https://res.cloudinary.com/ucebpoei/image/upload/v1790170808/portfolio/eibnyyt4dli6txy1pthf.pdf",
    "resumeFileName": "Vikash-Thyadi-Resume.pdf",
    "name": "Vikash Thyadi",
    "logoUrl": "assets/images/logo1.png"
  },
  "hero": {
    "imageAlt": "Vikash Thyadi — Portrait",
    "titleLine2": "Thyadi",
    "scrollCueText": "About Me",
    "label": "Developer & Designer",
    "subtitle": "Highly motivated and curious engineering student.",
    "secondaryButtonText": "Download Resume",
    "titleLine1": "Vikash",
    "primaryButtonText": "View Work",
    "imageUrl": "assets/images/profile.jpeg"
  },
  "skills": {
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
    "sectionLabel": "Capabilities",
    "headingLine1": "Tools & Technologies",
    "resumeButtonText": "Download Resume",
    "headingLine2": "I Work With"
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

  // 1. Optimistically display cached site content immediately if available
  try {
    const cachedSync = localStorage.getItem(SITE_CONTENT_SYNC_KEY);
    if (cachedSync) applySyncedSiteContent(cachedSync);
  } catch (_error) {
    // Ignore storage access errors; network fetch will run.
  }

  // 2. Fetch fresh live data from Firestore / REST and render
  await loadSiteContent();
  applySiteContent();
  setupContactForm();

  await loadProjects();

  updateNavbarTheme();
  updateHomeNavActiveState();

  populateFeaturedProjects();
  populateProjectsGrid();
  populateSkillsMarquee();
  initAiChatbot();

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

function getCurrentFilter() {
  const activeTab = document.querySelector('#projectsFilter .filter-tab.active');
  return activeTab?.dataset?.filter || 'all';
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

function parseFirestoreRestField(field) {
  if (!field || typeof field !== 'object') return null;
  if ('stringValue' in field) return field.stringValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return parseFloat(field.doubleValue);
  if ('mapValue' in field) {
    const result = {};
    const subFields = field.mapValue?.fields || {};
    for (const key of Object.keys(subFields)) {
      result[key] = parseFirestoreRestField(subFields[key]);
    }
    return result;
  }
  if ('arrayValue' in field) {
    const vals = field.arrayValue?.values || [];
    return vals.map(parseFirestoreRestField);
  }
  if ('nullValue' in field) return null;
  return null;
}

async function fetchSiteContentViaRest() {
  const projectId = FIREBASE_CONFIG?.projectId || 'portfolio-d114e';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/site_content/${SITE_CONTENT_ROW_ID}`;
  const resp = await fetch(url, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
  const rawContent = json.fields?.content;
  if (!rawContent) throw new Error('No content field in Firestore document');
  return parseFirestoreRestField(rawContent);
}

async function loadSiteContent() {
  siteContentState = deepMerge(DEFAULT_SITE_CONTENT, siteContentState || {});
  let loaded = false;

  // 1. Try Firestore SDK if available
  if (firebaseReady && firebaseDb) {
    try {
      const snap = await firebaseDb.collection('site_content').doc(SITE_CONTENT_ROW_ID).get();
      if (snap.exists) {
        const data = snap.data() || {};
        if (data.content) {
          siteContentState = deepMerge(DEFAULT_SITE_CONTENT, data.content);
          loaded = true;
        }
      }
    } catch (error) {
      console.warn('Firestore SDK get failed, attempting REST fallback:', error.message || error);
    }
  }

  // 2. Fallback to public Firestore REST API (works for any unauthenticated visitor)
  if (!loaded) {
    try {
      const restContent = await fetchSiteContentViaRest();
      if (restContent && typeof restContent === 'object') {
        siteContentState = deepMerge(DEFAULT_SITE_CONTENT, restContent);
        loaded = true;
      }
    } catch (error) {
      console.warn('Public REST site content fallback failed:', error.message || error);
    }
  }

  // 3. Cache to localStorage for instant subsequent loads
  if (loaded) {
    try {
      localStorage.setItem(SITE_CONTENT_SYNC_KEY, JSON.stringify({
        updatedAt: new Date().toISOString(),
        content: siteContentState
      }));
    } catch (_) { }
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

  const brandResumeUrl = content.brand?.resumeUrl || DEFAULT_SITE_CONTENT.brand.resumeUrl;
  const brandResumeFileName = content.brand?.resumeFileName || DEFAULT_SITE_CONTENT.brand.resumeFileName;
  setAttr('#heroSecondaryBtn', 'href', brandResumeUrl);
  setAttr('#heroSecondaryBtn', 'download', brandResumeFileName);
  setAttr('#skillsResumeBtn', 'href', brandResumeUrl);
  setAttr('#skillsResumeBtn', 'download', brandResumeFileName);

  if (content.brand?.logoUrl) {
    setAttr('.navbar__logo img', 'src', content.brand.logoUrl);
  }

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
  return !!currentUser && !!currentUser.email && currentUser.email.trim().toLowerCase() === OWNER_EMAIL.trim().toLowerCase();
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
  } else if (adminSessionChecked && currentUser && (!currentUser.email || currentUser.email.trim().toLowerCase() !== OWNER_EMAIL.trim().toLowerCase())) {
    panel.hidden = true;
    authStatus.textContent = 'This account is not authorized for admin access.';
  } else {
    panel.hidden = true;
    authStatus.textContent = 'Sign in as the owner to manage projects.';
  }
}

async function fetchProjectsViaRest() {
  const projectId = FIREBASE_CONFIG?.projectId || 'portfolio-d114e';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/projects`;
  const resp = await fetch(url, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
  const docs = json.documents || [];
  return docs.map((doc) => {
    const data = {};
    const fields = doc.fields || {};
    for (const key of Object.keys(fields)) {
      data[key] = parseFirestoreRestField(fields[key]);
    }
    return {
      docId: doc.name.split('/').pop(),
      ...data
    };
  });
}

async function loadProjects() {
  let rows = [];

  // 1. Try Firestore SDK if available
  if (firebaseReady && firebaseDb) {
    try {
      const snap = await firebaseDb.collection('projects').get();
      rows = snap.docs.map((docSnap) => ({
        docId: docSnap.id,
        ...docSnap.data()
      }));
    } catch (error) {
      console.warn('Firestore SDK projects get failed, trying REST fallback:', error.message || error);
    }
  }

  // 2. Fallback to public REST API if SDK failed or returned empty
  if (!rows.length) {
    try {
      rows = await fetchProjectsViaRest();
    } catch (error) {
      console.warn('Public REST projects fallback failed:', error.message || error);
    }
  }

  if (rows.length) {
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
    prefetchMarkdownDescriptions(projectsState);
  } else {
    projectsState = [];
  }
}

function mapDbProjectToViewModel(row) {
  const screenshotUrls = parseUrlList(row.screenshot_urls || row.screenshotUrls || row.screenshots, []);
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
    thumbnail: row.thumbnail_url || row.thumbnailUrl || row.thumbnail || DEFAULT_THUMBNAIL,
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

  if (form.dataset.contactBound === 'true') return;
  form.dataset.contactBound = 'true';

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

    const currentKey = siteContentState.contact?.web3formsKey || WEB3FORMS_ACCESS_KEY || APP_CONFIG.WEB3FORMS_ACCESS_KEY;
    if (!currentKey) {
      setContactFormStatus('Contact form is awaiting Web3Forms Access Key. Add it to config.js or Admin settings.', true);
      return;
    }

    setContactFormStatus('Sending your message...');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    const honeypotVal = String(formData.get('botcheck') || formData.get('_honey') || '').trim();
    if (honeypotVal) {
      // Spam bot detected silently
      setContactFormStatus('Thanks! Your message has been sent.', false, true);
      form.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
      return;
    }

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          access_key: currentKey,
          name: name,
          email: email,
          replyto: email,
          message: message,
          subject: `Portfolio Message from ${name}`,
          from_name: 'Vikash Thyadi Portfolio'
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
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

// ─── AI Chatbot & Live Knowledge Base ───────────

let masterKnowledgeBaseCache = null;

async function loadMasterKnowledgeBase() {
  if (masterKnowledgeBaseCache) return masterKnowledgeBaseCache;
  try {
    const res = await fetch('knowledge-base.json');
    if (res.ok) {
      masterKnowledgeBaseCache = await res.json();
      return masterKnowledgeBaseCache;
    }
  } catch (err) {
    console.debug('Master knowledge-base.json fetch note:', err);
  }
  return null;
}

// Immediately initiate background prefetch of master knowledge base
loadMasterKnowledgeBase();

function buildLiveKnowledgeBase() {
  const content = siteContentState || DEFAULT_SITE_CONTENT;
  const brand = content.brand || DEFAULT_SITE_CONTENT.brand;
  const hero = content.hero || DEFAULT_SITE_CONTENT.hero;
  const about = content.about || DEFAULT_SITE_CONTENT.about;
  const skills = Array.isArray(content.skills?.items) && content.skills.items.length
    ? content.skills.items
    : DEFAULT_SITE_CONTENT.skills.items;
  const contact = content.contact || DEFAULT_SITE_CONTENT.contact;
  const educationItems = Array.isArray(about.educationItems) && about.educationItems.length
    ? about.educationItems
    : (DEFAULT_SITE_CONTENT.about.educationItems || []);
  const projects = Array.isArray(projectsState) && projectsState.length
    ? projectsState
    : (window.PORTFOLIO_PROJECT_SEED || []);

  return {
    identity: {
      name: brand.name || 'Vikash Thyadi',
      label: hero.label || 'Developer & Designer',
      title: `${hero.titleLine1 || 'Vikash'} ${hero.titleLine2 || 'Thyadi'}`,
      subtitle: hero.subtitle || '',
      bio: about.bio || '',
      location: 'Andhra Pradesh, India',
      philosophy: 'Believes great software should feel inevitable — intuitive, precise, and expressive.'
    },
    education: educationItems,
    skills: skills,
    projects: projects.map(p => {
      const slug = p.slug || p.id || makeSlug(p.title);
      const cached = (masterKnowledgeBaseCache?.projects || []).find(cp => cp.slug === slug || (cp.title && cp.title.toLowerCase() === (p.title || '').toLowerCase()));
      const techList = Array.isArray(p.tech) && p.tech.length ? p.tech : (Array.isArray(p.tech_stack) ? p.tech_stack : (cached?.tech_stack || []));
      const fullReadme = cached?.readme_markdown || p.description_html || p.description || '';

      return {
        id: p.id || slug,
        slug: slug,
        title: p.title,
        role: p.role || cached?.role || 'Contributor',
        year: p.year || cached?.year,
        category: p.categoryLabel || p.category || cached?.category,
        categories: p.categories || cached?.categories || [p.category || 'web'],
        tech: techList,
        shortDescription: p.shortDescription || p.short_description || cached?.short_description || getProjectExcerpt(p),
        description: extractTextFromDescription(p.description || cached?.short_description || ''),
        readmeMarkdown: fullReadme,
        liveUrl: p.liveUrl || p.live_url || cached?.live_url || null,
        githubUrl: p.githubUrl || p.github_url || cached?.github_url || null,
        featured: !!p.featured
      };
    }),
    resume: {
      url: brand.resumeUrl || DEFAULT_SITE_CONTENT.brand.resumeUrl,
      fileName: brand.resumeFileName || DEFAULT_SITE_CONTENT.brand.resumeFileName
    },
    contact: {
      email: contact.recipientEmail || OWNER_EMAIL,
      linkedin: contact.linkedinUrl || 'https://www.linkedin.com/in/vikashthyadi/',
      github: contact.githubUrl || 'https://github.com/vikash11004',
      instagram: contact.instagramUrl || 'https://www.instagram.com/vikash.thyadi/'
    }
  };
}

function exportKnowledgeBaseAsMarkdown(kb, userQuery = '') {
  let md = `# ${kb.identity.name} — Live Portfolio Knowledge Base\n\n`;
  md += `## 1. Profile & Bio\n`;
  md += `- **Name**: ${kb.identity.name}\n`;
  md += `- **Title**: ${kb.identity.label}\n`;
  md += `- **Location**: ${kb.identity.location}\n`;
  md += `- **Bio**: ${kb.identity.bio}\n\n`;

  md += `## 2. Education, Milestones & Certifications\n`;
  const milestones = masterKnowledgeBaseCache?.education_and_milestones || kb.education || [];
  milestones.forEach((item, idx) => {
    md += `### ${idx + 1}. ${item.period || item.year || 'Period'}: ${item.title || item.degree || 'Milestone'}\n`;
    md += `${(item.detail || '').replace(/<br\s*\/?>/gi, '\n')}\n\n`;
  });

  md += `## 3. Skills & Technologies\n`;
  md += `${kb.skills.join(', ')}\n\n`;

  const qLower = String(userQuery || '').toLowerCase();
  const matchedProject = kb.projects.find(p => {
    const titleMatch = (p.title || '').toLowerCase();
    const slugMatch = (p.slug || '').toLowerCase();
    return (titleMatch && qLower.includes(titleMatch)) || (slugMatch && qLower.includes(slugMatch));
  });

  md += `## 4. Projects Directory (${kb.projects.length} Projects)\n`;
  kb.projects.forEach((p, idx) => {
    md += `### ${idx + 1}. ${p.title} (${p.year || ''}) — ${p.role || ''}\n`;
    md += `- **Slug**: \`${p.slug}\`\n`;
    md += `- **Category**: ${p.category}\n`;
    md += `- **Tech Stack**: ${p.tech.join(', ')}\n`;
    if (p.githubUrl) md += `- **GitHub**: ${p.githubUrl}\n`;
    if (p.liveUrl) md += `- **Live Site**: ${p.liveUrl}\n`;
    md += `- **Overview**: ${p.shortDescription || p.description}\n\n`;
  });

  if (matchedProject && matchedProject.readmeMarkdown && matchedProject.readmeMarkdown.length > 50) {
    md += `\n---\n### 🌟 IN-DEPTH PROJECT README & DOCUMENTATION FOR: "${matchedProject.title}" (\`${matchedProject.slug}/README.md\`)\n\n`;
    md += matchedProject.readmeMarkdown + `\n\n`;
  }

  md += `## 5. Resume & Contact\n`;
  md += `- **Resume URL**: ${kb.resume.url} (${kb.resume.fileName})\n`;
  md += `- **Email**: ${kb.contact.email}\n`;
  md += `- **LinkedIn**: ${kb.contact.linkedin}\n`;
  md += `- **GitHub**: ${kb.contact.github}\n`;
  md += `- **Instagram**: ${kb.contact.instagram}\n`;

  return md;
}

// Global programmatic getter so any script, tool, or visitor can get the complete knowledge base directly from the site
window.getPortfolioKnowledgeBase = function (format = 'json') {
  const kb = buildLiveKnowledgeBase();
  if (format === 'markdown' || format === 'md') {
    return exportKnowledgeBaseAsMarkdown(kb);
  }
  return kb;
};

function getDownloadableResumeUrl(rawUrl, fileName) {
  const url = String(rawUrl || '').trim();
  if (!url) return '';

  const cleanFileName = (fileName || 'Vikash-Thyadi-Resume.pdf')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  // If Cloudinary URL, inject fl_attachment transformation to force Content-Disposition: attachment header
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    if (url.includes('fl_attachment')) return url;
    return url.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(cleanFileName)}/`);
  }

  return url;
}

function formatChatMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Markdown links: [text](url) — attach download attribute if it targets a resume or pdf
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, rawUrl) => {
    const isDoc = /\.pdf(\?.*)?$/i.test(rawUrl) || /resume|cv|download/i.test(label);
    const downloadAttr = isDoc ? ` download="Vikash-Thyadi-Resume.pdf"` : '';
    return `<a href="${rawUrl}" target="_blank" rel="noopener noreferrer"${downloadAttr}>${label}</a>`;
  });

  // Bold **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic *text*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Bullet points
  const lines = html.split('\n');
  let inList = false;
  let formattedLines = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        formattedLines.push('<ul>');
        inList = true;
      }
      formattedLines.push(`<li>${trimmed.substring(2)}</li>`);
    } else {
      if (inList) {
        formattedLines.push('</ul>');
        inList = false;
      }
      if (trimmed) {
        formattedLines.push(`<p>${line}</p>`);
      }
    }
  });

  if (inList) {
    formattedLines.push('</ul>');
  }

  return formattedLines.join('');
}

function queryLiveKnowledgeBase(userQuery) {
  const kb = buildLiveKnowledgeBase();
  const q = String(userQuery || '').toLowerCase().trim();

  // 0. GVEN IDENTITY & SELF-INTRODUCTION
  if (q.includes('who are you') || q.includes('what are you') || q.includes('gven') || q.includes('your name') || q.includes('what is gven')) {
    let reply = `I am **GVEN** (**Guided Virtual Extension of Vikash Thyadi**), an interactive AI assistant built directly into this portfolio.\n\n`;
    reply += `I have real-time access to Vikash's live knowledge base, projects, tech stack, certifications, education, and contact channels. You can ask me any question about his work, or ask me to download his resume!`;
    return { reply };
  }

  // 1. SPECIFIC PROJECT MATCH
  const foundProject = kb.projects.find(p => {
    const nameLower = (p.title || '').toLowerCase();
    const slugLower = (p.slug || '').toLowerCase();
    return q.includes(nameLower) || (slugLower && q.includes(slugLower));
  });

  if (foundProject) {
    let reply = `**${foundProject.title}** (${foundProject.year || 'Project'}) is one of Vikash's key projects where he served as **${foundProject.role || 'Developer'}**.\n\n`;
    if (foundProject.shortDescription) {
      reply += `${foundProject.shortDescription}\n\n`;
    }
    reply += `- **Category**: ${foundProject.category}\n`;
    reply += `- **Tech Stack**: ${foundProject.tech.join(', ')}\n`;

    if (q.includes('feature') || q.includes('how') || q.includes('work') || q.includes('detail') || q.includes('readme') || q.includes('setup') || q.includes('install')) {
      if (foundProject.readmeMarkdown && foundProject.readmeMarkdown.length > 50) {
        const cleanPreview = foundProject.readmeMarkdown
          .split('\n')
          .filter(l => !l.startsWith('#'))
          .slice(0, 10)
          .join('\n')
          .trim();
        if (cleanPreview) {
          reply += `\n**Documentation Highlights:**\n${cleanPreview}\n\n`;
        }
      }
    }

    return {
      reply,
      projectCards: [foundProject]
    };
  }

  // 2. GENERAL PROJECTS QUERY
  if (q.includes('project') || q.includes('work') || q.includes('built') || q.includes('portfolio') || q.includes('apps') || q.includes('show me')) {
    const featuredProjects = kb.projects.filter(p => p.featured);
    const displayProjects = featuredProjects.length ? featuredProjects : kb.projects.slice(0, 4);

    let reply = `Vikash has built **${kb.projects.length} software, AI, and design projects** across full-stack web, machine learning, and mobile apps. Here are his top featured projects:\n\n`;
    displayProjects.forEach(p => {
      reply += `- **${p.title}** (${p.role}): ${p.shortDescription || p.tech.join(', ')}\n`;
    });
    reply += `\nYou can click any card below to view the live app or explore the source code on GitHub!`;

    return {
      reply,
      projectCards: displayProjects
    };
  }

  // 3. SKILLS / TECH STACK
  if (q.includes('skill') || q.includes('tech') || q.includes('stack') || q.includes('language') || q.includes('know') || q.includes('framework') || q.includes('tool')) {
    let reply = `Vikash works with a modern stack spanning full-stack development, AI/RAG systems, databases, and design:\n\n`;
    reply += `- **Languages**: JavaScript (ES6+), TypeScript, Python, C++, Java, PHP, HTML5, CSS3\n`;
    reply += `- **Frontend & Design**: React.js, Next.js, Tailwind CSS, Bootstrap, Figma (UI/UX design)\n`;
    reply += `- **AI & RAG Engineering**: LangChain, Groq Cloud API, Llama 3 / 3.1 70B, FAISS vector store, sentence-transformers\n`;
    reply += `- **Backend & Databases**: Node.js, Express.js, RESTful APIs, GraphQL, Google Cloud Firestore, MongoDB, MySQL, PostgreSQL\n`;
    reply += `- **Cloud & Tools**: Firebase, Vercel, Git/GitHub, Linux, Power BI\n\n`;
    reply += `All of these skills are applied directly across his live projects!`;

    return { reply };
  }

  // 4. EDUCATION & COLLEGE
  if (q.includes('education') || q.includes('college') || q.includes('university') || q.includes('degree') || q.includes('study') || q.includes('studied') || q.includes('aitam') || q.includes('cgpa') || q.includes('academic')) {
    let reply = `Vikash is pursuing his **Bachelor of Technology (B.Tech)** in **Computer Science & Engineering (Data Science)**:\n\n`;
    reply += `- **Institution**: Aditya Institute of Technology and Management (AITAM), Tekkali, Andhra Pradesh\n`;
    reply += `- **Timeline**: 2023 — Present\n`;
    reply += `- **Academic Standing**: CGPA of **7.99 / 8.04**\n`;
    reply += `- **Core Areas**: Data Structures & Algorithms, Full-Stack Development, Data Science, and Machine Learning Systems.\n\n`;

    if (kb.education.length > 1) {
      reply += `**Other Academic Milestones & Activities:**\n`;
      kb.education.slice(1).forEach(item => {
        const cleanDetail = (item.detail || '').replace(/<br\s*\/?>/gi, ' ');
        reply += `- **${item.title}** (${item.year}): ${cleanDetail}\n`;
      });
    }

    return { reply };
  }

  // 5. CERTIFICATIONS
  if (q.includes('certif') || q.includes('servicenow') || q.includes('csa') || q.includes('cad') || q.includes('nptel')) {
    let reply = `Vikash holds notable industry certifications:\n\n`;
    reply += `- **ServiceNow Certified System Administrator (CSA)**: Validates core expertise in ServiceNow platform implementation, configuration, and administration.\n`;
    reply += `- **ServiceNow Certified Application Developer (CAD)**: Validates advanced custom application design, business rules, script includes, and enterprise workflow architecture.\n`;
    reply += `- **NPTEL — Python for Data Science**: Certified in scientific data analysis, Pandas, numerical processing, and foundational machine learning techniques.\n`;

    return { reply };
  }

  // 6. ACHIEVEMENTS / HACKATHONS
  if (q.includes('achievement') || q.includes('hackathon') || q.includes('award') || q.includes('medal') || q.includes('win') || q.includes('honor')) {
    let reply = `Vikash has earned honors in competitive software hackathons:\n\n`;
    reply += `- **🥈 2nd Place Winner — AITAM 24-Hour Hackathon**: Designed, developed, and pitched a complete working software solution in an intensive 24-hour sprint.\n`;
    reply += `- **🏅 Medal Winner — V Cube Software Solutions 7-Hour Hackathon**: Awarded a medal for exceptional rapid prototyping and architecture execution.\n`;

    return { reply };
  }

  // 7. RESUME / CV
  if (q.includes('resume') || q.includes('cv') || q.includes('download') || q.includes('pdf')) {
    const rawUrl = kb.resume.url;
    const fileName = kb.resume.fileName || 'Vikash-Thyadi-Resume.pdf';
    const downloadUrl = getDownloadableResumeUrl(rawUrl, fileName);

    let reply = `You can download Vikash's latest resume directly below!\n\n`;
    reply += `It includes his complete academic timeline, verified certifications (CSA, CAD), technical stack, and software project leadership.`;

    return {
      reply,
      resumeCard: {
        rawUrl,
        downloadUrl,
        fileName
      }
    };
  }

  // 8. CONTACT / HIRE / EMAIL / SOCIALS
  if (q.includes('contact') || q.includes('hire') || q.includes('email') || q.includes('reach') || q.includes('call') || q.includes('linkedin') || q.includes('github') || q.includes('social') || q.includes('freelance') || q.includes('internship')) {
    let reply = `Vikash is actively open to **software engineering internships, developer roles, and freelance opportunities**!\n\n`;
    reply += `You can connect with him through:\n`;
    reply += `- **Email**: [${kb.contact.email}](mailto:${kb.contact.email})\n`;
    reply += `- **LinkedIn**: [linkedin.com/in/vikashthyadi](${kb.contact.linkedin})\n`;
    reply += `- **GitHub**: [github.com/vikash11004](${kb.contact.github})\n`;
    reply += `- **Instagram**: [@vikash.thyadi](${kb.contact.instagram})\n\n`;
    reply += `You can also scroll down to the **Get In Touch** section to send a direct message via the contact form!`;

    return { reply };
  }

  // 9. IDENTITY / WHO IS VIKASH
  if (q.includes('who is') || q.includes('about') || q.includes('bio') || q.includes('vikash') || q.includes('intro') || q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    let reply = `**Vikash Thyadi** is a passionate **${kb.identity.label}** and Computer Science & Engineering student (Data Science) based in Andhra Pradesh, India.\n\n`;
    reply += `${kb.identity.bio || 'He combines engineering discipline with design craftsmanship to turn complex technical challenges into intuitive, high-performance web and AI applications.'}\n\n`;
    reply += `**Quick facts:**\n`;
    reply += `- 🎓 B.Tech CSE (Data Science) at AITAM (CGPA 7.99 / 8.04)\n`;
    reply += `- 📜 Certified ServiceNow Administrator (CSA) & Application Developer (CAD)\n`;
    reply += `- 🚀 Lead developer on AI & RAG projects like **FinPath** and **Xpenso**\n`;
    reply += `- 🛠️ Experienced with React, TypeScript, Python, Groq, and Cloud Firestore\n\n`;
    reply += `Feel free to ask me about any of his projects, skills, or certifications!`;

    return { reply };
  }

  // 10. GENERAL FALLBACK WITH RELEVANCE SEARCH
  let reply = `I'm **GVEN** (**Guided Virtual Extension of Vikash Thyadi**), and I'm happy to help you explore Vikash's work!\n\nVikash is a **${kb.identity.label}** specializing in full-stack web applications, AI/RAG solutions, and responsive UI design.\n\n`;
  reply += `Here are some popular topics you can ask me about:\n`;
  reply += `- **Projects**: *"Tell me about FinPath or Xpenso"*, *"Show me featured projects"*\n`;
  reply += `- **Skills**: *"What languages and frameworks does he use?"*\n`;
  reply += `- **Certifications**: *"Tell me about his ServiceNow CSA & CAD credentials"*\n`;
  reply += `- **Resume**: *"Download resume"* or *"Where can I get his CV?"*\n`;
  reply += `- **Contact**: *"How can I get in touch or hire him?"*`;

  return { reply };
}

function getActiveAiConfig() {
  try {
    const local = localStorage.getItem('portfolio_ai_config_override');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (_) { }

  if (siteContentState && siteContentState.aiConfig) {
    return siteContentState.aiConfig;
  }

  if (window.PORTFOLIO_CONFIG && window.PORTFOLIO_CONFIG.AI_CONFIG) {
    return window.PORTFOLIO_CONFIG.AI_CONFIG;
  }

  return { provider: 'builtin' };
}

async function callCloudAiProvider(userQuery, kb) {
  const aiConfig = getActiveAiConfig();
  let provider = aiConfig.provider || 'builtin';

  // If a secure serverless proxy URL is provided, prioritize it
  if (provider === 'proxy' || (aiConfig.proxyUrl && provider !== 'builtin')) {
    provider = 'proxy';
  } else if (provider === 'builtin' && aiConfig.groqApiKey && aiConfig.groqApiKey.startsWith('gsk_')) {
    provider = 'groq';
  }

  if (provider === 'builtin') {
    return null;
  }

  let endpoint = '';
  let apiKey = '';
  let model = '';

  if (provider === 'proxy') {
    endpoint = aiConfig.proxyUrl || '';
    if (!endpoint) return null;
    let rawModel = aiConfig.groqModel || 'openai/gpt-oss-120b';
    if (!rawModel || rawModel.includes('llama-3') || rawModel.includes('llama3') || rawModel.includes('mixtral') || rawModel === 'groq/compound-mini') {
      rawModel = 'openai/gpt-oss-120b';
    }
    model = rawModel;
    apiKey = ''; // Handled securely on the server/Cloudflare edge
  } else if (provider === 'groq') {
    apiKey = aiConfig.groqApiKey || '';
    if (!apiKey) return null;
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    let rawModel = aiConfig.groqModel || 'openai/gpt-oss-120b';
    if (!rawModel || rawModel.includes('llama-3') || rawModel.includes('llama3') || rawModel.includes('mixtral') || rawModel === 'groq/compound-mini') {
      rawModel = 'openai/gpt-oss-120b';
    }
    model = rawModel;
  } else if (provider === 'openrouter') {
    apiKey = aiConfig.openrouterApiKey || '';
    if (!apiKey) return null;
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    model = aiConfig.openrouterModel || 'meta-llama/llama-3.3-70b-instruct:free';
  } else if (provider === 'custom') {
    apiKey = aiConfig.customApiKey || '';
    endpoint = aiConfig.customEndpoint || '';
    model = aiConfig.customModel || 'gpt-3.5-turbo';
    if (!endpoint) return null;
  } else {
    return null;
  }

  const systemPrompt = `You are GVEN (Guided Virtual Extension of Vikash Thyadi), the personal AI assistant for Vikash Thyadi on his portfolio website.
Answer concisely, warmly, and accurately using strictly the verified portfolio knowledge base provided below.
If asked about downloading his resume or CV, mention that his verified resume PDF can be downloaded directly right here in the widget.
If asked about contact or hiring, provide his email (${kb.contact.email}) and links.
Use clear markdown formatting (**bold**, *italic*, - bullet lists). Keep answers direct and helpful.

--- LIVE PORTFOLIO KNOWLEDGE BASE ---
${exportKnowledgeBaseAsMarkdown(kb, userQuery)}`;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuery }
      ],
      max_tokens: 600,
      temperature: 0.6
    })
  });

  if (!response.ok) {
    throw new Error(`Cloud AI provider returned HTTP ${response.status}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) throw new Error('Empty response from Cloud AI');

  const qLower = userQuery.toLowerCase();
  let resumeCard = null;
  if (qLower.includes('resume') || qLower.includes('cv') || qLower.includes('download') || reply.toLowerCase().includes('resume')) {
    const rawUrl = kb.resume.url;
    const fileName = kb.resume.fileName || 'Vikash-Thyadi-Resume.pdf';
    resumeCard = {
      rawUrl,
      downloadUrl: getDownloadableResumeUrl(rawUrl, fileName),
      fileName
    };
  }

  let projectCards = [];
  const matchedProject = kb.projects.find(p => qLower.includes((p.title || '').toLowerCase()));
  if (matchedProject) {
    projectCards = [matchedProject];
  } else if (qLower.includes('featured') || qLower.includes('projects')) {
    projectCards = kb.projects.filter(p => p.featured).slice(0, 3);
  }

  return {
    reply,
    projectCards,
    resumeCard
  };
}

function initAiChatbot() {
  const widget = $('#aiChatWidget');
  const toggleBtn = $('#aiChatToggleBtn');
  const modal = $('#aiChatModal');
  const closeBtn = $('#aiChatCloseBtn');
  const clearBtn = $('#aiChatClearBtn');
  const form = $('#aiChatForm');
  const input = $('#aiChatInput');
  const messagesContainer = $('#aiChatMessages');
  const suggestionsList = $('#aiChatSuggestionsList');

  if (!widget || !toggleBtn || !modal || !messagesContainer) return;

  function toggleChat(forceOpen = null) {
    const shouldOpen = forceOpen !== null ? forceOpen : modal.style.display === 'none';
    if (shouldOpen) {
      modal.style.display = 'flex';
      toggleBtn.setAttribute('aria-expanded', 'true');
      widget.classList.remove('is-scrolling');
      const ping = toggleBtn.querySelector('.ai-chat-toggle-ping');
      if (ping) ping.style.display = 'none';

      if (window.innerWidth > 600 && input) {
        setTimeout(() => input.focus(), 150);
      }
      scrollToBottom();
    } else {
      modal.style.display = 'none';
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }

  function appendMessage(sender, text, projectCards = [], resumeCard = null) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgEl = document.createElement('div');
    msgEl.className = `ai-chat-msg ai-chat-msg--${sender}`;

    let html = `<div class="ai-chat-bubble">${formatChatMarkdown(text)}`;

    if (Array.isArray(projectCards) && projectCards.length) {
      projectCards.forEach(p => {
        html += `
          <div class="ai-chat-project-card">
            <div class="ai-chat-project-card__header">
              <span class="ai-chat-project-card__title">${escapeHtml(p.title)}</span>
              <span class="ai-chat-project-card__role">${escapeHtml(p.role || 'Project')}</span>
            </div>
            <div class="ai-chat-project-card__desc">${escapeHtml(p.shortDescription || '')}</div>
            <div class="ai-chat-project-card__tech">Tech: ${escapeHtml((p.tech || []).slice(0, 5).join(', '))}</div>
            <div class="ai-chat-project-card__links">
              ${p.liveUrl ? `<a href="${escapeHtml(p.liveUrl)}" target="_blank" rel="noopener noreferrer">Live Demo ↗</a>` : ''}
              ${p.githubUrl ? `<a href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>` : ''}
            </div>
          </div>
        `;
      });
    }

    if (resumeCard && resumeCard.downloadUrl) {
      html += `
        <div class="ai-chat-resume-card">
          <div class="ai-chat-resume-card__info">
            <div class="ai-chat-resume-card__icon">📄</div>
            <div>
              <div class="ai-chat-resume-card__name">${escapeHtml(resumeCard.fileName)}</div>
              <div class="ai-chat-resume-card__sub">PDF Document · Verified Credentials & Experience</div>
            </div>
          </div>
          <div class="ai-chat-resume-card__actions">
            <a href="${escapeHtml(resumeCard.downloadUrl)}" download="${escapeHtml(resumeCard.fileName)}" class="ai-chat-download-btn" data-download-url="${escapeHtml(resumeCard.downloadUrl)}" data-filename="${escapeHtml(resumeCard.fileName)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download Resume
            </a>
            <a href="${escapeHtml(resumeCard.rawUrl || resumeCard.downloadUrl)}" target="_blank" rel="noopener noreferrer" class="ai-chat-view-link">Preview in browser ↗</a>
          </div>
        </div>
      `;
    }

    html += `</div><span class="ai-chat-msg__time">${timeStr}</span>`;
    msgEl.innerHTML = html;
    messagesContainer.appendChild(msgEl);

    // Interactive download listener with blob fallback
    const downloadBtn = msgEl.querySelector('.ai-chat-download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async (e) => {
        const fileUrl = downloadBtn.getAttribute('data-download-url') || downloadBtn.href;
        const fileName = downloadBtn.getAttribute('data-filename') || 'Vikash-Thyadi-Resume.pdf';

        try {
          const resp = await fetch(fileUrl);
          if (resp.ok) {
            e.preventDefault();
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
          }
        } catch (_) {
          // If cross-origin fetch is blocked, the native link click with fl_attachment executes
        }
      });
    }

    scrollToBottom();
  }

  function showTypingIndicator() {
    const typingEl = document.createElement('div');
    typingEl.className = 'ai-chat-msg ai-chat-msg--bot';
    typingEl.id = 'aiChatTypingIndicator';
    typingEl.innerHTML = `
      <div class="ai-chat-typing">
        <span class="ai-chat-typing__dot"></span>
        <span class="ai-chat-typing__dot"></span>
        <span class="ai-chat-typing__dot"></span>
      </div>
    `;
    messagesContainer.appendChild(typingEl);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    const typingEl = $('#aiChatTypingIndicator');
    if (typingEl) typingEl.remove();
  }

  function getOrCreateChatSessionId() {
    try {
      let sid = sessionStorage.getItem('gven_session_id');
      if (!sid) {
        sid = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
        sessionStorage.setItem('gven_session_id', sid);
      }
      return sid;
    } catch (_e) {
      return 'sess_' + Date.now().toString(36);
    }
  }

  async function logGvenInteraction(question, reply, providerUsed) {
    try {
      if (!firebaseDb) return;
      await firebaseDb.collection('chat_logs').add({
        question: String(question || '').trim(),
        answer: String(reply || '').trim(),
        provider: String(providerUsed || 'built-in'),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        clientTimestamp: new Date().toISOString(),
        sessionId: getOrCreateChatSessionId(),
        userAgent: navigator.userAgent || '',
        platform: navigator.platform || '',
        language: navigator.language || 'en'
      });
    } catch (err) {
      console.warn('GVEN logging failed (non-blocking):', err.message || err);
    }
  }

  async function handleUserMessage(queryText) {
    const q = String(queryText || '').trim();
    if (!q) return;

    appendMessage('user', q);
    if (input) input.value = '';

    showTypingIndicator();

    try {
      await loadMasterKnowledgeBase();
      const kb = buildLiveKnowledgeBase();
      let result = null;
      let providerUsed = 'built-in';

      // 1. Attempt Cloud AI provider if configured with API key
      try {
        result = await callCloudAiProvider(q, kb);
        if (result) providerUsed = 'cloud-proxy';
      } catch (cloudErr) {
        console.warn('Cloud AI failed, falling back to live knowledge base:', cloudErr.message || cloudErr);
        result = null;
      }

      // 2. Seamless fallback to built-in knowledge base engine
      if (!result) {
        await new Promise(r => setTimeout(r, 380));
        result = queryLiveKnowledgeBase(q);
        providerUsed = 'built-in-kb';
      }

      hideTypingIndicator();
      appendMessage('bot', result.reply, result.projectCards, result.resumeCard);

      // Log question & answer to Firestore for Admin Panel
      logGvenInteraction(q, result.reply, providerUsed);
    } catch (err) {
      hideTypingIndicator();
      appendMessage('bot', "I encountered a momentary issue. Please try asking again!");
    }
  }

  function resetChat() {
    messagesContainer.innerHTML = '';
    const welcome = `Hello! 👋 I'm **GVEN** (*Guided Virtual Extension of Vikash Thyadi*).\n\nI have real-time access to everything on this portfolio. Ask me about Vikash's **projects**, **skills & tech stack**, **education**, **certifications**, or how to **download his resume** and **get in touch**!`;
    appendMessage('bot', welcome);
  }

  // Hide button during page scrolling; reappear smoothly when scrolling stops
  let scrollTimeout = null;
  window.addEventListener('scroll', () => {
    if (modal.style.display === 'none') {
      widget.classList.add('is-scrolling');
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        widget.classList.remove('is-scrolling');
      }, 250);
    }
  }, { passive: true });

  // Event Listeners
  toggleBtn.addEventListener('click', () => toggleChat());
  if (closeBtn) closeBtn.addEventListener('click', () => toggleChat(false));
  if (clearBtn) clearBtn.addEventListener('click', () => resetChat());

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input) handleUserMessage(input.value);
    });
  }

  if (suggestionsList) {
    suggestionsList.addEventListener('click', (e) => {
      const chip = e.target.closest('.ai-chat-chip');
      if (chip && chip.dataset.query) {
        handleUserMessage(chip.dataset.query);
      }
    });
  }

  // Initial welcome message
  resetChat();
}


