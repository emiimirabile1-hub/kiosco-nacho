let chartCanvas = null;

function renderProyecciones() {
  document.getElementById('proyeccionesContent').innerHTML = '';
  const prods = getProductos();
  if (!prods.length) {
    document.getElementById('proyeccionesContent').innerHTML = '<div class="empty-state"><div class="icon">📊</div><p>No hay productos para analizar</p></div>';
    return;
  }

  const txs = getTransacciones().filter(t => t.tipo === 'venta' && t.items);
  const analysis = prods.map(p => {
    const ventas = txs.filter(t => t.items.some(i => i.productoId === p.id));
    const totalUnidades = ventas.reduce((sum, t) => {
      const item = t.items.find(i => i.productoId === p.id);
      return sum + (item ? item.cantidad : 0);
    }, 0);
    const totalIngreso = ventas.reduce((sum, t) => {
      const item = t.items.find(i => i.productoId === p.id);
      return sum + (item ? item.subtotal : 0);
    }, 0);
    const fechas = ventas.map(t => new Date(t.fecha).getTime()).sort((a, b) => a - b);
    const dias = fechas.length > 0 ? Math.max(1, (Date.now() - fechas[0]) / 86400000) : 1;
    const tasaDiaria = totalUnidades / dias;
    const diasRestantes = tasaDiaria > 0 ? p.stock / tasaDiaria : Infinity;
    return { ...p, totalUnidades, totalIngreso, tasaDiaria, diasRestantes, dias };
  });

  const ordenados = analysis.sort((a, b) => b.tasaDiaria - a.tasaDiaria);
  const topRotacion = ordenados.slice(0, 10);

  const html = `
    <div class="dashboard-grid" style="grid-template-columns:1fr 1fr">
      <div class="stat-card accent-blue">
        <div class="stat-label">Período analizado</div>
        <div class="stat-value" style="font-size:18px">${formatearNumero(Math.max(...analysis.map(a => a.dias)))} días</div>
      </div>
      <div class="stat-card accent-green">
        <div class="stat-label">Productos con ventas</div>
        <div class="stat-value" style="font-size:18px">${analysis.filter(a => a.totalUnidades > 0).length}/${prods.length}</div>
      </div>
    </div>

    <div class="stock-alertas" style="margin-bottom:16px">
      <h3>📦 Sugerencias de compra</h3>
      <div id="sugerenciasCompra"></div>
    </div>

    <div class="stock-alertas" style="margin-bottom:16px">
      <h3>📊 Top rotación (unidades/día)</h3>
      <div style="position:relative;width:100%;max-width:100%;overflow-x:auto">
        <canvas id="rotacionChart" width="600" height="300" style="width:100%;height:auto;max-width:600px;display:block;margin:0 auto;border-radius:8px"></canvas>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr><th>Producto</th><th>Ud. vendidas</th><th>Rotación (ud/día)</th><th>Stock actual</th><th>Días restantes</th><th>Recomendación</th></tr>
        </thead>
        <tbody id="tablaRotacion"></tbody>
      </table>
    </div>
  `;

  document.getElementById('proyeccionesContent').innerHTML = html;

  // Sugerencias
  const sugerenciasEl = document.getElementById('sugerenciasCompra');
  const aComprar = ordenados.filter(a => a.diasRestantes < 30 && a.totalUnidades > 0).slice(0, 8);
  if (aComprar.length) {
    sugerenciasEl.innerHTML = aComprar.map(a => {
      const urg = a.diasRestantes < 7 ? '🔴' : a.diasRestantes < 15 ? '🟡' : '🟢';
      const cantSugerida = Math.ceil(a.tasaDiaria * 30 - a.stock);
      return `<div class="alert-item" style="border-left-color:${a.diasRestantes < 7 ? 'var(--danger)' : a.diasRestantes < 15 ? 'var(--warning)' : 'var(--success)'}">
        <span class="nombre">${urg} ${a.nombre}</span>
        <span style="font-size:13px">Stock: ${a.stock} | Recomiendo: +${Math.max(1, cantSugerida)} ud → ${a.tasaDiaria.toFixed(1)} ud/día</span>
      </div>`;
    }).join('');
  } else {
    sugerenciasEl.innerHTML = '<p style="color:var(--success);padding:8px 0">✅ Sin sugerencias por ahora. Todos los productos tienen stock suficiente.</p>';
  }

  // Tabla
  const tbody = document.getElementById('tablaRotacion');
  if (!ordenados.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p>Sin datos</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = ordenados.map(a => {
    const diasRest = a.diasRestantes === Infinity ? '∞' : a.diasRestantes.toFixed(1);
    const rec = a.diasRestantes < 7 ? '🔴 Comprar YA' : a.diasRestantes < 15 ? '🟡 Comprar pronto' : a.diasRestantes < 30 ? '🟢 Vigilar' : '✅ Ok';
    return `<tr>
      <td><strong>${a.nombre}</strong></td>
      <td>${a.totalUnidades}</td>
      <td>${formatearMoneda(a.tasaDiaria)}</td>
      <td>${a.stock}</td>
      <td>${diasRest}</td>
      <td>${rec}</td>
    </tr>`;
  }).join('');

  // Chart
  setTimeout(dibujarChart, 100);
}

function dibujarChart() {
  const canvas = document.getElementById('rotacionChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width;
  const h = rect.height;

  ctx.clearRect(0, 0, w, h);

  const prods = getProductos();
  const txs = getTransacciones().filter(t => t.tipo === 'venta' && t.items);
  const data = prods.map(p => {
    const ventas = txs.filter(t => t.items.some(i => i.productoId === p.id));
    const totalUnidades = ventas.reduce((sum, t) => {
      const item = t.items.find(i => i.productoId === p.id);
      return sum + (item ? item.cantidad : 0);
    }, 0);
    const fechas = ventas.map(t => new Date(t.fecha).getTime()).sort((a, b) => a - b);
    const dias = fechas.length > 0 ? Math.max(1, (Date.now() - fechas[0]) / 86400000) : 1;
    return { nombre: p.nombre, tasa: totalUnidades / dias };
  }).filter(d => d.tasa > 0).sort((a, b) => b.tasa - a.tasa).slice(0, 8);

  if (!data.length) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sin datos de ventas para mostrar', w / 2, h / 2);
    return;
  }

  const max = Math.max(...data.map(d => d.tasa));
  const barH = Math.min(28, (h - 40) / data.length);
  const pad = 10;
  const graphW = w - 100 - pad;
  const startX = 100;
  const startY = 20;
  const colors = ['#2563eb','#16a34a','#dc2626','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316'];

  data.forEach((d, i) => {
    const y = startY + i * (barH + 6);
    const barW = max > 0 ? (d.tasa / max) * graphW : 0;

    ctx.fillStyle = '#1e293b';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    const label = d.nombre.length > 12 ? d.nombre.slice(0, 11) + '…' : d.nombre;
    ctx.fillText(label, startX - 6, y + barH / 2 + 4);

    const gradient = ctx.createLinearGradient(startX, y, startX + barW, y);
    gradient.addColorStop(0, colors[i % colors.length]);
    gradient.addColorStop(1, colors[i % colors.length] + '80');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(startX, y, Math.max(barW, 2), barH, 4);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    if (barW > 50) ctx.fillText(formatearMoneda(d.tasa), startX + 6, y + barH / 2 + 4);
    else {
      ctx.fillStyle = '#64748b';
      ctx.fillText(formatearMoneda(d.tasa), startX + barW + 4, y + barH / 2 + 4);
    }
  });
}
