// Interfaz de checklists semanales. La persistencia y los permisos viven en ChecklistStore.
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    let record = null;
    let templateId = null;
    let actionId = null;
    let editorDirty = false;
    let saveFailed = false;
    let isAdmin = false;
    let commentTarget = null;
    let displayedDate = '';
    const commentIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2V11.5a9 9 0 1 1 18 0Z"/><path d="M7 10h10M7 14h6"/></svg>';
    const collapsedCategories = new Map();

    function collapsedForCurrentTemplate() {
        if (!collapsedCategories.has(record.template.id)) {
            collapsedCategories.set(record.template.id, new Set(record.template.actividades.map(task => task.categoria)));
        }
        return collapsedCategories.get(record.template.id);
    }

    function today() {
        return ChecklistStore.currentDate();
    }
    function adminNow() {
        return cajeroTienePermisosAdmin(crearCajeroDesdeSesion(obtenerSesionActiva()));
    }
    function addDays(value, offset) {
        const date = new Date(`${value}T12:00:00Z`);
        date.setUTCDate(date.getUTCDate() + offset);
        return date.toISOString().slice(0, 10);
    }
    function monday(value) {
        return addDays(value, -((new Date(`${value}T12:00:00Z`).getUTCDay() + 6) % 7));
    }
    function dateLabel(value) {
        return new Date(`${value}T12:00:00Z`).toLocaleDateString('es-CL', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    function showError(error, element = 'checklist-error') {
        $(element).textContent = error.message || 'No se pudo completar la operación.';
        $(element).hidden = false;
    }
    function saved() {
        saveFailed = false;
        $('save-status').textContent = 'Guardado automáticamente';
        $('save-status').classList.remove('save-error');
        $('checklist-error').hidden = true;
    }
    function persist(callback) {
        try {
            record = callback();
            saved();
            renderStats();
            return true;
        } catch (error) {
            saveFailed = true;
            $('save-status').textContent = 'No se pudo guardar';
            $('save-status').classList.add('save-error');
            showError(error);
            return false;
        }
    }
    function setTab(name) {
        if (name === 'manage' && !isAdmin) return;
        document.querySelectorAll('[data-tab]').forEach(button => {
            const selected = button.dataset.tab === name;
            button.setAttribute('aria-selected', String(selected));
            button.tabIndex = selected ? 0 : -1;
            $(`panel-${button.dataset.tab}`).hidden = !selected;
        });
        if (name === 'history') renderHistory();
        if (name === 'actions') renderActions();
        if (name === 'manage') renderTemplates();
    }
    function renderTemplateOptions() {
        const selected = $('week-template').value;
        const templates = ChecklistStore.listTemplates();
        $('week-template').innerHTML = templates.map(template => `<option value="${escape(template.id)}">${escape(template.nombre)}</option>`).join('');
        if (templates.some(template => template.id === selected)) $('week-template').value = selected;
        $('open-week').disabled = templates.length === 0;
        if (!templates.length) $('week-template').innerHTML = '<option value="">No hay checklists disponibles</option>';
    }
    function openSelectedWeek() {
        if (!$('week-template').value || !$('open-week-form').reportValidity()) return;
        try {
            showRecord(ChecklistStore.openWeek({ templateId: $('week-template').value, week: $('week-date').value, branch: $('week-branch').value, leader: $('week-leader').value }));
        } catch (error) { showError(error); }
    }
    function renderStats() {
        if (!record) return;
        const pending = record.actions.filter(action => action.status !== 'Completado').length;
        $('record-stats').innerHTML = [
            [record.template.actividades.length, 'Actividades en la lista'],
            [Object.keys(record.marks).length, 'Marcas registradas'],
            [record.template.turnos, 'Turnos por día'],
            [pending, 'Tareas del plan pendientes']
        ].map(([value, label]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join('');
    }
    function showRecord(value) {
        record = value;
        $('week-empty').hidden = true;
        $('week-content').hidden = false;
        document.body.classList.add('has-checklist-record');
        $('record-title').textContent = record.template.nombre;
        $('record-meta').textContent = `${record.branch} · ${dateLabel(record.week)} al ${dateLabel(addDays(record.week, 6))} · Encargado: ${record.leader}`;
        $('week-date').value = record.week;
        $('week-branch').value = record.branch;
        $('week-leader').value = record.leader;
        $('week-template').value = record.template.id;
        if (!$('week-template').value) {
            const option = document.createElement('option');
            option.value = record.template.id;
            option.textContent = `${record.template.nombre} (plantilla eliminada)`;
            option.disabled = true;
            option.selected = true;
            $('week-template').appendChild(option);
        }
        $('task-search').value = '';
        const categories = [...new Set(record.template.actividades.map(task => task.categoria))];
        $('task-category').innerHTML = '<option value="">Todas las categorías</option>' + categories.map(category => `<option>${escape(category)}</option>`).join('');
        $('task-shift').innerHTML = '<option value="">Todos los turnos</option>' + Array.from({ length: record.template.turnos }, (_, i) => `<option value="${i + 1}">T${i + 1}</option>`).join('');
        renderStats();
        renderMatrix();
        renderActions();
        saved();
        setTab('week');
    }
    function renderMatrix(all = false) {
        if (!record) return;
        const search = all ? '' : $('task-search').value.trim().toLocaleLowerCase('es');
        const category = all ? '' : $('task-category').value;
        const shift = all ? '' : $('task-shift').value;
        const tasks = record.template.actividades.filter(task => (!category || task.categoria === category) && `${task.actividad} ${task.categoria} ${task.frecuencia}`.toLocaleLowerCase('es').includes(search));
        const shifts = shift ? [Number(shift)] : Array.from({ length: record.template.turnos }, (_, i) => i + 1);
        const groups = new Map();
        const editableDays = dias.map((_, i) => ChecklistStore.canEditDate(addDays(record.week, i)));
        $('date-edit-policy').textContent = adminNow()
            ? `Fecha del equipo: ${dateLabel(today())}. Como administrador puedes corregir cualquier día y eliminar notas.`
            : `Fecha del equipo: ${dateLabel(today())}. Solo puedes agregar o editar datos de hoy. Los demás días son de consulta; solo el administrador puede eliminar notas.`;
        tasks.forEach(task => {
            if (!groups.has(task.categoria)) groups.set(task.categoria, []);
            groups.get(task.categoria).push(task);
        });
        let html = '<caption class="sr-only">Checklist semanal por día y turno</caption><thead><tr><th scope="col">Actividad / frecuencia</th>';
        html += dias.map((day, i) => `<th scope="col"${addDays(record.week, i) === today() ? ' class="checklist-today"' : ''}>${day}<span>${dateLabel(addDays(record.week, i)).slice(0, 5)}</span>${addDays(record.week, i) === today() ? '<small>Hoy</small>' : ''}</th>`).join('');
        html += '</tr></thead><tbody>';
        groups.forEach((group, name) => {
            const collapsed = !all && !search && collapsedForCurrentTemplate().has(name);
            const rowIds = group.map(task => `checklist-task-${task.id}`);
            html += `<tr class="checklist-category"><th colspan="8" scope="rowgroup"><button type="button" class="checklist-category-toggle" data-category-toggle="${escape(name)}" aria-expanded="${!collapsed}" aria-controls="${escape(rowIds.join(' '))}"><span class="category-chevron" aria-hidden="true">▾</span><strong>${escape(name)}</strong><span>${group.length} actividades</span></button></th></tr>`;
            group.forEach(task => {
                const legacy = record.observations[task.id];
                const legacyHistory = record.noteHistory?.[`legacy|${task.id}`]?.length;
                html += `<tr id="checklist-task-${escape(task.id)}" data-category-row="${escape(name)}" ${collapsed ? 'hidden' : ''}><th scope="row" class="task-name"><strong>${escape(task.actividad)}</strong><span class="task-frequency">${escape(task.frecuencia || 'Frecuencia por definir')}</span>${task.horario ? `<span class="task-detail">Horario: ${escape(task.horario)}</span>` : ''}${legacy || legacyHistory ? `<button type="button" class="legacy-comment" data-legacy-comment="${escape(task.id)}" title="${escape(legacy || 'Ver historial de la nota eliminada')}">${commentIcon} ${legacy ? 'Nota anterior' : 'Historial anterior'}</button>${legacy ? `<span class="print-comment">Nota anterior: ${escape(legacy)}</span>` : ''}` : ''}</th>`;
                dias.forEach((day, dayIndex) => {
                    const editable = editableDays[dayIndex];
                    html += `<td class="shift-cell${editable ? '' : ' day-locked'}">` + shifts.map(shiftNumber => {
                        const mark = record.marks[`${task.id}|${dayIndex}|${shiftNumber}`];
                        const comment = record.comments?.[`${task.id}|${dayIndex}|${shiftNumber}`];
                        const hasHistory = record.noteHistory?.[`${task.id}|${dayIndex}|${shiftNumber}`]?.length;
                        const detail = mark ? `${mark.user} (${mark.code}) · ${new Date(mark.at).toLocaleString('es-CL')}` : 'Sin registrar';
                        return `<div class="shift-entry"><label class="shift-mark" title="${escape(editable ? detail : `${detail} · Solo lectura: únicamente se puede editar hoy.`)}"><input type="checkbox" data-task="${escape(task.id)}" data-day="${dayIndex}" data-shift="${shiftNumber}" ${mark ? 'checked' : ''} ${editable ? '' : 'disabled'} aria-label="${escape(`${task.actividad}, ${day}, T${shiftNumber}`)}"><span>T${shiftNumber}</span></label><button type="button" class="comment-button${comment ? ' has-comment' : hasHistory ? ' has-history' : ''}" data-comment-task="${escape(task.id)}" data-day="${dayIndex}" data-shift="${shiftNumber}" ${!editable && !comment && !hasHistory ? 'disabled' : ''} aria-haspopup="dialog" aria-label="${escape(`${!editable ? 'Ver' : comment ? 'Editar' : 'Agregar'} comentario: ${task.actividad}, ${day}, T${shiftNumber}`)}" title="${escape(comment?.text || (hasHistory ? 'Ver historial de la nota eliminada' : editable ? 'Agregar comentario' : 'Solo se puede agregar información el día actual'))}">${commentIcon}</button>${comment ? `<span class="print-comment">T${shiftNumber}: ${escape(comment.text)}</span>` : ''}</div>`;
                    }).join('') + '</td>';
                });
                html += '</tr>';
            });
        });
        if (!tasks.length) html += '<tr><td colspan="8" class="empty-filter">No hay actividades que coincidan con los filtros.</td></tr>';
        $('checklist-matrix').innerHTML = html + '</tbody>';
    }
    function renderActions() {
        $('action-empty').hidden = Boolean(record);
        $('action-content').hidden = !record;
        if (!record) return;
        $('action-record-meta').textContent = `${record.template.nombre} · ${record.branch} · ${dateLabel(record.week)} al ${dateLabel(addDays(record.week, 6))} · Encargado: ${record.leader}`;
        const permissions = ChecklistStore.actionPermissions();
        $('new-action').hidden = !permissions.create;
        $('new-action').disabled = !ChecklistStore.canEditWeek(record.week);
        if (!record.actions.length) {
            $('action-list').innerHTML = '<p class="checklist-help">Todavía no hay tareas en el plan de acción de esta semana.</p>';
            return;
        }
        $('action-list').innerHTML = `<div class="checklist-table-scroll"><table class="checklist-action-table"><thead><tr><th>Tarea asignada</th><th>Responsable</th><th>Asignada</th><th>Vencimiento</th><th>Estatus</th><th>Acotaciones</th><th class="no-print">Acciones</th></tr></thead><tbody>${record.actions.map(action => {
            const overdue = action.status !== 'Completado' && action.due < today();
            const editable = permissions.edit && ChecklistStore.canEditWeek(record.week) && ChecklistStore.canEditDate(action.assigned);
            return `<tr><th scope="row">${escape(action.task)}</th><td>${escape(action.responsible)}</td><td>${dateLabel(action.assigned)}</td><td>${dateLabel(action.due)}${overdue ? '<small class="overdue">Vencida</small>' : ''}</td><td><span class="status-badge">${escape(action.status)}</span></td><td>${escape(action.notes)}</td><td class="no-print">${permissions.edit ? `<div class="checklist-row-actions"><button type="button" class="checklist-button" data-edit-action="${escape(action.id)}" ${editable ? '' : 'disabled title="Solo lectura: fecha distinta de hoy"'}>Editar</button><button type="button" class="checklist-button danger-button" data-delete-action="${escape(action.id)}" ${editable ? '' : 'disabled'}>Eliminar</button></div>` : '<span class="checklist-help">Solo Admin</span>'}</td></tr>`;
        }).join('')}</tbody></table></div>`;
    }
    function editComment(button) {
        try {
            record = ChecklistStore.getRecord(record.id);
            const legacy = button.hasAttribute('data-legacy-comment');
            const taskId = legacy ? button.dataset.legacyComment : button.dataset.commentTask;
            const day = Number(button.dataset.day);
            const shift = Number(button.dataset.shift);
            const task = record.template.actividades.find(item => item.id === taskId);
            const comment = legacy ? null : record.comments?.[`${taskId}|${day}|${shift}`];
            const text = legacy ? record.observations[taskId] || '' : comment?.text || '';
            commentTarget = { taskId, day, shift, legacy };
            $('comment-dialog-title').textContent = legacy ? 'Observación general anterior' : 'Comentario del turno';
            $('comment-context').textContent = legacy
                ? `${task.actividad} · Nota conservada del formato anterior, sin día ni turno asignados.`
                : `${task.actividad} · ${dias[day]} ${dateLabel(addDays(record.week, day))} · T${shift}`;
            $('comment-text').maxLength = legacy ? 3000 : 500;
            $('comment-text').value = text;
            $('comment-count').textContent = `${text.length} / ${$('comment-text').maxLength}`;
            $('comment-author').textContent = comment ? `${comment.user} · ${new Date(comment.at).toLocaleString('es-CL')}` : '';
            const versions = record.noteHistory?.[legacy ? `legacy|${taskId}` : `${taskId}|${day}|${shift}`] || [];
            $('comment-history').hidden = !versions.length;
            $('comment-history').open = false;
            $('comment-history-title').textContent = `Historial de la nota (${versions.length})`;
            $('comment-history-list').innerHTML = versions.map((version, index) => `<li><strong>${index === 0 ? 'Versión original' : `Versión ${index + 1}`}</strong><p>${escape(version.text)}</p><small>${escape(version.user || 'Autor no registrado')}${version.at ? ` · ${escape(new Date(version.at).toLocaleString('es-CL'))}` : ' · Fecha original no registrada'}</small><small>${version.change === 'delete' ? 'Eliminada' : 'Modificada'} por ${escape(version.changedBy)} · ${escape(new Date(version.changedAt).toLocaleString('es-CL'))}</small></li>`).reverse().join('');
            applyCommentPermissions();
            $('comment-error').hidden = true;
            editorDirty = false;
            $('comment-dialog').showModal();
            $('comment-text').focus();
        } catch (error) { showError(error); }
    }
    function applyCommentPermissions() {
        if (!record || !commentTarget) return;
        const { taskId, day, shift, legacy } = commentTarget;
        const admin = adminNow();
        const editable = legacy ? admin : ChecklistStore.canEditDate(addDays(record.week, day));
        const existing = legacy ? record.observations[taskId] : record.comments?.[`${taskId}|${day}|${shift}`]?.text;
        $('comment-text').readOnly = !editable;
        $('comment-text').required = !admin && editable;
        $('save-comment').hidden = !editable;
        $('delete-comment').hidden = !admin || !existing;
        $('comment-permissions').textContent = !editable
            ? (legacy ? 'Solo lectura: esta observación no tiene fecha asignada. Solo un administrador puede modificarla.' : 'Solo lectura: los cajeros pueden editar o agregar notas únicamente en el día actual del equipo.')
            : admin ? 'Se conserva el historial de las modificaciones y eliminaciones.' : 'Puedes editar esta nota de hoy. Su versión anterior quedará en el historial; solo el administrador puede eliminarla.';
    }
    function saveComment(text) {
        if (!commentTarget || !record) return;
        const { taskId, day, shift, legacy } = commentTarget;
        try {
            record = legacy ? ChecklistStore.setObservation(record.id, taskId, text)
                : ChecklistStore.setComment(record.id, taskId, day, shift, text);
            saved();
            renderMatrix();
            $('comment-dialog').close();
        } catch (error) {
            showError(error, 'comment-error');
        }
    }
    function renderHistory() {
        const query = $('history-search').value.trim().toLocaleLowerCase('es');
        const records = ChecklistStore.listRecords().filter(item => `${item.template.nombre} ${item.branch} ${item.week} ${item.leader}`.toLocaleLowerCase('es').includes(query));
        $('history-list').innerHTML = records.length ? records.map(item => `<article class="history-card"><div><h4>${escape(item.template.nombre)}</h4><p>${escape(item.branch)} · ${dateLabel(item.week)} al ${dateLabel(addDays(item.week, 6))}</p><span class="template-meta">Líder: ${escape(item.leader)} · ${Object.keys(item.marks).length} marcas · ${item.actions.length} tareas de seguimiento</span></div><button type="button" class="checklist-button" data-record="${escape(item.id)}">Abrir registro</button></article>`).join('') : '<div class="checklist-empty"><h3>No hay registros para mostrar</h3><p>Las semanas que abras aparecerán aquí.</p></div>';
    }
    function renderTemplates() {
        const templates = ChecklistStore.listTemplates();
        $('template-list').innerHTML = templates.length ? templates.map(template => `<article class="template-card"><div><h4>${escape(template.nombre)}</h4><p>${escape(template.descripcion)}</p><span class="template-meta">${template.actividades.length} actividades · ${new Set(template.actividades.map(task => task.categoria)).size} categorías · ${template.turnos} turnos</span></div><div class="checklist-row-actions"><button type="button" class="checklist-button" data-edit-template="${escape(template.id)}">Editar checklist</button><button type="button" class="checklist-button danger-button" data-delete-template="${escape(template.id)}">Eliminar</button></div></article>`).join('') : '<div class="checklist-empty"><h3>No hay plantillas</h3><p>Usa «Nuevo checklist» para crear la primera lista.</p></div>';
    }
    function taskEditor(task = {}) {
        const row = document.createElement('div');
        row.className = 'template-task';
        row.dataset.id = task.id || '';
        row.innerHTML = `<span class="task-editor-index"></span><label>Categoría<input data-field="categoria" maxlength="120" required value="${escape(task.categoria || '')}"></label><label>Actividad<textarea data-field="actividad" maxlength="1000" rows="2" required>${escape(task.actividad || '')}</textarea></label><label>Frecuencia<input data-field="frecuencia" maxlength="120" placeholder="Ej. Diario, 2/semana" value="${escape(task.frecuencia || '')}"></label><label>Horario sugerido<input data-field="horario" maxlength="240" placeholder="Ej. T1 09:00 · T2 16:30" value="${escape(task.horario || '')}"></label><div class="task-editor-actions"><button type="button" class="checklist-button" data-move="-1" aria-label="Subir actividad">↑</button><button type="button" class="checklist-button" data-move="1" aria-label="Bajar actividad">↓</button><button type="button" class="checklist-button danger-button" data-remove-task aria-label="Eliminar actividad">×</button></div>`;
        return row;
    }
    function numberTasks() {
        [...$('template-tasks').children].forEach((row, i, rows) => {
            row.querySelector('.task-editor-index').textContent = String(i + 1).padStart(2, '0');
            row.querySelector('[data-move="-1"]').disabled = i === 0;
            row.querySelector('[data-move="1"]').disabled = i === rows.length - 1;
        });
    }
    function editTemplate(id = null) {
        if (!isAdmin) return;
        const template = id ? ChecklistStore.listTemplates().find(item => item.id === id) : null;
        if (id && !template) throw new Error('Este checklist ya no está disponible.');
        templateId = id;
        $('template-dialog-title').textContent = id ? 'Editar checklist' : 'Nuevo checklist';
        $('template-name').value = template?.nombre || '';
        $('template-shifts').value = template?.turnos || 3;
        $('template-description').value = template?.descripcion || '';
        $('template-tasks').replaceChildren(...(template?.actividades || [{}]).map(taskEditor));
        $('template-error').hidden = true;
        numberTasks();
        editorDirty = false;
        $('template-dialog').showModal();
    }
    function editAction(id = null) {
        const permissions = ChecklistStore.actionPermissions();
        if (id ? !permissions.edit : !permissions.create) {
            mostrarNotificacion(id ? 'Solo Admin puede editar tareas del plan de acción.' : 'Tu cargo no tiene permiso para agregar tareas al plan de acción.', 'error');
            return;
        }
        const action = record.actions.find(item => item.id === id);
        actionId = id;
        $('action-task').value = action?.task || '';
        $('action-responsible').value = action?.responsible || record.leader;
        $('action-assigned').value = action?.assigned || today();
        $('action-assigned').readOnly = !adminNow();
        $('action-assigned').min = adminNow() ? '' : today();
        $('action-assigned').max = adminNow() ? '' : today();
        $('action-due').value = action?.due || today();
        $('action-status').value = action?.status || 'Pendiente';
        $('action-notes').value = action?.notes || '';
        $('action-error').hidden = true;
        $('action-form').querySelector('[type="submit"]').disabled = false;
        editorDirty = false;
        $('action-dialog').showModal();
    }
    function renderAgenda() {
        $('shift-agenda').innerHTML = CHECKLIST_AGENDA.turnos.map(shift => `<details class="agenda-shift"><summary>${escape(shift.nombre)} <span>${escape(shift.horario)}</span></summary><ol>${shift.bloques.map(block => `<li><div class="agenda-time">${escape(block.horario)}</div><div><strong>${escape(block.actividad)}</strong><p>${escape(block.responsabilidad)}</p></div></li>`).join('')}</ol></details>`).join('') + `<h3>Recordatorios obligatorios</h3><ul class="agenda-reminders">${CHECKLIST_AGENDA.recordatorios.map(item => `<li><strong>${escape(item.titulo)}</strong><p>${escape(item.descripcion)}</p></li>`).join('')}</ul>`;
    }
    function bindEvents() {
        document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => setTab(button.dataset.tab)));
        document.querySelector('.checklist-tabs').addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const tabs = [...document.querySelectorAll('[data-tab]')].filter(button => !button.hidden);
            let index = tabs.indexOf(document.activeElement);
            if (index < 0) return;
            event.preventDefault();
            index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            tabs[index].focus();
            setTab(tabs[index].dataset.tab);
        });
        $('open-week-form').addEventListener('submit', event => {
            event.preventDefault();
            openSelectedWeek();
        });
        $('week-template').addEventListener('change', openSelectedWeek);
        $('task-search').addEventListener('input', () => renderMatrix());
        ['task-category', 'task-shift'].forEach(id => $(id).addEventListener('change', () => renderMatrix()));
        $('checklist-matrix').addEventListener('click', event => {
            const commentButton = event.target.closest('[data-comment-task], [data-legacy-comment]');
            if (commentButton) { editComment(commentButton); return; }
            const button = event.target.closest('[data-category-toggle]');
            if (!button || !record) return;
            const name = button.dataset.categoryToggle;
            const collapse = button.getAttribute('aria-expanded') === 'true';
            if (collapse) collapsedForCurrentTemplate().add(name);
            else collapsedForCurrentTemplate().delete(name);
            button.setAttribute('aria-expanded', String(!collapse));
            $('checklist-matrix').querySelectorAll('[data-category-row]').forEach(row => {
                if (row.dataset.categoryRow === name) row.hidden = collapse;
            });
        });
        $('checklist-matrix').addEventListener('change', event => {
            const target = event.target;
            if (target.matches('[data-task]')) {
                if (persist(() => ChecklistStore.markTask(record.id, target.dataset.task, Number(target.dataset.day), Number(target.dataset.shift), target.checked))) {
                    const mark = record.marks[`${target.dataset.task}|${target.dataset.day}|${target.dataset.shift}`];
                    target.closest('label').title = mark ? `${mark.user} (${mark.code}) · ${new Date(mark.at).toLocaleString('es-CL')}` : 'Sin registrar';
                } else target.checked = !target.checked;
            }
        });
        $('comment-form').addEventListener('submit', event => {
            event.preventDefault();
            saveComment($('comment-text').value);
        });
        $('delete-comment').addEventListener('click', () => saveComment(''));
        $('comment-text').addEventListener('input', () => {
            $('comment-count').textContent = `${$('comment-text').value.length} / ${$('comment-text').maxLength}`;
        });
        $('comment-dialog').addEventListener('close', () => {
            if (!commentTarget) return;
            const { taskId, day, shift, legacy } = commentTarget;
            const row = $(`checklist-task-${taskId}`);
            const button = row?.querySelector(legacy ? '[data-legacy-comment]' : `[data-comment-task][data-day="${day}"][data-shift="${shift}"]`);
            (button || row?.querySelector('input'))?.focus();
            commentTarget = null;
        });
        $('history-search').addEventListener('input', renderHistory);
        $('history-list').addEventListener('click', event => {
            const button = event.target.closest('[data-record]');
            if (!button) return;
            try { showRecord(ChecklistStore.getRecord(button.dataset.record)); } catch (error) { showError(error); }
        });
        $('new-checklist').addEventListener('click', () => editTemplate());
        $('template-list').addEventListener('click', async event => {
            const edit = event.target.closest('[data-edit-template]');
            const remove = event.target.closest('[data-delete-template]');
            try {
                if (edit) editTemplate(edit.dataset.editTemplate);
                if (remove && await confirmarAccion('Se eliminará esta plantilla. Las semanas ya registradas se conservarán en el historial.', { titulo: 'Eliminar checklist', textoAceptar: 'Eliminar' })) {
                    ChecklistStore.deleteTemplate(remove.dataset.deleteTemplate);
                    renderTemplates();
                    renderTemplateOptions();
                    mostrarNotificacion('Checklist eliminado. El historial se conserva.');
                }
            } catch (error) { showError(error); }
        });
        $('add-template-task').addEventListener('click', () => {
            const last = $('template-tasks').lastElementChild;
            const row = taskEditor({ categoria: last?.querySelector('[data-field="categoria"]').value || '' });
            $('template-tasks').appendChild(row);
            numberTasks();
            row.querySelector('[data-field="actividad"]').focus();
            editorDirty = true;
        });
        $('template-tasks').addEventListener('click', event => {
            const button = event.target.closest('button');
            if (!button) return;
            const row = button.closest('.template-task');
            if (button.hasAttribute('data-remove-task')) row.remove();
            if (button.dataset.move === '-1' && row.previousElementSibling) row.previousElementSibling.before(row);
            if (button.dataset.move === '1' && row.nextElementSibling) row.nextElementSibling.after(row);
            numberTasks();
            editorDirty = true;
        });
        $('template-form').addEventListener('submit', event => {
            event.preventDefault();
            const actividades = [...$('template-tasks').children].map(row => {
                const task = { id: row.dataset.id };
                row.querySelectorAll('[data-field]').forEach(input => { task[input.dataset.field] = input.value; });
                return task;
            });
            try {
                ChecklistStore.saveTemplate({ id: templateId, nombre: $('template-name').value, turnos: Number($('template-shifts').value), descripcion: $('template-description').value, actividades });
                editorDirty = false;
                $('template-dialog').close();
                renderTemplateOptions();
                renderTemplates();
                mostrarNotificacion('Checklist guardado. Se utilizará en nuevos registros.');
            } catch (error) { showError(error, 'template-error'); }
        });
        $('new-action').addEventListener('click', () => editAction());
        $('action-list').addEventListener('click', async event => {
            const edit = event.target.closest('[data-edit-action]');
            const remove = event.target.closest('[data-delete-action]');
            if (edit) editAction(edit.dataset.editAction);
            if (remove && await confirmarAccion('Se eliminará esta tarea del plan de acción.', { titulo: 'Eliminar tarea', textoAceptar: 'Eliminar' })) {
                if (persist(() => ChecklistStore.deleteAction(record.id, remove.dataset.deleteAction))) renderActions();
            }
        });
        $('action-form').addEventListener('submit', event => {
            event.preventDefault();
            try {
                record = ChecklistStore.saveAction(record.id, { id: actionId, task: $('action-task').value, responsible: $('action-responsible').value, assigned: $('action-assigned').value, due: $('action-due').value, status: $('action-status').value, notes: $('action-notes').value });
                editorDirty = false;
                $('action-dialog').close();
                saved();
                renderActions();
                renderStats();
            } catch (error) { showError(error, 'action-error'); }
        });
        document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
        ['template-dialog', 'action-dialog', 'comment-dialog'].forEach(id => {
            $(id).addEventListener('input', () => { editorDirty = true; });
            $(id).addEventListener('close', () => { editorDirty = false; });
        });
        $('print-week').addEventListener('click', () => window.print());
        window.addEventListener('beforeprint', () => renderMatrix(true));
        window.addEventListener('afterprint', () => renderMatrix());
        window.addEventListener('beforeunload', event => {
            if (editorDirty || saveFailed) { event.preventDefault(); event.returnValue = ''; }
        });
        window.addEventListener('storage', event => {
            if (event.key !== 'inventario_checklists' && event.key !== null) return;
            $('checklist-error').textContent = 'Los datos cambiaron en otra pestaña. Vuelve a abrir la semana para ver los cambios.';
            $('checklist-error').hidden = false;
        });
        function refreshDatePermissions() {
            if (displayedDate === today()) return;
            displayedDate = today();
            try {
                if (record) {
                    renderMatrix();
                    renderActions();
                }
                if ($('comment-dialog').open) applyCommentPermissions();
                if ($('action-dialog').open && !adminNow()) {
                    $('action-form').querySelector('[type="submit"]').disabled = !ChecklistStore.canEditDate($('action-assigned').value) || !ChecklistStore.canEditWeek(record.week);
                    showError(new Error('Cambió la fecha del equipo. Cierra y vuelve a abrir la tarea para registrar información de hoy.'), 'action-error');
                }
            } catch (error) { showError(error); }
        }
        window.addEventListener('focus', refreshDatePermissions);
        document.addEventListener('visibilitychange', refreshDatePermissions);
        setInterval(refreshDatePermissions, 30000);
    }
    document.addEventListener('DOMContentLoaded', () => {
        if (!verificarSesion()) return;
        try {
            inicializarDatos();
            ChecklistStore.init();
            isAdmin = esAdminActual();
            displayedDate = today();
            $('new-checklist').hidden = !isAdmin;
            $('tab-manage').hidden = !isAdmin;
            $('week-date').value = monday(today());
            $('week-branch').value = 'K5753';
            $('week-leader').value = 'Edwin Mundy';
            renderTemplateOptions();
            renderAgenda();
            bindEvents();
            openSelectedWeek();
        } catch (error) {
            showError(error);
            $('open-week').disabled = true;
            $('new-checklist').hidden = true;
        }
    });
})();
