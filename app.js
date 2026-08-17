'use strict';

/* ================================================================
   NUMERO DE WHATSAPP DE GAMMA MARKET (Ecuador). Solo digitos, sin + ni espacios.
================================================================ */
const WHATSAPP = '5493853010314'; // GAMMA MARKET

const PROVINCIAS = ['Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona Santiago','Napo','Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos','Tungurahua','Zamora Chinchipe'];

let PRODUCTS = [];
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
  PRODUCTS.forEach((p) => {
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
  $('#prodCount').textContent = PRODUCTS.length + ' productos';
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

function confirmOrder() {
  const form = $('#checkout');
  if (!form.reportValidity()) return;
  if (!WHATSAPP) { console.warn('Falta WHATSAPP'); return; }
  let total = 0, msg = '*NUEVO PEDIDO — GAMMA MARKET*\n\n*Productos:*\n';
  cart.forEach((c) => {
    const p = byId(c.id); if (!p) return;
    total += p.price * c.qty;
    msg += '- ' + p.name + (c.variant ? ' (' + c.variant + ')' : '') + ' x' + c.qty + ' — ' + money(p.price * c.qty) + '\n';
  });
  const f = new FormData(form);
  msg += '\n*Total: ' + money(total) + '* (pago contra entrega)\n\n*Datos del cliente:*\n';
  msg += 'Nombre: ' + f.get('nombre') + '\n';
  msg += 'Teléfono: ' + f.get('telefono') + '\n';
  msg += 'Provincia: ' + f.get('provincia') + '\n';
  msg += 'Ciudad: ' + f.get('ciudad') + '\n';
  msg += 'Dirección: ' + f.get('direccion') + '\n';
  const ref = (f.get('referencia') || '').trim(); if (ref) msg += 'Referencia: ' + ref + '\n';
  window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg), '_blank');
}

// ---- Init ----
$('#cartBtn').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
$('#overlay').addEventListener('click', closeCart);
$('#confirmBtn').addEventListener('click', confirmOrder);
fillProvincias();
renderCart();
fetch('productos.json')
  .then((r) => r.json())
  .then((data) => { PRODUCTS = data; renderGrid(); })
  .catch((e) => { console.error('no cargó productos.json', e); $('#grid').append(el('p', { text: 'No se pudieron cargar los productos.' })); });
