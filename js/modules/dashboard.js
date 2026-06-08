function renderDashboard() {
  const hoy = new Date().toDateString();
  const prods = getProductos();
  const txs = getTransacciones().filter(
    t => new Date(t.fecha).toDateString() === hoy
  );
  const ventasHoy = txs.filter(t => t.tipo === 'venta');
  const comprasHoy = txs.filter(t => t.tipo === 'compra');
  const totalVentasHoy = ventasHoy.reduce((a, v) => a + parseFloat(v.total || 0), 0);
  const totalComprasHoy = comprasHoy.reduce((a, c) => a + parseFloat(c.total || 0), 0);
  const cajaAbierta = hayCajaAbierta();
  const saldo = cajaAbierta ? saldoCajaActual() : 0;
  const stockBajo = prods.filter(p => p.stock <= p.stockMinimo);

  document.getElementById('dashboardStats').innerHTML = `
    <div class="stat-card accent-blue">
      <div class="stat-label">Productos</div>
      <div class="stat-value">${prods.length}</div>
      <div class="stat-sub">en catálogo</div>
    </div>
    <div class="stat-card accent-green">
      <div class="stat-label">Ventas hoy</div>
      <div class="stat-value">$${totalVentasHoy.toFixed(2)}</div>
      <div class="stat-sub">${ventasHoy.length} ventas</div>
    </div>
    <div class="stat-card accent-red">
      <div class="stat-label">Compras hoy</div>
      <div class="stat-value">$${totalComprasHoy.toFixed(2)}</div>
      <div class="stat-sub">${comprasHoy.length} compras</div>
    </div>
    <div class="stat-card accent-orange">
      <div class="stat-label">Caja</div>
      <div class="stat-value">$${saldo.toFixed(2)}</div>
      <div class="stat-sub">${cajaAbierta ? 'Abierta' : 'Cerrada'}</div>
    </div>
  `;

  const alertasEl = document.getElementById('alertasList');
  if (stockBajo.length) {
    alertasEl.innerHTML = stockBajo
      .map(
        p => `
      <div class="alert-item">
        <span class="nombre">📦 ${p.nombre}</span>
        <span class="stock">Stock: ${p.stock} (mín: ${p.stockMinimo})</span>
      </div>`
      )
      .join('');
  } else {
    alertasEl.innerHTML =
      '<p style="color:var(--success);padding:8px 0">✅ Todos los productos tienen stock suficiente</p>';
  }

  const ultimos = getTransaccionesFiltro('todos', 10);
  const tbody = document.getElementById('ultimosMovimientos');
  if (!ultimos.length) {
    tbody.innerHTML =
      '<tr><td colspan="5"><div class="empty-state"><p>Sin movimientos recientes</p></div></td></tr>';
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
  tbody.innerHTML = ultimos
    .map(t => {
      const detalle =
        t.detalle ||
        (t.items ? t.items.map(i => i.nombre).join(', ') : '');
      const cant = t.items
        ? t.items.reduce((a, i) => a + i.cantidad, 0)
        : '-';
      return `<tr>
        <td>${formatearFecha(t.fecha)}</td>
        <td>${icons[t.tipo] || '📄'} ${t.tipo.replace(/_/g, ' ')}</td>
        <td>${detalle}</td>
        <td>${cant}</td>
        <td>$${parseFloat(t.total || 0).toFixed(2)}</td>
      </tr>`;
    })
    .join('');
}
