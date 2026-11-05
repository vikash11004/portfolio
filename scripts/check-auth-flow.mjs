import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const admin = readFileSync(new URL('../admin.js', import.meta.url), 'utf8');
const authCode = admin.slice(admin.indexOf('function isOwnerLoggedIn()'), admin.indexOf('function mapProjectToViewModel('));
function adminHarness() {
  const elements = Object.fromEntries(['#adminDisabled', '#adminPanel', '#adminUserEmail'].map(id => [id, {}]));
  const redirects = [];
  let observer;
  const auth = { currentUser: null, onAuthStateChanged(next, error) { observer = { next, error }; } };
  const app = { firestore: () => ({}), auth: () => auth };
  const context = vm.createContext({ console: { log() {}, error() {} },
    FIREBASE_CONFIG: { apiKey: 'test', authDomain: 'test', projectId: 'test' }, OWNER_EMAIL: 'owner@example.com',
    firebaseReady: false, firebaseApp: null, firebaseDb: null, firebaseAuth: null, firebaseStorage: null,
    currentUser: null, authResolved: false, authSessionReady: null, authRedirectStarted: false,
    $: selector => elements[selector], renderAdminProjectsList() {},
    window: { firebase: { apps: [], initializeApp: () => app }, location: { replace: url => redirects.push(url) } },
  });
  vm.runInContext(authCode, context);
  vm.runInContext('setupFirebase(); updateAdminAvailability();', context);
  return { context, elements, redirects, emit: user => observer.next(user), fail: () => observer.error(new Error('offline')) };
}
const owner = { email: 'Owner@Example.com' };
const restored = adminHarness();
let finished = false;
const pending = vm.runInContext('restoreAuthSession()', restored.context).then(() => { finished = true; });
await Promise.resolve();
assert.equal(finished, false, 'must wait for persisted auth to restore');
assert.equal(restored.context.authResolved, false);
assert.equal(restored.redirects.length, 0);
assert.equal(restored.elements['#adminPanel'].hidden, true);
restored.emit(owner);
await pending;
assert.equal(restored.redirects.length, 0);
assert.equal(restored.elements['#adminPanel'].hidden, false);
restored.emit(null);
restored.emit(null);
assert.deepEqual(restored.redirects, ['login.html'], 'sign-out redirects only once');
for (const user of [null, { email: 'other@example.com' }]) {
  const signedOut = adminHarness();
  signedOut.emit(user);
  await vm.runInContext('restoreAuthSession()', signedOut.context);
  assert.deepEqual(signedOut.redirects, ['login.html']);
  assert.equal(signedOut.elements['#adminPanel'].hidden, true);
}
const failed = adminHarness();
failed.fail();
await vm.runInContext('restoreAuthSession()', failed.context);
assert.equal(failed.redirects.length, 0);
assert.equal(failed.elements['#adminPanel'].hidden, true);

const signOutFailure = adminHarness();
signOutFailure.emit(owner);
signOutFailure.context.firebaseAuth.signOut = async () => { throw new Error('offline'); };
vm.runInContext(admin.slice(admin.indexOf('async function handleAdminSignOut()'), admin.indexOf('async function handleAdminListAction(')), signOutFailure.context);
await vm.runInContext('handleAdminSignOut()', signOutFailure.context);
assert.equal(signOutFailure.redirects.length, 0, 'failed sign-out must not bounce back through login');
signOutFailure.context.firebaseAuth.signOut = async () => signOutFailure.emit(null);
await vm.runInContext('handleAdminSignOut()', signOutFailure.context);
assert.deepEqual(signOutFailure.redirects, ['login.html']);

const loginHtml = readFileSync(new URL('../login.html', import.meta.url), 'utf8');
const inline = loginHtml.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
function loginHarness() {
  const elements = {};
  let observer, submit;
  const redirects = [];
  const calls = [];
  const auth = {
    onAuthStateChanged(next) { observer = next; },
    async setPersistence(value) { calls.push(value); },
    async signInWithEmailAndPassword() { observer(owner); return { user: owner }; },
  };
  function firebaseAuth() {}
  firebaseAuth.Auth = { Persistence: { LOCAL: 'local' } };
  const context = vm.createContext({ console,
    document: { getElementById(id) { return elements[id] ||= { style: {}, value: id === 'loginEmail' ? owner.email : 'test-only', addEventListener(_, callback) { submit = callback; } }; } },
    window: { PORTFOLIO_CONFIG: { FIREBASE_CONFIG: { apiKey: 'test' }, OWNER_EMAIL: owner.email },
      firebase: { apps: [], initializeApp: () => ({ auth: () => auth }), auth: firebaseAuth },
      location: { replace: url => redirects.push(url) },
    },
  });
  vm.runInContext(inline, context);
  return { redirects, calls, emit: user => observer(user), submit: () => submit({ preventDefault() {} }) };
}
const login = loginHarness();
await login.submit();
login.emit(owner);
assert.deepEqual(login.calls, ['local']);
assert.deepEqual(login.redirects, ['admin.html'], 'observer and submit must share one redirect');
const alreadySignedIn = loginHarness();
alreadySignedIn.emit(owner);
alreadySignedIn.emit(owner);
assert.deepEqual(alreadySignedIn.redirects, ['admin.html']);
console.log('Passed: delayed session restoration, owner/non-owner/signed-out states, auth errors, sign-out, persisted login and single redirect.');
