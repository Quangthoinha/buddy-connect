ALTER TABLE app_buddy_connect.user_profiles
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS career_goals TEXT[] DEFAULT '{}';
