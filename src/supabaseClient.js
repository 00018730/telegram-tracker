import { createClient } from '@supabase/supabase-js'

// This tells the app to use the Vercel variables if they exist, 
// otherwise look for them in a local .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)