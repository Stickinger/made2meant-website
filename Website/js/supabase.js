// ============================================================
// SUPABASE SETUP
// Hier trägst du deine eigenen Keys ein (nach Supabase-Projekt erstellen)
// ============================================================

const SUPABASE_URL = 'https://xqeedhnajvftvcsjzfly.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZWVkaG5hanZmdHZjc2p6Zmx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzM4MTgsImV4cCI6MjA5NzkwOTgxOH0.Tdg6NCtiNmFwXzyRXaI5E7QX3dDdU4EToeclO0QqqTw';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
