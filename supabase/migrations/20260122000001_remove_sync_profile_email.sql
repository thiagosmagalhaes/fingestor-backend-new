-- Remove triggers that sync email from auth.users to profiles
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Remove the sync_profile_email function
DROP FUNCTION IF EXISTS public.sync_profile_email();
