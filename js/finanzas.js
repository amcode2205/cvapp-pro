/**
 * Finanzas personales: ingresos/gastos del mes, KPIs y gráfico simple.
 */
import { supabase } from './supabaseClient.js';
import {
  cargarMovimientosLocal,
  crearMovimientoLocal,
  eliminarMovimientoLocal,
} from './guestLocal.js';
import { escapar, formatearMoneda, hoyISO, inicioMesISO, mostrarToast } from './ui.js';

function esLocal(userId) {
  return userId === 'local-guest';
}

/** Carga movimientos del mes actual */
export async function cargarMovimientos(userId) {
  if (esLocal(userId)) return cargarMovimientosLocal();

  const desde = inicioMesISO();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('fecha', desde)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Crea un movimiento */
export async function crearMovimiento(userId, payload) {
  if (esLocal(userId)) {
    crearMovimientoLocal(payload);
    mostrarToast('Movimiento agregado');
    return;
  }

  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    tipo: payload.tipo,
    categoria: payload.categoria,
    monto: Number(payload.monto),
    fecha: payload.fecha || hoyISO(),
    nota: payload.nota || null,
  });
  if (error) throw error;
  mostrarToast('Movimiento agregado');
}

/** Elimina un movimiento propio */
export async function eliminarMovimiento(id, userId = null) {
  if (esLocal(userId)) {
    eliminarMovimientoLocal(id);
    mostrarToast('Movimiento eliminado');
    return;
  }

  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
  mostrarToast('Movimiento eliminado');
}

/** Calcula KPIs del mes */
export function calcularKpis(movimientos) {
  let ingresos = 0;
  let gastos = 0;
  const porCategoria = {};

  for (const m of movimientos) {
    const monto = Number(m.monto) || 0;
    if (m.tipo === 'ingreso') ingresos += monto;
    else {
      gastos += monto;
      porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + monto;
    }
  }

  return {
    ingresos,
    gastos,
    balance: ingresos - gastos,
    porCategoria,
  };
}

/** Pinta KPIs, tabla y barras por categoría */
export function pintarFinanzas(movimientos, moneda = 'USD') {
  const kpis = calcularKpis(movimientos);

  const elIng = document.getElementById('kpi-ingresos');
  const elGas = document.getElementById('kpi-gastos');
  const elBal = document.getElementById('kpi-balance');
  if (elIng) elIng.textContent = formatearMoneda(kpis.ingresos, moneda);
  if (elGas) elGas.textContent = formatearMoneda(kpis.gastos, moneda);
  if (elBal) {
    elBal.textContent = formatearMoneda(kpis.balance, moneda);
    elBal.parentElement.classList.toggle('ok', kpis.balance >= 0);
    elBal.parentElement.classList.toggle('warn', kpis.balance < 0);
  }

  const tbody = document.querySelector('#tabla-movimientos tbody');
  if (tbody) {
    tbody.innerHTML = movimientos.length
      ? movimientos
          .map(
            (m) => `
        <tr>
          <td>${escapar(m.fecha)}</td>
          <td class="${m.tipo === 'ingreso' ? 'tag-ingreso' : 'tag-gasto'}">${escapar(m.tipo)}</td>
          <td>${escapar(m.categoria)}</td>
          <td>${escapar(formatearMoneda(m.monto, moneda))}</td>
          <td>${escapar(m.nota || '—')}</td>
          <td><button type="button" class="btn btn-danger" data-borrar="${escapar(m.id)}">Eliminar</button></td>
        </tr>`
          )
          .join('')
      : `<tr><td colspan="6" class="muted">Sin movimientos este mes.</td></tr>`;
  }

  const bars = document.getElementById('barras-categorias');
  if (!bars) return;
  const entries = Object.entries(kpis.porCategoria);
  if (!entries.length) {
    bars.innerHTML = '<p class="muted">Aún no hay gastos para graficar.</p>';
    return;
  }
  const max = Math.max(...entries.map(([, v]) => v), 1);
  bars.innerHTML = entries
    .sort((a, b) => b[1] - a[1])
    .map(
      ([cat, val]) => `
      <div class="bar-row">
        <span>${escapar(cat)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(val / max) * 100}%"></div></div>
        <span>${escapar(formatearMoneda(val, moneda))}</span>
      </div>`
    )
    .join('');
}

/** Enlaza formulario y acciones de finanzas */
export function enlazarFinanzas(getUserId, getMoneda, recargar) {
  const form = document.getElementById('form-movimiento');
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    try {
      await crearMovimiento(getUserId(), {
        tipo: f.tipo.value,
        categoria: f.categoria.value,
        monto: f.monto.value,
        fecha: f.fecha.value,
        nota: f.nota.value.trim(),
      });
      f.reset();
      f.fecha.value = hoyISO();
      await recargar();
    } catch (e) {
      mostrarToast(e.message || 'No se pudo guardar', 'error');
    }
  });

  document.getElementById('tabla-movimientos')?.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-borrar]');
    if (!btn) return;
    try {
      await eliminarMovimiento(btn.dataset.borrar, getUserId());
      await recargar();
    } catch (e) {
      mostrarToast(e.message || 'No se pudo eliminar', 'error');
    }
  });

  // Fecha por defecto
  const fecha = form?.querySelector('[name="fecha"]');
  if (fecha && !fecha.value) fecha.value = hoyISO();
}
