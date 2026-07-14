// ==========================================
// CONFIGURACION DE VIDA UTIL POR PRODUCTO
// ==========================================

const VIDA_UTIL_STORAGE_KEY = 'inventario_vida_util_productos';
const VIDA_UTIL_DEFAULT_DIAS = 3;

function crearIdVidaUtil(categoriaId, productoId) {
    return `${categoriaId}::${productoId}`;
}

function obtenerRegistrosVidaUtil() {
    const registros = obtenerJsonStorage(VIDA_UTIL_STORAGE_KEY, []);
    return Array.isArray(registros) ? registros : [];
}

function guardarRegistrosVidaUtil(registros) {
    guardarJsonStorage(VIDA_UTIL_STORAGE_KEY, registros);
}

function obtenerMapaVidaUtil(registros = obtenerRegistrosVidaUtil()) {
    return new Map(registros.map(registro => [registro.id, registro]));
}

function normalizarDiasVidaUtil(valor) {
    const dias = Number.parseInt(valor, 10);
    return Number.isFinite(dias) && dias > 0 ? dias : VIDA_UTIL_DEFAULT_DIAS;
}

function sincronizarVidaUtilProductos() {
    if (typeof obtenerCategorias !== 'function' || typeof obtenerDatos !== 'function') {
        return obtenerRegistrosVidaUtil();
    }

    const existentes = obtenerRegistrosVidaUtil().map(registro => ({
        ...registro,
        existeEnCategoria: false
    }));
    const mapa = obtenerMapaVidaUtil(existentes);
    const categorias = obtenerCategorias();
    let huboCambios = false;

    categorias.forEach(categoria => {
        const productos = obtenerDatos(categoria.id);

        productos.forEach(producto => {
            const id = crearIdVidaUtil(categoria.id, producto.id);
            const registroActual = mapa.get(id);

            if (registroActual) {
                const actualizado = {
                    ...registroActual,
                    productoId: producto.id,
                    productoNombre: producto.nombre || producto.id,
                    categoriaId: categoria.id,
                    categoriaNombre: categoria.nombre,
                    existeEnCategoria: true
                };

                mapa.set(id, actualizado);
                huboCambios = huboCambios
                    || registroActual.productoNombre !== actualizado.productoNombre
                    || registroActual.categoriaNombre !== actualizado.categoriaNombre
                    || registroActual.existeEnCategoria !== true;
                return;
            }

            mapa.set(id, {
                id,
                productoId: producto.id,
                productoNombre: producto.nombre || producto.id,
                categoriaId: categoria.id,
                categoriaNombre: categoria.nombre,
                vidaUtilDias: VIDA_UTIL_DEFAULT_DIAS,
                habilitado: true,
                existeEnCategoria: true,
                creadoEn: new Date().toISOString()
            });
            huboCambios = true;
        });
    });

    const registros = Array.from(mapa.values()).sort((a, b) => {
        const categoria = String(a.categoriaNombre || '').localeCompare(String(b.categoriaNombre || ''), 'es');
        if (categoria !== 0) return categoria;
        return String(a.productoNombre || '').localeCompare(String(b.productoNombre || ''), 'es');
    });

    if (huboCambios || registros.some(registro => registro.existeEnCategoria === false)) {
        guardarRegistrosVidaUtil(registros);
    }

    return registros;
}

function obtenerConfigVidaUtilProducto(categoriaId, productoId) {
    const id = crearIdVidaUtil(categoriaId, productoId);
    const registros = sincronizarVidaUtilProductos();
    return registros.find(registro => registro.id === id) || {
        id,
        categoriaId,
        productoId,
        vidaUtilDias: VIDA_UTIL_DEFAULT_DIAS,
        habilitado: true,
        existeEnCategoria: true
    };
}

function productoVidaUtilHabilitado(categoriaId, productoId) {
    return obtenerConfigVidaUtilProducto(categoriaId, productoId).habilitado !== false;
}

function obtenerVidaUtilDiasProducto(categoriaId, productoId) {
    return normalizarDiasVidaUtil(obtenerConfigVidaUtilProducto(categoriaId, productoId).vidaUtilDias);
}

function filtrarProductosVidaUtilHabilitados(categoriaId, productos) {
    if (!Array.isArray(productos)) return [];

    const registros = sincronizarVidaUtilProductos();
    const mapa = obtenerMapaVidaUtil(registros);

    return productos.filter(producto => {
        const registro = mapa.get(crearIdVidaUtil(categoriaId, producto.id));
        return !registro || registro.habilitado !== false;
    });
}

function actualizarVidaUtilProducto(id, cambios) {
    const registros = sincronizarVidaUtilProductos();
    const index = registros.findIndex(registro => registro.id === id);

    if (index === -1) return false;

    registros[index] = {
        ...registros[index],
        ...cambios,
        vidaUtilDias: cambios.vidaUtilDias !== undefined
            ? normalizarDiasVidaUtil(cambios.vidaUtilDias)
            : normalizarDiasVidaUtil(registros[index].vidaUtilDias),
        habilitado: cambios.habilitado !== undefined
            ? Boolean(cambios.habilitado)
            : registros[index].habilitado !== false,
        actualizadoEn: new Date().toISOString()
    };

    guardarRegistrosVidaUtil(registros);
    return true;
}

