// ==========================================
// SISTEMA DE INVENTARIO INTEGRADO V1.0
// ==========================================

// SOLO datos por defecto del administrador
const DATOS_DEFAULT = {
    cajeros: [
        { 
            id: 'admin-1', 
            nombre: 'Administrador', 
            rut: '0.000.000-0', 
            turno: 'ADMIN', 
            codigo: 'ADMIN', 
            password: '63717',
            cargo: 'Corporativo',
            activo: true 
        }
    ],
    auditoria: [],
    sesion: null
};

const APP_CONFIG = {
    adminCode: 'ADMIN',
    adminPassword: '63717',
    adminCargos: ['Encargado', 'Corporativo'],
    sessionDurationMs: 8 * 60 * 60 * 1000,
    notificationDurationMs: 3000,
    maxAuditoria: 1000,
    maxHistorialConteos: 50
};

// Claves de LocalStorage del sistema
const STORAGE_KEYS = {
    categorias: 'inventario_categorias',
    cajeros: 'inventario_cajeros',
    auditoria: 'inventario_auditoria',
    sesion: 'inventario_sesion'
};

// Usuario autenticado en la sesión actual
let cajeroActual = null;
