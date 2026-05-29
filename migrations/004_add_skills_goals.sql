ALTER TABLE app_buddy_connect.user_profiles
ADD COLUMN skills TEXT[] DEFAULT '{}',
ADD COLUMN career_goals TEXT[] DEFAULT '{}';
