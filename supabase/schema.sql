-- =============================================
-- File Sharing Room System — Supabase Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ROOMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS rooms (
  room_id     TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by  TEXT NOT NULL,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed'))
);

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  message_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     TEXT NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  message     TEXT NOT NULL,
  timestamp   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- =============================================
-- FILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS files (
  file_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     TEXT NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_size   BIGINT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  uploaded_by TEXT NOT NULL DEFAULT 'Anonymous'
);

CREATE INDEX IF NOT EXISTS idx_files_room_id ON files(room_id);

-- =============================================
-- ROW LEVEL SECURITY (optional - disable for dev)
-- =============================================
-- ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE files ENABLE ROW LEVEL SECURITY;
