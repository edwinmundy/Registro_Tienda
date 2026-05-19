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

function guardarJsonStorage(key, valor) {
    localStorage.setItem(key, JSON.stringify(valor));
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
