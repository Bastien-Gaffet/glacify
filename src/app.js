import { load, save, uid, defaultState } from './store.js';
import { buildPlan, countFlavors, MAX_SCOOPS } from './plan.js';

const state = load();
const ui = { tab: 'orders', draft: null };
const TABS = ['orders', 'service', 'catalog'];

const $view = document.getElementById('view');
const $editor = document.getElementById('editor');

// ---------- helpers ----------

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const flavorOf = (id) => state.flavors.find((f) => f.id === id) ?? { id, name: 'Parfum supprimé', color: '#D8D2CC' };
const toppingOf = (id) => state.toppings.find((t) => t.id === id) ?? { id, name: 'Supplément supprimé' };
const plural = (n, one, many = one + 's') => `${n} ${n > 1 ? many : one}`;

// Dark text on light scoops, white text on dark ones.
function ink(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#3B2A20' : '#FFFFFF';
}

function commit({ ordersChanged = false } = {}) {
  if (ordersChanged) state.checks = {};
  save(state);
  render();
}

function describe(order) {
  const counts = new Map();
  for (const id of order.scoops) counts.set(id, (counts.get(id) || 0) + 1);
  const scoops = [...counts].map(([id, n]) => (n > 1 ? `${n}× ` : '') + flavorOf(id).name).join(', ');
  const tops = order.toppings.map((id) => toppingOf(id).name);
  return [scoops, ...tops].filter(Boolean).join(' · ');
}

// Small illustration of the ice cream: stacked scoops on a cone or in a cup.
function art(order, size = 56) {
  const r = 13;
  const step = 12;
  const n = Math.max(order.scoops.length, 1);
  const bottomCy = 4 + r + (n - 1) * step;
  const isCone = order.container === 'cornet';
  const baseY = bottomCy + (isCone ? 6 : 2);
  const height = baseY + (isCone ? 34 : 24) + 2;
  const scoops = order.scoops.length ? order.scoops : [null];

  const balls = scoops
    .map((id, i) => {
      const cy = bottomCy - i * step;
      const cx = 30 + (i % 2 === 0 ? 0 : i % 4 === 1 ? -2 : 2);
      const fill = id ? flavorOf(id).color : 'none';
      const stroke = id ? 'rgba(59,42,32,.18)' : '#D8CFC6';
      return `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" ${id ? '' : 'stroke-dasharray="4 3"'}/>
        ${id ? `<ellipse cx="${cx - 5}" cy="${cy - 5}" rx="3.5" ry="2.2" fill="#fff" opacity=".45"/>` : ''}</g>`;
    })
    .reverse()
    .join('');

  const base = isCone
    ? `<path d="M15 ${baseY} L30 ${baseY + 34} L45 ${baseY} Z" fill="#E8B572"/>
       <path d="M19 ${baseY + 4} L36 ${baseY + 18} M41 ${baseY + 4} L26 ${baseY + 22} M24 ${baseY} L39 ${baseY + 12}" stroke="#C98F4A" stroke-width="1.5"/>`
    : `<path d="M10 ${baseY} L50 ${baseY} L45 ${baseY + 24} L15 ${baseY + 24} Z" fill="#9AD0EC"/>
       <path d="M12 ${baseY + 7} L48 ${baseY + 7}" stroke="#fff" stroke-width="2" opacity=".6"/>`;

  return `<svg class="art" viewBox="0 0 60 ${height}" width="${size}" height="${(size * height) / 60}" aria-hidden="true">${balls}${base}</svg>`;
}

// ---------- views ----------

function viewOrders() {
  const orders = state.orders;
  if (!orders.length) {
    return `
      <header class="page-head"><h1>Glacify</h1><p>Les glaces de tout le monde, servies sans prise de tête.</p></header>
      <div class="empty">
        ${art({ container: 'cornet', scoops: ['fraise', 'vanille', 'chocolat'] }, 96)}
        <h2>Qui veut une glace&nbsp;?</h2>
        <p>Ajoutez chaque personne et ses parfums. Glacify prépare ensuite l'ordre de service idéal.</p>
        <button class="btn primary big" data-action="add-order">+ Ajouter une personne</button>
      </div>`;
  }

  const counts = countFlavors(orders);
  const totals = [...counts].sort((a, b) => b[1] - a[1]);
  const scoopCount = totals.reduce((n, [, c]) => n + c, 0);

  return `
    <header class="page-head row">
      <div><h1>Commande</h1><p>${plural(orders.length, 'personne')} · ${plural(scoopCount, 'boule')}</p></div>
      <button class="btn ghost small" data-action="clear-orders">Tout effacer</button>
    </header>

    <ul class="cards">
      ${orders
        .map(
          (o) => `
        <li class="card order" data-action="edit-order" data-id="${o.id}">
          ${art(o)}
          <div class="order-main">
            <strong>${esc(o.name)}</strong>
            <span class="muted">${o.container === 'cornet' ? 'Cornet' : 'Pot'} · ${esc(describe(o))}</span>
          </div>
          <div class="order-actions">
            <button class="icon-btn" data-action="dup-order" data-id="${o.id}" title="Pareil pour quelqu'un d'autre" aria-label="Dupliquer">
              <svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
            </button>
            <button class="icon-btn danger" data-action="del-order" data-id="${o.id}" title="Supprimer" aria-label="Supprimer">
              <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
        </li>`,
        )
        .join('')}
    </ul>

    <button class="btn dashed" data-action="add-order">+ Ajouter une personne</button>

    <section class="recap">
      <h2>À prévoir</h2>
      <div class="chips">
        ${totals
          .map(([id, n]) => {
            const f = flavorOf(id);
            return `<span class="chip" style="--c:${f.color};--ink:${ink(f.color)}"><i></i>${esc(f.name)} <b>×${n}</b></span>`;
          })
          .join('')}
      </div>
    </section>

    <div class="sticky-cta">
      <button class="btn primary big" data-action="tab" data-tab="service">Passer au service →</button>
    </div>`;
}

function task(key, { swatch, title, sub, count }) {
  const done = !!state.checks[key];
  return `
    <button class="task ${done ? 'done' : ''}" data-action="check" data-key="${esc(key)}" aria-pressed="${done}">
      <span class="tick"></span>
      ${swatch ? `<span class="swatch" style="background:${swatch}"></span>` : ''}
      <span class="task-main"><strong>${title}</strong>${sub ? `<small>${sub}</small>` : ''}</span>
      ${count ? `<span class="task-count">×${count}</span>` : ''}
    </button>`;
}

function viewService() {
  const plan = buildPlan(state);
  if (!plan.orders.length) {
    return `
      <header class="page-head"><h1>Service</h1></header>
      <div class="empty">
        ${art({ container: 'pot', scoops: [] }, 80)}
        <h2>Rien à servir pour l'instant</h2>
        <p>Commencez par prendre la commande.</p>
        <button class="btn primary big" data-action="tab" data-tab="orders">Prendre la commande</button>
      </div>`;
  }

  const served = plan.orders.filter((o) => o.served).length;
  const total = plan.orders.length;
  const depth = plan.layers.length;
  const names = (people) => people.map((p) => esc(p.name)).join(', ');
  const layerTitle = (i) => (depth === 1 ? 'Les boules' : i === 0 ? '1<sup>re</sup> boule' : `${i + 1}<sup>e</sup> boule`);
  let step = 1;

  const containers = [
    plan.containers.cornet && task('c:cornet', { title: plural(plan.containers.cornet, 'cornet'), swatch: '#E8B572' }),
    plan.containers.pot && task('c:pot', { title: plural(plan.containers.pot, 'pot'), swatch: '#9AD0EC' }),
  ].filter(Boolean);

  return `
    <header class="page-head row">
      <div><h1>Service</h1><p>${plural(total, 'personne')} · ${plural(plan.scoopCount, 'boule')}</p></div>
      <button class="btn ghost small" data-action="reset-service">Recommencer</button>
    </header>

    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${served}">
      <div style="width:${(served / total) * 100}%"></div>
      <span>${served === total ? 'Tout le monde est servi 🎉' : `${served} / ${total} servi${served > 1 ? 's' : ''}`}</span>
    </div>

    <section class="step">
      <h2><span class="num">${step++}</span>Sortir les contenants</h2>
      <div class="tasks">${containers.join('')}</div>
    </section>

    ${plan.layers
      .map(
        (groups, i) => `
      <section class="step">
        <h2><span class="num">${step++}</span><span>${layerTitle(i)}</span></h2>
        ${depth > 1 && i === 0 ? '<p class="hint">On monte les glaces étage par étage : toutes les premières boules, puis les deuxièmes… Un parfum à la fois.</p>' : ''}
        <div class="tasks">
          ${groups
            .map((g) => {
              const f = g.flavor ?? flavorOf(g.flavorId);
              return task(`l${i}:${g.flavorId}`, { swatch: f.color, title: esc(f.name), sub: names(g.people), count: g.people.length });
            })
            .join('')}
        </div>
      </section>`,
      )
      .join('')}

    ${
      plan.toppingGroups.length
        ? `<section class="step">
        <h2><span class="num">${step++}</span>Suppléments</h2>
        <div class="tasks">
          ${plan.toppingGroups
            .map((g) => task(`t:${g.topping.id}`, { title: esc(g.topping.name), sub: names(g.people), count: g.people.length }))
            .join('')}
        </div>
      </section>`
        : ''
    }

    <section class="step">
      <h2><span class="num">${step++}</span>Distribuer</h2>
      <div class="tasks">
        ${plan.orders
          .map(
            (o) => `
          <button class="task person ${o.served ? 'done' : ''}" data-action="serve" data-id="${o.id}" aria-pressed="${!!o.served}">
            <span class="tick"></span>
            ${art(o, 34)}
            <span class="task-main"><strong>${esc(o.name)}</strong><small>${o.container === 'cornet' ? 'Cornet' : 'Pot'} · ${esc(describe(o))}</small></span>
          </button>`,
          )
          .join('')}
      </div>
    </section>

    <button class="btn dashed" data-action="new-round">Nouvelle tournée</button>`;
}

function viewCatalog() {
  return `
    <header class="page-head"><h1>Parfums</h1><p>Touchez un parfum pour le marquer épuisé.</p></header>

    <ul class="catalog">
      ${state.flavors
        .map(
          (f) => `
        <li class="${f.available ? '' : 'off'}">
          <button class="flavor-row" data-action="toggle-flavor" data-id="${f.id}" aria-pressed="${f.available}">
            <span class="swatch big" style="background:${f.color}"></span>
            <span class="task-main"><strong>${esc(f.name)}</strong><small>${f.available ? 'Disponible' : 'Épuisé'}</small></span>
            <span class="switch"></span>
          </button>
          <button class="icon-btn danger" data-action="del-flavor" data-id="${f.id}" aria-label="Supprimer ${esc(f.name)}">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </li>`,
        )
        .join('')}
    </ul>
    <form class="add-form" data-form="flavor">
      <input type="color" name="color" value="#FFC6D9" aria-label="Couleur" />
      <input name="name" placeholder="Nouveau parfum" required maxlength="40" />
      <button class="btn primary">Ajouter</button>
    </form>

    <h2 class="section-title">Suppléments</h2>
    <div class="chips">
      ${state.toppings
        .map(
          (t) => `<span class="chip removable">${esc(t.name)}
            <button data-action="del-topping" data-id="${t.id}" aria-label="Supprimer ${esc(t.name)}">×</button></span>`,
        )
        .join('')}
    </div>
    <form class="add-form" data-form="topping">
      <input name="name" placeholder="Nouveau supplément" required maxlength="40" />
      <button class="btn primary">Ajouter</button>
    </form>

    <button class="btn ghost small center" data-action="reset-catalog">Rétablir la carte par défaut</button>`;
}

function render() {
  $view.innerHTML = { orders: viewOrders, service: viewService, catalog: viewCatalog }[ui.tab]();
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
  const badge = document.getElementById('badge-orders');
  badge.hidden = !state.orders.length;
  badge.textContent = state.orders.length;
}

// ---------- order editor ----------

function openEditor(order) {
  ui.draft = order
    ? { ...order, scoops: [...order.scoops], toppings: [...order.toppings] }
    : { id: null, name: '', container: 'cornet', scoops: [], toppings: [] };
  renderEditor();
  $editor.showModal();
  if (!order) $editor.querySelector('input[name="name"]').focus();
}

function closeEditor() {
  ui.draft = null;
  $editor.close();
}

function renderEditor() {
  const d = ui.draft;
  const full = d.scoops.length >= MAX_SCOOPS;
  const inDraft = countFlavors([d]);

  $editor.innerHTML = `
    <div class="sheet-inner">
      <header class="sheet-head">
        <h2>${d.id ? 'Modifier la glace' : 'Nouvelle glace'}</h2>
        <button class="icon-btn" data-action="close-editor" aria-label="Fermer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </header>

      <div class="preview">
        ${art(d, 72)}
        <div>
          <input name="name" class="name-input" placeholder="Prénom (facultatif)" value="${esc(d.name)}" maxlength="30" autocomplete="off" />
          <div class="segmented" role="radiogroup">
            ${['cornet', 'pot']
              .map(
                (c) => `<button role="radio" aria-checked="${d.container === c}" data-action="draft-container" data-value="${c}">${c === 'cornet' ? 'Cornet' : 'Pot'}</button>`,
              )
              .join('')}
          </div>
        </div>
      </div>

      <div class="label-row">
        <h3>Parfums</h3>
        <span class="muted">${d.scoops.length}/${MAX_SCOOPS} boules</span>
      </div>
      <div class="scoop-list">
        ${
          d.scoops.length
            ? d.scoops
                .map((id, i) => {
                  const f = flavorOf(id);
                  return `<button class="chip removable" style="--c:${f.color};--ink:${ink(f.color)}" data-action="draft-remove-scoop" data-index="${i}">
                    <i></i>${esc(f.name)} <span aria-hidden="true">×</span></button>`;
                })
                .join('')
            : '<span class="muted">Touchez un parfum pour ajouter une boule.</span>'
        }
      </div>
      <div class="flavor-grid">
        ${state.flavors
          .filter((f) => f.available || inDraft.has(f.id))
          .map(
            (f) => `
          <button class="flavor-tile" style="--c:${f.color};--ink:${ink(f.color)}" data-action="draft-add-scoop" data-id="${f.id}" ${full ? 'disabled' : ''}>
            ${inDraft.get(f.id) ? `<b class="count">${inDraft.get(f.id)}</b>` : ''}
            <span>${esc(f.name)}</span>
          </button>`,
          )
          .join('')}
      </div>

      ${
        state.toppings.length
          ? `<h3>Suppléments</h3>
        <div class="chips">
          ${state.toppings
            .map(
              (t) => `<button class="chip toggle" aria-pressed="${d.toppings.includes(t.id)}" data-action="draft-toggle-topping" data-id="${t.id}">${esc(t.name)}</button>`,
            )
            .join('')}
        </div>`
          : ''
      }
    </div>
    <footer class="sheet-foot">
      <button class="btn ghost" data-action="close-editor">Annuler</button>
      <button class="btn primary" data-action="draft-save" ${d.scoops.length ? '' : 'disabled'}>${d.id ? 'Enregistrer' : 'Ajouter'}</button>
    </footer>`;
}

function saveDraft() {
  const d = ui.draft;
  if (!d.scoops.length) return;
  const name = d.name.trim() || `Personne ${state.orders.length + (d.id ? 0 : 1)}`;
  const order = { ...d, name, served: false };
  if (d.id) {
    state.orders = state.orders.map((o) => (o.id === d.id ? order : o));
  } else {
    state.orders.push({ ...order, id: uid() });
  }
  closeEditor();
  commit({ ordersChanged: true });
}

// ---------- events ----------

const actions = {
  tab: (el) => {
    ui.tab = el.dataset.tab;
    history.replaceState(null, '', `#${ui.tab}`);
    render();
    window.scrollTo({ top: 0 });
  },
  'add-order': () => openEditor(null),
  'edit-order': (el) => openEditor(state.orders.find((o) => o.id === el.dataset.id)),
  'dup-order': (el) => {
    const src = state.orders.find((o) => o.id === el.dataset.id);
    openEditor(null);
    Object.assign(ui.draft, { container: src.container, scoops: [...src.scoops], toppings: [...src.toppings] });
    renderEditor();
    $editor.querySelector('input[name="name"]').focus();
  },
  'del-order': (el) => {
    state.orders = state.orders.filter((o) => o.id !== el.dataset.id);
    commit({ ordersChanged: true });
  },
  'clear-orders': () => {
    if (!confirm('Effacer toute la commande ?')) return;
    state.orders = [];
    commit({ ordersChanged: true });
  },
  'close-editor': closeEditor,
  'draft-container': (el) => {
    ui.draft.container = el.dataset.value;
    renderEditor();
  },
  'draft-add-scoop': (el) => {
    if (ui.draft.scoops.length < MAX_SCOOPS) ui.draft.scoops.push(el.dataset.id);
    renderEditor();
  },
  'draft-remove-scoop': (el) => {
    ui.draft.scoops.splice(Number(el.dataset.index), 1);
    renderEditor();
  },
  'draft-toggle-topping': (el) => {
    const t = ui.draft.toppings;
    const i = t.indexOf(el.dataset.id);
    if (i >= 0) t.splice(i, 1);
    else t.push(el.dataset.id);
    renderEditor();
  },
  'draft-save': saveDraft,
  check: (el) => {
    const k = el.dataset.key;
    if (state.checks[k]) delete state.checks[k];
    else state.checks[k] = true;
    commit();
  },
  serve: (el) => {
    const o = state.orders.find((x) => x.id === el.dataset.id);
    o.served = !o.served;
    commit();
  },
  'reset-service': () => {
    state.checks = {};
    state.orders.forEach((o) => (o.served = false));
    commit();
  },
  'new-round': () => {
    if (!confirm('Effacer cette commande et en commencer une nouvelle ?')) return;
    state.orders = [];
    ui.tab = 'orders';
    commit({ ordersChanged: true });
  },
  'toggle-flavor': (el) => {
    const f = state.flavors.find((x) => x.id === el.dataset.id);
    f.available = !f.available;
    commit();
  },
  'del-flavor': (el) => {
    const f = state.flavors.find((x) => x.id === el.dataset.id);
    if (!confirm(`Retirer « ${f.name} » de la carte ?`)) return;
    state.flavors = state.flavors.filter((x) => x !== f);
    commit();
  },
  'del-topping': (el) => {
    state.toppings = state.toppings.filter((t) => t.id !== el.dataset.id);
    commit();
  },
  'reset-catalog': () => {
    if (!confirm('Rétablir les parfums et suppléments par défaut ?')) return;
    const d = defaultState();
    state.flavors = d.flavors;
    state.toppings = d.toppings;
    commit();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  e.preventDefault();
  e.stopPropagation();
  actions[el.dataset.action]?.(el);
});

$editor.addEventListener('input', (e) => {
  if (e.target.name === 'name') ui.draft.name = e.target.value;
});
$editor.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.name === 'name') {
    e.preventDefault();
    saveDraft();
  }
});
// Tap on the backdrop closes the sheet.
$editor.addEventListener('click', (e) => {
  if (e.target === $editor) closeEditor();
});
$editor.addEventListener('close', () => (ui.draft = null));

document.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const field = (n) => form.elements.namedItem(n).value;
  const name = field('name').trim();
  if (!name) return;
  if (form.dataset.form === 'flavor') {
    state.flavors.push({ id: uid(), name, color: field('color'), available: true });
  } else {
    state.toppings.push({ id: uid(), name });
  }
  commit();
  $view.querySelector(`form[data-form="${form.dataset.form}"] input[name="name"]`)?.focus();
});

const fromHash = location.hash.slice(1);
if (TABS.includes(fromHash)) ui.tab = fromHash;
render();
