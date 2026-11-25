import { createClient } from '@supabase/supabase-js'

// The anon key is safe to ship in the browser: Row Level Security on the
// tasks table means it can only ever touch the signed-in user's own rows.
export const supabase = createClient(
  'https://uijyoxkppndiyboguhzm.supabase.co',
  'sb_publishable_ntTZHgBcoK8a5_EQwVepIQ_60e9yDPg',
)
