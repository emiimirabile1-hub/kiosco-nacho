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

  // Caja y medios de pago (sesión actual)
  const cajaAbierta = hayCajaAbierta();
  const sesion = getSesionCaja();

  let efectivo = 0, mercadoPago = 0;
  if (cajaAbierta && sesion) {
    const movs = sesion.movimientos || [];
    efectivo = sesion.montoInicial || 0;
    movs.forEach(m => {
      if (m.tipo === 'venta') {
        if (m.medioPago === 'efectivo' || !m.medioPago) efectivo += m.monto;
        else mercadoPago += m.monto;
      } else if (m.tipo === 'ingreso_extra') efectivo += m.monto;
      else if (m.tipo === 'compra' || m.tipo === 'gasto_extra') efectivo -= m.monto;
    });
  }

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
      <div class="stat-sub">Stock: ${stockTotal} ud · $${valorStock.toFixed(2)}</div>
    </div>
    <div class="stat-card accent-green">
      <div class="stat-label">💵 Efectivo</div>
      <div class="stat-value">$${efectivo.toFixed(2)}</div>
      <div class="stat-sub">${cajaAbierta ? 'Caja abierta' : 'Caja cerrada'}</div>
    </div>
    <div class="stat-card accent-orange">
      <div class="stat-label">💳 Mercado Pago</div>
      <div class="stat-value">$${mercadoPago.toFixed(2)}</div>
      <div class="stat-sub">Tarjeta / Transferencia</div>
    </div>
    <div class="stat-card ${cajaAbierta ? 'accent-blue' : 'accent-red'}">
      <div class="stat-label">💰 Total disp.</div>
      <div class="stat-value">$${saldo.toFixed(2)}</div>
      <div class="stat-sub">Efectivo + MP</div>
    </div>
  `;

  // Stock bajo
  document.getElementById('alertasList').innerHTML = stockBajo.length
    ? stockBajo.map(p => `<div class="alert-item"><span class="nombre">📦 ${p.nombre}</span><span class="stock">Stock: ${p.stock}</span></div>`).join('')
    : '<p style="color:var(--success);padding:8px 0">✅ Todo ok</p>';

  // Top productos
  document.getElementById('topProductosList').innerHTML = top.length
    ? top.map(([nom, cant], i) => {
      const icons = ['🥇','🥈','🥉','4️⃣','5️⃣'];
      return `<div class="alert-item" style="border-left-color:var(--primary)"><span class="nombre">${icons[i]||'•'} ${nom}</span><span class="stock" style="color:var(--primary)">${cant} ud</span></div>`;
    }).join('')
    : '<p style="color:var(--text-muted);padding:8px 0">Sin ventas</p>';

  // Últimos movimientos
  const ultimos = getTransaccionesFiltro('todos', 10);
  const tbody = document.getElementById('ultimosMovimientos');
  if (!ultimos.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>Sin movimientos</p></div></td></tr>';
  } else {
    const icons = { venta:'💳', compra:'📥', apertura:'🔓', cierre:'🔒', ingreso_extra:'➕', gasto_extra:'➖' };
    tbody.innerHTML = ultimos.map(t => {
      const det = t.detalle || (t.items ? t.items.map(i => i.nombre).join(', ') : '');
      const cant = t.items ? t.items.reduce((a, i) => a + i.cantidad, 0) : '-';
      return `<tr><td>${formatearFecha(t.fecha)}</td><td>${icons[t.tipo]||'📄'} ${t.tipo.replace(/_/g,' ')}</td><td>${det}</td><td>${cant}</td><td>$${parseFloat(t.total||0).toFixed(2)}</td></tr>`;
    }).join('');
  }

  // Dibujar gráficos después de un tick
  setTimeout(dibujarChartVentas, 150);
  setTimeout(dibujarChartMedios, 150);
}

function dibujarChartVentas() {
  const canvas = document.getElementById('chartVentasDiarias');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);

  const ventas = getTransacciones().filter(t => t.tipo === 'venta');
  const dias = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    const total = ventas.filter(t => new Date(t.fecha).toDateString() === ds).reduce((a, t) => a + parseFloat(t.total || 0), 0);
    dias.push({ label: d.getDate() + '/' + (d.getMonth()+1), total });
  }

  const max = Math.max(...dias.map(d => d.total), 1);
  const pad = { top: 16, right: 10, bottom: 24, left: 44 };
  const gw = w - pad.left - pad.right;
  const gh = h - pad.top - pad.bottom;
  const barW = Math.max(6, Math.min(20, gw / dias.length * 0.6));
  const gap = (gw - barW * dias.length) / (dias.length + 1);

  // Grid
  ctx.strokeStyle = 'rgba(100,116,139,.15)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (gh / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('$' + Math.round(max - (max / 4) * i), pad.left - 4, y + 3);
  }

  // Línea
  const colores = ['#2563eb','#16a34a','#dc2626','#f59e0b','#8b5cf6'];
  ctx.beginPath();
  dias.forEach((d, i) => {
    const x = pad.left + gap + i * (barW + gap) + barW / 2;
    const y = pad.top + gh - (d.total / max) * gh;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.5; ctx.stroke();

  // Puntos
  dias.forEach((d, i) => {
    const x = pad.left + gap + i * (barW + gap) + barW / 2;
    const y = pad.top + gh - (d.total / max) * gh;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = d.total > 0 ? '#2563eb' : '#cbd5e1'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  });

  // Labels X
  ctx.fillStyle = '#64748b'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
  dias.forEach((d, i) => {
    if (i % 2 === 0 || dias.length <= 7) {
      const x = pad.left + gap + i * (barW + gap) + barW / 2;
      ctx.fillText(d.label, x, h - pad.bottom + 16);
    }
  });

  // Totales en puntos
  ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
  dias.forEach((d, i) => {
    if (d.total > 0) {
      const x = pad.left + gap + i * (barW + gap) + barW / 2;
      const y = pad.top + gh - (d.total / max) * gh;
      ctx.fillStyle = '#0f172a'; ctx.fillText('$' + d.total.toFixed(0), x, y - 8);
    }
  });
}

function dibujarChartMedios() {
  const canvas = document.getElementById('chartMediosPago');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);

  const sesion = getSesionCaja();
  let efec = 0, mp = 0;
  if (sesion) {
    const movs = sesion.movimientos || [];
    movs.forEach(m => {
      if (m.tipo === 'venta') {
        if (m.medioPago === 'efectivo' || !m.medioPago) efec += m.monto;
        else mp += m.monto;
      }
    });
  }

  // Si no hay datos de sesión, calcular de todas las transacciones
  if (efec === 0 && mp === 0) {
    const txs = getTransacciones().filter(t => t.tipo === 'venta');
    txs.forEach(t => {
      if (t.medioPago === 'efectivo' || !t.medioPago) efec += parseFloat(t.total || 0);
      else mp += parseFloat(t.total || 0);
    });
  }

  const total = efec + mp;
  if (total === 0) {
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Sin datos de ventas', w / 2, h / 2);
    return;
  }

  const cx = w * 0.38, cy = h / 2, r = Math.min(w * 0.32, h * 0.38);
  const datos = [
    { label: 'Efectivo', value: efec, color: '#16a34a' },
    { label: 'M. Pago', value: mp, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  let angulo = -Math.PI / 2;
  datos.forEach(d => {
    const porc = d.value / total;
    const angFinal = angulo + porc * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angulo, angFinal);
    ctx.closePath();
    ctx.fillStyle = d.color; ctx.fill();
    // separación
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    angulo = angFinal;
  });

  // Centro blanco (donut)
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = 'var(--card)'; ctx.fill();

  // Total en el centro
  ctx.fillStyle = '#0f172a'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('$' + total.toFixed(0), cx, cy + 1);
  ctx.fillStyle = '#64748b'; ctx.font = '9px sans-serif';
  ctx.fillText('total', cx, cy + 14);

  // Leyenda
  const lx = w * 0.72, ly = cy - 20;
  ctx.textAlign = 'left';
  datos.forEach((d, i) => {
    const y = ly + i * 22;
    ctx.fillStyle = d.color; ctx.fillRect(lx, y, 10, 10);
    ctx.fillStyle = '#0f172a'; ctx.font = '11px sans-serif';
    ctx.fillText(d.label, lx + 16, y + 9);
    ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif';
    ctx.fillText('$' + d.value.toFixed(0) + ' (' + (d.value / total * 100).toFixed(0) + '%)', lx + 16, y + 22);
  });

  if (datos.length === 1) {
    ctx.fillStyle = '#64748b'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('100% ' + datos[0].label.toLowerCase(), cx, cy + r + 18);
  }
}
