/* ============================================
  PORTFOLIO ADMIN — Owner-only CRUD
  ============================================ */

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

const $ = (sel) => document.querySelector(sel);

let supabaseClient = null;
let supabaseReady = false;
let currentUser = null;
let projectsState = [];

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

function setAuthStatus(message) {
  const el = $('#adminAuthStatus');
  if (el) el.textContent = message;
}

function setEditState(project) {
  const stateEl = $('#adminEditState');
  const titleEl = $('#adminEditingTitle');
  const saveBtn = $('#saveProjectBtn');

  if (stateEl) {
    stateEl.hidden = !project;
  }

  if (titleEl) {
    titleEl.textContent = project ? project.title : '';
  }

  if (saveBtn) {
    saveBtn.textContent = project ? 'Update Project' : 'Save Project';
  }
}

function isOwnerLoggedIn() {
  return !!currentUser && currentUser.email === OWNER_EMAIL;
}

function updateAdminAvailability() {
  const disabledBox = $('#adminDisabled');
  const panel = $('#adminPanel');

  if (!disabledBox || !panel) return;

  if (!supabaseReady) {
    disabledBox.hidden = false;
    panel.hidden = true;
    setAuthStatus('Admin disabled until config.local.js is configured.');
    return;
  }

  disabledBox.hidden = true;

  if (isOwnerLoggedIn()) {
    panel.hidden = false;
    setAuthStatus(`Signed in as ${currentUser.email}`);
  } else if (currentUser && currentUser.email !== OWNER_EMAIL) {
    panel.hidden = true;
    setAuthStatus('This account is not authorized for admin access.');
  } else {
    panel.hidden = true;
    setAuthStatus('Sign in as the owner to manage projects.');
  }
}

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
    updateAdminAvailability();
    renderAdminProjectsList();
  });
}

async function restoreAuthSession() {
  if (!supabaseReady) return;

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setAuthStatus(error.message);
    return;
  }

  currentUser = data && data.session ? data.session.user : null;
  updateAdminAvailability();
}

function mapDbProjectToViewModel(row) {
  const screenshotUrls = parseUrlList(row.screenshot_urls, []);
  const categories = Array.isArray(row.categories)
    ? row.categories
    : row.category
      ? [row.category]
      : [];

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

async function loadProjects() {
  if (!supabaseReady) {
    projectsState = [];
    return;
  }

  const { data, error } = await supabaseClient
    .from('projects')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    setFormMessage(error.message, true);
    projectsState = [];
    return;
  }

  projectsState = (data || []).map(mapDbProjectToViewModel);
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
    title: title.trim(),
    slug,
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
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0
  };
}

async function refreshProjects() {
  await loadProjects();
  renderAdminProjectsList();
}

async function updateProjectField(rowId, patch) {
  if (!rowId) return;

  const { error } = await supabaseClient.from('projects').update(patch).eq('id', rowId);
  if (error) {
    setFormMessage(error.message, true);
    return;
  }

  await refreshProjects();
}

async function handleProjectSave(event) {
  event.preventDefault();
  if (!supabaseReady || !isOwnerLoggedIn()) {
    setFormMessage('You must be signed in as owner.', true);
    return;
  }

  const rowId = ($('#projectRowId') || {}).value || '';
  const payload = getProjectPayloadFromForm();

  if (!payload.title || !payload.slug || !payload.description_html || !payload.categories.length) {
    setFormMessage('Title, slug, category, and description are required.', true);
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
  await refreshProjects();
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
  await refreshProjects();
}

async function handleAdminSignOut() {
  if (!supabaseReady) return;
  await supabaseClient.auth.signOut();
  clearProjectForm();
  setFormMessage('Signed out.');
}

async function handleAdminListAction(event) {
  const action = event.currentTarget.dataset.action;
  const projectId = event.currentTarget.dataset.id;
  const project = projectsState.find(item => item.id === projectId);

  if (!project) return;

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

    const { error } = await supabaseClient.from('projects').delete().eq('id', project.rowId);
    if (error) {
      setFormMessage(error.message, true);
      return;
    }

    await refreshProjects();
    clearProjectForm();
  }
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

function setupEvents() {
  const loginForm = $('#adminLoginForm');
  const signOutBtn = $('#adminSignOutBtn');
  const projectForm = $('#projectForm');
  const clearBtn = $('#clearProjectForm');
  const titleField = $('#projectTitle');
  const slugField = $('#projectSlug');

  if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);
  if (signOutBtn) signOutBtn.addEventListener('click', handleAdminSignOut);
  if (projectForm) projectForm.addEventListener('submit', handleProjectSave);
  if (clearBtn) clearBtn.addEventListener('click', clearProjectForm);

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
  setupSupabase();
  updateAdminAvailability();

  if (supabaseReady) {
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
