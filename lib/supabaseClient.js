import { createClient } from '@supabase/supabase-js';

const supabaseUrl = https://stkffsntxwajzvefucov.supabase.co
const supabaseAnonKey = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0a2Zmc250eHdhanp2ZWZ1Y292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjcyMTcsImV4cCI6MjA4NzEwMzIxN30.OTh4OEJi-RCz8Fm0OM5OV1HDqTdPyqDNF906k3K2YJU

export const supabase = createClient(supabaseUrl, supabaseAnonKey);