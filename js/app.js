// ==========================================
// SISTEMA DE INVENTARIO INTEGRADO V1.0
// Cargador de compatibilidad para paginas que aun referencien js/app.js
// ==========================================

(function cargarModulosInventario() {
    const scriptActual = document.currentScript;
    const basePath = scriptActual?.src
        ? scriptActual.src.slice(0, scriptActual.src.lastIndexOf('/') + 1)
        : 'js/';

    const modulos = [
        'core/config.js',
        'core/utils.js',
        'core/storage.js',
        'core/init.js',
        'features/categories.js',
        'core/session-navigation.js',
        'features/inventory-items.js',
        'features/auditoria.js',
        'features/cajeros.js',
        'features/reports-export.js',
        'core/ui.js',
        'features/conteos-tabs.js',
        'features/backup.js',
        'features/exhibicion.js',
        'features/neveras.js'
    ];

    document.write(modulos.map(src => `<script src="${basePath}${src}"></script>`).join(''));
}());
