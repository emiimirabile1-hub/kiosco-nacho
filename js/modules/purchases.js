const carritoCompra = [];

function renderCompras() {
  const cajaAbierta = hayCajaAbierta();
  document.getElementById('compraSinCajaMsg').style.display = cajaAbierta
    ? 'none'
    : 'block';
  document.getElementById('compraContent').style.display = cajaAbierta
    ? 'block'
    : 'none';
  if (!cajaAbierta) return;
  const select = document.getElementById('compraProductoSelect');
  const prods = getProductos();
  select.innerHTML =
    `<option value="">-- Seleccionar existente --</option>` +
    prods
      .map(
        p =>
          `<option value="${p.id}" data-pcompra="${p.precioCompra || 0}">${p.nombre}</option>`
      )
      .join('') +
    `<option value="__nuevo">+ Crear producto nuevo</option>`;
  select.onchange = () => {
    const val = select.value;
    if (val === '__nuevo') {
      abrirModalProducto();
      select.value = '';
      return;
    }
    if (val) {
      const p = getProducto(parseInt(val));
      if (p) {
        document.getElementById('compraPrecio').value = p.precioCompra || '';
        document.getElementById('compraCantidad').value = 1;
      }
    }
  };
  renderCarritoCompraResumen();
}

function agregarItemCompra() {
  const select = document.getElementById('compraProductoSelect');
  const productoId = select.value;
  if (!productoId) return alert('Seleccioná o creá un producto');
  const cantidad = parseInt(document.getElementById('compraCantidad').value) || 1;
  const precio = parseFloat(document.getElementById('compraPrecio').value) || 0;
  if (cantidad < 1) return alert('La cantidad debe ser mayor a 0');
  const p = getProducto(parseInt(productoId));
  if (!p) return alert('Producto no encontrado');
  if (precio > 0) p.precioCompra = precio;
  const existente = carritoCompra.find(i => i.productoId === p.id);
  if (existente) {
    existente.cantidad += cantidad;
    existente.subtotal = existente.cantidad * existente.precioUnitario;
  } else {
    carritoCompra.push({
      productoId: p.id,
      nombre: p.nombre,
      cantidad,
      precioUnitario: p.precioCompra || precio,
      subtotal: (p.precioCompra || precio) * cantidad
    });
  }
  renderCarritoCompraResumen();
  select.value = '';
  document.getElementById('compraCantidad').value = 1;
  document.getElementById('compraPrecio').value = '';
}

function quitarItemCompra(idx) {
  carritoCompra.splice(idx, 1);
  renderCarritoCompraResumen();
}

function renderCarritoCompraResumen() {
  const el = document.getElementById('itemsCompraList');
  const resEl = document.getElementById('resumenCompraItems');
  const totalEl = document.getElementById('compraTotal');
  if (!carritoCompra.length) {
    const msg =
      '<p style="color:var(--text-muted)">Sin productos agregados</p>';
    el.innerHTML = msg;
    resEl.innerHTML = msg;
    totalEl.textContent = '$0';
    return;
  }
  const items = carritoCompra
    .map(
      (i, idx) => `
    <div class="carrito-item">
      <div>
        <strong>${i.nombre}</strong><br>
        <small>${i.cantidad} x $${formatearMoneda(i.precioUnitario)}</small>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span>$${formatearMoneda(i.subtotal)}</span>
        <button class="btn-icon" onclick="quitarItemCompra(${idx})">❌</button>
      </div>
    </div>`
    )
    .join('');
  el.innerHTML = items;
  resEl.innerHTML = items;
  const total = carritoCompra.reduce((a, i) => a + i.subtotal, 0);
  totalEl.textContent = '$' + formatearMoneda(total);
}

function confirmarCompra() {
  if (!hayCajaAbierta()) return alert('La caja está cerrada.');
  if (!carritoCompra.length) return alert('Agregá productos a la compra');
  const total = carritoCompra.reduce((a, i) => a + i.subtotal, 0);
  const proveedor =
    document.getElementById('compraProveedor').value.trim() || 'Sin proveedor';
  for (const item of carritoCompra) {
    const p = getProducto(item.productoId);
    if (p) {
      p.stock = (p.stock || 0) + item.cantidad;
      guardarProducto(p);
    }
  }
  const transaccion = {
    tipo: 'compra',
    items: carritoCompra.map(i => ({ ...i })),
    total,
    proveedor,
    detalle: `Compra - ${carritoCompra.length} producto(s)`
  };
  addTransaccion(transaccion);
  addMovimientoCaja(
    'compra',
    'Compra: ' + carritoCompra.map(i => `${i.nombre} x${i.cantidad}`).join(', '),
    total
  );
  carritoCompra.length = 0;
  renderCarritoCompraResumen();
  document.getElementById('compraProveedor').value = '';
  actualizarHeaderCaja();
  alert('📥 Ingreso registrado con éxito');
}
