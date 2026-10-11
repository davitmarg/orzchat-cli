"""Optional macOS/Linux terminal integration check: python3 test/pty-smoke.py."""
import fcntl
import json
import os
import pty
import select
import struct
import subprocess
import termios
import time

server = subprocess.Popen(['node', '--input-type=module', '-e', '''
import { WebSocketServer } from 'ws';
const s = new WebSocketServer({ port: 0 });
s.on('listening', () => console.log(s.address().port));
s.on('connection', ws => ws.on('message', raw => {
 const m = JSON.parse(raw);
 if (m.type === 'join') {
  ws.send('{"type":"matched"}');
  setTimeout(() => { if (ws.readyState === 1) ws.send(JSON.stringify({type:'message', text:'incoming while editing 👋'})); }, 300);
 } else {
  console.log(JSON.stringify(m));
  if (m.text === 'drop') ws.close();
  else if (m.text === 'leave') { ws.send('{"type":"partner_disconnected"}'); ws.close(); }
 }
}));
'''], stdout=subprocess.PIPE, text=True)
port = server.stdout.readline().strip()
master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 24, 0, 0))
child = subprocess.Popen(['node', 'dist/index.js', '--no-update-check', '--server', f'ws://127.0.0.1:{port}'], stdin=slave, stdout=slave, stderr=slave, env={**os.environ, 'TERM': 'xterm-256color'})
os.close(slave)
transcript = bytearray()
def read_for(seconds):
    until = time.monotonic() + seconds
    while time.monotonic() < until:
        if select.select([master], [], [], min(.05, max(0, until-time.monotonic())))[0]:
            try: transcript.extend(os.read(master, 65536))
            except OSError: return

def send(text): os.write(master, text.encode())
try:
    for _ in range(30):
        read_for(.1)
        if b'Connected to a chat partner!' in transcript: break
    assert b'Connected to a chat partner!' in transcript
    draft = 'long draft with unicode 你好 and emoji 👋'
    send(draft + '\x1b[D')
    read_for(.5)
    send('!\r')
    read_for(.15)
    message = json.loads(server.stdout.readline())
    assert message['text'] == draft[:-1] + '!' + draft[-1:], message
    send('/help\r')
    read_for(.1)
    send('/next\r')
    read_for(.2)
    send('drop\r')
    assert json.loads(server.stdout.readline())['text'] == 'drop'
    read_for(5.5)
    assert b'Retrying in 5 seconds' in transcript
    assert transcript.count(b'Connected to a chat partner!') >= 3
    send('leave\r')
    assert json.loads(server.stdout.readline())['text'] == 'leave'
    read_for(.2)
    assert b'Partner disconnected. Press Enter' in transcript
    send('\r')
    read_for(.2)
    send('\x03')
    read_for(.2)
    assert child.wait(timeout=2) == 0
    assert transcript.count(b'Goodbye!') == 1
    assert b'\x1b[1A' in transcript or b'\x1b[2A' in transcript
    print('PASS: narrow terminal, Unicode draft, arrow editing, incoming message, /help, /next, automatic reconnect, partner departure, Ctrl+C')
except Exception:
    print('TRANSCRIPT AT FAILURE:\n' + transcript.decode('utf-8', 'replace'))
    raise
finally:
    if child.poll() is None: child.kill()
    server.terminate()
    server.wait(timeout=2)
    os.close(master)
