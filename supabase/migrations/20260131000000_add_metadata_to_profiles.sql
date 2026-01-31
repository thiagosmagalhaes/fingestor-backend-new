-- Add metadata column to profiles table
-- This column will store user preferences and state information
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_profiles_metadata ON profiles USING GIN (metadata);

-- Add comment to explain the metadata structure
COMMENT ON COLUMN profiles.metadata IS 'Stores user preferences and state:
- onboarding_completed: boolean indicating if user completed onboarding
- settings: object with:
  - theme: string (user chosen theme)
  - view_mode: "current" | "projected" (visualization mode for dashboard)';
