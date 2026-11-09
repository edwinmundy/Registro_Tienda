// Run with Node and Playwright available (NODE_PATH can point to the bundled packages).
// Uses an isolated headless browser profile; never reads the user's browser data.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

const root = path.resolve(__dirname, '..');
const screenshots = path.join(os.tmpdir(), 'registro-checklists-qa');
fs.mkdirSync(screenshots, { recursive: true });
const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404); res.end(); return;
    }
    res.setHeader('Content-Type', { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
});

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ channel: process.env.CHECKLIST_BROWSER_CHANNEL || 'msedge', headless: true });
    let page;
    try {
        const guest = await browser.newContext();
        const guestPage = await guest.newPage();
        await guestPage.goto(`${url}/checklists.html`);
        await guestPage.waitForURL('**/login.html');
        assert.equal(await guestPage.evaluate(() => localStorage.getItem('inventario_checklists')), null);
        await guest.close();
        console.log('PASS guest redirected without creating checklist data');

        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, timezoneId: 'America/Los_Angeles' });
        await context.addInitScript(() => {
            const RealDate = Date;
            // Local Monday 23:30, while it is already Tuesday in Chile and UTC.
            window.checklistTestNow = new RealDate('2026-11-10T07:30:00Z').getTime();
            window.Date = class extends RealDate {
                constructor(...args) { super(...(args.length ? args : [window.checklistTestNow])); }
                static now() { return window.checklistTestNow; }
            };
            if (!localStorage.getItem('inventario_sesion')) {
                localStorage.setItem('inventario_sesion', JSON.stringify({ cajeroId: 'admin-1', cajeroNombre: 'Administrador', cajeroCodigo: 'ADMIN', cajeroCargo: 'Corporativo', inicio: Date.now() }));
            }
        });
        page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${url}/checklists.html`);
        await page.locator('#week-template option').nth(2).waitFor({ state: 'attached' });
        assert.equal(await page.locator('#week-template option').count(), 3);
        assert.equal(await page.evaluate(() => ChecklistStore.currentDate()), '2026-11-09', 'uses the device local date, not Chile or UTC');
        assert.equal(await page.locator('#week-content').isVisible(), true, 'Excel checklist opens by default');
        assert.equal(await page.locator('#checklist-matrix .task-name').count(), 41);
        await page.locator('#week-template').selectOption('diario-2-turnos');
        assert.equal(await page.locator('#checklist-matrix .task-name').count(), 48);
        assert.equal(await page.locator('#checklist-matrix input[data-shift="3"]').count(), 0);
        const coffeeLabels = ['Recirculación', 'Recarga de ingredientes (R)', 'DEJAR Vasos en área de caja y panadería', 'DEJAR azucar, splenda y servilletas en área de café', 'DEJAR Tapas en área de café'];
        for (let i = 0; i < coffeeLabels.length; i++) {
            assert.equal(await page.locator(`#checklist-task-diario-${15 + i} .task-name strong`).innerText(), coffeeLabels[i]);
        }
        await page.locator('#week-template').selectOption('diario-3-turnos');
        assert.equal(await page.locator('#checklist-matrix input[type=checkbox]').count(), 48 * 7 * 3);
        await page.locator('#week-template').selectOption('semanal');
        const nav = await page.locator('#main-nav .main-nav > a, #main-nav .main-nav > button').allTextContents();
        assert.match(nav[0], /Inicio/); assert.match(nav[1], /Descargar respaldo/); assert.match(nav[2], /Cargar respaldo/); assert.match(nav[3], /Cigarrillos/);
        await page.locator('#week-date').fill('2026-11-11');
        await page.locator('#week-branch').fill('Sucursal de prueba');
        await page.locator('#open-week').click();
        assert.equal(await page.locator('#week-date').inputValue(), '2026-11-09');
        assert.equal(await page.locator('#checklist-matrix input[type=checkbox]').count(), 41 * 7 * 3);
        const first = page.locator('#checklist-matrix input[data-day="0"][data-shift="1"]').first();
        await first.check();
        await page.locator('#checklist-matrix input[data-day="1"][data-shift="2"]').first().check();
        assert.equal(await page.locator('#checklist-matrix input:checked').count(), 2);
        assert.equal(await page.locator('#checklist-matrix thead th').count(), 8);
        const firstComment = page.locator('[data-comment-task="semanal-6"][data-day="0"][data-shift="1"]');
        await firstComment.click();
        await page.locator('#comment-text').fill('Revisar insumos <b>sin HTML</b>');
        await page.locator('#comment-form button[type=submit]').click();
        assert.match(await firstComment.getAttribute('class'), /has-comment/);
        assert.equal(await page.locator('#checklist-matrix input:checked').count(), 2, 'comment does not toggle checkbox');
        const otherComment = page.locator('[data-comment-task="semanal-6"][data-day="1"][data-shift="1"]');
        await otherComment.click();
        assert.equal(await page.locator('#comment-text').inputValue(), '');
        await page.locator('#comment-text').fill('Solo el martes');
        await page.locator('#comment-form button[type=submit]').click();
        await otherComment.click();
        await page.locator('#delete-comment').click();
        assert.doesNotMatch(await otherComment.getAttribute('class'), /has-comment/);
        assert.equal(await firstComment.getAttribute('title'), 'Revisar insumos <b>sin HTML</b>');
        let state = await page.evaluate(() => JSON.parse(localStorage.getItem('inventario_checklists')));
        const weeklyRecord = state.records.find(record => record.branch === 'Sucursal de prueba' && record.week === '2026-11-09');
        const weeklyId = weeklyRecord.id;
        assert.equal(Object.keys(weeklyRecord.marks).length, 2);
        assert.equal(Object.values(weeklyRecord.marks)[0].code, 'ADMIN');
        await page.evaluate(id => ChecklistStore.setObservation(id, 'semanal-6', 'Observación general anterior'), weeklyId);
        await page.reload();
        await page.locator('#tab-history').click();
        await page.locator(`[data-record="${weeklyId}"]`).click();
        assert.equal(await page.locator('#checklist-matrix input:checked').count(), 2);
        assert.equal(await firstComment.getAttribute('title'), 'Revisar insumos <b>sin HTML</b>');
        await firstComment.click();
        assert.equal(await page.locator('#comment-text').inputValue(), 'Revisar insumos <b>sin HTML</b>');
        assert.equal(await page.locator('#comment-dialog b').count(), 0);
        await page.locator('#comment-dialog [data-close]').first().click();
        await page.locator('[data-legacy-comment="semanal-6"]').click();
        assert.equal(await page.locator('#comment-text').inputValue(), 'Observación general anterior');
        await page.locator('#comment-dialog [data-close]').first().click();
        console.log('PASS comments by checkbox, isolation, deletion, legacy notes and reload persistence');

        const coffeeToggle = page.locator('[data-category-toggle="MÁQUINAS DE CAFÉ"]');
        const coffeeRow = page.locator('#checklist-task-semanal-6');
        await coffeeToggle.click();
        assert.equal(await coffeeRow.isVisible(), false);
        assert.equal(await coffeeToggle.getAttribute('aria-expanded'), 'false');
        assert.equal(await page.locator('[data-category-row="PANADERÍA"]').first().isVisible(), true);
        await page.locator('#task-shift').selectOption('1');
        assert.equal(await coffeeRow.isVisible(), false, 'collapse survives filtering');
        await coffeeToggle.focus();
        await coffeeToggle.press('Enter');
        assert.equal(await coffeeRow.isVisible(), true);
        assert.equal(await coffeeRow.locator('input').first().isChecked(), true);
        assert.equal(await firstComment.getAttribute('title'), 'Revisar insumos <b>sin HTML</b>');
        await coffeeToggle.press('Space');
        assert.equal(await coffeeRow.isVisible(), false);
        await page.locator('#task-search').fill('recirculación');
        assert.equal(await coffeeRow.isVisible(), true, 'search exposes matching activities');
        await page.locator('#task-search').fill('');
        assert.equal(await coffeeRow.isVisible(), false);
        await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
        assert.equal(await coffeeRow.isVisible(), true, 'printing expands every category');
        await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
        assert.equal(await coffeeRow.isVisible(), false, 'printing restores collapsed state');
        await coffeeToggle.click();
        console.log('PASS category collapse by click/keyboard, preserved answers, search and complete printing');

        await page.locator('#task-category').selectOption({ label: 'MÁQUINAS DE CAFÉ' });
        await page.locator('#task-shift').selectOption('1');
        assert.equal(await page.locator('#checklist-matrix input[type=checkbox]').count(), 5 * 7);
        const dayPositions = await page.locator('#checklist-matrix tr:has(.task-name)').first().locator('td.shift-cell').evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().x));
        assert.equal(dayPositions.length, 7);
        assert.equal(dayPositions.every((x, i) => i === 0 || x > dayPositions[i - 1]), true, 'days occupy seven separate columns');
        await page.evaluate(() => {
            window.originalChecklistSave = guardarJsonStorage;
            guardarJsonStorage = (key, value) => {
                if (key === 'inventario_checklists') throw new Error('No hay espacio para guardar la observación.');
                return window.originalChecklistSave(key, value);
            };
        });
        await firstComment.click();
        await page.locator('#comment-text').fill('Este texto no se debe simular como guardado');
        await page.locator('#comment-form button[type=submit]').click();
        assert.equal(await page.locator('#comment-dialog').isVisible(), true);
        assert.match(await page.locator('#comment-error').innerText(), /No hay espacio/);
        assert.equal(await firstComment.getAttribute('title'), 'Revisar insumos <b>sin HTML</b>');
        await page.locator('#comment-dialog [data-close]').first().click();
        await page.evaluate(() => { guardarJsonStorage = window.originalChecklistSave; });
        await page.locator('#checklist-matrix input').first().uncheck();
        await page.locator('#checklist-matrix input').first().check();
        await page.screenshot({ path: path.join(screenshots, 'desktop.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 1000 });
        await page.screenshot({ path: path.join(screenshots, 'mobile.png'), fullPage: true });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'no horizontal page overflow on mobile');
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.emulateMedia({ media: 'print' });
        assert.equal(await page.locator('.print-comment').first().isVisible(), true);
        assert.equal(await firstComment.isVisible(), false);
        await page.emulateMedia({ media: 'screen' });
        console.log('PASS category/shift filters, mobile overflow and print observations');

        await page.locator('#new-action').click();
        await page.locator('#action-task').fill('Reponer insumos');
        await page.locator('#action-responsible').fill('Ana');
        await page.locator('#action-assigned').fill('2026-11-09');
        await page.locator('#action-due').fill('2026-11-08');
        await page.locator('#action-form button[type=submit]').click();
        assert.equal(await page.locator('#action-error').isVisible(), true);
        await page.locator('#action-due').fill('2026-11-10');
        await page.locator('#action-form button[type=submit]').click();
        await page.locator('[data-edit-action]').click();
        await page.locator('#action-status').selectOption('Completado');
        await page.locator('#action-notes').fill('Reposición lista');
        await page.locator('#action-form button[type=submit]').click();
        assert.match(await page.locator('#action-list').innerText(), /Completado/);
        console.log('PASS action creation, date validation and completion');

        await page.locator('#tab-manage').click();
        await page.locator('#new-checklist').click();
        await page.locator('#template-name').fill('Prueba <b>especial</b>');
        await page.locator('#template-shifts').selectOption('2');
        await page.locator('[data-field=categoria]').fill('Apertura');
        await page.locator('[data-field=actividad]').fill('Revisar caja');
        await page.locator('[data-field=frecuencia]').fill('Diario');
        await page.locator('#add-template-task').click();
        await page.locator('[data-field=actividad]').last().fill('Limpiar mostrador');
        await page.locator('[data-move="-1"]').last().click();
        await page.locator('#template-form button[type=submit]').click();
        await page.locator('#tab-manage').click();
        assert.equal(await page.locator('#template-list b').count(), 0);
        state = await page.evaluate(() => JSON.parse(localStorage.getItem('inventario_checklists')));
        const custom = state.templates.find(template => template.nombre.startsWith('Prueba'));
        assert.equal(custom.actividades[0].actividad, 'Limpiar mostrador');
        await page.locator('#tab-week').click();
        await page.locator('#week-template').selectOption(custom.id);
        await page.locator('#open-week').click();
        assert.equal(await page.locator('#checklist-matrix input[type=checkbox]').count(), 2 * 7 * 2);
        await page.locator('#checklist-matrix input').first().check();
        await page.locator('#tab-manage').click();
        await page.locator(`[data-edit-template="${custom.id}"]`).click();
        await page.locator('#template-name').fill('Plantilla modificada');
        await page.locator('[data-remove-task]').last().click();
        await page.locator('#template-form button[type=submit]').click();
        state = await page.evaluate(() => JSON.parse(localStorage.getItem('inventario_checklists')));
        const oldRecord = state.records.find(record => record.template.id === custom.id);
        assert.equal(oldRecord.template.nombre, 'Prueba <b>especial</b>');
        assert.equal(oldRecord.template.actividades.length, 2);
        assert.equal(state.templates.find(template => template.id === custom.id).actividades.length, 1);
        await page.locator(`[data-delete-template="${custom.id}"]`).click();
        await page.locator('.app-dialog-accept').click();
        await page.locator(`[data-delete-template="${custom.id}"]`).waitFor({ state: 'detached' });
        await page.locator('#tab-history').click();
        await page.locator(`[data-record="${oldRecord.id}"]`).click();
        assert.equal(await page.locator('#checklist-matrix input:checked').count(), 1);
        console.log('PASS admin create/edit/reorder/delete and historical snapshot preservation');

        // Exercise actual shared JSON download/upload, including preserved snapshots.
        const beforeBackup = await page.evaluate(() => JSON.parse(localStorage.getItem('inventario_checklists')));
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: '📤 Descargar respaldo', exact: true }).click();
        await page.locator('.app-dialog-input').fill('63717');
        await page.locator('.app-dialog-accept').click();
        const download = await downloadPromise;
        const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
        assert.deepEqual(backup.datos.inventario_checklists, beforeBackup);
        await page.evaluate(() => { const data = JSON.parse(localStorage.getItem('inventario_checklists')); data.records = []; localStorage.setItem('inventario_checklists', JSON.stringify(data)); });
        await page.locator('#nav-backup-file-input').setInputFiles({ name: 'respaldo-prueba.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
        await page.locator('.app-dialog-input').fill('63717');
        await page.locator('.app-dialog-accept').click();
        await page.getByRole('heading', { name: 'Importar respaldo', exact: true }).waitFor();
        await page.locator('.app-dialog-accept').click();
        await page.waitForFunction(count => JSON.parse(localStorage.getItem('inventario_checklists')).records.length === count, beforeBackup.records.length);
        assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('inventario_checklists'))), beforeBackup);
        await page.waitForTimeout(1800);
        console.log('PASS real backup download and restore of templates, weekly marks and action plan');

        // Switch the isolated session to cashier and verify UI and actual data mutation guards.
        await page.evaluate(() => localStorage.setItem('inventario_sesion', JSON.stringify({ cajeroId: 'cashier-1', cajeroNombre: 'Cajera', cajeroCodigo: 'CAJ1', cajeroCargo: 'Cajero', inicio: Date.now() })));
        await page.reload();
        assert.equal(await page.locator('#new-checklist').isVisible(), false);
        assert.equal(await page.locator('#tab-manage').isVisible(), false);
        const forbidden = await page.evaluate(() => { try { ChecklistStore.deleteTemplate(ChecklistStore.listTemplates()[0].id); return false; } catch (error) { return error.message.includes('administrador'); } });
        assert.equal(forbidden, true);
        await page.locator('#week-template').selectOption('diario-2-turnos');
        await page.locator('#open-week').click();
        assert.equal(await page.locator('#checklist-matrix input[type=checkbox]').count(), 48 * 7 * 2);
        await page.locator('#checklist-matrix input').first().check();
        assert.equal(await page.locator('#checklist-matrix input:checked').count(), 1);
        assert.equal(await page.locator('#checklist-matrix input[data-shift="3"]').count(), 0);
        assert.equal(await page.locator('#checklist-matrix input[data-day="0"]').first().isEnabled(), true);
        assert.equal(await page.locator('#checklist-matrix input[data-day="1"]').first().isDisabled(), true);
        assert.equal(await page.locator('#checklist-matrix input[data-day="6"]').first().isDisabled(), true);
        await page.locator('#tab-history').click();
        await page.locator(`[data-record="${weeklyId}"]`).click();
        await firstComment.click();
        assert.equal(await page.locator('#delete-comment').isVisible(), false);
        assert.equal(await page.locator('#comment-text').getAttribute('readonly'), null);
        await page.locator('#comment-text').fill('Nota corregida por cajera');
        await page.locator('#save-comment').click();
        await firstComment.click();
        await page.locator('#comment-history-title').click();
        assert.match(await page.locator('#comment-history-list').innerText(), /Revisar insumos <b>sin HTML<\/b>/);
        assert.match(await page.locator('#comment-history-list').innerText(), /Administrador/);
        assert.match(await page.locator('#comment-history-list').innerText(), /Cajera/);
        await page.locator('#comment-text').fill('   ');
        await page.locator('#save-comment').click();
        assert.match(await page.locator('#comment-error').innerText(), /administrador.*eliminar/i);
        assert.equal(await firstComment.getAttribute('title'), 'Nota corregida por cajera');
        await page.locator('#comment-dialog [data-close]').first().click();
        const guards = await page.evaluate(id => {
            const checks = [
                () => ChecklistStore.setComment(id, 'semanal-6', 0, 1, ''),
                () => ChecklistStore.setComment(id, 'semanal-6', 1, 1, 'Fecha futura'),
                () => ChecklistStore.markTask(id, 'semanal-6', 1, 1, true),
                () => ChecklistStore.setObservation(id, 'semanal-6', '')
            ];
            return checks.map(change => { try { change(); return false; } catch (_) { return true; } });
        }, weeklyId);
        assert.deepEqual(guards, [true, true, true, true]);
        await otherComment.click();
        assert.equal(await page.locator('#comment-text').getAttribute('readonly'), '');
        assert.equal(await page.locator('#save-comment').isVisible(), false);
        assert.equal(await page.locator('#delete-comment').isVisible(), false);
        await page.locator('#comment-dialog [data-close]').first().click();
        await firstComment.click();
        await page.locator('#comment-text').fill('Borrador antes de medianoche');
        await page.evaluate(() => {
            window.checklistTestNow = new Date('2026-11-10T08:01:00Z').getTime();
            window.dispatchEvent(new Event('focus'));
        });
        assert.equal(await page.locator('#comment-text').getAttribute('readonly'), '');
        assert.equal(await page.locator('#save-comment').isVisible(), false);
        await page.locator('#comment-dialog [data-close]').first().click();
        assert.equal(await page.locator('#checklist-matrix input[data-day="0"]').first().isDisabled(), true);
        assert.equal(await page.locator('#checklist-matrix input[data-day="1"]').first().isEnabled(), true);
        assert.equal(await page.evaluate(id => {
            try { ChecklistStore.setComment(id, 'semanal-6', 0, 1, 'No permitido'); return false; }
            catch (_) { return true; }
        }, weeklyId), true);
        console.log('PASS cashier cannot delete notes or modify other dates; original note history and midnight lock verified');

        await page.evaluate(() => {
            window.checklistTestNow = new Date('2026-11-10T07:30:00Z').getTime();
            localStorage.setItem('inventario_sesion', JSON.stringify({ cajeroId: 'admin-1', cajeroNombre: 'Administrador', cajeroCodigo: 'ADMIN', cajeroCargo: 'Corporativo', inicio: Date.now() }));
        });
        await page.reload();
        await page.locator('#tab-history').click();
        await page.locator(`[data-record="${weeklyId}"]`).click();
        assert.equal(await page.locator('#checklist-matrix input[data-day="6"]').first().isEnabled(), true);
        await firstComment.click();
        assert.equal(await page.locator('#delete-comment').isVisible(), true);
        await page.locator('#delete-comment').click();
        await firstComment.click();
        assert.equal(await page.locator('#comment-text').inputValue(), '');
        await page.locator('#comment-history-title').click();
        assert.match(await page.locator('#comment-history-list').innerText(), /Revisar insumos/);
        assert.match(await page.locator('#comment-history-list').innerText(), /Nota corregida por cajera/);
        assert.match(await page.locator('#comment-history-list').innerText(), /Eliminada por Administrador/);
        await page.screenshot({ path: path.join(screenshots, 'note-history.png') });
        const exportedHistory = await page.evaluate(id => obtenerDatosRespaldoSistema().inventario_checklists.records.find(record => record.id === id).noteHistory['semanal-6|0|1'], weeklyId);
        assert.equal(exportedHistory[0].text, 'Revisar insumos <b>sin HTML</b>');
        assert.equal(exportedHistory.at(-1).change, 'delete');
        await page.locator('#comment-dialog [data-close]').first().click();
        console.log('PASS administrator can correct other dates and delete notes; preserved note versions included in backup');
        assert.deepEqual(errors, []);
        console.log('PASS cashier permissions, two-shift daily checklist and no uncaught browser errors');
        console.log(`Screenshots: ${screenshots}`);
    } catch (error) {
        if (page) await page.screenshot({ path: path.join(screenshots, 'failure.png'), fullPage: true }).catch(() => {});
        throw error;
    } finally {
        await browser.close();
        server.close();
    }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
