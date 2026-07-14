// ==========================================
// UTILIDADES
// ==========================================

function mostrarNotificacion(mensaje, tipo = 'success') {
    const iconos = {
        success: 'OK',
        error: '!',
        warning: '!',
        info: 'i'
    };

    let container = document.getElementById('app-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'app-toast-container';
        container.className = 'app-toast-container';
        document.body.appendChild(container);
    }

    const notif = document.createElement('div');
    notif.className = `app-toast app-toast-${tipo || 'info'}`;
    notif.innerHTML = `
        <span class="app-toast-icon">${iconos[tipo] || iconos.info}</span>
        <span class="app-toast-message"></span>
    `;
    notif.querySelector('.app-toast-message').textContent = mensaje;
    
    container.appendChild(notif);
    
    setTimeout(() => {
        notif.classList.add('app-toast-exit');
        setTimeout(() => notif.remove(), 300);
    }, APP_CONFIG.notificationDurationMs);
}

function formatearMensajeEmergente(mensaje) {
    return String(mensaje || '')
        .split('\n')
        .map(linea => linea.trim())
        .filter(Boolean);
}

function mostrarDialogoSistema({
    titulo = 'Confirmación',
    mensaje = '',
    tipo = 'info',
    textoAceptar = 'Aceptar',
    textoCancelar = 'Cancelar',
    mostrarCancelar = true,
    input = false,
    inputTipo = 'text',
    inputValor = '',
    inputPlaceholder = ''
} = {}) {
    return new Promise(resolve => {
        const existente = document.getElementById('app-dialog-overlay');
        if (existente) existente.remove();

        const overlay = document.createElement('div');
        overlay.id = 'app-dialog-overlay';
        overlay.className = `app-dialog-overlay app-dialog-${tipo || 'info'}`;

        const lineas = formatearMensajeEmergente(mensaje);
        overlay.innerHTML = `
            <div class="app-dialog" role="dialog" aria-modal="true">
                <div class="app-dialog-header">
                    <span class="app-dialog-icon" aria-hidden="true"></span>
                    <div>
                        <h3 class="app-dialog-title"></h3>
                    </div>
                    <button type="button" class="app-dialog-close" aria-label="Cerrar">&times;</button>
                </div>
                <div class="app-dialog-body"></div>
                <div class="app-dialog-input-wrap" style="display: none;">
                    <input class="app-dialog-input" autocomplete="off">
                </div>
                <div class="app-dialog-actions">
                    <button type="button" class="btn-secondary app-dialog-cancel"></button>
                    <button type="button" class="btn-primary app-dialog-accept"></button>
                </div>
            </div>
        `;

        const icono = overlay.querySelector('.app-dialog-icon');
        const tituloEl = overlay.querySelector('.app-dialog-title');
        const body = overlay.querySelector('.app-dialog-body');
        const closeBtn = overlay.querySelector('.app-dialog-close');
        const cancelBtn = overlay.querySelector('.app-dialog-cancel');
        const acceptBtn = overlay.querySelector('.app-dialog-accept');
        const inputWrap = overlay.querySelector('.app-dialog-input-wrap');
        const inputEl = overlay.querySelector('.app-dialog-input');

        icono.textContent = tipo === 'success' ? 'OK' : tipo === 'error' || tipo === 'warning' ? '!' : 'i';
        tituloEl.textContent = titulo;
        acceptBtn.textContent = textoAceptar;
        cancelBtn.textContent = textoCancelar;
        cancelBtn.style.display = mostrarCancelar ? 'inline-flex' : 'none';

        lineas.forEach(linea => {
            const p = document.createElement('p');
            p.textContent = linea;
            body.appendChild(p);
        });

        if (input) {
            inputWrap.style.display = 'block';
            inputEl.type = inputTipo;
            inputEl.value = inputValor || '';
            inputEl.placeholder = inputPlaceholder || '';
        }

        const cerrar = valor => {
            overlay.classList.add('app-dialog-closing');
            setTimeout(() => {
                overlay.remove();
                resolve(valor);
            }, 180);
        };

        closeBtn.addEventListener('click', () => cerrar(input ? null : false));
        cancelBtn.addEventListener('click', () => cerrar(input ? null : false));
        acceptBtn.addEventListener('click', () => cerrar(input ? inputEl.value : true));
        overlay.addEventListener('click', event => {
            if (event.target === overlay) cerrar(input ? null : false);
        });
        overlay.addEventListener('keydown', event => {
            if (event.key === 'Escape') cerrar(input ? null : false);
            if (event.key === 'Enter' && input) {
                event.preventDefault();
                cerrar(inputEl.value);
            }
        });

        document.body.appendChild(overlay);

        if (input) {
            setTimeout(() => {
                inputEl.focus();
                inputEl.select();
            }, 0);
        } else {
            setTimeout(() => acceptBtn.focus(), 0);
        }
    });
}

function confirmarAccion(mensaje, opciones = {}) {
    return mostrarDialogoSistema({
        titulo: opciones.titulo || 'Confirmar acción',
        mensaje,
        tipo: opciones.tipo || 'warning',
        textoAceptar: opciones.textoAceptar || 'Aceptar',
        textoCancelar: opciones.textoCancelar || 'Cancelar',
        mostrarCancelar: true
    });
}

function solicitarDato(mensaje, valorInicial = '', opciones = {}) {
    return mostrarDialogoSistema({
        titulo: opciones.titulo || 'Ingresar dato',
        mensaje,
        tipo: opciones.tipo || 'info',
        textoAceptar: opciones.textoAceptar || 'Aceptar',
        textoCancelar: opciones.textoCancelar || 'Cancelar',
        input: true,
        inputTipo: opciones.inputTipo || 'text',
        inputValor: valorInicial || '',
        inputPlaceholder: opciones.placeholder || ''
    });
}

function mostrarMensajeSistema(mensaje, opciones = {}) {
    return mostrarDialogoSistema({
        titulo: opciones.titulo || 'Mensaje',
        mensaje,
        tipo: opciones.tipo || 'info',
        textoAceptar: opciones.textoAceptar || 'Aceptar',
        mostrarCancelar: false
    });
}

// Animaciones de emergentes
const style = document.createElement('style');
style.textContent = `
    @keyframes appToastIn {
        from { transform: translateX(24px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes appToastOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(24px); opacity: 0; }
    }

    @keyframes appDialogIn {
        from { transform: translateY(12px) scale(0.98); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
    }
`;
document.head.appendChild(style);

