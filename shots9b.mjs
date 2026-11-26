// V9 screenshot driver (not shipped): drives the ORIGINAL game in headless
// Chromium over CDP with real mouse clicks and real key events — the same
// input path a human player uses. No hooks inside the game.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PAGE = 'http://127.0.0.1:8087/index.html';
const OUT = new URL('./screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const chrome = spawn(process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome', [
  '--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--window-size=1280,1150', '--remote-debugging-port=9227',
  '--user-data-dir=/tmp/ap9-profile', 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise(res => pending.set(id, res));
}
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  return r.result && r.result.result ? r.result.result.value : undefined;
}
async function click(sel, idx = 0) {
  await ev(`(()=>{const el=document.querySelectorAll('${sel}')[${idx}];if(el)el.scrollIntoView({block:'center'});})()`);
  await sleep(200);
  const rect = await ev(`(()=>{const el=document.querySelectorAll('${sel}')[${idx}];if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  if (!rect) throw new Error('no element ' + sel);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
  await sleep(250);
}
async function key(code, down) {
  await send('Input.dispatchKeyEvent', { type: down ? 'keyDown' : 'keyUp', code, key: code, windowsVirtualKeyCode: 0 });
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
  writeFileSync(OUT + name, Buffer.from(r.result.data, 'base64'));
  console.log('shot', name);
}
const hud = async () => ({
  ias: parseFloat(await ev(`document.getElementById('hud-ias')?.textContent`)) || 0,
  alt: parseFloat(await ev(`document.getElementById('hud-alt')?.textContent`)) || 0
});
async function nav() { await send('Page.navigate', { url: PAGE }); await sleep(3800); }

try {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9227/json/list')).json();
      const page = list.find(t => t.type === 'page');
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
    } catch {}
    await sleep(500);
  }
  await new Promise(res => ws.addEventListener('open', res, { once: true }));
  ws.addEventListener('message', m => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  });
  await send('Page.enable');
  await send('Runtime.enable');

  await nav();
  await click('.craft-btn', 1);
  await click('#btn-launch');
  await sleep(600);
  await key('KeyW', true);
  let h = await hud();
  for (let i = 0; i < 900 && h.ias <= 100; i++) { await sleep(400); h = await hud(); }
  console.log('rotate at ias', h.ias);
  await key('ArrowDown', true); await sleep(2500); await key('ArrowDown', false);
  for (let i = 0; i < 200 && h.alt <= 90; i++) { await sleep(400); h = await hud(); }
  console.log('capture at alt', h.alt, 'ias', h.ias);
  await shot('2-takeoff.jpg');
  await key('KeyW', false);
  console.log('SHOT2 DONE');
} finally {
  chrome.kill('SIGKILL');
}
