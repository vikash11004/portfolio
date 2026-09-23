import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const parseFirestoreDoc = (fields) => {
  const res = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (v.stringValue !== undefined) res[k] = v.stringValue;
    else if (v.booleanValue !== undefined) res[k] = v.booleanValue;
    else if (v.integerValue !== undefined) res[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) res[k] = Number(v.doubleValue);
    else if (v.nullValue !== undefined) res[k] = null;
    else if (v.arrayValue !== undefined) {
      res[k] = (v.arrayValue.values || []).map(x => {
        if (x.stringValue !== undefined) return x.stringValue;
        if (x.mapValue !== undefined) return parseFirestoreDoc(x.mapValue.fields);
        return x;
      });
    }
    else if (v.mapValue !== undefined) res[k] = parseFirestoreDoc(v.mapValue.fields);
    else res[k] = v;
  }
  return res;
};

async function syncFallbackFiles() {
  console.log('Fetching live projects from Firestore...');
  const pRes = await fetch('https://firestore.googleapis.com/v1/projects/portfolio-d114e/databases/(default)/documents/projects');
  const pData = await pRes.json();
  const projects = (pData.documents || []).map(d => ({
    slug: d.name.split('/').pop(),
    ...parseFirestoreDoc(d.fields)
  }));
  projects.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));

  console.log(`Fetched ${projects.length} projects.`);

  console.log('Fetching live site_content from Firestore...');
  const sRes = await fetch('https://firestore.googleapis.com/v1/projects/portfolio-d114e/databases/(default)/documents/site_content/portfolio_site');
  const sData = await sRes.json();
  const siteContentDoc = parseFirestoreDoc(sData.fields);
  const liveContent = siteContentDoc.content;

  // 1. Update projects-data.js
  const projectsDataPath = path.join(rootDir, 'projects-data.js');
  const projectsDataContent = `window.PORTFOLIO_PROJECT_SEED = ${JSON.stringify(projects, null, 2)};\n`;
  fs.writeFileSync(projectsDataPath, projectsDataContent, 'utf-8');
  console.log('Updated projects-data.js successfully.');

  // 2. Update DEFAULT_SITE_CONTENT in script.js
  const scriptPath = path.join(rootDir, 'script.js');
  let scriptContent = fs.readFileSync(scriptPath, 'utf-8');

  const startMarker = 'const DEFAULT_SITE_CONTENT = {';
  const endMarker = 'let projectsState = [];';

  const startIndex = scriptContent.indexOf(startMarker);
  const endIndex = scriptContent.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1) {
    const formattedSiteContent = `const DEFAULT_SITE_CONTENT = ${JSON.stringify(liveContent, null, 2)};\n\n`;
    scriptContent = scriptContent.slice(0, startIndex) + formattedSiteContent + scriptContent.slice(endIndex);
    fs.writeFileSync(scriptPath, scriptContent, 'utf-8');
    console.log('Updated DEFAULT_SITE_CONTENT in script.js successfully.');
  } else {
    console.error('Could not find DEFAULT_SITE_CONTENT range in script.js');
  }

  // 3. Update knowledge-base.json with comprehensive master schema
  const kbJsonPath = path.join(rootDir, 'knowledge-base.json');
  const enrichedProjects = projects.map(p => ({
    slug: p.slug,
    title: p.title,
    role: p.role,
    year: p.year,
    category: p.category,
    categories: p.categories || [p.category],
    featured: !!p.featured,
    sort_order: p.sort_order ?? 99,
    short_description: p.short_description || (p.title + ' project'),
    tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack : (Array.isArray(p.tech) ? p.tech : []),
    live_url: p.live_url || null,
    github_url: p.github_url || null,
    thumbnail_url: p.thumbnail_url || 'assets/images/project-1.png',
    screenshot_urls: p.screenshot_urls || [],
    readme_markdown: (p.description_html || p.description || '').trim()
  }));

  const kbData = {
    identity: {
      name: liveContent?.brand?.name || 'Vikash Thyadi',
      label: liveContent?.hero?.label || 'Developer & Designer',
      title: `${liveContent?.hero?.titleLine1 || 'Vikash'} ${liveContent?.hero?.titleLine2 || 'Thyadi'}`,
      subtitle: liveContent?.hero?.subtitle || 'Highly motivated and curious engineering student.',
      bio: liveContent?.about?.bio || '',
      location: 'Andhra Pradesh, India',
      philosophy: "Great software should feel inevitable — intuitive, precise, and expressive. Every project combines the disciplined rigor of an engineer with the curiosity of a craftsman."
    },
    education_and_milestones: liveContent?.about?.educationItems || [],
    skills: liveContent?.skills?.items || [],
    site_architecture: {
      design_style: "Refined Brutalism",
      ai_assistant: "GVEN (Generative Virtual Extension of Vikash Thyadi) powered by Groq LLaMA 3.3 70B",
      media_storage: "Cloudinary (25GB Free Tier CDN)"
    },
    resume: {
      url: liveContent?.brand?.resumeUrl || 'https://res.cloudinary.com/ucebpoei/image/upload/v1790170808/portfolio/eibnyyt4dli6txy1pthf.pdf',
      fileName: liveContent?.brand?.resumeFileName || 'Vikash-Thyadi-Resume.pdf'
    },
    contact: liveContent?.contact || {},
    projects: enrichedProjects
  };
  fs.writeFileSync(kbJsonPath, JSON.stringify(kbData, null, 2), 'utf-8');
  console.log('Updated knowledge-base.json with comprehensive master schema.');

  // 4. Update knowledge-base.md with full READMEs
  const kbMdPath = path.join(rootDir, 'knowledge-base.md');
  let md = `# ${kbData.identity.name} — Complete Portfolio & Project Knowledge Base\n\n`;
  md += `> **Version**: 2.0 (Master Comprehensive Edition)\n`;
  md += `> **Author**: ${kbData.identity.name}\n`;
  md += `> **Role**: ${kbData.identity.label}\n`;
  md += `> **Location**: ${kbData.identity.location}\n\n`;
  md += `---\n\n`;
  md += `## 1. Profile & Bio\n`;
  md += `- **Name**: ${kbData.identity.name}\n`;
  md += `- **Title**: ${kbData.identity.label}\n`;
  md += `- **Location**: ${kbData.identity.location}\n`;
  md += `- **Bio**: ${kbData.identity.bio}\n\n`;

  md += `## 2. Education & Milestones\n`;
  (kbData.education_and_milestones || []).forEach((item, idx) => {
    md += `### ${idx + 1}. ${item.year || 'Period'}: ${item.title || 'Milestone'}\n`;
    md += `${(item.detail || '').replace(/<br\s*\/?>/gi, '\n')}\n\n`;
  });

  md += `## 3. Skills & Technologies\n`;
  md += `${(kbData.skills || []).join(', ')}\n\n`;

  md += `## 4. Resume & Contact\n`;
  md += `- **Resume URL**: ${kbData.resume.url} (${kbData.resume.fileName})\n`;
  md += `- **Email**: ${kbData.contact.recipientEmail || ''}\n`;
  md += `- **LinkedIn**: ${kbData.contact.linkedinUrl || 'https://www.linkedin.com/in/vikashthyadi/'}\n`;
  md += `- **GitHub**: ${kbData.contact.githubUrl || 'https://github.com/vikash11004'}\n`;
  md += `- **Instagram**: ${kbData.contact.instagramUrl || 'https://www.instagram.com/vikash.thyadi/'}\n\n`;

  md += `## 5. Comprehensive Projects Directory (${kbData.projects.length} Projects with Full READMEs)\n\n`;
  kbData.projects.forEach((p, idx) => {
    md += `---\n\n`;
    md += `### Project ${idx + 1}: ${p.title} (${p.year || ''}) — ${p.role || ''}\n\n`;
    md += `- **Slug**: \`${p.slug}\`\n`;
    md += `- **Category**: ${p.category}\n`;
    md += `- **Categories**: ${(p.categories || []).join(', ')}\n`;
    md += `- **Tech Stack**: ${(p.tech_stack || []).join(', ')}\n`;
    if (p.github_url) md += `- **GitHub**: [${p.github_url}](${p.github_url})\n`;
    if (p.live_url) md += `- **Live Site**: [${p.live_url}](${p.live_url})\n`;
    md += `- **Short Description**: ${p.short_description}\n\n`;
    md += `#### Complete Project README & Documentation (\`${p.slug}/README.md\`)\n\n`;
    md += (p.readme_markdown || 'No extended documentation available.') + `\n\n`;
  });

  fs.writeFileSync(kbMdPath, md, 'utf-8');
  console.log('Updated comprehensive knowledge-base.md successfully.');
}

syncFallbackFiles().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
