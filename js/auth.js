/**
 * Autenticación con Supabase:
 * - OAuth: Google y Microsoft (Azure)
 * - Correo: código OTP de 6 dígitos (Ingresar / Registrarme)
 * - Invitado: sesión anónima (explorar sin crear cuenta)
 */
import { supabase } from './supabaseClient.js';
import { mostrarToast } from './ui.js';

/** Obtiene la sesión actual (si existe) */
export async function obtenerSesion() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Escucha cambios de sesión (login / logout / refresh) */
export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_evento, session) => {
    callback(session);
  });
}

/**
 * Inicia OAuth con el proveedor indicado.
 * @param {'google'|'azure'} proveedor
 */
export async function iniciarSesion(proveedor) {
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: proveedor,
    options: {
      redirectTo,
      scopes: proveedor === 'azure' ? 'email openid profile' : undefined,
    },
  });
  if (error) {
    mostrarToast(error.message || 'No se pudo iniciar sesión', 'error');
    throw error;
  }
}

/**
 * Envía un código OTP al correo.
 * @param {string} email
 * @param {'ingresar'|'registrarme'} modo
 */
export async function enviarCodigoCorreo(email, modo = 'ingresar') {
  const correo = String(email || '').trim().toLowerCase();
  if (!correo || !correo.includes('@')) {
    const err = new Error('Ingresa un correo válido');
    mostrarToast(err.message, 'error');
    throw err;
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: correo,
    options: {
      // Registrarme permite crear usuario; Ingresar solo si ya existe
      shouldCreateUser: modo === 'registrarme',
    },
  });

  if (error) {
    const mensaje =
      modo === 'ingresar' && /signups not allowed|otp/i.test(error.message)
        ? 'No encontramos una cuenta con ese correo. Usa Registrarme.'
        : error.message || 'No se pudo enviar el código';
    mostrarToast(mensaje, 'error');
    throw error;
  }

  mostrarToast('Código enviado. Revisa tu correo.');
  return correo;
}

/**
 * Verifica el código OTP y crea la sesión.
 * @param {string} email
 * @param {string} codigo
 */
export async function verificarCodigoCorreo(email, codigo) {
  const correo = String(email || '').trim().toLowerCase();
  const token = String(codigo || '').trim().replace(/\s+/g, '');

  if (!/^\d{6}$/.test(token)) {
    const err = new Error('El código debe tener 6 dígitos');
    mostrarToast(err.message, 'error');
    throw err;
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: correo,
    token,
    type: 'email',
  });

  if (error) {
    mostrarToast(error.message || 'Código inválido o expirado', 'error');
    throw error;
  }

  mostrarToast('Sesión iniciada');
  return data.session;
}

/**
 * Entra como invitado.
 * 1) Intenta Auth anónima de Supabase
 * 2) Si está desactivada, usa modo local (localStorage)
 * @returns {{ session: object|null, local: boolean, user: object }}
 */
export async function iniciarComoInvitado() {
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        full_name: 'Usuario Invitado',
        name: 'Usuario Invitado',
      },
    },
  });

  if (!error && data?.session) {
    // Si había sesión local previa, la cerramos
    const { cerrarInvitadoLocal } = await import('./guestLocal.js');
    cerrarInvitadoLocal();
    mostrarToast('Modo invitado activo');
    return { session: data.session, local: false, user: data.session.user };
  }

  // Fallback local cuando anonymous_provider_disabled
  if (error && /anonymous/i.test(error.message + (error.code || ''))) {
    const { iniciarInvitadoLocal, usuarioInvitadoLocal } = await import('./guestLocal.js');
    iniciarInvitadoLocal();
    mostrarToast('Modo invitado activo');
    return { session: null, local: true, user: usuarioInvitadoLocal() };
  }

  mostrarToast(error?.message || 'No se pudo entrar como invitado', 'error');
  throw error || new Error('No se pudo entrar como invitado');
}

/** Cierra la sesión del usuario */
export async function cerrarSesion() {
  const { cerrarInvitadoLocal, haySesionInvitadoLocal } = await import('./guestLocal.js');
  if (haySesionInvitadoLocal()) cerrarInvitadoLocal();

  const { error } = await supabase.auth.signOut();
  if (error && !/session/i.test(error.message || '')) {
    mostrarToast(error.message || 'No se pudo cerrar sesión', 'error');
    throw error;
  }
  window.location.hash = '#login';
  // Forzar recarga de UI cuando solo había sesión local
  window.dispatchEvent(new CustomEvent('cvstudio:logout'));
}
