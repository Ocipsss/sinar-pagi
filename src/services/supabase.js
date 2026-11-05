// src/services/supabase.js - pengganti firebase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] URL atau ANON_KEY belum di set di .env')
}

export const supabase = createClient(supabaseUrl, supabaseKey)