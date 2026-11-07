import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const admin = readFileSync(new URL('../admin.js', import.meta.url), 'utf8');
const site = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
function block(source, start, end) { return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))); }
const card = values => ({ querySelector: selector => ({ value: values[selector] || '' }) });
let cards = [card({ '.exp-year-input': '2026', '.exp-title-input': 'Certificate', '.exp-detail-input': 'Completed course', '.exp-kind-input': 'certification', '.exp-certificate-input': 'https://example.com/certificate' })];
const list = { innerHTML: '' };
const lists = { '#aboutEducationList': { innerHTML: '' }, '#certificationList': list, '#experienceList': { innerHTML: '' }, '#achievementList': { innerHTML: '' } };
const context = vm.createContext({
  document: { querySelectorAll: () => cards },
  $: selector => lists[selector], observer: null, window: {},
  DEFAULT_SITE_CONTENT: { about: { educationItems: [{ title: 'Default' }] } },
  escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
});
vm.runInContext(readFileSync(new URL('../milestones.js', import.meta.url), 'utf8'), context);
vm.runInContext(block(admin, 'function getEducationItemsFromDOM()', 'function getSelectedCategories()'), context);
vm.runInContext(block(site, 'function renderAboutEducationItems(items)', 'function applySiteContent()'), context);
const entries = vm.runInContext('getEducationItemsFromDOM()', context);
assert.equal(entries[0].certificateUrl, 'https://example.com/certificate');
context.items = entries;
vm.runInContext('renderAboutEducationItems(items)', context);
assert.match(list.innerHTML, /<h4 class="education-item__title"><a href="https:\/\/example.com\/certificate"[^>]*>Certificate<\/a><\/h4>/);
assert.doesNotMatch(list.innerHTML, /View certificate|education-item__certificate/);
assert.match(list.innerHTML, /noopener noreferrer/);
cards = [card({ '.exp-title-input': 'Invalid', '.exp-certificate-input': 'javascript:alert(1)' })];
assert.throws(() => vm.runInContext('getEducationItemsFromDOM()', context), /Certificate links/);
context.items = [{ year: '<img>', title: '<script>', certificateUrl: 'javascript:alert(1)' }];
vm.runInContext('renderAboutEducationItems(items)', context);
assert.doesNotMatch(list.innerHTML, /<script>|href="javascript:/);
vm.runInContext('renderAboutEducationItems([])', context);
assert.match(list.innerHTML, /No entries published yet/);
context.items = ['education', 'certification', 'experience', 'achievement'].map((kind, i) => ({ kind, title: `Unique ${i}`, certificateUrl: `https://example.com/${i}` }));
vm.runInContext('renderAboutEducationItems(items)', context);
Object.values(lists).forEach((column, i) => {
  assert.match(column.innerHTML, new RegExp(`Unique ${i}`));
  assert.match(column.innerHTML, new RegExp(`href="https://example.com/${i}"`));
  assert.equal((column.innerHTML.match(/class="education-item__title"/g) || []).length, 1);
});
const normalize = context.window.PortfolioMilestones.normalize;
const legacy = [{ title: 'Professional Certifications', detail: 'Earned Certified System Administrator and Certified Application Developer. NPTEL Python for Data Science.' }];
const split = normalize(legacy);
assert.equal(split.length, 3);
assert.ok(split.every(item => item.kind === 'certification' && !item.certificateUrl));
assert.equal(normalize(split).length, 3, 'migration is idempotent');
assert.equal(normalize([{ ...legacy[0], certificateUrl: 'https://example.com/existing' }]).length, 1, 'preserve existing linked records');

Object.assign(context, {
  firebaseReady: true, isOwnerLoggedIn: () => true,
  siteContentState: { saved: 'original' },
  deepMerge: (a, b) => ({ ...a, ...b }),
  sanitizeSiteContentForFirestore: value => value,
  SITE_CONTENT_DOC_ID: 'test', SITE_CONTENT_SYNC_KEY: 'test',
  localStorage: { setItem() {} },
  fillSiteContentForm() { throw new Error('Saving must not reset other forms'); },
  firebaseDb: { collection: () => ({ doc: () => ({ set: async () => { throw new Error('offline'); } }) }) },
});
vm.runInContext(block(admin, 'async function saveSiteContentToFirestore(', 'async function handleAssetsSave('), context);
await assert.rejects(vm.runInContext('saveSiteContentToFirestore({saved: "new"})', context), /offline/);
assert.equal(context.siteContentState.saved, 'original');
context.firebaseDb = { collection: () => ({ doc: () => ({ set: async () => {} }) }) };
await vm.runInContext('saveSiteContentToFirestore({saved: "new"})', context);
assert.equal(context.siteContentState.saved, 'new');
console.log('Passed: certificate round trip, URL rejection, escaped titles, empty list, failed-save state, successful save without form reset.');
