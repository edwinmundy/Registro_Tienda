const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../js/features/checklists-store.js'), 'utf8');
const KEY = 'inventario_checklists';
const seed = [{ id: 'diario', nombre: 'Diario', turnos: 2, descripcion: 'Base', actividades: [
    { id: 'cafe', categoria: 'Café', actividad: 'Limpiar máquina', horario: '09:00', frecuencia: 'Diario' }
] }];

function setup() {
    const values = new Map();
    let session = { cajeroId: 'admin', cajeroNombre: 'Admin', cajeroCodigo: 'ADMIN', cajeroCargo: 'Corporativo' };
    let failWrite = false;
    const RealDate = Date;
    let now = RealDate.parse('2026-11-09T15:00:00.000Z');
    let timezoneOffset = 180;
    class FakeDate extends RealDate {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
        getFullYear() { return new RealDate(this.getTime() - timezoneOffset * 60000).getUTCFullYear(); }
        getMonth() { return new RealDate(this.getTime() - timezoneOffset * 60000).getUTCMonth(); }
        getDate() { return new RealDate(this.getTime() - timezoneOffset * 60000).getUTCDate(); }
    }
    const context = vm.createContext({
        console,
        Date: FakeDate,
        CHECKLIST_PLANTILLAS_INICIALES: structuredClone(seed),
        localStorage: { getItem: key => values.has(key) ? values.get(key) : null },
        guardarJsonStorage: (key, value) => {
            if (failWrite) throw new Error('QuotaExceededError');
            values.set(key, JSON.stringify(value));
        },
        obtenerSesionActiva: () => session,
        crearCajeroDesdeSesion: value => ({ id: value.cajeroId, nombre: value.cajeroNombre, codigo: value.cajeroCodigo, cargo: value.cajeroCargo }),
        cajeroTienePermisosAdmin: value => value.codigo === 'ADMIN' || value.cargo === 'Encargado'
    });
    vm.runInContext(source, context);
    const store = vm.runInContext('ChecklistStore', context);
    return {
        store, values,
        cashier() { session = { cajeroId: 'user1', cajeroNombre: 'María', cajeroCodigo: 'CAJ1', cajeroCargo: 'Cajero' }; },
        admin() { session = { cajeroId: 'admin', cajeroNombre: 'Admin', cajeroCodigo: 'ADMIN', cajeroCargo: 'Corporativo' }; },
        clock(iso, offset = timezoneOffset) { now = RealDate.parse(iso); timezoneOffset = offset; },
        logout() { session = null; },
        failWrites() { failWrite = true; }
    };
}

function week(store, changes = {}) {
    return store.openWeek({ templateId: 'diario', week: '2026-11-09', branch: 'Centro', leader: 'Ana', ...changes });
}

test('comentarios por casilla independientes de marcas, días, turnos y observaciones anteriores', () => {
    const { store, values } = setup();
    store.init();
    const record = week(store);
    store.setObservation(record.id, 'cafe', 'Nota general anterior');
    store.setComment(record.id, 'cafe', 0, 1, 'Lunes mañana');
    store.setComment(record.id, 'cafe', 0, 2, 'Lunes tarde');
    store.setComment(record.id, 'cafe', 1, 1, 'Martes mañana');
    store.markTask(record.id, 'cafe', 0, 1, true);
    store.markTask(record.id, 'cafe', 0, 1, false);
    let updated = store.getRecord(record.id);
    assert.equal(updated.comments['cafe|0|1'].text, 'Lunes mañana');
    assert.equal(updated.comments['cafe|0|1'].code, 'ADMIN');
    assert.equal(Object.keys(updated.marks).length, 0);
    assert.equal(updated.observations.cafe, 'Nota general anterior');
    store.setComment(record.id, 'cafe', 0, 1, 'Nota editada');
    store.setComment(record.id, 'cafe', 0, 2, '');
    updated = store.getRecord(record.id);
    assert.equal(updated.comments['cafe|0|1'].text, 'Nota editada');
    assert.equal(updated.comments['cafe|0|2'], undefined);
    assert.equal(updated.comments['cafe|1|1'].text, 'Martes mañana');
    const before = values.get(KEY);
    assert.throws(() => store.setComment(record.id, 'cafe', 0, 3, 'Inválido'), /turno/);
    assert.throws(() => store.setComment(record.id, 'cafe', 7, 1, 'Inválido'), /día/);
    assert.throws(() => store.setComment(record.id, 'cafe', 0, 1, 'x'.repeat(501)), /500/);
    assert.equal(values.get(KEY), before);
    const legacy = JSON.parse(before);
    delete legacy.records[0].comments;
    values.set(KEY, JSON.stringify(legacy));
    store.init();
    assert.equal(Object.keys(store.getRecord(record.id).comments).length, 0);
    assert.equal(store.getRecord(record.id).observations.cafe, 'Nota general anterior');
});

test('comentarios verifican sesión y conservan datos ante errores de almacenamiento', () => {
    const fixture = setup();
    fixture.store.init();
    const record = week(fixture.store);
    fixture.cashier();
    fixture.store.setComment(record.id, 'cafe', 0, 1, 'Nota del cajero');
    assert.equal(fixture.store.getRecord(record.id).comments['cafe|0|1'].code, 'CAJ1');
    const before = fixture.values.get(KEY);
    fixture.failWrites();
    assert.throws(() => fixture.store.setComment(record.id, 'cafe', 0, 1, 'No guardar'), /Quota/);
    assert.equal(fixture.values.get(KEY), before);
    fixture.logout();
    assert.throws(() => fixture.store.setComment(record.id, 'cafe', 0, 1, 'Sin sesión'), /sesión/);
});

test('actualiza rótulos de café guardados sin perder marcas ni sobrescribir personalizaciones', () => {
    const { store, values } = setup();
    store.init();
    const original = 'Get It y leche liquida: recirculación';
    store.saveTemplate({ id: 'diario-2-turnos', nombre: 'Diario 2 turnos', turnos: 2, actividades: [
        { id: 'diario-15', categoria: 'MAQUINA DE CAFÉ', actividad: original },
        { id: 'diario-16', categoria: 'MAQUINA DE CAFÉ', actividad: 'Ingredientes personalizados' }
    ] });
    const record = week(store, { templateId: 'diario-2-turnos' });
    store.markTask(record.id, 'diario-15', 0, 1, true);
    store.setObservation(record.id, 'diario-15', 'Observación que se conserva');
    const previous = JSON.parse(values.get(KEY));
    delete previous.coffeeLabelsVersion;
    values.set(KEY, JSON.stringify(previous));
    store.init();
    assert.equal(store.listTemplates().find(item => item.id === 'diario-2-turnos').actividades[0].actividad, 'Recirculación');
    const updated = store.getRecord(record.id);
    assert.equal(updated.template.actividades[0].actividad, 'Recirculación');
    assert.equal(updated.template.actividades[1].actividad, 'Ingredientes personalizados');
    assert.deepEqual(JSON.parse(JSON.stringify(updated.marks)), previous.records[0].marks);
    assert.deepEqual(JSON.parse(JSON.stringify(updated.observations)), previous.records[0].observations);
    const edited = store.listTemplates().find(item => item.id === 'diario-2-turnos');
    edited.actividades[0].actividad = original;
    store.saveTemplate(edited);
    store.init();
    assert.equal(store.listTemplates().find(item => item.id === 'diario-2-turnos').actividades[0].actividad, original, 'correction runs once');
});

test('plantillas CRUD, clones y eliminación sin resembrar', () => {
    const { store } = setup();
    store.init();
    const initial = store.listTemplates();
    initial[0].nombre = 'Cambio externo';
    assert.equal(store.listTemplates()[0].nombre, 'Diario');
    const created = store.saveTemplate({ nombre: 'Nuevo', turnos: 3, actividades: [{ categoria: 'Sala', actividad: 'Barrer' }] });
    assert.ok(created.id);
    assert.ok(created.actividades[0].id);
    created.nombre = 'Editado';
    store.saveTemplate(created);
    assert.equal(store.listTemplates()[1].nombre, 'Editado');
    store.deleteTemplate(created.id);
    store.deleteTemplate('diario');
    store.init();
    assert.equal(store.listTemplates().length, 0);
});

test('sesión fresca y permisos en cada mutación', () => {
    const fixture = setup();
    fixture.store.init();
    const record = week(fixture.store);
    fixture.cashier();
    assert.throws(() => fixture.store.saveTemplate(seed[0]), /administrador/);
    assert.throws(() => fixture.store.deleteTemplate('diario'), /administrador/);
    const marked = fixture.store.markTask(record.id, 'cafe', 0, 1, true);
    assert.equal(marked.marks['cafe|0|1'].user, 'María');
    fixture.logout();
    for (const mutate of [
        () => fixture.store.init(),
        () => week(fixture.store),
        () => fixture.store.markTask(record.id, 'cafe', 0, 1, false),
        () => fixture.store.setObservation(record.id, 'cafe', 'Prueba'),
        () => fixture.store.deleteAction(record.id, 'accion')
    ]) assert.throws(mutate, /sesión/);
});

test('histórico conserva instantáneas después de editar y eliminar plantilla', () => {
    const { store } = setup();
    store.init();
    const record = week(store);
    const edited = store.listTemplates()[0];
    edited.nombre = 'Otro nombre';
    edited.actividades[0].actividad = 'Otra actividad';
    store.saveTemplate(edited);
    assert.equal(store.getRecord(record.id).template.nombre, 'Diario');
    assert.equal(store.getRecord(record.id).template.actividades[0].actividad, 'Limpiar máquina');
    assert.equal(week(store, { week: '2026-11-16' }).template.nombre, 'Otro nombre');
    store.deleteTemplate('diario');
    assert.equal(week(store).id, record.id);
    assert.equal(store.getRecord(record.id).template.nombre, 'Diario');
});

test('identidad semanal, sucursal y turnos mantienen registros separados', () => {
    const { store } = setup();
    store.init();
    const record = week(store, { week: '2026-11-11', branch: ' Centro ' });
    assert.equal(record.week, '2026-11-09');
    assert.equal(week(store, { branch: 'CENTRO' }).id, record.id);
    const other = week(store, { branch: 'Norte' });
    assert.notEqual(other.id, record.id);
    store.markTask(record.id, 'cafe', 0, 1, true);
    store.markTask(record.id, 'cafe', 0, 2, true);
    store.markTask(record.id, 'cafe', 1, 1, true);
    store.markTask(record.id, 'cafe', 0, 1, false);
    assert.equal(Object.keys(store.getRecord(record.id).marks).length, 2);
    assert.equal(Object.keys(store.getRecord(other.id).marks).length, 0);
    assert.equal(Object.keys(week(store, { week: '2026-11-16' }).marks).length, 0);
    assert.throws(() => store.markTask(record.id, 'cafe', 7, 1, true), /día y un turno/);
    assert.throws(() => store.markTask(record.id, 'cafe', 0, 3, true), /día y un turno/);
    assert.throws(() => store.markTask(record.id, 'noexiste', 0, 1, true), /actividad/);
});

test('observaciones y plan de acción se guardan, editan y eliminan', () => {
    const { store } = setup();
    store.init();
    const record = week(store);
    store.setObservation(record.id, 'cafe', '  Falta producto  ');
    assert.equal(store.getRecord(record.id).observations.cafe, 'Falta producto');
    store.setObservation(record.id, 'cafe', '');
    assert.equal(Object.keys(store.getRecord(record.id).observations).length, 0);
    const input = { task: 'Reponer', responsible: 'Ana', assigned: '2026-11-09', due: '2026-11-11', status: 'Pendiente', notes: 'Insumos' };
    const saved = store.saveAction(record.id, input);
    const action = saved.actions[0];
    store.saveAction(record.id, { ...action, status: 'Completado' });
    assert.equal(store.getRecord(record.id).actions.length, 1);
    assert.equal(store.getRecord(record.id).actions[0].status, 'Completado');
    assert.throws(() => store.saveAction(record.id, { ...input, due: '2026-11-08' }), /anterior/);
    assert.throws(() => store.saveAction(record.id, { ...input, due: '2026-02-30' }), /válida/);
    assert.throws(() => store.saveAction(record.id, { ...input, status: 'Desconocido' }), /estatus/);
    store.deleteAction(record.id, action.id);
    assert.equal(store.getRecord(record.id).actions.length, 0);
});

test('errores de almacenamiento no simulan un guardado exitoso', () => {
    const fixture = setup();
    fixture.store.init();
    const record = week(fixture.store);
    const before = fixture.values.get(KEY);
    fixture.failWrites();
    assert.throws(() => fixture.store.markTask(record.id, 'cafe', 0, 1, true), /QuotaExceeded/);
    assert.equal(fixture.values.get(KEY), before);
    assert.equal(Object.keys(fixture.store.getRecord(record.id).marks).length, 0);
});

test('JSON corrupto o estructura inválida nunca se sobrescriben con semillas', () => {
    const fixture = setup();
    for (const invalid of ['{invalid', '{}', '{"version":2,"templates":[],"records":[]}']) {
        fixture.values.set(KEY, invalid);
        assert.throws(() => fixture.store.init());
        assert.equal(fixture.values.get(KEY), invalid);
    }
});

test('validaciones rechazan entradas incompletas, fechas imposibles e IDs peligrosos', () => {
    const { store } = setup();
    store.init();
    assert.throws(() => store.saveTemplate({ ...seed[0], nombre: '  ' }), /nombre/);
    assert.throws(() => store.saveTemplate({ ...seed[0], actividades: [] }), /actividades/);
    assert.throws(() => store.saveTemplate({ ...seed[0], turnos: 4 }), /turnos/);
    assert.throws(() => store.saveTemplate({ ...seed[0], actividades: [seed[0].actividades[0], seed[0].actividades[0]] }), /identificador/);
    assert.throws(() => store.saveTemplate({ ...seed[0], id: '__proto__' }), /Identificador/);
    assert.throws(() => week(store, { week: '2026-02-30' }), /válida/);
    assert.throws(() => week(store, { branch: '' }), /sucursal/);
});

test('mutaciones recargan el estado más reciente y no pierden cambios de otra instancia', () => {
    const fixture = setup();
    fixture.store.init();
    const record = week(fixture.store);
    const state = JSON.parse(fixture.values.get(KEY));
    state.records[0].observations.cafe = 'Agregado desde otra pestaña';
    fixture.values.set(KEY, JSON.stringify(state));
    fixture.store.markTask(record.id, 'cafe', 2, 1, true);
    assert.equal(fixture.store.getRecord(record.id).observations.cafe, 'Agregado desde otra pestaña');
});

test('respaldos con relaciones inválidas se rechazan sin sobrescribir datos', () => {
    const fixture = setup();
    fixture.store.init();
    const record = week(fixture.store);
    const original = fixture.values.get(KEY);
    const corruptions = [
        state => { state.templates[0].actividades[0].id = '__proto__'; },
        state => { state.records[0].marks['no-existe|0|1'] = { user: 'Usuario', code: 'CAJ1', at: new Date().toISOString() }; },
        state => { state.records[0].observations['actividad-ausente'] = 'Texto'; },
        state => { state.records[0].actions.push({ id: 'accion', task: 'Tarea', responsible: 'Ana', assigned: '2026-11-10', due: '2026-11-09', status: 'Pendiente', notes: '' }); },
        state => { state.records.push(structuredClone(state.records[0])); }
    ];
    for (const corrupt of corruptions) {
        const state = JSON.parse(original);
        corrupt(state);
        const raw = JSON.stringify(state);
        fixture.values.set(KEY, raw);
        assert.throws(() => fixture.store.init());
        assert.throws(() => fixture.store.markTask(record.id, 'cafe', 0, 1, true));
        assert.equal(fixture.values.get(KEY), raw);
    }
});

test('cajero solo marca o comenta el día local actual; administrador puede corregir otras fechas', () => {
    const fixture = setup();
    const { store, values } = fixture;
    store.init();
    const current = week(store);
    const past = week(store, { week: '2026-11-02' });
    const future = week(store, { week: '2026-11-16' });
    fixture.cashier();
    assert.equal(store.currentDate(), '2026-11-09');
    assert.equal(store.canEditDate('2026-11-09'), true);
    assert.equal(store.canEditDate('2026-11-08'), false);
    assert.equal(store.canEditDate('2026-11-10'), false);
    assert.equal(store.canEditWeek('2026-11-09'), true);
    assert.equal(store.canEditWeek('2026-11-16'), false);
    store.markTask(current.id, 'cafe', 0, 1, true);
    store.setComment(current.id, 'cafe', 0, 1, 'Nota de hoy');
    const before = values.get(KEY);
    for (const record of [past, future]) {
        assert.throws(() => store.markTask(record.id, 'cafe', 0, 1, true), /día actual/);
        assert.throws(() => store.setComment(record.id, 'cafe', 0, 1, 'No guardar'), /día actual/);
    }
    assert.throws(() => store.markTask(current.id, 'cafe', 1, 1, true), /día actual/);
    assert.throws(() => store.setComment(current.id, 'cafe', 1, 1, 'Mañana'), /día actual/);
    assert.equal(values.get(KEY), before);
    fixture.admin();
    assert.equal(store.canEditDate('2026-11-02'), true);
    assert.equal(store.canEditWeek('2026-11-16'), true);
    store.markTask(past.id, 'cafe', 0, 1, true);
    store.setComment(future.id, 'cafe', 0, 1, 'Corrección administrativa');
});

test('la fecha usa calendario local del equipo y cambia permisos al cruzar medianoche', () => {
    const fixture = setup();
    const { store } = fixture;
    store.init();
    const record = week(store);
    fixture.cashier();
    fixture.clock('2026-11-10T02:59:59.999Z', 180);
    assert.equal(store.currentDate(), '2026-11-09', 'UTC ya es martes pero el equipo sigue en lunes');
    store.markTask(record.id, 'cafe', 0, 1, true);
    fixture.clock('2026-11-10T03:00:00.000Z', 180);
    assert.equal(store.currentDate(), '2026-11-10');
    assert.throws(() => store.markTask(record.id, 'cafe', 0, 1, false), /día actual/);
    assert.throws(() => store.setComment(record.id, 'cafe', 0, 1, 'Ayer'), /día actual/);
    store.markTask(record.id, 'cafe', 1, 1, true);
    fixture.clock('2026-11-09T23:30:00.000Z', -120);
    assert.equal(store.currentDate(), '2026-11-10', 'el calendario local puede ir un día delante de UTC');
});

test('cajero conserva cada nota original al editar; solo admin elimina y conserva historial', () => {
    const fixture = setup();
    const { store, values } = fixture;
    store.init();
    const record = week(store);
    store.markTask(record.id, 'cafe', 0, 1, true);
    store.setComment(record.id, 'cafe', 0, 1, 'Original del administrador');
    const original = store.getRecord(record.id).comments['cafe|0|1'];
    fixture.cashier();
    fixture.clock('2026-11-09T16:00:00Z');
    store.setComment(record.id, 'cafe', 0, 1, 'Primera corrección');
    let history = store.getRecord(record.id).noteHistory['cafe|0|1'];
    assert.equal(history.length, 1);
    assert.equal(history[0].text, original.text);
    assert.equal(history[0].user, original.user);
    assert.equal(history[0].code, original.code);
    assert.equal(history[0].at, original.at);
    assert.equal(history[0].changedBy, 'María');
    assert.equal(history[0].changedCode, 'CAJ1');
    assert.equal(history[0].changedAt, '2026-11-09T16:00:00.000Z');
    assert.equal(history[0].change, 'edit');
    const noOpBefore = values.get(KEY);
    store.setComment(record.id, 'cafe', 0, 1, ' Primera corrección ');
    assert.equal(values.get(KEY), noOpBefore, 'igual texto no agrega versiones ni escribe');
    assert.throws(() => store.setComment(record.id, 'cafe', 0, 1, ''), /administrador.*eliminar/);
    assert.throws(() => store.setComment(record.id, 'cafe', 0, 1, ' \n '), /administrador.*eliminar/);
    assert.equal(values.get(KEY), noOpBefore);
    fixture.clock('2026-11-09T17:00:00Z');
    store.setComment(record.id, 'cafe', 0, 1, 'Segunda corrección');
    fixture.admin();
    fixture.clock('2026-11-10T17:00:00Z');
    store.setComment(record.id, 'cafe', 0, 1, '');
    const updated = store.getRecord(record.id);
    assert.equal(updated.comments['cafe|0|1'], undefined);
    history = updated.noteHistory['cafe|0|1'];
    assert.equal(history.length, 3);
    assert.equal(history[0].text, 'Original del administrador');
    assert.equal(history[1].text, 'Primera corrección');
    assert.equal(history[1].user, 'María');
    assert.equal(history[2].text, 'Segunda corrección');
    assert.equal(history[2].change, 'delete');
    assert.equal(history[2].changedCode, 'ADMIN');
    assert.equal(Object.keys(updated.marks).length, 1);
});

test('notas generales antiguas son solo admin y preservan autor desconocido sin inventarlo', () => {
    const fixture = setup();
    const { store, values } = fixture;
    store.init();
    const record = week(store);
    const previous = JSON.parse(values.get(KEY));
    previous.records[0].observations.cafe = 'Nota histórica sin fecha';
    delete previous.records[0].observationMeta;
    delete previous.records[0].noteHistory;
    values.set(KEY, JSON.stringify(previous));
    fixture.cashier();
    assert.equal(Object.keys(store.getRecord(record.id).noteHistory).length, 0);
    assert.throws(() => store.setObservation(record.id, 'cafe', 'Cambio'), /administrador/);
    assert.throws(() => store.setObservation(record.id, 'cafe', ''), /administrador/);
    fixture.admin();
    store.setObservation(record.id, 'cafe', 'Primera edición con autor conocido');
    let updated = store.getRecord(record.id);
    assert.equal(updated.noteHistory['legacy|cafe'][0].text, 'Nota histórica sin fecha');
    assert.equal(updated.noteHistory['legacy|cafe'][0].user, 'No registrado');
    assert.equal(updated.noteHistory['legacy|cafe'][0].code, '');
    assert.equal(updated.noteHistory['legacy|cafe'][0].at, null);
    assert.equal(updated.observationMeta.cafe.code, 'ADMIN');
    const meta = updated.observationMeta.cafe;
    store.setObservation(record.id, 'cafe', '');
    updated = store.getRecord(record.id);
    assert.equal(updated.observations.cafe, undefined);
    assert.equal(updated.observationMeta.cafe, undefined);
    assert.equal(updated.noteHistory['legacy|cafe'].length, 2);
    assert.equal(updated.noteHistory['legacy|cafe'][1].at, meta.at);
    assert.equal(updated.noteHistory['legacy|cafe'][1].change, 'delete');
});

test('cajero puede consultar semanas anteriores pero no crearlas fuera de la semana vigente', () => {
    const fixture = setup();
    const { store, values } = fixture;
    store.init();
    const previous = week(store, { week: '2026-11-02' });
    fixture.cashier();
    assert.equal(week(store, { week: '2026-11-02' }).id, previous.id);
    assert.equal(store.getRecord(previous.id).id, previous.id);
    assert.equal(week(store).week, '2026-11-09');
    const before = values.get(KEY);
    assert.throws(() => week(store, { week: '2026-11-02', branch: 'Nueva' }), /semana actual/);
    assert.throws(() => week(store, { week: '2026-11-16' }), /semana actual/);
    assert.equal(values.get(KEY), before);
});

test('plan de acción verifica fecha asignada previa y nueva, además de semana actual', () => {
    const fixture = setup();
    const { store, values } = fixture;
    store.init();
    const record = week(store);
    const future = week(store, { week: '2026-11-16' });
    const input = { task: 'Reponer', responsible: 'Ana', assigned: '2026-11-09', due: '2026-11-11', status: 'Pendiente', notes: '' };
    const old = store.saveAction(record.id, { ...input, assigned: '2026-11-08' }).actions[0];
    fixture.cashier();
    const saved = store.saveAction(record.id, input);
    const current = saved.actions.find(item => item.id !== old.id);
    store.saveAction(record.id, { ...current, status: 'En Proceso' });
    const before = values.get(KEY);
    assert.throws(() => store.saveAction(record.id, { ...old, assigned: '2026-11-09' }), /día actual/);
    assert.throws(() => store.saveAction(record.id, { ...current, assigned: '2026-11-08' }), /día actual/);
    assert.throws(() => store.saveAction(record.id, { ...current, assigned: '2026-11-10' }), /día actual/);
    assert.throws(() => store.saveAction(future.id, input), /semana actual/);
    assert.throws(() => store.deleteAction(record.id, old.id), /día actual/);
    assert.equal(values.get(KEY), before);
    store.deleteAction(record.id, current.id);
    fixture.admin();
    store.deleteAction(record.id, old.id);
    store.saveAction(future.id, { ...input, assigned: '2026-11-16', due: '2026-11-17' });
});

test('fallo de cuota conserva nota e historial originales y marcas previas', () => {
    const fixture = setup();
    const { store, values } = fixture;
    store.init();
    const record = week(store);
    store.markTask(record.id, 'cafe', 0, 1, true);
    store.setComment(record.id, 'cafe', 0, 1, 'Original');
    store.setComment(record.id, 'cafe', 0, 1, 'Edición guardada');
    const before = values.get(KEY);
    fixture.failWrites();
    assert.throws(() => store.setComment(record.id, 'cafe', 0, 1, 'Edición fallida'), /Quota/);
    assert.equal(values.get(KEY), before);
    assert.throws(() => store.setComment(record.id, 'cafe', 0, 1, ''), /Quota/);
    assert.equal(values.get(KEY), before);
    assert.equal(store.getRecord(record.id).noteHistory['cafe|0|1'].length, 1);
    assert.equal(Object.keys(store.getRecord(record.id).marks).length, 1);
});

test('historial y metadatos corruptos se rechazan; versiones eliminadas válidas sobreviven al respaldo', () => {
    const fixture = setup();
    const { store, values } = fixture;
    store.init();
    const record = week(store);
    store.setComment(record.id, 'cafe', 0, 1, 'Original');
    store.setComment(record.id, 'cafe', 0, 1, '');
    const valid = values.get(KEY);
    store.init();
    assert.equal(store.getRecord(record.id).noteHistory['cafe|0|1'][0].change, 'delete');
    for (const corrupt of [
        state => { state.records[0].noteHistory['cafe|0|1'][0].at = null; },
        state => { state.records[0].noteHistory['cafe|0|1'][0].change = 'invalid'; },
        state => { state.records[0].noteHistory['cafe|0|1'][0].changedAt = 'invalid'; },
        state => { state.records[0].noteHistory['no-task|0|1'] = []; },
        state => { state.records[0].observationMeta.cafe = { user: 'Ana', code: 'CAJ1', at: '2026-11-09T15:00:00Z' }; }
    ]) {
        const state = JSON.parse(valid);
        corrupt(state);
        const raw = JSON.stringify(state);
        values.set(KEY, raw);
        assert.throws(() => store.init());
        assert.equal(values.get(KEY), raw);
    }
});
