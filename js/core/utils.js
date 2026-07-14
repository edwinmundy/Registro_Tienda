// ==========================================
// UTILIDADES BASE
// ==========================================

function parseJsonSeguro(valor, valorPorDefecto, contexto = 'dato') {
    if (valor === null || valor === undefined || valor === '') {
        return valorPorDefecto;
    }

    try {
        return JSON.parse(valor);
    } catch (error) {
        console.warn(`No se pudo leer ${contexto} desde localStorage. Se usara el valor por defecto.`, error);
        return valorPorDefecto;
    }
}

function obtenerJsonStorage(key, valorPorDefecto = []) {
    return parseJsonSeguro(localStorage.getItem(key), valorPorDefecto, key);
}

function obtenerArrayStorage(key) {
    const valor = obtenerJsonStorage(key, []);
    return Array.isArray(valor) ? valor : [];
}

const STORAGE_KEYS_RECORTABLES = [
    { key: 'inventario_historial_conteos', minimo: 10 },
    { key: 'historial_conteos', minimo: 10 },
    { key: 'rotacion_panaderia_historial_v5', minimo: 100 },
    { key: 'inventario_auditoria', minimo: 100 },
    { key: 'inventario_registros_temp', minimo: 100 }
];

function esErrorCuotaStorage(error) {
    return Boolean(error) && (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22 ||
        error.code === 1014
    );
}

function obtenerConfigRecorteStorage(key) {
    return STORAGE_KEYS_RECORTABLES.find(config => config.key === key);
}

function recortarRegistrosAntiguos(registros, minimo) {
    if (!Array.isArray(registros) || registros.length <= minimo) {
        return registros;
    }

    const conservar = Math.max(minimo, Math.ceil(registros.length * 0.75));
    return registros.slice(0, conservar);
}

function intentarGuardarStorageDirecto(key, valorJson) {
    localStorage.setItem(key, valorJson);
    return true;
}

function intentarGuardarRecortandoAntiguos(key, valor) {
    let valorAguardar = valor;
    const configObjetivo = obtenerConfigRecorteStorage(key);

    if (configObjetivo && Array.isArray(valorAguardar)) {
        valorAguardar = recortarRegistrosAntiguos(valorAguardar, configObjetivo.minimo);

        try {
            return intentarGuardarStorageDirecto(key, JSON.stringify(valorAguardar));
        } catch (error) {
            if (!esErrorCuotaStorage(error)) throw error;
        }
    }

    for (const config of STORAGE_KEYS_RECORTABLES) {
        if (config.key === key) continue;

        const registros = obtenerJsonStorage(config.key, []);
        if (!Array.isArray(registros) || registros.length <= config.minimo) continue;

        const registrosRecortados = recortarRegistrosAntiguos(registros, config.minimo);
        localStorage.setItem(config.key, JSON.stringify(registrosRecortados));

        try {
            return intentarGuardarStorageDirecto(key, JSON.stringify(valorAguardar));
        } catch (error) {
            if (!esErrorCuotaStorage(error)) throw error;
        }
    }

    return false;
}

function guardarJsonStorage(key, valor) {
    try {
        localStorage.setItem(key, JSON.stringify(valor));
    } catch (error) {
        if (!esErrorCuotaStorage(error)) {
            throw error;
        }

        const guardado = intentarGuardarRecortandoAntiguos(key, valor);
        if (!guardado) {
            console.error('No hay espacio suficiente para guardar datos en el navegador.', error);
            throw error;
        }

        console.warn(`Espacio de almacenamiento liberado. Se eliminaron registros antiguos para guardar ${key}.`);
    }
}

function asegurarJsonStorage(key, valorInicial) {
    if (localStorage.getItem(key) === null) {
        guardarJsonStorage(key, valorInicial);
    }
}

function crearCajeroDesdeSesion(sesion) {
    if (!sesion) return null;

    return {
        id: sesion.cajeroId,
        nombre: sesion.cajeroNombre,
        codigo: sesion.cajeroCodigo,
        cargo: sesion.cajeroCargo
    };
}

function normalizarTextoPermiso(valor) {
    return String(valor || '').trim().toLowerCase();
}

function cargoTienePermisosAdmin(cargo) {
    const cargosAdmin = APP_CONFIG.adminCargos || [];
    const cargoNormalizado = normalizarTextoPermiso(cargo);
    return cargosAdmin.some(cargoAdmin => normalizarTextoPermiso(cargoAdmin) === cargoNormalizado);
}

function cajeroTienePermisosAdmin(cajero) {
    if (!cajero) return false;
    return cajero.codigo === APP_CONFIG.adminCode || cargoTienePermisosAdmin(cajero.cargo);
}

function esAdminActual() {
    const usuarioActual = cajeroActual || (
        typeof obtenerSesionActiva === 'function'
            ? crearCajeroDesdeSesion(obtenerSesionActiva())
            : null
    );

    return cajeroTienePermisosAdmin(usuarioActual);
}

function asegurarCajeroActual() {
    if (!cajeroActual) {
        cajeroActual = crearCajeroDesdeSesion(obtenerSesionActiva());
    }

    return cajeroActual;
}

function obtenerValorInput(id) {
    return document.getElementById(id)?.value ?? '';
}

function obtenerEnteroInput(id, nombreCampo) {
    const valor = Number.parseInt(obtenerValorInput(id), 10);

    if (!Number.isFinite(valor)) {
        throw new Error(`${nombreCampo} debe ser un numero valido`);
    }

    return valor;
}
