// ==========================================
// SISTEMA DE CATEGORÍAS DINÁMICAS
// ==========================================

function obtenerCategorias() {
    return obtenerArrayStorage(STORAGE_KEYS.categorias);
}

function guardarCategorias(categorias) {
    guardarJsonStorage(STORAGE_KEYS.categorias, categorias);
    actualizarNavegacion();
    // La actualización del dashboard se maneja desde index.html
}

function verCategoria(id) {
    window.location.href = `categoria.html?cat=${id}`;
}

function obtenerCategoriaDeURL() {
    try {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('cat');
        return cat || null;
    } catch (e) {
        console.error('Error al obtener categoría de URL:', e);
        return null;
    }
}

function cargarCategoriaDinamica() {
    const categoriaId = obtenerCategoriaDeURL();
    
    if (!categoriaId) {
        mostrarNotificacion('No se especificó categoría', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }
    
    const categorias = obtenerCategorias();
    const categoria = categorias.find(c => c.id === categoriaId);
    
    if (!categoria) {
        mostrarNotificacion('Categoría no encontrada', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }
    
    document.title = `${categoria.nombre} - Inventario`;
    
    const titulo = document.getElementById('cat-titulo');
    if (titulo) titulo.textContent = `${categoria.icono} ${categoria.nombre}`;
    
    const descripcion = document.getElementById('cat-descripcion');
    if (descripcion) descripcion.textContent = categoria.descripcion || `Gestión de inventario de ${categoria.nombre}`;
    
    const btnAgregar = document.getElementById('btn-agregar-item');
    if (btnAgregar) {
        // Solo admin puede agregar items
        const esAdmin = esAdminActual();
        if (esAdmin) {
            btnAgregar.onclick = () => abrirModalNuevo(categoriaId);
        } else {
            btnAgregar.style.display = 'none';
        }
    }
    
    cargarItemsEnGrid(categoriaId);
}

function cargarFiltrosCategoriasAuditoria() {
    const select = document.getElementById('filtro-categoria');
    if (!select) return;

    const categorias = obtenerCategorias();
    let options = '<option value="todas">Todas las categorías</option>';
    
    categorias.forEach(cat => {
        options += `<option value="${cat.id}">${cat.nombre} ${cat.icono}</option>`;
    });
    
    select.innerHTML = options;
}

function crearCategoria(id, nombre, icono = '📦', descripcion = '') {
    const categorias = obtenerCategorias();
    
    if (categorias.find(c => c.id === id)) {
        mostrarNotificacion('Ya existe una categoría con ese ID', 'error');
        return false;
    }
    
    if (!/^[a-z0-9-]+$/.test(id)) {
        mostrarNotificacion('El ID solo puede contener letras minúsculas, números y guiones', 'error');
        return false;
    }
    
    const nuevaCategoria = {
        id: id,
        nombre: nombre,
        icono: icono,
        descripcion: descripcion,
        protegida: false,
        fechaCreacion: new Date().toISOString()
    };
    
    categorias.push(nuevaCategoria);
    guardarCategorias(categorias);
    
    // Inicializar array vacío para la nueva categoría (sin datos default)
    guardarDatos(id, []);
    
    registrarAuditoria({
        cajeroId: cajeroActual?.id || 'system',
        cajeroNombre: cajeroActual?.nombre || 'Sistema',
        cajeroCodigo: cajeroActual?.codigo || 'SYS',
        tipo: 'creacion_categoria',
        categoria: id,
        itemNombre: nombre,
        cantidad: 0,
        stockAnterior: 0,
        stockNuevo: 0
    });
    
    mostrarNotificacion(`Categoría "${nombre}" creada correctamente`, 'success');
    
    setTimeout(() => {
        verCategoria(id);
    }, 800);
    
    return true;
}

// Alias para compatibilidad con categorias.html
const crearCategoriaCompleta = crearCategoria;

async function eliminarCategoria(id) {
    const categorias = obtenerCategorias();
    const categoria = categorias.find(c => c.id === id);
    
    if (!categoria) {
        mostrarNotificacion('Categoría no encontrada', 'error');
        return false;
    }
    
    if (categoria.protegida) {
        mostrarNotificacion('No se puede eliminar una categoría protegida', 'error');
        return false;
    }
    
    const confirmado = await confirmarAccion(
        `¿Estás seguro de eliminar la categoría "${categoria.nombre}"?\n\nSe perderán todos los items.`,
        {
            titulo: 'Eliminar categoría',
            tipo: 'warning',
            textoAceptar: 'Eliminar'
        }
    );

    if (!confirmado) {
        return false;
    }
    
    localStorage.removeItem(`inventario_${id}`);
    
    const nuevasCategorias = categorias.filter(c => c.id !== id);
    guardarCategorias(nuevasCategorias);
    
    registrarAuditoria({
        cajeroId: cajeroActual?.id || 'system',
        cajeroNombre: cajeroActual?.nombre || 'Sistema',
        cajeroCodigo: cajeroActual?.codigo || 'SYS',
        tipo: 'eliminacion_categoria',
        categoria: id,
        itemNombre: categoria.nombre,
        cantidad: 0,
        stockAnterior: 0,
        stockNuevo: 0
    });
    
    mostrarNotificacion(`Categoría "${categoria.nombre}" eliminada`, 'success');
    return true;
}

function editarCategoria(id, nuevoNombre, nuevoIcono, nuevaDescripcion) {
    const categorias = obtenerCategorias();
    const index = categorias.findIndex(c => c.id === id);
    
    if (index === -1) {
        mostrarNotificacion('Categoría no encontrada', 'error');
        return false;
    }
    
    categorias[index].nombre = nuevoNombre;
    categorias[index].icono = nuevoIcono;
    categorias[index].descripcion = nuevaDescripcion;
    
    guardarCategorias(categorias);
    mostrarNotificacion('Categoría actualizada correctamente', 'success');
    return true;
}
