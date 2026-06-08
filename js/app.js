// ==================== INIT ====================
initData();

// ==================== DARK MODE ====================
function getTema() {
  return localStorage.getItem('kiosco_tema') || 'light';
}

function setTema(tema) {
  localStorage.setItem('kiosco_tema', tema);
  document.documentElement.setAttribute('data-theme', tema);
  const icon = document.getElementById('darkModeIcon');
  if (icon) icon.textContent = tema === 'dark' ? '☀️' : '🌙';
}

function toggleTema() {
  const actual = getTema();
  setTema(actual === 'dark' ? 'light' : 'dark');
}

// ==================== MODALES ====================
function cerrarModal(id) {
  document.getElementById(id).classList.remove('show');
}

// ==================== CONFIRMACION ====================
let accionConfirmada = null;

function mostrarConfirmacion(titulo, mensaje, accion) {
  document.getElementById('confirmarTitulo').textContent = titulo;
  document.getElementById('confirmarMensaje').textContent = mensaje;
  accionConfirmada = accion;
  document.getElementById('modalConfirmar').classList.add('show');
}

function confirmarAccion() {
  if (typeof accionConfirmada === 'function') {
    accionConfirmada();
  }
  accionConfirmada = null;
  cerrarModal('modalConfirmar');
}

// ==================== FECHA ====================
function formatearFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ==================== HEADER ====================
function actualizarHeaderCaja() {
  const user = getUsuarioActual();
  if (!user) return;
  const abierta = hayCajaAbierta();
  const dot = document.getElementById('cajaDot');
  const text = document.getElementById('cajaStatusText');
  const monto = document.getElementById('cajaMontoHeader');
  if (dot) dot.className = 'dot ' + (abierta ? 'open' : 'closed');
  if (text) text.textContent = abierta ? 'Caja abierta' : 'Caja cerrada';
  if (monto) monto.textContent = '$' + (abierta ? saldoCajaActual().toFixed(2) : '0');
}

function actualizarReloj() {
  const el = document.getElementById('reloj');
  if (el)
    el.textContent = new Date().toLocaleString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
}

// ==================== NAVEGACION ====================
function navegar(page) {
  if (!tieneAcceso(page)) {
    alert('No tenés acceso a esta sección');
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if (btn) btn.classList.add('active');
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');
  renderPage(page);
}

function renderPage(page) {
  switch (page) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'productos':
      renderProductos();
      break;
    case 'ventas':
      renderVentas();
      break;
    case 'compras':
      renderCompras();
      break;
    case 'caja':
      renderCaja();
      break;
    case 'historial':
      renderHistorial();
      break;
    case 'config':
      renderConfig();
      break;
    case 'proyecciones':
      renderProyecciones();
      break;
  }
}

// ==================== LOGIN ====================
function mostrarLogin() {
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('loginUsuario').value = '';
  document.getElementById('loginContraseña').value = '';
  document.getElementById('loginUsuario').focus();
}

function ocultarLogin() {
  document.getElementById('loginOverlay').classList.add('hidden');
}

function intentarLogin() {
  const usuario = document.getElementById('loginUsuario').value.trim();
  const contraseña = document.getElementById('loginContraseña').value;
  const errorEl = document.getElementById('loginError');
  if (!usuario || !contraseña) {
    errorEl.textContent = 'Completá todos los campos';
    errorEl.style.display = 'block';
    return;
  }
  if (iniciarSesion(usuario, contraseña)) {
    errorEl.style.display = 'none';
    ocultarLogin();
    iniciarApp();
  } else {
    errorEl.textContent = 'Usuario o contraseña incorrectos';
    errorEl.style.display = 'block';
  }
}

function cerrarSesionApp() {
  cerrarSesion();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  mostrarLogin();
}

// ==================== APP INIT ====================
function iniciarApp() {
  const user = getUsuarioActual();
  if (!user) return;

  document.getElementById('userNombre').textContent = user.usuario;
  document.getElementById('userRol').textContent =
    user.rol === 'admin' ? 'Admin' : 'Cajera';

  // Mostrar/ocultar según rol
  const adminItems = ['compras', 'caja', 'config', 'proyecciones'];
  adminItems.forEach(mod => {
    document.querySelectorAll(`.nav-btn[data-page="${mod}"], .nav-item[data-page="${mod}"]`).forEach(el => {
      el.style.display = tieneAcceso(mod) ? '' : 'none';
    });
  });

  setTema(getTema());
  actualizarReloj();
  setInterval(actualizarReloj, 1000);
  actualizarHeaderCaja();

  // Ir al dashboard
  navegar('dashboard');
}

// ==================== EVENTOS ====================
// Navegacion - sidebar
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navegar(btn.dataset.page));
});
// Navegacion - bottom nav
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => navegar(item.dataset.page));
});

// Login
document.getElementById('loginBtn').addEventListener('click', intentarLogin);
document.getElementById('loginContraseña').addEventListener('keydown', e => {
  if (e.key === 'Enter') intentarLogin();
});

// Cerrar sesion
document.getElementById('logoutBtn').addEventListener('click', cerrarSesionApp);

// Dark mode
document.getElementById('darkModeBtn').addEventListener('click', toggleTema);
document.getElementById('darkModeToggleLogin').addEventListener('click', toggleTema);

// Caja status click -> ir a caja
document.getElementById('cajaStatus').addEventListener('click', () => navegar('caja'));

// Cierre de modales con click fuera
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => {
    if (e.target === el) el.classList.remove('show');
  });
});

// ==================== START ====================
// Verificar sesion existente
if (haySesionActiva()) {
  ocultarLogin();
  iniciarApp();
} else {
  mostrarLogin();
}
