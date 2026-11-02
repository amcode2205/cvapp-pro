/**
 * Módulo de perfil personal: datos básicos y preferencias.
 */
import { supabase } from './supabaseClient.js';
import { cargarPerfilLocal, guardarPerfilLocal } from './guestLocal.js';
import { escapar, mostrarToast } from './ui.js';

/** Preferencias por defecto */
const PREFS_DEFAULT = {
  moneda: 'USD',
  intereses: [],
  disponibilidad: 'inmediata',
  tema: 'claro',
};

function esLocal(userId) {
  return userId === 'local-guest';
}

/** Carga el perfil del usuario autenticado */
export async function cargarPerfil(userId) {
  if (esLocal(userId)) {
    return normalizarPerfil(cargarPerfilLocal());
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  // Si el trigger no corrió (usuarios previos), crea fila mínima
  if (!data) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    const nuevo = {
      id: userId,
      nombre: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
      email: user?.email || '',
      foto_url: user?.user_metadata?.avatar_url || '',
      preferencias: PREFS_DEFAULT,
    };
    const { data: creado, error: errInsert } = await supabase
      .from('profiles')
      .insert(nuevo)
      .select('*')
      .single();
    if (errInsert) throw errInsert;
    return normalizarPerfil(creado);
  }

  return normalizarPerfil(data);
}

function normalizarPerfil(data) {
  return {
    ...data,
    preferencias: {
      ...PREFS_DEFAULT,
      ...(data.preferencias || {}),
      intereses: Array.isArray(data.preferencias?.intereses)
        ? data.preferencias.intereses
        : [],
    },
  };
}

/** Guarda cambios del formulario de perfil */
export async function guardarPerfil(userId, payload) {
  if (esLocal(userId)) {
    const guardado = guardarPerfilLocal(payload);
    mostrarToast('Perfil guardado');
    return normalizarPerfil(guardado);
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        nombre: payload.nombre,
        titulo: payload.titulo,
        ciudad: payload.ciudad,
        bio: payload.bio,
        foto_url: payload.foto_url,
        email: payload.email,
        preferencias: payload.preferencias,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  mostrarToast('Perfil guardado');
  return normalizarPerfil(data);
}

/** Rellena el formulario HTML con los datos del perfil */
export function pintarFormularioPerfil(perfil) {
  const f = document.getElementById('form-perfil');
  if (!f) return;
  f.nombre.value = perfil.nombre || '';
  f.titulo.value = perfil.titulo || '';
  f.ciudad.value = perfil.ciudad || '';
  f.bio.value = perfil.bio || '';
  f.foto_url.value = perfil.foto_url || '';
  f.email.value = perfil.email || '';
  if (f.moneda) f.moneda.value = perfil.preferencias.moneda || 'COP';
  f.disponibilidad.value = perfil.preferencias.disponibilidad || 'inmediata';
  f.intereses.value = (perfil.preferencias.intereses || []).join(', ');
}

/** Lee el formulario y arma el payload para guardar */
export function leerFormularioPerfil() {
  const f = document.getElementById('form-perfil');
  const intereses = String(f.intereses.value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    nombre: f.nombre.value.trim(),
    titulo: f.titulo.value.trim(),
    ciudad: f.ciudad.value.trim(),
    bio: f.bio.value.trim(),
    foto_url: f.foto_url.value.trim(),
    email: f.email.value.trim(),
    preferencias: {
      moneda: f.moneda?.value || 'COP',
      disponibilidad: f.disponibilidad.value,
      intereses,
      tema: 'claro',
    },
  };
}

/** Actualiza chip de usuario en la barra superior */
export function actualizarChipUsuario(perfil) {
  const nombre = document.getElementById('user-nombre');
  const foto = document.getElementById('user-foto');
  if (nombre) nombre.textContent = perfil.nombre || perfil.email || 'Usuario';
  if (foto) {
    foto.src =
      perfil.foto_url ||
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(perfil.nombre || 'U')}`;
    foto.alt = escapar(perfil.nombre || 'Usuario');
  }
}
