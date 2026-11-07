import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Uses a local browser only; Firebase and all external requests are excluded.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const admin = await readFile(path.join(root, 'admin.js'), 'utf8');
const html = (await readFile(path.join(root, 'admin.html'), 'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const block = (start, end) => admin.slice(admin.indexOf(start), admin.indexOf(end, admin.indexOf(start)));
const server = createServer(async (req, res) => {
  try {
    const filename = new URL(req.url, 'http://localhost').pathname.slice(1) || 'admin.html';
    if (!/^[\w.-]+$/.test(filename)) { res.writeHead(404).end(); return; }
    const content = filename === 'admin.html' ? html : await readFile(path.join(root, filename));
    res.setHeader('Content-Type', filename.endsWith('.css') ? 'text/css' : filename.endsWith('.js') ? 'text/javascript' : 'text/html');
    res.end(content);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  await page.goto(origin);
  const countBefore = await page.locator('#siteContentForm input, #siteContentForm textarea, #siteContentForm select').count();
  await page.addScriptTag({ path: path.join(root, 'milestones.js') });
  await page.addScriptTag({ path: path.join(root, 'admin-workspace.js') });
  await page.addScriptTag({ content: `
    const $ = selector => document.querySelector(selector);
    function escapeHtml(value) { const node = document.createElement('span'); node.textContent = value; return node.innerHTML.replaceAll('"', '&quot;'); }
    ${block('function renderEducationItems(items)', 'function getSelectedCategories()')}
    ${block('function initAdminTabs()', 'function fillSiteContentForm(content)')}
    AdminWorkspace.init();
    initAdminTabs();
    document.querySelector('#adminPanel').hidden = false;
    document.querySelector('[data-tab="contentTab"]').click();
    const siteForm = $('#siteContentForm');
    siteForm.addEventListener('input', () => { siteForm.dataset.dirty = 'true'; });
    siteForm.addEventListener('submit', event => event.preventDefault());
    ${block("  document.querySelectorAll('[data-add-milestone]').forEach", '  if (reloadSiteBtn)')}
    siteForm.querySelectorAll('[required]').forEach(input => { input.value = 'Test content'; });
    renderEducationItems([
      { kind: 'education', title: 'B.Tech in Computer Science', year: '2023 - Present', featured: true },
      { kind: 'experience', title: 'Software engineering internship', featured: true },
      { kind: 'certification', title: 'ServiceNow Certified Application Developer', certificateUrl: 'https://example.com/verify/cad', featured: true },
      { kind: 'certification', title: 'Python for Data Science', featured: false },
      { kind: 'achievement', title: 'Hackathon finalist', featured: true }
    ]);
  ` });
  assert.equal(await page.locator('[data-content-pane]:visible').count(), 1);
  assert.equal(await page.locator('.content-workspace-nav button').count(), 9);
  assert.equal(await page.locator('#siteContentForm input:not([class^="exp-"]), #siteContentForm textarea:not([class^="exp-"]), #siteContentForm select:not([class^="exp-"]):not(.workspace-section-select)').count(), countBefore);
  const nav = key => page.locator(`.content-workspace-nav button[aria-controls="content-pane-${key}"]`);
  await nav('certification').click();
  assert.equal(await page.locator('[data-collection="certification"] .admin-exp-card').count(), 2);
  assert.match(await page.locator('[data-collection="certification"] .collection-count').innerText(), /2 entries \/ 1 featured/);
  const first = page.locator('[data-collection="certification"] .admin-exp-card').first();
  assert.equal(await first.locator('.exp-title-input').isVisible(), false, 'Entries start collapsed');
  await first.locator('summary').click();
  await first.locator('.exp-title-input').fill('Edited certification title');
  await nav('experience').click();
  await nav('certification').click();
  assert.equal(await first.locator('.exp-title-input').inputValue(), 'Edited certification title');
  assert.equal(await page.locator('.workspace-save-state').innerText(), 'Unsaved changes');
  await first.locator('.exp-down').click();
  assert.equal(await first.locator('.entry-title').innerText(), 'Python for Data Science');
  await page.locator('[data-collection="certification"] .admin-exp-card').last().locator('.exp-up').click();
  assert.equal(await first.locator('.entry-title').innerText(), 'Edited certification title');
  await first.locator('.exp-featured-input').uncheck();
  assert.match(await page.locator('[data-collection="certification"] .collection-count').innerText(), /0 featured/);
  await first.locator('.exp-kind-input').selectOption('achievement');
  assert.equal(await page.locator('[data-collection="achievement"] .admin-exp-card').count(), 2);
  assert.equal(await page.locator('[data-content-pane]:visible').getAttribute('data-content-pane'), 'achievement');
  assert.equal((await page.evaluate(() => getEducationItemsFromDOM())).length, 5);
  await page.locator('[data-add-milestone="achievement"]').click();
  const added = page.locator('[data-collection="achievement"] .admin-exp-card').last();
  assert.equal(await added.getAttribute('open'), '');
  await added.locator('.exp-title-input').fill('New award');
  assert.equal((await page.evaluate(() => getEducationItemsFromDOM())).length, 6);
  page.once('dialog', dialog => dialog.dismiss());
  await added.locator('.admin-exp-card__del-btn').click();
  assert.equal(await page.locator('[data-collection="achievement"] .admin-exp-card').count(), 3);
  page.once('dialog', dialog => dialog.accept());
  await added.locator('.admin-exp-card__del-btn').click();
  assert.equal(await page.locator('[data-collection="achievement"] .admin-exp-card').count(), 2);
  await page.evaluate(() => {
    document.querySelector('#heroLabelInput').value = '';
    document.querySelector('#skillsHeadingLine1Input').value = '';
    document.querySelector('#siteContentForm').requestSubmit();
  });
  assert.equal(await page.locator('[data-content-pane]:visible').getAttribute('data-content-pane'), 'hero');
  assert.equal(await page.locator('#heroLabelInput').evaluate(el => el === document.activeElement), true);
  await page.evaluate(() => {
    document.querySelectorAll('#siteContentForm [required]').forEach(el => { el.value ||= 'Test'; });
    const card = document.querySelector('[data-collection="education"] details');
    card.open = false;
    card.querySelector('.exp-title-input').value = '';
    document.querySelector('#siteContentForm').requestSubmit();
  });
  assert.equal(await page.locator('[data-content-pane]:visible').getAttribute('data-content-pane'), 'education');
  assert.equal(await page.locator('[data-collection="education"] details').getAttribute('open'), '');
  await page.locator('[data-collection="education"] .exp-title-input').fill('B.Tech in Computer Science & Engineering');
  const shots = process.env.SCREENSHOT_DIR || path.join(tmpdir(), 'portfolio-admin-workspace');
  await mkdir(shots, { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const showSection = key => width <= 900 ? page.locator('.workspace-section-select').selectOption(key) : nav(key).click();
    for (const key of ['education', 'certification', 'contact', 'navigation']) {
      await showSection(key);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No page overflow at ${width}px in ${key}`);
    }
    await showSection('education');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(shots, `admin-${width}.png`), fullPage: true });
  }
  await page.evaluate(() => { document.querySelector('#siteContentForm').dataset.dirty = 'false'; });
  await page.locator('.workspace-section-select').selectOption('certification');
  assert.equal(await page.locator('#siteContentForm').getAttribute('data-dirty'), 'false', 'Navigation alone is not an edit');
  await page.locator('.workspace-section-select').selectOption('education');
  await page.evaluate(() => renderEducationItems([]));
  assert.equal(await page.locator('[data-collection="education"] .collection-empty').isVisible(), true);
  assert.deepEqual(errors, []);
  console.log(`Passed: section isolation, preserved controls/drafts, ordering, category moves, featured state, add/remove, hidden-field validation, empty states and four responsive widths. Screenshots: ${shots}`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
