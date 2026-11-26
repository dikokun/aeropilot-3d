// V10 smoke test (not shipped): page loads clean, menu renders, a real
// click on a craft card + LAUNCH starts the flight. CDP, real input path.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const chrome = spawn(process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome', [
  '--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--window-size=1280,1150', '--remote-debugging-port=9231',
  '--user-data-dir=/tmp/ap10-profile', 'about:blank'
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets = null;
for (let i = 0; i < 20 && !targets; i++) {
  try { targets = await (await fetch('http://127.0.0.1:9231/json')).json(); } catch { await sleep(1000); }
}
if (!targets) { console.log('CHROME DID NOT START'); process.exit(1); }
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let msgId = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.text + ' ' + (d.params.exceptionDetails.exception?.description || ''));
});
function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise(res => pending.set(id, res));
}
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.result?.exceptionDetails) errors.push(r.result.exceptionDetails.exception?.description || 'eval error');
  return r.result?.result?.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('/tmp/' + name, Buffer.from(r.result.data, 'base64'));
}
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:8087/index.html' });
await sleep(6000);
console.log('debug hook:', await ev('typeof window.__GAME_DEBUG__'));
console.log('craft buttons:', await ev('document.querySelectorAll(".craft-btn").length'));
console.log('menu visible:', await ev('!document.getElementById("menu-screen").classList.contains("hidden")'));
await shot('v10-menu.png');
// real click on KOMET card, then LAUNCH
await ev(`document.querySelectorAll('.craft-btn')[1].scrollIntoView({block:'center'})`);
await sleep(400);
const box = await ev(`(()=>{const r=document.querySelectorAll('.craft-btn')[1].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
await sleep(300);
console.log('komet selected:', await ev('document.querySelectorAll(".craft-btn")[1].classList.contains("selected")'));
const lb = await ev(`(()=>{const r=document.getElementById('btn-launch').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: lb.x, y: lb.y, button: 'left', clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: lb.x, y: lb.y, button: 'left', clickCount: 1 });
await sleep(3000);
console.log('state after launch:', JSON.stringify(await ev('window.__GAME_DEBUG__.getState()')));
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
chrome.kill();
process.exit(0);
