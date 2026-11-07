import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const seed = { window: {} };
vm.runInNewContext(await readFile(path.join(root, 'projects-data.js'), 'utf8'), seed);
const thumbnails = { xpenso: 'assets/projects/xpenso/thumbnail.png', finpath: 'assets/projects/finpath/1.png', 'resume-analyzer': 'assets/projects/resume/1.png' };
const projects = seed.window.PORTFOLIO_PROJECT_SEED.filter(p => thumbnails[p.slug]).map(p => ({ ...p, featured: true, thumbnail_url: thumbnails[p.slug], screenshot_urls: [], description_html: '<h2>Project overview</h2><p>Local visual test content.</p>' }));
assert.ok(projects.length >= 2);
const field = value => typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(field) } } : { stringValue: String(value ?? '') };
const server = createServer(async (req, res) => {
  const filename = decodeURIComponent(new URL(req.url, 'http://local').pathname).slice(1) || 'index.html';
  const file = path.resolve(root, filename);
  if (!file.startsWith(root) || filename.startsWith('.')) { res.writeHead(404).end(); return; }
  try {
    let content = await readFile(file);
    if (filename === 'login.html') content = content.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(content);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin)) return route.continue();
    if (url.includes('firestore.googleapis.com') && url.endsWith('/projects')) return route.fulfill({ json: { documents: projects.map(p => ({ name: `projects/local/documents/projects/${p.slug}`, fields: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, field(v)])) })) } });
    if (url.includes('/site_content/')) return route.fulfill({ json: { fields: {} } });
    return route.abort();
  });
  await page.goto(origin);
  await page.waitForFunction(() => document.querySelectorAll('#featuredGrid .project-card').length >= 2);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('16px "Cabinet Grotesk"') && document.fonts.check('16px "Stardom"')), true, 'Requested fonts load locally');
  assert.deepEqual(await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    return ['--ink', '--muted', '--highlight', '--paper'].map(name => css.getPropertyValue(name).trim());
  }), ['#11120d', '#565449', '#d8cfbc', '#fffbf4']);
  const resumeBtnStyle = await page.locator('#skillsResumeBtn').evaluate(el => {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, color: cs.color };
  });
  assert.notEqual(resumeBtnStyle.bg, resumeBtnStyle.color, 'Download resume button text must contrast with its background');
  assert.equal(resumeBtnStyle.color, 'rgb(255, 251, 244)', 'Download resume button text must be visible paper color');
  await page.waitForTimeout(1700);
  const out = process.env.SCREENSHOT_DIR || path.join(tmpdir(), 'portfolio-design');
  await mkdir(out, { recursive: true });
  for (const [width, height] of [[1440, 900], [1440, 700], [1920, 1080], [768, 1024], [390, 844], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Home overflow at ${width}`);
    const cta = await page.locator('#heroPrimaryBtn').boundingBox();
    assert.ok(cta.y + cta.height < height, `Hero action fits at ${width}`);
    assert.equal(await page.locator('#heroImage').evaluate(img => img.naturalWidth > 0), true);
    await page.screenshot({ path: path.join(out, `home-${width}-${height}.png`) });
    for (const id of ['about', 'experience', 'projects-preview', 'skills', 'contact']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${id} overflow at ${width}`);
      if (width === 1440 || width === 390) await page.locator(`#${id}`).screenshot({ path: path.join(out, `${id}-${width}.png`) });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#featuredCtaText').click();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('#page-projects').evaluate(el => el.classList.contains('active')), true);
  await page.screenshot({ path: path.join(out, 'projects.png') });
  await page.locator('#projectsGrid .project-card').first().click();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('#page-detail').evaluate(el => el.classList.contains('active')), true);
  await page.screenshot({ path: path.join(out, 'detail.png') });
  await page.evaluate(() => { location.hash = '#milestones/certification'; });
  await page.waitForTimeout(1000);
  assert.equal(await page.locator('#page-milestones').evaluate(el => el.classList.contains('active')), true);
  await page.screenshot({ path: path.join(out, 'certifications.png') });
  await page.goto(`${origin}/login.html`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(out, `login-${width}.png`), fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(origin);
  assert.equal(await page.locator('.hero__image').evaluate(el => getComputedStyle(el).animationName), 'none');
  assert.deepEqual(errors, []);
  console.log(`Passed: six home viewport sizes, hero/media visibility, all sections, project/archive routes, login and reduced motion. Screenshots: ${out}`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
