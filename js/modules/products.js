let editandoProductoId = null;

function renderProductos() {
  const busqueda = document.getElementById('searchProductos').value.toLowerCase();
  let prods = getProductos();
  if (busqueda)
    prods = prods.filter(
      p =>
        (p.nombre || '').toLowerCase().includes(busqueda) ||
        (p.categoria || '').toLowerCase().includes(busqueda) ||
        (p.codigoBarra || '').toLowerCase().includes(busqueda)
    );
  const tbody = document.getElementById('productosTable');
  if (!prods.length) {
    tbody.innerHTML =
      '<tr><td colspan="9"><div class="empty-state"><div class="icon">📦</div><p>No hay productos. ¡Agregá el primero!</p></div></td></tr>';
    return;
  }
  const esCajera = esRol('cajera');
  tbody.innerHTML = prods
    .map(p => {
      const ganancia = (p.precioVenta || 0) - (p.precioCompra || 0);
      const margen =
        p.precioCompra > 0
          ? ((ganancia / p.precioCompra) * 100).toFixed(0)
          : 0;
      let stockClass = 'badge-success';
      if (p.stock <= p.stockMinimo) stockClass = 'badge-danger';
      else if (p.stock <= p.stockMinimo * 2) stockClass = 'badge-warning';
      return `<tr>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.codigoBarra ? '<code style="font-size:11px">' + p.codigoBarra + '</code>' : '—'}</td>
        <td>${p.categoria || '—'}</td>
        <td>$${(p.precioCompra || 0).toFixed(2)}</td>
        <td>$${(p.precioVenta || 0).toFixed(2)}</td>
        <td>${margen}%</td>
        <td><span class="badge ${stockClass}">${p.stock}</span></td>
        <td>$${ganancia.toFixed(2)}</td>
        <td>${
          esCajera
            ? '<span style="color:var(--text-muted);font-size:11px">solo lectura</span>'
            : `<button class="btn-icon" onclick="editarProducto(${p.id})" title="Editar">✏️</button>
               <button class="btn-icon" onclick="preguntarEliminarProducto(${p.id})" title="Eliminar">🗑️</button>`
        }</td>
      </tr>`;
    })
    .join('');
}

function toggleModoPrecio() {
  const auto = document.getElementById('prodAutoPrice').checked;
  document.getElementById('prodMargen').disabled = !auto;
  document.getElementById('prodPrecioVenta').readOnly = auto;
  if (auto) recalcularPrecioVenta();
}

function recalcularPrecioVenta() {
  const precioCompra = parseFloat(document.getElementById('prodPrecioCompra').value) || 0;
  const margen = parseFloat(document.getElementById('prodMargen').value) || 0;
  if (precioCompra > 0 && margen > 0) {
    const precioVenta = precioCompra * (1 + margen / 100);
    document.getElementById('prodPrecioVenta').value = precioVenta.toFixed(2);
  }
}

function recalcularMargen() {
  const precioCompra = parseFloat(document.getElementById('prodPrecioCompra').value) || 0;
  const precioVenta = parseFloat(document.getElementById('prodPrecioVenta').value) || 0;
  if (precioCompra > 0 && precioVenta > 0) {
    const margen = ((precioVenta - precioCompra) / precioCompra) * 100;
    document.getElementById('prodMargen').value = Math.round(margen);
  }
}

function abrirModalProducto(producto) {
  editandoProductoId = producto ? producto.id : null;
  document.getElementById('modalProductoTitulo').textContent = producto
    ? 'Editar Producto'
    : 'Nuevo Producto';
  document.getElementById('prodNombre').value = producto ? producto.nombre : '';
  document.getElementById('prodCodigoBarra').value = producto ? producto.codigoBarra || '' : '';
  document.getElementById('prodCategoria').value = producto ? producto.categoria || '' : '';
  document.getElementById('prodPrecioCompra').value = producto ? producto.precioCompra || '' : '';

  const modoAuto = producto ? (producto.autoPrecio !== false) : true;
  document.getElementById('prodAutoPrice').checked = modoAuto;
  toggleModoPrecio();

  if (modoAuto) {
    document.getElementById('prodMargen').value = producto
      ? producto.margen || getMargenPredeterminado()
      : getMargenPredeterminado();
    document.getElementById('prodPrecioVenta').value = producto ? producto.precioVenta || '' : '';
  } else {
    document.getElementById('prodMargen').value = producto
      ? producto.margen || getMargenPredeterminado()
      : getMargenPredeterminado();
    document.getElementById('prodPrecioVenta').value = producto ? producto.precioVenta || '' : '';
  }
  document.getElementById('prodStock').value = producto ? producto.stock || 0 : 0;
  document.getElementById('prodStockMinimo').value = producto ? producto.stockMinimo || 5 : 5;
  document.getElementById('modalProducto').classList.add('show');
  if (!producto && modoAuto) recalcularPrecioVenta();
}

function guardarProductoForm() {
  const nombre = document.getElementById('prodNombre').value.trim();
  if (!nombre) return alert('El nombre del producto es obligatorio');
  const auto = document.getElementById('prodAutoPrice').checked;
  const margen = parseFloat(document.getElementById('prodMargen').value) || 0;
  const precioCompra = parseFloat(document.getElementById('prodPrecioCompra').value) || 0;
  let precioVenta = parseFloat(document.getElementById('prodPrecioVenta').value) || 0;
  if (auto && precioCompra > 0 && margen > 0 && precioVenta === 0) {
    precioVenta = precioCompra * (1 + margen / 100);
  }
  const p = {
    id: editandoProductoId,
    nombre,
    codigoBarra: document.getElementById('prodCodigoBarra').value.trim(),
    categoria: document.getElementById('prodCategoria').value.trim(),
    precioCompra,
    precioVenta,
    margen,
    autoPrecio: auto,
    stock: parseInt(document.getElementById('prodStock').value) || 0,
    stockMinimo: parseInt(document.getElementById('prodStockMinimo').value) || 5
  };
  guardarProducto(p);
  cerrarModal('modalProducto');
  editandoProductoId = null;
  renderProductos();
}

function buscarProductoPorCodigo() {
  const codigo = document.getElementById('prodCodigoBarra').value.trim();
  if (!codigo || codigo.length < 8) return alert('Ingresá un código de barras válido (mín 8 dígitos)');

  const existente = getProductos().find(p => p.codigoBarra === codigo && p.id !== editandoProductoId);
  if (existente) {
    if (!confirm(`⚠️ El código "${codigo}" ya pertenece a "${existente.nombre}". ¿Cargar ese producto?`)) return;
    abrirModalProducto(existente);
    return;
  }

  const btn = document.getElementById('btnBuscarBarcode');
  const original = btn.innerHTML;
  btn.innerHTML = '⏳ Buscando...';
  btn.disabled = true;

  fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json`)
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => {
      if (data.status !== 1 || !data.product) throw new Error('Producto no encontrado en la base de datos abierta');
      const p = data.product;
      const nombre = p.product_name || '';
      const marca = p.brands || '';
      const categoria = p.categories_tags ? p.categories_tags
        .filter(c => c.startsWith('en:'))
        .map(c => c.replace('en:', ''))
        .join(', ') : '';
      const cantidad = p.quantity || '';

      if (nombre) document.getElementById('prodNombre').value = nombre.charAt(0).toUpperCase() + nombre.slice(1);
      if (categoria) document.getElementById('prodCategoria').value = categoria.charAt(0).toUpperCase() + categoria.slice(1);

      let info = '✅ Datos encontrados:\n';
      if (nombre) info += '• Producto: ' + nombre + '\n';
      if (marca) info += '• Marca: ' + marca + '\n';
      if (categoria) info += '• Categoría: ' + categoria + '\n';
      if (cantidad) info += '• Cantidad: ' + cantidad + '\n';
      if (p.image_url) info += '\n📷 Hay imagen disponible (ver en openfoodfacts.org)';
      alert(info);
    })
    .catch(err => {
      if (err.message.includes('HTTP') || err.message.includes('no encontrado')) {
        alert('❌ No se encontró el producto "' + codigo + '" en la base de datos abierta.\n\n💡 Cargá los datos manualmente.');
      } else {
        alert('❌ Error de conexión: ' + err.message + '\n\n💡 Cargá los datos manualmente.');
      }
    })
    .finally(() => {
      btn.innerHTML = original;
      btn.disabled = false;
    });
}

function editarProducto(id) {
  const p = getProducto(id);
  if (p) abrirModalProducto(p);
}

function preguntarEliminarProducto(id) {
  const p = getProducto(id);
  mostrarConfirmacion(
    `Eliminar "${p.nombre}"`,
    '¿Estás seguro? Este producto se eliminará del catálogo.',
    () => ejecutarEliminarProducto(id)
  );
}

function ejecutarEliminarProducto(id) {
  eliminarProducto(id);
  renderProductos();
}
