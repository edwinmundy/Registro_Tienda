/**
 * ============================================
 * CONTROL DE ROTACIÓN - PASTELERÍA
 * Aplicación JavaScript Vanilla
 * v5.1 - FIFO por Categoría + Filas Completas + A siempre a la izquierda
 *        + Validación FIFO con confirmación y comentario
 * ============================================
 */

const App = (function() {
    'use strict';

    const CONFIG = {
        letras: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        alertaHoras: 4,
        timerInterval: 30000,
        storageKey: 'rotacion_panaderia_data_v5',
        historialKey: 'rotacion_panaderia_historial_v5',
        leyendaKey: 'rotacion_panaderia_leyenda_v1'
    };

    const ESTADOS = {
        disponible: 'Disponible',
        vendido: 'Vendido',
        vencido: 'Vencido',
        no_habilitado: 'No Habilitado',
        libre: 'Libre'
    };

    const PRODUCTOS_FALLBACK = ['Dona', 'Muffin', 'Croissant', 'Galleta', 'Pastel'];
    const COLORES_BASE = [
        '#0072B2', '#E69F00', '#CC79A7', '#56B4E9', '#6B7280', '#009E73',
        '#D55E00', '#332288', '#88CCEE', '#44AA99', '#117733', '#999933',
        '#DDCC77', '#CC6677', '#882255', '#AA4499', '#6699CC', '#9999CC',
        '#A6761D', '#666666', '#1B9E77', '#7570B3', '#E7298A', '#66A61E',
        '#E6AB02', '#D95F02', '#1F78B4', '#B2DF8A', '#FB9A99', '#CAB2D6'
    ];
    const COLORES_ESTADO_RESERVADOS = ['#009E73', '#D55E00', '#5F6F7A', '#ECF0F1', '#BDC3C7'];

    let state = {
        bandejas: [],
        historial: [],
        leyendas: {},
        productoSeleccionado: null,
        bandejaSeleccionada: null,
        filtroProducto: 'todos',
        filtroEstado: 'todos',
        filtroBandeja: 'todas',
        timerId: null,
        movimientoPendiente: null
    };

    function prepararCierrePorBackdrop(overlayId) {
        const overlay = document.getElementById(overlayId);
        if (!overlay) return;
        overlay.dataset.backdropMouseDown = '0';
        overlay.addEventListener('mousedown', (e) => {
            overlay.dataset.backdropMouseDown = e.target === overlay ? '1' : '0';
        });
    }

    function puedeCerrarPorBackdrop(e) {
        if (!e) return true;
        if (e.target !== e.currentTarget) return false;
        return e.currentTarget.dataset.backdropMouseDown === '1';
    }

    function getDatosIniciales() {
        return [
            {
                id: generarId(),
                nombre: 'Bandeja de Donas y Muffins',
                filas: 2,
                columnas: 5,
                productos: [
                    { tipo: 'Dona', cantidad: 4 },
                    { tipo: 'Muffin', cantidad: 6 }
                ]
            },
            {
                id: generarId(),
                nombre: 'Bandeja de Croissants',
                filas: 2,
                columnas: 6,
                productos: [
                    { tipo: 'Croissant', cantidad: 5 },
                    { tipo: 'Galleta', cantidad: 7 }
                ]
            },
            {
                id: generarId(),
                nombre: 'Bandeja de Pasteles',
                filas: 3,
                columnas: 4,
                productos: [
                    { tipo: 'Pastel', cantidad: 3 },
                    { tipo: 'Dona', cantidad: 5 }
                ]
            }
        ];
    }

    function generarId() {
        return 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function formatearFecha(fecha) {
        if (!fecha) return '--';
        const d = new Date(fecha);
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const anio = d.getFullYear();
        const hora = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const seg = String(d.getSeconds()).padStart(2, '0');
        return `${dia}-${mes}-${anio} ${hora}:${min}:${seg}`;
    }

    function calcularTiempoTranscurrido(fecha) {
        if (!fecha) return '--';
        const ahora = new Date();
        const inicio = new Date(fecha);
        const diffMs = ahora - inicio;
        const diffH = Math.floor(diffMs / (1000 * 60 * 60));
        const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffH}h ${diffM}m`;
    }

    function formatearCuentaRegresiva(msRestantes) {
        const totalMinutos = Math.max(0, Math.floor(msRestantes / (1000 * 60)));
        const dias = Math.floor(totalMinutos / (60 * 24));
        const horas = Math.floor((totalMinutos % (60 * 24)) / 60);
        const minutos = totalMinutos % 60;

        return `${dias} día(s), ${horas} hora(s), ${minutos} minuto(s)`;
    }

    function calcularTiempoRestanteProducto(producto) {
        if (!producto || producto.estado === 'libre') return '--';

        let vencimiento = producto.fechaVencimientoProgramado
            ? new Date(producto.fechaVencimientoProgramado)
            : null;

        if (!vencimiento || Number.isNaN(vencimiento.getTime())) {
            const inicio = producto.fechaExhibicion ? new Date(producto.fechaExhibicion) : null;
            if (!inicio || Number.isNaN(inicio.getTime())) return '--';
            vencimiento = new Date(inicio.getTime() + (obtenerVidaUtilHorasRotacion(producto) * 60 * 60 * 1000));
        }

        return formatearCuentaRegresiva(vencimiento.getTime() - Date.now());
    }

    function obtenerHorasTranscurridas(fecha) {
        if (!fecha) return 0;
        const ahora = new Date();
        const inicio = new Date(fecha);
        return (ahora - inicio) / (1000 * 60 * 60);
    }

    function obtenerLetra(index) {
        return CONFIG.letras[index % CONFIG.letras.length];
    }

    function obtenerIndiceLetra(letra) {
        if (!letra) return -1;
        return CONFIG.letras.indexOf(String(letra).toUpperCase());
    }

    function obtenerSiguienteLetraDisponible(bandeja, tipo) {
        let maxIndice = -1;
        bandeja.productos.forEach(producto => {
            if (producto.estado === 'libre' || producto.tipo !== tipo) return;
            const indice = obtenerIndiceLetra(producto.letra);
            if (indice > maxIndice) {
                maxIndice = indice;
            }
        });
        return obtenerLetra(maxIndice + 1);
    }

    function obtenerProductosPorTipoFIFO(bandeja, tipo) {
        return bandeja.productos
            .filter(producto => producto.estado !== 'libre' && producto.tipo === tipo)
            .sort((a, b) => {
                const indiceLetraA = obtenerIndiceLetra(a.letra);
                const indiceLetraB = obtenerIndiceLetra(b.letra);
                if (indiceLetraA !== indiceLetraB) {
                    return indiceLetraA - indiceLetraB;
                }
                const fechaA = a.fechaExhibicion ? new Date(a.fechaExhibicion).getTime() : 0;
                const fechaB = b.fechaExhibicion ? new Date(b.fechaExhibicion).getTime() : 0;
                return fechaA - fechaB;
            });
    }

    function actualizarFormMovimiento(producto, bandeja) {
        const form = document.getElementById('formMovimiento');
        const input = document.getElementById('cantidadMovimiento');
        const label = document.getElementById('cantidadMovimientoLabel');
        const help = document.getElementById('cantidadMovimientoHelp');

        if (!producto || producto.estado === 'libre') {
            form.style.display = 'none';
            input.value = 1;
            input.max = 1;
            return;
        }

        const productosTipo = obtenerProductosPorTipoFIFO(bandeja, producto.tipo);
        const disponibles = productosTipo.length;
        const primeraLetra = disponibles > 0 ? productosTipo[0].letra : '--';
        const ultimaLetra = disponibles > 0 ? productosTipo[disponibles - 1].letra : '--';

        form.style.display = 'block';
        input.min = 1;
        input.max = disponibles;
        input.value = 1;
        label.textContent = `Cantidad de ${producto.tipo}`;
        help.textContent = `Disponibles en esta bandeja: ${disponibles}. Para vendido o dañado se retirará en FIFO desde ${primeraLetra} hasta ${ultimaLetra}.`;
    }

    function obtenerCantidadMovimiento(producto, bandeja) {
        const input = document.getElementById('cantidadMovimiento');
        const disponibles = obtenerProductosPorTipoFIFO(bandeja, producto.tipo).length;
        const valor = parseInt(input.value, 10) || 1;
        if (disponibles <= 0) return 0;
        return Math.max(1, Math.min(valor, disponibles));
    }

    function aplicarMovimientoCantidadFIFO(bandeja, tipo, cantidad, tipoMovimiento, comentario = '') {
        const productosARetirar = obtenerProductosPorTipoFIFO(bandeja, tipo).slice(0, cantidad);
        productosARetirar.forEach(producto => {
            const idxActual = bandeja.productos.findIndex(p => p.id === producto.id);
            if (idxActual !== -1) {
                aplicarMovimientoFIFO(bandeja, idxActual, tipoMovimiento, comentario, true);
            }
        });
        return productosARetirar.length;
    }

    function obtenerCodigo(tipo, letra, bandejaNombre) {
        const prefijo = tipo.substring(0, 3).toUpperCase();
        const bandejaCod = bandejaNombre.replace(/\s+/g, '').substring(0, 3).toUpperCase();
        return `${prefijo}-${bandejaCod}-${letra}`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function normalizarClaseTipo(tipo) {
        return String(tipo || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'producto';
    }

    function obtenerCategoriasConProductosRotacion() {
        if (typeof obtenerCategorias !== 'function' || typeof obtenerDatos !== 'function') {
            return [];
        }

        if (typeof sincronizarVidaUtilProductos === 'function') {
            sincronizarVidaUtilProductos();
        }

        return obtenerCategorias()
            .map(categoria => ({
                ...categoria,
                productos: typeof filtrarProductosVidaUtilHabilitados === 'function'
                    ? filtrarProductosVidaUtilHabilitados(categoria.id, obtenerDatos(categoria.id))
                    : obtenerDatos(categoria.id)
            }))
            .filter(categoria => categoria.productos.length > 0);
    }

    function obtenerCategoriaInicialRotacion() {
        const categorias = obtenerCategoriasConProductosRotacion();
        return categorias[0]?.id || '';
    }

    function generarOpcionesCategoriaRotacion(categoriaSeleccionada = '') {
        const categorias = obtenerCategoriasConProductosRotacion();

        if (categorias.length === 0) {
            return '<option value="">Productos base</option>';
        }

        return categorias.map(categoria => `
            <option value="${escapeHtml(categoria.id)}" ${categoria.id === categoriaSeleccionada ? 'selected' : ''}>
                ${escapeHtml(`${categoria.icono || '📁'} ${categoria.nombre}`)}
            </option>
        `).join('');
    }

    function generarOpcionesProductoRotacion(categoriaId = '', productoSeleccionado = '') {
        const categorias = obtenerCategoriasConProductosRotacion();
        const categoria = categorias.find(cat => cat.id === categoriaId) || categorias[0];

        if (!categoria) {
            return PRODUCTOS_FALLBACK.map(tipo => `
                <option value="${escapeHtml(tipo)}" ${tipo === productoSeleccionado ? 'selected' : ''}>${escapeHtml(tipo)}</option>
            `).join('');
        }

        return categoria.productos.map(producto => {
            const nombre = producto.nombre || producto.id;
            const stock = Number.isFinite(Number(producto.cantidad)) ? ` · Stock: ${producto.cantidad}` : '';
            const vidaUtilDias = typeof obtenerVidaUtilDiasProducto === 'function'
                ? obtenerVidaUtilDiasProducto(categoria.id, producto.id)
                : VIDA_UTIL_DEFAULT_DIAS;
            return `
                <option value="${escapeHtml(nombre)}"
                        data-categoria-id="${escapeHtml(categoria.id)}"
                        data-producto-id="${escapeHtml(producto.id)}"
                        data-vida-util-dias="${escapeHtml(vidaUtilDias)}"
                        ${nombre === productoSeleccionado ? 'selected' : ''}>
                    ${escapeHtml(`${nombre}${stock} · ${vidaUtilDias}d`)}
                </option>
            `;
        }).join('');
    }

    function obtenerProductoSeleccionadoRotacion(productoSelect) {
        const option = productoSelect?.selectedOptions?.[0];
        const tipo = productoSelect?.value || '';

        return {
            tipo,
            categoriaId: option?.dataset?.categoriaId || '',
            productoId: option?.dataset?.productoId || '',
            vidaUtilDias: parseInt(option?.dataset?.vidaUtilDias, 10) || VIDA_UTIL_DEFAULT_DIAS
        };
    }

    function obtenerDatosVidaUtilRotacion(seleccion) {
        const dias = seleccion?.categoriaId && seleccion?.productoId && typeof obtenerVidaUtilDiasProducto === 'function'
            ? obtenerVidaUtilDiasProducto(seleccion.categoriaId, seleccion.productoId)
            : normalizarDiasVidaUtil(seleccion?.vidaUtilDias || VIDA_UTIL_DEFAULT_DIAS);
        const horas = dias * 24;
        const inicio = new Date();

        return {
            vidaUtilDias: dias,
            vidaUtilHoras: horas,
            fechaVencimientoProgramado: new Date(inicio.getTime() + (horas * 60 * 60 * 1000)).toISOString()
        };
    }

    function obtenerVidaUtilHorasRotacion(producto) {
        if (Number.isFinite(Number(producto?.vidaUtilHoras)) && Number(producto.vidaUtilHoras) > 0) {
            return Number(producto.vidaUtilHoras);
        }

        if (Number.isFinite(Number(producto?.vidaUtilDias)) && Number(producto.vidaUtilDias) > 0) {
            return Number(producto.vidaUtilDias) * 24;
        }

        if (producto?.categoriaId && producto?.productoId && typeof obtenerVidaUtilDiasProducto === 'function') {
            return obtenerVidaUtilDiasProducto(producto.categoriaId, producto.productoId) * 24;
        }

        return VIDA_UTIL_DEFAULT_DIAS * 24;
    }

    function descontarStockInventarioRotacion(items) {
        if (typeof obtenerDatos !== 'function' || typeof guardarDatos !== 'function') {
            return true;
        }

        const agrupados = new Map();
        items.forEach(item => {
            if (!item.categoriaId || !item.productoId || item.cantidad <= 0) return;
            const key = `${item.categoriaId}::${item.productoId}`;
            agrupados.set(key, {
                categoriaId: item.categoriaId,
                productoId: item.productoId,
                tipo: item.tipo,
                cantidad: (agrupados.get(key)?.cantidad || 0) + item.cantidad
            });
        });

        const cambiosPorCategoria = new Map();

        for (const item of agrupados.values()) {
            const productos = cambiosPorCategoria.get(item.categoriaId) || obtenerDatos(item.categoriaId);
            const producto = productos.find(p => p.id === item.productoId);
            const stockActual = Number(producto?.cantidad || 0);

            if (!producto || stockActual < item.cantidad) {
                mostrarToast(`Stock insuficiente para ${item.tipo}`, 'error');
                return false;
            }

            producto.cantidad = stockActual - item.cantidad;
            cambiosPorCategoria.set(item.categoriaId, productos);
        }

        cambiosPorCategoria.forEach((productos, categoriaId) => {
            guardarDatos(categoriaId, productos);
        });

        return true;
    }

    function obtenerCodigoProducto(producto) {
        return producto?.productoId || producto?.codigo || '--';
    }

    function cargarLeyendasStorage() {
        try {
            const data = localStorage.getItem(CONFIG.leyendaKey);
            state.leyendas = data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Error cargando leyendas:', e);
            state.leyendas = {};
        }
    }

    function guardarLeyendasStorage() {
        guardarJsonStorage(CONFIG.leyendaKey, state.leyendas);
    }

    function obtenerTiposLeyenda() {
        const tipos = new Set();
        state.bandejas.forEach(bandeja => {
            bandeja.productos.forEach(producto => {
                if (producto.tipo && producto.estado !== 'libre') {
                    tipos.add(producto.tipo);
                }
            });
        });

        obtenerCategoriasConProductosRotacion().forEach(categoria => {
            categoria.productos.forEach(producto => tipos.add(producto.nombre || producto.id));
        });

        if (tipos.size === 0) {
            PRODUCTOS_FALLBACK.forEach(tipo => tipos.add(tipo));
        }

        return Array.from(tipos).sort((a, b) => a.localeCompare(b, 'es'));
    }

    function normalizarColorRgb(color) {
        const probe = document.createElement('span');
        probe.style.color = color;
        document.body.appendChild(probe);
        const rgb = getComputedStyle(probe).color;
        probe.remove();
        return rgb.replace(/\s+/g, '').toLowerCase();
    }

    function hslAHex(h, s, l) {
        const saturacion = s / 100;
        const luminosidad = l / 100;
        const chroma = (1 - Math.abs(2 * luminosidad - 1)) * saturacion;
        const huePrime = h / 60;
        const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
        const match = luminosidad - chroma / 2;
        let r = 0;
        let g = 0;
        let b = 0;

        if (huePrime >= 0 && huePrime < 1) [r, g, b] = [chroma, x, 0];
        else if (huePrime < 2) [r, g, b] = [x, chroma, 0];
        else if (huePrime < 3) [r, g, b] = [0, chroma, x];
        else if (huePrime < 4) [r, g, b] = [0, x, chroma];
        else if (huePrime < 5) [r, g, b] = [x, 0, chroma];
        else [r, g, b] = [chroma, 0, x];

        return [r, g, b]
            .map(valor => Math.round((valor + match) * 255).toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase()
            .padStart(6, '0')
            .replace(/^/, '#');
    }

    function obtenerColorCandidato(index) {
        if (index < COLORES_BASE.length) {
            return COLORES_BASE[index];
        }

        const hue = (index * 137.508 + 24) % 360;
        return hslAHex(hue, 68, 54);
    }

    function obtenerSiguienteColorDisponible(usados, inicio = 0) {
        let index = inicio;

        while (index < inicio + 720) {
            const color = obtenerColorCandidato(index);
            const colorKey = normalizarColorRgb(color);

            if (!usados.has(colorKey)) {
                return { color, siguienteIndice: index + 1 };
            }

            index++;
        }

        return { color: '#0072B2', siguienteIndice: index + 1 };
    }

    function sincronizarLeyendasUnicas() {
        const tipos = obtenerTiposLeyenda();
        const usados = new Set(COLORES_ESTADO_RESERVADOS.map(color => normalizarColorRgb(color)));
        const leyendasActualizadas = { ...state.leyendas };
        let indiceColor = 0;
        let huboCambios = false;

        tipos.forEach(tipo => {
            const colorActual = leyendasActualizadas[tipo];
            const colorActualKey = colorActual ? normalizarColorRgb(colorActual) : '';

            if (colorActual && !usados.has(colorActualKey)) {
                usados.add(colorActualKey);
                return;
            }

            const asignacion = obtenerSiguienteColorDisponible(usados, indiceColor);
            leyendasActualizadas[tipo] = asignacion.color;
            usados.add(normalizarColorRgb(asignacion.color));
            indiceColor = asignacion.siguienteIndice;
            huboCambios = true;
        });

        if (huboCambios) {
            state.leyendas = leyendasActualizadas;
            guardarLeyendasStorage();
        }

        return huboCambios;
    }

    function colorPorDefecto(tipo) {
        const tipos = obtenerTiposLeyenda();
        const index = Math.max(tipos.indexOf(tipo), 0);
        return obtenerColorCandidato(index);
    }

    function obtenerColorProducto(tipo) {
        if (!state.leyendas[tipo]) {
            sincronizarLeyendasUnicas();
        }

        return state.leyendas[tipo] || colorPorDefecto(tipo);
    }

    function pintarProductoSegunLeyenda(elemento, tipo) {
        if (!tipo || elemento.classList.contains('estado-libre')) return;
        const color = obtenerColorProducto(tipo);
        elemento.style.background = `linear-gradient(135deg, ${color}, ${color})`;
    }

    function renderLeyenda() {
        const lista = document.getElementById('leyendaLista');
        if (!lista) return;
        sincronizarLeyendasUnicas();

        const tiposHtml = obtenerTiposLeyenda().map(tipo => `
            <div class="leyenda-item">
                <span class="leyenda-color" style="background:${obtenerColorProducto(tipo)}"></span>
                ${escapeHtml(tipo)}
            </div>
        `).join('');

        lista.innerHTML = tiposHtml + `
            <div class="leyenda-item"><span class="leyenda-color vendido"></span> Vendido</div>
            <div class="leyenda-item"><span class="leyenda-color vencido"></span> Vencido</div>
            <div class="leyenda-item"><span class="leyenda-color no-habilitado"></span> No Habilitado</div>
            <div class="leyenda-item"><span class="leyenda-color libre"></span> Libre</div>
        `;

        const btnEditar = document.getElementById('btnEditarLeyenda');
        if (btnEditar) {
            btnEditar.style.display = esAdminActual() ? 'inline-flex' : 'none';
        }
    }

    function toggleLeyenda() {
        const lista = document.getElementById('leyendaLista');
        if (!lista) return;

        const estaAbierta = lista.classList.toggle('leyenda-lista-abierta');
        const boton = document.querySelector('.leyenda-toggle');
        const icono = document.getElementById('leyendaToggleIcon');

        if (boton) {
            boton.setAttribute('aria-expanded', String(estaAbierta));
        }

        if (icono) {
            icono.textContent = estaAbierta ? '▴' : '▾';
        }
    }

    function abrirModalLeyenda() {
        if (!esAdminActual()) {
            mostrarToast('Solo el administrador puede editar la leyenda', 'error');
            return;
        }

        sincronizarLeyendasUnicas();
        const contenedor = document.getElementById('leyendaEditorRows');
        contenedor.innerHTML = obtenerTiposLeyenda().map(tipo => `
            <div class="leyenda-editor-row">
                <input type="color" value="${obtenerColorProducto(tipo)}" data-tipo="${escapeHtml(tipo)}">
                <label title="${escapeHtml(tipo)}">${escapeHtml(tipo)}</label>
            </div>
        `).join('');

        document.getElementById('modalLeyendaOverlay').classList.add('active');
    }

    function cerrarModalLeyenda(e) {
        if (e && !puedeCerrarPorBackdrop(e)) return;
        const overlay = document.getElementById('modalLeyendaOverlay');
        overlay.classList.remove('active');
        overlay.dataset.backdropMouseDown = '0';
    }

    function guardarLeyenda() {
        if (!esAdminActual()) return;

        const coloresUsados = new Map();
        let conflicto = null;

        document.querySelectorAll('#leyendaEditorRows input[type="color"]').forEach(input => {
            input.closest('.leyenda-editor-row')?.classList.remove('leyenda-editor-row-error');
            const rgb = normalizarColorRgb(input.value);
            const tipo = input.dataset.tipo;

            if (coloresUsados.has(rgb) && !conflicto) {
                conflicto = {
                    color: input.value,
                    actual: tipo,
                    anterior: coloresUsados.get(rgb)
                };
                input.closest('.leyenda-editor-row')?.classList.add('leyenda-editor-row-error');
            }

            coloresUsados.set(rgb, tipo);
        });

        if (conflicto) {
            mostrarToast(`Color repetido: ${conflicto.anterior} y ${conflicto.actual}`, 'error');
            return;
        }

        document.querySelectorAll('#leyendaEditorRows input[type="color"]').forEach(input => {
            state.leyendas[input.dataset.tipo] = input.value;
        });

        guardarLeyendasStorage();
        renderLeyenda();
        renderBandejas();
        cerrarModalLeyenda();
        mostrarToast('Leyenda actualizada', 'success');
    }

    function restaurarLeyenda() {
        if (!esAdminActual()) return;

        state.leyendas = {};
        guardarLeyendasStorage();
        renderLeyenda();
        renderBandejas();
        abrirModalLeyenda();
        mostrarToast('Colores restaurados', 'success');
    }

    function actualizarSelectorProductosRotacion(categoriaInput, productoInput) {
        const categoriaSelect = typeof categoriaInput === 'string'
            ? document.getElementById(categoriaInput)
            : categoriaInput;
        const productoSelect = typeof productoInput === 'string'
            ? document.getElementById(productoInput)
            : productoInput;

        if (!productoSelect) return;

        const categoriaId = categoriaSelect?.value || obtenerCategoriaInicialRotacion();
        productoSelect.innerHTML = generarOpcionesProductoRotacion(categoriaId, productoSelect.value);
    }

    function inicializarSelectorProductoRotacion(categoriaSelect, productoSelect, categoriaId = '') {
        if (!productoSelect) return;

        const categoriaInicial = categoriaId || obtenerCategoriaInicialRotacion();
        if (categoriaSelect) {
            categoriaSelect.innerHTML = generarOpcionesCategoriaRotacion(categoriaInicial);
            categoriaSelect.value = categoriaInicial;
        }

        productoSelect.innerHTML = generarOpcionesProductoRotacion(categoriaInicial, productoSelect.value);
    }

    function crearFilaProductoInicialHtml(cantidad = 4) {
        const categoriaInicial = obtenerCategoriaInicialRotacion();
        return `
            <div class="producto-inicial-row">
                <select class="prod-inicial-categoria" onchange="app.actualizarSelectorProductosRotacion(this, this.parentElement.querySelector('.prod-inicial-tipo'))">
                    ${generarOpcionesCategoriaRotacion(categoriaInicial)}
                </select>
                <select class="prod-inicial-tipo">
                    ${generarOpcionesProductoRotacion(categoriaInicial)}
                </select>
                <input type="number" class="prod-inicial-cantidad" min="0" max="50" value="${cantidad}">
                <button class="btn-remove-row" onclick="this.parentElement.remove(); app.actualizarPreview()">✕</button>
            </div>
        `;
    }

    function guardarLocalStorage() {
        try {
            guardarJsonStorage(CONFIG.storageKey, state.bandejas);
            guardarJsonStorage(CONFIG.historialKey, state.historial);
        } catch (e) {
            console.error('Error guardando en localStorage:', e);
        }
    }

    function cargarLocalStorage() {
        try {
            const data = localStorage.getItem(CONFIG.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    state.bandejas = parsed;
                }
            }
        } catch (e) {
            console.error('Error cargando bandejas:', e);
        }
        try {
            const hist = localStorage.getItem(CONFIG.historialKey);
            if (hist) {
                const parsed = JSON.parse(hist);
                if (Array.isArray(parsed)) {
                    state.historial = parsed;
                }
            }
        } catch (e) {
            console.error('Error cargando historial:', e);
        }
        cargarLeyendasStorage();
    }

    function registrarMovimiento(tipo, producto, bandeja, detalles) {
        const movimiento = {
            id: generarId(),
            tipo: tipo,
            productoTipo: producto ? producto.tipo : null,
            productoLetra: producto ? producto.letra : null,
            productoCodigo: producto ? obtenerCodigoProducto(producto) : null,
            bandejaId: bandeja ? bandeja.id : null,
            bandejaNombre: bandeja ? bandeja.nombre : null,
            fecha: new Date().toISOString(),
            detalles: detalles || ''
        };
        state.historial.unshift(movimiento);
        if (state.historial.length > 1000) {
            state.historial = state.historial.slice(0, 1000);
        }
        guardarLocalStorage();
    }

    function getTipoMovimientoLabel(tipo) {
        const labels = {
            venta: '✅ Venta',
            vencimiento: '❌ Vencimiento',
            liberacion: '🗑️ Liberación',
            agregado: '➕ Agregado',
            no_habilitado: '🚫 No Habilitado'
        };
        return labels[tipo] || tipo;
    }

    function getBadgeClass(tipo) {
        const classes = {
            venta: 'badge-venta',
            vencimiento: 'badge-vencimiento',
            liberacion: 'badge-liberacion',
            agregado: 'badge-agregado',
            no_habilitado: 'badge-no_habilitado'
        };
        return classes[tipo] || 'badge-agregado';
    }

    function inicializarDatos() {
        cargarLocalStorage();
        if (state.bandejas.length === 0) {
            const datos = getDatosIniciales();
            state.bandejas = datos.map(b => crearBandeja(b));
            guardarLocalStorage();
        }
        sincronizarLeyendasUnicas();
    }

    function verificarEspacioSuficiente(bandeja, productosSolicitados) {
        const capacidad = bandeja.filas * bandeja.columnas;
        const productosActuales = bandeja.productos.filter(p => p.estado !== 'libre');
        const conteoActual = {};
        productosActuales.forEach(p => {
            conteoActual[p.tipo] = (conteoActual[p.tipo] || 0) + 1;
        });
        const conteoNuevo = { ...conteoActual };
        productosSolicitados.forEach(p => {
            if (p.cantidad > 0) {
                conteoNuevo[p.tipo] = (conteoNuevo[p.tipo] || 0) + p.cantidad;
            }
        });
        let filasNecesarias = 0;
        const detalles = [];
        for (const [tipo, cantidad] of Object.entries(conteoNuevo)) {
            const filasParaTipo = Math.ceil(cantidad / bandeja.columnas);
            filasNecesarias += filasParaTipo;
            detalles.push(`${tipo}: ${cantidad} productos = ${filasParaTipo} fila(s)`);
        }
        return {
            cabe: filasNecesarias <= bandeja.filas,
            filasNecesarias,
            filasDisponibles: bandeja.filas,
            detalles,
            conteoNuevo
        };
    }

    function reordenarProductosPorTipo(bandeja) {
        const capacidad = bandeja.filas * bandeja.columnas;
        const productosNoLibres = bandeja.productos.filter(p => p.estado !== 'libre');
        const libres = bandeja.productos.filter(p => p.estado === 'libre');
        const porTipo = new Map();
        productosNoLibres.forEach(p => {
            if (!porTipo.has(p.tipo)) {
                porTipo.set(p.tipo, []);
            }
            porTipo.get(p.tipo).push(p);
        });
        porTipo.forEach((productos, tipo) => {
            productos.sort((a, b) => {
                const indiceLetraA = obtenerIndiceLetra(a.letra);
                const indiceLetraB = obtenerIndiceLetra(b.letra);
                if (indiceLetraA !== indiceLetraB) {
                    return indiceLetraA - indiceLetraB;
                }
                const fechaA = a.fechaExhibicion ? new Date(a.fechaExhibicion).getTime() : 0;
                const fechaB = b.fechaExhibicion ? new Date(b.fechaExhibicion).getTime() : 0;
                return fechaA - fechaB;
            });
            productos.forEach(p => {
                p.codigo = obtenerCodigo(p.tipo, p.letra, bandeja.nombre);
            });
        });
        const tiposOrdenados = [];
        bandeja.productos.forEach(p => {
            if (p.tipo && !tiposOrdenados.includes(p.tipo)) {
                tiposOrdenados.push(p.tipo);
            }
        });
        const nuevoArray = [];
        tiposOrdenados.forEach(tipo => {
            const productos = porTipo.get(tipo) || [];
            nuevoArray.push(...productos);
            const sobrante = bandeja.columnas - (productos.length % bandeja.columnas);
            if (sobrante !== bandeja.columnas) {
                for (let i = 0; i < sobrante; i++) {
                    nuevoArray.push(crearEspacioLibre(bandeja.id));
                }
            }
        });
        nuevoArray.push(...libres);
        while (nuevoArray.length < capacidad) {
            nuevoArray.push(crearEspacioLibre(bandeja.id));
        }
        if (nuevoArray.length > capacidad) {
            nuevoArray.length = capacidad;
        }
        bandeja.productos = nuevoArray;
    }

    function crearBandeja(datos) {
        const capacidad = datos.filas * datos.columnas;
        const productos = [];
        const tiposProcesados = new Map();
        if (datos.productos && datos.productos.length > 0) {
            datos.productos.forEach(p => {
                for (let i = 0; i < p.cantidad; i++) {
                    if (productos.length >= capacidad) break;
                    const contadorTipo = tiposProcesados.get(p.tipo) || 0;
                    const letra = obtenerLetra(contadorTipo);
                    const datosVidaUtil = obtenerDatosVidaUtilRotacion(p);
                    productos.push({
                        id: generarId(),
                        tipo: p.tipo,
                        categoriaId: p.categoriaId || null,
                        productoId: p.productoId || null,
                        letra: letra,
                        codigo: p.productoId || obtenerCodigo(p.tipo, letra, datos.nombre),
                        estado: 'disponible',
                        fechaExhibicion: new Date().toISOString(),
                        fechaVenta: null,
                        fechaVencimiento: null,
                        fechaVencimientoProgramado: datosVidaUtil.fechaVencimientoProgramado,
                        vidaUtilDias: datosVidaUtil.vidaUtilDias,
                        vidaUtilHoras: datosVidaUtil.vidaUtilHoras,
                        bandejaId: datos.id
                    });
                    tiposProcesados.set(p.tipo, contadorTipo + 1);
                }
            });
        }
        while (productos.length < capacidad) {
            productos.push(crearEspacioLibre(datos.id));
        }
        const bandeja = {
            id: datos.id,
            nombre: datos.nombre,
            filas: datos.filas,
            columnas: datos.columnas,
            productos: productos
        };
        reordenarProductosPorTipo(bandeja);
        return bandeja;
    }

    function crearEspacioLibre(bandejaId) {
        return {
            id: generarId(),
            tipo: null,
            letra: null,
            codigo: null,
            estado: 'libre',
                    fechaExhibicion: null,
                    fechaVenta: null,
                    fechaVencimiento: null,
                    fechaVencimientoProgramado: null,
                    vidaUtilDias: null,
                    vidaUtilHoras: null,
                    bandejaId: bandejaId
                };
    }

    function obtenerTiposUnicos(bandeja) {
        const tipos = new Set();
        bandeja.productos.forEach(p => {
            if (p.tipo && p.estado !== 'libre') {
                tipos.add(p.tipo);
            }
        });
        return Array.from(tipos);
    }

    function recalcularLetrasPorCategoria(bandeja) {
        reordenarProductosPorTipo(bandeja);
    }

    function aplicarMovimientoFIFO(bandeja, indiceProducto, tipoMovimiento, comentario = '', esCantidad = false) {
        const producto = bandeja.productos[indiceProducto];
        if (!producto || producto.estado === 'libre') return;
        const productoOriginal = { ...producto };
        const letraOriginal = producto.letra;
        bandeja.productos.splice(indiceProducto, 1);
        bandeja.productos.push(crearEspacioLibre(bandeja.id));
        reordenarProductosPorTipo(bandeja);
        const tiempoExhibido = calcularTiempoTranscurrido(productoOriginal.fechaExhibicion);
        let detalles = `Tiempo exhibido: ${tiempoExhibido}`;
        if (tipoMovimiento === 'venta') {
            detalles += ` | Vendido desde posición ${letraOriginal}`;
        } else if (tipoMovimiento === 'vencimiento') {
            detalles += ` | Vencido desde posición ${letraOriginal}`;
        } else if (tipoMovimiento === 'liberacion') {
            detalles += ` | Liberado desde posición ${letraOriginal}`;
        }
        if (tipoMovimiento === 'no_habilitado') {
            detalles += ` | Retirado por no habilitado desde posición ${letraOriginal}`;
        }
        if (comentario && comentario.trim()) {
            detalles += ` | Motivo: ${comentario.trim()}`;
        }
        registrarMovimiento(tipoMovimiento, productoOriginal, bandeja, detalles);
        return true;
    }

    // ============================================================
    // NUEVAS FUNCIONES FIFO
    // ============================================================
    function esProductoMasAntiguo(bandeja, producto) {
        if (!producto || producto.estado === 'libre') return true;
        const productosFIFO = obtenerProductosPorTipoFIFO(bandeja, producto.tipo);
        if (productosFIFO.length === 0) return true;
        const masAntiguo = productosFIFO[0];
        return producto.id === masAntiguo.id;
    }

    function abrirModalConfirmacionFIFO(accion, cantidad = 1) {
        const producto = state.productoSeleccionado;
        const bandeja = state.bandejaSeleccionada;
        if (!producto || !bandeja) return;
        const productosFIFO = obtenerProductosPorTipoFIFO(bandeja, producto.tipo);
        const letraMasAntigua = productosFIFO.length > 0 ? productosFIFO[0].letra : 'A';
        const modal = document.getElementById('modalFIFOOverlay');
        const titulo = document.getElementById('fifoModalTitle');
        const mensaje = document.getElementById('fifoModalMensaje');
        const detalle = document.getElementById('fifoModalDetalle');
        const accionLabels = {
            'vendido': 'VENDER',
            'vencido': 'MARCAR COMO VENCIDO',
            'no_habilitado': 'RETIRAR POR NO HABILITADO'
        };
        titulo.textContent = `⚠️ Advertencia FIFO - ${accionLabels[accion] || 'RETIRAR'}`;
        if (cantidad > 1) {
            mensaje.innerHTML = `Estás intentando <strong>${accionLabels[accion] || 'retirar'}</strong> <strong>${cantidad} ${producto.tipo}(s)</strong> desde la posición <strong>${producto.letra}</strong>.`;
            detalle.innerHTML = `El orden FIFO indica que el más antiguo es <strong>${letraMasAntigua}</strong>. Al retirar múltiples unidades, se procesarán desde ${letraMasAntigua} en adelante, incluyendo posiblemente unidades más recientes. ¿Deseas continuar?`;
        } else {
            mensaje.innerHTML = `Estás intentando <strong>${accionLabels[accion] || 'retirar'}</strong> un <strong>${producto.tipo}</strong> en posición <strong>${producto.letra}</strong>.`;
            detalle.innerHTML = `<strong>¡Atención!</strong> El orden FIFO (Primero en Entrar, Primero en Salir) indica que siempre debe retirarse el producto más antiguo primero.<br><br>El producto más antiguo actual es: <strong style="color: var(--color-vencido); font-size: 18px;">${letraMasAntigua}</strong><br>Tú estás intentando retirar: <strong style="color: var(--color-warning); font-size: 18px;">${producto.letra}</strong>`;
        }
        state.movimientoPendiente = {
            accion: accion,
            cantidad: cantidad,
            producto: producto,
            bandeja: bandeja
        };
        document.getElementById('fifoComentario').value = '';
        modal.classList.add('active');
    }

    function confirmarMovimientoFIFO() {
        const comentario = document.getElementById('fifoComentario').value.trim();
        const pendiente = state.movimientoPendiente;
        if (!pendiente) return;

        // Validar que se haya ingresado un comentario obligatorio
        if (!comentario) {
            mostrarToast('⚠️ Debes escribir un comentario explicando por qué saltas el orden FIFO', 'warning');
            document.getElementById('fifoComentario').focus();
            return;
        }
        const { accion, cantidad, producto, bandeja } = pendiente;
        const idx = bandeja.productos.findIndex(p => p.id === producto.id);
        if (idx === -1) {
            cerrarModalFIFO();
            return;
        }
        let tipoMovimiento = null;
        const usaCantidad = accion === 'vendido' || accion === 'no_habilitado';
        switch (accion) {
            case 'vendido':
                tipoMovimiento = 'venta';
                break;
            case 'vencido':
                tipoMovimiento = 'vencimiento';
                break;
            case 'no_habilitado':
                tipoMovimiento = 'no_habilitado';
                break;
            case 'liberar':
                tipoMovimiento = 'liberacion';
                break;
        }
        if (tipoMovimiento) {
            let procesados = 0;
            if (usaCantidad && cantidad > 1) {
                procesados = aplicarMovimientoCantidadFIFO(bandeja, producto.tipo, cantidad, tipoMovimiento, comentario);
            } else {
                const resultado = aplicarMovimientoFIFO(bandeja, idx, tipoMovimiento, comentario);
                procesados = resultado ? 1 : 0;
            }
            const msg = {
                venta: procesados > 1
                    ? `${procesados} productos vendidos y bandeja reordenada (FIFO)`
                    : 'Producto vendido y bandeja reordenada (FIFO)',
                vencimiento: 'Producto vencido y bandeja reordenada (FIFO)',
                no_habilitado: procesados > 1
                    ? `${procesados} productos retirados por no habilitado y bandeja reordenada (FIFO)`
                    : 'Producto retirado por no habilitado y bandeja reordenada (FIFO)',
                liberacion: 'Espacio liberado y bandeja reordenada (FIFO)'
            };
            const toastType = tipoMovimiento === 'vencimiento'
                ? 'error'
                : tipoMovimiento === 'no_habilitado'
                    ? 'warning'
                    : 'success';
            mostrarToast(msg[tipoMovimiento], toastType);
        }
        guardarLocalStorage();
        renderBandejas();
        recalcularResumen();
        generarAlertas();
        cerrarModalFIFO();
        cerrarModal();
    }

    function cancelarMovimientoFIFO() {
        state.movimientoPendiente = null;
        cerrarModalFIFO();
    }

    function cerrarModalFIFO(e) {
        if (e && !puedeCerrarPorBackdrop(e)) return;
        const overlay = document.getElementById('modalFIFOOverlay');
        overlay.classList.remove('active');
        overlay.dataset.backdropMouseDown = '0';
        state.movimientoPendiente = null;
    }

    function renderBandejas() {
        const container = document.getElementById('bandejasContainer');
        sincronizarLeyendasUnicas();
        container.innerHTML = '';
        state.bandejas.forEach(bandeja => {
            const tiposUnicos = obtenerTiposUnicos(bandeja);
            const tieneMultiplesCategorias = tiposUnicos.length > 1;
            const bandejaEl = document.createElement('div');
            bandejaEl.className = 'bandeja';
            bandejaEl.dataset.id = bandeja.id;
            const header = document.createElement('div');
            header.className = 'bandeja-header';
            const accionesAdmin = esAdminActual() ? `
                <div class="bandeja-acciones">
                    <button class="btn-bandeja" title="Editar bandeja" onclick="app.editarBandeja('${bandeja.id}')">✏️</button>
                    <button class="btn-bandeja" title="Eliminar bandeja" onclick="app.eliminarBandeja('${bandeja.id}')">🗑️</button>
                </div>
            ` : '';
            header.innerHTML = `
                <div class="bandeja-info">
                    <div class="bandeja-titulo">${escapeHtml(bandeja.nombre)}</div>
                    <div class="bandeja-subtitulo">
                        <span>📐 ${bandeja.filas}×${bandeja.columnas}</span>
                        <span>📦 ${bandeja.productos.filter(p => p.estado !== 'libre').length} productos</span>
                        <span>🆓 ${bandeja.productos.filter(p => p.estado === 'libre').length} libres</span>
                        ${tieneMultiplesCategorias ? `<span class="badge-categorias">${tiposUnicos.length} categorías</span>` : ''}
                    </div>
                </div>
                ${accionesAdmin}
            `;
            const layout = document.createElement('div');
            layout.className = 'bandeja-layout';
            renderBandejaMultiCategoria(bandeja, layout, tiposUnicos);
            bandejaEl.appendChild(header);
            bandejaEl.appendChild(layout);
            container.appendChild(bandejaEl);
        });
        aplicarFiltros();
        renderLeyenda();
    }

    function renderBandejaMultiCategoria(bandeja, layout, tiposUnicos) {
        const multiContainer = document.createElement('div');
        multiContainer.className = 'multi-categoria-container';
        multiContainer.id = `grid-${bandeja.id}`;
        const filas = [];
        const bandejaVacia = tiposUnicos.length === 0;
        for (let i = 0; i < bandeja.productos.length; i += bandeja.columnas) {
            filas.push(bandeja.productos.slice(i, i + bandeja.columnas));
        }
        const bloques = [];
        let bloqueActual = null;
        filas.forEach(filaProductos => {
            const primerProductoConTipo = filaProductos.find(p => p.tipo && p.estado !== 'libre');
            const tipo = primerProductoConTipo ? primerProductoConTipo.tipo : '';
            if (!tipo && bloqueActual) {
                bloqueActual.filas.push(filaProductos);
                return;
            }
            if (!bloqueActual || bloqueActual.tipo !== tipo) {
                bloqueActual = { tipo, filas: [] };
                bloques.push(bloqueActual);
            }
            bloqueActual.filas.push(filaProductos);
        });
        bloques.forEach(bloque => {
            bloque.filas.forEach((filaProductos, filaIndex) => {
                const filaCategoria = document.createElement('div');
                filaCategoria.className = 'categoria-row';
                filaCategoria.dataset.tipo = normalizarClaseTipo(bloque.tipo);
                const mostrarSalida = (bloque.tipo && filaIndex === 0) || (bandejaVacia && filaIndex === 0);
                const mostrarEntrada = (bloque.tipo && filaIndex === bloque.filas.length - 1) || (bandejaVacia && filaIndex === bloque.filas.length - 1);
                const ladoIzquierdo = document.createElement('div');
                ladoIzquierdo.className = mostrarSalida
                    ? 'puerta puerta-salida puerta-categoria'
                    : 'puerta-placeholder';
                if (mostrarSalida) {
                    ladoIzquierdo.innerHTML = `
                        <span class="puerta-flecha">&#9664;</span>
                        <span class="puerta-icono">&#128682;</span>
                        <span class="puerta-label">SALIDA</span>
                        <span class="puerta-tipo">${bloque.tipo}</span>
                    `;
                }
                const contenidoFila = document.createElement('div');
                contenidoFila.className = 'categoria-fila-contenido';
                const productosRow = document.createElement('div');
                productosRow.className = 'categoria-productos';
                productosRow.style.gridTemplateColumns = `repeat(${filaProductos.length}, minmax(72px, auto))`;
                filaProductos.forEach(producto => {
                    const circulo = crearCirculo(producto, bandeja);
                    productosRow.appendChild(circulo);
                });
                contenidoFila.appendChild(productosRow);
                if (mostrarEntrada) {
                    const ladoDerecho = document.createElement('div');
                    ladoDerecho.className = 'puerta puerta-entrada puerta-categoria';
                    ladoDerecho.innerHTML = `
                        <span class="puerta-flecha">&#9654;</span>
                        <span class="puerta-icono">&#128682;</span>
                        <span class="puerta-label">ENTRADA</span>
                        <span class="puerta-tipo">${bloque.tipo}</span>
                    `;
                    contenidoFila.appendChild(ladoDerecho);
                }
                filaCategoria.appendChild(ladoIzquierdo);
                filaCategoria.appendChild(contenidoFila);
                multiContainer.appendChild(filaCategoria);
            });
        });
        layout.appendChild(multiContainer);
    }

    function crearCirculo(producto, bandeja) {
        const div = document.createElement('div');
        div.className = 'producto-circulo';
        div.dataset.id = producto.id;
        div.dataset.bandejaId = bandeja.id;
        if (producto.estado === 'libre') {
            div.classList.add('estado-libre');
            div.innerHTML = `
                <span class="producto-letra">+</span>
                <span class="producto-tipo-label">Libre</span>
            `;
        } else {
            div.classList.add('tipo-inventario');
            div.classList.add(`tipo-${normalizarClaseTipo(producto.tipo)}`);
            div.classList.add(`estado-${producto.estado}`);
            pintarProductoSegunLeyenda(div, producto.tipo);
            const horas = obtenerHorasTranscurridas(producto.fechaExhibicion);
            const vidaUtilHoras = obtenerVidaUtilHorasRotacion(producto);
            let timerClass = 'timer-ok';
            let timerIcon = '✓';
            if (producto.estado === 'disponible') {
                if (horas >= vidaUtilHoras) {
                    timerClass = 'timer-danger';
                    timerIcon = '!';
                    div.classList.add('alerta-tiempo');
                } else if (horas >= vidaUtilHoras * 0.75) {
                    timerClass = 'timer-warning';
                    timerIcon = '⚠';
                }
            }
            div.innerHTML = `
                <span class="producto-letra">${producto.letra}</span>
                <span class="producto-tipo-label">${producto.tipo}</span>
                ${producto.estado === 'disponible' ? `<span class="producto-timer ${timerClass}">${timerIcon}</span>` : ''}
            `;
        }
        div.addEventListener('mouseenter', (e) => mostrarTooltip(e, producto, bandeja));
        div.addEventListener('mouseleave', ocultarTooltip);
        div.addEventListener('mousemove', moverTooltip);
        div.addEventListener('click', () => abrirModal(producto, bandeja));
        return div;
    }

    function mostrarTooltip(e, producto, bandeja) {
        const tooltip = document.getElementById('tooltip');
        document.getElementById('ttProducto').textContent = producto.tipo || 'Espacio Libre';
        const ttEstado = document.getElementById('ttEstado');
        ttEstado.textContent = ESTADOS[producto.estado] || producto.estado;
        ttEstado.className = 'tooltip-estado estado-' + producto.estado;
        document.getElementById('ttPosicion').textContent = producto.letra || '--';
        document.getElementById('ttCodigo').textContent = obtenerCodigoProducto(producto);
        document.getElementById('ttExhibido').textContent = formatearFecha(producto.fechaExhibicion);
        document.getElementById('ttTiempo').textContent = calcularTiempoRestanteProducto(producto);
        tooltip.classList.add('visible');
        posicionarTooltip(e);
    }

    function ocultarTooltip() {
        document.getElementById('tooltip').classList.remove('visible');
    }

    function moverTooltip(e) {
        posicionarTooltip(e);
    }

    function posicionarTooltip(e) {
        const tooltip = document.getElementById('tooltip');
        const offset = 16;
        let left = e.clientX + offset;
        let top = e.clientY + offset;
        const rect = tooltip.getBoundingClientRect();
        if (left + rect.width > window.innerWidth) {
            left = e.clientX - rect.width - offset;
        }
        if (top + rect.height > window.innerHeight) {
            top = e.clientY - rect.height - offset;
        }
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    function abrirModal(producto, bandeja) {
        state.productoSeleccionado = producto;
        state.bandejaSeleccionada = bandeja;
        const modal = document.getElementById('modalOverlay');
        const modalInfo = document.getElementById('modalInfo');
        const modalTitle = document.getElementById('modalTitle');
        document.getElementById('formMovimiento').style.display = 'none';
        document.getElementById('formAgregar').style.display = 'none';
        if (producto.estado === 'libre') {
            modalTitle.textContent = 'Espacio Libre';
            modalInfo.innerHTML = `
                <div class="modal-info-row">
                    <span class="modal-info-label">Bandeja:</span>
                    <span class="modal-info-value">${escapeHtml(bandeja.nombre)}</span>
                </div>
                <div class="modal-info-row">
                    <span class="modal-info-label">Tamaño:</span>
                    <span class="modal-info-value">${bandeja.filas}×${bandeja.columnas}</span>
                </div>
                <div class="modal-info-row">
                    <span class="modal-info-label">Estado:</span>
                    <span class="modal-info-value">Libre</span>
                </div>
            `;
        } else {
            const horas = obtenerHorasTranscurridas(producto.fechaExhibicion);
            modalTitle.textContent = `${producto.tipo} - Posición ${producto.letra}`;
            modalInfo.innerHTML = `
                <div class="modal-info-row">
                    <span class="modal-info-label">Producto:</span>
                    <span class="modal-info-value">${producto.tipo}</span>
                </div>
                <div class="modal-info-row">
                    <span class="modal-info-label">Código:</span>
                    <span class="modal-info-value">${obtenerCodigoProducto(producto)}</span>
                </div>
                <div class="modal-info-row">
                    <span class="modal-info-label">Posición:</span>
                    <span class="modal-info-value">${producto.letra}</span>
                </div>
                <div class="modal-info-row">
                    <span class="modal-info-label">Bandeja:</span>
                    <span class="modal-info-value">${escapeHtml(bandeja.nombre)}</span>
                </div>
                <div class="modal-info-row">
                    <span class="modal-info-label">Exhibido:</span>
                    <span class="modal-info-value">${formatearFecha(producto.fechaExhibicion)}</span>
                </div>
                <div class="modal-info-row">
                    <span class="modal-info-label">Tiempo:</span>
                    <span class="modal-info-value">${calcularTiempoTranscurrido(producto.fechaExhibicion)}</span>
                </div>
                <div class="modal-info-row">
                    <span class="modal-info-label">Vida útil:</span>
                    <span class="modal-info-value">${Math.round(obtenerVidaUtilHorasRotacion(producto) / 24)} día(s)</span>
                </div>
                ${producto.fechaVencimientoProgramado ? `
                <div class="modal-info-row">
                    <span class="modal-info-label">Vence:</span>
                    <span class="modal-info-value">${formatearFecha(producto.fechaVencimientoProgramado)}</span>
                </div>` : ''}
                <div class="modal-info-row">
                    <span class="modal-info-label">Estado:</span>
                    <span class="modal-info-value">${ESTADOS[producto.estado]}</span>
                </div>
                ${producto.fechaVenta ? `
                <div class="modal-info-row">
                    <span class="modal-info-label">Vendido:</span>
                    <span class="modal-info-value">${formatearFecha(producto.fechaVenta)}</span>
                </div>` : ''}
                ${producto.fechaVencimiento ? `
                <div class="modal-info-row">
                    <span class="modal-info-label">Vencido:</span>
                    <span class="modal-info-value">${formatearFecha(producto.fechaVencimiento)}</span>
                </div>` : ''}
            `;
        }
        actualizarFormMovimiento(producto, bandeja);
        modal.classList.add('active');
    }

    function cerrarModal(e) {
        if (!puedeCerrarPorBackdrop(e)) return;
        const overlay = document.getElementById('modalOverlay');
        overlay.classList.remove('active');
        overlay.dataset.backdropMouseDown = '0';
        document.getElementById('formMovimiento').style.display = 'none';
        document.getElementById('formAgregar').style.display = 'none';
        state.productoSeleccionado = null;
        state.bandejaSeleccionada = null;
    }

    function accionModal(accion) {
        const producto = state.productoSeleccionado;
        const bandeja = state.bandejaSeleccionada;
        if (!producto || !bandeja) return;
        const idx = bandeja.productos.findIndex(p => p.id === producto.id);
        if (idx === -1) return;
        if (producto.estado === 'libre' && accion !== 'liberar') {
            if (accion === 'vendido' || accion === 'vencido' || accion === 'no_habilitado') {
                mostrarToast('No hay producto en este espacio', 'warning');
                return;
            }
        }
        let tipoMovimiento = null;
        const usaCantidad = accion === 'vendido' || accion === 'no_habilitado';
        const cantidad = usaCantidad ? obtenerCantidadMovimiento(producto, bandeja) : 1;
        if (usaCantidad && cantidad < 1) {
            mostrarToast(`No hay ${producto.tipo}(s) disponibles en esta bandeja`, 'warning');
            return;
        }
        const accionesRetiro = ['vendido', 'vencido', 'no_habilitado'];
        // Solo validar FIFO cuando la cantidad es 1. 
        // Para cantidades mayores se entiende que se retira desde A en orden FIFO.
        if (accionesRetiro.includes(accion) && cantidad === 1) {
            const esAntiguo = esProductoMasAntiguo(bandeja, producto);
            if (!esAntiguo) {
                abrirModalConfirmacionFIFO(accion, cantidad);
                return;
            }
        }
        switch (accion) {
            case 'vendido':
                tipoMovimiento = 'venta';
                break;
            case 'vencido':
                tipoMovimiento = 'vencimiento';
                break;
            case 'no_habilitado':
                tipoMovimiento = 'no_habilitado';
                break;
            case 'liberar':
                if (producto.estado === 'libre') {
                    mostrarToast('El espacio ya está libre', 'warning');
                    return;
                }
                tipoMovimiento = 'liberacion';
                break;
        }
        if (tipoMovimiento) {
            const procesados = usaCantidad
                ? aplicarMovimientoCantidadFIFO(bandeja, producto.tipo, cantidad, tipoMovimiento)
                : (aplicarMovimientoFIFO(bandeja, idx, tipoMovimiento), 1);
            const msg = {
                venta: procesados > 1
                    ? `${procesados} productos vendidos y bandeja reordenada (FIFO)`
                    : 'Producto vendido y bandeja reordenada (FIFO)',
                vencimiento: 'Producto vencido y bandeja reordenada (FIFO)',
                no_habilitado: procesados > 1
                    ? `${procesados} productos retirados por no habilitado y bandeja reordenada (FIFO)`
                    : 'Producto retirado por no habilitado y bandeja reordenada (FIFO)',
                liberacion: 'Espacio liberado y bandeja reordenada (FIFO)'
            };
            const toastType = tipoMovimiento === 'vencimiento'
                ? 'error'
                : tipoMovimiento === 'no_habilitado'
                    ? 'warning'
                    : 'success';
            mostrarToast(msg[tipoMovimiento], toastType);
        }
        guardarLocalStorage();
        renderBandejas();
        recalcularResumen();
        generarAlertas();
        cerrarModal();
    }

    function mostrarFormAgregar() {
        document.getElementById('formAgregar').style.display = 'block';
        inicializarSelectorProductoRotacion(
            document.getElementById('nuevoCategoria'),
            document.getElementById('nuevoTipo')
        );
    }

    function confirmarAgregar() {
        const seleccion = obtenerProductoSeleccionadoRotacion(document.getElementById('nuevoTipo'));
        const tipo = seleccion.tipo;
        const cantidad = parseInt(document.getElementById('nuevaCantidad').value) || 1;
        const producto = state.productoSeleccionado;
        const bandeja = state.bandejaSeleccionada;
        if (!producto || !bandeja) return;
        if (!tipo) {
            mostrarToast('Selecciona un producto', 'error');
            return;
        }
        if (seleccion.categoriaId && seleccion.productoId && !productoVidaUtilHabilitado(seleccion.categoriaId, seleccion.productoId)) {
            mostrarToast('Este producto está deshabilitado en Vida útil', 'error');
            return;
        }
        const verificacion = verificarEspacioSuficiente(bandeja, [{ tipo, cantidad }]);
        if (!verificacion.cabe) {
            mostrarToast(
                `❌ No caben ${cantidad} ${tipo}(s). Se necesitan ${verificacion.filasNecesarias} filas pero solo hay ${verificacion.filasDisponibles}. Reconfigure la bandeja.`,
                'error'
            );
            return;
        }
        if (!descontarStockInventarioRotacion([{ ...seleccion, cantidad }])) {
            return;
        }
        let agregados = 0;
        const productosAgregados = [];
        for (let i = 0; i < bandeja.productos.length && agregados < cantidad; i++) {
            if (bandeja.productos[i].estado === 'libre') {
                const letra = obtenerSiguienteLetraDisponible(bandeja, tipo);
                const datosVidaUtil = obtenerDatosVidaUtilRotacion(seleccion);
                const nuevoProducto = {
                    id: generarId(),
                    tipo: tipo,
                    categoriaId: seleccion.categoriaId || null,
                    productoId: seleccion.productoId || null,
                    letra: letra,
                    codigo: seleccion.productoId || obtenerCodigo(tipo, letra, bandeja.nombre),
                    estado: 'disponible',
                    fechaExhibicion: new Date().toISOString(),
                    fechaVenta: null,
                    fechaVencimiento: null,
                    fechaVencimientoProgramado: datosVidaUtil.fechaVencimientoProgramado,
                    vidaUtilDias: datosVidaUtil.vidaUtilDias,
                    vidaUtilHoras: datosVidaUtil.vidaUtilHoras,
                    bandejaId: bandeja.id
                };
                bandeja.productos[i] = nuevoProducto;
                productosAgregados.push(nuevoProducto);
                agregados++;
            }
        }
        reordenarProductosPorTipo(bandeja);
        productosAgregados.forEach(p => {
            registrarMovimiento('agregado', p, bandeja,
                `Agregado en posición ${p.letra} | Entrada por puerta derecha`);
        });
        guardarLocalStorage();
        renderBandejas();
        recalcularResumen();
        generarAlertas();
        cerrarModal();
        mostrarToast(`${agregados} producto(s) agregado(s) por ENTRADA`, 'success');
        document.getElementById('nuevaCantidad').value = 1;
    }

    function abrirModalNuevaBandeja() {
        document.getElementById('nuevoNombreBandeja').value = '';
        document.getElementById('nuevasFilas').value = 3;
        document.getElementById('nuevasColumnas').value = 5;
        const container = document.getElementById('productosIniciales');
        container.innerHTML = crearFilaProductoInicialHtml(4);
        actualizarPreview();
        document.getElementById('modalBandejaOverlay').classList.add('active');
    }

    function cerrarModalBandeja(e) {
        if (!puedeCerrarPorBackdrop(e)) return;
        const overlay = document.getElementById('modalBandejaOverlay');
        overlay.classList.remove('active');
        overlay.dataset.backdropMouseDown = '0';
    }

    function actualizarPreview() {
        const filas = parseInt(document.getElementById('nuevasFilas').value) || 3;
        const columnas = parseInt(document.getElementById('nuevasColumnas').value) || 5;
        const previewGrid = document.getElementById('previewGrid');
        const previewInfo = document.getElementById('previewInfo');
        previewGrid.innerHTML = '';
        previewGrid.style.gridTemplateColumns = `repeat(${columnas}, 28px)`;
        const total = filas * columnas;
        for (let i = 0; i < total && i < 60; i++) {
            const celda = document.createElement('div');
            celda.className = 'preview-celda';
            previewGrid.appendChild(celda);
        }
        previewInfo.textContent = `${total} espacios (${filas} filas × ${columnas} columnas)`;
    }

    function agregarFilaProductoInicial() {
        const container = document.getElementById('productosIniciales');
        const row = document.createElement('div');
        row.innerHTML = crearFilaProductoInicialHtml(4);
        const nuevaFila = row.firstElementChild;
        container.appendChild(nuevaFila);
    }

    function confirmarNuevaBandeja() {
        const nombre = document.getElementById('nuevoNombreBandeja').value.trim();
        const filas = parseInt(document.getElementById('nuevasFilas').value) || 3;
        const columnas = parseInt(document.getElementById('nuevasColumnas').value) || 5;
        if (!nombre) {
            mostrarToast('Debes ingresar un nombre para la bandeja', 'error');
            return;
        }
        if (filas < 1 || filas > 10 || columnas < 1 || columnas > 15) {
            mostrarToast('Filas: 1-10, Columnas: 1-15', 'error');
            return;
        }
        const productosIniciales = [];
        const rows = document.querySelectorAll('.producto-inicial-row');
        let tieneProductoInvalido = false;
        rows.forEach(row => {
            const seleccion = obtenerProductoSeleccionadoRotacion(row.querySelector('.prod-inicial-tipo'));
            const tipo = seleccion.tipo;
            const cantidad = parseInt(row.querySelector('.prod-inicial-cantidad').value) || 0;
            if (cantidad > 0) {
                if (!tipo) {
                    tieneProductoInvalido = true;
                    return;
                }
                if (seleccion.categoriaId && seleccion.productoId && !productoVidaUtilHabilitado(seleccion.categoriaId, seleccion.productoId)) {
                    tieneProductoInvalido = true;
                    return;
                }
                productosIniciales.push({ ...seleccion, cantidad });
            }
        });
        if (tieneProductoInvalido) {
            mostrarToast('Selecciona producto en todas las filas con cantidad', 'error');
            return;
        }
        const bandejaTemporal = {
            id: generarId(),
            nombre: nombre,
            filas: filas,
            columnas: columnas,
            productos: []
        };
        const capacidad = filas * columnas;
        for (let i = 0; i < capacidad; i++) {
            bandejaTemporal.productos.push(crearEspacioLibre(bandejaTemporal.id));
        }
        const verificacion = verificarEspacioSuficiente(bandejaTemporal, productosIniciales);
        if (!verificacion.cabe) {
            mostrarToast(
                `❌ Los productos no caben. Se necesitan ${verificacion.filasNecesarias} filas pero solo configuraste ${filas}. Aumenta las filas o reduce productos.`,
                'error'
            );
            return;
        }
        if (!descontarStockInventarioRotacion(productosIniciales)) {
            return;
        }
        const nuevaBandeja = crearBandeja({
            id: generarId(),
            nombre: nombre,
            filas: filas,
            columnas: columnas,
            productos: productosIniciales
        });
        state.bandejas.push(nuevaBandeja);
        registrarMovimiento('agregado', null, nuevaBandeja,
            `Bandeja creada: ${nombre} (${filas}×${columnas}) con ${productosIniciales.reduce((s, p) => s + p.cantidad, 0)} productos iniciales`);
        guardarLocalStorage();
        renderBandejas();
        recalcularResumen();
        generarAlertas();
        actualizarFiltros();
        cerrarModalBandeja();
        mostrarToast(`Bandeja "${nombre}" creada (${filas}×${columnas})`, 'success');
    }

    async function editarBandeja(bandejaId) {
        if (!esAdminActual()) {
            mostrarToast('Solo el administrador puede editar bandejas', 'error');
            return;
        }

        const bandeja = state.bandejas.find(b => b.id === bandejaId);
        if (!bandeja) return;
        const nuevoNombre = await solicitarDato('Nuevo nombre de la bandeja:', bandeja.nombre, {
            titulo: 'Editar bandeja',
            tipo: 'info'
        });
        if (nuevoNombre === null) return;
        const nombreLimpio = nuevoNombre.trim();
        if (!nombreLimpio) {
            mostrarToast('El nombre no puede estar vacío', 'error');
            return;
        }
        const nombreAnterior = bandeja.nombre;
        bandeja.nombre = nombreLimpio;
        recalcularLetrasPorCategoria(bandeja);
        registrarMovimiento('agregado', null, bandeja, `Nombre cambiado de "${nombreAnterior}" a "${nombreLimpio}"`);
        guardarLocalStorage();
        renderBandejas();
        actualizarFiltros();
        mostrarToast('Nombre actualizado', 'success');
    }

    async function eliminarBandeja(bandejaId) {
        if (!esAdminActual()) {
            mostrarToast('Solo el administrador puede eliminar bandejas', 'error');
            return;
        }

        const bandeja = state.bandejas.find(b => b.id === bandejaId);
        if (!bandeja) return;
        const confirmado = await confirmarAccion(`¿Eliminar la bandeja "${bandeja.nombre}"?`, {
            titulo: 'Eliminar bandeja',
            tipo: 'warning',
            textoAceptar: 'Eliminar'
        });
        if (!confirmado) return;
        registrarMovimiento('liberacion', null, bandeja, `Bandeja eliminada: ${bandeja.nombre}`);
        state.bandejas = state.bandejas.filter(b => b.id !== bandejaId);
        guardarLocalStorage();
        renderBandejas();
        recalcularResumen();
        actualizarFiltros();
        mostrarToast('Bandeja eliminada', 'success');
    }

    function abrirModalHistorial() {
        if (!esAdminActual()) {
            mostrarToast('Solo el administrador puede ver el historial', 'error');
            return;
        }

        actualizarFiltrosHistorial();
        renderHistorial();
        document.getElementById('modalHistorialOverlay').classList.add('active');
    }

    function cerrarModalHistorial(e) {
        if (!puedeCerrarPorBackdrop(e)) return;
        const overlay = document.getElementById('modalHistorialOverlay');
        overlay.classList.remove('active');
        overlay.dataset.backdropMouseDown = '0';
    }

    function actualizarFiltrosHistorial() {
        const select = document.getElementById('historialFiltroBandeja');
        const actual = select.value;
        select.innerHTML = '<option value="todas">Todas</option>';
        state.bandejas.forEach(b => {
            select.innerHTML += `<option value="${b.id}">${escapeHtml(b.nombre)}</option>`;
        });
        select.value = actual;
    }

    function renderHistorial() {
        const filtroTipo = document.getElementById('historialFiltroTipo').value;
        const filtroBandeja = document.getElementById('historialFiltroBandeja').value;
        const busqueda = document.getElementById('historialBusqueda').value.toLowerCase().trim();
        const tbody = document.getElementById('historialBody');
        const resumen = document.getElementById('historialResumen');
        let movimientos = [...state.historial];
        if (filtroTipo !== 'todos') {
            movimientos = movimientos.filter(m => m.tipo === filtroTipo);
        }
        if (filtroBandeja !== 'todas') {
            movimientos = movimientos.filter(m => m.bandejaId === filtroBandeja);
        }
        if (busqueda) {
            movimientos = movimientos.filter(m => {
                const texto = `${m.productoTipo || ''} ${m.productoLetra || ''} ${m.productoCodigo || ''} ${m.bandejaNombre || ''} ${m.detalles || ''}`.toLowerCase();
                return texto.includes(busqueda);
            });
        }
        const conteo = { venta: 0, vencimiento: 0, liberacion: 0, agregado: 0, no_habilitado: 0 };
        state.historial.forEach(m => {
            if (conteo[m.tipo] !== undefined) conteo[m.tipo]++;
        });
        resumen.innerHTML = `
            <div class="historial-resumen-item resumen-ventas">
                <span>✅ Ventas:</span><span class="count">${conteo.venta}</span>
            </div>
            <div class="historial-resumen-item resumen-vencidos">
                <span>❌ Vencidos:</span><span class="count">${conteo.vencimiento}</span>
            </div>
            <div class="historial-resumen-item resumen-agregados">
                <span>➕ Agregados:</span><span class="count">${conteo.agregado}</span>
            </div>
            <div class="historial-resumen-item resumen-liberados">
                <span>🗑️ Liberados:</span><span class="count">${conteo.liberacion}</span>
            </div>
        `;
        if (movimientos.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" class="historial-vacio">
                    📭 No hay movimientos registrados${filtroTipo !== 'todos' || filtroBandeja !== 'todas' || busqueda ? ' con estos filtros' : ''}
                </td></tr>
            `;
            return;
        }
        tbody.innerHTML = movimientos.map(m => `
            <tr>
                <td class="historial-fecha">${formatearFecha(m.fecha)}</td>
                <td><span class="historial-mov-badge ${getBadgeClass(m.tipo)}">${getTipoMovimientoLabel(m.tipo)}</span></td>
                <td class="historial-producto">
                    <span class="historial-producto-content">
                        ${m.productoTipo ? `<span class="leyenda-color" style="width:12px;height:12px;display:inline-block;border-radius:50%;background:${obtenerColorProducto(m.productoTipo)};"></span>` : ''}
                        <span>${m.productoTipo || '--'} ${m.productoCodigo ? `<span style="color:var(--color-text-light);font-size:11px;">(${m.productoCodigo})</span>` : ''}</span>
                    </span>
                </td>
                <td class="historial-pos">${m.productoLetra || '--'}</td>
                <td class="historial-bandeja">${escapeHtml(m.bandejaNombre || '--')}</td>
                <td class="historial-detalles">${escapeHtml(m.detalles || '')}</td>
            </tr>
        `).join('');
    }

    async function limpiarHistorial() {
        const confirmado = await confirmarAccion(
            '¿Estás seguro de que deseas eliminar TODO el historial de movimientos?\n\nEsta acción no se puede deshacer.',
            {
                titulo: 'Limpiar historial',
                tipo: 'warning',
                textoAceptar: 'Eliminar historial'
            }
        );
        if (!confirmado) return;
        state.historial = [];
        guardarLocalStorage();
        renderHistorial();
        mostrarToast('Historial eliminado', 'success');
    }

    function descargarXLSX(nombreArchivo, nombreHoja, filas) {
        if (typeof XLSX === 'undefined') {
            mostrarToast('No se pudo cargar la librería XLSX', 'error');
            return false;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(filas);
        XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
        XLSX.writeFile(wb, nombreArchivo);
        return true;
    }

    function exportarHistorialXLSX() {
        const fecha = new Date().toISOString().split('T')[0];
        const filas = state.historial.map(m => ({
            'Fecha/Hora': formatearFecha(m.fecha),
            Movimiento: getTipoMovimientoLabel(m.tipo),
            Producto: m.productoTipo || '',
            Letra: m.productoLetra || '',
            Codigo: m.productoCodigo || '',
            Bandeja: m.bandejaNombre || '',
            Detalles: m.detalles || ''
        }));

        if (descargarXLSX(`historial_movimientos_${fecha}.xlsx`, 'Historial', filas)) {
            mostrarToast('Historial exportado a XLSX', 'success');
        }
    }

    const exportarHistorialCSV = exportarHistorialXLSX;

    function recalcularResumen() {
        let total = 0;
        let disponibles = 0;
        let vendidos = 0;
        let vencidos = 0;
        let libres = 0;
        let noHabilitados = 0;
        state.bandejas.forEach(b => {
            b.productos.forEach(p => {
                if (p.estado !== 'libre') total++;
                switch (p.estado) {
                    case 'disponible': disponibles++; break;
                    case 'vendido': vendidos++; break;
                    case 'vencido': vencidos++; break;
                    case 'libre': libres++; break;
                    case 'no_habilitado': noHabilitados++; break;
                }
            });
        });
        document.getElementById('resumenGeneral').innerHTML = `
            <div class="resumen-item resumen-total">
                <div class="resumen-valor">${total}</div>
                <div class="resumen-label">Total</div>
            </div>
            <div class="resumen-item resumen-disponible">
                <div class="resumen-valor">${disponibles}</div>
                <div class="resumen-label">Disponibles</div>
            </div>
            <div class="resumen-item resumen-vendido">
                <div class="resumen-valor">${vendidos}</div>
                <div class="resumen-label">Vendidos</div>
            </div>
            <div class="resumen-item resumen-vencido">
                <div class="resumen-valor">${vencidos}</div>
                <div class="resumen-label">Vencidos</div>
            </div>
            <div class="resumen-item resumen-libre">
                <div class="resumen-valor">${libres}</div>
                <div class="resumen-label">Libres</div>
            </div>
            <div class="resumen-item resumen-no-habilitado">
                <div class="resumen-valor">${noHabilitados}</div>
                <div class="resumen-label">No Habilitados</div>
            </div>
        `;
    }

    function generarAlertas() {
        const container = document.getElementById('alertasContainer');
        const alertas = [];
        state.bandejas.forEach(b => {
            b.productos.forEach(p => {
                if (p.estado === 'disponible' && p.fechaExhibicion) {
                    const horas = obtenerHorasTranscurridas(p.fechaExhibicion);
                    const vidaUtilHoras = obtenerVidaUtilHorasRotacion(p);
                    if (horas >= vidaUtilHoras) {
                        alertas.push({
                            tipo: 'danger',
                            texto: `${p.tipo} ${p.letra} (${b.nombre})`,
                            tiempo: `${Math.floor(horas)}h ${Math.floor((horas % 1) * 60)}m exhibido / ${Math.round(vidaUtilHoras / 24)}d vida útil`,
                            horas: horas
                        });
                    } else if (horas >= vidaUtilHoras * 0.75) {
                        alertas.push({
                            tipo: 'warning',
                            texto: `${p.tipo} ${p.letra} (${b.nombre})`,
                            tiempo: `${Math.floor(horas)}h ${Math.floor((horas % 1) * 60)}m exhibido / ${Math.round(vidaUtilHoras / 24)}d vida útil`,
                            horas: horas
                        });
                    }
                }
            });
        });
        alertas.sort((a, b) => b.horas - a.horas);
        if (alertas.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:var(--color-text-muted);font-size:13px;padding:10px;">✅ Sin alertas activas</div>';
            return;
        }
        container.innerHTML = alertas.map(a => `
            <div class="alerta-item alerta-${a.tipo}">
                <span class="alerta-icon">${a.tipo === 'danger' ? '🔴' : '🟡'}</span>
                <div>
                    <div class="alerta-texto">${escapeHtml(a.texto)}</div>
                    <div class="alerta-tiempo">${a.tiempo}</div>
                </div>
            </div>
        `).join('');
    }

    function actualizarFiltros() {
        const selectProducto = document.getElementById('filtroProducto');
        const selectBandeja = document.getElementById('filtroBandeja');
        const tipos = new Set();
        state.bandejas.forEach(b => {
            b.productos.forEach(p => {
                if (p.tipo) tipos.add(p.tipo);
            });
        });
        const prodActual = selectProducto.value;
        const bandActual = selectBandeja.value;
        selectProducto.innerHTML = '<option value="todos">Todos</option>';
        Array.from(tipos).sort().forEach(t => {
            selectProducto.innerHTML += `<option value="${t.toLowerCase()}">${t}</option>`;
        });
        selectProducto.value = prodActual;
        selectBandeja.innerHTML = '<option value="todas">Todas</option>';
        state.bandejas.forEach(b => {
            selectBandeja.innerHTML += `<option value="${b.id}">${escapeHtml(b.nombre)}</option>`;
        });
        selectBandeja.value = bandActual;
    }

    function aplicarFiltros() {
        state.filtroProducto = document.getElementById('filtroProducto').value;
        state.filtroEstado = document.getElementById('filtroEstado').value;
        state.filtroBandeja = document.getElementById('filtroBandeja').value;
        state.bandejas.forEach(bandeja => {
            const grid = document.getElementById(`grid-${bandeja.id}`);
            if (!grid) return;
            const circulos = grid.querySelectorAll('.producto-circulo');
            const productosPorId = new Map(bandeja.productos.map(producto => [producto.id, producto]));
            circulos.forEach(circulo => {
                const producto = productosPorId.get(circulo.dataset.id);
                if (!producto) return;
                let visible = true;
                if (state.filtroBandeja !== 'todas') {
                    if (bandeja.id !== state.filtroBandeja) {
                        visible = false;
                    }
                }
                if (visible && state.filtroProducto !== 'todos') {
                    if (!producto.tipo || producto.tipo.toLowerCase() !== state.filtroProducto) {
                        visible = false;
                    }
                }
                if (visible && state.filtroEstado !== 'todos') {
                    if (producto.estado !== state.filtroEstado) {
                        visible = false;
                    }
                }
                circulo.classList.toggle('hidden', !visible);
            });
            const filasCategoria = grid.querySelectorAll('.categoria-row');
            filasCategoria.forEach(fila => {
                const visiblesEnFila = fila.querySelectorAll('.producto-circulo:not(.hidden)');
                fila.style.display = visiblesEnFila.length > 0 ? '' : 'none';
            });
            const visibles = grid.querySelectorAll('.producto-circulo:not(.hidden)');
            const bandejaEl = grid.closest('.bandeja');
            if (bandejaEl) {
                bandejaEl.style.display = visibles.length > 0 ? '' : 'none';
            }
        });
    }

    function exportarXLSX() {
        const filas = [];
        state.bandejas.forEach(b => {
            b.productos.forEach(p => {
                if (p.estado !== 'libre') {
                    filas.push({
                        Bandeja: b.nombre,
                        Tipo: p.tipo,
                        Letra: p.letra,
                        Codigo: p.codigo,
                        Estado: ESTADOS[p.estado],
                        'Fecha Exhibicion': formatearFecha(p.fechaExhibicion),
                        'Fecha Venta': formatearFecha(p.fechaVenta),
                        'Fecha Vencimiento': formatearFecha(p.fechaVencimiento),
                        'Tiempo Transcurrido': calcularTiempoTranscurrido(p.fechaExhibicion)
                    });
                }
            });
        });

        const fecha = new Date().toISOString().split('T')[0];
        if (descargarXLSX(`rotacion_${fecha}.xlsx`, 'Rotacion', filas)) {
            mostrarToast('Resumen exportado a XLSX', 'success');
        }
    }

    const exportarCSV = exportarXLSX;

    function mostrarToast(mensaje, tipo = 'success') {
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion(mensaje, tipo);
            return;
        }

        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;
        toast.textContent = mensaje;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function iniciarTimer() {
        if (state.timerId) clearInterval(state.timerId);
        state.timerId = setInterval(() => {
            renderBandejas();
            recalcularResumen();
            generarAlertas();
        }, CONFIG.timerInterval);
    }

    function setupEventListeners() {
        document.getElementById('nuevasFilas').addEventListener('input', actualizarPreview);
        document.getElementById('nuevasColumnas').addEventListener('input', actualizarPreview);
        document.querySelectorAll('.admin-only-rotacion').forEach(el => {
            el.style.display = esAdminActual() ? '' : 'none';
        });
        inicializarSelectorProductoRotacion(
            document.getElementById('nuevoCategoria'),
            document.getElementById('nuevoTipo')
        );
        document.querySelectorAll('.producto-inicial-row').forEach(row => {
            inicializarSelectorProductoRotacion(
                row.querySelector('.prod-inicial-categoria'),
                row.querySelector('.prod-inicial-tipo')
            );
        });
        prepararCierrePorBackdrop('modalOverlay');
        prepararCierrePorBackdrop('modalBandejaOverlay');
        prepararCierrePorBackdrop('modalHistorialOverlay');
        prepararCierrePorBackdrop('modalFIFOOverlay');
        prepararCierrePorBackdrop('modalLeyendaOverlay');
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                cerrarModal();
                cerrarModalBandeja();
                cerrarModalHistorial();
                cerrarModalFIFO();
                cerrarModalLeyenda();
            }
        });
    }

    function init() {
        inicializarDatos();
        renderBandejas();
        recalcularResumen();
        generarAlertas();
        actualizarFiltros();
        setupEventListeners();
        iniciarTimer();
    }

    return {
        init,
        cerrarModal,
        accionModal,
        mostrarFormAgregar,
        confirmarAgregar,
        abrirModalNuevaBandeja,
        cerrarModalBandeja,
        actualizarPreview,
        agregarFilaProductoInicial,
        confirmarNuevaBandeja,
        editarBandeja,
        eliminarBandeja,
        exportarXLSX,
        exportarCSV,
        aplicarFiltros,
        abrirModalHistorial,
        cerrarModalHistorial,
        renderHistorial,
        limpiarHistorial,
        exportarHistorialXLSX,
        exportarHistorialCSV,
        confirmarMovimientoFIFO,
        cancelarMovimientoFIFO,
        cerrarModalFIFO,
        actualizarSelectorProductosRotacion,
        toggleLeyenda,
        abrirModalLeyenda,
        cerrarModalLeyenda,
        guardarLeyenda,
        restaurarLeyenda
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    window.app = App;
    App.init();
});
