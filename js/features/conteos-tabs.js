// ==========================================
// FUNCIONES ESPECÍFICAS PARA CONTEO DE CIGARRILLOS
// ==========================================

/**
 * Calcula el estado del conteo basado en stock sistema vs físico
 * Equivalente a: =SI.ERROR(SI(F5=E5;"OK";SI(F5<E5;"INGRESAR";"EGRESAR"));"")
 */
function calcularEstadoCigarrillo(stockSistema, conteoFisico) {
    if (conteoFisico === null || conteoFisico === undefined || isNaN(conteoFisico)) {
        return 'PENDIENTE';
    }
    if (conteoFisico === stockSistema) return 'OK';
    if (conteoFisico > stockSistema) return 'INGRESAR';
    return 'EGRESAR';
}

/**
 * Obtiene el color CSS según el estado del conteo
 */
function getColorEstado(estado) {
    switch(estado) {
        case 'OK': return '#10b981'; // Verde
        case 'INGRESAR': return '#3b82f6'; // Azul
        case 'EGRESAR': return '#ef4444'; // Rojo
        default: return '#f59e0b'; // Naranja (pendiente)
    }
}

/**
 * Verifica si el usuario actual es administrador
 */
function esAdministrador() {
    const sesion = obtenerSesionActiva();
    return cajeroTienePermisosAdmin(crearCajeroDesdeSesion(sesion));
}

/**
 * Obtiene el historial de conteos de cigarrillos
 */
function obtenerHistorialConteos() {
    return obtenerDatos('historial_conteos');
}

/**
 * Guarda un conteo de cigarrillos en el historial
 */
function guardarConteoCigarrillos(conteoData) {
    let historial = obtenerHistorialConteos();
    
    // Agregar al inicio
    historial.unshift({
        id: `conteo-${Date.now()}`,
        fecha: new Date().toISOString(),
        ...conteoData
    });
    
    // Limitar a últimos 50 conteos para no saturar localStorage
    if (historial.length > APP_CONFIG.maxHistorialConteos) {
        historial = historial.slice(0, APP_CONFIG.maxHistorialConteos);
    }
    
    guardarDatos('historial_conteos', historial);
    
    // Registrar en auditoría general
    registrarAuditoria({
        cajeroId: conteoData.cajeroId,
        cajeroNombre: conteoData.cajeroNombre,
        cajeroCodigo: conteoData.cajeroCodigo,
        tipo: 'conteo_cigarrillos',
        categoria: 'cigarrillos',
        itemNombre: `Conteo ${conteoData.id || 'nuevo'}`,
        cantidad: conteoData.productos ? conteoData.productos.length : 0,
        stockAnterior: 0,
        stockNuevo: 0
    });
    
    return true;
}

// ==========================================
// FUNCIÓN AUXILIAR PARA HISTORIAL DE CONTEOS
// ==========================================


// ==========================================
// PESTAÑAS DINÁMICAS DE INVENTARIO
// ==========================================

function generarPestanasInventario() {
    const contenedor = document.getElementById('inventory-tabs');
    if (!contenedor) return;
    
    const categorias = obtenerCategorias();
    const urlParams = new URLSearchParams(window.location.search);
    const tabActiva = urlParams.get('tab') || 'todo';
    
    let html = '';
    
    // 1. PESTAÑA "TODO" - SIEMPRE FIJA AL INICIO
    html += `
        <button class="tab-btn ${tabActiva === 'todo' ? 'active' : ''}" 
                onclick="mostrarTabDinamica('todo')">📋 Todo</button>
    `;
    
    // 2. CATEGORÍAS DINÁMICAS EN EL MEDIO
    categorias.forEach(cat => {
        const esActiva = tabActiva === cat.id;
        html += `
            <button class="tab-btn ${esActiva ? 'active' : ''}" 
                    onclick="mostrarTabDinamica('${cat.id}')">
                ${cat.icono} ${cat.nombre}
            </button>
        `;
    });
    
    // 3. PESTAÑA "ALERTAS" - SIEMPRE FIJA AL FINAL
    html += `
        <button class="tab-btn alert-tab ${tabActiva === 'alertas' ? 'active' : ''}" 
                onclick="mostrarTabDinamica('alertas')">
            ⚠️ Alertas de Stock
        </button>
    `;
    
    contenedor.innerHTML = html;
}

function mostrarTabDinamica(tab) {
    // Actualizar URL
    const url = new URL(window.location);
    if (tab === 'todo') {
        url.searchParams.delete('tab');
    } else {
        url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url);
    
    // Actualizar clase active
    document.querySelectorAll('#inventory-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        // Usar el onclick para identificar cuál debe estar activo
        if (btn.getAttribute('onclick')?.includes(`'${tab}'`)) {
            btn.classList.add('active');
        }
    });
    
    // Cargar datos
    cargarInventarioGeneral(tab);
}

// Mantener compatibilidad con código existente
function mostrarTab(tab) {
    mostrarTabDinamica(tab);
}

