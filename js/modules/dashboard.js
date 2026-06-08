function renderDashboard() {
  const prods = getProductos();
  const txs = getTransacciones();
  const ventas = txs.filter(t => t.tipo === 'venta');
  const compras = txs.filter(t => t.tipo === 'compra');
  const hoy = new Date().toDateString();

  const ventasHoy = ventas.filter(t => new Date(t.fecha).toDateString() === hoy);
  const totalHoy = ventasHoy.reduce((a, t) => a + parseFloat(t.total || 0), 0);
  const comprasHoy = compras.filter(t => new Date(t.fecha).toDateString() === hoy);
  const gastoHoy = comprasHoy.reduce((a, t) => a + parseFloat(t.total || 0), 0);

  const totalVentas = ventas.reduce((a, t) => a + parseFloat(t.total || 0), 0);
  const totalCompras = compras.reduce((a, t) => a + parseFloat(t.total || 0), 0);
  const gananciaNeta = totalVentas - totalCompras;
  const unidadesVendidas = ventas.reduce((a, t) => a + (t.items ? t.items.reduce((s, i) => s + (i.cantidad || 0), 0) : 0), 0);

  const mes = new Date().getMonth();
  const anio = new Date().getFullYear();
  const ventasMes = ventas.filter(t => {
    const d = new Date(t.fecha);
    return d.getMonth() === mes && d.getFullYear() === anio;
  });
  const totalMes = ventasMes.reduce((a, t) => a + parseFloat(t.total || 0), 0);

  const stockBajo = prods.filter(p => p.stock <= p.stockMinimo);
  const stockTotal = prods.reduce((a, p) => a + (p.stock || 0), 0);
  const valorStock = prods.reduce((a, p) => a + ((p.precioCompra || 0) * (p.stock || 0)), 0);

  const topProductos = {};
  ventas.forEach(t => {
    if (t.items) t.items.forEach(i => {
      const nom = i.nombre || 'Desconocido';
      topProductos[nom] = (topProductos[nom] || 0) + (i.cantidad || 0);
    });
  });
  const top = Object.entries(topProductos).sort((a, b) => b[1] - a[1]).slice(0, 5);

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
    <div class="stat-card accent-blue" data-page="historial">
      <div class="stat-label">Ventas Hoy</div>
      <div class="stat-value">$${totalHoy.toFixed(2)}</div>
      <div class="stat-sub">${ventasHoy.length} ventas · Gasto: $${gastoHoy.toFixed(2)}</div>
    </div>
    <div class="stat-card accent-green" data-page="historial">
      <div class="stat-label">Ventas del Mes</div>
      <div class="stat-value">$${totalMes.toFixed(2)}</div>
      <div class="stat-sub">${ventasMes.length} ventas · $${totalVentas.toFixed(2)} totales</div>
    </div>
    <div class="stat-card ${gananciaNeta >= 0 ? 'accent-green' : 'accent-red'}" data-page="historial">
      <div class="stat-label">Ganancia Neta</div>
      <div class="stat-value">$${gananciaNeta.toFixed(2)}</div>
      <div class="stat-sub">Ventas $${totalVentas.toFixed(2)} · Compras $${totalCompras.toFixed(2)}</div>
    </div>
    <div class="stat-card accent-blue" data-page="caja">
      <div class="stat-label">💵 Efectivo</div>
      <div class="stat-value">$${efectivo.toFixed(2)}</div>
      <div class="stat-sub">💰 Total disponible: $${saldo.toFixed(2)}</div>
    </div>
    <div class="stat-card accent-orange" data-page="caja">
      <div class="stat-label">💳 Mercado Pago</div>
      <div class="stat-value">$${mercadoPago.toFixed(2)}</div>
      <div class="stat-sub">Tarjeta/Transferencia · ${prods.length} productos</div>
    </div>
    <div class="stat-card ${cajaAbierta ? 'accent-blue' : 'accent-red'}" data-page="productos">
      <div class="stat-label">Stock total</div>
      <div class="stat-value">${stockTotal} ud</div>
      <div class="stat-sub">$${valorStock.toFixed(2)} en mercadería · ${stockBajo.length} bajos</div>
    </div>
  `;

  document.querySelectorAll('#dashboardStats .stat-card').forEach(el => {
    el.addEventListener('click', () => {
      const page = el.dataset.page;
      if (page) navegar(page);
    });
  });

  document.getElementById('alertasList').innerHTML = stockBajo.length
    ? stockBajo.map(p => `<div class="alert-item" data-page="productos"><span class="nombre">📦 ${p.nombre}</span><span class="stock">Stock: ${p.stock}</span></div>`).join('')
    : '<p style="color:var(--success);padding:8px 0">✅ Todo ok</p>';

  document.getElementById('topProductosList').innerHTML = top.length
    ? top.map(([nom, cant], i) => {
      const icons = ['🥇','🥈','🥉','4️⃣','5️⃣'];
      return `<div class="alert-item" data-page="productos" style="border-left-color:var(--primary)"><span class="nombre">${icons[i]||'•'} ${nom}</span><span class="stock" style="color:var(--primary)">${cant} ud</span></div>`;
    }).join('')
    : '<p style="color:var(--text-muted);padding:8px 0">Sin ventas</p>';

  document.querySelectorAll('#alertasList .alert-item, #topProductosList .alert-item').forEach(el => {
    el.addEventListener('click', () => navegar('productos'));
  });

  const ultimos = getTransaccionesFiltro('todos', 10);
  const tbody = document.getElementById('ultimosMovimientos');
  if (!ultimos.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>Sin movimientos</p></div></td></tr>';
  } else {
    const icons = { venta:'💳', compra:'📥', apertura:'🔓', cierre:'🔒', ingreso_extra:'➕', gasto_extra:'➖' };
    tbody.innerHTML = ultimos.map(t => {
      const det = t.detalle || (t.items ? t.items.map(i => i.nombre).join(', ') : '');
      const cant = t.items ? t.items.reduce((a, i) => a + i.cantidad, 0) : '-';
      return `<tr data-page="historial"><td>${formatearFecha(t.fecha)}</td><td>${icons[t.tipo]||'📄'} ${t.tipo.replace(/_/g,' ')}</td><td>${det}</td><td>${cant}</td><td>$${parseFloat(t.total||0).toFixed(2)}</td></tr>`;
    }).join('');
    tbody.querySelectorAll('tr').forEach(el => {
      el.addEventListener('click', () => navegar('historial'));
    });
  }

  setTimeout(() => { try { dibujarChartVentas(); } catch(e) {} }, 200);
  setTimeout(() => { try { dibujarChartMedios(); } catch(e) {} }, 200);
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
    dias.push({ label: d.getDate() + '/' + (d.getMonth()+1), total, fecha: d.toLocaleDateString('es-AR', { weekday:'short', day:'numeric', month:'short' }) });
  }

  const max = Math.max(...dias.map(d => d.total), 1);
  const pad = { top: 16, right: 10, bottom: 26, left: 40 };
  const gw = w - pad.left - pad.right;
  const gh = h - pad.top - pad.bottom;
  const sp = dias.length <= 14 ? Math.max(3, gw / dias.length * 0.3) : 2;
  const barW = Math.max(3, Math.min(16, (gw - sp * (dias.length - 1)) / dias.length));
  const sep = barW + sp;

  const pts = dias.map((d, i) => ({
    x: pad.left + sep * i + barW / 2,
    y: pad.top + gh - (d.total / max) * gh,
    label: d.label,
    total: d.total,
    fecha: d.fecha
  }));

  ctx.strokeStyle = 'rgba(100,116,139,.15)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (gh / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('$' + Math.round(max - (max / 4) * i), pad.left - 4, y + 3);
  }

  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.5; ctx.stroke();

  ctx.fillStyle = '#2563eb';
  pts.forEach((p, i) => {
    ctx.beginPath(); ctx.arc(p.x, p.y, p.total > 0 ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  });

  ctx.fillStyle = '#64748b'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
  dias.forEach((d, i) => {
    if (i % 2 === 0 || dias.length <= 7) {
      ctx.fillText(d.label, pts[i].x, h - pad.bottom + 16);
    }
  });

  ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
  pts.forEach((p, i) => {
    if (p.total > 0) {
      ctx.fillStyle = '#0f172a'; ctx.fillText('$' + p.total.toFixed(0), p.x, p.y - 8);
    }
  });

  canvas.onmousemove = function(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const tooltip = document.getElementById('tooltipVentas');
    let hit = false;
    for (const p of pts) {
      if (Math.abs(mx - p.x) < 14 && Math.abs(my - p.y) < 14 && p.total > 0) {
        tooltip.innerHTML = `<b>${p.fecha}</b><br>$${p.total.toFixed(2)}`;
        tooltip.style.left = (mx + 12) + 'px';
        tooltip.style.top = (my - 30) + 'px';
        tooltip.classList.add('show');
        hit = true;
        break;
      }
    }
    if (!hit) tooltip.classList.remove('show');
  };
  canvas.onmouseleave = () => document.getElementById('tooltipVentas').classList.remove('show');
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

  const arcos = [];
  let angulo = -Math.PI / 2;
  datos.forEach(d => {
    const porc = d.value / total;
    const angFinal = angulo + porc * Math.PI * 2;
    arcos.push({ ...d, angulo, angFinal, porc });
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angulo, angFinal);
    ctx.closePath();
    ctx.fillStyle = d.color; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    angulo = angFinal;
  });

  const cardColor = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#f8fafc';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = cardColor; ctx.fill();

  ctx.fillStyle = '#0f172a'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('$' + total.toFixed(0), cx, cy + 1);
  ctx.fillStyle = '#64748b'; ctx.font = '9px sans-serif';
  ctx.fillText('total', cx, cy + 14);

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

  canvas.onmousemove = function(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const tooltip = document.getElementById('tooltipMedios');
    const dx = mx - cx, dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let hit = false;
    if (dist < r * 0.45) {
      tooltip.innerHTML = `<b>Total</b> $${total.toFixed(2)}`;
      tooltip.style.left = (mx + 12) + 'px';
      tooltip.style.top = (my - 20) + 'px';
      tooltip.classList.add('show');
      hit = true;
    } else if (dist < r) {
      let a = Math.atan2(dy, dx);
      if (a < -Math.PI / 2) a += Math.PI * 2;
      for (const arco of arcos) {
        let inicio = arco.angulo, fin = arco.angFinal;
        if (inicio < -Math.PI / 2) { inicio += Math.PI * 2; fin += Math.PI * 2; }
        if (a >= inicio && a < fin) {
          tooltip.innerHTML = `<b>${arco.label}</b><br>$${arco.value.toFixed(2)} (${(arco.porc*100).toFixed(1)}%)`;
          tooltip.style.left = (mx + 12) + 'px';
          tooltip.style.top = (my - 20) + 'px';
          tooltip.classList.add('show');
          hit = true;
          break;
        }
      }
    }
    if (!hit) tooltip.classList.remove('show');
  };
  canvas.onmouseleave = () => document.getElementById('tooltipMedios').classList.remove('show');
}
