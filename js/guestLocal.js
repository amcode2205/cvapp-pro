/**
 * Modo invitado local (sin Auth anónima de Supabase).
 * Se usa cuando “Allow anonymous sign-ins” aún no está activo.
 * Persiste perfil, CV y finanzas en localStorage de este navegador.
 */
import { hoyISO, inicioMesISO } from './ui.js';

const CLAVE = 'cvstudio_invitado_v1';

const PERFIL_INICIAL = {
  id: 'local-guest',
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
};

const CV_INICIAL = {
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
};

function estadoBase() {
  return {
    activo: true,
    perfil: structuredClone(PERFIL_INICIAL),
    cv: structuredClone(CV_INICIAL),
    transactions: [
      {
        id: crypto.randomUUID(),
        tipo: 'ingreso',
        categoria: 'Salario',
        monto: 1500000,
        fecha: inicioMesISO(),
        nota: 'Pago mensual',
      },
      {
        id: crypto.randomUUID(),
        tipo: 'gasto',
        categoria: 'Comida',
        monto: 180000,
        fecha: hoyISO(),
        nota: 'Mercado',
      },
      {
        id: crypto.randomUUID(),
        tipo: 'gasto',
        categoria: 'Transporte',
        monto: 90000,
        fecha: hoyISO(),
        nota: 'Movilidad',
      },
      {
        id: crypto.randomUUID(),
        tipo: 'gasto',
        categoria: 'Educación',
        monto: 120000,
        fecha: hoyISO(),
        nota: 'Cursos',
      },
    ],
  };
}

function leer() {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardar(estado) {
  localStorage.setItem(CLAVE, JSON.stringify(estado));
}

/** Usuario sintético compatible con el resto de la app */
export function usuarioInvitadoLocal() {
  return {
    id: 'local-guest',
    is_anonymous: true,
    email: null,
    user_metadata: { full_name: 'Usuario Invitado', name: 'Usuario Invitado' },
    app_metadata: { provider: 'local_guest' },
  };
}

export function haySesionInvitadoLocal() {
  return Boolean(leer()?.activo);
}

export function iniciarInvitadoLocal() {
  const actual = leer();
  if (actual?.activo) return usuarioInvitadoLocal();
  guardar(estadoBase());
  return usuarioInvitadoLocal();
}

export function cerrarInvitadoLocal() {
  const actual = leer();
  if (!actual) return;
  actual.activo = false;
  guardar(actual);
}

export function cargarPerfilLocal() {
  return structuredClone(leer()?.perfil || PERFIL_INICIAL);
}

export function guardarPerfilLocal(payload) {
  const estado = leer() || estadoBase();
  estado.perfil = {
    ...estado.perfil,
    ...payload,
    id: 'local-guest',
    preferencias: payload.preferencias || estado.perfil.preferencias,
  };
  estado.activo = true;
  guardar(estado);
  return structuredClone(estado.perfil);
}

export function cargarCVLocal() {
  return structuredClone(leer()?.cv || CV_INICIAL);
}

export function guardarCVLocal(contenido) {
  const estado = leer() || estadoBase();
  estado.cv = contenido;
  estado.activo = true;
  guardar(estado);
  return structuredClone(estado.cv);
}

export function cargarMovimientosLocal() {
  const desde = inicioMesISO();
  const lista = leer()?.transactions || [];
  return lista
    .filter((m) => m.fecha >= desde)
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

export function crearMovimientoLocal(payload) {
  const estado = leer() || estadoBase();
  const item = {
    id: crypto.randomUUID(),
    tipo: payload.tipo,
    categoria: payload.categoria,
    monto: Number(payload.monto),
    fecha: payload.fecha || hoyISO(),
    nota: payload.nota || null,
  };
  estado.transactions = [item, ...(estado.transactions || [])];
  estado.activo = true;
  guardar(estado);
  return item;
}

export function eliminarMovimientoLocal(id) {
  const estado = leer() || estadoBase();
  estado.transactions = (estado.transactions || []).filter((m) => m.id !== id);
  guardar(estado);
}
