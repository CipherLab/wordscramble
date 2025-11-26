# Firebase Setup Guide

This guide will walk you through setting up Firebase Firestore for the daily leaderboard feature.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "word-scramble")
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Register Your Web App

1. In your Firebase project, click the web icon (`</>`) to add a web app
2. Enter an app nickname (e.g., "Word Scramble Web")
3. Don't check "Set up Firebase Hosting"
4. Click "Register app"
5. Copy the firebaseConfig object values - you'll need these for the `.env` file

## Step 3: Set Up Firestore Database

1. In the Firebase Console, go to "Build" > "Firestore Database"
2. Click "Create database"
3. Choose "Start in **production mode**" (we'll add rules next)
4. Select a location closest to your users
5. Click "Enable"

## Step 4: Configure Firestore Security Rules

1. In Firestore Database, go to the "Rules" tab
2. Replace the rules with the following:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read leaderboard scores
    match /dailyScores/{scoreId} {
      // Allow anyone to read scores
      allow read: if true;

      // Allow anyone to create new scores
      // Prevent updates and deletes
      allow create: if request.resource.data.keys().hasAll(['username', 'score', 'date', 'timestamp'])
                    && request.resource.data.username is string
                    && request.resource.data.username.size() > 0
                    && request.resource.data.username.size() <= 20
                    && request.resource.data.score is number
                    && request.resource.data.score >= 0
                    && request.resource.data.date is string
                    && request.resource.data.date.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}');

      // Prevent updates and deletes
      allow update, delete: if false;
    }
  }
}
```

3. Click "Publish"

## Step 5: Create Local Environment File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your Firebase configuration values from Step 2:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=word-scramble-xxxxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=word-scramble-xxxxx
   VITE_FIREBASE_STORAGE_BUCKET=word-scramble-xxxxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:xxxxx
   ```

## Step 6: Set Up GitHub Secrets (for GitHub Pages Deployment)

For the leaderboard to work on GitHub Pages, you need to add your Firebase config as GitHub repository secrets:

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each of these secrets:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

## Step 7: Update GitHub Actions Workflow

Update `.github/workflows/deploy.yml` to inject the environment variables during build:

```yaml
- name: Build
  run: npm run build
  env:
    VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
    VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
    VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
    VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
    VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
    VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
```

## Testing

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Play a daily puzzle and submit your score
3. Check the Firestore Database in Firebase Console to see your score entry
4. The leaderboard should display on the game over screen

## Security Notes

- The API key in your `.env` file is safe to expose in client-side code
- Firestore security rules protect your data from unauthorized modifications
- Users can only create scores, not edit or delete them
- Username length is limited to 20 characters
- Scores must be non-negative numbers

## Troubleshooting

**Leaderboard not loading:**
- Check browser console for errors
- Verify Firestore rules are published
- Confirm `.env` values are correct

**Cannot submit scores:**
- Check Firestore security rules
- Verify the date format is YYYY-MM-DD
- Make sure username is 1-20 characters

**GitHub Pages deployment failing:**
- Verify all GitHub secrets are set correctly
- Check GitHub Actions build logs
- Ensure workflow file has the env variables

## Free Tier Limits

Firebase free tier ("Spark plan") includes:
- **50,000 reads/day**
- **20,000 writes/day**
- **1 GB storage**
- **10 GB/month network egress**

This is more than enough for a word game with moderate traffic!
