// ==========================================
// FUNCIONES DE DATOS GENERALES
// ==========================================

function obtenerStorageKey(categoria) {
    return `inventario_${categoria}`;
}

function obtenerDatos(categoria) {
    const key = obtenerStorageKey(categoria);
    return obtenerArrayStorage(key);
}

function guardarDatos(categoria, datos) {
    const key = obtenerStorageKey(categoria);
    guardarJsonStorage(key, datos);
    // La actualización del dashboard se maneja desde index.html
}
