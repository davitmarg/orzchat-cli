import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocketServer } from 'ws';
import { connect, disconnect, getStatus, sendMessage, setMessageHandler, ConnectionStatus } from '../dist/connection.js';

const waitFor = async (fn) => {
    const end = Date.now() + 2000;
    while (!fn()) {
        if (Date.now() > end) throw Error('Timed out');
        await new Promise(r => setTimeout(r, 10));
    }
};
test('connection validates events, exchanges messages, survives socket replacement and reports disconnects', async () => {
    const server = new WebSocketServer({ port: 0 });
    await once(server, 'listening');
    const events = [];
    setMessageHandler(event => events.push(event));
    const url = `ws://127.0.0.1:${server.address().port}`;
    try {
        const connection = once(server, 'connection');
        connect('test-room', url);
        const [peer] = await connection;
        const [join] = await once(peer, 'message');
        assert.deepEqual(JSON.parse(join), { type: 'join', room_id: 'test-room' });
        for (const raw of ['invalid', 'null', '[]', '{"type":"message","text":4}']) peer.send(raw);
        peer.send(JSON.stringify({ type: 'matched' }));
        await waitFor(() => getStatus() === ConnectionStatus.CONNECTED);
        assert.deepEqual(events, [{ type: 'matched' }]);
        const received = once(peer, 'message');
        assert.equal(sendMessage({ type: 'message', text: 'hello' }), true);
        assert.equal(JSON.parse((await received)[0]).text, 'hello');
        const replacement = once(server, 'connection');
        connect('second-room', url);
        const [second] = await replacement;
        await once(second, 'message');
        second.send('{"type":"matched"}');
        await waitFor(() => getStatus() === ConnectionStatus.CONNECTED);
        await new Promise(r => setTimeout(r, 30));
        assert.equal(getStatus(), ConnectionStatus.CONNECTED);
        assert.equal(events.some(e => e.type === 'connection_closed'), false);
        second.close();
        await waitFor(() => events.some(e => e.type === 'connection_closed'));
        assert.equal(getStatus(), ConnectionStatus.DISCONNECTED);
        assert.equal(sendMessage({ type: 'message', text: 'lost' }), false);
    } finally {
        disconnect();
        setMessageHandler(null);
        for (const peer of server.clients) peer.terminate();
        await new Promise(r => server.close(r));
    }
});
