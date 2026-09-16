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

  // 3. Update knowledge-base.json
  const kbJsonPath = path.join(rootDir, 'knowledge-base.json');
  const kbData = {
    identity: {
      name: liveContent?.brand?.name || 'Vikash Thyadi',
      label: liveContent?.hero?.label || 'Developer & Designer',
      title: `${liveContent?.hero?.titleLine1 || 'Vikash'} ${liveContent?.hero?.titleLine2 || 'Thyadi'}`,
      subtitle: liveContent?.hero?.subtitle || '',
      bio: liveContent?.about?.bio || '',
      location: 'Andhra Pradesh, India'
    },
    education: liveContent?.about?.educationItems || [],
    skills: liveContent?.skills?.items || [],
    projects: projects.map(p => ({
      title: p.title,
      role: p.role,
      year: p.year,
      category: p.category,
      tech: p.tech,
      description: p.short_description || p.description,
      liveUrl: p.live_url || null,
      githubUrl: p.github_url || null,
      featured: !!p.featured
    })),
    resume: {
      url: liveContent?.brand?.resumeUrl || 'assets/resume/VikashThyadi_Resume.pdf',
      fileName: liveContent?.brand?.resumeFileName || 'Vikash-Thyadi-Resume.pdf'
    },
    contact: liveContent?.contact || {}
  };
  fs.writeFileSync(kbJsonPath, JSON.stringify(kbData, null, 2), 'utf-8');
  console.log('Updated knowledge-base.json successfully.');

  // 4. Update knowledge-base.md
  const kbMdPath = path.join(rootDir, 'knowledge-base.md');
  let md = `# ${kbData.identity.name} — Live Portfolio Knowledge Base\n\n`;
  md += `## 1. Profile & Bio\n- **Name**: ${kbData.identity.name}\n- **Title**: ${kbData.identity.label}\n- **Location**: ${kbData.identity.location}\n- **Bio**: ${kbData.identity.bio}\n\n`;
  md += `## 2. Education & Milestones\n`;
  (kbData.education || []).forEach((item, idx) => {
    md += `### ${idx + 1}. ${item.year || 'Period'}: ${item.title || 'Milestone'}\n${(item.detail || '').replace(/<br\s*\/?>/gi, '\n')}\n\n`;
  });
  md += `## 3. Skills & Technologies\n${(kbData.skills || []).join(', ')}\n\n`;
  md += `## 4. Projects Directory (${kbData.projects.length} Projects)\n`;
  kbData.projects.forEach((p, idx) => {
    md += `### ${idx + 1}. ${p.title} (${p.year || ''}) — ${p.role || ''}\n`;
    md += `- **Category**: ${p.category}\n- **Tech**: ${Array.isArray(p.tech) ? p.tech.join(', ') : p.tech}\n`;
    if (p.githubUrl) md += `- **GitHub**: ${p.githubUrl}\n`;
    if (p.liveUrl) md += `- **Live Site**: ${p.liveUrl}\n`;
    md += `- **Description**: ${p.description}\n\n`;
  });
  md += `## 5. Resume & Contact\n- **Resume**: ${kbData.resume.url}\n- **Email**: ${kbData.contact.recipientEmail || ''}\n`;
  fs.writeFileSync(kbMdPath, md, 'utf-8');
  console.log('Updated knowledge-base.md successfully.');
}

syncFallbackFiles().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
