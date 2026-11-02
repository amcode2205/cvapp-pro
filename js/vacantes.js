/**
 * Vacantes sugeridas según el perfil / CV (matching por skills e intereses).
 */
import { supabase } from './supabaseClient.js';
import { escapar } from './ui.js';

/**
 * Calcula afinidad 0–100 entre vacante y perfil del candidato.
 * Combina skills del CV, título e intereses laborales.
 */
export function calcularAfinidad(vacante, perfil, cv) {
  const skillsUser = new Set(
    [...(cv?.skills || []), ...(perfil?.preferencias?.intereses || [])]
      .map((s) => String(s).toLowerCase().trim())
      .filter(Boolean)
  );

  const skillsVac = (vacante.skills || []).map((s) => String(s).toLowerCase());
  let hits = 0;
  for (const s of skillsVac) {
    if ([...skillsUser].some((u) => u.includes(s) || s.includes(u))) hits += 1;
  }

  const skillScore = skillsVac.length ? hits / skillsVac.length : 0;

  const tituloUser = String(perfil?.titulo || '').toLowerCase();
  const tituloVac = String(vacante.titulo || '').toLowerCase();
  const tituloBonus =
    tituloUser &&
    tituloVac
      .split(/\s+/)
      .some((w) => w.length > 3 && tituloUser.includes(w))
      ? 0.15
      : 0;

  const score = Math.min(1, skillScore * 0.85 + tituloBonus);
  // Escala a un rango visual creíble (55–98) cuando hay datos
  const base = skillsUser.size ? 55 : 40;
  return Math.round(base + score * 43);
}

/** Trae vacantes desde Supabase */
export async function cargarVacantes() {
  const { data, error } = await supabase
    .from('vacancies')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Ordena y pinta tarjetas de vacantes con % de afinidad */
export function pintarVacantes(vacantes, perfil, cv) {
  const root = document.getElementById('lista-vacantes');
  if (!root) return;

  const ranqueadas = [...vacantes]
    .map((v) => ({ ...v, match: calcularAfinidad(v, perfil, cv) }))
    .sort((a, b) => b.match - a.match);

  if (!ranqueadas.length) {
    root.innerHTML = '<div class="empty">No hay vacantes disponibles.</div>';
    return;
  }

  const skillsUser = new Set(
    [...(cv?.skills || []), ...(perfil?.preferencias?.intereses || [])]
      .map((s) => String(s).toLowerCase().trim())
      .filter(Boolean)
  );

  root.innerHTML = ranqueadas
    .map((v) => {
      const inicial = escapar(String(v.empresa || '?').trim().charAt(0).toUpperCase() || '?');
      return `
    <article class="card vacante-card">
      <div class="job-co-logo" aria-hidden="true">${inicial}</div>
      <div class="vacante-main">
        <h3>${escapar(v.titulo)}</h3>
        <div class="job-meta">${escapar(v.empresa)} · ${escapar(v.ubicacion || 'Ubicación N/D')}</div>
        <p>${escapar(v.descripcion || '')}</p>
        <div class="chips">
          ${(v.skills || [])
            .map((s) => {
              const hit = [...skillsUser].some(
                (u) => u.includes(String(s).toLowerCase()) || String(s).toLowerCase().includes(u)
              );
              return `<span class="chip${hit ? ' match-skill' : ''}">${escapar(s)}</span>`;
            })
            .join('')}
        </div>
      </div>
      <div class="vacante-match">
        <div class="match">${v.match}%</div>
        <div class="match-label">afinidad</div>
        <div class="match-bar"><div class="match-fill" style="width:${v.match}%"></div></div>
      </div>
    </article>`;
    })
    .join('');
}
