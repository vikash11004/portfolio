/* ============================================
  PORTFOLIO ADMIN — Owner-only Firebase CMS + CRUD
  ============================================ */

const APP_CONFIG = window.PORTFOLIO_CONFIG || {};
const FIREBASE_CONFIG = APP_CONFIG.FIREBASE_CONFIG || null;
const OWNER_EMAIL = APP_CONFIG.OWNER_EMAIL || '';
const DEFAULT_THUMBNAIL = 'assets/images/project-1.png';
const PROJECT_ASSET_ROOT = 'project-assets';
const SITE_CONTENT_DOC_ID = 'portfolio_site';
const SITE_CONTENT_SYNC_KEY = 'portfolio-site-content-sync';
const PROJECT_SEED = Array.isArray(window.PORTFOLIO_PROJECT_SEED) ? window.PORTFOLIO_PROJECT_SEED : [];

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
let firebaseStorage = null;
let firebaseReady = false;
let currentUser = null;
let projectsState = [];
let siteContentState = deepMerge(DEFAULT_SITE_CONTENT, {});
let siteRawJsonBaseline = '';

const CLOUDINARY_STORAGE_KEY = 'portfolio_cloudinary_config';

function getCloudinaryConfig() {
  try {
    const raw = localStorage.getItem(CLOUDINARY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.cloudName && parsed.uploadPreset) {
        return {
          cloudName: String(parsed.cloudName).trim(),
          uploadPreset: String(parsed.uploadPreset).trim()
        };
      }
    }
  } catch (_) { }

  const configObj = window.PORTFOLIO_CONFIG?.CLOUDINARY;
  if (configObj && configObj.cloudName && configObj.uploadPreset) {
    return {
      cloudName: String(configObj.cloudName).trim(),
      uploadPreset: String(configObj.uploadPreset).trim()
    };
  }

  return { cloudName: '', uploadPreset: '' };
}

function saveCloudinaryConfig(cloudName, uploadPreset) {
  const cleanName = String(cloudName || '').trim();
  const cleanPreset = String(uploadPreset || '').trim();
  if (!cleanName || !cleanPreset) {
    localStorage.removeItem(CLOUDINARY_STORAGE_KEY);
  } else {
    localStorage.setItem(CLOUDINARY_STORAGE_KEY, JSON.stringify({
      cloudName: cleanName,
      uploadPreset: cleanPreset
    }));
  }
}

function initCloudinaryUI() {
  const cloudNameInput = $('#cloudinaryCloudName');
  const uploadPresetInput = $('#cloudinaryUploadPreset');
  const badge = $('#cloudinaryStatusBadge');
  const saveBtn = $('#saveCloudinarySettingsBtn');
  const msg = $('#cloudinarySettingsMsg');

  function refreshBadge() {
    const config = getCloudinaryConfig();
    if (cloudNameInput && !cloudNameInput.value) cloudNameInput.value = config.cloudName;
    if (uploadPresetInput && !uploadPresetInput.value) uploadPresetInput.value = config.uploadPreset;

    const details = $('#cloudinaryConfigDetails');
    if (badge) {
      if (config.cloudName && config.uploadPreset) {
        badge.textContent = `✓ Ready (${config.cloudName})`;
        badge.classList.add('is-connected');
        if (details && !details.dataset.userToggled) details.open = false;
      } else {
        badge.textContent = 'Setup Required';
        badge.classList.remove('is-connected');
        if (details) details.open = true;
      }
    }
  }

  const detailsEl = $('#cloudinaryConfigDetails');
  if (detailsEl) {
    detailsEl.addEventListener('toggle', () => {
      detailsEl.dataset.userToggled = '1';
    });
  }

  refreshBadge();

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = cloudNameInput ? cloudNameInput.value.trim() : '';
      const preset = uploadPresetInput ? uploadPresetInput.value.trim() : '';

      if (!name || !preset) {
        if (msg) {
          msg.textContent = 'Please enter both Cloud Name and Upload Preset.';
          msg.className = 'admin-storage-config__msg is-error';
        }
        return;
      }

      saveCloudinaryConfig(name, preset);
      refreshBadge();

      if (msg) {
        msg.textContent = '✓ Cloudinary settings saved!';
        msg.className = 'admin-storage-config__msg is-success';
        setTimeout(() => {
          if (msg) msg.textContent = '';
        }, 4000);
      }
    });
  }
}

const AI_STORAGE_KEY = 'portfolio_ai_config_override';

const DEFAULT_AI_CONFIG = {
  provider: 'builtin',
  groqApiKey: '',
  groqModel: 'groq/compound-mini',
  openrouterApiKey: '',
  openrouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
  customEndpoint: '',
  customApiKey: '',
  customModel: ''
};

function normalizeGroqModel(model) {
  if (!model || model.includes('llama-3') || model.includes('mixtral')) {
    return 'groq/compound-mini';
  }
  return model;
}

function getAiConfig() {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const merged = deepMerge(DEFAULT_AI_CONFIG, parsed);
        merged.groqModel = normalizeGroqModel(merged.groqModel);
        return merged;
      }
    }
  } catch (_) { }

  if (siteContentState && siteContentState.aiConfig) {
    const merged = deepMerge(DEFAULT_AI_CONFIG, siteContentState.aiConfig);
    merged.groqModel = normalizeGroqModel(merged.groqModel);
    return merged;
  }

  if (window.PORTFOLIO_CONFIG && window.PORTFOLIO_CONFIG.AI_CONFIG) {
    const merged = deepMerge(DEFAULT_AI_CONFIG, window.PORTFOLIO_CONFIG.AI_CONFIG);
    merged.groqModel = normalizeGroqModel(merged.groqModel);
    return merged;
  }

  return { ...DEFAULT_AI_CONFIG };
}

function saveAiConfig(cfg) {
  try {
    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(cfg));
  } catch (_) { }

  siteContentState = siteContentState || {};
  siteContentState.aiConfig = { ...cfg };
}

function initAiConfigUI() {
  const providerSelect = $('#aiProviderSelect');
  const groqModelSelect = $('#aiGroqModelSelect');
  const groqApiKeyInput = $('#aiGroqApiKey');
  const openrouterApiKeyInput = $('#aiOpenrouterApiKey');
  const customEndpointInput = $('#aiCustomEndpoint');
  const customModelInput = $('#aiCustomModel');
  const customFields = $('#customAiEndpointFields');
  const saveBtn = $('#saveAiSettingsBtn');
  const testBtn = $('#testAiConnectionBtn');
  const badge = $('#aiStatusBadge');
  const msg = $('#aiSettingsMsg');

  function refreshForm() {
    const cfg = getAiConfig();
    if (providerSelect) providerSelect.value = cfg.provider || 'builtin';
    if (groqModelSelect) groqModelSelect.value = normalizeGroqModel(cfg.groqModel);
    if (groqApiKeyInput) groqApiKeyInput.value = cfg.groqApiKey || '';
    if (openrouterApiKeyInput) openrouterApiKeyInput.value = cfg.openrouterApiKey || '';
    if (customEndpointInput) customEndpointInput.value = cfg.customEndpoint || '';
    if (customModelInput) customModelInput.value = cfg.customModel || '';

    if (customFields) {
      customFields.style.display = cfg.provider === 'custom' ? 'grid' : 'none';
    }

    if (badge) {
      if (cfg.provider === 'groq') {
        badge.textContent = cfg.groqApiKey ? `✓ Groq Ready` : 'Groq Key Needed';
        badge.className = `admin-storage-config__status ${cfg.groqApiKey ? 'is-connected' : ''}`;
      } else if (cfg.provider === 'openrouter') {
        badge.textContent = cfg.openrouterApiKey ? '✓ OpenRouter Ready' : 'Key Needed';
        badge.className = `admin-storage-config__status ${cfg.openrouterApiKey ? 'is-connected' : ''}`;
      } else if (cfg.provider === 'custom') {
        badge.textContent = cfg.customEndpoint ? '✓ Custom API' : 'Endpoint Needed';
        badge.className = `admin-storage-config__status ${cfg.customEndpoint ? 'is-connected' : ''}`;
      } else {
        badge.textContent = '✓ Built-in Engine';
        badge.className = 'admin-storage-config__status is-connected';
      }
    }
  }

  if (providerSelect) {
    providerSelect.addEventListener('change', () => {
      if (customFields) {
        customFields.style.display = providerSelect.value === 'custom' ? 'grid' : 'none';
      }
    });
  }

  if (groqApiKeyInput) {
    groqApiKeyInput.addEventListener('input', () => {
      const val = groqApiKeyInput.value.trim();
      if (val.startsWith('gsk_') && providerSelect && providerSelect.value === 'builtin') {
        providerSelect.value = 'groq';
        if (badge) {
          badge.textContent = '✓ Groq Ready';
          badge.className = 'admin-storage-config__status is-connected';
        }
      }
    });
  }

  refreshForm();

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      let provider = providerSelect ? providerSelect.value : 'builtin';
      const groqKey = groqApiKeyInput ? groqApiKeyInput.value.trim() : '';

      // If user provided a Groq key but left provider on builtin, auto-activate groq
      if (groqKey && provider === 'builtin') {
        provider = 'groq';
        if (providerSelect) providerSelect.value = 'groq';
      }

      const cfg = {
        provider,
        groqModel: normalizeGroqModel(groqModelSelect ? groqModelSelect.value : 'groq/compound-mini'),
        groqApiKey: groqKey,
        openrouterApiKey: openrouterApiKeyInput ? openrouterApiKeyInput.value.trim() : '',
        customEndpoint: customEndpointInput ? customEndpointInput.value.trim() : '',
        customModel: customModelInput ? customModelInput.value.trim() : ''
      };

      saveAiConfig(cfg);
      refreshForm();

      if (firebaseReady && isOwnerLoggedIn() && firebaseDb) {
        try {
          const updated = deepMerge(siteContentState, { aiConfig: cfg });
          await saveSiteContentToFirestore(updated);
        } catch (_) { }
      }

      if (msg) {
        msg.textContent = '✓ AI configuration saved successfully!';
        msg.className = 'admin-storage-config__msg is-success';
        setTimeout(() => { if (msg) msg.textContent = ''; }, 4000);
      }
    });
  }

  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      let provider = providerSelect ? providerSelect.value : 'builtin';
      if (provider === 'builtin' && groqApiKeyInput && groqApiKeyInput.value.trim().startsWith('gsk_')) {
        provider = 'groq';
        if (providerSelect) providerSelect.value = 'groq';
      }

      if (msg) {
        msg.textContent = 'Testing connection...';
        msg.className = 'admin-storage-config__msg';
      }

      if (provider === 'builtin') {
        if (msg) {
          msg.textContent = '✓ Built-in Knowledge Base engine is active and ready (no API key needed).';
          msg.className = 'admin-storage-config__msg is-success';
        }
        return;
      }

      if (provider === 'groq') {
        const key = groqApiKeyInput ? groqApiKeyInput.value.trim() : '';
        const model = normalizeGroqModel(groqModelSelect ? groqModelSelect.value : 'groq/compound-mini');
        if (!key) {
          if (msg) {
            msg.textContent = 'Please enter your Groq API key first.';
            msg.className = 'admin-storage-config__msg is-error';
          }
          return;
        }

        try {
          const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: 'Say hello in two words.' }],
              max_tokens: 15
            })
          });

          if (!resp.ok) {
            const errJson = await resp.json().catch(() => ({}));
            throw new Error(errJson.error?.message || `HTTP ${resp.status}`);
          }

          const data = await resp.json();
          const reply = data.choices?.[0]?.message?.content || 'Connection OK';
          if (msg) {
            msg.textContent = `✓ Groq Connected (${model})! Model answered: "${reply.trim()}"`;
            msg.className = 'admin-storage-config__msg is-success';
          }
        } catch (err) {
          if (msg) {
            msg.textContent = `✗ Groq test failed: ${err.message}`;
            msg.className = 'admin-storage-config__msg is-error';
          }
        }
        return;
      }

      if (provider === 'openrouter') {
        const key = openrouterApiKeyInput ? openrouterApiKeyInput.value.trim() : '';
        if (!key) {
          if (msg) {
            msg.textContent = 'Please enter your OpenRouter API key first.';
            msg.className = 'admin-storage-config__msg is-error';
          }
          return;
        }

        try {
          const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-3.3-70b-instruct:free',
              messages: [{ role: 'user', content: 'Say hello in two words.' }],
              max_tokens: 15
            })
          });

          if (!resp.ok) {
            const errJson = await resp.json().catch(() => ({}));
            throw new Error(errJson.error?.message || `HTTP ${resp.status}`);
          }

          const data = await resp.json();
          const reply = data.choices?.[0]?.message?.content || 'Connection OK';
          if (msg) {
            msg.textContent = `✓ OpenRouter Connected! Model answered: "${reply.trim()}"`;
            msg.className = 'admin-storage-config__msg is-success';
          }
        } catch (err) {
          if (msg) {
            msg.textContent = `✗ OpenRouter test failed: ${err.message}`;
            msg.className = 'admin-storage-config__msg is-error';
          }
        }
      }
    });
  }
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

function makeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function sanitizeAssetFileName(fileName) {
  const base = String(fileName || 'asset')
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return base || 'asset';
}

function getProjectAssetFolder() {
  const slugField = $('#projectSlug');
  const titleField = $('#projectTitle');
  const slug = makeSlug((slugField && slugField.value) || (titleField && titleField.value) || 'project');
  return `${PROJECT_ASSET_ROOT}/${slug}`;
}

function getAssetPath(file, kind) {
  const folder = getProjectAssetFolder();
  const safeName = sanitizeAssetFileName(file && file.name ? file.name : 'asset');
  const extension = file && file.name && file.name.includes('.')
    ? `.${String(file.name).split('.').pop().toLowerCase()}`
    : '';
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const segment = kind === 'thumbnail' ? 'thumbnail' : 'screenshots';

  return `${folder}/${segment}/${uniqueId}-${safeName}${extension}`;
}

function isImageFile(file) {
  return !!file && typeof file.type === 'string' && file.type.startsWith('image/');
}

function isResumeFile(file) {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return type.includes('pdf') || type.includes('word') || type.includes('document') ||
    name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx');
}

function updateThumbnailPreview(url, fileName = '', fileSize = 0) {
  const preview = $('#thumbnailDropzonePreview');
  const content = $('#thumbnailDropzoneContent');
  const img = $('#thumbnailPreviewImg');
  const nameEl = $('#thumbnailPreviewName');
  const metaEl = $('#thumbnailPreviewMeta');
  const dropzone = $('#thumbnailDropzone');

  if (!preview || !content || !img) return;

  const cleanUrl = String(url || '').trim();
  if (cleanUrl) {
    img.src = cleanUrl;
    if (nameEl) nameEl.textContent = fileName || cleanUrl.split('/').pop().split('?')[0] || 'Thumbnail';
    if (metaEl) metaEl.textContent = fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : (cleanUrl.startsWith('http') ? 'External URL' : 'Local Asset');
    preview.style.display = 'flex';
    content.style.display = 'none';
  } else {
    img.src = '';
    preview.style.display = 'none';
    content.style.display = 'flex';
    if (dropzone) {
      dropzone.classList.remove('is-uploading', 'is-success', 'is-error');
      const statusEl = $('#thumbnailDropzoneStatus');
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.style.display = 'none';
      }
    }
  }
}

function uploadToCloudinary(file, kind, onProgress) {
  return new Promise((resolve, reject) => {
    const config = getCloudinaryConfig();
    if (!config.cloudName || !config.uploadPreset) {
      return reject(new Error('Cloudinary is not configured. Please enter your Cloud Name and Upload Preset in Media Storage settings above.'));
    }

    const isDocKind = kind === 'resume' || isResumeFile(file);
    if (!isDocKind && !isImageFile(file)) {
      return reject(new Error(`Only image files (PNG, JPG, WEBP, etc.) can be uploaded for ${kind}.`));
    }

    if (file.size > 25 * 1024 * 1024) {
      return reject(new Error(`File "${file.name}" exceeds the 25MB limit.`));
    }

    const resourceType = isDocKind ? 'auto' : 'image';
    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${resourceType}/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', config.uploadPreset);
    formData.append('folder', 'portfolio');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.secure_url) {
            resolve(data.secure_url);
          } else {
            reject(new Error('Upload succeeded, but no secure_url was returned by Cloudinary.'));
          }
        } catch (err) {
          reject(new Error('Invalid response from Cloudinary API.'));
        }
      } else {
        let msg = `Cloudinary upload failed (HTTP ${xhr.status})`;
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData.error?.message) {
            msg = errData.error.message;
            if (msg.toLowerCase().includes('preset') || msg.toLowerCase().includes('unsigned')) {
              msg += ' — Ensure your upload preset in Cloudinary Settings > Upload is set to "Unsigned".';
            }
          }
        } catch (_) { }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error uploading to Cloudinary. Check your internet connection or Cloud Name.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Cloudinary upload timed out (30s).'));
    };

    xhr.timeout = 30000;
    xhr.send(formData);
  });
}

function uploadToFirebaseStorage(file, kind, onProgress) {
  return new Promise((resolve, reject) => {
    if (!firebaseStorage) {
      return reject(new Error('Firebase Storage SDK not loaded.'));
    }

    if (!isImageFile(file)) {
      return reject(new Error(`Only image files (PNG, JPG, WEBP, etc.) can be uploaded for ${kind}.`));
    }

    if (file.size > 10 * 1024 * 1024) {
      return reject(new Error(`File "${file.name}" exceeds the 10MB limit.`));
    }

    const path = getAssetPath(file, kind);
    const ref = firebaseStorage.ref().child(path);
    const uploadTask = ref.put(file, { contentType: file.type });

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { uploadTask.cancel(); } catch (_) { }
        reject(new Error('Upload timed out (15s). Ensure Firebase Storage is activated in Firebase Console.'));
      }
    }, 15000);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && typeof onProgress === 'function') {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        const code = error && error.code ? error.code : '';
        const msg = error && error.message ? error.message : '';
        if (code === 'storage/bucket-not-found' || msg.includes('404') || msg.includes('does not exist')) {
          reject(new Error('Firebase Storage bucket not activated. Use Cloudinary or upgrade to Blaze plan.'));
        } else if (code === 'storage/unauthorized') {
          reject(new Error('Storage permission denied. Ensure you are signed in as owner.'));
        } else if (code === 'storage/canceled') {
          reject(new Error('Upload canceled or timed out.'));
        } else {
          reject(new Error(msg || 'Upload failed. Check Storage rules or Console setup.'));
        }
      },
      async () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try {
          const downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

function uploadProjectAsset(file, kind, onProgress) {
  if (!isOwnerLoggedIn()) {
    return Promise.reject(new Error('Please sign in as owner before uploading images.'));
  }

  const cConfig = getCloudinaryConfig();
  if (cConfig.cloudName && cConfig.uploadPreset) {
    return uploadToCloudinary(file, kind, onProgress);
  }

  const details = $('#cloudinaryConfigDetails');
  if (details) {
    details.open = true;
    details.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return Promise.reject(new Error(
    'Cloudinary is not configured yet! Open "Media Storage (Cloudinary)" above, enter your Cloud Name & Upload Preset, and click Save.'
  ));
}


function appendUrlsToTextarea(textarea, urls) {
  if (!textarea || !Array.isArray(urls) || !urls.length) return;

  const existing = String(textarea.value || '').trim();
  const additions = urls.filter(Boolean).join('\n');
  textarea.value = existing ? `${existing}\n${additions}` : additions;
}

function normalizeProjectDescriptionInput(value) {
  return String(value || '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .trim();
}

function getFilesFromDropEvent(event) {
  if (event.dataTransfer?.files?.length) {
    return Array.from(event.dataTransfer.files).filter(Boolean);
  }
  if (event.dataTransfer?.items?.length) {
    return Array.from(event.dataTransfer.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter(Boolean);
  }
  return [];
}

async function handleFilesUpload(files, kind, dropzoneEl, statusEl) {
  if (!files || !files.length) return false;

  const cConfig = getCloudinaryConfig();
  const hasCloudinary = Boolean(cConfig.cloudName && cConfig.uploadPreset);

  if (!isOwnerLoggedIn()) {
    setFormMessage('Please sign in as owner before uploading images.', true);
    if (dropzoneEl) {
      dropzoneEl.classList.remove('is-uploading', 'is-success');
      dropzoneEl.classList.add('is-error');
    }
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = '✗ Sign in as owner to upload';
    }
    return false;
  }

  if (!hasCloudinary) {
    const details = $('#cloudinaryConfigDetails');
    if (details) {
      details.open = true;
      details.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setFormMessage('Cloudinary setup required. Please enter your Cloud Name and Upload Preset in Media Storage settings above.', true);
    if (dropzoneEl) {
      dropzoneEl.classList.remove('is-uploading', 'is-success');
      dropzoneEl.classList.add('is-error');
    }
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = '✗ Cloudinary setup required (open Media Storage above)';
    }
    return false;
  }

  const progressBar = dropzoneEl ? dropzoneEl.querySelector('.project-dropzone__progress-bar') : null;
  const progressFill = dropzoneEl ? dropzoneEl.querySelector('.project-dropzone__progress-fill') : null;

  if (dropzoneEl) {
    dropzoneEl.classList.remove('is-success', 'is-error');
    dropzoneEl.classList.add('is-uploading');
  }
  if (progressBar) progressBar.style.display = 'block';
  if (progressFill) progressFill.style.width = '0%';

  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.textContent = `Uploading ${files.length} file${files.length === 1 ? '' : 's'} (0%)...`;
  }

  try {
    if (kind === 'thumbnail') {
      const firstFile = files[0];

      // Instant preview
      try {
        const localBlob = URL.createObjectURL(firstFile);
        updateThumbnailPreview(localBlob, firstFile.name, firstFile.size);
      } catch (_) { }

      const uploadedUrl = await uploadProjectAsset(firstFile, kind, (pct) => {
        if (progressFill) progressFill.style.width = `${pct}%`;
        if (statusEl) statusEl.textContent = `Uploading ${pct}%...`;
      });

      const input = $('#projectThumbnail');
      if (input) input.value = uploadedUrl;
      updateThumbnailPreview(uploadedUrl, firstFile.name, firstFile.size);

      if (dropzoneEl) {
        dropzoneEl.classList.remove('is-uploading', 'is-error');
        dropzoneEl.classList.add('is-success');
      }
      setFormMessage('Thumbnail uploaded to Cloudinary and added to form.');
      if (statusEl) statusEl.textContent = '✓ Uploaded to Cloudinary!';
      return true;
    }

    const textarea = $('#projectScreenshots');
    const previewsContainer = $('#screenshotsDropzonePreviews');
    const uploadedUrls = [];

    // Show instant thumbnail chips for screenshots
    if (previewsContainer) {
      previewsContainer.innerHTML = '';
      previewsContainer.style.display = 'flex';
      for (const file of files) {
        try {
          const img = document.createElement('img');
          img.src = URL.createObjectURL(file);
          img.title = file.name;
          previewsContainer.appendChild(img);
        } catch (_) { }
      }
    }

    for (let i = 0; i < files.length; i++) {
      if (statusEl) statusEl.textContent = `Uploading file ${i + 1} of ${files.length}...`;
      const url = await uploadProjectAsset(files[i], kind, (pct) => {
        if (progressFill) progressFill.style.width = `${Math.round(((i + pct / 100) / files.length) * 100)}%`;
      });
      uploadedUrls.push(url);
    }

    appendUrlsToTextarea(textarea, uploadedUrls);

    if (dropzoneEl) {
      dropzoneEl.classList.remove('is-uploading', 'is-error');
      dropzoneEl.classList.add('is-success');
    }
    setFormMessage(`Uploaded ${uploadedUrls.length} screenshot${uploadedUrls.length === 1 ? '' : 's'} to Cloudinary.`);
    if (statusEl) statusEl.textContent = `✓ ${uploadedUrls.length} screenshot${uploadedUrls.length === 1 ? '' : 's'} uploaded!`;
    return true;
  } catch (error) {
    if (dropzoneEl) {
      dropzoneEl.classList.remove('is-uploading', 'is-success');
      dropzoneEl.classList.add('is-error');
    }
    setFormMessage(error.message || 'Unable to upload file.', true);
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = `✗ ${error.message || 'Upload failed'}`;
    }
    return false;
  } finally {
    if (progressBar) progressBar.style.display = 'none';
  }
}

function setupAssetDropTarget(containerSelector, dropzoneSelector, inputSelector, fileInputSelector, statusSelector, kind) {
  const container = $(containerSelector);
  const dropzone = $(dropzoneSelector);
  const textInput = $(inputSelector);
  const fileInput = $(fileInputSelector);
  const statusEl = $(statusSelector);

  if (!dropzone) return;

  // Clicking dropzone opens native file dialog
  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#thumbnailPreviewClear')) return;
    if (e.target !== fileInput && fileInput) {
      fileInput.click();
    }
  });

  // Clear button for thumbnail
  const clearBtn = $('#thumbnailPreviewClear');
  if (clearBtn && kind === 'thumbnail') {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (textInput) textInput.value = '';
      updateThumbnailPreview('');
      if (fileInput) fileInput.value = '';
    });
  }

  // Update preview when typing/pasting directly into URL input
  if (textInput && kind === 'thumbnail') {
    textInput.addEventListener('input', (e) => {
      updateThumbnailPreview(e.target.value);
    });
  }

  // Keyboard accessibility
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (fileInput) fileInput.click();
    }
  });

  // Native file input change handler
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length) {
        await handleFilesUpload(files, kind, dropzone, statusEl);
      }
      fileInput.value = '';
    });
  }

  // Drag and drop event handling
  let dragCounter = 0;
  const elementsToListen = [container, dropzone, textInput].filter(Boolean);

  elementsToListen.forEach((el) => {
    el.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      dropzone.classList.add('is-dragover');
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      dropzone.classList.add('is-dragover');
    });

    el.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        dropzone.classList.remove('is-dragover');
      }
    });

    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      dropzone.classList.remove('is-dragover');

      const files = getFilesFromDropEvent(e);
      if (files.length) {
        await handleFilesUpload(files, kind, dropzone, statusEl);
      }
    });
  });
}

function setupAssetCardDropzone({
  dropzoneSelector,
  fileInputSelector,
  statusSelector,
  inputSelector,
  previewImgSelector,
  previewDocNameSelector,
  previewDocLinkSelector,
  fileNameInputSelector,
  kind
}) {
  const dropzone = $(dropzoneSelector);
  const fileInput = $(fileInputSelector);
  const statusEl = $(statusSelector);
  const textInput = $(inputSelector);
  const previewImg = previewImgSelector ? $(previewImgSelector) : null;
  const previewDocName = previewDocNameSelector ? $(previewDocNameSelector) : null;
  const previewDocLink = previewDocLinkSelector ? $(previewDocLinkSelector) : null;
  const fileNameInput = fileNameInputSelector ? $(fileNameInputSelector) : null;

  if (!dropzone) return;

  dropzone.addEventListener('click', (e) => {
    if (e.target !== fileInput && fileInput) {
      fileInput.click();
    }
  });

  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (fileInput) fileInput.click();
    }
  });

  if (textInput) {
    textInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        if (previewImg) previewImg.src = val;
        if (previewDocLink) {
          previewDocLink.href = val;
          previewDocLink.style.display = 'inline-block';
        }
        if (previewDocName) {
          const rawName = val.split('/').pop().split('?')[0];
          previewDocName.textContent = decodeURIComponent(rawName) || 'Resume File';
        }
      }
    });
  }

  async function handleSingleUpload(file) {
    if (!file) return;

    if (!isOwnerLoggedIn()) {
      setAssetsMessage('Please sign in as owner before uploading files.', true);
      dropzone.classList.remove('is-uploading', 'is-success');
      dropzone.classList.add('is-error');
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.textContent = '✗ Sign in as owner to upload';
      }
      return;
    }

    const cConfig = getCloudinaryConfig();
    if (!cConfig.cloudName || !cConfig.uploadPreset) {
      setAssetsMessage('Cloudinary setup required. Check Settings & SEO tab.', true);
      dropzone.classList.remove('is-uploading', 'is-success');
      dropzone.classList.add('is-error');
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.textContent = '✗ Cloudinary setup required';
      }
      return;
    }

    if (kind === 'resume' || isResumeFile(file)) {
      if (previewDocName) previewDocName.textContent = file.name;
    } else {
      try {
        if (previewImg) previewImg.src = URL.createObjectURL(file);
      } catch (_) { }
    }

    dropzone.classList.remove('is-success', 'is-error');
    dropzone.classList.add('is-uploading');
    const progressBar = dropzone.querySelector('.project-dropzone__progress-bar');
    const progressFill = dropzone.querySelector('.project-dropzone__progress-fill');
    if (progressBar) progressBar.style.display = 'block';
    if (progressFill) progressFill.style.width = '0%';
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Uploading to Cloudinary...';
    }

    try {
      const uploadedUrl = await uploadToCloudinary(file, kind, (pct) => {
        if (progressFill) progressFill.style.width = `${pct}%`;
        if (statusEl) statusEl.textContent = `Uploading ${pct}%...`;
      });

      if (textInput) textInput.value = uploadedUrl;
      if (previewImg) previewImg.src = uploadedUrl;
      if (previewDocName) previewDocName.textContent = file.name;
      if (previewDocLink) {
        previewDocLink.href = uploadedUrl;
        previewDocLink.style.display = 'inline-block';
      }
      if (fileNameInput && !fileNameInput.value) {
        fileNameInput.value = file.name;
      }

      // Auto-save to Firestore immediately so changes publish live instantly!
      let saveError = null;
      try {
        const patch = {};
        if (kind === 'hero') {
          patch.hero = { imageUrl: uploadedUrl };
        } else if (kind === 'about') {
          patch.about = { imageUrl: uploadedUrl };
        } else if (kind === 'logo') {
          patch.brand = { logoUrl: uploadedUrl };
        } else if (kind === 'resume') {
          patch.brand = {
            resumeUrl: uploadedUrl,
            resumeFileName: (fileNameInput && fileNameInput.value) ? fileNameInput.value : file.name
          };
        }
        const updated = deepMerge(siteContentState, patch);
        await saveSiteContentToFirestore(updated);
      } catch (err) {
        console.warn('Auto-save to Firestore failed:', err);
        saveError = err;
      }

      dropzone.classList.remove('is-uploading', 'is-error');
      dropzone.classList.add('is-success');
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.textContent = saveError ? '✓ Uploaded to Cloudinary (click Save below)' : '✓ Uploaded & Published to live site!';
      }
      setAssetsMessage(
        saveError
          ? `${kind === 'resume' ? 'Resume' : 'Asset'} uploaded to Cloudinary! Click "Save Photo & Asset Changes" below to publish.`
          : `✓ ${kind === 'resume' ? 'Resume' : 'Asset'} uploaded to Cloudinary and live on your portfolio!`
      );
    } catch (err) {
      dropzone.classList.remove('is-uploading', 'is-success');
      dropzone.classList.add('is-error');
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.textContent = `✗ ${err.message || 'Upload failed'}`;
      }
      setAssetsMessage(err.message || 'Unable to upload file.', true);
    } finally {
      if (progressBar) progressBar.style.display = 'none';
    }
  }

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) await handleSingleUpload(file);
      fileInput.value = '';
    });
  }

  let dragCounter = 0;
  const elementsToListen = [dropzone, textInput].filter(Boolean);

  elementsToListen.forEach((el) => {
    el.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      dropzone.classList.add('is-dragover');
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      dropzone.classList.add('is-dragover');
    });

    el.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        dropzone.classList.remove('is-dragover');
      }
    });

    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      dropzone.classList.remove('is-dragover');

      const files = getFilesFromDropEvent(e);
      if (files.length) {
        await handleSingleUpload(files[0]);
      }
    });
  });
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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEducationItems(items) {
  const container = $('#educationItemsContainer');
  if (!container) return;
  container.innerHTML = '';
  const list = Array.isArray(items) && items.length ? items : [];

  list.forEach((item, index) => {
    const card = createEducationItemCard(item, index);
    container.appendChild(card);
  });
}

function createEducationItemCard(item = {}, index = 0) {
  const card = document.createElement('div');
  card.className = 'admin-exp-card';
  card.innerHTML = `
    <div class="admin-exp-card__header">
      <span class="admin-exp-card__num">Milestone #${index + 1}</span>
      <button type="button" class="admin-exp-card__del-btn" title="Delete milestone">✕ Remove</button>
    </div>
    <div class="project-form__grid">
      <label>Year / Period
        <input type="text" class="exp-year-input" value="${escapeHtml(item.year || '')}" placeholder="e.g. 2023 — Present, Achievements, 2024" required>
      </label>
      <label>Title / Degree / Role
        <input type="text" class="exp-title-input" value="${escapeHtml(item.title || '')}" placeholder="e.g. B.Tech in CSE (Data Science), Hackathons" required>
      </label>
    </div>
    <label>Description / Details (HTML formatting like &lt;br&gt; supported)
      <textarea class="exp-detail-input" rows="3" placeholder="Institution, achievements, awards, key focus areas...">${escapeHtml(item.detail || '')}</textarea>
    </label>
  `;

  const delBtn = card.querySelector('.admin-exp-card__del-btn');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      card.remove();
      renumberEducationCards();
    });
  }

  return card;
}

function renumberEducationCards() {
  const cards = document.querySelectorAll('#educationItemsContainer .admin-exp-card');
  cards.forEach((card, idx) => {
    const numEl = card.querySelector('.admin-exp-card__num');
    if (numEl) numEl.textContent = `Milestone #${idx + 1}`;
  });
}

function getEducationItemsFromDOM() {
  const cards = document.querySelectorAll('#educationItemsContainer .admin-exp-card');
  const items = [];
  cards.forEach((card) => {
    const yearInput = card.querySelector('.exp-year-input');
    const titleInput = card.querySelector('.exp-title-input');
    const detailInput = card.querySelector('.exp-detail-input');
    const year = (yearInput?.value || '').trim();
    const title = (titleInput?.value || '').trim();
    const detail = (detailInput?.value || '').trim();
    if (year || title || detail) {
      items.push({ year, title, detail });
    }
  });
  return items;
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

function setAssetsMessage(message, isError = false) {
  const el = $('#assetsFormMessage');
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

function setSeoMessage(message, isError = false) {
  const el = $('#seoFormMessage');
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
  return !!currentUser && !!currentUser.email && currentUser.email.trim().toLowerCase() === OWNER_EMAIL.trim().toLowerCase();
}

function updateAdminAvailability() {
  const disabledBox = $('#adminDisabled');
  const panel = $('#adminPanel');
  const siteSaveBtn = $('#saveSiteContentBtn');
  const assetsSaveBtn = $('#saveAssetsBtn');
  const seoSaveBtn = $('#saveSeoBtn');
  const projectSaveBtn = $('#saveProjectBtn');

  if (!disabledBox || !panel) return;

  if (!firebaseReady) {
    disabledBox.hidden = false;
    panel.hidden = true;
    setAuthStatus('Admin disabled until Firebase configuration is added in config.js.');
    return;
  }

  disabledBox.hidden = true;

  const allSaveButtons = [siteSaveBtn, assetsSaveBtn, seoSaveBtn, projectSaveBtn];

  if (isOwnerLoggedIn()) {
    panel.hidden = false;
    allSaveButtons.forEach((btn) => {
      if (btn) btn.disabled = false;
    });
    setAuthStatus(`Signed in as ${currentUser.email}`);
  } else if (currentUser && (!currentUser.email || currentUser.email.trim().toLowerCase() !== OWNER_EMAIL.trim().toLowerCase())) {
    panel.hidden = true;
    allSaveButtons.forEach((btn) => {
      if (btn) btn.disabled = true;
    });
    setAuthStatus(`This account (${currentUser.email}) is not authorized for admin access.`);
  } else {
    panel.hidden = true;
    allSaveButtons.forEach((btn) => {
      if (btn) btn.disabled = true;
    });
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
  firebaseStorage = window.firebase.storage ? firebaseApp.storage() : null;
  if (firebaseStorage) {
    try {
      firebaseStorage.setMaxUploadRetryTime(8000);
      firebaseStorage.setMaxOperationRetryTime(8000);
    } catch (_) { }
  }
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
  const screenshotUrls = parseUrlList(row.screenshot_urls || row.screenshotUrls || row.screenshots, []);
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
    thumbnail: row.thumbnail_url || row.thumbnailUrl || row.thumbnail || DEFAULT_THUMBNAIL,
    screenshotUrls,
    description: row.description_html || row.descriptionHtml || '<p>No description provided.</p>',
    shortDescription: row.short_description || row.shortDescription || row.excerpt || '',
    tech: Array.isArray(row.tech_stack) ? row.tech_stack : Array.isArray(row.techStack) ? row.techStack : [],
    liveUrl: row.live_url || row.liveUrl || null,
    githubUrl: row.github_url || row.githubUrl || null,
    featured: !!row.featured,
    sortOrder: row.sort_order || row.sortOrder || 0
  };
}

async function loadProjects() {
  if (!firebaseReady || !firebaseDb) {
    projectsState = PROJECT_SEED.map((project) => mapProjectToViewModel(project.slug, project));
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

    projectsState = rows.length ? rows.map((row) => mapProjectToViewModel(row.docId, row)) : PROJECT_SEED.map((project) => mapProjectToViewModel(project.slug, project));
  } catch (error) {
    setFormMessage(error.message || 'Unable to load projects.', true);
    projectsState = PROJECT_SEED.map((project) => mapProjectToViewModel(project.slug, project));
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
  updateThumbnailPreview(project.thumbnail || '');
  ($('#projectScreenshots') || {}).value = Array.isArray(project.screenshotUrls) ? project.screenshotUrls.join('\n') : '';
  ($('#projectLiveUrl') || {}).value = project.liveUrl || '';
  ($('#projectGithubUrl') || {}).value = project.githubUrl || '';
  ($('#projectSortOrder') || {}).value = Number.isFinite(project.sortOrder) ? project.sortOrder : 0;
  ($('#projectFeatured') || {}).value = project.featured ? 'true' : 'false';
  ($('#projectTech') || {}).value = Array.isArray(project.tech) ? project.tech.join(', ') : '';
  ($('#projectShortDescription') || {}).value = project.shortDescription || '';
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
  const descriptionHtml = normalizeProjectDescriptionInput(($('#projectDescription') || {}).value || '');
  const shortDescription = ($('#projectShortDescription') || {}).value || '';

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
    short_description: shortDescription.trim() || null,
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

async function ensureSeedProjects() {
  if (!firebaseReady || !firebaseDb) return;
  if (!isOwnerLoggedIn()) return;
  if (!Array.isArray(PROJECT_SEED) || PROJECT_SEED.length === 0) return;

  try {
    const existing = await firebaseDb.collection('projects').limit(1).get();
    if (!existing.empty) return; // already has projects

    const ok = window.confirm(`No projects found in Firestore. Seed ${PROJECT_SEED.length} projects from local assets now?`);
    if (!ok) return;

    setFormMessage('Seeding projects into Firestore...');
    const batch = firebaseDb.batch();

    PROJECT_SEED.forEach((p) => {
      const slug = p.slug || makeSlug(p.title || p.name || 'project');
      const docRef = firebaseDb.collection('projects').doc(slug);
      const payload = {
        slug: slug,
        title: p.title || p.name || slug,
        categories: Array.isArray(p.categories) ? p.categories : (p.category ? [p.category] : ['web']),
        year: p.year || null,
        role: p.role || '',
        thumbnail_url: p.thumbnail_url || p.thumbnailUrl || p.thumbnail || DEFAULT_THUMBNAIL,
        screenshot_urls: Array.isArray(p.screenshot_urls) ? p.screenshot_urls : (Array.isArray(p.screenshotUrls) ? p.screenshotUrls : []),
        description_html: p.description_html || p.descriptionHtml || p.description || '<p>No description provided.</p>',
        short_description: p.short_description || p.shortDescription || p.excerpt || null,
        tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack : (Array.isArray(p.techStack) ? p.techStack : []),
        live_url: p.live_url || p.liveUrl || null,
        github_url: p.github_url || p.githubUrl || null,
        featured: !!p.featured,
        sort_order: Number.isFinite(p.sort_order) ? p.sort_order : (Number.isFinite(p.sortOrder) ? p.sortOrder : 0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      batch.set(docRef, payload, { merge: true });
    });

    await batch.commit();
    setFormMessage('Seeding complete. Refreshing projects...');
    await refreshProjects();
  } catch (error) {
    setFormMessage(error.message || 'Seeding failed.', true);
  }
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
    const docPayload = {
      ...payload,
      ...(rowId ? {} : { created_at: new Date().toISOString() })
    };

    await firebaseDb.collection('projects').doc(docId).set(docPayload, { merge: true });

    setFormMessage('Project saved.');
    clearProjectForm();
    await refreshProjects();
  } catch (error) {
    setFormMessage(error.message || 'Unable to save project.', true);
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();
  if (!firebaseReady || !firebaseAuth) {
    setAuthStatus('Firebase is not ready. Please verify config.js.');
    setFormMessage('Firebase is not ready. Please verify config.js.', true);
    return;
  }

  const email = (($('#adminEmail') || {}).value || '').trim();
  const password = ($('#adminPassword') || {}).value || '';

  if (email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    const msg = `Only the configured owner email (${OWNER_EMAIL}) can access admin.`;
    setAuthStatus(msg);
    setFormMessage(msg, true);
    return;
  }

  try {
    setAuthStatus('Signing in...');
    await firebaseAuth.signInWithEmailAndPassword(email, password);
    setAuthStatus('Signed in successfully.');
    setFormMessage('Signed in successfully.');
    await refreshProjects();
    if (isOwnerLoggedIn()) await ensureSeedProjects();
  } catch (error) {
    console.error('Admin login error:', error);
    let errorMsg = error.message || 'Sign in failed.';
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errorMsg = 'Incorrect password or credentials. If you forgot your password, click "Reset Password" below.';
    } else if (error.code === 'auth/user-not-found') {
      errorMsg = `User account not found for ${email}. Please create this user in Firebase Console -> Authentication -> Users.`;
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMsg = 'Email/Password sign-in method is disabled in Firebase. Enable it in Firebase Console -> Authentication -> Sign-in method.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMsg = 'Access blocked due to multiple failed login attempts. Please wait a few minutes or click "Reset Password".';
    } else if (error.code === 'auth/network-request-failed') {
      errorMsg = 'Network connection failed. Please check your internet connection or ad-blocker.';
    }
    setAuthStatus(errorMsg);
    setFormMessage(errorMsg, true);
  }
}

async function handlePasswordReset() {
  if (!firebaseReady || !firebaseAuth) {
    setAuthStatus('Firebase is not ready. Please verify config.js.');
    return;
  }
  const email = (($('#adminEmail') || {}).value || OWNER_EMAIL || '').trim();
  if (!email) {
    setAuthStatus('Please enter your owner email to send password reset link.');
    return;
  }
  try {
    setAuthStatus(`Sending password reset email to ${email}...`);
    await firebaseAuth.sendPasswordResetEmail(email);
    setAuthStatus(`Password reset link sent to ${email}! Check your inbox and spam folder.`);
    setFormMessage(`Password reset link sent to ${email}! Check your inbox.`);
  } catch (error) {
    console.error('Password reset error:', error);
    let msg = error.message || 'Unable to send password reset email.';
    if (error.code === 'auth/user-not-found') {
      msg = `No Firebase user found for ${email}. Please create the user in Firebase Console first.`;
    }
    setAuthStatus(msg);
    setFormMessage(msg, true);
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

function initAdminTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabPanels = document.querySelectorAll('.admin-tab-panel');
  if (!tabBtns.length) return;

  function switchTab(targetId) {
    tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === targetId));
    tabPanels.forEach((p) => p.classList.toggle('active', p.id === targetId));
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Support contextual links across tabs: e.g. <a href="#" data-admin-tab-link="assetsTab">
  document.querySelectorAll('[data-admin-tab-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-admin-tab-link');
      if (targetId) {
        switchTab(targetId);
        const panel = document.getElementById(targetId);
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function fillSiteContentForm(content) {
  const safe = deepMerge(DEFAULT_SITE_CONTENT, content || {});

  // TAB 2: Photos & Assets
  ($('#heroImageUrl') || {}).value = safe.hero.imageUrl || '';
  ($('#heroImageAlt') || {}).value = safe.hero.imageAlt || '';
  ($('#aboutImageUrl') || {}).value = safe.about.imageUrl || '';
  ($('#aboutImageAlt') || {}).value = safe.about.imageAlt || '';
  ($('#siteLogoUrl') || {}).value = safe.brand.logoUrl || '';
  ($('#brandResumeUrl') || {}).value = safe.brand.resumeUrl || '';
  ($('#brandResumeFileName') || {}).value = safe.brand.resumeFileName || '';

  const heroImg = $('#heroAssetPreviewImg');
  if (heroImg) heroImg.src = safe.hero.imageUrl || 'assets/images/profile.jpeg';
  const aboutImg = $('#aboutAssetPreviewImg');
  if (aboutImg) aboutImg.src = safe.about.imageUrl || 'assets/images/about.jpeg';
  const logoImg = $('#logoAssetPreviewImg');
  if (logoImg) logoImg.src = safe.brand.logoUrl || 'assets/images/logo1.png';

  const resumeLink = $('#resumeDocPreviewLink');
  const resumeName = $('#resumeDocPreviewName');
  if (resumeLink) {
    resumeLink.href = safe.brand.resumeUrl || 'assets/resume/VikashThyadi_Resume.pdf';
  }
  if (resumeName) {
    resumeName.textContent = safe.brand.resumeFileName || (safe.brand.resumeUrl ? safe.brand.resumeUrl.split('/').pop().split('?')[0] : 'VikashThyadi_Resume.pdf');
  }

  // TAB 3: Website Content
  ($('#heroLabelInput') || {}).value = safe.hero.label || '';
  ($('#heroTitleLine1Input') || {}).value = safe.hero.titleLine1 || '';
  ($('#heroTitleLine2Input') || {}).value = safe.hero.titleLine2 || '';
  ($('#heroSubtitleInput') || {}).value = safe.hero.subtitle || '';
  ($('#heroPrimaryButtonText') || {}).value = safe.hero.primaryButtonText || '';
  ($('#heroSecondaryButtonText') || {}).value = safe.hero.secondaryButtonText || '';
  ($('#heroScrollCueText') || {}).value = safe.hero.scrollCueText || '';

  ($('#aboutSectionLabelInput') || {}).value = safe.about.sectionLabel || '';
  ($('#aboutHeadingLine1Input') || {}).value = safe.about.headingLine1 || '';
  ($('#aboutHeadingLine2Input') || {}).value = safe.about.headingLine2 || '';
  ($('#aboutBioInput') || {}).value = safe.about.bio || '';

  // Populate dynamic milestone cards (no JSON required)
  renderEducationItems(safe.about.educationItems || []);

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
  ($('#contactRecipientEmail') || {}).value = safe.contact.recipientEmail || '';
  ($('#contactInstagramText') || {}).value = safe.contact.instagramText || '';
  ($('#contactInstagramUrl') || {}).value = safe.contact.instagramUrl || '';
  ($('#contactGithubText') || {}).value = safe.contact.githubText || '';
  ($('#contactGithubUrl') || {}).value = safe.contact.githubUrl || '';
  ($('#contactLinkedinText') || {}).value = safe.contact.linkedinText || '';
  ($('#contactLinkedinUrl') || {}).value = safe.contact.linkedinUrl || '';

  ($('#navHomeText') || {}).value = safe.navbar.homeLabel || '';
  ($('#navProjectsText') || {}).value = safe.navbar.projectsLabel || '';
  ($('#navContactText') || {}).value = safe.navbar.contactLabel || '';

  ($('#archiveSectionLabelInput') || {}).value = safe.projectsPage.sectionLabel || '';
  ($('#archiveTitleLine1Input') || {}).value = safe.projectsPage.titleLine1 || '';
  ($('#archiveTitleLine2Input') || {}).value = safe.projectsPage.titleLine2 || '';
  ($('#archiveSubtitleInput') || {}).value = safe.projectsPage.subtitle || '';

  ($('#footerCopyright') || {}).value = safe.footer.copyright || '';
  ($('#footerBackToTopText') || {}).value = safe.footer.backToTopLabel || '';

  // TAB 4: Settings & SEO
  ($('#siteName') || {}).value = safe.brand.name || '';
  ($('#seoHomeTitle') || {}).value = safe.seo.homeTitle || '';
  ($('#seoProjectsTitle') || {}).value = safe.seo.projectsTitle || '';
  ($('#seoDetailTitleTemplate') || {}).value = safe.seo.detailTitleTemplate || '{project} — Vikash Thyadi';
  ($('#seoDescription') || {}).value = safe.seo.description || '';
  ($('#seoThemeColor') || {}).value = safe.seo.themeColor || '#2A2529';
  ($('#seoFaviconEmoji') || {}).value = safe.seo.faviconEmoji || '⚡';

  ($('#siteRawJson') || {}).value = '';
  siteRawJsonBaseline = '';
}

async function saveSiteContentToFirestore(updatedContent) {
  if (!firebaseReady || !isOwnerLoggedIn() || !firebaseDb) {
    throw new Error('You must be signed in as owner.');
  }

  siteContentState = deepMerge(DEFAULT_SITE_CONTENT, updatedContent);

  await firebaseDb.collection('site_content').doc(SITE_CONTENT_DOC_ID).set({
    content: siteContentState,
    updated_at: new Date().toISOString()
  }, { merge: true });

  try {
    localStorage.setItem(SITE_CONTENT_SYNC_KEY, JSON.stringify({
      updatedAt: new Date().toISOString(),
      content: siteContentState
    }));
  } catch (_error) {
    // Ignore storage sync failures; Firestore remains the source of truth.
  }

  fillSiteContentForm(siteContentState);
  return siteContentState;
}

async function handleAssetsSave(event) {
  event.preventDefault();
  if (!firebaseReady || !isOwnerLoggedIn() || !firebaseDb) {
    setAssetsMessage('You must be signed in as owner.', true);
    return;
  }

  try {
    const heroImgVal = String((($('#heroImageUrl') || {}).value || '')).trim();
    const heroAltVal = String((($('#heroImageAlt') || {}).value || '')).trim();
    const aboutImgVal = String((($('#aboutImageUrl') || {}).value || '')).trim();
    const aboutAltVal = String((($('#aboutImageAlt') || {}).value || '')).trim();
    const logoUrlVal = String((($('#siteLogoUrl') || {}).value || '')).trim();
    const resumeUrlVal = String((($('#brandResumeUrl') || {}).value || '')).trim();
    const resumeFileNameVal = String((($('#brandResumeFileName') || {}).value || '')).trim();

    const patch = {
      hero: {
        imageUrl: heroImgVal || siteContentState.hero?.imageUrl || DEFAULT_SITE_CONTENT.hero.imageUrl,
        imageAlt: heroAltVal || siteContentState.hero?.imageAlt || DEFAULT_SITE_CONTENT.hero.imageAlt
      },
      about: {
        imageUrl: aboutImgVal || siteContentState.about?.imageUrl || DEFAULT_SITE_CONTENT.about.imageUrl,
        imageAlt: aboutAltVal || siteContentState.about?.imageAlt || DEFAULT_SITE_CONTENT.about.imageAlt
      },
      brand: {
        logoUrl: logoUrlVal || siteContentState.brand?.logoUrl || DEFAULT_SITE_CONTENT.brand.logoUrl,
        resumeUrl: resumeUrlVal || siteContentState.brand?.resumeUrl || DEFAULT_SITE_CONTENT.brand.resumeUrl,
        resumeFileName: resumeFileNameVal || siteContentState.brand?.resumeFileName || DEFAULT_SITE_CONTENT.brand.resumeFileName
      }
    };

    const updated = deepMerge(siteContentState, patch);
    await saveSiteContentToFirestore(updated);
    setAssetsMessage('✓ Photos and assets saved! Changes are live on your portfolio.');
  } catch (error) {
    setAssetsMessage(error.message || 'Unable to save photos/assets.', true);
  }
}

async function handleSiteContentSave(event) {
  event.preventDefault();
  if (!firebaseReady || !isOwnerLoggedIn() || !firebaseDb) {
    setSiteMessage('You must be signed in as owner.', true);
    return;
  }

  try {
    const heroImgVal = String((($('#heroImageUrl') || {}).value || '')).trim();
    const heroAltVal = String((($('#heroImageAlt') || {}).value || '')).trim();
    const aboutImgVal = String((($('#aboutImageUrl') || {}).value || '')).trim();
    const aboutAltVal = String((($('#aboutImageAlt') || {}).value || '')).trim();
    const logoUrlVal = String((($('#siteLogoUrl') || {}).value || '')).trim();
    const resumeUrlVal = String((($('#brandResumeUrl') || {}).value || '')).trim();
    const resumeFileNameVal = String((($('#brandResumeFileName') || {}).value || '')).trim();

    const patch = {
      hero: {
        label: String((($('#heroLabelInput') || {}).value || '')).trim(),
        titleLine1: String((($('#heroTitleLine1Input') || {}).value || '')).trim(),
        titleLine2: String((($('#heroTitleLine2Input') || {}).value || '')).trim(),
        subtitle: String((($('#heroSubtitleInput') || {}).value || '')).trim(),
        primaryButtonText: String((($('#heroPrimaryButtonText') || {}).value || '')).trim(),
        secondaryButtonText: String((($('#heroSecondaryButtonText') || {}).value || '')).trim(),
        scrollCueText: String((($('#heroScrollCueText') || {}).value || '')).trim(),
        imageUrl: heroImgVal || siteContentState.hero?.imageUrl || DEFAULT_SITE_CONTENT.hero.imageUrl,
        imageAlt: heroAltVal || siteContentState.hero?.imageAlt || DEFAULT_SITE_CONTENT.hero.imageAlt
      },
      about: {
        sectionLabel: String((($('#aboutSectionLabelInput') || {}).value || '')).trim(),
        headingLine1: String((($('#aboutHeadingLine1Input') || {}).value || '')).trim(),
        headingLine2: String((($('#aboutHeadingLine2Input') || {}).value || '')).trim(),
        bio: String((($('#aboutBioInput') || {}).value || '')).trim(),
        educationItems: getEducationItemsFromDOM(),
        imageUrl: aboutImgVal || siteContentState.about?.imageUrl || DEFAULT_SITE_CONTENT.about.imageUrl,
        imageAlt: aboutAltVal || siteContentState.about?.imageAlt || DEFAULT_SITE_CONTENT.about.imageAlt
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
        recipientEmail: String((($('#contactRecipientEmail') || {}).value || '')).trim(),
        instagramText: String((($('#contactInstagramText') || {}).value || '')).trim(),
        instagramUrl: String((($('#contactInstagramUrl') || {}).value || '')).trim(),
        githubText: String((($('#contactGithubText') || {}).value || '')).trim(),
        githubUrl: String((($('#contactGithubUrl') || {}).value || '')).trim(),
        linkedinText: String((($('#contactLinkedinText') || {}).value || '')).trim(),
        linkedinUrl: String((($('#contactLinkedinUrl') || {}).value || '')).trim()
      },
      brand: {
        name: siteContentState.brand?.name || DEFAULT_SITE_CONTENT.brand.name,
        logoUrl: logoUrlVal || siteContentState.brand?.logoUrl || DEFAULT_SITE_CONTENT.brand.logoUrl,
        resumeUrl: resumeUrlVal || siteContentState.brand?.resumeUrl || DEFAULT_SITE_CONTENT.brand.resumeUrl,
        resumeFileName: resumeFileNameVal || siteContentState.brand?.resumeFileName || DEFAULT_SITE_CONTENT.brand.resumeFileName
      },
      navbar: {
        homeLabel: String((($('#navHomeText') || {}).value || '')).trim(),
        projectsLabel: String((($('#navProjectsText') || {}).value || '')).trim(),
        contactLabel: String((($('#navContactText') || {}).value || '')).trim()
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

    const updated = deepMerge(siteContentState, patch);
    await saveSiteContentToFirestore(updated);
    setSiteMessage('✓ Website content saved! Changes are live on your portfolio.');
  } catch (error) {
    setSiteMessage(error.message || 'Unable to save site content.', true);
  }
}

async function handleSeoSave(event) {
  event.preventDefault();
  if (!firebaseReady || !isOwnerLoggedIn() || !firebaseDb) {
    setSeoMessage('You must be signed in as owner.', true);
    return;
  }

  try {
    let patch = {
      brand: {
        name: String((($('#siteName') || {}).value || '')).trim()
      },
      seo: {
        homeTitle: String((($('#seoHomeTitle') || {}).value || '')).trim(),
        projectsTitle: String((($('#seoProjectsTitle') || {}).value || '')).trim(),
        detailTitleTemplate: String((($('#seoDetailTitleTemplate') || {}).value || '')).trim(),
        description: String((($('#seoDescription') || {}).value || '')).trim(),
        themeColor: String((($('#seoThemeColor') || {}).value || '')).trim() || '#2A2529',
        faviconEmoji: String((($('#seoFaviconEmoji') || {}).value || '')).trim() || '⚡'
      }
    };

    const raw = String((($('#siteRawJson') || {}).value || '')).trim();
    if (raw && raw !== siteRawJsonBaseline.trim()) {
      try {
        const rawObj = JSON.parse(raw);
        patch = deepMerge(patch, rawObj);
      } catch (_err) {
        setSeoMessage('Advanced JSON Override contains invalid JSON.', true);
        return;
      }
    }

    const updated = deepMerge(siteContentState, patch);
    await saveSiteContentToFirestore(updated);
    setSeoMessage('✓ SEO & Appearance settings saved! Changes are live.');
  } catch (error) {
    setSeoMessage(error.message || 'Unable to save SEO settings.', true);
  }
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
    } else {
      siteContentState = deepMerge(DEFAULT_SITE_CONTENT, {});
    }
    fillSiteContentForm(siteContentState);
    setSiteMessage('Website content loaded.');
  } catch (error) {
    setSiteMessage(`Unable to load site content (${error.message}).`, true);
    fillSiteContentForm(siteContentState);
  }
}

async function seedDatabaseWithProjects() {
  console.log('Seeding database with projects...');
  if (!firebaseDb) {
    console.error('Firestore database is not initialized.');
    return;
  }
  if (!PROJECT_SEED || PROJECT_SEED.length === 0) {
    console.error('No projects found in PROJECT_SEED.');
    return;
  }

  const projectsCollection = firebaseDb.collection('projects');
  const promises = PROJECT_SEED.map(project => {
    const slug = project.slug || makeSlug(project.title || 'project');
    const docRef = projectsCollection.doc(slug);
    return docRef.set(project, { merge: true });
  });

  try {
    await Promise.all(promises);
    console.log('All projects have been seeded successfully.');
    alert('Successfully seeded database with local project data.');
  } catch (error) {
    console.error('Error seeding projects: ', error);
    alert('Error seeding projects. Check the console for details.');
  }
}

// Make the function globally accessible for manual triggering
window.seedDatabaseWithProjects = seedDatabaseWithProjects;

function setupEvents() {
  const loginForm = $('#adminLoginForm');
  const signOutBtn = $('#adminSignOutBtn');
  const forgotBtn = $('#adminForgotBtn');
  const projectForm = $('#projectForm');
  const clearBtn = $('#clearProjectForm');
  const titleField = $('#projectTitle');
  const slugField = $('#projectSlug');
  const siteForm = $('#siteContentForm');
  const assetsForm = $('#siteAssetsForm');
  const seoForm = $('#seoSettingsForm');
  const reloadSiteBtn = $('#reloadSiteContentBtn');
  const addEducationBtn = $('#addEducationItemBtn');

  initAdminTabs();

  // Pre-fill owner email if available and empty
  const emailInput = $('#adminEmail');
  if (emailInput && !emailInput.value && OWNER_EMAIL) {
    emailInput.value = OWNER_EMAIL;
  }

  if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);
  if (signOutBtn) signOutBtn.addEventListener('click', handleAdminSignOut);
  if (forgotBtn) forgotBtn.addEventListener('click', handlePasswordReset);
  if (projectForm) projectForm.addEventListener('submit', handleProjectSave);
  if (clearBtn) clearBtn.addEventListener('click', clearProjectForm);
  if (assetsForm) assetsForm.addEventListener('submit', handleAssetsSave);
  if (siteForm) siteForm.addEventListener('submit', handleSiteContentSave);
  if (seoForm) seoForm.addEventListener('submit', handleSeoSave);

  if (addEducationBtn) {
    addEducationBtn.addEventListener('click', () => {
      const container = $('#educationItemsContainer');
      if (!container) return;
      const count = container.querySelectorAll('.admin-exp-card').length;
      const card = createEducationItemCard({ year: '', title: '', detail: '' }, count);
      container.appendChild(card);
      card.querySelector('.exp-year-input')?.focus();
    });
  }

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

  // Setup Projects Tab dropzones
  setupAssetDropTarget(
    '[data-asset-dropzone="thumbnail"]',
    '#thumbnailDropzone',
    '#projectThumbnail',
    '#thumbnailFileInput',
    '#thumbnailDropzoneStatus',
    'thumbnail'
  );
  setupAssetDropTarget(
    '[data-asset-dropzone="screenshots"]',
    '#screenshotsDropzone',
    '#projectScreenshots',
    '#screenshotsFileInput',
    '#screenshotsDropzoneStatus',
    'screenshots'
  );

  // Setup Standalone Photos & Assets Tab dropzones
  setupAssetCardDropzone({
    dropzoneSelector: '#heroAssetDropzone',
    fileInputSelector: '#heroAssetFileInput',
    statusSelector: '#heroAssetDropzoneStatus',
    inputSelector: '#heroImageUrl',
    previewImgSelector: '#heroAssetPreviewImg',
    kind: 'hero'
  });

  setupAssetCardDropzone({
    dropzoneSelector: '#aboutAssetDropzone',
    fileInputSelector: '#aboutAssetFileInput',
    statusSelector: '#aboutAssetDropzoneStatus',
    inputSelector: '#aboutImageUrl',
    previewImgSelector: '#aboutAssetPreviewImg',
    kind: 'about'
  });

  setupAssetCardDropzone({
    dropzoneSelector: '#logoAssetDropzone',
    fileInputSelector: '#logoAssetFileInput',
    statusSelector: '#logoAssetDropzoneStatus',
    inputSelector: '#siteLogoUrl',
    previewImgSelector: '#logoAssetPreviewImg',
    kind: 'logo'
  });

  setupAssetCardDropzone({
    dropzoneSelector: '#resumeAssetDropzone',
    fileInputSelector: '#resumeAssetFileInput',
    statusSelector: '#resumeAssetDropzoneStatus',
    inputSelector: '#brandResumeUrl',
    previewDocNameSelector: '#resumeDocPreviewName',
    previewDocLinkSelector: '#resumeDocPreviewLink',
    fileNameInputSelector: '#brandResumeFileName',
    kind: 'resume'
  });

  initCloudinaryUI();
  initAiConfigUI();
  setupKnowledgeBaseExporter();
}

function buildLiveAdminKnowledgeBase() {
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
    : (PROJECT_SEED || []);

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
    projects: projects.map(p => ({
      id: p.id || p.slug,
      slug: p.slug,
      title: p.title,
      role: p.role,
      year: p.year,
      category: p.categoryLabel || (CATEGORY_LABELS[p.category] || p.category),
      tech: Array.isArray(p.tech) ? p.tech : (typeof p.tech === 'string' ? p.tech.split(',').map(s => s.trim()) : []),
      shortDescription: p.shortDescription || (p.description ? p.description.slice(0, 120) + '…' : ''),
      description: p.description || '',
      liveUrl: p.liveUrl || null,
      githubUrl: p.githubUrl || null,
      featured: !!p.featured
    })),
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

function triggerFileDownload(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function setupKnowledgeBaseExporter() {
  const jsonBtn = $('#exportKbJsonBtn');
  const mdBtn = $('#exportKbMdBtn');
  const copyBtn = $('#copyKbBtn');
  const msgEl = $('#exportKbMessage');

  function showMsg(text, isError = false) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.style.color = isError ? '#d94000' : '#2e7d32';
    setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 4000);
  }

  if (jsonBtn) {
    jsonBtn.addEventListener('click', () => {
      try {
        const kb = buildLiveAdminKnowledgeBase();
        triggerFileDownload(JSON.stringify(kb, null, 2), 'knowledge-base.json', 'application/json');
        showMsg('✓ Downloaded knowledge-base.json!');
      } catch (err) {
        showMsg(`✗ Error exporting: ${err.message}`, true);
      }
    });
  }

  if (mdBtn) {
    mdBtn.addEventListener('click', () => {
      try {
        const kb = buildLiveAdminKnowledgeBase();
        let md = `# ${kb.identity.name} — Live Portfolio Knowledge Base\n\n`;
        md += `## 1. Profile & Bio\n`;
        md += `- **Name**: ${kb.identity.name}\n`;
        md += `- **Title**: ${kb.identity.label}\n`;
        md += `- **Location**: ${kb.identity.location}\n`;
        md += `- **Bio**: ${kb.identity.bio}\n\n`;

        md += `## 2. Education & Milestones\n`;
        kb.education.forEach((item, idx) => {
          md += `### ${idx + 1}. ${item.year || 'Period'}: ${item.title || 'Milestone'}\n`;
          md += `${(item.detail || '').replace(/<br\s*\/?>/gi, '\n')}\n\n`;
        });

        md += `## 3. Skills & Technologies\n`;
        md += `${kb.skills.join(', ')}\n\n`;

        md += `## 4. Projects Directory (${kb.projects.length} Projects)\n`;
        kb.projects.forEach((p, idx) => {
          md += `### ${idx + 1}. ${p.title} (${p.year || ''}) — ${p.role || ''}\n`;
          md += `- **Category**: ${p.category}\n`;
          md += `- **Tech Stack**: ${p.tech.join(', ')}\n`;
          if (p.githubUrl) md += `- **GitHub**: ${p.githubUrl}\n`;
          if (p.liveUrl) md += `- **Live Site**: ${p.liveUrl}\n`;
          md += `- **Description**: ${p.shortDescription || p.description}\n\n`;
        });

        md += `## 5. Resume & Contact\n`;
        md += `- **Resume URL**: ${kb.resume.url} (${kb.resume.fileName})\n`;
        md += `- **Email**: ${kb.contact.email}\n`;
        md += `- **LinkedIn**: ${kb.contact.linkedin}\n`;
        md += `- **GitHub**: ${kb.contact.github}\n`;
        md += `- **Instagram**: ${kb.contact.instagram}\n`;

        triggerFileDownload(md, 'knowledge-base.md', 'text/markdown');
        showMsg('✓ Downloaded knowledge-base.md!');
      } catch (err) {
        showMsg(`✗ Error exporting: ${err.message}`, true);
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        const kb = buildLiveAdminKnowledgeBase();
        const text = JSON.stringify(kb, null, 2);
        await navigator.clipboard.writeText(text);
        showMsg('✓ Copied RAG context to clipboard!');
      } catch (err) {
        showMsg(`✗ Copy failed: ${err.message}`, true);
      }
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
    if (isOwnerLoggedIn()) await ensureSeedProjects();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAdmin().catch(console.error);
  });
} else {
  initAdmin().catch(console.error);
}

// Prevent browser from navigating to dropped file when dropped outside targets
window.addEventListener('dragover', (e) => {
  if (e.dataTransfer?.types?.includes('Files')) {
    e.preventDefault();
  }
});
window.addEventListener('drop', (e) => {
  if (e.dataTransfer?.types?.includes('Files')) {
    e.preventDefault();
  }
});
