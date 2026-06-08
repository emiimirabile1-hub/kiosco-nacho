const carritoVenta = [];
let escanerActivo = false;
let streamCamara = null;
let videoEscaner = null;
let intervaloCodigo = null;
let ultimoCodigoDetectado = '';

function renderVentas() {
  const cajaAbierta = hayCajaAbierta();
  document.getElementById('ventaSinCajaMsg').style.display = cajaAbierta ? 'none' : 'block';
  document.getElementById('ventaContent').style.display = cajaAbierta ? 'block' : 'none';
  if (cajaAbierta) {
    renderProductosVenta();
    renderCarritoVenta();
  }
}

function renderProductosVenta() {
  const busqueda = document.getElementById('searchVenta').value.toLowerCase().trim();
  let prods = getProductos().filter(p => p.stock > 0);
  if (busqueda) {
    prods = prods.filter(
      p =>
        (p.nombre || '').toLowerCase().includes(busqueda) ||
        (p.codigoBarra || '').toLowerCase() === busqueda ||
        (p.categoria || '').toLowerCase().includes(busqueda)
    );
  }
  const el = document.getElementById('listaProductosVenta');
  if (!prods.length) {
    el.innerHTML =
      '<div class="empty-state"><div class="icon">🔍</div><p>No hay productos con stock disponible</p></div>';
    return;
  }
  el.innerHTML = prods
    .map(
      p => `
    <div class="producto-select-btn" onclick="agregarAlCarritoVenta(${p.id})">
      <div>
        <div class="nombre">${p.nombre}</div>
        <div class="stock">Stock: ${p.stock} ${p.codigoBarra ? '| <code>' + p.codigoBarra + '</code>' : ''}</div>
      </div>
      <div><span class="precio">$${formatearMoneda((p.precioVenta || 0))}</span></div>
    </div>`
    )
    .join('');
}

function buscarPorCodigoBarra() {
  const codigo = document.getElementById('barcodeInput').value.trim();
  if (!codigo) return;
  const prod = buscarYAgregarPorCodigo(codigo);
  if (!prod) document.getElementById('barcodeInput').value = codigo;
}

function buscarYAgregarPorCodigo(codigo) {
  const prods = getProductos().filter(p => p.stock > 0);
  const prod = prods.find(p => p.codigoBarra === codigo);
  if (prod) {
    agregarAlCarritoVenta(prod.id);
    document.getElementById('barcodeInput').value = '';
    return prod;
  }
  tryBuscarEnAPI(codigo);
  return null;
}

function tryBuscarEnAPI(codigo) {
  const btn = document.getElementById('barcodeInput');
  const original = btn.placeholder;
  btn.placeholder = '🔍 Buscando en base de datos abierta...';
  btn.disabled = true;

  fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json`)
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => {
      if (data.status !== 1 || !data.product) throw new Error('No encontrado');
      const p = data.product;
      const nombre = p.product_name || 'Producto';
      const categoria = p.categories_tags
        ? p.categories_tags.filter(c => c.startsWith('en:')).map(c => c.replace('en:', '')).join(', ')
        : '';
      const mensaje =
        '📦 Se encontró en la base de datos abierta:\n\n' +
        '• Producto: ' + (p.product_name || '—') + '\n' +
        '• Marca: ' + (p.brands || '—') + '\n' +
        '• Categoría: ' + (categoria || '—') + '\n' +
        '• Cantidad: ' + (p.quantity || '—') + '\n\n' +
        '¿Querés crear este producto ahora?\n(Después lo editás para poner precio y stock)';
      if (confirm(mensaje)) {
        const nuevo = {
          nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
          codigoBarra: codigo,
          categoria: categoria ? categoria.charAt(0).toUpperCase() + categoria.slice(1) : '',
          precioCompra: 0,
          precioVenta: 0,
          margen: getMargenPredeterminado(),
          stock: 0,
          stockMinimo: 5
        };
        guardarProducto(nuevo);
        agregarAlCarritoVenta(nuevo.id);
        document.getElementById('barcodeInput').value = '';
        alert('✅ Producto creado: ' + nuevo.nombre + '\n📝 No olvides editarle precio y stock desde Productos.');
      }
    })
    .catch(() => {
      alert('❌ Producto con código "' + codigo + '" no encontrado.\n💡 Creá el producto manualmente desde Productos.');
    })
    .finally(() => {
      btn.placeholder = original;
      btn.disabled = false;
    });
}

let callbackEscaner = null;

function abrirEscaner(callback) {
  callbackEscaner = typeof callback === 'function' ? callback : null;
  document.getElementById('modalEscaner').classList.add('show');
  document.getElementById('escanerStatus').textContent = '🔵 Solicitando cámara...';
  document.getElementById('escanerResultado').style.display = 'none';
  document.getElementById('escanerActions').style.display = 'none';
  iniciarEscaner();
}

function escanearCodigoProducto() {
  abrirEscaner(function(codigo) {
    document.getElementById('prodCodigoBarra').value = codigo;
    buscarProductoPorCodigo();
  });
}

function escanearCodigoCompra() {
  abrirEscaner(function(codigo) {
    const prod = getProductos().find(p => p.codigoBarra === codigo);
    if (prod) {
      document.getElementById('compraProductoSelect').value = prod.id;
      document.getElementById('compraPrecio').value = prod.precioCompra || '';
      document.getElementById('compraCantidad').value = 1;
    } else {
      alert('❌ Producto con código ' + codigo + ' no encontrado. Crealo desde Productos.');
    }
  });
}

function cerrarEscaner() {
  detenerEscaner();
  document.getElementById('modalEscaner').classList.remove('show');
}

async function iniciarEscaner() {
  const readerEl = document.getElementById('escanerReader');
  readerEl.innerHTML = '';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    document.getElementById('escanerStatus').textContent = '❌ Tu navegador no soporta la cámara. Usá la entrada manual.';
    return;
  }

  try {
    streamCamara = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });

    videoEscaner = document.createElement('video');
    videoEscaner.setAttribute('playsinline', '');
    videoEscaner.setAttribute('autoplay', '');
    videoEscaner.srcObject = streamCamara;
    videoEscaner.style.width = '100%';
    videoEscaner.style.maxWidth = '500px';
    videoEscaner.style.borderRadius = '8px';
    videoEscaner.style.display = 'block';
    videoEscaner.style.margin = '0 auto';
    readerEl.appendChild(videoEscaner);

    try { await videoEscaner.play(); } catch (e) {}

    document.getElementById('escanerStatus').textContent = '📷 Apuntá al código de barras';
    document.getElementById('escanerResultado').style.display = 'none';
    document.getElementById('escanerActions').style.display = 'flex';
    escanerActivo = true;

    // En Chrome/Edge usa BarcodeDetector, en Safari muestra ayuda manual
    if ('BarcodeDetector' in window) {
      intervaloCodigo = setInterval(capturarFrame, 500);
    } else {
      document.getElementById('escanerStatus').textContent = '📱 Tocá "📸 Capturar" cuando veas el código en pantalla';
    }

  } catch (err) {
    let msg = '❌ Error al acceder a la cámara';
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      msg += ': Permiso denegado. Andá a Ajustes > Safari > Cámara y permití el acceso.';
    } else if (err.name === 'NotFoundError') {
      msg += ': No se encontró la cámara trasera.';
    } else {
      msg += ': ' + err.message;
    }
    document.getElementById('escanerStatus').textContent = msg;
    document.getElementById('escanerActions').style.display = 'none';
  }
}

function capturarFrame() {
  if (!videoEscaner || !escanerActivo) return;
  const canvas = document.createElement('canvas');
  canvas.width = videoEscaner.videoWidth;
  canvas.height = videoEscaner.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEscaner, 0, 0);
  if (!('BarcodeDetector' in window)) return;
  const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'codabar'] });
  detector.detect(canvas).then(barcodes => {
    if (barcodes.length > 0 && barcodes[0].rawValue !== ultimoCodigoDetectado) {
      ultimoCodigoDetectado = barcodes[0].rawValue;
      escanerExitoso(barcodes[0].rawValue);
    }
  }).catch(() => {});
}

function capturarAhora() {
  if (!videoEscaner) return;
  const canvas = document.createElement('canvas');
  canvas.width = videoEscaner.videoWidth || 640;
  canvas.height = videoEscaner.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEscaner, 0, 0);
  document.getElementById('escanerStatus').textContent = '🔍 Buscando código en la imagen...';

  if ('BarcodeDetector' in window) {
    const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'codabar'] });
    detector.detect(canvas).then(barcodes => {
      if (barcodes.length > 0) {
        escanerExitoso(barcodes[0].rawValue);
      } else {
        document.getElementById('escanerStatus').textContent = '⚠️ No se leyó. Ajustá el enfoque y probá de nuevo.';
        pedirCodigoManual();
      }
    }).catch(() => pedirCodigoManual());
  } else {
    pedirCodigoManual();
  }
}

function pedirCodigoManual() {
  document.getElementById('escanerStatus').textContent = '✍️ Escribí el número del código de barras:';
  document.getElementById('escanerResultado').style.display = 'flex';
  document.getElementById('escanerResultado').innerHTML = `
    <input type="text" id="scanManualInput" placeholder="Ej: 7791234567890"
      style="flex:1;padding:10px;font-size:16px;font-family:monospace;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:var(--input-bg);color:var(--text)"
      autofocus onkeydown="if(event.key==='Enter')confirmarScanManual()" />
    <button class="btn btn-success" onclick="confirmarScanManual()">✅ Usar</button>
  `;
  document.getElementById('escanerActions').style.display = 'none';
  setTimeout(() => document.getElementById('scanManualInput')?.focus(), 150);
}

function confirmarScanManual() {
  const codigo = document.getElementById('scanManualInput')?.value.trim();
  if (!codigo) return alert('Ingresá un código');
  escanerExitoso(codigo);
}

function escanerExitoso(codigo) {
  detenerEscaner();
  document.getElementById('modalEscaner').classList.remove('show');
  if (typeof callbackEscaner === 'function') {
    callbackEscaner(codigo);
    callbackEscaner = null;
  } else {
    const encontrado = buscarYAgregarPorCodigo(codigo);
    if (encontrado) alert('✅ Producto: ' + encontrado.nombre);
  }
}

function detenerEscaner() {
  if (intervaloCodigo) { clearInterval(intervaloCodigo); intervaloCodigo = null; }
  if (streamCamara) {
    streamCamara.getTracks().forEach(t => t.stop());
    streamCamara = null;
  }
  const el = document.getElementById('escanerReader');
  if (el) el.innerHTML = '';
  videoEscaner = null;
  escanerActivo = false;
  ultimoCodigoDetectado = '';
}

function agregarAlCarritoVenta(id) {
  const p = getProducto(id);
  if (!p) return;
  const existente = carritoVenta.find(i => i.productoId === id);
  if (existente) {
    if (existente.cantidad >= p.stock) return alert('No hay suficiente stock');
    existente.cantidad++;
    existente.subtotal = existente.cantidad * existente.precioUnitario;
  } else {
    carritoVenta.push({
      productoId: id,
      nombre: p.nombre,
      cantidad: 1,
      precioUnitario: p.precioVenta,
      subtotal: p.precioVenta
    });
  }
  renderCarritoVenta();
}

function renderCarritoVenta() {
  const el = document.getElementById('carritoItems');
  const totalEl = document.getElementById('carritoTotal');
  if (!carritoVenta.length) {
    el.innerHTML =
      '<p style="color:var(--text-muted);text-align:center;padding:20px 0">El carrito está vacío<br><small>Seleccioná productos de la lista o escaneá un código</small></p>';
    totalEl.textContent = '$0';
    return;
  }
  el.innerHTML = carritoVenta
    .map(
      (i, idx) => `
    <div class="carrito-item">
      <div>
        <strong>${i.nombre}</strong><br>
        <small>${i.cantidad} x $${formatearMoneda(i.precioUnitario)}</small>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span>$${formatearMoneda(i.subtotal)}</span>
        <button class="btn-icon" onclick="quitarDelCarritoVenta(${idx})">❌</button>
      </div>
    </div>`
    )
    .join('');
  const total = carritoVenta.reduce((a, i) => a + i.subtotal, 0);
  totalEl.textContent = '$' + formatearMoneda(total);
}

function quitarDelCarritoVenta(idx) {
  carritoVenta.splice(idx, 1);
  renderCarritoVenta();
}

function confirmarVenta() {
  if (!hayCajaAbierta()) return alert('La caja está cerrada. Abrí la caja primero.');
  if (!carritoVenta.length) return alert('Agregá productos al carrito');
  const medio = document.getElementById('medioPago').value;
  const total = carritoVenta.reduce((a, i) => a + i.subtotal, 0);
  for (const item of carritoVenta) {
    const p = getProducto(item.productoId);
    if (!p || p.stock < item.cantidad)
      return alert(`Stock insuficiente para: ${item.nombre}`);
  }
  for (const item of carritoVenta) {
    const p = getProducto(item.productoId);
    p.stock -= item.cantidad;
    guardarProducto(p);
  }
  const transaccion = {
    tipo: 'venta',
    items: carritoVenta.map(i => ({ ...i })),
    total,
    medioPago: medio,
    detalle: `Venta - ${carritoVenta.length} producto(s)`
  };
  addTransaccion(transaccion);
  addMovimientoCaja(
    'venta',
    'Venta: ' + carritoVenta.map(i => `${i.nombre} x${i.cantidad}`).join(', '),
    total,
    medio
  );
  carritoVenta.length = 0;
  renderCarritoVenta();
  renderProductosVenta();
  actualizarHeaderCaja();
  alert('✅ Venta registrada con éxito');
}
