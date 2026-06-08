# 🏪 KioscoGO — Sistema de Gestión Escolar

Bienvenido a **KioscoGO**, el sistema de gestión para el kiosco escolar. Controlá **productos, ventas, compras, stock y caja** desde cualquier dispositivo.

---

## 🚀 Cómo empezar

1. Abrí el archivo **`index.html`** en tu navegador (Chrome, Safari, Edge)
2. Iniciá sesión con tu usuario y contraseña
3. Si es la primera vez, andá a **Caja → Abrir Caja** (poné el monto inicial)
4. Después cargá los productos desde **Productos**
5. ¡Empezá a vender!

> No necesita internet para funcionar (excepto la búsqueda por código de barras).
> Todos los datos se guardan automáticamente en el navegador.

---

## 🔑 Usuarios y contraseñas

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| **Admin** | `123` | Administrador | Todas las secciones |
| **Cajera** | `123` | Cajera | Panel, Ventas, Productos (solo lectura), Historial |

---

## 📖 Secciones del sistema

### 📊 Panel (Dashboard)
Resumen general del kiosco. Muestra:
- Cantidad de productos en el catálogo
- Ventas y compras del día
- Estado de la caja (abierta/cerrada y saldo)
- Alertas de productos con **stock bajo** (cuando el stock está por debajo del mínimo)
- Últimos movimientos registrados

### 📦 Productos
Acá se administra el catálogo. Podés:
- **Agregar** un producto nuevo (nombre, código de barras, categoría, precios, stock)
- **Editar** o **eliminar** productos existentes
- **Buscar** productos por nombre, categoría o código de barras
- Ver el **margen de ganancia** de cada producto

#### Precio: modo Auto o Manual
En el formulario de producto hay un check **"Auto-calcular precio de venta desde margen"**:
- **Activado** (recomendado): ingresás el precio de compra y el margen %, y el precio de venta se calcula solo
- **Desactivado**: ingresás el precio de venta manualmente y el margen se calcula automáticamente

#### Código de barras
Junto al campo de código de barras hay un botón **🔍 Buscar**.
- Escribí el código y apretá **Buscar** (o Enter)
- El sistema consulta la base de datos abierta **Open Food Facts** (millones de productos)
- Si encuentra el producto, autocompleta el nombre y la categoría automáticamente

### 💳 Ventas
Para registrar las ventas del kiosco. **Requiere que la caja esté abierta.**

Hay tres formas de agregar productos al carrito:
1. **Escribiendo** en el buscador y haciendo clic en el producto
2. **Escribiendo el código de barras** en el campo correspondiente y presionando Enter (o el botón 🔍)
3. **Escaneando** con la cámara: apretá el botón **📷**, apuntá al código de barras del producto

Cuando el producto está en el carrito:
- Seleccionás el **medio de pago** (efectivo, tarjeta, transferencia, otro)
- Apretás **✅ Cobrar Venta**
- Automáticamente se descuenta del stock y se registra el ingreso en caja

> Si escaneás un código de barras de un producto que no está en tu catálogo, el sistema busca en la base de datos abierta y te ofrece crearlo automáticamente.

### 📥 Compras / Ingreso de Mercadería
Para registrar cuando llegan productos nuevos al kiosco. **Requiere caja abierta.**

- Seleccionás el producto (o creás uno nuevo desde el mismo selector)
- Indicás cantidad y precio unitario de compra
- Se agrega al carrito de compra
- Al confirmar, **aumenta el stock** y se registra el egreso en caja
- Podés anotar el **proveedor**

### 💰 Caja
Control de caja diario.

**Abrir caja:**
- Indicás el **monto inicial** (cuánta plata hay al empezar el día)
- El sistema sugiere automáticamente el monto final del cierre anterior

**Mientras la caja está abierta:**
- Se ve el resumen: monto inicial, ingresos por ventas, egresos por compras, saldo actual
- Podés registrar **Ingresos Extra** (ej: plata que dejó el profe para el kiosco)
- Podés registrar **Gastos Extra** (ej: se compró un marcador para la escuela)
- Podés **editar el monto inicial** si te equivocaste (haciendo clic en el ✏️)
- Todos los movimientos se ven en la tabla

**Cerrar caja:**
- Ingresás el monto final que hay en la caja
- Si no coincide con el esperado, te avisa pero podés cerrar igual
- Se guarda en el historial de cierres para consultar después

### 📋 Historial
Todas las transacciones del kiosco ordenadas por fecha.
- Podés **filtrar por tipo**: ventas, compras, aperturas, cierres, ingresos/gastos extra
- Podés **buscar texto** en cualquier transacción

### ⚙️ Configuración

**Margen de ganancia predeterminado:**
- Seteá un porcentaje (ej: 30%) que se usará automáticamente al crear productos nuevos
- Después podés cambiarlo producto por producto

**Gestión de datos:**
- **📤 Exportar respaldo**: descarga un archivo `.json` con todos tus datos
- **📥 Importar datos**: recupera un respaldo guardado previamente
- **🗑️ Borrar todos los datos**: elimina todo (cuidado, no se puede deshacer)

> 💡 **Recomendación:** hacé un respaldo cada semana o antes de hacer cambios importantes.

---

## 🌙 Modo oscuro
En el header (barra superior) hay un botón 🌙/☀️ para cambiar entre modo claro y oscuro. Se recuerda aunque cierres el navegador.

---

## 📱 Escanear códigos de barras

### Con la cámara del celular (iPhone / Android)
1. Andá a la sección **Ventas**
2. Apretá el botón **📷**
3. Permití que el navegador use la cámara
4. Apuntá al código de barras del producto
5. Se agrega automáticamente al carrito

### Con escáner Bluetooth (opcional)
Si tenés un escáner Bluetooth (tipo pistola), conectalo al celular. Funciona como un teclado: escanea y escribe el código automáticamente en el campo de texto. Marcas recomendadas: **Socket Mobile**, **Netum**, **WoneNice**.

### Búsqueda automática desde internet
Cuando escaneás o escribís un código de barras de un producto no registrado, el sistema consulta la base de datos **Open Food Facts** y te ofrece crear el producto con los datos encontrados (nombre, marca, categoría).

---

## 🧠 Tips de uso

1. **Abrí la caja** al empezar el día y **cerrala** al terminar — así tenés el control de todo
2. Usá **margen de ganancia** para que los precios de venta se calculen solos
3. Cargá el **código de barras** en cada producto para vender más rápido
4. Hacé **respaldo semanal** desde Configuración
5. Revisá las **alertas de stock bajo** en el Panel para no quedarte sin productos
6. Si la cajera solo necesita vender, usá el usuario **Cajera** que tiene acceso limitado

---

## ❓ Preguntas frecuentes

**¿Se pierden los datos si cierro el navegador?**
No. Los datos se guardan automáticamente en el almacenamiento del navegador.

**¿Puedo usar el sistema en varios dispositivos?**
Sí, pero los datos quedan en cada dispositivo. Para compartir, exportá el respaldo desde un dispositivo e importalo en el otro.

**¿Necesito internet?**
Para las funciones básicas, no. Solo necesitás internet para la búsqueda automática por código de barras (Open Food Facts).

**¿Puedo cambiar los precios después de crear un producto?**
Sí. Editá el producto desde la sección **Productos** haciendo clic en ✏️.

---

¡Gracias por usar **Kiosco Nacho**! 🏪🎉
