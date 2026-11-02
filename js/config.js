/**
 * Configuración de Supabase (CV Studio)
 * Proyecto: cv-studio (sa-east-1)
 */
export const SUPABASE_URL = 'https://ptajhednlrmgdlnslplt.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YWpoZWRubHJtZ2RsbnNscGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzUyNjIsImV4cCI6MjEwOTE1MTI2Mn0.9KltoYR99NzLQ_pe6tFQbRL694NUZ8XlRZyBeRcm5P0';

/** Indica si la configuración está lista para conectar */
export function configuracionLista() {
  return SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;
}
