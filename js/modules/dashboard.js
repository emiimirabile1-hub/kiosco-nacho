function renderDashboard() {
  const prods = getProductos();
  const txs = getTransacciones();
  const ventas = txs.filter(t => t.tipo === 'venta');
  const compras = txs.filter(t => t.tipo === 'compra');
  const hoy = new Date().toDateString();

  // Hoy
  const ventasHoy = ventas.filter(t => new Date(t.fecha).toDateString() === hoy);
  const totalHoy = ventasHoy.reduce((a, t) => a + parseFloat(t.total || 0), 0);
  const comprasHoy = compras.filter(t => new Date(t.fecha).toDateString() === hoy);
  const gastoHoy = comprasHoy.reduce((a, t) => a + parseFloat(t.total || 0), 0);

  // Totales generales
  const totalVentas = ventas.reduce((a, t) => a + parseFloat(t.total || 0), 0);
  const totalCompras = compras.reduce((a, t) => a + parseFloat(t.total || 0), 0);
  const gananciaNeta = totalVentas - totalCompras;
  const unidadesVendidas = ventas.reduce((a, t) => a + (t.items ? t.items.reduce((s, i) => s + (i.cantidad || 0), 0) : 0), 0);

  // Mes actual
  const mes = new Date().getMonth();
  const anio = new Date().getFullYear();
  const ventasMes = ventas.filter(t => {
    const d = new Date(t.fecha);
    return d.getMonth() === mes && d.getFullYear() === anio;
  });
  const totalMes = ventasMes.reduce((a, t) => a + parseFloat(t.total || 0), 0);

  // Stock
  const stockBajo = prods.filter(p => p.stock <= p.stockMinimo);
  const stockTotal = prods.reduce((a, p) => a + (p.stock || 0), 0);
  const valorStock = prods.reduce((a, p) => a + ((p.precioCompra || 0) * (p.stock || 0)), 0);

  // Top productos
  const topProductos = {};
  ventas.forEach(t => {
    if (t.items) t.items.forEach(i => {
      const nom = i.nombre || 'Desconocido';
      topProductos[nom] = (topProductos[nom] || 0) + (i.cantidad || 0);
    });
  });
  const top = Object.entries(topProductos).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const cajaAbierta = hayCajaAbierta();
  const saldo = cajaAbierta ? saldoCajaActual() : 0;

  document.getElementById('dashboardStats').innerHTML = `
    <div class="stat-card accent-blue">
      <div class="stat-label">Ventas Hoy</div>
      <div class="stat-value">$${totalHoy.toFixed(2)}</div>
      <div class="stat-sub">${ventasHoy.length} venta(s) · Gasto: $${gastoHoy.toFixed(2)}</div>
    </div>
    <div class="stat-card accent-green">
      <div class="stat-label">Ventas del Mes</div>
      <div class="stat-value">$${totalMes.toFixed(2)}</div>
      <div class="stat-sub">${ventasMes.length} ventas</div>
    </div>
    <div class="stat-card accent-orange">
      <div class="stat-label">Total Ventas</div>
      <div class="stat-value">$${totalVentas.toFixed(2)}</div>
      <div class="stat-sub">${ventas.length} ventas · ${unidadesVendidas} unidades</div>
    </div>
    <div class="stat-card ${gananciaNeta >= 0 ? 'accent-green' : 'accent-red'}">
      <div class="stat-label">Ganancia Neta</div>
      <div class="stat-value">$${gananciaNeta.toFixed(2)}</div>
      <div class="stat-sub">Ventas - Compras</div>
    </div>
    <div class="stat-card accent-blue">
      <div class="stat-label">Productos</div>
      <div class="stat-value">${prods.length}</div>
      <div class="stat-sub">Stock total: ${stockTotal} ud · $${valorStock.toFixed(2)} en mercadería</div>
    </div>
    <div class="stat-card ${cajaAbierta ? 'accent-green' : 'accent-red'}">
      <div class="stat-label">Caja</div>
      <div class="stat-value">$${saldo.toFixed(2)}</div>
      <div class="stat-sub">${cajaAbierta ? '🔓 Abierta' : '🔒 Cerrada'} · ${compras.length} compras registradas</div>
    </div>
  `;

  // Stock bajo
  const alertasEl = document.getElementById('alertasList');
  if (stockBajo.length) {
    alertasEl.innerHTML = stockBajo.map(p => `
      <div class="alert-item">
        <span class="nombre">📦 ${p.nombre}</span>
        <span class="stock">Stock: ${p.stock} (mín: ${p.stockMinimo})</span>
      </div>
    `).join('');
  } else {
    alertasEl.innerHTML = '<p style="color:var(--success);padding:8px 0">✅ Todos los productos tienen stock suficiente</p>';
  }

  // Top productos
  const topEl = document.getElementById('topProductosList');
  if (top.length) {
    topEl.innerHTML = top.map(([nom, cant], i) => {
      const icons = ['🥇','🥈','🥉','4️⃣','5️⃣'];
      return `<div class="alert-item" style="border-left-color:var(--primary)">
        <span class="nombre">${icons[i] || '•'} ${nom}</span>
        <span class="stock" style="color:var(--primary)">${cant} vendidos</span>
      </div>`;
    }).join('');
  } else {
    topEl.innerHTML = '<p style="color:var(--text-muted);padding:8px 0">Todavía no hay ventas registradas</p>';
  }

  // Últimos movimientos
  const ultimos = getTransaccionesFiltro('todos', 10);
  const tbody = document.getElementById('ultimosMovimientos');
  if (!ultimos.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>Sin movimientos recientes</p></div></td></tr>';
    return;
  }
  const icons = {
    venta: '💳', compra: '📥', apertura: '🔓', cierre: '🔒',
    ingreso_extra: '➕', gasto_extra: '➖'
  };
  tbody.innerHTML = ultimos.map(t => {
    const detalle = t.detalle || (t.items ? t.items.map(i => i.nombre).join(', ') : '');
    const cant = t.items ? t.items.reduce((a, i) => a + i.cantidad, 0) : '-';
    return `<tr>
      <td>${formatearFecha(t.fecha)}</td>
      <td>${icons[t.tipo] || '📄'} ${t.tipo.replace(/_/g, ' ')}</td>
      <td>${detalle}</td>
      <td>${cant}</td>
      <td>$${parseFloat(t.total || 0).toFixed(2)}</td>
    </tr>`;
  }).join('');
}
