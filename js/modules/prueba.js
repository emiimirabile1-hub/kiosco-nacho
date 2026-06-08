function generarDatosPrueba() {
  try {
    if (!confirm('🧪 ¿Generar datos de prueba? Se agregarán productos, ventas y compras simuladas de un kiosco escolar funcionando durante 30 días.')) return;

    // Abrir caja si no está abierta
    if (!hayCajaAbierta()) {
      abrirSesionCaja(5000);
    }

    const productosBase = [
      { nombre: 'Alfajor Tofi', categoria: 'Alfajores', precioCompra: 180, precioVenta: 350, margen: 94, stock: 45, stockMinimo: 10 },
      { nombre: 'Alfajor Jorgito', categoria: 'Alfajores', precioCompra: 150, precioVenta: 300, margen: 100, stock: 30, stockMinimo: 8 },
      { nombre: 'Alfajor Guaymallén', categoria: 'Alfajores', precioCompra: 120, precioVenta: 250, margen: 108, stock: 60, stockMinimo: 15 },
      { nombre: 'Coca-Cola 500ml', categoria: 'Bebidas', precioCompra: 250, precioVenta: 500, margen: 100, stock: 80, stockMinimo: 20 },
      { nombre: 'Sprite 500ml', categoria: 'Bebidas', precioCompra: 250, precioVenta: 500, margen: 100, stock: 40, stockMinimo: 10 },
      { nombre: 'Agua Mineral 500ml', categoria: 'Bebidas', precioCompra: 120, precioVenta: 250, margen: 108, stock: 50, stockMinimo: 12 },
      { nombre: 'Jugo Tang Naranja', categoria: 'Bebidas', precioCompra: 80, precioVenta: 200, margen: 150, stock: 70, stockMinimo: 15 },
      { nombre: 'Galletitas Oreo', categoria: 'Galletitas', precioCompra: 200, precioVenta: 400, margen: 100, stock: 35, stockMinimo: 8 },
      { nombre: 'Galletitas Pepitos', categoria: 'Galletitas', precioCompra: 160, precioVenta: 320, margen: 100, stock: 25, stockMinimo: 6 },
      { nombre: 'Galletitas Sonrisas', categoria: 'Galletitas', precioCompra: 100, precioVenta: 200, margen: 100, stock: 40, stockMinimo: 10 },
      { nombre: 'Papas Lay\'s 60g', categoria: 'Snacks', precioCompra: 220, precioVenta: 450, margen: 105, stock: 30, stockMinimo: 8 },
      { nombre: 'Papas Pringles', categoria: 'Snacks', precioCompra: 350, precioVenta: 700, margen: 100, stock: 20, stockMinimo: 5 },
      { nombre: 'Palitos Salados', categoria: 'Snacks', precioCompra: 80, precioVenta: 180, margen: 125, stock: 50, stockMinimo: 12 },
      { nombre: 'Chocolate Milka', categoria: 'Golosinas', precioCompra: 250, precioVenta: 500, margen: 100, stock: 25, stockMinimo: 6 },
      { nombre: 'Caramelos Menthoplus', categoria: 'Golosinas', precioCompra: 50, precioVenta: 120, margen: 140, stock: 100, stockMinimo: 20 },
      { nombre: 'Chicles Beldent', categoria: 'Golosinas', precioCompra: 60, precioVenta: 150, margen: 150, stock: 80, stockMinimo: 15 },
      { nombre: 'Turrón Águila', categoria: 'Golosinas', precioCompra: 100, precioVenta: 250, margen: 150, stock: 45, stockMinimo: 10 },
      { nombre: 'Medialuna Individual', categoria: 'Panadería', precioCompra: 80, precioVenta: 200, margen: 150, stock: 0, stockMinimo: 10 },
      { nombre: 'Pan de Molde', categoria: 'Panadería', precioCompra: 200, precioVenta: 400, margen: 100, stock: 10, stockMinimo: 4 },
      { nombre: 'Yogur Bebible Ser', categoria: 'Lácteos', precioCompra: 120, precioVenta: 250, margen: 108, stock: 25, stockMinimo: 8 },
    ];

    const proveedores = ['Distribuidora Central', 'Golosinas SRL', 'Bebidas del Sur', 'Snacks SA', 'Panadería La Esquina'];

    // Guardar productos y recolectar IDs
    const idsCreados = [];
    let contadorNuevos = 0;
    productosBase.forEach(p => {
      const existente = getProductos().find(x => x.nombre === p.nombre);
      if (existente) {
        idsCreados.push(existente.id);
      } else {
        const nuevo = { ...p, id: undefined, codigoBarra: '' };
        guardarProducto(nuevo);
        idsCreados.push(nuevo.id);
        contadorNuevos++;
      }
    });

    if (idsCreados.length === 0) {
      alert('No hay productos base para crear. Raro...');
      return;
    }

    // Generar transacciones de los últimos 30 días
    const hoy = new Date();
    let ventasCreadas = 0;
    let comprasCreadas = 0;

    for (let d = 29; d >= 0; d--) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - d);
      fecha.setHours(8 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

      // Días sin venta (findes, etc)
      if (d > 0 && Math.random() < 0.15) continue;

      // 3 a 10 ventas por día
      const cantVentas = 3 + Math.floor(Math.random() * 8);
      for (let v = 0; v < cantVentas; v++) {
        const cantItems = 1 + Math.floor(Math.random() * 3);
        const items = [];
        for (let i = 0; i < cantItems; i++) {
          const prodId = idsCreados[Math.floor(Math.random() * idsCreados.length)];
          const prod = getProducto(prodId);
          if (!prod) continue;
          const cantidad = 1 + Math.floor(Math.random() * 3);
          items.push({
            productoId: prod.id,
            nombre: prod.nombre,
            cantidad,
            precioUnitario: prod.precioVenta || 100,
            subtotal: (prod.precioVenta || 100) * cantidad
          });
          prod.stock = Math.max(0, (prod.stock || 0) - cantidad);
          guardarProducto(prod);
        }
        if (!items.length) continue;
        const total = items.reduce((a, i) => a + i.subtotal, 0);
        const medios = ['efectivo','efectivo','efectivo','efectivo','tarjeta','tarjeta','transferencia'];
        const medioPago = medios[Math.floor(Math.random() * medios.length)];
        const t = {
          tipo: 'venta',
          items,
          total,
          medioPago,
          detalle: 'Venta: ' + items.map(i => i.nombre).join(', '),
          fecha: fecha.toISOString()
        };
        addTransaccion(t);
        addMovimientoCaja('venta', t.detalle, total, medioPago);
        ventasCreadas++;
      }

      // 1 compra cada 3 días
      if (d % 3 === 0) {
        const cantItems = 2 + Math.floor(Math.random() * 4);
        const items = [];
        for (let i = 0; i < cantItems; i++) {
          const prodId = idsCreados[Math.floor(Math.random() * idsCreados.length)];
          const prod = getProducto(prodId);
          if (!prod) continue;
          const cantidad = 5 + Math.floor(Math.random() * 20);
          items.push({
            productoId: prod.id,
            nombre: prod.nombre,
            cantidad,
            precioUnitario: prod.precioCompra || 100,
            subtotal: (prod.precioCompra || 100) * cantidad
          });
          prod.stock = (prod.stock || 0) + cantidad;
          guardarProducto(prod);
        }
        if (!items.length) continue;
        const total = items.reduce((a, i) => a + i.subtotal, 0);
        const compraFecha = new Date(fecha);
        compraFecha.setHours(7 + Math.floor(Math.random() * 3), 0, 0, 0);
        const t = {
          tipo: 'compra',
          items,
          total,
          proveedor: proveedores[Math.floor(Math.random() * proveedores.length)],
          detalle: 'Compra: ' + items.map(i => i.nombre).join(', '),
          fecha: compraFecha.toISOString()
        };
        addTransaccion(t);
        addMovimientoCaja('compra', t.detalle, total);
        comprasCreadas++;
      }
    }

    // Refrescar vistas
    const paginaActiva = document.querySelector('.page.active');
    if (paginaActiva) {
      const idPagina = paginaActiva.id.replace('page-', '');
      renderPage(idPagina);
    }

    alert('✅ Datos de prueba generados:\n' +
      '• ' + contadorNuevos + ' productos nuevos creados\n' +
      '• ' + ventasCreadas + ' ventas simuladas (~30 días)\n' +
      '• ' + comprasCreadas + ' compras a proveedores\n' +
      '• Caja abierta con $5,000\n\n' +
      '🧹 Podés borrar todo desde Config > "Borrar todos los datos"');

  } catch (e) {
    alert('❌ Error al generar datos: ' + e.message + '\n\nAvisale al desarrollador.');
    console.error(e);
  }
}
