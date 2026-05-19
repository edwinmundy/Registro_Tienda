// ==========================================
// FUNCIONES DE BACKUP Y RESET PARA ADMIN
// ==========================================

/**
 * Exporta todo el localStorage a un archivo JSON descargable
 * Solo disponible para administradores
 */
function exportarLocalStorageCompleto() {
    if (!verificarSesion()) return;
    
    const esAdmin = esAdminActual();
    if (!esAdmin) {
        mostrarNotificacion('Solo el administrador puede exportar los datos', 'error');
        return;
    }

    if (!confirmarPasswordUsuarioActual('exportar el respaldo completo')) return;
    
    try {
        const datosExportar = obtenerDatosRespaldoSistema();
        const categorias = obtenerCategorias();
        const resumen = obtenerResumenRespaldoSistema();
        
        // Agregar metadata
        const backupCompleto = {
            metadata: {
                fechaExportacion: new Date().toISOString(),
                sistema: 'Sistema de Inventario',
                version: '1.1',
                cajero: cajeroActual.nombre,
                codigo: cajeroActual.codigo,
                cargo: cajeroActual.cargo,
                totalCategorias: categorias.length,
                totalProductos: resumen.productos,
                totalCajeros: resumen.cajeros,
                totalAuditoria: resumen.auditoria,
                totalRegistros: Object.keys(datosExportar).length
            },
            datos: datosExportar
        };
        
        // Crear archivo y descargar
        const dataStr = JSON.stringify(backupCompleto, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        const fecha = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `backup_inventario_${fecha}_${cajeroActual.codigo}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Registrar en auditoría
        registrarAuditoria({
            cajeroId: cajeroActual.id,
            cajeroNombre: cajeroActual.nombre,
            cajeroCodigo: cajeroActual.codigo,
            tipo: 'backup_sistema',
            categoria: 'sistema',
            itemNombre: 'Exportación completa del sistema',
            cantidad: Object.keys(datosExportar).length,
            stockAnterior: 0,
            stockNuevo: 0
        });
        
        mostrarNotificacion(`✅ Backup exportado: ${Object.keys(datosExportar).length} registros guardados`, 'success');
        
    } catch (error) {
        console.error('Error al exportar:', error);
        mostrarNotificacion('Error al exportar datos', 'error');
    }
}

const CLAVES_RESPALDO_EXCLUIDAS = new Set([
    'inventario_sesion',
    'inventario_tema'
]);

const CLAVES_RESPALDO_EXPLICITAS = [
    'conteo_en_progreso',
    'cigarrillos_sistema',
    'historial_conteos',
    'rotacion_panaderia_data_v5',
    'rotacion_panaderia_historial_v5',
    'rotacion_panaderia_leyenda_v1'
];

const PREFIJOS_RESPALDO = [
    'inventario_',
    'rotacion_'
];

function obtenerUsuarioActualCompleto() {
    if (!cajeroActual) return null;

    const cajeros = obtenerDatos('cajeros');
    return cajeros.find(c => c.id === cajeroActual.id)
        || cajeros.find(c => c.codigo === cajeroActual.codigo)
        || null;
}

function confirmarPasswordUsuarioActual(nombreAccion) {
    const usuario = obtenerUsuarioActualCompleto();

    if (!usuario?.password) {
        mostrarNotificacion('No se pudo validar la contraseña del usuario actual', 'error');
        return false;
    }

    const password = prompt(`Confirmación requerida\n\nIngresa tu contraseña para ${nombreAccion}:`);

    if (password === null) {
        mostrarNotificacion('Operación cancelada', 'warning');
        return false;
    }

    if (String(password) !== String(usuario.password)) {
        mostrarNotificacion('Contraseña incorrecta. Operación cancelada.', 'error');
        return false;
    }

    return true;
}

function claveEsRespaldable(key) {
    if (!key || CLAVES_RESPALDO_EXCLUIDAS.has(key)) return false;
    if (CLAVES_RESPALDO_EXPLICITAS.includes(key)) return true;
    return PREFIJOS_RESPALDO.some(prefijo => key.startsWith(prefijo));
}

function obtenerClavesRespaldoSistema() {
    const claves = new Set(CLAVES_RESPALDO_EXPLICITAS);

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (claveEsRespaldable(key)) {
            claves.add(key);
        }
    }

    return Array.from(claves)
        .filter(key => localStorage.getItem(key) !== null && claveEsRespaldable(key))
        .sort((a, b) => a.localeCompare(b, 'es'));
}

function obtenerDatosRespaldoSistema() {
    const datosExportar = {};
    const claves = obtenerClavesRespaldoSistema();

    claves.forEach(key => {
        const valor = localStorage.getItem(key);
        if (valor === null) return;

        try {
            datosExportar[key] = JSON.parse(valor);
        } catch(e) {
            datosExportar[key] = valor;
        }
    });

    return datosExportar;
}

function obtenerResumenRespaldoSistema() {
    const categorias = obtenerCategorias();
    const datos = obtenerDatosRespaldoSistema();
    const cajeros = obtenerDatos('cajeros');
    const auditoria = obtenerDatos('auditoria');
    const totalProductos = categorias.reduce((total, cat) => total + obtenerDatos(cat.id).length, 0);

    return {
        categorias: categorias.length,
        productos: totalProductos,
        cajeros: cajeros.length,
        auditoria: auditoria.length,
        claves: Object.keys(datos).length
    };
}

/**
 * Limpia completamente el localStorage del sistema
 * Solo disponible para administradores - REQUIERE CONFIRMACIÓN DOBLE
 */
function limpiarLocalStorageCompleto() {
    if (!verificarSesion()) return;
    
    const esAdmin = esAdminActual();
    if (!esAdmin) {
        mostrarNotificacion('Solo el administrador puede limpiar el sistema', 'error');
        return;
    }

    if (!confirmarPasswordUsuarioActual('borrar toda la información del sistema')) return;
    
    // Primera confirmación
    if (!confirm('⚠️ ¿ESTÁS SEGURO?\n\nEsto eliminará TODOS los datos del sistema:\n✓ Categorías\n✓ Productos\n✓ Cajeros (excepto admin)\n✓ Auditoría\n✓ Conteos de cigarrillos\n✓ Historial\n✓ Rotación de productos\n\nEsta acción NO se puede deshacer.\n\n¿Deseas continuar?')) {
        return;
    }
    
    // Segunda confirmación escribiendo ELIMINAR
    const confirmacionFinal = prompt('⚠️ ÚLTIMA CONFIRMACIÓN\n\nEscribe "ELIMINAR" en mayúsculas para borrar todo el sistema:');
    
    if (confirmacionFinal !== 'ELIMINAR') {
        mostrarNotificacion('Operación cancelada', 'warning');
        return;
    }
    
    try {

                // Guardar info del admin antes de borrar
        const adminBackup = {
            id: cajeroActual.id,
            nombre: cajeroActual.nombre,
            rut: '0.000.000-0',
            turno: 'ADMIN',
            codigo: 'ADMIN',
            password: '63717',
            cargo: 'Corporativo',
            activo: true
        };
        
        // Obtener lista de todas las claves a eliminar
        const keysToRemove = [];
        const categorias = obtenerCategorias();
        
        categorias.forEach(cat => {
            keysToRemove.push(`inventario_${cat.id}`);
        });
        
        keysToRemove.push(
            'inventario_categorias',
            'inventario_auditoria',
            'conteo_en_progreso',
            'cigarrillos_sistema',
            'historial_conteos',
            'rotacion_panaderia_data_v5',
            'rotacion_panaderia_historial_v5',
            'rotacion_panaderia_leyenda_v1'
        );
        
        // Eliminar todas las claves
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Recrear datos mínimos del sistema (SOLO admin, SIN categorías default)
        guardarJsonStorage('inventario_categorias', []); // Array vacío
        guardarJsonStorage('inventario_cajeros', [adminBackup]);
        
        // Registrar la limpieza en auditoría (solo este registro quedará)
        const auditoriaLimpia = [{
            id: `aud-${Date.now()}`,
            fecha: new Date().toISOString(),
            cajeroId: cajeroActual.id,
            cajeroNombre: cajeroActual.nombre,
            cajeroCodigo: cajeroActual.codigo,
            tipo: 'limpieza_total_sistema',
            categoria: 'sistema',
            itemNombre: 'Limpieza completa del sistema',
            cantidad: 0,
            stockAnterior: categorias.length,
            stockNuevo: 0
        }];
        guardarJsonStorage('inventario_auditoria', auditoriaLimpia);
        
        mostrarNotificacion('🗑️ Sistema limpiado completamente. Recargando...', 'success');
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Error al limpiar:', error);
        mostrarNotificacion('Error al limpiar el sistema', 'error');
    }
}

function importarLocalStorageCompleto(event) {
    if (!verificarSesion()) return;
    
    const esAdmin = esAdminActual();
    if (!esAdmin) {
        mostrarNotificacion('Solo el administrador puede importar datos', 'error');
        return;
    }
    
    const file = event.target.files[0];
    if (!file) return;

    if (!confirmarPasswordUsuarioActual('cargar un respaldo completo')) {
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            
            if (!backup.datos || !backup.metadata) {
                mostrarNotificacion('Archivo de backup inválido', 'error');
                return;
            }
            
            // Confirmar importación
            const fechaBackup = new Date(backup.metadata.fechaExportacion).toLocaleString('es-ES');
            if (!confirm(`¿Importar backup del ${fechaBackup}?\n\n⚠️ Esto reemplazará todos los datos actuales.\n\nCategorías en backup: ${backup.metadata.totalCategorias || 'N/A'}\nRegistros: ${backup.metadata.totalRegistros || Object.keys(backup.datos).length}\n\n¿Continuar?`)) {
                return;
            }
            
            // Limpiar datos del sistema primero, sin destruir preferencias ajenas.
            obtenerClavesRespaldoSistema().forEach(key => localStorage.removeItem(key));
            
            // Restaurar datos
            Object.keys(backup.datos).forEach(key => {
                if (!claveEsRespaldable(key)) return;

                const valor = backup.datos[key];
                if (typeof valor === 'object') {
                    guardarJsonStorage(key, valor);
                } else {
                    localStorage.setItem(key, valor);
                }
            });
            
            // Asegurar que la sesión actual se mantenga (recreamos)
            const sesion = {
                cajeroId: cajeroActual.id,
                cajeroNombre: cajeroActual.nombre,
                cajeroCodigo: cajeroActual.codigo,
                cajeroCargo: cajeroActual.cargo,
                inicio: new Date().getTime()
            };
            guardarJsonStorage('inventario_sesion', sesion);
            
            // Registrar en auditoría
            registrarAuditoria({
                cajeroId: cajeroActual.id,
                cajeroNombre: cajeroActual.nombre,
                cajeroCodigo: cajeroActual.codigo,
                tipo: 'restauracion_backup',
                categoria: 'sistema',
                itemNombre: `Restauración desde backup del ${fechaBackup}`,
                cantidad: backup.metadata.totalRegistros || Object.keys(backup.datos).length,
                stockAnterior: 0,
                stockNuevo: backup.metadata.totalCategorias || 0
            });
            
            mostrarNotificacion('✅ Backup restaurado correctamente. Recargando...', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            console.error('Error al importar:', error);
            mostrarNotificacion('Error al leer el archivo de backup', 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

