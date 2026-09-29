/**
 * scripts/clean-firestore-keys.mjs
 * 
 * Secure utility to scrub exposed API keys from the live Firestore document
 * `site_content/portfolio_site`.
 * 
 * Usage:
 *   node scripts/clean-firestore-keys.mjs <your-firebase-password>
 * 
 * Or simply log in via admin.html in your browser, which will auto-scrub it!
 */

const FIREBASE_API_KEY = 'AIzaSyBb3cDqQ8XOETjMuYEBESvqBBoYqbH6vII';
const PROJECT_ID = 'portfolio-d114e';
const OWNER_EMAIL = 'vikashthyadi1104@gmail.com';
const DOC_PATH = `projects/${PROJECT_ID}/databases/(default)/documents/site_content/portfolio_site`;

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.log('\n🔒 Firestore Secret Scrubber');
    console.log('---------------------------');
    console.log('To scrub leaked keys directly from the terminal, run:');
    console.log('  node scripts/clean-firestore-keys.mjs <your-firebase-owner-password>\n');
    console.log('Alternatively: Open admin.html in your browser and sign in. The updated admin.js will automatically detect and scrub the leaked key from Firestore on login!\n');
    process.exit(0);
  }

  console.log(`Authenticating as ${OWNER_EMAIL}...`);
  const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: OWNER_EMAIL,
      password: password,
      returnSecureToken: true
    })
  });

  const authData = await authRes.json();
  if (authData.error) {
    console.error('❌ Authentication failed:', authData.error.message);
    process.exit(1);
  }

  const idToken = authData.idToken;
  console.log('✓ Successfully authenticated with Firebase Auth.');

  console.log('Fetching live site_content/portfolio_site document...');
  const getRes = await fetch(`https://firestore.googleapis.com/v1/${DOC_PATH}`, {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });

  const doc = await getRes.json();
  if (!doc.fields || !doc.fields.content) {
    console.error('❌ Document content not found or unable to read.');
    process.exit(1);
  }

  console.log('Scrubbing groqApiKey, openrouterApiKey, and customApiKey from live Firestore...');

  // Target patch fieldPaths to wipe secrets without touching any other portfolio data
  const patchUrl = `https://firestore.googleapis.com/v1/${DOC_PATH}?updateMask.fieldPaths=content.aiConfig.groqApiKey&updateMask.fieldPaths=content.aiConfig.openrouterApiKey&updateMask.fieldPaths=content.aiConfig.customApiKey&updateMask.fieldPaths=content.aiConfig.customEndpoint&updateMask.fieldPaths=content.aiConfig.provider`;

  const patchBody = {
    fields: {
      content: {
        mapValue: {
          fields: {
            aiConfig: {
              mapValue: {
                fields: {
                  groqApiKey: { stringValue: '' },
                  openrouterApiKey: { stringValue: '' },
                  customApiKey: { stringValue: '' },
                  customEndpoint: { stringValue: '' },
                  provider: { stringValue: 'builtin' }
                }
              }
            }
          }
        }
      }
    }
  };

  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(patchBody)
  });

  if (!patchRes.ok) {
    const errText = await patchRes.text();
    console.error('❌ Failed to update Firestore:', errText);
    process.exit(1);
  }

  console.log('✅ SUCCESS! Live Firestore document site_content/portfolio_site has been completely cleansed.');
  console.log('   All API keys are now set to "" (empty string) and provider is set to "builtin".\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
