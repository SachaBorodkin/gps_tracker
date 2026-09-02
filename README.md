# 🗺️ FogTracker - GPS Visited Zones & Route Explorer

An offline-first Mobile and Web GPS Tracker app with $0 budget that tracks your real-time routes, visualizes all places & ways you've traveled with a **"Fog of War" dynamic exploration overlay**, provides gamified exploration stats, integrates free open map providers, and syncs to a **Supabase PostgreSQL / PostGIS** cloud backend with multi-tenant authentication.

---

## ✨ Features

- 🛰️ **GPS Route & Path Tracking**: Real-time GPS logging with Kalman/accuracy filtering, live speed, distance, elevation, and duration calculations.
- 🌫️ **Fog of War Visited Zones Visualizer**: Darkens unexplored areas and illuminates your traversed ways with radiant glowing trails on HTML5 Canvas.
- 🗺️ **100% Free Open Map Providers ($0 Cost)**: Switch between CARTO Dark Matter (ideal for neon routes), CARTO Voyager (daylight), OpenStreetMap Standard, and OpenTopoMap (terrain) with no API keys or credit cards needed.
- ⚡ **Offline-First Storage**: Powered by IndexedDB (`idb`) so outdoor GPS tracking works completely without internet or cell reception.
- ☁️ **Supabase Cloud Backend**: Free tier ($0) PostgreSQL database with Row Level Security (RLS) policies and Supabase Auth (Sign Up / Sign In).
- 🏆 **Exploration Gamification**: Calculates total unveiled $\text{km}^2$, exploration levels, XP progression, and transport mode breakdowns (Walk 🚶, Run 🏃, Bike 🚴, Drive 🚗).
- 💾 **GPX & GeoJSON Export/Import**: Export recorded journeys to standard GPX or GeoJSON files, or import tracks from Garmin, Strava, and Google Earth.
- 🎮 **Built-in Route Simulator**: Test live tracking and fog clearing directly in your browser without going outside.
- 📱 **Cross-Platform Mobile & Web**: Unified TypeScript/React codebase runnable on Web, installable as a mobile PWA, and compileable to a native Android APK via Capacitor.

---

## 🚀 Quick Start (Development)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run dev server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📚 Guides & Documentation

- [**Supabase Free Setup Guide**](SUPABASE_SETUP.md): Step-by-step instructions to create your free Supabase project, execute the SQL schema in `supabase/schema.sql`, and connect the database.
- [**Mobile PWA & Android APK Build Guide**](MOBILE_BUILD_GUIDE.md): Instructions for installing on iOS/Android as a PWA or compiling to a native APK with Capacitor.
- [**Database Schema**](supabase/schema.sql): PostgreSQL tables (`profiles`, `trips`, `track_points`, `explored_tiles`) with RLS policies and triggers.