import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qakerfapthzmkgfrvkig.supabase.co'
const supabaseKey = 'sb_publishable_i8ENZ_4jizi4OXUWbHkJbg_zcJzXU2X'

export const supabase = createClient(supabaseUrl, supabaseKey)