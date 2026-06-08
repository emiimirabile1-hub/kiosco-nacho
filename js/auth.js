const USUARIOS = [
  { usuario: 'Admin', contraseña: '123', rol: 'admin', nombre: 'Administrador' },
  { usuario: 'Cajera', contraseña: '123', rol: 'cajera', nombre: 'Cajera' }
];

let sesionActual = null;

function iniciarSesion(usuario, contraseña) {
  const user = USUARIOS.find(
    u => u.usuario === usuario && u.contraseña === contraseña
  );
  if (user) {
    sesionActual = {
      usuario: user.usuario,
      rol: user.rol,
      nombre: user.nombre,
      inicioSesion: new Date().toISOString()
    };
    sessionStorage.setItem('kiosco_sesion', JSON.stringify(sesionActual));
    return true;
  }
  return false;
}

function cerrarSesion() {
  sesionActual = null;
  sessionStorage.removeItem('kiosco_sesion');
}

function getUsuarioActual() {
  if (!sesionActual) {
    try {
      const stored = sessionStorage.getItem('kiosco_sesion');
      if (stored) sesionActual = JSON.parse(stored);
    } catch (e) {
      sesionActual = null;
    }
  }
  return sesionActual;
}

function haySesionActiva() {
  return getUsuarioActual() !== null;
}

function tieneAcceso(modulo) {
  const user = getUsuarioActual();
  if (!user) return false;
  if (user.rol === 'admin') return true;
  if (user.rol === 'cajera') {
    const permitidos = ['dashboard', 'ventas', 'productos', 'historial'];
    return permitidos.includes(modulo);
  }
  return false;
}

function esRol(rol) {
  const user = getUsuarioActual();
  return user && user.rol === rol;
}
