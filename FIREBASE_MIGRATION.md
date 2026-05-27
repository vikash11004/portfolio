# Firebase Migration Guide (Spark Free Plan)

This portfolio is now wired for Firebase Auth + Firestore + Firebase Hosting.

## 1. Create Firebase Project (Free)

1. Open Firebase Console.
2. Create a project.
3. Keep Spark (free) plan.
4. Add a Web App and copy the SDK config.

## 2. Enable Services

1. Authentication -> Sign-in method -> enable Email/Password.
2. Firestore Database -> Create database -> Production mode.
3. Use rules from `firestore.rules` (or run deploy command below).

## 3. Configure Local Files

Update `config.js` and `config.local.js`:

- `FIREBASE_CONFIG.apiKey`
- `FIREBASE_CONFIG.authDomain`
- `FIREBASE_CONFIG.projectId`
- `FIREBASE_CONFIG.storageBucket`
- `FIREBASE_CONFIG.messagingSenderId`
- `FIREBASE_CONFIG.appId`

Update `.firebaserc`:

- replace `your-firebase-project-id` with your real Firebase project ID.

## 4. Create Owner Admin Account

In Firebase Console -> Authentication:

1. Add user with email `vikashthyadi1104@gmail.com`.
2. This is your admin user account for the site.
3. Set password.
4. Use the same credentials on `admin.html`.

## 5. Deploy Rules + Hosting

Install Firebase CLI:

```powershell
npm install -g firebase-tools
```

Login and deploy:

```powershell
firebase login
firebase use your-firebase-project-id
firebase deploy --only firestore:rules,hosting
```

## 6. Data Migration from Supabase (one-time)

Collections used:

- `projects` (doc id = project slug)
- `site_content` (doc id = `portfolio_site`)

Recommended one-time migration:

1. Export your Supabase `projects` table to `supabase-projects.json`.
2. Export your Supabase `site_content` row to `supabase-site-content.json`.
3. Put both files in the project root, or pass their paths to the script.
4. Run the importer:

```powershell
npm install
node scripts/migrate-supabase-to-firestore.mjs --projects supabase-projects.json --site-content supabase-site-content.json --service-account path\to\firebase-service-account.json
```

If you already have Application Default Credentials set up, you can omit `--service-account`.

The script writes:

- `projects/{slug}` documents in Firestore
- `site_content/portfolio_site` in Firestore

You can also run a dry run first:

```powershell
node scripts/migrate-supabase-to-firestore.mjs --projects supabase-projects.json --site-content supabase-site-content.json --dry-run
```

You can still re-open `admin.html` after the import to correct anything manually.

## 7. Free Plan Notes

Spark free tier is enough for this portfolio:

- Hosting static files
- Firestore reads/writes at low to medium personal portfolio traffic
- Firebase Auth email/password for admin login

If traffic grows heavily, monitor Firestore usage in Firebase Console.
