/**
 * Utilidades de interfaz: toast, escape HTML y helpers de fecha.
 */

/** Muestra un mensaje temporal en pantalla */
export function mostrarToast(mensaje, tipo = 'ok') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = mensaje;
  el.classList.toggle('error', tipo === 'error');
  el.classList.add('visible');
  clearTimeout(mostrarToast._t);
  mostrarToast._t = setTimeout(() => el.classList.remove('visible'), 2800);
}

/** Escapa texto para insertarlo de forma segura en HTML */
export function escapar(texto) {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Fecha local en formato YYYY-MM-DD */
export function hoyISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Primer día del mes actual (YYYY-MM-DD) */
export function inicioMesISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}-01`;
}

/** Formatea monto según moneda */
export function formatearMoneda(valor, moneda = 'USD') {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 2,
    }).format(Number(valor) || 0);
  } catch {
    return `${Number(valor || 0).toFixed(2)} ${moneda}`;
  }
}
