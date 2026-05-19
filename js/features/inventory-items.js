// ==========================================
// FUNCIONES DE INVENTARIO (CRUD Items)
// ==========================================

function cargarItemsEnGrid(categoriaId) {
    const contenedor = document.getElementById('items-grid');
    if (!contenedor) return;
    
    const items = obtenerDatos(categoriaId);
    
    if (items.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">📦</div>
                <h3>No hay items en esta categoría</h3>
                <p>Agrega tu primer item usando el botón superior</p>
            </div>
        `;
        return;
    }
    
    contenedor.innerHTML = items.map(item => crearCardItem(item, categoriaId)).join('');
}

function crearCardItem(item, categoria) {
    const porcentaje = Math.min((item.cantidad / item.minimo) * 100, 100);
    let estadoClase = 'success';
    let cardClase = '';
    
    if (item.cantidad <= item.minimo * 0.5) {
        estadoClase = 'danger';
        cardClase = 'low-stock';
    } else if (item.cantidad <= item.minimo) {
        estadoClase = 'warning';
        cardClase = 'medium-stock';
    }
    
    // Verificar permisos
    const esAdmin = esAdminActual();
    
    // Acciones según permisos
    let accionesSuperiores = '';
    let accionesStock = '';
    
    if (esAdmin) {
        // Admin: todo permitido
        accionesSuperiores = `
            <button class="btn-icon btn-edit" onclick="abrirModalEdicion('${categoria}', '${item.id}')" title="Editar">✏️</button>
            <button class="btn-icon btn-delete" onclick="eliminarItem('${item.id}', '${categoria}')" title="Eliminar">🗑️</button>
        `;
    }
    
    // Cajero y Admin: pueden ajustar stock con + y -
    accionesStock = `
        <button onclick="ajustarStock('${item.id}', '${categoria}', -1)" class="btn-icon btn-stock-decrease">-</button>
        <button onclick="ajustarStock('${item.id}', '${categoria}', 1)" class="btn-icon btn-stock-increase">+</button>
    `;

    return `
        <div class="item-card ${cardClase}" id="item-${item.id}">
            <div class="item-header">
                <div>
                    <div class="item-title">${item.nombre}</div>
                    <small style="color: var(--text-light);">ID: ${item.id}</small>
                </div>
                <div class="item-actions">
                    ${accionesSuperiores}
                </div>
            </div>
            
            <div class="item-stats">
                <div class="stat">
                    <div class="stat-label">Stock Actual</div>
                    <button type="button"
                            class="stat-value stock-edit-trigger"
                            onclick="abrirModalStockRapido('${categoria}', '${item.id}')"
                            title="Modificar stock">
                        ${item.cantidad}
                    </button>
                </div>
                <div class="stat">
                    <div class="stat-label">Unidad</div>
                    <div class="stat-value" style="font-size: 1rem;">${item.unidad}</div>
                </div>
            </div>
            
            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                <small style="color: var(--text-light);">Mínimo: ${item.minimo}</small>
                <small style="color: var(--${estadoClase === 'success' ? 'success' : estadoClase === 'warning' ? 'warning' : 'danger'}); font-weight: 600;">
                    ${item.cantidad <= item.minimo ? '⚠️ Stock Bajo' : '✓ OK'}
                </small>
            </div>
            
            <div class="stock-bar">
                <div class="stock-fill ${estadoClase}" style="width: ${porcentaje}%"></div>
            </div>
            
            <div style="margin-top: 12px; display: flex; gap: 8px;">
                ${accionesStock}
            </div>
        </div>
    `;
}

function abrirModalNuevo(categoria) {
    if (!verificarSesion()) return;
    
    const modal = document.getElementById('modal-item');
    const titulo = document.getElementById('modal-title');
    const form = document.getElementById('form-item');
    const grupoIdPersonalizado = document.getElementById('grupo-id-personalizado');
    
    titulo.textContent = 'Agregar Nuevo Item';
    form.reset();
    document.getElementById('item-id').value = '';
    
    // MOSTRAR campo de ID personalizado para nuevos items
    if (grupoIdPersonalizado) {
        grupoIdPersonalizado.style.display = 'block';
        document.getElementById('item-id-personalizado').value = '';
    }
    
    modal.dataset.categoria = categoria;
    modal.dataset.modo = 'nuevo';
    
    modal.style.display = 'block';
}

function abrirModalEdicion(categoria, itemId) {
    if (!verificarSesion()) return;
    
    // Verificar permisos
    const esAdmin = esAdminActual();
    
    const modal = document.getElementById('modal-item');
    const titulo = document.getElementById('modal-title');
    const grupoIdPersonalizado = document.getElementById('grupo-id-personalizado');
    
    const items = obtenerDatos(categoria);
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
        mostrarNotificacion('Item no encontrado', 'error');
        return;
    }
    
    // Si es cajero, solo mostrar modal de ajuste rápido de stock
    if (!esAdmin) {
        // Para cajeros: solo permitir ajuste rápido sin abrir modal completo
        // o mostrar versión simplificada
        mostrarNotificacion('Como cajero, usa los botones + y - para ajustar stock', 'warning');
        return;
    }
    
    // Admin: flujo normal completo
    titulo.textContent = 'Editar Item';
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-nombre').value = item.nombre;
    document.getElementById('item-cantidad').value = item.cantidad;
    document.getElementById('item-unidad').value = item.unidad;
    document.getElementById('item-minimo').value = item.minimo;
    
    if (grupoIdPersonalizado) {
        grupoIdPersonalizado.style.display = 'none';
    }
    
    modal.dataset.categoria = categoria;
    modal.dataset.modo = 'editar';
    modal.dataset.stockAnterior = item.cantidad;
    
    modal.style.display = 'block';
}

function cerrarModal() {
    const modal = document.getElementById('modal-item');
    if (modal) {
        modal.style.display = 'none';
    }
}

function abrirModalStockRapido(categoria, itemId) {
    if (!verificarSesion()) return;

    const items = obtenerDatos(categoria);
    const item = items.find(i => i.id === itemId);

    if (!item) {
        mostrarNotificacion('Item no encontrado', 'error');
        return;
    }

    let modal = document.getElementById('modal-stock-rapido');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-stock-rapido';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content modal-stock-content">
                <span class="close" onclick="cerrarModalStockRapido()">&times;</span>
                <h3>Modificar Stock</h3>
                <div class="stock-quick-summary">
                    <div class="stock-quick-name" id="stock-quick-name"></div>
                    <div class="stock-quick-current">Actual: <strong id="stock-quick-current"></strong></div>
                </div>
                <form onsubmit="guardarStockRapido(event)">
                    <input type="hidden" id="stock-quick-categoria">
                    <input type="hidden" id="stock-quick-id">
                    <div class="form-group">
                        <label>Nueva cantidad:</label>
                        <input type="number" id="stock-quick-cantidad" min="0" required autocomplete="off">
                    </div>
                    <button type="submit" class="btn-primary">Aceptar</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('stock-quick-name').textContent = item.nombre;
    document.getElementById('stock-quick-current').textContent = `${item.cantidad} ${item.unidad || ''}`.trim();
    document.getElementById('stock-quick-categoria').value = categoria;
    document.getElementById('stock-quick-id').value = itemId;
    document.getElementById('stock-quick-cantidad').value = item.cantidad;
    modal.style.display = 'block';
    setTimeout(() => document.getElementById('stock-quick-cantidad')?.select(), 0);
}

function cerrarModalStockRapido() {
    const modal = document.getElementById('modal-stock-rapido');
    if (modal) {
        modal.style.display = 'none';
    }
}

function guardarStockRapido(event) {
    event.preventDefault();
    if (!verificarSesion()) return;

    const categoria = obtenerValorInput('stock-quick-categoria');
    const itemId = obtenerValorInput('stock-quick-id');
    const nuevaCantidad = Number.parseInt(obtenerValorInput('stock-quick-cantidad'), 10);

    if (!Number.isFinite(nuevaCantidad) || nuevaCantidad < 0) {
        mostrarNotificacion('La cantidad debe ser un numero valido y no negativo', 'error');
        return;
    }

    const items = obtenerDatos(categoria);
    const item = items.find(i => i.id === itemId);

    if (!item) {
        mostrarNotificacion('Item no encontrado', 'error');
        return;
    }

    const stockAnterior = item.cantidad;
    if (stockAnterior === nuevaCantidad) {
        cerrarModalStockRapido();
        return;
    }

    item.cantidad = nuevaCantidad;
    guardarDatos(categoria, items);

    registrarAuditoria({
        cajeroId: cajeroActual.id,
        cajeroNombre: cajeroActual.nombre,
        cajeroCodigo: cajeroActual.codigo,
        categoria: categoria,
        itemId: itemId,
        itemNombre: item.nombre,
        tipo: nuevaCantidad > stockAnterior ? 'entrada' : 'salida',
        cantidad: Math.abs(nuevaCantidad - stockAnterior),
        stockAnterior: stockAnterior,
        stockNuevo: nuevaCantidad
    });

    if (document.getElementById('items-grid')) {
        cargarItemsEnGrid(categoria);
    }

    cerrarModalStockRapido();
    mostrarNotificacion('Stock actualizado', 'success');
}

function guardarItem(event) {
    event.preventDefault();
    
    if (!verificarSesion()) return;
    
    const modal = document.getElementById('modal-item');
    const categoria = modal.dataset.categoria;
    const modo = modal.dataset.modo;
    
    const idExistente = obtenerValorInput('item-id');
    const idPersonalizado = document.getElementById('item-id-personalizado')?.value.trim();
    
    const nombre = obtenerValorInput('item-nombre').trim();
    const unidad = obtenerValorInput('item-unidad').trim();
    let cantidad = 0;
    let minimo = 0;

    try {
        cantidad = obtenerEnteroInput('item-cantidad', 'La cantidad');
        minimo = obtenerEnteroInput('item-minimo', 'El minimo');
    } catch (error) {
        mostrarNotificacion(error.message, 'error');
        return;
    }

    if (!nombre || !unidad) {
        mostrarNotificacion('Nombre y unidad son obligatorios', 'error');
        return;
    }

    if (cantidad < 0 || minimo < 0) {
        mostrarNotificacion('Cantidad y minimo no pueden ser negativos', 'error');
        return;
    }
    
    let items = obtenerDatos(categoria);
    let tipoOperacion = '';
    let stockAnterior = 0;
    let itemIdFinal = '';
    let itemNombre = nombre;
    
    if (modo === 'editar' && idExistente) {
        // MODO EDICIÓN: mantener ID existente
        const index = items.findIndex(i => i.id === idExistente);
        if (index === -1) {
            mostrarNotificacion('Item no encontrado', 'error');
            return;
        }
        
        stockAnterior = items[index].cantidad;
        itemNombre = items[index].nombre;
        itemIdFinal = idExistente;
        
        tipoOperacion = items[index].cantidad !== cantidad ? 'edicion' : 'edicion_datos';
        items[index] = { id: itemIdFinal, nombre, cantidad, unidad, minimo };
        
    } else {
        // MODO NUEVO: usar ID personalizado o generar automático
        if (idPersonalizado) {
            // Validar formato del ID personalizado
            if (!/^[a-zA-Z0-9-_]+$/.test(idPersonalizado)) {
                mostrarNotificacion('El ID solo puede contener letras, números, guiones y guiones bajos', 'error');
                return;
            }
            
            // Verificar que no exista duplicado
            if (items.find(i => i.id === idPersonalizado)) {
                mostrarNotificacion(`Ya existe un item con el ID "${idPersonalizado}"`, 'error');
                return;
            }
            
            itemIdFinal = idPersonalizado;
        } else {
            // Generar ID automático
            itemIdFinal = `${categoria}-${Date.now()}`;
        }
        
        items.push({ id: itemIdFinal, nombre, cantidad, unidad, minimo });
        tipoOperacion = 'creacion';
        stockAnterior = 0;
    }
    
    guardarDatos(categoria, items);
    
    registrarAuditoria({
        cajeroId: cajeroActual.id,
        cajeroNombre: cajeroActual.nombre,
        cajeroCodigo: cajeroActual.codigo,
        categoria: categoria,
        itemId: itemIdFinal,
        itemNombre: itemNombre,
        tipo: tipoOperacion,
        cantidad: cantidad,
        stockAnterior: stockAnterior,
        stockNuevo: cantidad
    });
    
    if (document.getElementById('items-grid')) {
        cargarItemsEnGrid(categoria);
    }
    
    cerrarModal();
    mostrarNotificacion(modo === 'editar' ? 'Item actualizado correctamente' : 'Item agregado correctamente', 'success');
}

function eliminarItem(id, categoria) {
    if (!verificarSesion()) return;
    
    if (!confirm('¿Estás seguro de eliminar este item?')) return;
    
    let items = obtenerDatos(categoria);
    const item = items.find(i => i.id === id);
    
    if (!item) {
        mostrarNotificacion('Item no encontrado', 'error');
        return;
    }
    
    registrarAuditoria({
        cajeroId: cajeroActual.id,
        cajeroNombre: cajeroActual.nombre,
        cajeroCodigo: cajeroActual.codigo,
        categoria: categoria,
        itemId: id,
        itemNombre: item.nombre,
        tipo: 'eliminacion',
        cantidad: 0,
        stockAnterior: item.cantidad,
        stockNuevo: 0
    });
    
    items = items.filter(i => i.id !== id);
    guardarDatos(categoria, items);
    
    if (document.getElementById('items-grid')) {
        cargarItemsEnGrid(categoria);
    }
    
    mostrarNotificacion('Item eliminado correctamente', 'success');
}

function ajustarStock(id, categoria, cambio) {
    if (!verificarSesion()) return;
    
    let items = obtenerDatos(categoria);
    const item = items.find(i => i.id === id);
    
    if (!item) {
        mostrarNotificacion('Item no encontrado', 'error');
        return;
    }
    
    const stockAnterior = item.cantidad;
    
    if (item.cantidad + cambio < 0) {
        mostrarNotificacion('No puede tener stock negativo', 'error');
        return;
    }
    
    item.cantidad += cambio;
    guardarDatos(categoria, items);
    
    registrarAuditoria({
        cajeroId: cajeroActual.id,
        cajeroNombre: cajeroActual.nombre,
        cajeroCodigo: cajeroActual.codigo,
        categoria: categoria,
        itemId: id,
        itemNombre: item.nombre,
        tipo: cambio > 0 ? 'entrada' : 'salida',
        cantidad: Math.abs(cambio),
        stockAnterior: stockAnterior,
        stockNuevo: item.cantidad
    });
    
    if (document.getElementById('items-grid')) {
        cargarItemsEnGrid(categoria);
    }
    
    mostrarNotificacion(`Stock ${cambio > 0 ? 'aumentado' : 'disminuido'}: ${item.nombre}`, 'success');
}
