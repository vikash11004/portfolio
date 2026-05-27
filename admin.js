/* ============================================
  PORTFOLIO ADMIN — Owner-only Firebase CMS + CRUD
  ============================================ */

const APP_CONFIG = window.PORTFOLIO_CONFIG || {};
const FIREBASE_CONFIG = APP_CONFIG.FIREBASE_CONFIG || null;
const OWNER_EMAIL = APP_CONFIG.OWNER_EMAIL || '';
const DEFAULT_THUMBNAIL = 'assets/images/project-1.png';
const SITE_CONTENT_DOC_ID = 'portfolio_site';

const CATEGORY_LABELS = {
  web: 'Web App',
  design: 'Design',
  oss: 'Open Source',
  software: 'Software'
};

const DEFAULT_SITE_CONTENT = {
  seo: {
    homeTitle: 'Vikash Thyadi — Portfolio',
    projectsTitle: 'Projects — Vikash Thyadi',
    detailTitleTemplate: '{project} — Vikash Thyadi',
    description: 'Vikash Thyadi — Developer & Designer. A refined brutalist portfolio showcasing projects, skills, and creative work.',
    themeColor: '#2A2529',
    faviconEmoji: '⚡'
  },
  brand: {
    name: 'Vikash Thyadi',
    logoUrl: 'assets/images/logo1.png',
    resumeUrl: 'assets/resume/VikashThyadi_Resume.pdf',
    resumeFileName: 'Vikash-Thyadi-Resume.pdf'
  },
  navbar: {
    homeLabel: 'Home',
    projectsLabel: 'Projects',
    contactLabel: 'Contact'
  },
  hero: {
    label: 'Developer & Designer',
    titleLine1: 'Vikash',
    titleLine2: 'Thyadi',
    subtitle: 'Highly motivated and curious engineering student.',
    primaryButtonText: 'View Work',
    secondaryButtonText: 'Download Resume',
    scrollCueText: 'About Me',
    imageUrl: 'assets/images/profile.jpeg',
    imageAlt: 'Vikash Thyadi — Portrait'
  },
  about: {
    sectionLabel: 'Background',
    headingLine1: 'Education &',
    headingLine2: 'Experience',
    bio: "I'm a developer and designer who believes great software should feel inevitable intuitive, precise, and expressive. I approach every project with the discipline of an engineer and the curiosity of a craftsman, turning complex problems into clean, purposeful interfaces.",
    imageUrl: 'assets/images/about.jpeg',
    imageAlt: 'Vikash working at desk',
    educationItems: [
      {
        year: '2023 — Present',
        title: 'B.Tech in Computer Science & Engineering (Data Science)',
        detail: 'Aditya Institute of Technology and Management, Tekkali, Andhra Pradesh<br>CGPA: 8.04<br>Focus Areas: Web Development, Data Analysis, Data Engineering, Artificial Intelligence, Machine Learning'
      },
      {
        year: 'Achievements',
        title: 'Hackathons & Competitive Work',
        detail: 'Secured 2nd place in a 24-hour hackathon conducted by AITAM, building under time pressure with real constraints.<br>Awarded a medal at a 7-hour hackathon conducted by V Cube Software Solutions.'
      },
      {
        year: 'Ongoing',
        title: 'Continuous Learning & Project Building',
        detail: 'Actively working on real-world projects across web development and AI-driven applications, focusing on performance, usability, and practical impact.'
      }
    ]
  },
  projectsPreview: {
    sectionLabel: 'Selected Work',
    titleLine1: 'Featured',
    titleLine2: 'Projects',
    ctaText: 'See All Projects'
  },
  skills: {
    sectionLabel: 'Capabilities',
    headingLine1: 'Tools & Technologies',
    headingLine2: 'I Work With',
    resumeButtonText: 'Download Resume',
    items: [
      'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js',
      'Python', 'C++', 'HTML', 'CSS', 'Bootstrap',
      'PHP', 'Pandas', 'Power BI', 'MySQL', 'NoSQL',
      'PostgreSQL', 'MongoDB', 'Git', 'Figma', 'GraphQL',
      'REST APIs', 'TailwindCSS', 'AWS', 'Firebase', 'Vercel', 'Linux'
    ]
  },
  contact: {
    sectionLabel: 'Get In Touch',
    headingLine1: "Let's Work",
    headingLine2: 'Together',
    subtext: "Have a project in mind, or just want to say hello? I'm always open to discussing new ideas and opportunities.",
    instagramText: 'Instagram →',
    instagramUrl: 'https://www.instagram.com/vikash.thyadi/',
    githubText: 'GitHub →',
    githubUrl: 'https://github.com/vikash11004',
    linkedinText: 'LinkedIn →',
    linkedinUrl: 'https://www.linkedin.com/in/vikashthyadi/',
    recipientEmail: ''
  },
  projectsPage: {
    sectionLabel: 'Archive',
    titleLine1: 'All',
    titleLine2: 'Projects',
    subtitle: 'A collection of work spanning web applications, design systems, creative coding, and open-source contributions.'
  },
  footer: {
    copyright: '© 2026 Vikash Thyadi. All rights reserved.',
    backToTopLabel: '↑ Back to Top'
  }
};

const $ = (sel) => document.querySelector(sel);

let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;
let firebaseReady = false;
let currentUser = null;
let projectsState = [];
let siteContentState = deepMerge(DEFAULT_SITE_CONTENT, {});

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

function parseEducationItems(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        const parsed = JSON.parse(line);
        return {
          year: String(parsed.year || '').trim(),
          title: String(parsed.title || '').trim(),
          detail: String(parsed.detail || '').trim()
        };
      } catch (_error) {
        return null;
      }
    })
    .filter(item => item && item.year && item.title);
}

function serializeEducationItems(items) {
  return (Array.isArray(items) ? items : [])
    .map(item => JSON.stringify({
      year: item.year || '',
      title: item.title || '',
      detail: item.detail || ''
    }))
    .join('\n');
}

function getSelectedCategories() {
  return Array.from(document.querySelectorAll('#projectCategories input[type="checkbox"]:checked'))
    .map(input => input.value);
}

function setSelectedCategories(categories) {
  const selected = new Set(Array.isArray(categories) ? categories : []);
  document.querySelectorAll('#projectCategories input[type="checkbox"]').forEach(input => {
    input.checked = selected.has(input.value);
  });
}

function formatCategoryLabel(categories) {
  const values = Array.isArray(categories) ? categories : [];
  return values.map(category => CATEGORY_LABELS[category] || category).join(', ');
}

function setFormMessage(message, isError = false) {
  const el = $('#projectFormMessage');
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? '#d94000' : '#2a2529';
}

function setSiteMessage(message, isError = false) {
  const el = $('#siteFormMessage');
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? '#d94000' : '#2a2529';
}

function setAuthStatus(message) {
  const el = $('#adminAuthStatus');
  if (el) el.textContent = message;
}

function setEditState(project) {
  const stateEl = $('#adminEditState');
  const titleEl = $('#adminEditingTitle');
  const saveBtn = $('#saveProjectBtn');

  if (stateEl) stateEl.hidden = !project;
  if (titleEl) titleEl.textContent = project ? project.title : '';
  if (saveBtn) saveBtn.textContent = project ? 'Update Project' : 'Save Project';
}

function isOwnerLoggedIn() {
  return !!currentUser && currentUser.email === OWNER_EMAIL;
}

function updateAdminAvailability() {
  const disabledBox = $('#adminDisabled');
  const panel = $('#adminPanel');
  const siteSaveBtn = $('#saveSiteContentBtn');

  if (!disabledBox || !panel) return;

  if (!firebaseReady) {
    disabledBox.hidden = false;
    panel.hidden = true;
    setAuthStatus('Admin disabled until config.local.js is configured.');
    return;
  }

  disabledBox.hidden = true;

  if (isOwnerLoggedIn()) {
    panel.hidden = false;
    if (siteSaveBtn) siteSaveBtn.disabled = false;
    setAuthStatus(`Signed in as ${currentUser.email}`);
  } else if (currentUser && currentUser.email !== OWNER_EMAIL) {
    panel.hidden = true;
    if (siteSaveBtn) siteSaveBtn.disabled = true;
    setAuthStatus('This account is not authorized for admin access.');
  } else {
    panel.hidden = true;
    if (siteSaveBtn) siteSaveBtn.disabled = true;
    setAuthStatus('Sign in as the owner to manage projects and website content.');
  }
}

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
    updateAdminAvailability();
    renderAdminProjectsList();
  });
}

async function restoreAuthSession() {
  if (!firebaseReady || !firebaseAuth) return;
  currentUser = firebaseAuth.currentUser || null;
  updateAdminAvailability();
}

function mapProjectToViewModel(docId, row) {
  const screenshotUrls = parseUrlList(row.screenshot_urls || row.screenshotUrls, []);
  const categories = Array.isArray(row.categories)
    ? row.categories
    : row.category
      ? [row.category]
      : [];

  return {
    rowId: docId,
    id: row.slug || docId,
    title: row.title,
    category: categories[0] || row.category || 'web',
    categories,
    categoryLabel: formatCategoryLabel(categories),
    year: String(row.year || ''),
    role: row.role,
    thumbnail: row.thumbnail_url || row.thumbnailUrl || DEFAULT_THUMBNAIL,
    screenshotUrls,
    description: row.description_html || row.descriptionHtml || '<p>No description provided.</p>',
    tech: Array.isArray(row.tech_stack) ? row.tech_stack : Array.isArray(row.techStack) ? row.techStack : [],
    liveUrl: row.live_url || row.liveUrl || null,
    githubUrl: row.github_url || row.githubUrl || null,
    featured: !!row.featured,
    sortOrder: row.sort_order || row.sortOrder || 0
  };
}

async function loadProjects() {
  if (!firebaseReady || !firebaseDb) {
    projectsState = [];
    return;
  }

  try {
    const snap = await firebaseDb.collection('projects').get();
    const rows = snap.docs.map((docSnap) => ({ docId: docSnap.id, ...docSnap.data() }));

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

    projectsState = rows.map((row) => mapProjectToViewModel(row.docId, row));
  } catch (error) {
    setFormMessage(error.message || 'Unable to load projects.', true);
    projectsState = [];
  }
}

function clearProjectForm() {
  const form = $('#projectForm');
  if (!form) return;

  form.reset();
  const rowId = $('#projectRowId');
  const slugField = $('#projectSlug');
  if (rowId) rowId.value = '';
  if (slugField) slugField.dataset.manual = '';
  setSelectedCategories([]);
  setEditState(null);
  setFormMessage('');
}

function fillProjectForm(project) {
  ($('#projectRowId') || {}).value = project.rowId || '';
  ($('#projectTitle') || {}).value = project.title || '';
  ($('#projectSlug') || {}).value = project.id || '';
  setSelectedCategories(project.categories || (project.category ? [project.category] : ['web']));
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
  setEditState(project);
  $('#projectForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getProjectPayloadFromForm() {
  const title = ($('#projectTitle') || {}).value || '';
  const slug = makeSlug((($('#projectSlug') || {}).value || title));
  const categories = getSelectedCategories();
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
    slug,
    title: title.trim(),
    category: categories[0] || 'web',
    categories,
    year: Number.isFinite(year) ? year : null,
    role: role.trim(),
    thumbnail_url: thumbnail.trim() || DEFAULT_THUMBNAIL,
    screenshot_urls: parseUrlList(screenshotsInput, []),
    description_html: descriptionHtml,
    tech_stack: techInput.split(',').map(item => item.trim()).filter(Boolean),
    live_url: liveUrl && liveUrl.trim() ? liveUrl.trim() : null,
    github_url: githubUrl && githubUrl.trim() ? githubUrl.trim() : null,
    featured,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    updated_at: new Date().toISOString()
  };
}

async function refreshProjects() {
  await loadProjects();
  renderAdminProjectsList();
}

async function updateProjectField(rowId, patch) {
  if (!rowId || !firebaseDb) return;

  try {
    await firebaseDb.collection('projects').doc(rowId).set({
      ...patch,
      updated_at: new Date().toISOString()
    }, { merge: true });
    await refreshProjects();
  } catch (error) {
    setFormMessage(error.message || 'Unable to update project.', true);
  }
}

async function handleProjectSave(event) {
  event.preventDefault();
  if (!firebaseReady || !isOwnerLoggedIn() || !firebaseDb) {
    setFormMessage('You must be signed in as owner.', true);
    return;
  }

  const rowId = ($('#projectRowId') || {}).value || '';
  const payload = getProjectPayloadFromForm();

  if (!payload.title || !payload.slug || !payload.description_html || !payload.categories.length) {
    setFormMessage('Title, slug, category, and description are required.', true);
    return;
  }

  try {
    const docId = rowId || payload.slug;
    await firebaseDb.collection('projects').doc(docId).set({
      ...payload,
      created_at: rowId ? undefined : new Date().toISOString()
    }, { merge: true });

    setFormMessage('Project saved.');
    clearProjectForm();
    await refreshProjects();
  } catch (error) {
    setFormMessage(error.message || 'Unable to save project.', true);
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();
  if (!firebaseReady || !firebaseAuth) return;

  const email = ($('#adminEmail') || {}).value || '';
  const password = ($('#adminPassword') || {}).value || '';

  if (email.trim() !== OWNER_EMAIL) {
    setAuthStatus('Only the configured owner email can access admin.');
    setFormMessage('Only the configured owner email can access admin.', true);
    return;
  }

  try {
    await firebaseAuth.signInWithEmailAndPassword(email.trim(), password);
    setAuthStatus('Signed in successfully.');
    setFormMessage('Signed in successfully.');
    await refreshProjects();
  } catch (error) {
    setAuthStatus(error.message || 'Sign in failed.');
    setFormMessage(error.message || 'Sign in failed.', true);
  }
}

async function handleAdminSignOut() {
  if (!firebaseReady || !firebaseAuth) return;
  await firebaseAuth.signOut();
  clearProjectForm();
  setFormMessage('Signed out.');
}

async function handleAdminListAction(event) {
  const action = event.currentTarget.dataset.action;
  const projectId = event.currentTarget.dataset.id;
  const project = projectsState.find(item => item.id === projectId);

  if (!project || !firebaseDb) return;

  if (action === 'edit') {
    fillProjectForm(project);
    return;
  }

  if (action === 'feature') {
    await updateProjectField(project.rowId, { featured: !project.featured });
    return;
  }

  if (action === 'delete') {
    const ok = window.confirm(`Delete ${project.title}? This cannot be undone.`);
    if (!ok) return;

    try {
      await firebaseDb.collection('projects').doc(project.rowId).delete();
      await refreshProjects();
      clearProjectForm();
    } catch (error) {
      setFormMessage(error.message || 'Unable to delete project.', true);
    }
  }
}

function renderAdminProjectsList() {
  const list = $('#adminProjectList');
  if (!list) return;

  if (!firebaseReady) {
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

function fillSiteContentForm(content) {
  const safe = deepMerge(DEFAULT_SITE_CONTENT, content || {});

  ($('#siteName') || {}).value = safe.brand.name || '';
  ($('#siteLogoUrl') || {}).value = safe.brand.logoUrl || '';
  ($('#seoHomeTitle') || {}).value = safe.seo.homeTitle || '';
  ($('#seoProjectsTitle') || {}).value = safe.seo.projectsTitle || '';
  ($('#seoDetailTitleTemplate') || {}).value = safe.seo.detailTitleTemplate || '{project} — Portfolio';
  ($('#seoDescription') || {}).value = safe.seo.description || '';
  ($('#seoThemeColor') || {}).value = safe.seo.themeColor || '#2A2529';
  ($('#seoFaviconEmoji') || {}).value = safe.seo.faviconEmoji || '⚡';
  ($('#brandResumeUrl') || {}).value = safe.brand.resumeUrl || '';
  ($('#brandResumeFileName') || {}).value = safe.brand.resumeFileName || '';
  ($('#contactRecipientEmail') || {}).value = safe.contact.recipientEmail || '';

  ($('#navHomeText') || {}).value = safe.navbar.homeLabel || '';
  ($('#navProjectsText') || {}).value = safe.navbar.projectsLabel || '';
  ($('#navContactText') || {}).value = safe.navbar.contactLabel || '';

  ($('#heroLabelInput') || {}).value = safe.hero.label || '';
  ($('#heroTitleLine1Input') || {}).value = safe.hero.titleLine1 || '';
  ($('#heroTitleLine2Input') || {}).value = safe.hero.titleLine2 || '';
  ($('#heroSubtitleInput') || {}).value = safe.hero.subtitle || '';
  ($('#heroPrimaryButtonText') || {}).value = safe.hero.primaryButtonText || '';
  ($('#heroSecondaryButtonText') || {}).value = safe.hero.secondaryButtonText || '';
  ($('#heroScrollCueText') || {}).value = safe.hero.scrollCueText || '';
  ($('#heroImageUrl') || {}).value = safe.hero.imageUrl || '';
  ($('#heroImageAlt') || {}).value = safe.hero.imageAlt || '';

  ($('#aboutSectionLabelInput') || {}).value = safe.about.sectionLabel || '';
  ($('#aboutHeadingLine1Input') || {}).value = safe.about.headingLine1 || '';
  ($('#aboutHeadingLine2Input') || {}).value = safe.about.headingLine2 || '';
  ($('#aboutBioInput') || {}).value = safe.about.bio || '';
  ($('#aboutImageUrl') || {}).value = safe.about.imageUrl || '';
  ($('#aboutImageAlt') || {}).value = safe.about.imageAlt || '';
  ($('#aboutEducationItems') || {}).value = serializeEducationItems(safe.about.educationItems || []);

  ($('#featuredSectionLabelInput') || {}).value = safe.projectsPreview.sectionLabel || '';
  ($('#featuredTitleLine1Input') || {}).value = safe.projectsPreview.titleLine1 || '';
  ($('#featuredTitleLine2Input') || {}).value = safe.projectsPreview.titleLine2 || '';
  ($('#featuredCtaTextInput') || {}).value = safe.projectsPreview.ctaText || '';

  ($('#skillsSectionLabelInput') || {}).value = safe.skills.sectionLabel || '';
  ($('#skillsHeadingLine1Input') || {}).value = safe.skills.headingLine1 || '';
  ($('#skillsHeadingLine2Input') || {}).value = safe.skills.headingLine2 || '';
  ($('#skillsResumeButtonText') || {}).value = safe.skills.resumeButtonText || '';
  ($('#skillsItems') || {}).value = (safe.skills.items || []).join(', ');

  ($('#contactSectionLabelInput') || {}).value = safe.contact.sectionLabel || '';
  ($('#contactHeadingLine1Input') || {}).value = safe.contact.headingLine1 || '';
  ($('#contactHeadingLine2Input') || {}).value = safe.contact.headingLine2 || '';
  ($('#contactSubtextInput') || {}).value = safe.contact.subtext || '';
  ($('#contactInstagramText') || {}).value = safe.contact.instagramText || '';
  ($('#contactInstagramUrl') || {}).value = safe.contact.instagramUrl || '';
  ($('#contactGithubText') || {}).value = safe.contact.githubText || '';
  ($('#contactGithubUrl') || {}).value = safe.contact.githubUrl || '';
  ($('#contactLinkedinText') || {}).value = safe.contact.linkedinText || '';
  ($('#contactLinkedinUrl') || {}).value = safe.contact.linkedinUrl || '';

  ($('#archiveSectionLabelInput') || {}).value = safe.projectsPage.sectionLabel || '';
  ($('#archiveTitleLine1Input') || {}).value = safe.projectsPage.titleLine1 || '';
  ($('#archiveTitleLine2Input') || {}).value = safe.projectsPage.titleLine2 || '';
  ($('#archiveSubtitleInput') || {}).value = safe.projectsPage.subtitle || '';

  ($('#footerCopyright') || {}).value = safe.footer.copyright || '';
  ($('#footerBackToTopText') || {}).value = safe.footer.backToTopLabel || '';

  ($('#siteRawJson') || {}).value = JSON.stringify(safe, null, 2);
}

function getSiteContentFromForm() {
  return {
    seo: {
      homeTitle: String((($('#seoHomeTitle') || {}).value || '')).trim(),
      projectsTitle: String((($('#seoProjectsTitle') || {}).value || '')).trim(),
      detailTitleTemplate: String((($('#seoDetailTitleTemplate') || {}).value || '')).trim(),
      description: String((($('#seoDescription') || {}).value || '')).trim(),
      themeColor: String((($('#seoThemeColor') || {}).value || '')).trim() || '#2A2529',
      faviconEmoji: String((($('#seoFaviconEmoji') || {}).value || '')).trim() || '⚡'
    },
    brand: {
      name: String((($('#siteName') || {}).value || '')).trim(),
      logoUrl: String((($('#siteLogoUrl') || {}).value || '')).trim(),
      resumeUrl: String((($('#brandResumeUrl') || {}).value || '')).trim(),
      resumeFileName: String((($('#brandResumeFileName') || {}).value || '')).trim()
    },
    navbar: {
      homeLabel: String((($('#navHomeText') || {}).value || '')).trim(),
      projectsLabel: String((($('#navProjectsText') || {}).value || '')).trim(),
      contactLabel: String((($('#navContactText') || {}).value || '')).trim()
    },
    hero: {
      label: String((($('#heroLabelInput') || {}).value || '')).trim(),
      titleLine1: String((($('#heroTitleLine1Input') || {}).value || '')).trim(),
      titleLine2: String((($('#heroTitleLine2Input') || {}).value || '')).trim(),
      subtitle: String((($('#heroSubtitleInput') || {}).value || '')).trim(),
      primaryButtonText: String((($('#heroPrimaryButtonText') || {}).value || '')).trim(),
      secondaryButtonText: String((($('#heroSecondaryButtonText') || {}).value || '')).trim(),
      scrollCueText: String((($('#heroScrollCueText') || {}).value || '')).trim(),
      imageUrl: String((($('#heroImageUrl') || {}).value || '')).trim(),
      imageAlt: String((($('#heroImageAlt') || {}).value || '')).trim()
    },
    about: {
      sectionLabel: String((($('#aboutSectionLabelInput') || {}).value || '')).trim(),
      headingLine1: String((($('#aboutHeadingLine1Input') || {}).value || '')).trim(),
      headingLine2: String((($('#aboutHeadingLine2Input') || {}).value || '')).trim(),
      bio: String((($('#aboutBioInput') || {}).value || '')).trim(),
      imageUrl: String((($('#aboutImageUrl') || {}).value || '')).trim(),
      imageAlt: String((($('#aboutImageAlt') || {}).value || '')).trim(),
      educationItems: parseEducationItems((($('#aboutEducationItems') || {}).value || ''))
    },
    projectsPreview: {
      sectionLabel: String((($('#featuredSectionLabelInput') || {}).value || '')).trim(),
      titleLine1: String((($('#featuredTitleLine1Input') || {}).value || '')).trim(),
      titleLine2: String((($('#featuredTitleLine2Input') || {}).value || '')).trim(),
      ctaText: String((($('#featuredCtaTextInput') || {}).value || '')).trim()
    },
    skills: {
      sectionLabel: String((($('#skillsSectionLabelInput') || {}).value || '')).trim(),
      headingLine1: String((($('#skillsHeadingLine1Input') || {}).value || '')).trim(),
      headingLine2: String((($('#skillsHeadingLine2Input') || {}).value || '')).trim(),
      resumeButtonText: String((($('#skillsResumeButtonText') || {}).value || '')).trim(),
      items: String((($('#skillsItems') || {}).value || ''))
        .split(/\r?\n|,/) 
        .map(item => item.trim())
        .filter(Boolean)
    },
    contact: {
      sectionLabel: String((($('#contactSectionLabelInput') || {}).value || '')).trim(),
      headingLine1: String((($('#contactHeadingLine1Input') || {}).value || '')).trim(),
      headingLine2: String((($('#contactHeadingLine2Input') || {}).value || '')).trim(),
      subtext: String((($('#contactSubtextInput') || {}).value || '')).trim(),
      instagramText: String((($('#contactInstagramText') || {}).value || '')).trim(),
      instagramUrl: String((($('#contactInstagramUrl') || {}).value || '')).trim(),
      githubText: String((($('#contactGithubText') || {}).value || '')).trim(),
      githubUrl: String((($('#contactGithubUrl') || {}).value || '')).trim(),
      linkedinText: String((($('#contactLinkedinText') || {}).value || '')).trim(),
      linkedinUrl: String((($('#contactLinkedinUrl') || {}).value || '')).trim(),
      recipientEmail: String((($('#contactRecipientEmail') || {}).value || '')).trim()
    },
    projectsPage: {
      sectionLabel: String((($('#archiveSectionLabelInput') || {}).value || '')).trim(),
      titleLine1: String((($('#archiveTitleLine1Input') || {}).value || '')).trim(),
      titleLine2: String((($('#archiveTitleLine2Input') || {}).value || '')).trim(),
      subtitle: String((($('#archiveSubtitleInput') || {}).value || '')).trim()
    },
    footer: {
      copyright: String((($('#footerCopyright') || {}).value || '')).trim(),
      backToTopLabel: String((($('#footerBackToTopText') || {}).value || '')).trim()
    }
  };
}

async function loadSiteContent() {
  siteContentState = deepMerge(DEFAULT_SITE_CONTENT, {});

  if (!firebaseReady || !firebaseDb) {
    fillSiteContentForm(siteContentState);
    return;
  }

  try {
    const snap = await firebaseDb.collection('site_content').doc(SITE_CONTENT_DOC_ID).get();
    if (snap.exists) {
      const data = snap.data() || {};
      siteContentState = deepMerge(DEFAULT_SITE_CONTENT, data.content || {});
    }
    fillSiteContentForm(siteContentState);
    setSiteMessage('Website content loaded.');
  } catch (error) {
    setSiteMessage(`Unable to load site content (${error.message}).`, true);
    fillSiteContentForm(siteContentState);
  }
}

async function handleSiteContentSave(event) {
  event.preventDefault();

  if (!firebaseReady || !isOwnerLoggedIn() || !firebaseDb) {
    setSiteMessage('You must be signed in as owner.', true);
    return;
  }

  const basePayload = getSiteContentFromForm();
  const raw = String((($('#siteRawJson') || {}).value || '')).trim();
  let payload = deepMerge(DEFAULT_SITE_CONTENT, basePayload);

  if (raw) {
    try {
      const rawPayload = JSON.parse(raw);
      payload = deepMerge(payload, rawPayload);
    } catch (_error) {
      setSiteMessage('Advanced Content JSON is not valid JSON.', true);
      return;
    }
  }

  try {
    await firebaseDb.collection('site_content').doc(SITE_CONTENT_DOC_ID).set({
      content: payload,
      updated_at: new Date().toISOString()
    }, { merge: true });

    siteContentState = payload;
    fillSiteContentForm(siteContentState);
    setSiteMessage('Website content saved. Changes are live on your portfolio.');
  } catch (error) {
    setSiteMessage(error.message || 'Unable to save site content.', true);
  }
}

function setupEvents() {
  const loginForm = $('#adminLoginForm');
  const signOutBtn = $('#adminSignOutBtn');
  const projectForm = $('#projectForm');
  const clearBtn = $('#clearProjectForm');
  const titleField = $('#projectTitle');
  const slugField = $('#projectSlug');
  const siteForm = $('#siteContentForm');
  const reloadSiteBtn = $('#reloadSiteContentBtn');

  if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);
  if (signOutBtn) signOutBtn.addEventListener('click', handleAdminSignOut);
  if (projectForm) projectForm.addEventListener('submit', handleProjectSave);
  if (clearBtn) clearBtn.addEventListener('click', clearProjectForm);
  if (siteForm) siteForm.addEventListener('submit', handleSiteContentSave);
  if (reloadSiteBtn) {
    reloadSiteBtn.addEventListener('click', () => {
      loadSiteContent().catch((error) => {
        setSiteMessage(error.message || 'Unable to reload site content.', true);
      });
    });
  }

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

async function initAdmin() {
  setupEvents();
  setupFirebase();
  updateAdminAvailability();

  await loadSiteContent();

  if (firebaseReady) {
    await restoreAuthSession();
    await refreshProjects();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAdmin().catch(console.error);
  });
} else {
  initAdmin().catch(console.error);
}
