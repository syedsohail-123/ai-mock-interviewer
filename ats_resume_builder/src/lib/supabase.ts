import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pvbclgkfkvfqzskzmynp.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YmNsZ2tma3ZmcXpza3pteW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MTkwMzIsImV4cCI6MjEwMjQ5NTAzMn0.2knV2W_Q3IqwYUyRKf6W114BYNKySK6RCOePR82kEjs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getSupabase = async (): Promise<SupabaseClient> => {
  return supabase;
};

export const sendEmailOtp = async (email: string) => {
  const client = await getSupabase();
  const { data, error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
  return data;
};

export const verifyEmailOtp = async (email: string, token: string) => {
  const client = await getSupabase();
  const { data, error } = await client.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;
  return data;
};

export const signOutUser = async () => {
  const client = await getSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};
