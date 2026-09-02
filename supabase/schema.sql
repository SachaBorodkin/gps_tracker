-- ==============================================================================
-- FOG TRACKER - SUPABASE DATABASE SCHEMA
-- Free Tier Compatible ($0) - PostgreSQL with Row Level Security (RLS)
-- ==============================================================================

-- 1. Enable UUID Extension (Available by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    total_distance_meters DOUBLE PRECISION DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    total_trips_count INTEGER DEFAULT 0,
    explored_area_sqm DOUBLE PRECISION DEFAULT 0,
    exploration_level INTEGER DEFAULT 1,
    settings JSONB DEFAULT '{
        "fogRadiusMeters": 35,
        "fogOpacity": 0.75,
        "highAccuracyGPS": true,
        "theme": "dark",
        "defaultMapLayer": "carto-dark",
        "units": "metric"
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trips Table (Recorded Sessions)
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Exploration Run',
    transport_mode TEXT NOT NULL DEFAULT 'walking', -- walking, running, cycling, driving
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    distance_meters DOUBLE PRECISION DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    avg_speed_kmh DOUBLE PRECISION DEFAULT 0,
    max_speed_kmh DOUBLE PRECISION DEFAULT 0,
    points_count INTEGER DEFAULT 0,
    bounds JSONB, -- [minLat, minLng, maxLat, maxLng]
    is_synced BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Track Points Table (GPS Coordinates for each trip)
CREATE TABLE IF NOT EXISTS public.track_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Explored Tiles / Visited Zones Table (Discretized grid cells for fast Fog-of-War rendering)
CREATE TABLE IF NOT EXISTS public.explored_tiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tile_key TEXT NOT NULL, -- e.g. "z16_x1234_y5678" or Geohash-7
    first_visited_at TIMESTAMPTZ DEFAULT NOW(),
    last_visited_at TIMESTAMPTZ DEFAULT NOW(),
    visit_count INTEGER DEFAULT 1,
    UNIQUE(user_id, tile_key)
);

-- ==============================================================================
-- INDEXES FOR FAST SPATIAL & TEMPORAL QUERIES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_start_time ON public.trips(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_track_points_trip_id ON public.track_points(trip_id);
CREATE INDEX IF NOT EXISTS idx_track_points_user_id ON public.track_points(user_id);
CREATE INDEX IF NOT EXISTS idx_track_points_timestamp ON public.track_points(timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_explored_tiles_user_tile ON public.explored_tiles(user_id, tile_key);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access their own data
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explored_tiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Trips Policies
CREATE POLICY "Users can view own trips"
    ON public.trips FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips"
    ON public.trips FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
    ON public.trips FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
    ON public.trips FOR DELETE
    USING (auth.uid() = user_id);

-- Track Points Policies
CREATE POLICY "Users can view own track points"
    ON public.track_points FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own track points"
    ON public.track_points FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own track points"
    ON public.track_points FOR DELETE
    USING (auth.uid() = user_id);

-- Explored Tiles Policies
CREATE POLICY "Users can view own explored tiles"
    ON public.explored_tiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update own explored tiles"
    ON public.explored_tiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own explored tiles"
    ON public.explored_tiles FOR UPDATE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC USER PROFILE CREATION ON SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

