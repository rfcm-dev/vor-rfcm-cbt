import { createClient } from "@supabase/supabase-js";

// Server-side client only — uses the service role key.
// Never expose this key or this client to the browser.
export const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
