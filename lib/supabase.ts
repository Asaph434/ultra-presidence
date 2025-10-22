import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aaqbirdbalxiwsiwzohi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcWJpcmRiYWx4aXdzaXd6b2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTgxODAsImV4cCI6MjA3NjczNDE4MH0.0G0d25xGSGuXSkZbLNvlDF2BxiMWhVtzPmaZyL8if0Y'

export const supabase = createClient(supabaseUrl, supabaseKey)