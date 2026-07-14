// ==========================================
// SISTEMA DE CONTROL DE TEMPERATURA DE NEVERAS
// ==========================================

// Obtener todas las neveras
function obtenerNeveras() {
    return obtenerJsonStorage('inventario_neveras', []);
}

// Guardar neveras
function guardarNeveras(neveras) {
    guardarJsonStorage('inventario_neveras', neveras);
}

// Obtener registros de temperatura
function obtenerRegistrosTemperatura() {
    return obtenerJsonStorage('inventario_registros_temp', []);
}

// Guardar registro de temperatura
function guardarRegistroTemperatura(registro) {
    let registros = obtenerRegistrosTemperatura();
    registros.unshift(registro); // Agregar al inicio
    
    // Limitar a últimos 1000 registros
    if (registros.length > 1000) {
        registros = registros.slice(0, 1000);
    }
    
    guardarJsonStorage('inventario_registros_temp', registros);
    
    // Registrar en auditoría general
    registrarAuditoria({
        cajeroId: cajeroActual?.id || 'system',
        cajeroNombre: cajeroActual?.nombre || 'Sistema',
        cajeroCodigo: cajeroActual?.codigo || 'SYS',
        tipo: 'registro_temperatura',
        categoria: 'neveras',
        itemNombre: registro.neveraNombre,
        cantidad: registro.temperatura,
        stockAnterior: 0,
        stockNuevo: 0
    });
}

// Obtener registros filtrados
function obtenerRegistrosPorNevera(neveraId) {
    const registros = obtenerRegistrosTemperatura();
    if (!neveraId) return registros;
    return registros.filter(r => r.neveraId === neveraId);
}

// Crear nueva nevera (solo admin)
function crearNevera(nombre, ubicacion, temperaturaMin, temperaturaMax) {
    const neveras = obtenerNeveras();
    
    const nuevaNevera = {
        id: `nevera-${Date.now()}`,
        nombre: nombre,
        ubicacion: ubicacion || '',
        temperaturaMin: temperaturaMin || 0,
        temperaturaMax: temperaturaMax || 10,
        activa: true,
        fechaCreacion: new Date().toISOString()
    };
    
    neveras.push(nuevaNevera);
    guardarNeveras(neveras);
    
    registrarAuditoria({
        cajeroId: cajeroActual.id,
        cajeroNombre: cajeroActual.nombre,
        cajeroCodigo: cajeroActual.codigo,
        tipo: 'creacion_nevera',
        categoria: 'neveras',
        itemNombre: nombre,
        cantidad: 0,
        stockAnterior: 0,
        stockNuevo: 0
    });
    
    return true;
}

// Editar nevera (solo admin)
function editarNevera(id, nombre, ubicacion, temperaturaMin, temperaturaMax, activa) {
    const neveras = obtenerNeveras();
    const index = neveras.findIndex(n => n.id === id);
    
    if (index === -1) return false;
    
    neveras[index] = {
        ...neveras[index],
        nombre: nombre,
        ubicacion: ubicacion,
        temperaturaMin: temperaturaMin,
        temperaturaMax: temperaturaMax,
        activa: activa
    };
    
    guardarNeveras(neveras);
    
    registrarAuditoria({
        cajeroId: cajeroActual.id,
        cajeroNombre: cajeroActual.nombre,
        cajeroCodigo: cajeroActual.codigo,
        tipo: 'edicion_nevera',
        categoria: 'neveras',
        itemNombre: nombre,
        cantidad: 0,
        stockAnterior: 0,
        stockNuevo: 0
    });
    
    return true;
}

// Eliminar nevera (solo admin)
function eliminarNevera(id) {
    const neveras = obtenerNeveras();
    const nevera = neveras.find(n => n.id === id);
    
    if (!nevera) return false;
    
    const nuevasNeveras = neveras.filter(n => n.id !== id);
    guardarNeveras(nuevasNeveras);
    
    registrarAuditoria({
        cajeroId: cajeroActual.id,
        cajeroNombre: cajeroActual.nombre,
        cajeroCodigo: cajeroActual.codigo,
        tipo: 'eliminacion_nevera',
        categoria: 'neveras',
        itemNombre: nevera.nombre,
        cantidad: 0,
        stockAnterior: 0,
        stockNuevo: 0
    });
    
    return true;
}

// Registrar nueva temperatura
function registrarTemperatura(neveraId, temperatura, observaciones = '') {
    const neveras = obtenerNeveras();
    const nevera = neveras.find(n => n.id === neveraId);
    
    if (!nevera) return false;
    
    const registro = {
        id: `temp-${Date.now()}`,
        neveraId: neveraId,
        neveraNombre: nevera.nombre,
        temperatura: parseFloat(temperatura),
        observaciones: observaciones,
        cajeroId: cajeroActual.id,
        cajeroNombre: cajeroActual.nombre,
        cajeroCodigo: cajeroActual.codigo,
        fecha: new Date().toISOString(),
        dentroRango: verificarRangoTemperatura(temperatura, nevera.temperaturaMin, nevera.temperaturaMax)
    };
    
    guardarRegistroTemperatura(registro);
    return true;
}

// Verificar si temperatura está dentro del rango
function verificarRangoTemperatura(temp, min, max) {
    return temp >= min && temp <= max;
}

// Obtener estadísticas de temperatura
function obtenerEstadisticasTemperatura(neveraId = null) {
    let registros = obtenerRegistrosTemperatura();
    
    if (neveraId) {
        registros = registros.filter(r => r.neveraId === neveraId);
    }
    
    if (registros.length === 0) {
        return {
            total: 0,
            dentroRango: 0,
            fueraRango: 0,
            ultimaTemp: null,
            promedio: 0,
            min: null,
            max: null
        };
    }
    
    const dentroRango = registros.filter(r => r.dentroRango).length;
    const fueraRango = registros.length - dentroRango;
    const ultimoRegistro = registros[0];
    const temperaturas = registros.map(r => r.temperatura);
    const promedio = temperaturas.reduce((a, b) => a + b, 0) / temperaturas.length;
    const min = Math.min(...temperaturas);
    const max = Math.max(...temperaturas);
    
    return {
        total: registros.length,
        dentroRango: dentroRango,
        fueraRango: fueraRango,
        ultimaTemp: ultimoRegistro?.temperatura || null,
        ultimaFecha: ultimoRegistro?.fecha || null,
        promedio: Math.round(promedio * 10) / 10,
        min: min,
        max: max
    };
}
