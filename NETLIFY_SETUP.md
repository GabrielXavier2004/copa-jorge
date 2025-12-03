# Netlify setup: inject Firebase config at build time

Steps to mask Firebase keys and generate `firebase-config.js` on Netlify:

1. In your Netlify project, go to Site settings → Build & deploy → Environment → Environment variables.
   Add these variables (use your real Firebase values):
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`
   - (optional) `FIREBASE_MEASUREMENT_ID`

2. In the Netlify UI, set the build command to run the generator before deploying.
   Example build command (if you have Node installed on Netlify):

   ```bash
   node scripts/generate-config.js && echo "Generated" && exit 0
   ```

   If you also have a bundler/build step (e.g., `npm run build`), chain it:

   ```bash
   node scripts/generate-config.js && npm run build
   ```

3. Set the publish directory to your project root (or the folder that contains `html/` if you serve from there).

4. Deploy. The generated `firebase-config.js` will be created at build time and will not be committed to git.

Notes:
- The client SDK `apiKey` is not a secret for Firebase web apps, but hiding it reduces accidental exposure in public repos.
- You SHOULD rotate the API key and service account if they were previously committed.
- After deploy, verify `window.FIREBASE_CONFIG` exists in the deployed page (use DevTools).
