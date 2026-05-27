import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import admin from 'firebase-admin';

const DEFAULT_PROJECTS_FILE = 'supabase-projects.json';
const DEFAULT_SITE_CONTENT_FILE = 'supabase-site-content.json';
const SITE_CONTENT_DOC_ID = 'portfolio_site';
const OWNER_EMAIL = 'vikashthyadi1104@gmail.com';

function printUsage() {
  console.log(`
Usage:
  node scripts/migrate-supabase-to-firestore.mjs --projects <file> --site-content <file> [--service-account <file>] [--project-id <id>] [--dry-run]

Examples:
  node scripts/migrate-supabase-to-firestore.mjs --projects .\\exports\\projects.json --site-content .\\exports\\site-content.json --service-account .\\firebase-service-account.json
  node scripts/migrate-supabase-to-firestore.mjs --projects .\\exports\\projects.json --site-content .\\exports\\site-content.json --dry-run
`);
}

function parseArgs(argv) {
  const args = {
    projects: DEFAULT_PROJECTS_FILE,
    siteContent: DEFAULT_SITE_CONTENT_FILE,
    serviceAccount: '',
    projectId: '',
    dryRun: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--projects' && next) {
      args.projects = next;
      index += 1;
      continue;
    }

    if (token === '--site-content' && next) {
      args.siteContent = next;
      index += 1;
      continue;
    }

    if (token === '--service-account' && next) {
      args.serviceAccount = next;
      index += 1;
      continue;
    }

    if (token === '--project-id' && next) {
      args.projectId = next;
      index += 1;
      continue;
    }

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--help' || token === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return args;
}

async function readJsonFile(filePath) {
  const fileContent = await fs.readFile(filePath, 'utf8');
  return JSON.parse(fileContent);
}

function makeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/) 
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toStringOrNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeDate(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value?.toMillis === 'function') return new Date(value.toMillis()).toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function normalizeProjectRow(row) {
  const categories = Array.isArray(row.categories)
    ? toArray(row.categories)
    : row.category
      ? [String(row.category).trim()]
      : [];

  const slug = String(row.slug || row.id || makeSlug(row.title || '')).trim();
  const createdAt = normalizeDate(row.created_at || row.createdAt);
  const updatedAt = normalizeDate(row.updated_at || row.updatedAt || createdAt);

  return {
    slug,
    title: String(row.title || '').trim(),
    category: categories[0] || String(row.category || 'web').trim() || 'web',
    categories,
    year: Number.isFinite(Number(row.year)) ? Number(row.year) : null,
    role: String(row.role || '').trim(),
    thumbnail_url: toStringOrNull(row.thumbnail_url || row.thumbnailUrl) || 'assets/images/project-1.png',
    screenshot_urls: toArray(row.screenshot_urls || row.screenshotUrls),
    description_html: String(row.description_html || row.descriptionHtml || '').trim(),
    tech_stack: toArray(row.tech_stack || row.techStack),
    live_url: toStringOrNull(row.live_url || row.liveUrl),
    github_url: toStringOrNull(row.github_url || row.githubUrl),
    featured: !!row.featured,
    sort_order: Number.isFinite(Number(row.sort_order || row.sortOrder)) ? Number(row.sort_order || row.sortOrder) : 0,
    created_at: createdAt,
    updated_at: updatedAt,
    owner_email: OWNER_EMAIL
  };
}

function normalizeSiteContent(source) {
  if (Array.isArray(source)) {
    const first = source[0] || {};
    return first.content || first;
  }

  if (source && typeof source === 'object') {
    return source.content || source;
  }

  return {};
}

function chunk(array, size) {
  const groups = [];
  for (let index = 0; index < array.length; index += size) {
    groups.push(array.slice(index, index + size));
  }
  return groups;
}

async function main() {
  const args = parseArgs(process.argv);
  const projectFile = path.resolve(process.cwd(), args.projects);
  const siteContentFile = path.resolve(process.cwd(), args.siteContent);

  if (args.dryRun) {
    console.log('Dry run enabled. No Firestore writes will be made.');
  }

  const projectsSource = await readJsonFile(projectFile);
  const siteContentSource = await readJsonFile(siteContentFile);

  const projects = Array.isArray(projectsSource)
    ? projectsSource.map(normalizeProjectRow).filter((project) => project.slug && project.title)
    : Array.isArray(projectsSource?.data)
      ? projectsSource.data.map(normalizeProjectRow).filter((project) => project.slug && project.title)
      : [];

  const siteContent = normalizeSiteContent(siteContentSource);

  if (!projects.length) {
    throw new Error(`No projects found in ${projectFile}`);
  }

  const hasServiceAccount = !!args.serviceAccount;
  const serviceAccountPath = hasServiceAccount ? path.resolve(process.cwd(), args.serviceAccount) : '';
  let firebaseCredentials = null;

  if (hasServiceAccount) {
    const rawServiceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf8'));
    firebaseCredentials = admin.credential.cert(rawServiceAccount);
  } else {
    firebaseCredentials = admin.credential.applicationDefault();
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: firebaseCredentials,
      projectId: args.projectId || process.env.FIREBASE_PROJECT_ID || undefined
    });
  }

  const firestore = admin.firestore();
  firestore.settings({ ignoreUndefinedProperties: true });

  console.log(`Loaded ${projects.length} project(s) from ${path.basename(projectFile)}`);
  console.log(`Loaded site content from ${path.basename(siteContentFile)}`);

  if (args.dryRun) {
    console.log('Sample project payload:', JSON.stringify(projects[0], null, 2));
    console.log('Site content keys:', Object.keys(siteContent));
    return;
  }

  const projectGroups = chunk(projects, 400);

  for (const group of projectGroups) {
    const batch = firestore.batch();

    for (const project of group) {
      const docRef = firestore.collection('projects').doc(project.slug);
      batch.set(docRef, project, { merge: true });
    }

    await batch.commit();
  }

  await firestore.collection('site_content').doc(SITE_CONTENT_DOC_ID).set(
    {
      content: siteContent,
      updated_at: new Date().toISOString()
    },
    { merge: true }
  );

  console.log(`Imported ${projects.length} project(s) into Firestore.`);
  console.log(`Updated site_content/${SITE_CONTENT_DOC_ID}.`);
  console.log('Migration complete.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
