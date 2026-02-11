import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rfncbvloygdnlsooujee.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbmNidmxveWdkbmxzb291amVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTU0MTEsImV4cCI6MjA4NjM5MTQxMX0.sp7BgLH65LxBcTTsIoZqoF4Hte-wcM06vG4hh8HQ5Gg'

export const supabase = createClient(supabaseUrl, supabaseKey)