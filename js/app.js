/**
 * CVApp Pro — by Alejandro Montes
 * Orquesta autenticación, navegación y módulos de CV / perfil / vacantes.
 */
import {
  iniciarSesion,
  cerrarSesion,
  obtenerSesion,
  onAuthChange,
  enviarCodigoCorreo,
  verificarCodigoCorreo,
  iniciarComoInvitado,
} from './auth.js';
import {
  cargarPerfil,
  guardarPerfil,
  pintarFormularioPerfil,
  leerFormularioPerfil,
  actualizarChipUsuario,
} from './perfil.js';
import {
  cargarCV,
  setPerfilParaPreview,
  renderEditor,
  renderPreview,
  enlazarEditorCV,
  obtenerEstadoCV,
  abrirVistaPdf,
  cerrarVistaPdf,
  descargarPdf,
} from './cv.js';
import { cargarVacantes, pintarVacantes } from './vacantes.js';
import { esInvitado, sembrarDatosDemo } from './demo.js';
import { haySesionInvitadoLocal, usuarioInvitadoLocal } from './guestLocal.js';
import { mostrarToast } from './ui.js';

const app = {
  user: null,
  perfil: null,
  listo: false,
  emailOtp: null,
  modoOtp: 'ingresar',
  ultimoEnvioOtp: 0,
};

const VISTAS = new Set(['login', 'dashboard', 'perfil', 'cv', 'vacantes']);

function navegar(hash) {
  let id = (hash || '#dashboard').replace('#', '') || 'dashboard';
  if (id === 'finanzas') id = 'dashboard';

  if (!app.user && id !== 'login') {
    mostrarVista('login');
    window.location.hash = '#login';
    return;
  }
  if (app.user && id === 'login') {
    window.location.hash = '#dashboard';
    return;
  }

  const vista = VISTAS.has(id) ? id : app.user ? 'dashboard' : 'login';
  mostrarVista(vista);
  document.querySelectorAll('.nav-links a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === `#${vista}`);
  });

  if (vista === 'vacantes') refrescarVacantes();
  if (vista === 'cv') {
    setPerfilParaPreview(app.perfil);
    renderEditor();
    renderPreview();
  }
}

function mostrarVista(id) {
  const login = document.getElementById('pantalla-login');
  const shell = document.getElementById('app-shell');

  if (id === 'login') {
    document.body.classList.add('vista-login');
    login?.classList.remove('hidden');
    shell?.classList.remove('visible');
    return;
  }

  document.body.classList.remove('vista-login');
  login?.classList.add('hidden');
  shell?.classList.add('visible');
  document.querySelectorAll('.vista').forEach((v) => {
    v.classList.toggle('active', v.id === `vista-${id}`);
  });
}

async function bootstrapUsuario(session) {
  app.user = session?.user || null;

  if (!app.user) {
    app.perfil = null;
    actualizarBannerInvitado(false);
    cerrarVistaPdf();
    navegar('#login');
    return;
  }

  try {
    app.perfil = await cargarPerfil(app.user.id);
    let cv = await cargarCV(app.user.id);

    if (esInvitado(app.user)) {
      await sembrarDatosDemo(app.user.id, app.perfil, cv);
      app.perfil = await cargarPerfil(app.user.id);
      cv = await cargarCV(app.user.id);
    }

    actualizarChipUsuario(app.perfil);
    pintarFormularioPerfil(app.perfil);
    setPerfilParaPreview(app.perfil);
    renderEditor();
    renderPreview();
    actualizarBannerInvitado(esInvitado(app.user));

    if (!app.listo) {
      enlazarEditorCV(() => app.user?.id);
      app.listo = true;
    }

    const dest =
      window.location.hash && window.location.hash !== '#login'
        ? window.location.hash
        : '#dashboard';
    navegar(dest);
  } catch (e) {
    console.error(e);
    mostrarToast(e.message || 'Error al cargar datos', 'error');
    navegar('#dashboard');
  }
}

function actualizarBannerInvitado(activo) {
  const banner = document.getElementById('banner-invitado');
  banner?.classList.toggle('hidden', !activo);
  document.body.classList.toggle('modo-invitado', activo);
}

async function refrescarVacantes() {
  try {
    const vacantes = await cargarVacantes();
    pintarVacantes(vacantes, app.perfil, obtenerEstadoCV());
  } catch (e) {
    mostrarToast(e.message || 'No se pudieron cargar vacantes', 'error');
  }
}

function mostrarPasoLogin(paso) {
  const inicio = document.getElementById('login-paso-inicio');
  const codigo = document.getElementById('login-paso-codigo');
  const sub = document.getElementById('login-subtitulo');
  const esCodigo = paso === 'codigo';

  inicio?.classList.toggle('hidden', esCodigo);
  codigo?.classList.toggle('hidden', !esCodigo);

  if (sub) {
    sub.textContent = esCodigo
      ? 'Escribe el código que llegó a tu correo para continuar.'
      : 'Entra a tu cuenta o crea una nueva.';
  }

  if (esCodigo) {
    const dest = document.getElementById('login-email-destino');
    if (dest) dest.textContent = app.emailOtp || '';
    document.getElementById('login-otp')?.focus();
  }
}

async function solicitarCodigo(email, modo) {
  const ahora = Date.now();
  if (ahora - app.ultimoEnvioOtp < 60000 && app.emailOtp === email) {
    mostrarToast('Espera unos segundos antes de pedir otro código');
    mostrarPasoLogin('codigo');
    return;
  }

  await enviarCodigoCorreo(email, modo);
  app.emailOtp = email;
  app.modoOtp = modo;
  app.ultimoEnvioOtp = Date.now();
  mostrarPasoLogin('codigo');
}

function enlazarUI() {
  document.getElementById('btn-google')?.addEventListener('click', () => iniciarSesion('google'));
  document.getElementById('btn-microsoft')?.addEventListener('click', () => iniciarSesion('azure'));
  document.getElementById('btn-logout')?.addEventListener('click', () => cerrarSesion());

  document.getElementById('btn-invitado')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-invitado');
    if (btn) btn.disabled = true;
    try {
      const resultado = await iniciarComoInvitado();
      if (resultado.local) await bootstrapUsuario({ user: resultado.user });
    } catch {
      /* toast en auth.js */
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  window.addEventListener('cvstudio:logout', () => bootstrapUsuario(null));

  const formCorreo = document.getElementById('form-correo');
  formCorreo?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const submitter = ev.submitter;
    const modo = submitter?.value === 'registrarme' ? 'registrarme' : 'ingresar';
    const email = formCorreo.email.value.trim();
    const botones = formCorreo.querySelectorAll('button[type="submit"]');
    botones.forEach((b) => {
      b.disabled = true;
    });
    try {
      await solicitarCodigo(email, modo);
    } catch {
      /* toast en auth.js */
    } finally {
      botones.forEach((b) => {
        b.disabled = false;
      });
    }
  });

  document.getElementById('form-otp')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      await verificarCodigoCorreo(app.emailOtp, form.otp.value);
      form.reset();
      mostrarPasoLogin('inicio');
    } catch {
      /* toast */
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  document.getElementById('btn-reenviar-otp')?.addEventListener('click', async () => {
    if (!app.emailOtp) return;
    try {
      await solicitarCodigo(app.emailOtp, app.modoOtp || 'ingresar');
    } catch {
      /* toast */
    }
  });

  document.getElementById('btn-cambiar-correo')?.addEventListener('click', () => {
    app.emailOtp = null;
    document.getElementById('form-otp')?.reset();
    mostrarPasoLogin('inicio');
    document.getElementById('login-email')?.focus();
  });

  document.getElementById('form-perfil')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!app.user) return;
    try {
      app.perfil = await guardarPerfil(app.user.id, leerFormularioPerfil());
      actualizarChipUsuario(app.perfil);
      setPerfilParaPreview(app.perfil);
      renderPreview();
    } catch (e) {
      mostrarToast(e.message || 'No se pudo guardar el perfil', 'error');
    }
  });

  // PDF: previsualizar y descargar
  document.getElementById('btn-ver-pdf')?.addEventListener('click', () => abrirVistaPdf());
  document.getElementById('btn-ver-pdf-aside')?.addEventListener('click', () => abrirVistaPdf());
  document.getElementById('btn-descargar-pdf')?.addEventListener('click', () => descargarPdf());
  document.querySelectorAll('[data-cerrar-pdf]').forEach((el) => {
    el.addEventListener('click', () => cerrarVistaPdf());
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') cerrarVistaPdf();
  });

  window.addEventListener('hashchange', () => navegar(window.location.hash));
}

async function main() {
  enlazarUI();

  const session = await obtenerSesion();
  if (session?.user) {
    await bootstrapUsuario(session);
  } else if (haySesionInvitadoLocal()) {
    await bootstrapUsuario({ user: usuarioInvitadoLocal() });
  } else {
    await bootstrapUsuario(null);
  }

  onAuthChange(async (sessionNueva) => {
    if (sessionNueva?.user) {
      await bootstrapUsuario(sessionNueva);
      return;
    }
    if (haySesionInvitadoLocal() && app.user?.id === 'local-guest') return;
    if (haySesionInvitadoLocal()) {
      await bootstrapUsuario({ user: usuarioInvitadoLocal() });
      return;
    }
    await bootstrapUsuario(null);
  });
}

main().catch((e) => {
  console.error(e);
  mostrarToast('Error al iniciar la aplicación', 'error');
});
