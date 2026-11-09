// Plantillas y registros semanales: una escritura conserva cada cambio completo.
const ChecklistStore = (() => {
    'use strict';

    const KEY = 'inventario_checklists';
    const VERSION = 1;
    const ADMIN_CAN_EDIT_OTHER_DATES = true;
    const STATUSES = ['Pendiente', 'En Proceso', 'Completado', 'Atrasado'];
    const clone = value => JSON.parse(JSON.stringify(value));
    const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

    function user(admin = false) {
        const session = obtenerSesionActiva();
        if (!session) throw new Error('La sesión venció. Inicia sesión nuevamente.');
        const current = crearCajeroDesdeSesion(session);
        if (admin && !cajeroTienePermisosAdmin(current)) {
            throw new Error('Solo un administrador puede modificar los checklist.');
        }
        return current;
    }

    function string(value, label, max, required = false) {
        if (value === undefined || value === null) value = '';
        if (typeof value !== 'string') throw new Error(`${label} debe ser texto.`);
        const result = value.trim();
        if (required && !result) throw new Error(`Completa ${label.toLowerCase()}.`);
        if (result.length > max) throw new Error(`${label} admite hasta ${max} caracteres.`);
        return result;
    }

    function id(value, prefix, generate = true) {
        if (!value && generate) {
            const suffix = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
            return `${prefix}-${suffix}`;
        }
        if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(value)
            || ['constructor', 'prototype', '__proto__'].includes(value)) {
            throw new Error('Identificador de checklist inválido.');
        }
        return value;
    }

    function date(value, label) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new Error(`${label} debe ser una fecha válida.`);
        }
        const parsed = new Date(`${value}T12:00:00.000Z`);
        if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
            throw new Error(`${label} debe ser una fecha válida.`);
        }
        return value;
    }

    function monday(value) {
        const parsed = new Date(`${date(value, 'La semana')}T12:00:00.000Z`);
        parsed.setUTCDate(parsed.getUTCDate() - ((parsed.getUTCDay() + 6) % 7));
        return parsed.toISOString().slice(0, 10);
    }

    function currentDate() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function dateEditable(value, current) {
        date(value, 'La fecha');
        return (ADMIN_CAN_EDIT_OTHER_DATES && cajeroTienePermisosAdmin(current)) || value === currentDate();
    }

    function canEditDate(value) {
        return dateEditable(value, user());
    }

    function weekEditable(value, current) {
        return (ADMIN_CAN_EDIT_OTHER_DATES && cajeroTienePermisosAdmin(current)) || monday(value) === monday(currentDate());
    }

    function canEditWeek(value) {
        date(value, 'La semana');
        return weekEditable(value, user());
    }

    function requireDate(value, current) {
        if (!dateEditable(value, current)) throw new Error('Solo puedes agregar o editar datos del día actual de este equipo.');
    }

    function requireWeek(value, current) {
        if (!weekEditable(value, current)) throw new Error('Solo puedes agregar o editar datos de la semana actual de este equipo.');
    }

    function cellDate(record, day) {
        const parsed = new Date(`${record.week}T12:00:00.000Z`);
        parsed.setUTCDate(parsed.getUTCDate() + day);
        return parsed.toISOString().slice(0, 10);
    }

    function template(input, generate = true) {
        if (!isObject(input)) throw new Error('Checklist inválido.');
        const shifts = Number(input.turnos);
        if (!Number.isInteger(shifts) || shifts < 1 || shifts > 3) {
            throw new Error('El checklist debe tener entre 1 y 3 turnos.');
        }
        if (!Array.isArray(input.actividades) || input.actividades.length < 1 || input.actividades.length > 500) {
            throw new Error('Agrega entre 1 y 500 actividades al checklist.');
        }
        const ids = new Set();
        const activities = input.actividades.map(item => {
            if (!isObject(item)) throw new Error('Actividad inválida.');
            const taskId = id(item.id, 'tarea', generate);
            if (ids.has(taskId)) throw new Error('Hay actividades con el mismo identificador.');
            ids.add(taskId);
            return {
                id: taskId,
                categoria: string(item.categoria, 'Categoría', 120, true),
                actividad: string(item.actividad, 'Actividad', 1000, true),
                horario: string(item.horario, 'Horario', 240),
                frecuencia: string(item.frecuencia, 'Frecuencia', 120)
            };
        });
        return {
            id: id(input.id, 'checklist', generate),
            nombre: string(input.nombre, 'Nombre del checklist', 150, true),
            turnos: shifts,
            descripcion: string(input.descripcion, 'Descripción', 2000),
            actividades: activities
        };
    }

    function action(input, generate = true) {
        if (!isObject(input)) throw new Error('Acción inválida.');
        const assigned = date(input.assigned, 'La fecha asignada');
        const due = date(input.due, 'La fecha de vencimiento');
        if (due < assigned) throw new Error('El vencimiento no puede ser anterior a la fecha asignada.');
        if (!STATUSES.includes(input.status)) throw new Error('Selecciona un estatus válido.');
        return {
            id: id(input.id, 'accion', generate),
            task: string(input.task, 'Tarea asignada', 1000, true),
            responsible: string(input.responsible, 'Responsable', 150, true),
            assigned,
            due,
            status: input.status,
            notes: string(input.notes, 'Acotaciones', 3000)
        };
    }

    function validateState(state) {
        if (!isObject(state) || state.version !== VERSION || !Array.isArray(state.templates) || !Array.isArray(state.records)) {
            throw new Error('Los datos de checklist no son válidos. Restaura un respaldo válido antes de continuar.');
        }
        const templateIds = new Set();
        state.templates.forEach(item => {
            const validated = template(item, false);
            if (templateIds.has(validated.id)) throw new Error('El respaldo contiene checklist duplicados.');
            templateIds.add(validated.id);
        });
        const recordIds = new Set();
        const identities = new Set();
        state.records.forEach(record => {
            if (!isObject(record)) throw new Error('Registro de checklist inválido.');
            id(record.id, 'semana', false);
            if (recordIds.has(record.id)) throw new Error('El respaldo contiene registros duplicados.');
            recordIds.add(record.id);
            template(record.template, false);
            if (monday(record.week) !== record.week) throw new Error('La semana del registro debe comenzar el lunes.');
            string(record.branch, 'Sucursal', 150, true);
            string(record.leader, 'Líder a cargo', 150);
            const identity = `${record.template.id}|${record.week}|${record.branch.trim().toLocaleLowerCase('es')}`;
            if (identities.has(identity)) throw new Error('El respaldo contiene una semana repetida.');
            identities.add(identity);
            if (!isObject(record.marks) || !isObject(record.observations) || !Array.isArray(record.actions)) {
                throw new Error('Las respuestas del checklist no son válidas.');
            }
            const taskIds = new Set(record.template.actividades.map(item => item.id));
            Object.entries(record.marks).forEach(([key, mark]) => {
                const [taskId, day, shift, extra] = key.split('|');
                if (!taskIds.has(taskId) || !/^[0-6]$/.test(day) || !/^[1-3]$/.test(shift)
                    || Number(shift) > record.template.turnos || extra !== undefined || !isObject(mark)
                    || typeof mark.user !== 'string' || typeof mark.code !== 'string' || !Number.isFinite(Date.parse(mark.at))) {
                    throw new Error('Una marca del checklist no es válida.');
                }
            });
            Object.entries(record.observations).forEach(([taskId, value]) => {
                if (!taskIds.has(taskId)) throw new Error('Una observación no corresponde al checklist.');
                string(value, 'Observación', 3000);
            });
            // Los respaldos anteriores conservan sus observaciones generales.
            if (record.comments === undefined) record.comments = {};
            if (!isObject(record.comments)) throw new Error('Los comentarios del checklist no son válidos.');
            Object.entries(record.comments).forEach(([key, comment]) => {
                const [taskId, day, shift, extra] = key.split('|');
                if (!taskIds.has(taskId) || !/^[0-6]$/.test(day) || !/^[1-3]$/.test(shift)
                    || Number(shift) > record.template.turnos || extra !== undefined || !isObject(comment)
                    || typeof comment.user !== 'string' || typeof comment.code !== 'string' || !Number.isFinite(Date.parse(comment.at))) {
                    throw new Error('Un comentario del checklist no es válido.');
                }
                string(comment.text, 'Comentario', 500, true);
            });
            if (record.observationMeta === undefined) record.observationMeta = {};
            if (!isObject(record.observationMeta)) throw new Error('La autoría de las observaciones no es válida.');
            Object.entries(record.observationMeta).forEach(([taskId, meta]) => {
                if (!taskIds.has(taskId) || !Object.prototype.hasOwnProperty.call(record.observations, taskId)
                    || !isObject(meta) || typeof meta.user !== 'string' || typeof meta.code !== 'string'
                    || typeof meta.at !== 'string' || !Number.isFinite(Date.parse(meta.at))) {
                    throw new Error('La autoría de una observación no es válida.');
                }
            });
            if (record.noteHistory === undefined) record.noteHistory = {};
            if (!isObject(record.noteHistory)) throw new Error('El historial de notas no es válido.');
            Object.entries(record.noteHistory).forEach(([key, versions]) => {
                const parts = key.split('|');
                const legacy = parts.length === 2 && parts[0] === 'legacy' && taskIds.has(parts[1]);
                const cell = parts.length === 3 && taskIds.has(parts[0]) && /^[0-6]$/.test(parts[1])
                    && /^[1-3]$/.test(parts[2]) && Number(parts[2]) <= record.template.turnos;
                if ((!legacy && !cell) || !Array.isArray(versions)) throw new Error('El historial no corresponde a una nota válida.');
                versions.forEach(version => {
                    if (!isObject(version) || typeof version.user !== 'string' || typeof version.code !== 'string'
                        || typeof version.changedBy !== 'string' || typeof version.changedCode !== 'string'
                        || !['edit', 'delete'].includes(version.change)
                        || !(legacy && version.at === null) && (typeof version.at !== 'string' || !Number.isFinite(Date.parse(version.at)))
                        || typeof version.changedAt !== 'string' || !Number.isFinite(Date.parse(version.changedAt))) {
                        throw new Error('Una versión del historial de notas no es válida.');
                    }
                    string(version.text, 'Nota original', 3000, true);
                });
            });
            const actionIds = new Set();
            record.actions.forEach(item => {
                const validated = action(item, false);
                if (actionIds.has(validated.id)) throw new Error('Hay acciones duplicadas.');
                actionIds.add(validated.id);
            });
            if (!Number.isFinite(Date.parse(record.createdAt)) || !Number.isFinite(Date.parse(record.updatedAt))) {
                throw new Error('Las fechas del registro no son válidas.');
            }
        });
        return state;
    }

    function read() {
        const raw = localStorage.getItem(KEY);
        if (raw === null) throw new Error('Inicializa los checklist antes de continuar.');
        let state;
        try {
            state = JSON.parse(raw);
        } catch (_) {
            throw new Error('No se pudieron leer los checklist. Los datos guardados no se han cambiado.');
        }
        return validateState(state);
    }

    function write(state) {
        validateState(state);
        guardarJsonStorage(KEY, state);
    }

    function audit(current, operation, name) {
        if (typeof registrarAuditoria !== 'function') return;
        try {
            registrarAuditoria({
                cajeroId: current.id,
                cajeroNombre: current.nombre,
                cajeroCodigo: current.codigo,
                tipo: operation,
                categoria: 'checklists',
                itemNombre: name,
                cantidad: 1,
                stockAnterior: 0,
                stockNuevo: 0
            });
        } catch (error) {
            console.warn('El checklist se guardó, pero no se pudo registrar su auditoría.', error);
        }
    }

    function recordIn(state, recordId) {
        const record = state.records.find(item => item.id === recordId);
        if (!record) throw new Error('El registro semanal ya no existe. Vuelve a abrir la semana.');
        return record;
    }

    function taskIn(record, taskId) {
        if (!record.template.actividades.some(item => item.id === taskId)) {
            throw new Error('La actividad no pertenece a este registro.');
        }
    }

    function updateRecord(recordId, operation, transform) {
        const current = user();
        const state = read();
        const record = recordIn(state, recordId);
        if (transform(record, current) === false) return clone(record);
        record.updatedAt = new Date().toISOString();
        write(state);
        audit(current, operation, `${record.template.nombre} · ${record.branch} · ${record.week}`);
        return clone(record);
    }

    function init() {
        user();
        if (localStorage.getItem(KEY) === null) {
            write({ version: VERSION, coffeeLabelsVersion: 1, templates: CHECKLIST_PLANTILLAS_INICIALES.map(item => template(item)), records: [] });
        }
        const state = read();
        // Corrección de rótulos originales; conserva IDs, respuestas y textos personalizados.
        if (state.coffeeLabelsVersion !== 1) {
            const changes = [
                ['diario-15', 'Get It y leche liquida: recirculación', 'Recirculación'],
                ['diario-16', 'Get It y leche liquida: Recarga de ingredientes (R)', 'Recarga de ingredientes (R)'],
                ['diario-17', 'Get it y leche liquida: DEJAR Vasos en área de caja y panadería', 'DEJAR Vasos en área de caja y panadería'],
                ['diario-18', 'Get It y leche liquida: DEJAR azucar, splenda y servilletas en área de café', 'DEJAR azucar, splenda y servilletas en área de café'],
                ['diario-19', 'Get It y leche liquida: DEJAR Tapas en área de café', 'DEJAR Tapas en área de café']
            ];
            const defaults = new Set(['diario-2-turnos', 'diario-3-turnos']);
            [...state.templates, ...state.records.map(record => record.template)].forEach(item => {
                if (!defaults.has(item.id)) return;
                item.actividades.forEach(task => {
                    const change = changes.find(([taskId, previous]) => task.id === taskId && task.actividad === previous);
                    if (change) task.actividad = change[2];
                });
            });
            state.coffeeLabelsVersion = 1;
            write(state);
        }
        return clone(state);
    }

    function listTemplates() {
        user();
        return clone(read().templates);
    }

    function saveTemplate(input) {
        const current = user(true);
        const next = template(input);
        const state = read();
        const index = state.templates.findIndex(item => item.id === next.id);
        if (index < 0) state.templates.push(next);
        else state.templates[index] = next;
        write(state);
        audit(current, index < 0 ? 'checklist_creado' : 'checklist_editado', next.nombre);
        return clone(next);
    }

    function deleteTemplate(templateId) {
        const current = user(true);
        const state = read();
        const index = state.templates.findIndex(item => item.id === templateId);
        if (index < 0) throw new Error('El checklist ya no existe.');
        const removed = state.templates.splice(index, 1)[0];
        write(state);
        audit(current, 'checklist_eliminado', removed.nombre);
        return clone(removed);
    }

    function listRecords() {
        user();
        return clone(read().records).sort((a, b) => b.week.localeCompare(a.week) || b.updatedAt.localeCompare(a.updatedAt));
    }

    function getRecord(recordId) {
        user();
        return clone(recordIn(read(), recordId));
    }

    function openWeek({ templateId, week, branch, leader = '' }) {
        const current = user();
        const state = read();
        const start = monday(week);
        const location = string(branch, 'Sucursal', 150, true);
        const supervisor = string(leader, 'Líder a cargo', 150);
        const existing = state.records.find(item => item.template.id === templateId && item.week === start
            && item.branch.trim().toLocaleLowerCase('es') === location.toLocaleLowerCase('es'));
        if (existing) return clone(existing);
        requireWeek(start, current);
        const source = state.templates.find(item => item.id === templateId);
        if (!source) throw new Error('Selecciona un checklist disponible.');
        const now = new Date().toISOString();
        const record = {
            id: id('', 'semana'),
            template: clone(source),
            week: start,
            branch: location,
            leader: supervisor,
            marks: {},
            observations: {},
            comments: {},
            observationMeta: {},
            noteHistory: {},
            actions: [],
            createdAt: now,
            updatedAt: now
        };
        state.records.push(record);
        write(state);
        audit(current, 'checklist_semana_abierta', `${source.nombre} · ${location} · ${start}`);
        return clone(record);
    }

    function markTask(recordId, taskId, day, shift, checked) {
        return updateRecord(recordId, checked ? 'checklist_marcado' : 'checklist_desmarcado', (record, current) => {
            taskIn(record, taskId);
            if (!Number.isInteger(day) || day < 0 || day > 6 || !Number.isInteger(shift)
                || shift < 1 || shift > record.template.turnos || typeof checked !== 'boolean') {
                throw new Error('Selecciona un día y un turno válidos.');
            }
            const key = `${taskId}|${day}|${shift}`;
            requireDate(cellDate(record, day), current);
            if (checked) {
                record.marks[key] = { user: current.nombre, code: current.codigo, at: new Date().toISOString() };
            } else {
                delete record.marks[key];
            }
        });
    }

    function setObservation(recordId, taskId, text) {
        return updateRecord(recordId, 'checklist_observacion', (record, current) => {
            taskIn(record, taskId);
            if (!cajeroTienePermisosAdmin(current)) throw new Error('Solo un administrador puede modificar o eliminar las notas generales anteriores.');
            const note = string(text, 'Observación', 3000);
            const previous = record.observations[taskId] || '';
            if (previous === note) return false;
            if (previous) rememberNote(record, `legacy|${taskId}`, {
                text: previous,
                ...(record.observationMeta[taskId] || { user: 'No registrado', code: '', at: null })
            }, current, note ? 'edit' : 'delete');
            if (note) {
                record.observations[taskId] = note;
                record.observationMeta[taskId] = { user: current.nombre, code: current.codigo, at: new Date().toISOString() };
            } else {
                delete record.observations[taskId];
                delete record.observationMeta[taskId];
            }
        });
    }

    function rememberNote(record, key, previous, current, change) {
        if (!record.noteHistory[key]) record.noteHistory[key] = [];
        record.noteHistory[key].push({
            text: previous.text,
            user: previous.user,
            code: previous.code,
            at: previous.at,
            changedBy: current.nombre,
            changedCode: current.codigo,
            changedAt: new Date().toISOString(),
            change
        });
    }

    function setComment(recordId, taskId, day, shift, text) {
        return updateRecord(recordId, 'checklist_comentario', (record, current) => {
            taskIn(record, taskId);
            if (!Number.isInteger(day) || day < 0 || day > 6 || !Number.isInteger(shift)
                || shift < 1 || shift > record.template.turnos) {
                throw new Error('Selecciona un día y un turno válidos.');
            }
            const note = string(text, 'Comentario', 500);
            const key = `${taskId}|${day}|${shift}`;
            requireDate(cellDate(record, day), current);
            if (!note && !cajeroTienePermisosAdmin(current)) throw new Error('Solo un administrador puede eliminar notas.');
            const previous = record.comments[key];
            if ((previous?.text || '') === note) return false;
            if (previous) rememberNote(record, key, previous, current, note ? 'edit' : 'delete');
            if (note) record.comments[key] = { text: note, user: current.nombre, code: current.codigo, at: new Date().toISOString() };
            else delete record.comments[key];
        });
    }

    function saveAction(recordId, input) {
        const next = action(input);
        return updateRecord(recordId, 'checklist_plan_accion', (record, current) => {
            const index = record.actions.findIndex(item => item.id === next.id);
            const permissions = actionPermissionsFor(current);
            if (index >= 0 && !permissions.edit) throw new Error('Solo Admin puede editar tareas del plan de acción.');
            if (index < 0 && !permissions.create) throw new Error('Tu cargo no tiene permiso para agregar tareas al plan de acción.');
            if (index < 0 && input.id) throw new Error('La tarea ya no existe. Vuelve a abrir el plan de acción.');
            requireWeek(record.week, current);
            requireDate(next.assigned, current);
            if (index >= 0) requireDate(record.actions[index].assigned, current);
            if (index < 0) record.actions.push(next);
            else record.actions[index] = next;
        });
    }

    function deleteAction(recordId, actionId) {
        return updateRecord(recordId, 'checklist_accion_eliminada', (record, current) => {
            if (!actionPermissionsFor(current).edit) throw new Error('Solo Admin puede eliminar tareas del plan de acción.');
            requireWeek(record.week, current);
            const index = record.actions.findIndex(item => item.id === actionId);
            if (index < 0) throw new Error('La acción ya no existe.');
            requireDate(record.actions[index].assigned, current);
            record.actions.splice(index, 1);
        });
    }

    function actionPermissionsFor(current) {
        // El administrador principal es distinto de los cargos con permisos administrativos generales.
        const admin = current.codigo === APP_CONFIG.adminCode;
        const role = String(current.cargo || '').trim().toLocaleLowerCase('es');
        return {
            create: admin || ['corporativo', 'cajero de operaciones', 'cajero de procesos'].includes(role),
            edit: admin
        };
    }

    function actionPermissions() {
        return actionPermissionsFor(user());
    }

    return Object.freeze({ init, listTemplates, saveTemplate, deleteTemplate, listRecords, getRecord,
        openWeek, markTask, setObservation, setComment, saveAction, deleteAction,
        currentDate, canEditDate, canEditWeek, actionPermissions });
})();
