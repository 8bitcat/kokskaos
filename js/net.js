// Kökskaos — networking over PeerJS (WebRTC data channels). One player hosts the physics; up to 8 friends join
// with a 4-letter kitchen code. JSON strings for events, compact binary for input + world snapshots.
import { PEER_PREFIX, MAX_PLAYERS } from './config.js';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const makeCode = () => Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');

// ---- binary: client input (type 1)
export function encodeInput(i) {
  const b = new ArrayBuffer(34), d = new DataView(b);
  d.setUint8(0, 1); d.setUint8(1, (i.gripL ? 1 : 0) | (i.gripR ? 2 : 0) | (i.crouch ? 4 : 0) | (i.air ? 8 : 0));
  [i.x, i.y, i.z, i.yaw, i.pitch, i.reachOff, i.wristP, i.wristR].forEach((v, k) => d.setFloat32(2 + k * 4, v, true));
  return b;
}
export function decodeInput(b) {
  const d = new DataView(b), f = d.getUint8(1), g = (k) => d.getFloat32(2 + k * 4, true);
  return { gripL: !!(f & 1), gripR: !!(f & 2), crouch: !!(f & 4), air: !!(f & 8), x: g(0), y: g(1), z: g(2), yaw: g(3), pitch: g(4), reachOff: g(5), wristP: g(6), wristR: g(7) };
}
// ---- binary: world snapshot (type 2). positions in mm (int16), quats int16
export function encodeSnapshot(tick, players, waiters, bodies) {
  let size = 1 + 4 + 1 + 1 + 2; for (const p of players) size += 22 + (p.holdL ? 6 : 0) + (p.holdR ? 6 : 0);
  size += waiters.length * 8 + bodies.length * 16;
  const b = new ArrayBuffer(size), d = new DataView(b); let o = 0;
  d.setUint8(o, 2); o += 1; d.setUint32(o, tick, true); o += 4; d.setUint8(o, players.length); o += 1;
  for (const p of players) {
    d.setUint8(o, p.id); d.setUint8(o + 1, p.flags | (p.holdL ? 16 : 0) | (p.holdR ? 32 : 0)); o += 2;
    d.setFloat32(o, p.x, true); d.setFloat32(o + 4, p.y, true); d.setFloat32(o + 8, p.z, true); d.setFloat32(o + 12, p.yaw, true); d.setFloat32(o + 16, p.pitch, true); o += 20;
    for (const h of [p.holdL, p.holdR]) if (h) { d.setInt16(o, h.x * 1000, true); d.setInt16(o + 2, h.y * 1000, true); d.setInt16(o + 4, h.z * 1000, true); o += 6; }
  }
  d.setUint8(o, waiters.length); o += 1;
  for (const w of waiters) { d.setUint8(o, w.id); d.setUint8(o + 1, w.flags); d.setInt16(o + 2, w.x * 1000, true); d.setInt16(o + 4, w.z * 1000, true); d.setInt16(o + 6, w.yaw * 5000, true); o += 8; }
  d.setUint16(o, bodies.length, true); o += 2;
  for (const e of bodies) {
    d.setUint16(o, e.id, true); d.setInt16(o + 2, e.pos.x * 1000, true); d.setInt16(o + 4, e.pos.y * 1000, true); d.setInt16(o + 6, e.pos.z * 1000, true);
    d.setInt16(o + 8, e.rot.x * 32767, true); d.setInt16(o + 10, e.rot.y * 32767, true); d.setInt16(o + 12, e.rot.z * 32767, true); d.setInt16(o + 14, e.rot.w * 32767, true); o += 16;
  }
  return b;
}
export function decodeSnapshot(b, h) {
  const d = new DataView(b); let o = 1; const tick = d.getUint32(o, true); o += 4; const np = d.getUint8(o); o += 1;
  for (let i = 0; i < np; i++) {
    const id = d.getUint8(o), fl = d.getUint8(o + 1); o += 2;
    const x = d.getFloat32(o, true), y = d.getFloat32(o + 4, true), z = d.getFloat32(o + 8, true), yaw = d.getFloat32(o + 12, true), pitch = d.getFloat32(o + 16, true); o += 20;
    let hl = null, hr = null;
    if (fl & 16) { hl = [d.getInt16(o, true) / 1000, d.getInt16(o + 2, true) / 1000, d.getInt16(o + 4, true) / 1000]; o += 6; }
    if (fl & 32) { hr = [d.getInt16(o, true) / 1000, d.getInt16(o + 2, true) / 1000, d.getInt16(o + 4, true) / 1000]; o += 6; }
    h.player(id, fl, x, y, z, yaw, pitch, hl, hr);
  }
  const nw = d.getUint8(o); o += 1;
  for (let i = 0; i < nw; i++) { h.waiter(d.getUint8(o), d.getInt16(o + 2, true) / 1000, d.getInt16(o + 4, true) / 1000, d.getInt16(o + 6, true) / 5000, d.getUint8(o + 1)); o += 8; }
  const nb = d.getUint16(o, true); o += 2;
  for (let i = 0; i < nb; i++) {
    h.body(d.getUint16(o, true), d.getInt16(o + 2, true) / 1000, d.getInt16(o + 4, true) / 1000, d.getInt16(o + 6, true) / 1000,
      d.getInt16(o + 8, true) / 32767, d.getInt16(o + 10, true) / 32767, d.getInt16(o + 12, true) / 32767, d.getInt16(o + 14, true) / 32767); o += 16;
  }
  return tick;
}

export class Net {
  constructor() { this.peer = null; this.conns = new Map(); this.hostConn = null; this.isHost = false; this.code = ''; this.online = false; this.nextPid = 1; this.handlers = {}; }
  on(name, fn) { this.handlers[name] = fn; }
  emit(name, ...a) { this.handlers[name]?.(...a); }

  host(code) {
    this.isHost = true; this.code = code;
    return new Promise((resolve) => {
      if (!window.Peer) return resolve(false);
      let done = false; const finish = (ok) => { if (!done) { done = true; this.online = ok; resolve(ok); } };
      try { this.peer = new window.Peer(PEER_PREFIX + code, { debug: 1 }); } catch (e) { return finish(false); }
      this.peer.on('open', () => finish(true));
      this.peer.on('error', (e) => { console.warn('peer error', e.type); if (e.type === 'unavailable-id') this.emit('codeTaken'); finish(false); });
      this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch (e) { /* ignore */ } });
      this.peer.on('connection', (conn) => {
        conn.on('open', () => {
          if (this.conns.size >= MAX_PLAYERS - 1) { conn.send(JSON.stringify({ t: 'full' })); setTimeout(() => conn.close(), 300); return; }
          const pid = this.nextPid++; conn.pid = pid; this.conns.set(pid, conn);
          conn.on('data', (data) => { if (typeof data === 'string') { let m; try { m = JSON.parse(data); } catch (e) { return; } this.emit('msg', pid, m); } else this.emit('bin', pid, data.buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data); });
          conn.on('close', () => { if (this.conns.delete(pid)) this.emit('leave', pid); });
          conn.on('error', () => { if (this.conns.delete(pid)) this.emit('leave', pid); });
        });
      });
      setTimeout(() => finish(false), 9000);
    });
  }
  join(code) {
    this.isHost = false; this.code = code;
    return new Promise((resolve, reject) => {
      if (!window.Peer) return reject(new Error('nopeer'));
      this.peer = new window.Peer(undefined, { debug: 1 });
      const fail = (e) => reject(e instanceof Error ? e : new Error(String(e && e.type || e)));
      this.peer.on('error', fail);
      this.peer.on('open', () => {
        const conn = this.hostConn = this.peer.connect(PEER_PREFIX + code, { reliable: true, serialization: 'raw' });
        conn.on('open', () => { this.online = true; resolve(true); });
        conn.on('data', (data) => { if (typeof data === 'string') { let m; try { m = JSON.parse(data); } catch (e) { return; } this.emit('msg', 0, m); } else this.emit('bin', 0, data.buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data); });
        conn.on('close', () => { this.online = false; this.emit('closed'); });
        conn.on('error', fail);
      });
      setTimeout(() => fail('timeout'), 15000);
    });
  }
  // host -> one / all
  sendTo(pid, m) { const c = this.conns.get(pid); if (c && c.open) c.send(typeof m === 'string' || m instanceof ArrayBuffer ? m : JSON.stringify(m)); }
  broadcast(m, ready) { const data = typeof m === 'string' || m instanceof ArrayBuffer ? m : JSON.stringify(m); for (const [pid, c] of this.conns) if (c.open && (!ready || ready.has(pid))) { try { c.send(data); } catch (e) { /* dropped */ } } }
  // client -> host
  send(m) { const c = this.hostConn; if (c && c.open) { try { c.send(m instanceof ArrayBuffer ? m : JSON.stringify(m)); } catch (e) { /* dropped */ } } }
  close() { try { this.peer?.destroy(); } catch (e) { /* ignore */ } }
}
