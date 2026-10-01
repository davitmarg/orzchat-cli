import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { checkForUpdate, isNewerVersion } from '../dist/update.js';
import { safeText } from '../dist/terminal.js';
import { readFileSync } from 'node:fs';

test('version comes from package metadata; help and invalid options work without a terminal', () => {
    const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version;
    const run = (...args) => spawnSync(process.execPath, ['dist/index.js', ...args], { encoding: 'utf8' });
    assert.equal(run('--version').stdout.trim(), version);
    assert.match(run('--help').stdout, /--no-update-check/);
    assert.match(run('--server', 'https://example.com').stderr, /ws:\/\//);
    assert.equal(run('--no-update-check').status, 1);
    assert.match(run('--no-update-check').stderr, /interactive terminal/);
});
test('update comparison uses numeric components and rejects invalid/untrusted versions', () => {
    assert.equal(isNewerVersion('0.10.0', '0.2.0'), true);
    assert.equal(isNewerVersion('1.0.0', '0.99.99'), true);
    for (const value of ['0.2.0', '0.1.9', '0.3.0-beta.1', '0.3.0\n', 'garbage']) {
        assert.equal(isNewerVersion(value, '0.2.0'), false);
    }
});
test('update checks show actionable notice and tolerate registry failures', async () => {
    assert.match(await checkForUpdate('0.2.0', async () => new Response('{"version":"0.3.0"}')), /npm install -g orzchat-cli@latest/);
    for (const body of ['{}', 'null', 'invalid', '{"version":"0.1.0"}']) {
        assert.equal(await checkForUpdate('0.2.0', async () => new Response(body)), null);
    }
    assert.equal(await checkForUpdate('0.2.0', async () => { throw Error('offline'); }), null);
    assert.equal(await checkForUpdate('0.2.0', async () => new Response('', {status: 503})), null);
});
test('remote content cannot inject terminal controls; Unicode remains intact', () => {
    assert.equal(safeText('\x1b[2Jhello\x1b]0;bad title\x07\r\nworld'), 'hello  world');
    assert.equal(safeText('Hi 👩🏽‍💻 你好 café'), 'Hi 👩🏽‍💻 你好 café');
});
