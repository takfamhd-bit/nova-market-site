const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DA = n => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, ' ') + ' DA';
const price = p => (p.promo_price > 0 && p.promo_price < p.price ? p.promo_price : p.price);
let S = { categories: [], products: [], settings: {} };
let lastWA = '';
let cart = JSON.parse(localStorage.getItem('nm_cart') || '{}');
const saveCart = () => { localStorage.setItem('nm_cart', JSON.stringify(cart)); $('#cc').textContent = Object.values(cart).reduce((a, b) => a + b, 0); };
const cat = id => S.categories.find(c => c.id === id);
const pid = id => S.products.find(p => p.id === +id);

function fee(w, sub) {
  const s = S.settings; if (+s.free_above > 0 && sub >= +s.free_above) return 0;
  const m = (s.shipping_overrides || '').split('\n').map(l => l.match(/^\s*(\d+)\s*=\s*(\d+)\s*$/)).find(x => x && +x[1] === +w);
  return m ? +m[2] : +s.shipping_default || 0;
}
function card(p) {
  const promo = price(p) < p.price, ic = cat(p.category_id)?.icon || '🛍️';
  return `<a class="card" href="#/p/${p.id}">${promo ? `<span class="tag">-${Math.round(100 - price(p) / p.price * 100)}%</span>` : ''}${p.demo ? '<span class="tag d">DÉMO</span>' : ''}
  <div class="ph">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : ic}</div>
  <div class="in"><h3>${esc(p.name)}</h3><div class="pr">${DA(price(p))}${promo ? `<s>${DA(p.price)}</s>` : ''}</div>${p.stock > 0 ? '' : '<div class="out">Rupture de stock</div>'}</div></a>`;
}
const section = (t, list, link) => list.length ? `<h2>${t}${link ? `<a href="${link}">Voir tout ›</a>` : ''}</h2><div class="grid">${list.slice(0, 8).map(card).join('')}</div>` : '';
const catBar = on => `<div class="cats">${S.categories.map(c => `<a class="cat ${on == c.id ? 'on' : ''}" href="#/shop?cat=${c.id}"><i>${esc(c.icon)}</i>${esc(c.name)}</a>`).join('')}</div>`;
const inStock = S0 => S0.filter(p => p.stock > 0);

const views = {
  home() {
    const P = S.products, st = S.settings;
    app.innerHTML = `<section class="hero"><h1>${esc(st.banner_title)}</h1><p>${esc(st.banner_text)}</p>
      <a class="btn" href="#/shop?sort=promo">Acheter maintenant</a><a class="btn alt" href="#/shop">Découvrir les produits</a>
