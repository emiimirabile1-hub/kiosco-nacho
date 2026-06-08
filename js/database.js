const DB_KEY = 'kiosco_nacho';

let _data = null;

function datosIniciales() {
  return {
    productos: [],
    sesionCaja: null,
    historialCierres: [],
    transacciones: [],
    proximoId: 1,
    margenPredeterminado: 30
  };
}

function initData() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    _data = raw ? JSON.parse(raw) : datosIniciales();
  } catch (e) {
    _data = datosIniciales();
  }
  if (!_data.productos || !_data.transacciones) {
    _data = datosIniciales();
  }
  saveData();
}

function saveData() {
  localStorage.setItem(DB_KEY, JSON.stringify(_data));
}

function nuevoId() {
  return _data.proximoId++;
}

// --- PRODUCTOS ---
function getProductos() {
  return _data.productos;
}

function getProducto(id) {
  return _data.productos.find(p => p.id === id) || null;
}

function guardarProducto(p) {
  if (p.id === undefined || p.id === null) {
    p.id = nuevoId();
    _data.productos.push(p);
  } else {
    const idx = _data.productos.findIndex(x => x.id === p.id);
    if (idx >= 0) _data.productos[idx] = p;
  }
  saveData();
}

function eliminarProducto(id) {
  _data.productos = _data.productos.filter(p => p.id !== id);
  saveData();
}

// --- TRANSACCIONES ---
function getTransacciones() {
  return _data.transacciones;
}

function addTransaccion(t) {
  t.id = nuevoId();
  t.fecha = t.fecha || new Date().toISOString();
  _data.transacciones.push(t);
  saveData();
  return t;
}

function getTransaccionesFiltro(tipo, limit) {
  let txs = _data.transacciones;
  if (tipo && tipo !== 'todos') txs = txs.filter(x => x.tipo === tipo);
  txs = [...txs].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (limit) txs = txs.slice(0, limit);
  return txs;
}

// --- CAJA ---
function getSesionCaja() {
  return _data.sesionCaja;
}

function hayCajaAbierta() {
  return _data.sesionCaja && !_data.sesionCaja.cerrada;
}

function abrirSesionCaja(montoInicial) {
  const s = {
    id: nuevoId(),
    fechaApertura: new Date().toISOString(),
    montoInicial,
    cerrada: null,
    movimientos: []
  };
  s.movimientos.push({
    tipo: 'apertura',
    detalle: 'Apertura de caja',
    monto: montoInicial,
    ingreso: montoInicial,
    egreso: 0,
    saldo: montoInicial,
    fecha: new Date().toISOString()
  });
  _data.sesionCaja = s;
  saveData();
  return s;
}

function cerrarSesionCaja(montoFinal, observacion) {
  if (!_data.sesionCaja) return;
  const s = _data.sesionCaja;
  s.cerrada = {
    fechaCierre: new Date().toISOString(),
    montoFinal,
    observacion
  };
  _data.historialCierres.push({
    fechaApertura: s.fechaApertura,
    fechaCierre: s.cerrada.fechaCierre,
    montoInicial: s.montoInicial,
    montoFinal,
    ingresos: calcularIngresosCaja(s),
    egresos: calcularEgresosCaja(s)
  });
  _data.sesionCaja = null;
  saveData();
}

function addMovimientoCaja(tipo, detalle, monto) {
  const s = _data.sesionCaja;
  if (!s) return;
  const ultimoSaldo = s.movimientos.length
    ? s.movimientos[s.movimientos.length - 1].saldo
    : 0;
  let ingreso = 0, egreso = 0;
  if (['apertura', 'venta', 'ingreso_extra'].includes(tipo)) {
    ingreso = monto;
  } else {
    egreso = monto;
  }
  const mov = {
    tipo,
    detalle,
    monto,
    ingreso,
    egreso,
    saldo: ultimoSaldo + ingreso - egreso,
    fecha: new Date().toISOString()
  };
  s.movimientos.push(mov);
  saveData();
}

function getMovimientosCaja() {
  if (!_data.sesionCaja) return [];
  return _data.sesionCaja.movimientos;
}

function calcularIngresosCaja(s) {
  return s.movimientos
    .filter(m => m.tipo === 'venta' || m.tipo === 'ingreso_extra' || m.tipo === 'apertura')
    .reduce((a, m) => a + m.monto, 0);
}

function calcularEgresosCaja(s) {
  return s.movimientos
    .filter(m => m.tipo === 'compra' || m.tipo === 'gasto_extra')
    .reduce((a, m) => a + m.monto, 0);
}

function saldoCajaActual() {
  const s = _data.sesionCaja;
  if (!s || !s.movimientos.length) return 0;
  return s.movimientos[s.movimientos.length - 1].saldo;
}

function totalVentasCaja() {
  const s = _data.sesionCaja;
  if (!s) return 0;
  return s.movimientos
    .filter(m => m.tipo === 'venta')
    .reduce((a, m) => a + m.monto, 0);
}

function totalComprasCaja() {
  const s = _data.sesionCaja;
  if (!s) return 0;
  return s.movimientos
    .filter(m => m.tipo === 'compra')
    .reduce((a, m) => a + m.monto, 0);
}

function obtenerJSONRespaldo() {
  return JSON.stringify(_data, null, 2);
}

function importarDatos(json) {
  const data = JSON.parse(json);
  if (!data.productos || data.transacciones === undefined) {
    throw new Error('Formato inválido');
  }
  _data = data;
  saveData();
  return true;
}

function borrarTodosLosDatos() {
  _data = datosIniciales();
  saveData();
}

function getHistorialCierres() {
  return _data.historialCierres || [];
}

function getMargenPredeterminado() {
  return _data.margenPredeterminado !== undefined ? _data.margenPredeterminado : 30;
}

function setMargenPredeterminado(valor) {
  _data.margenPredeterminado = valor;
  saveData();
}
