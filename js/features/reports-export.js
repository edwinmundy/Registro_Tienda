// ==========================================
// INVENTARIO GENERAL
// ==========================================

function cargarInventarioGeneral(filtro = 'todo') {
    const tbody = document.getElementById('tabla-inventario');
    const tabsContainer = document.getElementById('inventory-tabs');
    if (!tbody) return;
    
    // Si las pestañas no están generadas, generarlas primero
    if (tabsContainer && tabsContainer.children.length === 0) {
        generarPestanasInventario();
    }
    
    const categorias = obtenerCategorias();
    let todos = [];
    
    categorias.forEach(cat => {
        const items = obtenerDatos(cat.id).map(i => ({
            ...i, 
            categoria: cat.nombre,
            categoriaId: cat.id,
            categoriaIcono: cat.icono
        }));
        todos = [...todos, ...items];
    });
    
    // Filtrar según la pestaña seleccionada
    if (filtro !== 'todo') {
        if (filtro === 'alertas') {
            todos = todos.filter(i => i.cantidad <= i.minimo);
        } else {
            todos = todos.filter(i => i.categoriaId === filtro);
        }
    }
    
    if (todos.length === 0) {
        let mensaje = 'No hay items para mostrar';
        if (filtro === 'alertas') mensaje = 'No hay items con stock bajo';
        
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state" style="text-align: center; padding: 40px;">  <!-- cambiado a 8 columnas -->
                    <div class="empty-state-icon">📋</div>
                    <p>${mensaje}</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = todos.map(item => {
        let estado = 'ok';
        let estadoTexto = '✓ Normal';
        
        if (item.cantidad <= item.minimo * 0.5) {
            estado = 'danger';
            estadoTexto = '🔴 Crítico';
        } else if (item.cantidad <= item.minimo) {
            estado = 'warning';
            estadoTexto = '🟡 Bajo';
        }
        
        return `
            <tr>
                <td>
                    <span class="badge inventory-category-badge">
                        <span>${item.categoriaIcono}</span>
                        <span>${item.categoria}</span>
                    </span>
                </td>
                <!-- NUEVA COLUMNA: ID -->
                <td>
                    <code class="inventory-id-code">
                        ${item.id}
                    </code>
                </td>
                <td><strong>${item.nombre}</strong></td>
                <td>${item.cantidad}</td>
                <td>${item.unidad}</td>
                <td>${item.minimo}</td>
                <td><span class="status-badge status-${estado}">${estadoTexto}</span></td>
                <td>
                    <button onclick="verCategoria('${item.categoriaId}')" class="btn-icon btn-edit" title="Ver">👁️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// EXPORTACIÓN A EXCEL
// ==========================================

function exportarExcel() {
    const categorias = obtenerCategorias();
    let todos = [];
    
    categorias.forEach(cat => {
        const items = obtenerDatos(cat.id).map(i => ({
            Categoría: cat.nombre,
            ...i
        }));
        todos = [...todos, ...items];
    });
    
    if (todos.length === 0) {
        mostrarNotificacion('No hay datos para exportar', 'error');
        return;
    }
    
    const datos = todos.map(item => ({
        'Categoría': item.Categoría,
        'ID': item.id,
        'Nombre': item.nombre,
        'Cantidad': item.cantidad,
        'Unidad': item.unidad,
        'Stock Mínimo': item.minimo
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    
    ws['!cols'] = [
        { wch: 15 }, { wch: 15 }, { wch: 25 },
        { wch: 10 }, { wch: 12 }, { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario General');
    
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `inventario_general_${fecha}.xlsx`);
    
    mostrarNotificacion('Inventario exportado a Excel correctamente');
}

function exportarAuditoria() {
    const auditoria = obtenerDatos('auditoria');
    
    if (auditoria.length === 0) {
        mostrarNotificacion('No hay datos para exportar', 'error');
        return;
    }
    
    const datos = auditoria.map(r => ({
        'Fecha': new Date(r.fecha).toLocaleString('es-ES'),
        'Cajero': r.cajeroNombre,
        'Código': r.cajeroCodigo,
        'Categoría': r.categoria.toUpperCase(),
        'Item': r.itemNombre,
        'Tipo': r.tipo,
        'Cantidad': r.cantidad,
        'Stock Anterior': r.stockAnterior,
        'Stock Nuevo': r.stockNuevo
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    
    const colWidths = [
        { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
        { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoría');
    
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `auditoria_${fecha}.xlsx`);
    
    mostrarNotificacion('Historial exportado a Excel correctamente');
}

async function limpiarAuditoria() {
    if (!verificarSesion()) return;
    
    const confirmado = await confirmarAccion('¿Está seguro de eliminar TODO el historial de auditoría?', {
        titulo: 'Limpiar auditoría',
        tipo: 'warning',
        textoAceptar: 'Eliminar historial'
    });

    if (!confirmado) return;

    guardarDatos('auditoria', []);
    cargarAuditoria();
    mostrarNotificacion('Historial limpiado correctamente');
}

