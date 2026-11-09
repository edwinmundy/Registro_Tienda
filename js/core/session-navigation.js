// ==========================================
// SISTEMA DE SESIONES
// ==========================================

function obtenerSesionActiva() {
    const sesion = localStorage.getItem(STORAGE_KEYS.sesion);
    if (sesion) {
        const datosSesion = parseJsonSeguro(sesion, null, STORAGE_KEYS.sesion);
        if (!datosSesion) {
            localStorage.removeItem(STORAGE_KEYS.sesion);
            return null;
        }

        const ahora = new Date().getTime();
        const expiracion = APP_CONFIG.sessionDurationMs;
        
        if (ahora - datosSesion.inicio < expiracion) {
            return datosSesion;
        } else {
            cerrarSesion();
            return null;
        }
    }
    return null;
}

function iniciarSesion(event) {
    event.preventDefault();
    
    const codigo = obtenerValorInput('login-codigo').toUpperCase().trim();
    const password = obtenerValorInput('login-password');
    
    if (!/^\d{1,6}$/.test(password)) {
        document.getElementById('login-error').textContent = '❌ La contraseña debe contener entre 1 y 6 dígitos numéricos';
        document.getElementById('login-error').style.display = 'block';
        return;
    }
    
    asegurarPasswordAdminActualizado();
    const cajeros = obtenerDatos('cajeros');
    const cajero = cajeros.find(c => c.codigo === codigo && c.password === password && c.activo);
    
    if (!cajero) {
        document.getElementById('login-error').textContent = '❌ Código o contraseña incorrectos';
        document.getElementById('login-error').style.display = 'block';
        return;
    }
    
    const sesion = {
        cajeroId: cajero.id,
        cajeroNombre: cajero.nombre,
        cajeroCodigo: cajero.codigo,
        cajeroCargo: cajero.cargo,
        inicio: new Date().getTime()
    };
    
    guardarJsonStorage(STORAGE_KEYS.sesion, sesion);
    window.location.href = 'index.html';
}

function cerrarSesion() {
    localStorage.removeItem(STORAGE_KEYS.sesion);
    cajeroActual = null;
    window.location.href = 'login.html';
}

function verificarSesion() {
    const sesion = obtenerSesionActiva();
    if (!sesion) {
        window.location.href = 'login.html';
        return false;
    }
    
    cajeroActual = crearCajeroDesdeSesion(sesion);
    
    return true;
}

function mostrarUsuarioActual() {
    const sesion = obtenerSesionActiva();
    if (sesion) {
        const userDiv = document.getElementById('user-info');
        if (userDiv) {
            userDiv.innerHTML = `
                <div class="user-session">
                    <span>👤 <strong>${sesion.cajeroNombre}</strong> (${sesion.cajeroCodigo})</span>
                    <button class="logout-btn" onclick="cerrarSesion()">Cerrar Sesión</button>
                </div>
            `;
        }
    }
}

function actualizarNavegacion() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;
    
    asegurarCajeroActual();
    
    const categorias = obtenerCategorias();
    const paginaActual = window.location.pathname.split('/').pop() || 'index.html';
    const categoriaActual = obtenerCategoriaDeURL();
    
    const esPaginaCategoria = paginaActual === 'categoria.html' && categoriaActual;
    const esConteoCategoria = paginaActual === 'conteo_categoria.html';
    const esConteoCafe = paginaActual === 'conteo_cafe.html';
    const esAdmin = esAdminActual();
    const botonesRespaldo = esAdmin ? `
                <button type="button" class="nav-btn" onclick="exportarLocalStorageCompleto()">📤 Descargar respaldo</button>
                <button type="button" class="nav-btn" onclick="document.getElementById('nav-backup-file-input').click()">📥 Cargar respaldo</button>
                <input type="file" id="nav-backup-file-input" accept=".json,application/json" hidden onchange="importarLocalStorageCompleto(event)">
    ` : '';
    const linksAdmin = esAdmin ? `
                <a href="auditoria.html" class="nav-btn ${paginaActual === 'auditoria.html' ? 'active' : ''}">📋 Auditoría</a>
                <a href="inventario.html" class="nav-btn ${paginaActual === 'inventario.html' ? 'active' : ''}">📊 Reportes</a>

    ` : '';
    const configCategoriasAdmin = esAdmin
        ? `<a href="categorias.html" class="nav-btn ${paginaActual === 'categorias.html' ? 'active' : ''}">⚙️ Config. cat.</a>`
        : '';
    
    let html = `
        <div class="nav-wrapper">
            <div class="main-nav">
                <a href="index.html" class="nav-btn ${paginaActual === 'index.html' ? 'active' : ''}">🏠 Inicio</a>
                ${botonesRespaldo}
                <a href="conteo_cigarrillos.html" class="nav-btn ${paginaActual === 'conteo_cigarrillos.html' ? 'active' : ''}">🚬 Cigarrillos</a>
                <a href="historial_conteos.html" class="nav-btn ${paginaActual === 'historial_conteos.html' ? 'active' : ''}">📜 Hist. Cigarrillos</a>
                <a href="conteo_categoria.html" class="nav-btn ${esConteoCategoria ? 'active' : ''}">📊 Conteo Cat.</a>
                <a href="conteo_cafe.html" class="nav-btn ${esConteoCafe ? 'active' : ''}">☕ Café</a>
                <a href="cajeros.html" class="nav-btn ${paginaActual === 'cajeros.html' ? 'active' : ''}">👤 Cajeros</a>
                <a href="neveras.html" class="nav-btn ${paginaActual === 'neveras.html' ? 'active' : ''}">🌡️ Neveras</a>
                <a href="checklists.html" class="nav-btn ${paginaActual === 'checklists.html' ? 'active' : ''}">☑ Checklists</a>
                <a href="cierre_de_caja.html" class="nav-btn ${paginaActual === 'cierre_de_caja.html' ? 'active' : ''}">💵 Cierre caja</a>

                <div class="categories-dropdown-container ${esPaginaCategoria ? 'active' : ''}" id="categories-dropdown">
                    <button class="nav-btn categories-toggle" onclick="toggleCategoriesDropdown(event)">
                        <span>📁 Categorías</span>
                        <span class="categories-arrow">▼</span>
                    </button>
                    <div class="categories-dropdown-menu" id="categories-menu">
                        ${generarListaCategoriasDropdown(categorias, categoriaActual)}
                    </div>
                </div>
                ${linksAdmin}
                ${configCategoriasAdmin}
            </div>
        </div>
    `;
    
    nav.innerHTML = html;
}

function generarListaCategoriasDropdown(categorias, categoriaActualId) {
    if (categorias.length === 0) {
        return `
            <div class="dropdown-empty">
                <div class="empty-icon">📁</div>
                <p>No hay categorías</p>
                ${esAdminActual() ? '<a href="categorias.html">Crear categoría</a>' : ''}
            </div>
        `;
    }
    
    return categorias.map(cat => {
        const items = obtenerDatos(cat.id);
        const count = items.length;
        const alertas = items.filter(i => i.cantidad <= i.minimo).length;
        const esActiva = cat.id === categoriaActualId;
        
        let alertaHtml = alertas > 0 ? `<span class="dropdown-alert">${alertas}</span>` : '';
        
        return `
            <a href="categoria.html?cat=${cat.id}" class="dropdown-item ${esActiva ? 'active' : ''}">
                <span class="dropdown-icon">${cat.icono}</span>
                <span class="dropdown-name">${cat.nombre}</span>
                <span class="dropdown-count">${count}</span>
                ${alertaHtml}
            </a>
        `;
    }).join('');
}

function toggleCategoriesDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('categories-dropdown');
    dropdown.classList.toggle('open');
}

document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('categories-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

