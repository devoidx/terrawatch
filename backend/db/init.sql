-- TerraWatch Database Schema

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT FALSE,
    phone_number VARCHAR(20),
    push_subscription JSONB,
    UNIQUE(user_id)
);

-- Alert regions (geographic bounding boxes drawn by the user on the map)
CREATE TABLE IF NOT EXISTS alert_regions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    -- Bounding box (lat/lng bounds)
    lat_min DECIMAL(9,6) NOT NULL,
    lat_max DECIMAL(9,6) NOT NULL,
    lng_min DECIMAL(9,6) NOT NULL,
    lng_max DECIMAL(9,6) NOT NULL,
    -- Alert thresholds
    min_earthquake_magnitude DECIMAL(4,2) DEFAULT 4.0,
    include_volcanoes BOOLEAN DEFAULT TRUE,
    min_volcano_alert_level VARCHAR(20) DEFAULT 'advisory', -- normal, advisory, watch, warning
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sent alerts log (to avoid duplicate notifications)
CREATE TABLE IF NOT EXISTS sent_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    alert_region_id INTEGER REFERENCES alert_regions(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL, -- 'earthquake' or 'volcano'
    event_id VARCHAR(100) NOT NULL,  -- USGS event ID
    event_magnitude DECIMAL(4,2),
    event_location TEXT,
    notified_at TIMESTAMP DEFAULT NOW(),
    channels_used TEXT[], -- ['email', 'sms', 'push']
    UNIQUE(user_id, event_id)
);

-- System settings (for admins)
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed default admin user (password: changeme)
INSERT INTO users (username, email, password_hash, is_admin)
VALUES (
    'admin',
    'admin@terrawatch.local',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    TRUE
) ON CONFLICT DO NOTHING;

-- Seed default notification preferences for admin
INSERT INTO notification_preferences (user_id, email_enabled)
SELECT id, TRUE FROM users WHERE username = 'admin'
ON CONFLICT DO NOTHING;

-- Seed default settings
INSERT INTO settings (key, value) VALUES
    ('usgs_poll_interval_seconds', '120'),
    ('volcano_poll_interval_seconds', '300'),
    ('app_name', 'TerraWatch')
ON CONFLICT DO NOTHING;
