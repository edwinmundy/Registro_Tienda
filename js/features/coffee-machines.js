(() => {
    'use strict';

    const STORAGE_KEY = 'inventario_maquinas_cafe';
    const MACHINES = ['1', '2', '3'];
    const MAX_WORDS = 6;
    const MAX_CHARACTERS = 80;
    let selectedMachine = null;

    function readData() {
        const saved = obtenerJsonStorage(STORAGE_KEY, {});
        return {
            series: saved?.series && typeof saved.series === 'object' ? saved.series : {},
            incidencias: Array.isArray(saved?.incidencias) ? saved.incidencias : []
        };
    }

    function saveData(data) {
        try {
            guardarJsonStorage(STORAGE_KEY, data);
            return true;
        } catch (error) {
            mostrarNotificacion('No se pudo guardar. Reintenta antes de salir de esta página.', 'error');
            return false;
        }
    }

    function escapeText(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }

    function localDateTime(value) {
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return '';
        const pad = number => String(number).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function renderMachines() {
        const data = readData();
        document.getElementById('coffee-machines').innerHTML = MACHINES.map(machine => `
            <article class="coffee-machine">
                <div class="coffee-machine-heading">
                    <h3>Máquina ${machine}</h3>
                    <button type="button" class="machine-add" data-machine="${machine}"
                        aria-label="Agregar incidencia de máquina ${machine}" title="Agregar incidencia">+</button>
                </div>
                <label for="machine-serial-${machine}">Número de serie</label>
                <input id="machine-serial-${machine}" data-serial="${machine}" type="text" maxlength="80"
                    value="${escapeText(data.series[machine])}" placeholder="Ingresa el número de serie" autocomplete="off">
            </article>
        `).join('');
    }

    function renderIncidents() {
        const incidents = readData().incidencias;
        const body = document.getElementById('machine-incidents-body');
        if (!incidents.length) {
            body.innerHTML = '<tr><td colspan="6" class="registro-empty">Sin incidencias registradas</td></tr>';
            return;
        }
        body.innerHTML = incidents.map((incident, index) => {
            const formId = `machine-repair-${index}`;
            const repaired = Boolean(incident.reparadaEn);
            const date = new Date(incident.creadaEn);
            const dateLabel = Number.isFinite(date.getTime()) ? date.toLocaleString('es-CL') : 'Sin fecha';
            return `
                <tr>
                    <td>${escapeText(incident.cajeroNombre)}</td>
                    <td>${escapeText(dateLabel)}</td>
                    <td>Máquina ${escapeText(incident.maquina)}<small class="machine-help">Serie: ${escapeText(incident.serie || 'Sin asignar')}</small></td>
                    <td>${escapeText(incident.problema)}</td>
                    <td>
                        <select name="reportada" form="${formId}" aria-label="Incidencia ${index + 1}: ¿ya se reportó?">
                            <option value="no"${incident.reportada ? '' : ' selected'}>No</option>
                            <option value="si"${incident.reportada ? ' selected' : ''}>Sí</option>
                        </select>
                    </td>
                    <td>
                        <form id="${formId}" class="machine-repair-form" data-incident="${escapeText(incident.id)}">
                            <label><input type="checkbox" name="reparada"${repaired ? ' checked' : ''}> Reparada</label>
                            <input type="datetime-local" name="reparadaEn" value="${escapeText(repaired ? localDateTime(incident.reparadaEn) : '')}"
                                aria-label="Incidencia ${index + 1}: fecha y hora de reparación"${repaired ? ' required' : ' disabled'}>
                            <button type="submit" class="btn-secondary">Guardar cambios</button>
                        </form>
                    </td>
                </tr>`;
        }).join('');
    }

    function validateProblem() {
        const input = document.getElementById('machine-incident-problem');
        const problem = input.value.trim().replace(/\s+/g, ' ');
        const words = problem ? problem.split(' ').length : 0;
        input.setCustomValidity(words > MAX_WORDS || input.value.length > MAX_CHARACTERS
            ? 'Escribe una incidencia de máximo 6 palabras y 80 caracteres.' : '');
        document.getElementById('machine-incident-limit').textContent = `${words}/${MAX_WORDS} palabras · ${input.value.length}/${MAX_CHARACTERS} caracteres`;
        return problem;
    }

    function openIncident(machine) {
        if (!MACHINES.includes(machine) || !verificarSesion()) return;
        selectedMachine = machine;
        document.getElementById('machine-incident-form').reset();
        document.getElementById('machine-incident-error').textContent = '';
        document.getElementById('machine-incident-title').textContent = `Nueva incidencia · Máquina ${machine}`;
        document.getElementById('machine-incident-serial').textContent = `Serie: ${readData().series[machine] || 'Sin asignar'}`;
        validateProblem();
        document.getElementById('machine-incident-dialog').showModal();
        document.getElementById('machine-incident-problem').focus();
    }

    function createIncident(event) {
        event.preventDefault();
        if (!verificarSesion() || !MACHINES.includes(selectedMachine)) return;
        const problem = validateProblem();
        if (!event.currentTarget.reportValidity()) return;
        if (!problem) {
            document.getElementById('machine-incident-error').textContent = 'Escribe el problema de la máquina.';
            return;
        }
        const data = readData();
        data.incidencias.unshift({
            id: crypto.randomUUID(),
            maquina: selectedMachine,
            serie: String(data.series[selectedMachine] || '').trim(),
            problema: problem,
            reportada: document.getElementById('machine-incident-reported').value === 'si',
            creadaEn: new Date().toISOString(),
            cajeroId: cajeroActual.id,
            cajeroNombre: cajeroActual.nombre,
            cajeroCodigo: cajeroActual.codigo,
            reparadaEn: null
        });
        if (!saveData(data)) return;
        document.getElementById('machine-incident-dialog').close();
        renderIncidents();
        mostrarNotificacion('Incidencia guardada', 'success');
    }

    function updateIncident(event) {
        const form = event.target.closest('.machine-repair-form');
        if (!form) return;
        event.preventDefault();
        if (!verificarSesion() || !form.reportValidity()) return;
        const fields = new FormData(form);
        const repaired = fields.has('reparada');
        const repairDate = repaired ? new Date(fields.get('reparadaEn')) : null;
        if (repaired && !Number.isFinite(repairDate.getTime())) {
            mostrarNotificacion('Indica una fecha y hora de reparación válidas.', 'error');
            return;
        }
        const data = readData();
        const incident = data.incidencias.find(item => item.id === form.dataset.incident);
        if (!incident) {
            mostrarNotificacion('La incidencia ya no está disponible. Actualiza la página.', 'error');
            return;
        }
        incident.reportada = fields.get('reportada') === 'si';
        incident.reparadaEn = repaired ? repairDate.toISOString() : null;
        incident.actualizadaEn = new Date().toISOString();
        incident.actualizadaPor = { id: cajeroActual.id, nombre: cajeroActual.nombre, codigo: cajeroActual.codigo };
        if (!saveData(data)) return;
        mostrarNotificacion('Cambios de la incidencia guardados', 'success');
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderMachines();
        renderIncidents();
        const machines = document.getElementById('coffee-machines');
        machines.addEventListener('click', event => {
            const button = event.target.closest('[data-machine]');
            if (button) openIncident(button.dataset.machine);
        });
        machines.addEventListener('input', event => {
            const machine = event.target.dataset.serial;
            if (!MACHINES.includes(machine) || !verificarSesion()) return;
            const data = readData();
            data.series[machine] = event.target.value.slice(0, 80);
            document.getElementById('machine-status').textContent = saveData(data)
                ? `Número de serie de máquina ${machine} guardado.` : 'No se guardó el número de serie. Vuelve a intentarlo.';
        });
        document.getElementById('machine-incident-problem').addEventListener('input', validateProblem);
        document.getElementById('machine-incident-form').addEventListener('submit', createIncident);
        document.getElementById('machine-incident-cancel').addEventListener('click', () => {
            document.getElementById('machine-incident-dialog').close();
        });
        document.getElementById('machine-incidents-body').addEventListener('submit', updateIncident);
        document.getElementById('machine-incidents-body').addEventListener('change', event => {
            if (event.target.name !== 'reparada') return;
            const dateInput = event.target.form.elements.namedItem('reparadaEn');
            dateInput.disabled = !event.target.checked;
            dateInput.required = event.target.checked;
            if (event.target.checked && !dateInput.value) dateInput.value = localDateTime(new Date());
        });
    });
})();
