-- Admin Customer Management RPCs
-- Run this in your Supabase SQL Editor to enable ban/unban/delete customer from admin dashboard.

-- Add banned column to profiles if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_banned boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Ban a user (admin only)
CREATE OR REPLACE FUNCTION admin_ban_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Cannot ban another admin
  IF EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = target_user_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Cannot ban an admin user';
  END IF;

  UPDATE public.profiles SET is_banned = true WHERE user_id = target_user_id;
  RETURN true;
END;
$$;

-- Unban a user (admin only)
CREATE OR REPLACE FUNCTION admin_unban_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles SET is_banned = false WHERE user_id = target_user_id;
  RETURN true;
END;
$$;

-- Delete a user and all their data (admin only)
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Cannot delete another admin
  IF EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = target_user_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Cannot delete an admin user';
  END IF;

  -- Delete from auth.users cascades to profiles, orders, reviews, wishlists, carts
  DELETE FROM auth.users WHERE id = target_user_id;
  RETURN true;
END;
$$;

-- Allow admins to read all profiles (policy-based fallback)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'admin_read_all_profiles' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY admin_read_all_profiles ON public.profiles
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND active = true)
      );
  END IF;
END $$;

-- RPC to list all customers (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION admin_list_customers(search_term text DEFAULT '')
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF search_term = '' THEN
    RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
  ELSE
    RETURN QUERY SELECT * FROM public.profiles
      WHERE email ILIKE '%' || search_term || '%'
         OR full_name ILIKE '%' || search_term || '%'
         OR phone ILIKE '%' || search_term || '%'
      ORDER BY created_at DESC;
  END IF;
END;
$$;
