// ==========================================
// GESTIÓN DE CAJEROS
// ==========================================

function cargarCajeros() {
    const contenedor = document.getElementById('lista-cajeros');
    if (!contenedor) return;
    
    const cajeros = obtenerDatos('cajeros');
    
    const contador = document.getElementById('contador-cajeros');
    if (contador) {
        contador.textContent = `${cajeros.length} activo${cajeros.length !== 1 ? 's' : ''}`;
    }
    
    if (!cajeros || cajeros.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px;">
                <div class="empty-state-icon" style="font-size: 3rem;">👤</div>
                <h3 style="margin-top: 16px; color: var(--text-light);">No hay cajeros registrados</h3>
            </div>
        `;
        return;
    }
    
    contenedor.innerHTML = cajeros.map(c => crearCardCajero(c)).join('');
}

function crearCardCajero(cajero) {
    if (!cajero || !cajero.id) return '';

    const passwordMask = cajero.password ? '•'.repeat(Math.min(cajero.password.length, 8)) : '••••';
    const isAdmin = cajeroTienePermisosAdmin(cajero);
    const esAdminPrincipal = cajero.codigo === APP_CONFIG.adminCode;
    const usuarioEsAdmin = esAdminActual();

    const adminBadge = isAdmin ? '<span class="admin-badge">ADMIN</span>' : '';
    const adminClass = isAdmin ? 'cajero-admin' : '';

    // SOLO ADMIN PUEDE VER ACCIONES
    let acciones = '';
    if (usuarioEsAdmin && !esAdminPrincipal) {
        acciones = `
            <button class="btn-icon btn-edit" onclick="editarCajero('${cajero.id}')" title="Editar">✏️</button>
            <button class="btn-icon btn-delete" onclick="eliminarCajero('${cajero.id}')" title="Eliminar">🗑️</button>
        `;
    }

    return `
        <div class="cajero-item ${adminClass}" id="cajero-${cajero.id}">
            <div class="cajero-info">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <h4 style="margin:0;">${cajero.nombre}</h4>
                    ${adminBadge}
                </div>
                <p style="margin:2px 0;font-size:0.9rem;color:var(--text-light);">
                    🆔 ${cajero.rut} | 🏷️ ${cajero.codigo}
                </p>
                <p style="margin:2px 0;font-size:0.9rem;color:var(--text-light);">
                    🕐 ${cajero.turno} | 👔 ${cajero.cargo}
                </p>
                ${usuarioEsAdmin ? `<p style="margin:2px 0;font-size:0.85rem;color:var(--text-light);">🔑 ${passwordMask}</p>` : ''}
            </div>
            ${acciones ? `<div class="cajero-actions">${acciones}</div>` : ''}
        </div>
    `;
}

function guardarCajero(event) {
    event.preventDefault();
    
    const id = obtenerValorInput('cajero-id');
    const password = obtenerValorInput('cajero-password');
    
    // Validar contraseña si se proporcionó
    if (password) {
        if (!/^\d+$/.test(password)) {
            mostrarNotificacion('La contraseña debe contener solo números', 'error');
            return;
        }
        
        // Todos los usuarios (incluido admin): entre 1 y 6 dígitos
        if (password.length < 1 || password.length > 6) {
            mostrarNotificacion('La contraseña debe tener entre 1 y 6 dígitos numéricos', 'error');
            return;
        }
    }
    
    const cajero = {
        id: id || `caj-${Date.now()}`,
        nombre: obtenerValorInput('cajero-nombre').trim(),
        rut: obtenerValorInput('cajero-rut').trim(),
        turno: obtenerValorInput('cajero-turno').trim(),
        codigo: obtenerValorInput('cajero-codigo').toUpperCase().trim(),
        password: password || (id ? obtenerDatos('cajeros').find(c => c.id === id)?.password : '0000'),
        cargo: obtenerValorInput('cajero-cargo').trim(),
        activo: true
    };

    if (!cajero.nombre || !cajero.codigo || !cajero.cargo) {
        mostrarNotificacion('Nombre, codigo y cargo son obligatorios', 'error');
        return;
    }
    
    if (id === 'admin-1' && cajero.codigo !== APP_CONFIG.adminCode) {
        mostrarNotificacion('No se puede cambiar el código del administrador principal', 'error');
        return;
    }
    
    let cajeros = obtenerDatos('cajeros');
    
    const codigoExistente = cajeros.find(c => c.codigo === cajero.codigo && c.id !== id);
    if (codigoExistente) {
        mostrarNotificacion('El código de cajero ya existe', 'error');
        return;
    }
    
    if (id) {
        const index = cajeros.findIndex(c => c.id === id);
        cajeros[index] = cajero;
    } else {
        cajeros.push(cajero);
    }
    
    guardarDatos('cajeros', cajeros);
    cargarCajeros();
    limpiarFormularioCajero();
    mostrarNotificacion(id ? 'Cajero actualizado' : 'Cajero agregado', 'success');
}

function editarCajero(id) {
    if (id === 'admin-1') {
        mostrarNotificacion('El administrador principal no puede ser editado desde aquí', 'error');
        return;
    }
    
    const cajeros = obtenerDatos('cajeros');
    const cajero = cajeros.find(c => c.id === id);
    
    if (!cajero) return;
    
    document.getElementById('cajero-id').value = cajero.id;
    document.getElementById('cajero-nombre').value = cajero.nombre;
    document.getElementById('cajero-rut').value = cajero.rut;
    document.getElementById('cajero-turno').value = cajero.turno;
    document.getElementById('cajero-codigo').value = cajero.codigo;
    document.getElementById('cajero-cargo').value = cajero.cargo;
    document.getElementById('cajero-password').value = '';
    
    document.getElementById('form-cajero-titulo').textContent = 'Editar Cajero';
    document.querySelector('#form-cajero .btn-primary').textContent = '💾 Actualizar';
}

function eliminarCajero(id) {
    if (!esAdminActual()) {
        mostrarNotificacion('Solo el administrador puede eliminar cajeros', 'error');
        return;
    }

    if (!confirm('¿Eliminar este cajero permanentemente?')) return;

    if (id === 'admin-1') {
        mostrarNotificacion('No se puede eliminar el administrador principal', 'error');
        return;
    }

    let cajeros = obtenerDatos('cajeros');
    const cajeroEliminado = cajeros.find(c => c.id === id);

    cajeros = cajeros.filter(c => c.id !== id);

    guardarDatos('cajeros', cajeros);
    cargarCajeros();

    mostrarNotificacion(`Cajero ${cajeroEliminado.nombre} eliminado`, 'success');
}

function limpiarFormularioCajero() {
    const form = document.getElementById('form-cajero');
    if (form) {
        form.reset();
        document.getElementById('cajero-id').value = '';
        document.getElementById('form-cajero-titulo').textContent = 'Nuevo Cajero';
        document.querySelector('#form-cajero .btn-primary').textContent = '➕ Agregar Cajero';
    }
}

function filtrarCajeros() {
    const termino = document.getElementById('buscar-cajero')?.value.toLowerCase() || '';
    const items = document.querySelectorAll('.cajero-item');
    
    items.forEach(item => {
        const texto = item.textContent.toLowerCase();
        if (texto.includes(termino)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

