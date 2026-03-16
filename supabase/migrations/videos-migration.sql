-- Migration for Video Studio feature
CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  title text,
  prompt text NOT NULL,
  negative_prompt text,
  video_url text,
  thumbnail_url text,
  duration int DEFAULT 8,
  aspect_ratio text DEFAULT '9:16',
  generate_audio boolean DEFAULT true,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own restaurant's videos" ON videos;
DROP POLICY IF EXISTS "Users can insert their own restaurant's videos" ON videos;
DROP POLICY IF EXISTS "Users can update their own restaurant's videos" ON videos;
DROP POLICY IF EXISTS "Users can delete their own restaurant's videos" ON videos;
DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
DROP POLICY IF EXISTS "Users can view own videos" ON videos;

-- Create correct policies
CREATE POLICY "Users can insert own videos" ON videos
FOR INSERT WITH CHECK (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own videos" ON videos
FOR SELECT USING (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE user_id = auth.uid()
  )
);

-- Policy for updates (required for status updates during generation)
CREATE POLICY "Users can update own videos" ON videos
FOR UPDATE USING (
  restaurant_id IN (
    SELECT id FROM restaurants 
    WHERE user_id = auth.uid()
  )
);
