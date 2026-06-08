let ctxUltimoProducto = null;

function toggleChat() {
  const panel = document.getElementById('chatPanel');
  panel.classList.toggle('show');
  if (panel.classList.contains('show')) {
    document.getElementById('chatInput').focus();
  }
}

function enviarChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  agregarMensaje('tú', msg);
  setTimeout(() => responderChat(msg), 200);
}

function chatKeydown(e) {
  if (e.key === 'Enter') enviarChat();
}

function agregarMensaje(quien, texto) {
  const chat = document.getElementById('chatMessages');
  const d = document.createElement('div');
  d.className = 'chat-msg chat-' + quien;
  d.textContent = texto;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// Stemming-like: reduce palabras a su raíz
function stem(w) {
  return w.toLowerCase()
    .replace(/[aeiou]s$/,'')
    .replace(/[oae]s$/,'')
    .replace(/[ae]r$/,'')
    .replace(/ad[ao]$/,'')
    .replace(/ndo$/,'')
    .replace(/d[ao]$/,'')
    .replace(/s$/,'')
    .replace(/n$/,'');
}

function buscarProductos(q) {
  const prods = getProductos();
  const palabras = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const raices = palabras.map(stem);
  const scored = prods.map(p => {
    const nom = p.nombre.toLowerCase();
    const nomStem = stem(nom);
    let score = 0;
    for (const w of palabras) {
      if (nom === w) score += 20;
      else if (nom.includes(w)) score += 8;
      else if (nomStem.includes(stem(w))) score += 5;
    }
    for (const r of raices) {
      if (nomStem.includes(r)) score += 3;
    }
    if (p.codigoBarra) {
      for (const w of palabras) {
        if (p.codigoBarra.includes(w)) score += 15;
      }
    }
    return { p, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  return scored;
}

function detectarIntencion(q) {
  const palabras = q.toLowerCase().split(/\s+/);
  const texto = q.toLowerCase();
  const intenciones = [];

  if (/^(hola|buen[ads]|hey|que tal|buenas|saludos)/i.test(texto))
    intenciones.push('saludo');

  if (/precio|cuest(a|e|an)|cost(o|ó|aba)|sal(e|ió|ía)|val(e|ió|ía)|caro|barato|cu(a|á)nto (cuesta|sale|vale)|a cómo|a cuánto/i.test(texto))
    intenciones.push('precio');

  if (/stock|quedan?|hay |falta|inventario|cu(a|á)ntos? (hay|quedan)|disponible/i.test(texto))
    intenciones.push('stock');

  if (/venta(s|r)?|vend(i|iste|ió|ieron|emos|ieron)|factur(a|aste|ó)|ingres(o|ó)|cobr(a|aste|asteis|ó)/i.test(texto))
    intenciones.push('ventas');

  if (/productos?|cat(a|á)logo|lista|qu[eé] (hay|ten(e|emos|go)|vendes?)|mostr(a|ar)/i.test(texto))
    intenciones.push('catalogo');

  if (/categoria|categoría|sección|rubro|tipo/i.test(texto))
    intenciones.push('categoria');

  if (/ayuda|comandos|qu[eé] (puedes|sabes|haces)|instrucciones|funciones/i.test(texto))
    intenciones.push('ayuda');

  if (/gracias|graciela|thanks|thx/i.test(texto))
    intenciones.push('gracias');

  return intenciones;
}

function responderChat(msg) {
  const q = msg.toLowerCase().trim();
  const prods = getProductos();
  const txs = getTransacciones();

  const intencion = detectarIntencion(q);
  const candidatos = buscarProductos(q);
  const mejor = candidatos[0];
  const matchFuerte = mejor && mejor.score >= 6;
  const matchMedio = mejor && mejor.score >= 3;

  let respuesta = '';

  // === SALUDO ===
  if (intencion.includes('saludo')) {
    const total = prods.length;
    const bajos = prods.filter(p => p.stock <= p.stockMinimo).length;
    respuesta = `👋 ¡Hola! Tengo ${total} producto(s) en la base, ${bajos} con stock bajo.`;
    respuesta += '\n\nPreguntame: ¿cuánto cuesta…?, stock de…, ventas, o escribí "ayuda".';
  }

  // === GRACIAS ===
  else if (intencion.includes('gracias')) {
    respuesta = '🙌 ¡De nada! Cualquier otra cosa me decís.';
  }

  // === PRECIO ===
  else if (intencion.includes('precio')) {
    if (matchFuerte) {
      const p = mejor.p;
      const diff = (p.precioVenta || 0) - (p.precioCompra || 0);
      respuesta = `💰 ${p.nombre}\n`;
      respuesta += `Venta: $${(p.precioVenta || 0).toFixed(2)}\n`;
      respuesta += `Compra: $${(p.precioCompra || 0).toFixed(2)}\n`;
      respuesta += `Ganancia: $${diff.toFixed(2)} (${p.margen || 0}%)`;
      if (p.stock !== undefined) respuesta += `\nStock: ${p.stock} ud`;
      ctxUltimoProducto = p;
    } else if (matchMedio) {
      const opciones = candidatos.slice(0, 3);
      respuesta = '¿A cuál te referís?\n' + opciones.map((s, i) => `${i+1}) ${s.p.nombre}`).join('\n');
    } else if (prods.length === 0) {
      respuesta = '📭 No hay productos cargados todavía. Agregá algunos desde Productos.';
    } else {
      respuesta = '¿De qué producto querés saber el precio? Decime el nombre.';
    }
  }

  // === STOCK ===
  else if (intencion.includes('stock')) {
    if (matchFuerte) {
      const p = mejor.p;
      const s = p.stock || 0;
      const min = p.stockMinimo || 5;
      respuesta = `📦 ${p.nombre}: ${s} ud (mín: ${min})`;
      if (s <= min) respuesta += '\n⚠️ Está por debajo del mínimo.';
      else respuesta += ` ✅ ${s - min} ud arriba del mínimo.`;
      ctxUltimoProducto = p;
    } else if (/bajo|falta|critico|poco|menos/i.test(q)) {
      const bajos = prods.filter(p => p.stock <= p.stockMinimo).sort((a, b) => a.stock - b.stock);
      if (bajos.length) {
        respuesta = '⚠️ Stock bajo:\n' + bajos.map(p => `• ${p.nombre}: ${p.stock} ud (mín ${p.stockMinimo})`).join('\n');
      } else {
        respuesta = '✅ Todo bien, ningún producto tiene stock bajo.';
      }
    } else if (matchMedio) {
      const opciones = candidatos.slice(0, 3);
      respuesta = '¿De cuál querés saber el stock?\n' + opciones.map((s, i) => `${i+1}) ${s.p.nombre}`).join('\n');
    } else {
      const totalStock = prods.reduce((a, p) => a + (p.stock || 0), 0);
      const bajos = prods.filter(p => p.stock <= p.stockMinimo).length;
      respuesta = `📊 Stock total: ${totalStock} ud (${prods.length} productos)`;
      if (bajos) respuesta += `\n⚠️ ${bajos} producto(s) con stock bajo. Decime "stock bajo" para ver.`;
    }
  }

  // === VENTAS ===
  else if (intencion.includes('ventas')) {
    const ventas = txs.filter(t => t.tipo === 'venta');
    const hoy = new Date().toDateString();

    if (matchFuerte) {
      const p = mejor.p;
      const pVentas = ventas.filter(t => t.items && t.items.some(i => i.productoId === p.id));
      const uds = pVentas.reduce((a, t) => {
        const item = t.items.find(i => i.productoId === p.id);
        return a + (item ? item.cantidad : 0);
      }, 0);
      const total = pVentas.reduce((a, t) => {
        const item = t.items.find(i => i.productoId === p.id);
        return a + (item ? item.subtotal : 0);
      }, 0);
      respuesta = `📊 Ventas de ${p.nombre}\nUnidades: ${uds}\nTotal: $${total.toFixed(2)}\nTransacciones: ${pVentas.length}`;
      if (uds > 0 && p.stock > 0) {
        const fechas = pVentas.map(t => new Date(t.fecha).getTime()).sort((a, b) => a - b);
        const dias = Math.max(1, (Date.now() - fechas[0]) / 86400000);
        respuesta += `\nRotación: ${(uds / dias).toFixed(2)} ud/día → ${(p.stock / (uds / dias)).toFixed(0)} días restantes`;
      }
      ctxUltimoProducto = p;
    } else if (/hoy/i.test(q)) {
      const hoyVentas = ventas.filter(t => new Date(t.fecha).toDateString() === hoy);
      respuesta = `💳 Ventas de hoy\n${hoyVentas.length} venta(s)\nTotal: $${hoyVentas.reduce((a, t) => a + parseFloat(t.total || 0), 0).toFixed(2)}`;
    } else if (/semana/i.test(q)) {
      const sem = ventas.filter(t => Date.now() - new Date(t.fecha).getTime() < 7*86400000);
      respuesta = `📈 Ventas de la semana\n${sem.length} venta(s)\nTotal: $${sem.reduce((a, t) => a + parseFloat(t.total || 0), 0).toFixed(2)}`;
    } else if (/mes/i.test(q)) {
      const mes = ventas.filter(t => Date.now() - new Date(t.fecha).getTime() < 30*86400000);
      respuesta = `📆 Ventas del mes\n${mes.length} venta(s)\nTotal: $${mes.reduce((a, t) => a + parseFloat(t.total || 0), 0).toFixed(2)}`;
    } else {
      const unidades = ventas.reduce((a, t) => a + (t.items ? t.items.reduce((s, i) => s + (i.cantidad || 0), 0) : 0), 0);
      respuesta = `💳 Ventas totales: ${ventas.length}\nTotal: $${ventas.reduce((a, t) => a + parseFloat(t.total || 0), 0).toFixed(2)}\nUnidades: ${unidades}`;
      if (ventas.length) {
        const fechas = ventas.map(t => new Date(t.fecha).getTime()).sort((a, b) => a - b);
        respuesta += `\nDesde: ${new Date(fechas[0]).toLocaleDateString()}`;
      }
    }
  }

  // === CATÁLOGO ===
  else if (intencion.includes('catalogo')) {
    if (prods.length === 0) {
      respuesta = '📭 No hay productos cargados. Andá a Productos para agregar.';
    } else {
      const cats = [...new Set(prods.map(p => p.categoria).filter(Boolean))];
      respuesta = `📦 ${prods.length} producto(s)`;
      if (cats.length) {
        const porCat = cats.map(c => `${c}: ${prods.filter(p => p.categoria === c).length}`);
        respuesta += '\n\nCategorías:\n' + porCat.join('\n');
      }
      if (prods.length <= 8) {
        respuesta += '\n\nTodos:\n' + prods.map(p => `• ${p.nombre}: $${(p.precioVenta || 0).toFixed(2)} (stock: ${p.stock})`).join('\n');
      }
    }
  }

  // === CATEGORÍA ===
  else if (intencion.includes('categoria')) {
    const cats = [...new Set(prods.map(p => p.categoria).filter(Boolean))];
    const palabras = q.split(/\s+/).filter(w => w.length > 2);
    const catMatch = cats.find(c => palabras.some(w => c.toLowerCase().includes(w)));
    if (catMatch) {
      const filtrados = prods.filter(p => p.categoria === catMatch);
      respuesta = `📂 ${catMatch} (${filtrados.length})\n` +
        filtrados.map(p => `• ${p.nombre}: $${(p.precioVenta || 0).toFixed(2)}`).join('\n');
    } else if (cats.length) {
      respuesta = '📂 Categorías:\n' + cats.join('\n') + '\n\nDecí el nombre de una para ver sus productos.';
    } else {
      respuesta = 'No hay categorías cargadas.';
    }
  }

  // === AYUDA ===
  else if (intencion.includes('ayuda')) {
    respuesta = '🤖 Preguntame:\n' +
      '• "¿Cuánto cuesta [producto]?"\n' +
      '• "Stock de [producto]" o "stock bajo"\n' +
      '• "Ventas" / "ventas hoy" / "ventas [producto]"\n' +
      '• "¿Qué productos hay?"\n' +
      '• "Categoría [nombre]"';
  }

  // === INTENCIÓN NO DETECTADA pero hay candidatos ===
  else if (candidatos.length > 0) {
    const top = candidatos.slice(0, 3);
    respuesta = 'Encontré estos productos. ¿Querés saber precio, stock o ventas de alguno?\n' +
      top.map((s, i) => `${i+1}) ${s.p.nombre} — $${(s.p.precioVenta || 0).toFixed(2)} (stock: ${s.p.stock})`).join('\n');
    if (candidatos.length > 3) respuesta += `\n... y ${candidatos.length - 3} más`;
  }

  // === SIN NADA ===
  else {
    if (ctxUltimoProducto) {
      respuesta = `¿Seguis hablando de ${ctxUltimoProducto.nombre}? Decime "precio", "stock" o "ventas" para ese producto, o preguntame otra cosa.`;
    } else {
      respuesta = '😅 No entendí. Escribí "ayuda" para ver qué puedo responder.';
    }
  }

  agregarMensaje('bot', respuesta);
}
