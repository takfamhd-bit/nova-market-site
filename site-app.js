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
      <a class="btn" href="#/shop?sort=promo">Acheter maintenant</a><a class="btn alt" href="#/shop">Découvrir les produits</a></section>
      ${catBar()}
      ${section('🔥 Produits populaires', inStock(P).filter(p => p.popular), '#/shop?sort=pop')}
      ${section('✨ Nouveautés', inStock(P).slice(0, 8), '#/shop?sort=new')}
      ${section('🏷️ Meilleures offres', inStock(P).filter(p => price(p) < p.price), '#/shop?sort=promo')}
      ${section('🏆 Les plus vendus', [...inStock(P)].sort((a, b) => b.sold - a.sold), '#/shop?sort=sold')}`;
  },
  shop(q) {
    const f = { cat: q.get('cat') || '', q: q.get('q') || '', sort: q.get('sort') || 'pop', min: q.get('min') || '', max: q.get('max') || '' };
    let L = S.products.filter(p => (!f.cat || p.category_id == f.cat) && (!f.q || (p.name + ' ' + p.description).toLowerCase().includes(f.q.toLowerCase())) && (!f.min || price(p) >= +f.min) && (!f.max || price(p) <= +f.max) && (f.sort !== 'promo' || price(p) < p.price));
    const sorts = { pop: (a, b) => b.popular - a.popular || b.sold - a.sold, sold: (a, b) => b.sold - a.sold, new: (a, b) => b.id - a.id, promo: (a, b) => (b.price - price(b)) - (a.price - price(a)), asc: (a, b) => price(a) - price(b), desc: (a, b) => price(b) - price(a) };
    L.sort(sorts[f.sort] || sorts.pop);
    app.innerHTML = `${catBar(f.cat)}<form id="ff" class="filters">
      <input name="q" placeholder="Recherche…" value="${esc(f.q)}"><select name="sort">${[['pop', 'Popularité'], ['new', 'Nouveautés'], ['promo', 'Promotions'], ['sold', 'Plus vendus'], ['asc', 'Prix croissant'], ['desc', 'Prix décroissant']].map(o => `<option value="${o[0]}" ${f.sort === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>
      <input name="min" type="number" inputmode="numeric" placeholder="Prix min (DA)" value="${esc(f.min)}"><input name="max" type="number" inputmode="numeric" placeholder="Prix max (DA)" value="${esc(f.max)}">
      <input type="hidden" name="cat" value="${esc(f.cat)}"></form>
      <p>${L.length} produit(s)</p>${L.length ? `<div class="grid">${L.map(card).join('')}</div>` : '<p>Aucun produit trouvé.</p>'}`;
    const ff = $('#ff'); ff.onsubmit = e => e.preventDefault();
    ff.oninput = ff.onchange = () => { const u = new URLSearchParams(); new FormData(ff).forEach((v, k) => v && u.set(k, v)); history.replaceState(null, '', '#/shop?' + u); const nm = document.activeElement.name; clearTimeout(ff.t); ff.t = setTimeout(() => { route(true); const el = $('#ff')?.elements[nm]; if (el) { el.focus(); try { el.setSelectionRange(99, 99); } catch {} } }, 350); };
  },
  p(id) {
    const p = pid(id); if (!p) return (app.innerHTML = '<p>Produit introuvable. <a href="#/shop">Retour</a></p>');
    document.title = p.name + ' — NOVA MARKET';
    const ic = cat(p.category_id)?.icon || '🛍️', promo = price(p) < p.price, wa = S.settings.whatsapp;
    app.innerHTML = `<p><a href="#/shop">‹ Catalogue</a></p><div class="detail"><div class="ph">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">` : ic}</div>
      <div><h1 style="margin-top:0">${esc(p.name)}</h1>${p.demo ? '<span class="tag d" style="position:static">PRODUIT DÉMO</span>' : ''}
      <div class="pr big">${DA(price(p))}${promo ? `<s>${DA(p.price)}</s>` : ''}</div>
      <p>${p.stock > 0 ? `<span class="ok">✔ En stock (${p.stock})</span>` : '<span class="out">Rupture de stock</span>'}</p><p>${esc(p.description)}</p>
      ${p.stock > 0 ? `<div class="qty"><button id="m">−</button><span id="n">1</span><button id="pl">+</button></div><p><button class="btn" id="buy">Acheter maintenant</button><button class="btn dark" id="add">Ajouter au panier</button></p>` : ''}
      ${wa ? `<a class="btn line" target="_blank" rel="noopener" href="https://wa.me/${esc(wa)}?text=${encodeURIComponent('Bonjour, je suis intéressé par : ' + p.name)}">💬 Poser une question sur WhatsApp</a>` : ''}
      <p>🚚 Livraison 58 wilayas · 💵 Paiement à la livraison</p></div></div>`;
    let n = 1; const set = v => { n = Math.max(1, Math.min(p.stock, v)); $('#n').textContent = n; };
    if (p.stock > 0) { $('#m').onclick = () => set(n - 1); $('#pl').onclick = () => set(n + 1); $('#add').onclick = () => { addCart(p, n); $('#add').textContent = '✔ Ajouté'; }; $('#buy').onclick = () => { addCart(p, n); location.hash = '#/checkout'; }; }
  },
  cart() {
    const ids = Object.keys(cart).filter(i => pid(i)); const sub = ids.reduce((a, i) => a + price(pid(i)) * cart[i], 0);
    if (!ids.length) return (app.innerHTML = '<div class="done"><h1>🛒 Panier vide</h1><a class="btn" href="#/shop">Découvrir les produits</a></div>');
    app.innerHTML = `<h1>Mon panier</h1>${ids.map(i => { const p = pid(i); return `<div class="row"><div class="ph">${p.image ? `<img src="${esc(p.image)}" alt="">` : cat(p.category_id)?.icon || '🛍️'}</div>
      <div class="gr"><a href="#/p/${p.id}"><b>${esc(p.name)}</b></a><div class="pr">${DA(price(p))}</div><div class="qty"><button data-m="${i}">−</button><span>${cart[i]}</span><button data-p="${i}">+</button></div></div><button class="btn line sm" data-d="${i}" aria-label="Supprimer">✕</button></div>`; }).join('')}
      <div class="box"><div><span>Sous-total</span><b>${DA(sub)}</b></div><div><span>Livraison</span><span>calculée selon la wilaya</span></div></div><a class="btn full" href="#/checkout">Commander (paiement à la livraison)</a>`;
    app.onclick = e => { const t = e.target, g = k => t.dataset[k]; if (g('m')) cart[g('m')]--; else if (g('p')) cart[g('p')] = Math.min(pid(g('p')).stock, cart[g('p')] + 1); else if (g('d')) delete cart[g('d')]; else return; if (cart[g('m')] < 1) delete cart[g('m')]; saveCart(); views.cart(); };
  },
  checkout() {
    const ids = Object.keys(cart).filter(i => pid(i)); if (!ids.length) { location.hash = '#/cart'; return; }
    const sub = ids.reduce((a, i) => a + price(pid(i)) * cart[i], 0);
    app.innerHTML = `<h1>Finaliser la commande</h1><div class="two"><form id="of"><label>Nom complet</label><input name="name" required autocomplete="name">
      <label>Téléphone</label><input name="phone" type="tel" inputmode="tel" placeholder="05 55 00 00 00" required autocomplete="tel">
      <label>Wilaya</label><select name="wilaya" required><option value="">Choisir…</option>${WILAYAS.map((w, i) => `<option value="${i + 1}">${String(i + 1).padStart(2, '0')} - ${esc(w)}</option>`).join('')}</select>
      <label>Commune</label><input name="commune" required><label>Adresse complète</label><textarea name="address" rows="2" required></textarea>
      <label>Note (facultatif)</label><input name="note"><div id="er"></div><button class="btn full" style="margin-top:14px" id="go">Confirmer la commande</button><p style="font-size:.85rem;color:var(--m)">💵 Vous payez en espèces à la réception. Aucun paiement en ligne.</p></form>
      <div class="box"><b>Récapitulatif</b>${ids.map(i => `<div><span>${cart[i]} × ${esc(pid(i).name)}</span><span>${DA(price(pid(i)) * cart[i])}</span></div>`).join('')}<div><span>Sous-total</span><span>${DA(sub)}</span></div><div><span>Livraison</span><span id="sh">Choisissez la wilaya</span></div><div class="tot"><span>Total</span><span id="tt">${DA(sub)}</span></div></div></div>`;
    const f = $('#of'); f.wilaya.onchange = () => { const s = f.wilaya.value ? fee(f.wilaya.value, sub) : null; $('#sh').textContent = s === null ? 'Choisissez la wilaya' : s ? DA(s) : 'Gratuite'; $('#tt').textContent = DA(sub + (s || 0)); };
    f.onsubmit = e => {
      e.preventDefault(); const b = Object.fromEntries(new FormData(f)), wa = S.settings.whatsapp, bad = m => { $('#er').innerHTML = `<div class="err">${m}</div>`; };
      if (!wa) return bad('Le numéro WhatsApp du vendeur n\'est pas encore configuré.');
      const ph = b.phone.replace(/[\s.-]/g, ''); if (!/^0[1-9]\d{7,8}$/.test(ph)) return bad('Numéro de téléphone invalide (exemple : 0555123456).');
      const sh = fee(b.wilaya, sub), tot = sub + sh, ref = 'NM-' + Date.now().toString(36).toUpperCase();
      const lines = ids.map(i => `• ${cart[i]} × ${pid(i).name} — ${DA(price(pid(i)) * cart[i])}`).join('\n');
      const msg = `🛒 Nouvelle commande ${ref}\n${lines}\n\nLivraison : ${sh ? DA(sh) : 'gratuite'}\nTotal à payer à la livraison : ${DA(tot)}\n\n👤 ${b.name}\n📞 ${ph}\n📍 Wilaya ${b.wilaya} - ${WILAYAS[b.wilaya - 1]}, ${b.commune}\n🏠 ${b.address}${b.note ? '\n📝 ' + b.note : ''}`;
      lastWA = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg);
      cart = {}; saveCart(); location.hash = `#/ok/${ref}/${tot}`; window.open(lastWA, '_blank');
    };
  },
  ok(ref, total) { app.innerHTML = `<div class="done"><h1>📲 Dernière étape !</h1><p>Votre commande <b class="ref">${esc(ref)}</b> n'est envoyée au vendeur <b>qu'après l'envoi du message WhatsApp</b>.</p>${lastWA ? `<p><a class="btn" target="_blank" rel="noopener" href="${esc(lastWA)}">📲 Envoyer ma commande sur WhatsApp</a></p>` : '<p>Si vous avez déjà envoyé le message, tout est bon.</p>'}<p>Total à payer à la livraison : <b>${DA(+total)}</b></p><a class="btn dark" href="#/">Retour à l'accueil</a></div>`; }
};
function addCart(p, n) { cart[p.id] = Math.min(p.stock, (cart[p.id] || 0) + n); saveCart(); }

function route(keep) {
  const [path, qs] = (location.hash.slice(1) || '/').split('?'), seg = path.split('/').filter(Boolean);
  document.title = 'NOVA MARKET — Boutique en ligne en Algérie, paiement à la livraison';
  if (!keep) window.scrollTo(0, 0);
  const v = views[seg[0] || 'home']; app.onclick = null;
  (v || views.home)(...(seg[0] === 'shop' ? [new URLSearchParams(qs)] : seg.slice(1)));
}
$('#hs').onsubmit = e => { e.preventDefault(); location.hash = '#/shop?q=' + encodeURIComponent($('#hq').value); };
async function load() { S = await (await fetch('site-produits.json', { cache: 'no-cache' })).json(); const w = S.settings.whatsapp?.replace(/\D/g, ''); const a = $('#wa'); a.hidden = !w; if (w) a.href = 'https://wa.me/' + w; S.settings.whatsapp = w; }
window.addEventListener('hashchange', () => route());
load().then(() => { saveCart(); route(); }).catch(() => (app.innerHTML = '<p>Impossible de charger la boutique. Réessayez plus tard.</p>'));
