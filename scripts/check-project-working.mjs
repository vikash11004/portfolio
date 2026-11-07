import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const admin = readFileSync(new URL('../admin.js', import.meta.url), 'utf8');
const site = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const block = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const fields = new Map();
const field = selector => {
  if (!fields.has(selector)) fields.set(selector, { value: '', checked: false, dataset: {}, style: {}, scrollIntoView() {} });
  return fields.get(selector);
};
field('#projectForm').reset = () => { field('#projectWorking').checked = false; };
const context = vm.createContext({
  $: field, DEFAULT_THUMBNAIL: 'test.png', firebaseReady: true,
  parseUrlList: value => Array.isArray(value) ? value : [],
  parseCategoryList: value => value || ['web'], formatCategoryLabel: () => 'Web',
  setSelectedCategories() {}, getSelectedCategories: () => ['web'],
  setEditState() {}, setFormMessage() {}, updateThumbnailPreview() {},
  makeSlug: value => value.toLowerCase().replaceAll(' ', '-'),
  normalizeProjectDescriptionInput: value => value,
  escapeHtml: value => value, getProjectExcerpt: () => '', isOwnerLoggedIn: () => true,
});
vm.runInContext(block(admin, 'function mapProjectToViewModel(', 'async function loadProjects()'), context);
vm.runInContext(block(admin, 'function clearProjectForm()', 'async function refreshProjects()'), context);
vm.runInContext(block(site, 'function mapDbProjectToViewModel(', 'function makeSlug('), context);
vm.runInContext(block(site, 'function createProjectCard(', 'function getProjectExcerpt('), context);
vm.runInContext(block(admin, 'async function handleProjectSave(', 'async function handleAdminLogin('), context);
vm.runInContext(block(admin, 'async function updateProjectField(', 'async function handleProjectSave('), context);
vm.runInContext(block(admin, 'async function handleAdminListAction(', 'function renderAdminProjectsList('), context);

for (const value of [undefined, false, true, 'false']) {
  context.row = { title: 'Example', working: value };
  assert.equal(vm.runInContext("mapProjectToViewModel('example', row).working", context), value === true);
  assert.equal(vm.runInContext('mapDbProjectToViewModel(row).working', context), value === true);
}
context.project = { rowId: 'example', id: 'example', title: 'Example', working: true, description: 'Description' };
vm.runInContext('fillProjectForm(project)', context);
assert.equal(field('#projectWorking').checked, true);
let payload = vm.runInContext('getProjectPayloadFromForm()', context);
assert.equal(payload.working, true);
field('#projectWorking').checked = false;
assert.equal(vm.runInContext('getProjectPayloadFromForm().working', context), false);
context.project.working = undefined;
vm.runInContext('fillProjectForm(project)', context);
assert.equal(field('#projectWorking').checked, false, 'Legacy records do not inherit the previous editor state');
field('#projectWorking').checked = true;
vm.runInContext('clearProjectForm()', context);
assert.equal(field('#projectWorking').checked, false);

let saved;
let failSave = false;
let refreshes = 0;
context.firebaseDb = { collection: () => ({ doc: () => ({ set: async (data, options) => {
  if (failSave) throw new Error('Save failed');
  saved = { data, options };
} }) }) };
context.refreshProjects = async () => { refreshes++; };
context.event = { preventDefault() {} };
field('#projectWorking').checked = true;
await vm.runInContext('handleProjectSave(event)', context);
assert.equal(saved.data.working, true);
assert.equal(saved.options.merge, true);
assert.equal(refreshes, 1);
assert.equal(field('#projectWorking').checked, false, 'New-project form resets after save');

context.projectsState = [{ rowId: 'example', id: 'example', working: false }];
field('#projectRowId').value = 'example';
context.event = { currentTarget: { dataset: { action: 'working', id: 'example' }, disabled: false, setAttribute() {}, removeAttribute() {} } };
await vm.runInContext('handleAdminListAction(event)', context);
assert.equal(saved.data.working, true);
assert.equal(field('#projectWorking').checked, true, 'Quick action updates the matching open editor');
context.projectsState[0].working = true;
await vm.runInContext('handleAdminListAction(event)', context);
assert.equal(saved.data.working, false);
assert.equal(field('#projectWorking').checked, false);
failSave = true;
context.projectsState[0].working = false;
await vm.runInContext('handleAdminListAction(event)', context);
assert.equal(field('#projectWorking').checked, false, 'Failed save leaves status unchanged');
assert.equal(context.event.currentTarget.disabled, false, 'Failed save allows retry');

for (const working of [true, false, undefined]) {
  context.project = { ...context.project, working };
  const card = vm.runInContext('createProjectCard(project)', context);
  assert.equal(card.includes('project-working-badge'), working === true);
}
assert.match(site, /\$\('#detailWorking'\)\.hidden = project\.working !== true/);
console.log('Passed: working status defaults, editor round trip/reset, save payload, quick toggle on/off, failed-save recovery and public badge visibility.');
