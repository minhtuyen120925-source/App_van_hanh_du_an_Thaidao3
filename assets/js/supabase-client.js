/* Kết nối Supabase — URL và publishable key AN TOÀN để lộ công khai (không phải bí mật) */
const SUPABASE_URL = "https://ipfujmafsylivpyabwdo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Ye4RMeLInENYcYwkGpcF4Q_NXdcgbyu";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
