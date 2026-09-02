# 🚀 Zero-Cost Supabase Setup Guide ($0 Budget)

This guide walks you step-by-step through setting up your free Supabase database with authentication, Row Level Security (RLS), and GPS spatial tracking.

---

## Step 1: Create a Free Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and click **Start your project** (Sign in with GitHub or email).
2. Click **New Project**.
3. Fill in your project details:
   - **Name**: `FogTracker` (or any name you like)
   - **Database Password**: Choose a strong password (save it safely)
   - **Region**: Select the region closest to you (e.g., Central EU, US East, etc.)
   - **Pricing Plan**: Free Tier ($0/month - Includes 500MB database & 50,000 monthly active users)
4. Click **Create new project** and wait ~1-2 minutes for provisioning.

---

## Step 2: Run the Database SQL Schema

1. In your Supabase Dashboard, click on **SQL Editor** (icon `>_` on the left sidebar).
2. Click **New Query**.
3. Open the file [`supabase/schema.sql`](file:///c:/Users/pi41dcg/Documents/GitHub/gps_tracker/supabase/schema.sql) in this repository and copy all its contents.
4. Paste the SQL query into the Supabase SQL editor and click **Run** (or `Ctrl + Enter`).
5. You should see `Success. No rows returned`.

### What this schema creates:
- ✅ `profiles`: Stores explorer levels, total distance, explored territory, and user settings.
- ✅ `trips`: Stores metadata for recorded journeys (duration, distance, average speed, max speed).
- ✅ `track_points`: Stores GPS coordinates (latitude, longitude, altitude, speed, heading, timestamp).
- ✅ `explored_tiles`: Stores discretized grid cells for high-speed Fog of War calculation.
- ✅ `Row Level Security (RLS)`: Ensures complete privacy — users can only view and modify their own location data.
- ✅ `Trigger handle_new_user`: Automatically creates user profiles when they register.

---

## Step 3: Copy Your API Keys

1. In your Supabase Dashboard, click on **Project Settings** (gear icon on the bottom left).
2. Click on **API** in the sidebar.
3. Find the following two values:
   - **Project URL**: (e.g. `https://yourprojectid.supabase.co`)
   - **Project API Keys** -> **anon / public** key: (starts with `eyJ...`)

---

## Step 4: Connect to Your App

You can connect your Supabase credentials in **two easy ways**:

### Option A: Directly in the App UI (Easiest)
1. Open the FogTracker web or mobile app.
2. Click on the **User Account icon** (top right).
3. Click on the **Supabase Setup** tab.
4. Paste your **Project URL** and **Anon Key**, then click **Save & Connect Supabase**.
5. Switch back to **Sign Up / Sign In** to create your account!

### Option B: Using Environment Variables (`.env`)
1. Create a `.env` file in the root folder of this project:
   ```env
   VITE_SUPABASE_URL=https://yourprojectid.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
2. Rebuild the app with `npm run build` or restart the dev server.

