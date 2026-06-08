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
          ? formatearNumero(((ganancia / p.precioCompra) * 100))
          : 0;
      let stockClass = 'badge-success';
      if (p.stock <= p.stockMinimo) stockClass = 'badge-danger';
      else if (p.stock <= p.stockMinimo * 2) stockClass = 'badge-warning';
      return `<tr>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.codigoBarra ? '<code style="font-size:11px">' + p.codigoBarra + '</code>' : '—'}</td>
        <td>${p.categoria || '—'}</td>
        <td>$${formatearMoneda((p.precioCompra || 0))}</td>
        <td>$${formatearMoneda((p.precioVenta || 0))}</td>
        <td>${margen}%</td>
        <td><span class="badge ${stockClass}">${p.stock}</span></td>
        <td>$${formatearMoneda(ganancia)}</td>
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

let modoPrecioActual = 'porcentaje';

function setModoPrecio(modo) {
  modoPrecioActual = modo;
  document.querySelectorAll('#modoPrecioToggle .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`#modoPrecioToggle .tab-btn[data-modo="${modo}"]`).classList.add('active');
  const hint = document.getElementById('modoPrecioHint');
  const btn = document.getElementById('btnAplicarMargen');
  if (modo === 'porcentaje') {
    hint.textContent = '💡 Cambiá precio compra o margen y el precio de venta se calcula solo';
    btn.textContent = '⚡ Calcular venta';
    onCambioCompra();
  } else {
    hint.textContent = '✏️ Cambiá precio compra o venta y el margen se calcula solo';
    btn.textContent = '⚡ Aplicar margen';
    onCambioPrecios();
  }
}

function onCambioCompra() {
  if (modoPrecioActual !== 'porcentaje') return;
  const pc = parseFloat(document.getElementById('prodPrecioCompra').value) || 0;
  const m = parseFloat(document.getElementById('prodMargen').value) || 0;
  if (pc > 0 && m > 0) {
    document.getElementById('prodPrecioVenta').value = (pc * (1 + m / 100)).toFixed(2);
  }
}

function onCambioMargen() {
  if (modoPrecioActual !== 'porcentaje') return;
  const pc = parseFloat(document.getElementById('prodPrecioCompra').value) || 0;
  const m = parseFloat(document.getElementById('prodMargen').value) || 0;
  if (pc > 0 && m > 0) {
    document.getElementById('prodPrecioVenta').value = (pc * (1 + m / 100)).toFixed(2);
  }
}

function onCambioPrecios() {
  const pc = parseFloat(document.getElementById('prodPrecioCompra').value) || 0;
  const pv = parseFloat(document.getElementById('prodPrecioVenta').value) || 0;
  if (pc > 0 && pv > 0) {
    const m = ((pv - pc) / pc) * 100;
    document.getElementById('prodMargen').value = Math.round(m);
  }
}

function aplicarMargen() {
  if (modoPrecioActual === 'porcentaje') {
    const pc = parseFloat(document.getElementById('prodPrecioCompra').value) || 0;
    const m = parseFloat(document.getElementById('prodMargen').value) || 0;
    if (pc > 0 && m > 0) {
      document.getElementById('prodPrecioVenta').value = (pc * (1 + m / 100)).toFixed(2);
    } else {
      alert('Completá precio de compra y margen');
    }
  } else {
    const pc = parseFloat(document.getElementById('prodPrecioCompra').value) || 0;
    const pv = parseFloat(document.getElementById('prodPrecioVenta').value) || 0;
    if (pc > 0 && pv > 0) {
      const m = ((pv - pc) / pc) * 100;
      document.getElementById('prodMargen').value = Math.round(m);
    } else {
      alert('Completá precio de compra y venta');
    }
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
  document.getElementById('prodMargen').value = producto
    ? producto.margen || getMargenPredeterminado()
    : getMargenPredeterminado();
  document.getElementById('prodPrecioVenta').value = producto ? producto.precioVenta || '' : '';
  document.getElementById('prodStock').value = producto ? producto.stock || 0 : 0;
  document.getElementById('prodStockMinimo').value = producto ? producto.stockMinimo || 5 : 5;
  document.getElementById('modalProducto').classList.add('show');
  if (producto) calcularMargen();
}

function guardarProductoForm() {
  const nombre = document.getElementById('prodNombre').value.trim();
  if (!nombre) return alert('El nombre del producto es obligatorio');
  const margen = parseFloat(document.getElementById('prodMargen').value) || 0;
  const precioCompra = parseFloat(document.getElementById('prodPrecioCompra').value) || 0;
  const precioVenta = parseFloat(document.getElementById('prodPrecioVenta').value) || 0;
  const p = {
    id: editandoProductoId,
    nombre,
    codigoBarra: document.getElementById('prodCodigoBarra').value.trim(),
    categoria: document.getElementById('prodCategoria').value.trim(),
    precioCompra,
    precioVenta,
    margen,
    stock: parseInt(document.getElementById('prodStock').value) || 0,
    stockMinimo: parseInt(document.getElementById('prodStockMinimo').value) || 5
  };
  guardarProducto(p);
  cerrarModal('modalProducto');
  editandoProductoId = null;
  renderProductos();
}

function autoCategoria(texto) {
  const t = (texto || '').toLowerCase();
  const mapa = [
    { palabras: ['beer','cerveza','cerveza','birra'], cat: 'Bebidas' },
    { palabras: ['soda','gaseosa','cola','refresco','soft drink','bebida','drink','jugo','juice','nectar','agua','water','mineral','energetic','energy','isotonic','te','té','mate','yerba'], cat: 'Bebidas' },
    { palabras: ['galleta','cookies','biscuit','cracker','wafer','oblea'], cat: 'Galletitas' },
    { palabras: ['snack','chips','papas','palitos','mani','peanut','cacahuate','pretzel','popcorn','pochoclo'], cat: 'Snacks' },
    { palabras: ['golosina','candy','caramel','dulce','chocolate','bonbon','alfajor','chicle','gum','gomita','marshmallow','caramelo'], cat: 'Golosinas' },
    { palabras: ['pan','bread','bizcocho','medialuna','factura','tostada','panettone','brioche'], cat: 'Panadería' },
    { palabras: ['alfajor'], cat: 'Alfajores' },
    { palabras: ['helado','ice cream','icecream','paleta','polo'], cat: 'Helados' },
    { palabras: ['lacteo','dairy','leche','milk','yogur','yogurt','queso','cheese','crema','manteca','dulce de leche'], cat: 'Lácteos' },
    { palabras: ['fideo','pasta','spaghetti','fideo','tallarin','guiso','arroz','rice','harina','flour'], cat: 'Almacén' },
    { palabras: ['conserva','can','lata','pickle','encurtido','aceituna','oliva'], cat: 'Conservas' },
    { palabras: ['aderezo','salsa','dressing','ketchup','mayonesa','mostaza','pesto'], cat: 'Aderezos' },
    { palabras: ['congelado','frozen','milanesa','nugget','hamburguesa','papa frita'], cat: 'Congelados' }
  ];
  const resultado = mapa.find(m => m.palabras.some(p => t.includes(p)));
  return resultado ? resultado.cat : '';
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
      const catRaw = p.categories_tags ? p.categories_tags
        .filter(c => c.startsWith('en:'))
        .map(c => c.replace('en:', ''))
        .join(', ') : '';
      const cantidad = p.quantity || '';
      const catTags = (p.categories_tags || []).map(c => c.replace(/^(en|es):/, '')).join(' ');

      if (nombre) document.getElementById('prodNombre').value = nombre.charAt(0).toUpperCase() + nombre.slice(1);

      const autoCat = autoCategoria(catTags + ' ' + catRaw);
      if (autoCat) {
        document.getElementById('prodCategoria').value = autoCat;
      } else if (catRaw) {
        document.getElementById('prodCategoria').value = catRaw.charAt(0).toUpperCase() + catRaw.slice(1);
      }

      let info = '✅ Datos encontrados:\n';
      if (nombre) info += '• Producto: ' + nombre + '\n';
      if (marca) info += '• Marca: ' + marca + '\n';
      if (autoCat) info += '• Categoría: ' + autoCat + '\n';
      else if (catRaw) info += '• Categoría: ' + catRaw + '\n';
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
