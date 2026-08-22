'use strict';

const API = 'https://gamma-market-api.gammasg.workers.dev';
const ESTADOS_ORDER = ['preparacion', 'enviado', 'recibido'];
const ESTADO_LABEL = { preparacion: 'En preparación', enviado: 'Enviado', recibido: 'Recibido' };
let authToken = localStorage.getItem('gm_token') || '';
let currentUser = null;

const PROVINCIAS = ['Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona Santiago','Napo','Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos','Tungurahua','Zamora Chinchipe'];

let PRODUCTS = [];
let query = '';
const cart = []; // { id, variant, qty }
let step = 1;                 // paso del modal de compra (1 pedido, 2 envío)
const ADDR_KEY = 'gm_addr';   // dirección guardada en el dispositivo (sin cuenta)

const getSavedAddr = () => { try { return JSON.parse(localStorage.getItem(ADDR_KEY) || 'null'); } catch (e) { return null; } };
const saveAddr = (a) => localStorage.setItem(ADDR_KEY, JSON.stringify(a));

const $ = (s) => document.querySelector(s);
const money = (n) => '$' + Number(n).toFixed(2);

// ---- helpers DOM (sin innerHTML) ----
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'text') n.textContent = attrs[k];
    else n.setAttribute(k, attrs[k]);
  }
  for (const kid of kids) { if (kid == null) continue; n.append(kid.nodeType ? kid : document.createTextNode(kid)); }
  return n;
}
const SVGNS = 'http://www.w3.org/2000/svg';
function svg(paths) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  for (const d of paths) { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); s.append(p); }
  return s;
}
const ICON = {
  plus: () => svg(['M12 5v14M5 12h14']),
  minus: () => svg(['M5 12h14']),
  trash: () => svg(['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6']),
};
const byId = (id) => PRODUCTS.find((p) => p.id === id);

// ---- Grid ----
function renderGrid() {
  const grid = $('#grid');
  grid.replaceChildren();
  const list = query ? PRODUCTS.filter((p) => p.name.toLowerCase().includes(query)) : PRODUCTS;
  list.forEach((p) => {
    const body = el('div', { class: 'card-body' },
      el('div', { class: 'card-name', text: p.name }),
      el('div', { class: 'card-price' }, money(p.price), ' ', el('small', { text: 'USD' })),
    );
    let sel = null;
    if (p.variants && p.variants.length) {
      sel = el('select', { 'aria-label': 'Opción' });
      sel.append(el('option', { value: '', disabled: '', selected: '', text: 'Elige una opción' }));
      p.variants.forEach((v) => sel.append(el('option', { value: v, text: v })));
      body.append(el('label', { class: 'size-field' }, 'Opción', sel));
    }
    const btn = el('button', { class: 'add-btn', type: 'button' });
    btn.append(ICON.plus(), 'Agregar');
    btn.addEventListener('click', () => {
      if (p.variants && p.variants.length && !sel.value) { sel.focus(); sel.style.borderColor = '#ef4444'; return; }
      addToCart(p.id, (p.variants && p.variants.length) ? sel.value : null);
      if (sel) { sel.value = ''; sel.style.borderColor = ''; }
    });
    body.append(btn);

    const imgWrap = el('div', { class: 'card-img' });
    if (p.img) imgWrap.append(el('img', { src: p.img, alt: p.name, loading: 'lazy' }));
    grid.append(el('div', { class: 'card' }, imgWrap, body));
  });
  $('#prodCount').textContent = list.length + ' de ' + PRODUCTS.length + ' productos';
}

// ---- Carrito ----
function addToCart(id, variant) {
  const line = cart.find((c) => c.id === id && c.variant === variant);
  if (line) line.qty++; else cart.push({ id, variant, qty: 1 });
  renderCart(); openCart();
}
function renderCart() {
  const box = $('#cartItems'); box.replaceChildren();
  const count = cart.reduce((a, c) => a + c.qty, 0);
  const cc = $('#cartCount'); cc.textContent = String(count); cc.hidden = count === 0;
  $('#cartEmpty').hidden = cart.length > 0;

  let total = 0;
  cart.forEach((c, i) => {
    const p = byId(c.id); if (!p) return;
    total += p.price * c.qty;
    const info = el('div', { class: 'ci-info' },
      el('div', { class: 'ci-name', text: p.name }),
      c.variant ? el('div', { class: 'ci-meta', text: c.variant }) : null,
      el('div', { class: 'ci-price', text: money(p.price * c.qty) }),
    );
    const drop = () => { renderCart(); if (!cart.length && step === 2) goStep(1); };
    const minus = el('button', { type: 'button', 'aria-label': 'Restar' }); minus.append(ICON.minus());
    minus.addEventListener('click', () => { c.qty--; if (c.qty <= 0) cart.splice(i, 1); drop(); });
    const plus = el('button', { type: 'button', 'aria-label': 'Sumar' }); plus.append(ICON.plus());
    plus.addEventListener('click', () => { c.qty++; renderCart(); });
    const rm = el('button', { class: 'ci-remove', type: 'button', 'aria-label': 'Quitar' }); rm.append(ICON.trash());
    rm.addEventListener('click', () => { cart.splice(i, 1); drop(); });
    const ciImg = el('div', { class: 'ci-img' });
    if (p.img) ciImg.append(el('img', { src: p.img, alt: p.name }));
    box.append(el('div', { class: 'ci' }, ciImg, info, el('div', { class: 'qty' }, minus, el('span', { text: String(c.qty) }), plus), rm));
  });
  $('#cartTotal').textContent = money(total);
  if (step === 1) $('#primaryBtn').disabled = cart.length === 0;
}

// ---- Modal de compra: pasos ----
function openCart() {
  $('#orderOk').hidden = true;
  $('#cmFoot').hidden = false;
  renderCart();
  goStep(1);
  $('#cartModal').hidden = false; $('#overlay').hidden = false; document.body.style.overflow = 'hidden';
}
function closeCart() { $('#cartModal').hidden = true; $('#overlay').hidden = true; document.body.style.overflow = ''; }

function goStep(n) {
  step = n;
  $('#step1').hidden = n !== 1;
  $('#step2').hidden = n !== 2;
  document.querySelectorAll('.cm-step').forEach((s) => s.classList.toggle('is-active', Number(s.dataset.step) === n));
  document.querySelector('.cm-step[data-step="1"]').classList.toggle('is-done', n > 1);
  $('#backStep').hidden = n === 1;
  $('#checkoutError').hidden = true;
  const primary = $('#primaryBtn');
  if (n === 1) {
    primary.textContent = 'Continuar';
    primary.disabled = cart.length === 0;
  } else {
    primary.textContent = 'Confirmar pedido';
    primary.disabled = false;
    showStep2();
  }
}

// paso 2: dirección guardada en el dispositivo → card; si no hay → formulario
function showStep2() {
  const saved = getSavedAddr();
  const hasSaved = !!(saved && saved.direccion);
  $('#savedAddr').hidden = !hasSaved;
  $('#checkout').hidden = hasSaved;
  if (hasSaved) {
    document.querySelector('.sa-name').textContent = saved.nombre || '';
    document.querySelector('.sa-line').textContent = [saved.direccion, saved.referencia, saved.ciudad, saved.provincia].filter(Boolean).join(', ');
    document.querySelector('.sa-phone').textContent = saved.telefono ? 'Tel: ' + saved.telefono : '';
  } else {
    prefillCheckout();
  }
  $('#ctaAccount').hidden = !!currentUser; // si ya tiene cuenta, no ofrezco crearla
}
function useNewAddr() {
  $('#savedAddr').hidden = true;
  $('#checkout').hidden = false;
  $('#checkout').reset();
}
function primaryAction() {
  if (step === 1) { if (cart.length) goStep(2); }
  else confirmOrder();
}

// ---------- Mis pedidos (tracking) ----------
async function openMyOrders() {
  $('#ordersModal').hidden = false; $('#ordersOverlay').hidden = false; document.body.style.overflow = 'hidden';
  const list = $('#ordersList'); list.replaceChildren(el('p', { class: 'orders-loading', text: 'Cargando…' }));
  try {
    const r = await fetch(API + '/my-orders', { headers: { Authorization: 'Bearer ' + authToken } });
    if (!r.ok) throw new Error();
    const { orders } = await r.json();
    renderOrders(orders || []);
  } catch (e) {
    list.replaceChildren(el('p', { class: 'orders-loading', text: 'No se pudieron cargar tus pedidos.' }));
  }
}
function closeMyOrders() { $('#ordersModal').hidden = true; $('#ordersOverlay').hidden = true; document.body.style.overflow = ''; }

function renderOrders(orders) {
  const list = $('#ordersList'); list.replaceChildren();
  if (!orders.length) { list.append(el('p', { class: 'orders-loading', text: 'Todavía no hiciste ningún pedido.' })); return; }
  orders.forEach((o) => {
    let items = [];
    try { items = JSON.parse(o.items); } catch (e) { /* items corruptos: se ignora */ }
    const est = ESTADOS_ORDER.includes(o.estado) ? o.estado : 'preparacion';
    const stepIdx = ESTADOS_ORDER.indexOf(est);

    const prods = el('div', { class: 'order-items' });
    items.forEach((it) => prods.append(el('div', { class: 'order-item', text: it.name + (it.variant ? ' (' + it.variant + ')' : '') + ' ×' + it.qty })));

    const track = el('div', { class: 'track' });
    ESTADOS_ORDER.forEach((s, i) => {
      track.append(el('div', { class: 'track-step' + (i <= stepIdx ? ' is-done' : '') },
        el('span', { class: 'track-dot' }),
        el('span', { class: 'track-label', text: ESTADO_LABEL[s] }),
      ));
    });

    list.append(el('div', { class: 'order-card' },
      el('div', { class: 'order-top' },
        el('strong', { text: 'Pedido #' + o.id }),
        el('span', { class: 'order-total', text: money(o.total) }),
      ),
      prods,
      track,
    ));
  });
}

function fillProvincias() {
  const sel = document.querySelector('#checkout select[name="provincia"]');
  sel.append(el('option', { value: '', disabled: '', selected: '', text: 'Elige tu provincia' }));
  PROVINCIAS.forEach((pr) => sel.append(el('option', { value: pr, text: pr })));
}

async function confirmOrder() {
  const err = $('#checkoutError'); err.hidden = true;
  // datos de envío: de la card guardada (si está visible) o del formulario
  let shipping;
  if ($('#savedAddr').hidden === false) {
    shipping = getSavedAddr();
  } else {
    const form = $('#checkout');
    if (!form.reportValidity()) return;
    const f = new FormData(form);
    shipping = {
      nombre: (f.get('nombre') || '').trim(), telefono: (f.get('telefono') || '').trim(),
      provincia: f.get('provincia') || '', ciudad: (f.get('ciudad') || '').trim(),
      direccion: (f.get('direccion') || '').trim(), referencia: (f.get('referencia') || '').trim(),
    };
  }
  if (!shipping || !shipping.nombre || !shipping.telefono || !shipping.direccion) {
    err.textContent = 'Completá tus datos de envío.'; err.hidden = false; return;
  }

  let total = 0; const items = [];
  cart.forEach((c) => {
    const p = byId(c.id); if (!p) return;
    total += p.price * c.qty;
    items.push({ name: p.name, variant: c.variant || null, qty: c.qty, price: p.price });
  });
  if (!items.length) return;

  const btn = $('#primaryBtn'); btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers.Authorization = 'Bearer ' + authToken;
    const r = await fetch(API + '/order', { method: 'POST', headers, body: JSON.stringify({ items, total, ...shipping }) });
    if (!r.ok) throw new Error('order ' + r.status);
    saveAddr(shipping); // queda predeterminada para el próximo envío
    cart.length = 0; renderCart();
    showOrderOk();
  } catch (e) {
    console.error('no se guardó el pedido', e);
    err.textContent = 'No se pudo enviar el pedido. Revisá tu conexión y reintentá.';
    err.hidden = false;
    btn.disabled = false; btn.textContent = 'Confirmar pedido';
  }
}

function showOrderOk() {
  $('#step1').hidden = true;
  $('#step2').hidden = true;
  $('#cmFoot').hidden = true;
  document.querySelectorAll('.cm-step').forEach((s) => s.classList.remove('is-active'));
  $('#okMyOrders').hidden = !currentUser; // sin cuenta no hay tracking online
  $('#orderOk').hidden = false;
}

// ---------- Cuenta / auth ----------
function updateAuthUI() {
  const name = $('#accountName');
  name.textContent = currentUser ? (currentUser.nombre || 'Mi cuenta').split(' ')[0] : 'Ingresar';
}
function prefillCheckout() {
  const form = $('#checkout'); if (!form) return;
  const src = getSavedAddr() || currentUser;
  if (!src) return;
  const set = (n, v) => { const elx = form.querySelector('[name="' + n + '"]'); if (elx && v && !elx.value) elx.value = v; };
  set('nombre', src.nombre); set('telefono', src.telefono);
  set('provincia', src.provincia); set('ciudad', src.ciudad);
  set('direccion', src.direccion); set('referencia', src.referencia);
}
function openAuth() {
  $('#authModal').hidden = false; $('#authOverlay').hidden = false; document.body.style.overflow = 'hidden';
}
function closeAuth() {
  $('#authModal').hidden = true; $('#authOverlay').hidden = true; document.body.style.overflow = '';
}
function showTab(which) {
  const login = which === 'login';
  $('#tabLogin').classList.toggle('is-active', login);
  $('#tabRegister').classList.toggle('is-active', !login);
  $('#loginForm').hidden = !login;
  $('#registerForm').hidden = login;
}
function onAuthSuccess(data) {
  authToken = data.token; currentUser = data.user;
  localStorage.setItem('gm_token', authToken);
  updateAuthUI(); closeAuth();
  if (window.__afterAuth) { const fn = window.__afterAuth; window.__afterAuth = null; fn(); }
}
function logout() {
  authToken = ''; currentUser = null; localStorage.removeItem('gm_token'); updateAuthUI();
}
async function apiAuth(path, body, errEl) {
  errEl.hidden = true;
  try {
    const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) { errEl.textContent = data.error || 'Error'; errEl.hidden = false; return; }
    onAuthSuccess(data);
  } catch (e) { errEl.textContent = 'No se pudo conectar. Reintentá.'; errEl.hidden = false; }
}
async function loadSession() {
  if (!authToken) { updateAuthUI(); return; }
  try {
    const r = await fetch(API + '/me', { headers: { Authorization: 'Bearer ' + authToken } });
    if (r.ok) { currentUser = (await r.json()).user; } else { logout(); }
  } catch (e) { /* offline: mantengo el token */ }
  updateAuthUI(); prefillCheckout();
}

// ---- Init ----
$('#cartBtn').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
$('#overlay').addEventListener('click', closeCart);
$('#primaryBtn').addEventListener('click', primaryAction);
$('#backStep').addEventListener('click', () => goStep(1));
$('#changeAddr').addEventListener('click', useNewAddr);
$('#ctaAccountBtn').addEventListener('click', () => { window.__afterAuth = () => { openCart(); goStep(2); }; showTab('register'); openAuth(false); });
$('#search').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); renderGrid(); });

// cuenta
$('#accountBtn').addEventListener('click', () => { if (currentUser) openMyOrders(); else { showTab('login'); openAuth(false); } });
$('#ordersClose').addEventListener('click', closeMyOrders);
$('#ordersOverlay').addEventListener('click', closeMyOrders);
$('#logoutBtn').addEventListener('click', () => { logout(); closeMyOrders(); });
$('#okMyOrders').addEventListener('click', () => { closeCart(); openMyOrders(); });
$('#okKeep').addEventListener('click', closeCart);
$('#authClose').addEventListener('click', closeAuth);
$('#authOverlay').addEventListener('click', closeAuth);
$('#tabLogin').addEventListener('click', () => showTab('login'));
$('#tabRegister').addEventListener('click', () => showTab('register'));
$('#loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  apiAuth('/login', { email: f.get('email'), password: f.get('password') }, $('#loginError'));
});
$('#registerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  apiAuth('/register', { nombre: f.get('nombre'), email: f.get('email'), password: f.get('password'), telefono: f.get('telefono') }, $('#registerError'));
});

fillProvincias();
renderCart();
loadSession();
fetch('productos.json')
  .then((r) => r.json())
  .then((data) => { PRODUCTS = data; renderGrid(); })
  .catch((e) => { console.error('no cargó productos.json', e); $('#grid').append(el('p', { text: 'No se pudieron cargar los productos.' })); });
