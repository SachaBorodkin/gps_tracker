# 📱 Mobile App Deployment & APK Build Guide ($0 Cost)

FogTracker can run in two ways on mobile devices at zero cost:
1. **Progressive Web App (PWA / Web Mobile)**: No app store required, installable directly from your mobile browser with 1 tap.
2. **Native Android APK (Capacitor)**: Compiled native Android application with background GPS access.

---

## Option 1: Mobile Web / PWA (Instant & Free)

1. Deploy the app to any free static host (e.g. **Vercel**, **Netlify**, **Cloudflare Pages**, or **GitHub Pages**):
   ```bash
   # Build static production assets
   npm run build
   ```
2. Upload the `dist/` folder to Vercel/Netlify for free.
3. Open the resulting URL on your mobile phone (Safari on iOS or Chrome on Android).
4. Tap **Share / Options** -> **Add to Home Screen**.
5. FogTracker will launch in standalone fullscreen app mode with high-precision GPS tracking!

---

## Option 2: Native Android APK Build with Capacitor ($0)

FogTracker is pre-configured with Capacitor for native Android builds.

### Prerequisites:
- Android Studio installed on your computer (Free from Google).
- Node.js & npm.

### Steps:

1. **Build the production web assets**:
   ```bash
   npm run build
   ```

2. **Add Android platform (First time only)**:
   ```bash
   npx cap add android
   ```

3. **Synchronize assets and plugins**:
   ```bash
   npx cap sync
   ```

4. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```

5. **Run on Phone or Build APK**:
   - In Android Studio, connect your Android phone via USB (with Developer Mode & USB Debugging turned ON).
   - Click the green **Run** button to install directly to your device.
   - Or click **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)** to generate a standalone `.apk` file you can send to any phone!

---

## Android GPS Permissions (Pre-configured)

When building for Android, Capacitor automatically includes the necessary location permissions in `AndroidManifest.xml`:
- `ACCESS_FINE_LOCATION` (High accuracy satellite GPS)
- `ACCESS_COARSE_LOCATION` (Cellular/WiFi triangulation)
- `ACCESS_BACKGROUND_LOCATION` (Background location recording)

