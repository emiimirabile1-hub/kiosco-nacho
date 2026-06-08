function renderHistorial() {
  const busqueda = document
    .getElementById('searchHistorial')
    .value.toLowerCase();
  const filtro = document.getElementById('filtroHistorialTipo').value;
  let txs = getTransaccionesFiltro(filtro);
  if (busqueda)
    txs = txs.filter(t => JSON.stringify(t).toLowerCase().includes(busqueda));
  const tbody = document.getElementById('historialTable');
  if (!txs.length) {
    tbody.innerHTML =
      '<tr><td colspan="5"><div class="empty-state"><p>Sin resultados</p></div></td></tr>';
    return;
  }
  const icons = {
    venta: '💳',
    compra: '📥',
    apertura: '🔓',
    cierre: '🔒',
    ingreso_extra: '➕',
    gasto_extra: '➖'
  };
  tbody.innerHTML = txs
    .map(t => {
      const detalle =
        t.detalle ||
        (t.items ? t.items.map(i => `${i.nombre} x${i.cantidad}`).join(', ') : '');
      let ingreso = '—',
        egreso = '—';
      if (
        t.tipo === 'venta' ||
        t.tipo === 'ingreso_extra' ||
        t.tipo === 'apertura'
      )
        ingreso = '$' + formatearMoneda(t.total || 0);
      else egreso = '$' + formatearMoneda(t.total || 0);
      return `<tr>
        <td>${formatearFecha(t.fecha)}</td>
        <td>${icons[t.tipo] || ''} ${t.tipo.replace(/_/g, ' ')}</td>
        <td>${detalle}</td>
        <td style="color:var(--success)">${ingreso}</td>
        <td style="color:var(--danger)">${egreso}</td>
      </tr>`;
    })
    .join('');
}
