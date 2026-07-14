// ==========================================
// SISTEMA DE EXHIBICIÓN DE PRODUCTOS
// ==========================================

/**
 * Obtiene la configuración de duración de productos por categoría
 */
function obtenerConfigDuracion(categoriaId) {
    const key = `config_duracion_${categoriaId}`;
    return obtenerJsonStorage(key, {});
}

/**
 * Guarda la configuración de duración de productos
 */
function guardarConfigDuracion(categoriaId, config) {
    const key = `config_duracion_${categoriaId}`;
    guardarJsonStorage(key, config);
}

/**
 * Obtiene la exhibición activa actual
 */
function obtenerExhibicionActiva() {
    return obtenerJsonStorage('exhibicion_activa', []);
}

/**
 * Guarda la exhibición activa
 */
function guardarExhibicionActiva(exhibicion) {
    guardarJsonStorage('exhibicion_activa', exhibicion);
}

/**
 * Calcula el tiempo restante en formato legible
 */
function calcularTiempoRestante(fechaVencimiento) {
    const ahora = new Date().getTime();
    const vencimiento = new Date(fechaVencimiento).getTime();
    const diferencia = vencimiento - ahora;
    
    if (diferencia <= 0) return { texto: 'VENCIDO', clase: 'vencido', segundos: 0 };
    
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
    
    let clase = 'normal';
    if (horas < 2) clase = 'critico';
    else if (horas < 6) clase = 'advertencia';
    
    return {
        texto: `${horas}h ${minutos}m ${segundos}s`,
        clase: clase,
        segundos: Math.floor(diferencia / 1000)
    };
}

/**
 * Agrega un producto a la exhibición
 */
function agregarAExhibicion(categoriaId, productoId, cantidad, duracionHoras) {
    const productos = obtenerDatos(categoriaId);
    const producto = productos.find(p => p.id === productoId);
    
    if (!producto) return false;
    
    const exhibicion = obtenerExhibicionActiva();
    const ahora = new Date();
    const vencimiento = new Date(ahora.getTime() + (duracionHoras * 60 * 60 * 1000));
    
    // Verificar si ya existe en exhibición
    const existente = exhibicion.find(e => e.productoId === productoId && e.categoriaId === categoriaId);
    
    if (existente) {
        // Actualizar cantidad y renovar tiempo
        existente.cantidad += cantidad;
        existente.fechaHoraInicio = ahora.toISOString();
        existente.fechaHoraVencimiento = vencimiento.toISOString();
        existente.estado = 'activo';
    } else {
        exhibicion.push({
            id: `exh-${Date.now()}`,
            categoriaId: categoriaId,
            productoId: productoId,
            nombre: producto.nombre,
            cantidadInicial: cantidad,
            cantidad: cantidad,
            duracionHoras: duracionHoras,
            fechaHoraInicio: ahora.toISOString(),
            fechaHoraVencimiento: vencimiento.toISOString(),
            estado: 'activo',
            vendidos: 0
        });
    }
    
    guardarExhibicionActiva(exhibicion);
    
    // Registrar en auditoría
    registrarAuditoria({
        cajeroId: cajeroActual.id,
        cajeroNombre: cajeroActual.nombre,
        cajeroCodigo: cajeroActual.codigo,
        tipo: 'exhibicion_agregado',
        categoria: categoriaId,
        itemNombre: producto.nombre,
        cantidad: cantidad,
        stockAnterior: 0,
        stockNuevo: cantidad
    });
    
    return true;
}

/**
 * Actualiza la cantidad vendida o marca como inactivo
 */
function actualizarExhibicion(exhibicionId, nuevaCantidad = null, estado = null) {
    const exhibicion = obtenerExhibicionActiva();
    const item = exhibicion.find(e => e.id === exhibicionId);
    
    if (!item) return false;
    
    if (nuevaCantidad !== null) {
        const diferencia = item.cantidad - nuevaCantidad;
        if (diferencia > 0) {
            item.vendidos += diferencia;
        }
        item.cantidad = nuevaCantidad;
    }
    
    if (estado !== null) {
        item.estado = estado;
    }
    
    // Auto-desactivar si cantidad es 0
    if (item.cantidad <= 0) {
        item.estado = 'inactivo';
        item.cantidad = 0;
    }
    
    guardarExhibicionActiva(exhibicion);
    return true;
}

/**
 * Limpia productos vencidos de la exhibición
 */
function limpiarExhibicionVencidos() {
    const exhibicion = obtenerExhibicionActiva();
    const ahora = new Date().getTime();
    
    exhibicion.forEach(item => {
        if (item.estado === 'activo') {
            const vencimiento = new Date(item.fechaHoraVencimiento).getTime();
            if (ahora > vencimiento) {
                item.estado = 'vencido';
            }
        }
    });
    
    guardarExhibicionActiva(exhibicion);
}
