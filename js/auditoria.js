// ==========================================
// SISTEMA DE AUDITORÍA
// ==========================================

function registrarAuditoria(datos) {
    const auditoria = obtenerDatos('auditoria');
    const registro = {
        id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fecha: new Date().toISOString(),
        ...datos
    };
    
    auditoria.unshift(registro);
    
    if (auditoria.length > APP_CONFIG.maxAuditoria) {
        auditoria.pop();
    }
    
    guardarDatos('auditoria', auditoria);
}

function cargarAuditoria() {
    const tbody = document.getElementById('tabla-auditoria');
    if (!tbody) return;
    
    let registros = obtenerDatos('auditoria');
    
    const filtroCategoria = document.getElementById('filtro-categoria')?.value || 'todas';
    const filtroTipo = document.getElementById('filtro-tipo')?.value || 'todos';
    const filtroFecha = document.getElementById('filtro-fecha')?.value;
    const filtroCajero = document.getElementById('filtro-cajero')?.value.toLowerCase() || '';
    
    if (filtroCategoria !== 'todas') {
        registros = registros.filter(r => r.categoria === filtroCategoria);
    }
    
    if (filtroTipo !== 'todos') {
        registros = registros.filter(r => r.tipo === filtroTipo);
    }
    
    if (filtroFecha) {
        const fechaFiltro = new Date(filtroFecha).toDateString();
        registros = registros.filter(r => new Date(r.fecha).toDateString() === fechaFiltro);
    }
    
    if (filtroCajero) {
        registros = registros.filter(r => 
            r.cajeroNombre.toLowerCase().includes(filtroCajero) ||
            r.cajeroCodigo.toLowerCase().includes(filtroCajero)
        );
    }
    
    if (registros.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state" style="text-align: center; padding: 40px;">
                    <div class="empty-state-icon">📋</div>
                    <p>No hay registros para mostrar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = registros.map(reg => {
        const fecha = new Date(reg.fecha);
        const fechaStr = fecha.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let tipoClass = '';
        let tipoTexto = '';
        
        switch(reg.tipo) {
            case 'entrada':
                tipoClass = 'tipo-entrada';
                tipoTexto = '➕ Entrada';
                break;
            case 'salida':
                tipoClass = 'tipo-salida';
                tipoTexto = '➖ Salida';
                break;
            case 'edicion':
            case 'edicion_datos':
                tipoClass = 'tipo-edicion';
                tipoTexto = '✏️ Edición';
                break;
            case 'creacion':
                tipoClass = 'tipo-entrada';
                tipoTexto = '🆕 Nuevo';
                break;
            case 'eliminacion':
                tipoClass = 'tipo-salida';
                tipoTexto = '🗑️ Eliminación';
                break;
            case 'creacion_categoria':
                tipoClass = 'tipo-entrada';
                tipoTexto = '📁 Nueva Cat.';
                break;
            case 'eliminacion_categoria':
                tipoClass = 'tipo-salida';
                tipoTexto = '🗑️ Elim. Cat.';
                break;
            default:
                tipoTexto = reg.tipo;
        }
        
        return `
            <tr>
                <td>${fechaStr}</td>
                <td><strong>${reg.cajeroNombre}</strong></td>
                <td>${reg.cajeroCodigo}</td>
                <td><span class="badge" style="background: ${getCategoriaColor(reg.categoria)}; color: white;">${reg.categoria.toUpperCase()}</span></td>
                <td>${reg.itemNombre}</td>
                <td class="${tipoClass}">${tipoTexto}</td>
                <td>${reg.cantidad > 0 ? reg.cantidad : '-'}</td>
                <td>${reg.stockAnterior}</td>
                <td>${reg.stockNuevo}</td>
            </tr>
        `;
    }).join('');
}

function getCategoriaColor(categoriaId) {
    const categorias = obtenerCategorias();
    const cat = categorias.find(c => c.id === categoriaId);
    return cat ? '#3b82f6' : '#6b7280';
}

