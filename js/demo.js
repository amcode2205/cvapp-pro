/**
 * Datos iniciales para el modo invitado (explorar sin cuenta).
 * Solo se cargan si el perfil/CV aún están vacíos.
 */
import { supabase } from './supabaseClient.js';
import { hoyISO, inicioMesISO } from './ui.js';

/** Indica si el usuario de la sesión es anónimo */
export function esInvitado(user) {
  return Boolean(user?.is_anonymous);
}

/**
 * Rellena perfil, CV y unos movimientos de ejemplo la primera vez.
 * @param {string} userId
 * @param {object|null} perfilActual
 * @param {object|null} cvActual
 */
export async function sembrarDatosDemo(userId, perfilActual, cvActual) {
  // Invitado local ya trae datos sembrados en localStorage
  if (userId === 'local-guest') return;

  const sinNombreReal =
    !perfilActual?.nombre ||
    perfilActual.nombre === 'Anonymous' ||
    String(perfilActual.nombre).toLowerCase() === 'anonymous';

  if (sinNombreReal || !perfilActual?.titulo) {
    await supabase.from('profiles').upsert(
      {
        id: userId,
        nombre: 'Usuario Invitado',
        titulo: 'Frontend Developer',
        ciudad: 'Bogotá, CO',
        email: '',
        bio: 'Perfil de ejemplo para explorar CVApp Pro. Edita estos datos cuando quieras.',
        foto_url: 'https://api.dicebear.com/9.x/initials/svg?seed=CVAppPro',
        preferencias: {
          moneda: 'COP',
          intereses: ['JavaScript', 'HTML', 'CSS', 'Supabase'],
          disponibilidad: 'inmediata',
          tema: 'claro',
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  }

  const skills = cvActual?.skills || [];
  if (!skills.length) {
    await supabase.from('cvs').upsert(
      {
        user_id: userId,
        contenido: {
          skills: ['HTML', 'CSS', 'JavaScript', 'Supabase'],
          experiencia: [
            {
              rol: 'Desarrollador Frontend',
              empresa: 'Studio Digital',
              periodo: '2024 — Actual',
              detalle: 'Interfaces web, autenticación y módulos de productividad personal.',
            },
          ],
          educacion: [
            {
              titulo: 'Desarrollo Web',
              institucion: 'Formación profesional',
              periodo: '2023 — 2025',
            },
          ],
          proyectos: [
            {
              nombre: 'CVApp Pro',
              detalle: 'App para armar CV, previsualizar PDF y descubrir vacantes afines.',
            },
          ],
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  }

  const desde = inicioMesISO();
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('fecha', desde);

  if (!count) {
    await supabase.from('transactions').insert([
      {
        user_id: userId,
        tipo: 'ingreso',
        categoria: 'Salario',
        monto: 1500000,
        fecha: desde,
        nota: 'Pago mensual',
      },
      {
        user_id: userId,
        tipo: 'gasto',
        categoria: 'Comida',
        monto: 180000,
        fecha: hoyISO(),
        nota: 'Mercado',
      },
      {
        user_id: userId,
        tipo: 'gasto',
        categoria: 'Transporte',
        monto: 90000,
        fecha: hoyISO(),
        nota: 'Movilidad',
      },
      {
        user_id: userId,
        tipo: 'gasto',
        categoria: 'Educación',
        monto: 120000,
        fecha: hoyISO(),
        nota: 'Cursos',
      },
    ]);
  }
}
