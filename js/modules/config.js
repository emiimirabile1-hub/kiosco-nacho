function renderConfig() {
  const margen = getMargenPredeterminado();
  document.getElementById('configMargen').value = margen;
}

function guardarMargenConfig() {
  const valor = parseInt(document.getElementById('configMargen').value);
  if (isNaN(valor) || valor < 0) return alert('Ingresá un valor válido');
  setMargenPredeterminado(valor);
  alert('✅ Margen predeterminado guardado: ' + valor + '%');
}

function descargarRespaldo() {
  const json = obtenerJSONRespaldo();
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const fecha = new Date().toISOString().slice(0, 10);
  a.download = `kiosco-nacho-backup-${fecha}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function manejarImportacion(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      importarDatos(e.target.result);
      renderDashboard();
      actualizarHeaderCaja();
      alert('✅ Datos importados correctamente');
    } catch (err) {
      alert('❌ Error al importar: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function confirmarBorrarDatos() {
  mostrarConfirmacion(
    '🗑️ Borrar todos los datos',
    'Esta acción no se puede deshacer. Se eliminarán todos los productos, ventas y movimientos.',
    () => {
      borrarTodosLosDatos();
      renderDashboard();
      actualizarHeaderCaja();
      alert('✅ Datos eliminados');
    }
  );
}
