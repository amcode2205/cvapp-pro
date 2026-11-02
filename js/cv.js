/**
 * Generador de CV interactivo: edición, preview en vivo y export PDF (print).
 */
import { supabase } from './supabaseClient.js';
import { cargarCVLocal, guardarCVLocal } from './guestLocal.js';
import { escapar, mostrarToast } from './ui.js';

const CONTENIDO_VACIO = {
  experiencia: [],
  educacion: [],
  skills: [],
  proyectos: [],
};

let estado = structuredClone(CONTENIDO_VACIO);
let perfilRef = null;

function esLocal(userId) {
  return userId === 'local-guest';
}

/** Carga el CV del usuario (o crea uno vacío) */
export async function cargarCV(userId) {
  if (esLocal(userId)) {
    estado = normalizarContenido(cargarCVLocal());
    return estado;
  }

  const { data, error } = await supabase
    .from('cvs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { data: creado, error: err } = await supabase
      .from('cvs')
      .insert({ user_id: userId, contenido: CONTENIDO_VACIO })
      .select('*')
      .single();
    if (err) throw err;
    estado = normalizarContenido(creado.contenido);
    return estado;
  }

  estado = normalizarContenido(data.contenido);
  return estado;
}

function normalizarContenido(contenido) {
  return {
    experiencia: Array.isArray(contenido?.experiencia) ? contenido.experiencia : [],
    educacion: Array.isArray(contenido?.educacion) ? contenido.educacion : [],
    skills: Array.isArray(contenido?.skills) ? contenido.skills : [],
    proyectos: Array.isArray(contenido?.proyectos) ? contenido.proyectos : [],
  };
}

export function obtenerEstadoCV() {
  return estado;
}

export function setPerfilParaPreview(perfil) {
  perfilRef = perfil;
}

/** Guarda el CV (Supabase o almacenamiento local del invitado) */
export async function guardarCV(userId) {
  if (esLocal(userId)) {
    guardarCVLocal(estado);
    mostrarToast('CV guardado');
    return;
  }

  const { error } = await supabase.from('cvs').upsert(
    {
      user_id: userId,
      contenido: estado,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
  mostrarToast('CV guardado');
}

/** Añade un ítem a una sección del CV */
export function agregarItem(seccion, item) {
  estado[seccion] = [...(estado[seccion] || []), item];
  renderEditor();
  renderPreview();
}

/** Elimina un ítem por índice */
export function eliminarItem(seccion, index) {
  estado[seccion] = estado[seccion].filter((_, i) => i !== index);
  renderEditor();
  renderPreview();
}

/** Renderiza listas editables del editor */
export function renderEditor() {
  pintarLista(
    'lista-experiencia',
    estado.experiencia,
    'experiencia',
    (item) => `<strong>${escapar(item.rol)}</strong> — ${escapar(item.empresa)}<br><span class="muted">${escapar(item.periodo)}</span><br>${escapar(item.detalle || '')}`
  );
  pintarLista(
    'lista-educacion',
    estado.educacion,
    'educacion',
    (item) => `<strong>${escapar(item.titulo)}</strong> — ${escapar(item.institucion)}<br><span class="muted">${escapar(item.periodo)}</span>`
  );
  pintarLista(
    'lista-proyectos',
    estado.proyectos,
    'proyectos',
    (item) => `<strong>${escapar(item.nombre)}</strong><br>${escapar(item.detalle || '')}`
  );

  const skillsBox = document.getElementById('lista-skills');
  if (!skillsBox) return;
  skillsBox.innerHTML = estado.skills.length
    ? estado.skills
        .map(
          (s, i) =>
            `<span class="chip">${escapar(s)} <button type="button" data-seccion="skills" data-index="${i}" aria-label="Quitar">×</button></span>`
        )
        .join('')
    : '<p class="muted">Aún no hay skills. Agrégalos abajo.</p>';
}

function pintarLista(id, items, seccion, htmlFn) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="empty">Sin elementos todavía.</div>';
    return;
  }
  el.innerHTML = items
    .map(
      (item, i) => `
      <div class="lista-item">
        <div>${htmlFn(item)}</div>
        <button type="button" class="btn btn-danger" data-seccion="${seccion}" data-index="${i}">Quitar</button>
      </div>`
    )
    .join('');
}

/** Actualiza la vista previa del CV */
export function renderPreview() {
  const root = document.getElementById('cv-preview');
  if (!root) return;

  const nombre = perfilRef?.nombre || 'Tu nombre';
  const titulo = perfilRef?.titulo || 'Tu título profesional';
  const ciudad = perfilRef?.ciudad || '';
  const bio = perfilRef?.bio || 'Escribe un resumen breve en tu perfil.';
  const foto =
    perfilRef?.foto_url ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(nombre)}`;

  root.innerHTML = `
    <header>
      <img src="${escapar(foto)}" alt="Foto de ${escapar(nombre)}" />
      <div>
        <h1>${escapar(nombre)}</h1>
        <p class="titulo">${escapar(titulo)}</p>
        <p class="muted">${escapar(ciudad)}${perfilRef?.email ? ' · ' + escapar(perfilRef.email) : ''}</p>
      </div>
    </header>
    <section class="cv-section">
      <h3>Resumen</h3>
      <p>${escapar(bio)}</p>
    </section>
    <section class="cv-section">
      <h3>Skills</h3>
      <div class="chips">
        ${
          estado.skills.length
            ? estado.skills.map((s) => `<span class="chip">${escapar(s)}</span>`).join('')
            : '<span class="muted">Sin skills</span>'
        }
      </div>
    </section>
    <section class="cv-section">
      <h3>Experiencia</h3>
      ${
        estado.experiencia.length
          ? estado.experiencia
              .map(
                (e) => `
            <div style="margin-bottom:10px">
              <strong>${escapar(e.rol)}</strong> — ${escapar(e.empresa)}
              <div class="muted">${escapar(e.periodo)}</div>
              <div>${escapar(e.detalle || '')}</div>
            </div>`
              )
              .join('')
          : '<p class="muted">Sin experiencia cargada</p>'
      }
    </section>
    <section class="cv-section">
      <h3>Educación</h3>
      ${
        estado.educacion.length
          ? estado.educacion
              .map(
                (e) => `
            <div style="margin-bottom:8px">
              <strong>${escapar(e.titulo)}</strong> — ${escapar(e.institucion)}
              <div class="muted">${escapar(e.periodo)}</div>
            </div>`
              )
              .join('')
          : '<p class="muted">Sin educación cargada</p>'
      }
    </section>
    <section class="cv-section">
      <h3>Proyectos</h3>
      ${
        estado.proyectos.length
          ? estado.proyectos
              .map(
                (p) => `
            <div style="margin-bottom:8px">
              <strong>${escapar(p.nombre)}</strong>
              <div>${escapar(p.detalle || '')}</div>
            </div>`
              )
              .join('')
          : '<p class="muted">Sin proyectos</p>'
      }
    </section>
  `;
}

/** Enlaza botones del editor de CV */
export function enlazarEditorCV(getUserId) {
  const resolverId = typeof getUserId === 'function' ? getUserId : () => getUserId;
  document.getElementById('form-skill')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const input = ev.target.skill;
    const valor = input.value.trim();
    if (!valor) return;
    if (!estado.skills.includes(valor)) agregarItem('skills', valor);
    input.value = '';
  });

  document.getElementById('form-experiencia')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    agregarItem('experiencia', {
      rol: f.rol.value.trim(),
      empresa: f.empresa.value.trim(),
      periodo: f.periodo.value.trim(),
      detalle: f.detalle.value.trim(),
    });
    f.reset();
  });

  document.getElementById('form-educacion')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    agregarItem('educacion', {
      titulo: f.titulo.value.trim(),
      institucion: f.institucion.value.trim(),
      periodo: f.periodo.value.trim(),
    });
    f.reset();
  });

  document.getElementById('form-proyecto')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    agregarItem('proyectos', {
      nombre: f.nombre.value.trim(),
      detalle: f.detalle.value.trim(),
    });
    f.reset();
  });

  document.getElementById('vista-cv')?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-seccion][data-index]');
    if (!btn) return;
    eliminarItem(btn.dataset.seccion, Number(btn.dataset.index));
  });

  document.getElementById('btn-guardar-cv')?.addEventListener('click', async () => {
    try {
      await guardarCV(resolverId());
    } catch (e) {
      mostrarToast(e.message || 'Error al guardar CV', 'error');
    }
  });
}

/** Abre el modal de vista previa PDF con el CV actual */
export function abrirVistaPdf() {
  renderPreview();
  const origen = document.getElementById('cv-preview');
  const destino = document.getElementById('pdf-preview-content');
  const modal = document.getElementById('modal-pdf');
  if (!origen || !destino || !modal) return;
  destino.innerHTML = origen.innerHTML;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/** Cierra el modal PDF */
export function cerrarVistaPdf() {
  const modal = document.getElementById('modal-pdf');
  modal?.classList.add('hidden');
  document.body.style.overflow = '';
}

/** Descarga el CV como PDF (html2pdf.js) */
export async function descargarPdf() {
  const el = document.getElementById('pdf-preview-content');
  if (!el) return;

  if (typeof window.html2pdf !== 'function') {
    // Fallback: diálogo de impresión del navegador
    mostrarToast('Abriendo impresión para guardar como PDF…');
    window.print();
    return;
  }

  const nombre =
    (perfilRef?.nombre || 'CV')
      .replace(/[^\w\s\-áéíóúñÁÉÍÓÚÑ]/gi, '')
      .trim()
      .replace(/\s+/g, '-') || 'CV';

  const btn = document.getElementById('btn-descargar-pdf');
  if (btn) btn.disabled = true;

  try {
    await window
      .html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `CVApp-Pro-${nombre}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(el)
      .save();
    mostrarToast('PDF descargado');
  } catch (e) {
    console.error(e);
    mostrarToast('No se pudo generar el PDF. Prueba con Imprimir.', 'error');
    window.print();
  } finally {
    if (btn) btn.disabled = false;
  }
}
