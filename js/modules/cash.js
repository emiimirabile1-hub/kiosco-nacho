let accionExtra = null;

function renderCaja() {
  const abierta = hayCajaAbierta();
  document.getElementById('cajaCerradaView').style.display = abierta ? 'none' : 'block';
  document.getElementById('cajaAbiertaView').style.display = abierta ? 'block' : 'none';
  if (abierta) {
    const s = getSesionCaja();
    document.getElementById('cajaMontoInicial').innerHTML =
      '$' + formatearMoneda(parseFloat(s.montoInicial)) +
      ' <button class="btn-icon" onclick="editarMontoInicial()" title="Editar monto inicial" style="font-size:14px">✏️</button>';
    document.getElementById('cajaIngresos').textContent =
      '$' + formatearMoneda(totalVentasCaja());
    document.getElementById('cajaEgresos').textContent =
      '$' + formatearMoneda(totalComprasCaja());
    document.getElementById('cajaSaldoActual').textContent =
      '$' + formatearMoneda(saldoCajaActual());
    renderMovimientosCaja();
  }
  renderHistorialCierres();
  actualizarHeaderCaja();
}

function renderMovimientosCaja() {
  const movs = getMovimientosCaja();
  const tbody = document.getElementById('movimientosCajaTable');
  if (!movs.length) {
    tbody.innerHTML =
      '<tr><td colspan="6"><div class="empty-state"><p>Sin movimientos</p></div></td></tr>';
    return;
  }
  const icons = { apertura: '🔓', venta: '💳', compra: '📥', ingreso_extra: '➕', gasto_extra: '➖' };
  tbody.innerHTML = movs
    .map(m => `
    <tr>
      <td>${formatearFecha(m.fecha)}</td>
      <td>${icons[m.tipo] || ''} ${m.tipo.replace(/_/g, ' ')}</td>
      <td>${m.detalle}</td>
      <td style="color:var(--success)">${m.ingreso > 0 ? '$' + formatearMoneda(m.ingreso) : '—'}</td>
      <td style="color:var(--danger)">${m.egreso > 0 ? '$' + formatearMoneda(m.egreso) : '—'}</td>
      <td><strong>$${formatearMoneda(m.saldo)}</strong></td>
    </tr>`).join('');
}

function renderHistorialCierres() {
  const cierres = getHistorialCierres();
  const tbody = document.getElementById('historialCierresTable');
  if (!cierres.length) {
    tbody.innerHTML =
      '<tr><td colspan="7"><div class="empty-state"><p>Sin cierres registrados</p></div></td></tr>';
    return;
  }
  const c = [...cierres].reverse();
  tbody.innerHTML = c
    .map(h => `
    <tr>
      <td>${formatearFecha(h.fechaApertura)}</td>
      <td>${formatearFecha(h.fechaApertura)}</td>
      <td>${formatearFecha(h.fechaCierre)}</td>
      <td>$${formatearMoneda((h.montoInicial || 0))}</td>
      <td>$${formatearMoneda((h.ingresos || 0))}</td>
      <td>$${formatearMoneda((h.egresos || 0))}</td>
      <td><strong>$${formatearMoneda((h.montoFinal || 0))}</strong></td>
    </tr>`).join('');
}

function abrirCajaForm() {
  const ultimoCierre = getHistorialCierres();
  const sugerido = ultimoCierre.length ? ultimoCierre[ultimoCierre.length - 1].montoFinal || 0 : 0;
  document.getElementById('modalAperturaCaja').classList.add('show');
  document.getElementById('aperturaMonto').value = sugerido;
}

function confirmarApertura() {
  const monto = parseFloat(document.getElementById('aperturaMonto').value) || 0;
  abrirSesionCaja(monto);
  cerrarModal('modalAperturaCaja');
  renderCaja();
  actualizarHeaderCaja();
}

function editarMontoInicial() {
  const s = getSesionCaja();
  if (!s) return;
  const nuevo = prompt('Editar monto inicial de caja:', s.montoInicial);
  if (nuevo === null) return;
  const monto = parseFloat(nuevo);
  if (isNaN(monto) || monto < 0) return alert('Ingresá un monto válido');
  s.montoInicial = monto;
  if (s.movimientos.length > 0) {
    s.movimientos[0].monto = monto;
    s.movimientos[0].ingreso = monto;
    s.movimientos[0].saldo = monto;
  }
  saveData();
  renderCaja();
  actualizarHeaderCaja();
}

function cerrarCajaForm() {
  const s = getSesionCaja();
  if (!s) return;
  const saldo = saldoCajaActual();
  document.getElementById('cierreMonto').value = saldo;
  const totalV = totalVentasCaja();
  const totalC = totalComprasCaja();
  document.getElementById('resumenCierre').innerHTML = `
    <div class="resumen-cierre">
      <p><strong>Monto inicial:</strong> $${formatearMoneda((s.montoInicial || 0))}</p>
      <p><strong>Ventas totales:</strong> <span style="color:var(--success)">+$${formatearMoneda(totalV)}</span></p>
      <p><strong>Compras totales:</strong> <span style="color:var(--danger)">-$${formatearMoneda(totalC)}</span></p>
      <p><strong>Saldo esperado:</strong> $${formatearMoneda(saldo)}</p>
      <hr style="margin:8px 0;border-color:var(--border)">
      <p style="font-size:13px;color:var(--text-light)">Ingresá el monto final para verificar:</p>
    </div>
  `;
  document.getElementById('modalCerrarCaja').classList.add('show');
}

function confirmarCierre() {
  const monto = parseFloat(document.getElementById('cierreMonto').value) || 0;
  const esperado = saldoCajaActual();
  if (Math.abs(monto - esperado) > 0.01) {
    if (!confirm(
      `⚠️ El monto ingresado ($${formatearMoneda(monto)}) no coincide con el saldo esperado ($${formatearMoneda(esperado)}). ¿Cerrar de todas formas?`
    )) return;
  }
  cerrarSesionCaja(monto, '');
  cerrarModal('modalCerrarCaja');
  renderCaja();
  actualizarHeaderCaja();
}

function agregarMovimientoExtra() {
  accionExtra = 'ingreso_extra';
  document.getElementById('modalExtraTitulo').textContent = '➕ Ingreso Extra';
  document.getElementById('btnGuardarExtra').className = 'btn btn-success';
  document.getElementById('btnGuardarExtra').textContent = '➕ Agregar Ingreso';
  document.getElementById('extraDescripcion').value = '';
  document.getElementById('extraMonto').value = '';
  document.getElementById('modalExtra').classList.add('show');
}

function agregarGastoExtra() {
  accionExtra = 'gasto_extra';
  document.getElementById('modalExtraTitulo').textContent = '➖ Gasto Extra';
  document.getElementById('btnGuardarExtra').className = 'btn btn-danger';
  document.getElementById('btnGuardarExtra').textContent = '➖ Agregar Gasto';
  document.getElementById('extraDescripcion').value = '';
  document.getElementById('extraMonto').value = '';
  document.getElementById('modalExtra').classList.add('show');
}

function guardarExtra() {
  const desc = document.getElementById('extraDescripcion').value.trim();
  const monto = parseFloat(document.getElementById('extraMonto').value) || 0;
  if (!desc) return alert('Describí el movimiento');
  if (monto <= 0) return alert('El monto debe ser mayor a 0');
  const label = { ingreso_extra: 'Ingreso extra', gasto_extra: 'Gasto extra' }[accionExtra];
  addMovimientoCaja(accionExtra, desc, monto);
  addTransaccion({ tipo: accionExtra, total: monto, detalle: desc });
  cerrarModal('modalExtra');
  renderCaja();
  actualizarHeaderCaja();
  alert(`✅ ${label} registrado`);
}
