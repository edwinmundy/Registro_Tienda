// ==========================================
// INICIALIZACIÓN DE DATOS
// ==========================================

function inicializarDatos() {
    asegurarJsonStorage(STORAGE_KEYS.cajeros, DATOS_DEFAULT.cajeros);
    asegurarPasswordAdminActualizado();
    
    // Inicializar categorías como array vacío si no existen
    asegurarJsonStorage(STORAGE_KEYS.categorias, []);
    
    // Inicializar datos de cada categoría existente (dinámico, sin defaults)
    const categorias = obtenerCategorias();
    categorias.forEach(cat => {
        const key = `inventario_${cat.id}`;
        asegurarJsonStorage(key, []);
    });
    
    // Inicializar auditoría
    asegurarJsonStorage(STORAGE_KEYS.auditoria, DATOS_DEFAULT.auditoria);
    
    verificarSesion();
    actualizarNavegacion();
    mostrarUsuarioActual();
}

function asegurarPasswordAdminActualizado() {
    const cajeros = obtenerDatos('cajeros');
    let huboCambio = false;

    const cajerosActualizados = cajeros.map(cajero => {
        if (cajero.codigo !== APP_CONFIG.adminCode) return cajero;
        if (cajero.password === APP_CONFIG.adminPassword) return cajero;

        huboCambio = true;
        return {
            ...cajero,
            password: APP_CONFIG.adminPassword
        };
    });

    if (huboCambio) {
        guardarJsonStorage(STORAGE_KEYS.cajeros, cajerosActualizados);
    }
}
