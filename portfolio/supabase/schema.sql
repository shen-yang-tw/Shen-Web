-- ============================================================
-- Personal Brand Portfolio — Contact Messages Schema
-- ============================================================
-- Creates the contact_messages table for storing contact form
-- submissions from the portfolio website.
--
-- 1. New Tables
--    - contact_messages: stores visitor contact form submissions
--      - id (uuid, primary key, auto-generated)
--      - name (text, not null) — sender's name
--      - email (text, not null) — sender's email address
--      - phone (text, nullable) — sender's phone number (optional)
--      - message (text, not null) — the contact message body
--      - created_at (timestamptz, default now) — submission timestamp
--
-- 2. Security
--    - Enable Row Level Security on contact_messages.
--    - Allow public INSERT via anon + authenticated (no login required
--      for the contact form).
--    - No SELECT/UPDATE/DELETE policies — only inserts are permitted
--      from the public website.
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert" ON contact_messages;
CREATE POLICY "Allow public insert"
  ON contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
