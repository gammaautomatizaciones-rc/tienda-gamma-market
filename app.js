'use strict';

/* ================================================================
   NUMERO DE WHATSAPP DE GAMMA MARKET (Ecuador). Solo digitos, sin + ni espacios.
================================================================ */
const WHATSAPP = '5493853010314'; // GAMMA MARKET
const API = 'https://gamma-market-api.gammasg.workers.dev';
let authToken = localStorage.getItem('gm_token') || '';
let currentUser = null;

const PROVINCIAS = ['Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona Santiago','Napo','Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos','Tungurahua','Zamora Chinchipe'];

let PRODUCTS = [];
let query = '';
const cart = []; // { id, variant, qty }

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
  $('#checkout').hidden = cart.length === 0;
  $('#confirmBtn').disabled = cart.length === 0;

  let total = 0;
  cart.forEach((c, i) => {
    const p = byId(c.id); if (!p) return;
    total += p.price * c.qty;
    const info = el('div', { class: 'ci-info' },
      el('div', { class: 'ci-name', text: p.name }),
      c.variant ? el('div', { class: 'ci-meta', text: c.variant }) : null,
      el('div', { class: 'ci-price', text: money(p.price * c.qty) }),
    );
    const minus = el('button', { type: 'button', 'aria-label': 'Restar' }); minus.append(ICON.minus());
    minus.addEventListener('click', () => { c.qty--; if (c.qty <= 0) cart.splice(i, 1); renderCart(); });
    const plus = el('button', { type: 'button', 'aria-label': 'Sumar' }); plus.append(ICON.plus());
    plus.addEventListener('click', () => { c.qty++; renderCart(); });
    const rm = el('button', { class: 'ci-remove', type: 'button', 'aria-label': 'Quitar' }); rm.append(ICON.trash());
    rm.addEventListener('click', () => { cart.splice(i, 1); renderCart(); });
    const ciImg = el('div', { class: 'ci-img' });
    if (p.img) ciImg.append(el('img', { src: p.img, alt: p.name }));
    box.append(el('div', { class: 'ci' }, ciImg, info, el('div', { class: 'qty' }, minus, el('span', { text: String(c.qty) }), plus), rm));
  });
  $('#cartTotal').textContent = money(total);
}
function openCart() { $('#cart').hidden = false; $('#overlay').hidden = false; document.body.style.overflow = 'hidden'; }
function closeCart() { $('#cart').hidden = true; $('#overlay').hidden = true; document.body.style.overflow = ''; }

function fillProvincias() {
  const sel = document.querySelector('.checkout select[name="provincia"]');
  sel.append(el('option', { value: '', disabled: '', selected: '', text: 'Elige tu provincia' }));
  PROVINCIAS.forEach((pr) => sel.append(el('option', { value: pr, text: pr })));
}

async function confirmOrder() {
  if (!currentUser) { openAuth(true); return; } // hay que estar logueado para comprar
  const form = $('#checkout');
  if (!form.reportValidity()) return;
  const f = new FormData(form);

  let total = 0; const items = [];
  cart.forEach((c) => {
    const p = byId(c.id); if (!p) return;
    total += p.price * c.qty;
    items.push({ name: p.name, variant: c.variant || null, qty: c.qty, price: p.price });
  });
  const shipping = {
    telefono: f.get('telefono'), provincia: f.get('provincia'), ciudad: f.get('ciudad'),
    direccion: f.get('direccion'), referencia: (f.get('referencia') || '').trim(),
  };

  const btn = $('#confirmBtn'); btn.disabled = true;
  try {
    await fetch(API + '/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + authToken },
      body: JSON.stringify({ items, total, ...shipping }),
    });
  } catch (e) { console.error('no se guardó el pedido en la cuenta', e); }
  btn.disabled = false;

  let msg = '*NUEVO PEDIDO — GAMMA MARKET*\n\n*Productos:*\n';
  items.forEach((it) => { msg += '- ' + it.name + (it.variant ? ' (' + it.variant + ')' : '') + ' x' + it.qty + ' — ' + money(it.price * it.qty) + '\n'; });
  msg += '\n*Total: ' + money(total) + '* (pago contra entrega)\n\n*Datos del cliente:*\n';
  msg += 'Nombre: ' + (currentUser.nombre || f.get('nombre')) + '\n';
  msg += 'Email: ' + currentUser.email + '\n';
  msg += 'Teléfono: ' + shipping.telefono + '\n';
  msg += 'Provincia: ' + shipping.provincia + '\n';
  msg += 'Ciudad: ' + shipping.ciudad + '\n';
  msg += 'Dirección: ' + shipping.direccion + '\n';
  if (shipping.referencia) msg += 'Referencia: ' + shipping.referencia + '\n';
  window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg), '_blank');
}

// ---------- Cuenta / auth ----------
function updateAuthUI() {
  const name = $('#accountName');
  name.textContent = currentUser ? (currentUser.nombre || 'Mi cuenta').split(' ')[0] : 'Ingresar';
}
function prefillCheckout() {
  if (!currentUser) return;
  const form = $('#checkout'); if (!form) return;
  const set = (n, v) => { const el = form.querySelector('[name="' + n + '"]'); if (el && v && !el.value) el.value = v; };
  set('nombre', currentUser.nombre); set('telefono', currentUser.telefono);
  set('provincia', currentUser.provincia); set('ciudad', currentUser.ciudad);
  set('direccion', currentUser.direccion); set('referencia', currentUser.referencia);
}
function openAuth(pending) {
  window.__authPending = !!pending;
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
  updateAuthUI(); closeAuth(); prefillCheckout();
  if (window.__authPending) { window.__authPending = false; openCart(); }
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
$('#confirmBtn').addEventListener('click', confirmOrder);
$('#search').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); renderGrid(); });

// cuenta
$('#accountBtn').addEventListener('click', () => { if (currentUser) logout(); else { showTab('login'); openAuth(false); } });
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
