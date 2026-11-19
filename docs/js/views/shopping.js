import { sb, check } from '../supa.js';
import { state } from '../state.js';
import { SECTIONS, sectionLabel, sectionEmoji, searchCatalog, guessSection, findCatalogItem, CATALOG } from '../catalog.js';
import { formatQty, ingredientKey } from '../units.js';
import { h, toast, errorToast, modal, debounce } from '../ui.js';

const ORDER = Object.fromEntries(SECTIONS.map((s, i) => [s.id, i]));

/** Liste de courses partagée, synchronisée en temps réel entre les membres */
export async function shoppingView(root) {
  const hid = state.household.id;
  let items = [];
  let showDone = false;

  const content = h('div');
  const summary = h('p', { class: 'muted small' });

  // --- Ajout rapide ---
  const datalist = h('datalist', { id: 'catalog-list' }, CATALOG.map((c) => h('option', { value: c.name })));
  const nameInput = h('input', { list: 'catalog-list', placeholder: 'Ajouter un article (ex : sacs poubelle)', required: true, autocomplete: 'off' });
  const qtyInput = h('input', { class: 'qty-input', placeholder: 'Qté (option)', maxlength: 30 });
  const addForm = h(
    'form',
    {
      class: 'add-bar',
      onSubmit: async (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        if (!name) return;
        await addItem(name, qtyInput.value.trim());
        nameInput.value = '';
        qtyInput.value = '';
        nameInput.focus();
      },
    },
    nameInput,
    qtyInput,
    h('button', { class: 'btn primary', type: 'submit', 'aria-label': 'Ajouter' }, '+'),
    datalist,
  );

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h('h1', {}, 'Liste de courses'),
      h('div', { class: 'row gap' }, h('a', { class: 'btn ghost', href: '#/preparer' }, '🍽️ Depuis mes recettes'), h('button', { class: 'btn', onClick: openCatalog }, '📚 Catalogue')),
    ),
    summary,
    addForm,
    content,
  );

  async function load() {
    try {
      items = check(await sb.from('shopping_items').select('*').eq('household_id', hid));
      render();
    } catch (e) {
      errorToast(e);
    }
  }

  async function addItem(name, note = '', section = null) {
    const key = ingredientKey(name);
    const dup = items.find((i) => i.status !== 'done' && ingredientKey(i.name) === key);
    if (dup && !note) {
      toast(`« ${dup.name} » est déjà dans la liste`);
      return false;
    }
    const cat = findCatalogItem(name);
    const row = {
      household_id: hid,
      name: cat ? cat.name : name,
      note,
      section: section || (cat ? cat.section : guessSection(name)),
      source: cat ? 'catalog' : 'custom',
    };
    try {
      const inserted = check(await sb.from('shopping_items').insert(row).select().single());
      items.push(inserted);
      render();
      return true;
    } catch (e) {
      errorToast(e);
      return false;
    }
  }

  async function patch(item, changes) {
    Object.assign(item, changes); // optimiste
    render();
    try {
      check(await sb.from('shopping_items').update(changes).eq('id', item.id));
    } catch (e) {
      errorToast(e);
      load();
    }
  }

  async function remove(item) {
    items = items.filter((i) => i !== item);
    render();
    try {
      check(await sb.from('shopping_items').delete().eq('id', item.id));
    } catch (e) {
      errorToast(e);
      load();
    }
  }

  async function removeMany(filterFn, label) {
    const ids = items.filter(filterFn).map((i) => i.id);
    if (!ids.length) return;
    if (!confirm(label)) return;
    items = items.filter((i) => !ids.includes(i.id));
    render();
    try {
      check(await sb.from('shopping_items').delete().in('id', ids));
    } catch (e) {
      errorToast(e);
      load();
    }
  }

  function itemRow(item) {
    const qty = formatQty(item.quantity, item.unit);
    const details = [qty, item.note].filter(Boolean).join(' · ');
    return h(
      'li',
      { class: `shop-item ${item.status}` },
      h(
        'label',
        { class: 'shop-main' },
        h('input', {
          type: 'checkbox',
          checked: item.status === 'done',
          onChange: (e) => patch(item, { status: e.target.checked ? 'done' : 'todo' }),
        }),
        h(
          'span',
          { class: 'shop-text' },
          h('span', { class: 'shop-name' }, item.name),
          details ? h('span', { class: 'shop-qty' }, details) : null,
          item.recipe_titles?.length ? h('small', { class: 'muted block' }, '🍽️ ', item.recipe_titles.join(', ')) : null,
        ),
      ),
      item.status !== 'done'
        ? h(
            'button',
            {
              class: `icon-btn ${item.status === 'missing' ? 'warn' : ''}`,
              title: item.status === 'missing' ? 'Je l\'ai trouvé finalement' : 'Introuvable en magasin',
              'aria-label': 'Introuvable',
              onClick: () => patch(item, { status: item.status === 'missing' ? 'todo' : 'missing' }),
            },
            item.status === 'missing' ? '↩︎' : '⚠️',
          )
        : null,
      h('button', { class: 'icon-btn', title: 'Retirer de la liste', 'aria-label': 'Retirer', onClick: () => remove(item) }, '🗑️'),
    );
  }

  function render() {
    const todo = items.filter((i) => i.status === 'todo');
    const missing = items.filter((i) => i.status === 'missing');
    const done = items.filter((i) => i.status === 'done');
    summary.textContent = items.length
      ? `${todo.length} à acheter · ${done.length} dans le panier${missing.length ? ` · ${missing.length} introuvable${missing.length > 1 ? 's' : ''}` : ''}`
      : '';

    const blocks = [];

    if (!items.length) {
      blocks.push(
        h(
          'div',
          { class: 'empty' },
          h('div', { class: 'empty-icon' }, '🛒'),
          h('p', {}, 'Ta liste est vide.'),
          h('div', { class: 'row gap center-row' }, h('a', { class: 'btn primary', href: '#/preparer' }, 'Choisir des recettes'), h('button', { class: 'btn', onClick: openCatalog }, 'Parcourir le catalogue')),
        ),
      );
    }

    if (missing.length) {
      blocks.push(
        h(
          'section',
          { class: 'card-box missing-box' },
          h('h3', { class: 'section-title' }, '⚠️ Introuvables — à chercher ailleurs'),
          h('ul', { class: 'shop-list' }, missing.sort(byName).map(itemRow)),
        ),
      );
    }

    const bySection = new Map();
    for (const it of todo) {
      if (!bySection.has(it.section)) bySection.set(it.section, []);
      bySection.get(it.section).push(it);
    }
    const sections = [...bySection.keys()].sort((a, b) => (ORDER[a] ?? 99) - (ORDER[b] ?? 99));
    for (const s of sections) {
      blocks.push(
        h(
          'section',
          { class: 'shop-section' },
          h('h3', { class: 'section-title' }, `${sectionEmoji(s)} ${sectionLabel(s)}`),
          h('ul', { class: 'shop-list' }, bySection.get(s).sort(byName).map(itemRow)),
        ),
      );
    }
    if (items.length && !todo.length && !missing.length) {
      blocks.push(h('p', { class: 'center success-msg' }, '🎉 Tout est dans le panier !'));
    }

    if (done.length) {
      blocks.push(
        h(
          'section',
          { class: 'shop-section done-section' },
          h(
            'button',
            { class: 'section-title toggle', onClick: () => { showDone = !showDone; render(); } },
            `${showDone ? '▾' : '▸'} ✅ Dans le panier (${done.length})`,
          ),
          showDone ? h('ul', { class: 'shop-list' }, done.sort(byName).map(itemRow)) : null,
        ),
      );
    }

    if (items.length) {
      blocks.push(
        h(
          'div',
          { class: 'list-actions' },
          done.length
            ? h('button', { class: 'btn', onClick: () => removeMany((i) => i.status === 'done', `Retirer les ${done.length} article(s) déjà dans le panier ?\nLes introuvables restent dans la liste.`) }, '🧹 Courses finies : retirer les cochés')
            : null,
          h('button', { class: 'btn ghost danger', onClick: () => removeMany(() => true, 'Vider toute la liste de courses ?') }, 'Vider la liste'),
        ),
      );
    }

    content.replaceChildren(...blocks);
  }

  function openCatalog() {
    let section = '';
    let query = '';
    const results = h('div', { class: 'catalog-results' });
    const search = h('input', { type: 'search', class: 'search', placeholder: '🔎 Rechercher (gel douche, pâtes, croquettes…)', onInput: debounce((e) => { query = e.target.value; renderResults(); }, 120) });
    const tabs = h(
      'div',
      { class: 'chips scroll' },
      [{ id: '', label: 'Tout', emoji: '✨' }, ...SECTIONS.filter((s) => s.id !== 'autre')].map((s) =>
        h(
          'button',
          {
            type: 'button',
            class: `chip ${s.id === section ? 'active' : ''}`,
            onClick: (e) => {
              section = s.id;
              tabs.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
              e.currentTarget.classList.add('active');
              renderResults();
            },
          },
          `${s.emoji} ${s.label}`,
        ),
      ),
    );

    const inList = (name) => items.some((i) => i.status !== 'done' && ingredientKey(i.name) === ingredientKey(name));

    function renderResults() {
      let list = query ? searchCatalog(query, 200) : CATALOG;
      if (section) list = list.filter((c) => c.section === section);
      if (!query && !section) list = list.slice(0, 0); // pas de liste géante par défaut
      const grouped = new Map();
      for (const c of list) {
        if (!grouped.has(c.section)) grouped.set(c.section, []);
        grouped.get(c.section).push(c);
      }
      const blocks = [];
      if (!query && !section) blocks.push(h('p', { class: 'muted center' }, 'Choisis un rayon ou tape un article.'));
      for (const [s, arr] of grouped) {
        blocks.push(h('h4', { class: 'section-title' }, `${sectionEmoji(s)} ${sectionLabel(s)}`));
        blocks.push(
          h(
            'div',
            { class: 'catalog-items' },
            arr.map((c) =>
              h(
                'button',
                {
                  type: 'button',
                  class: `catalog-item ${inList(c.name) ? 'added' : ''}`,
                  onClick: async (e) => {
                    const btn = e.currentTarget;
                    if (inList(c.name)) return toast('Déjà dans la liste');
                    btn.classList.add('added');
                    const ok = await addItem(c.name, '', c.section);
                    if (!ok) btn.classList.remove('added');
                  },
                },
                c.name,
              ),
            ),
          ),
        );
      }
      if (query && !list.length) {
        blocks.push(
          h('p', { class: 'muted center' }, 'Pas dans le catalogue. ',
            h('button', { class: 'link', onClick: async () => { await addItem(query.trim()); search.value = ''; query = ''; renderResults(); } }, `Ajouter « ${query.trim()} »`)),
        );
      }
      results.replaceChildren(...blocks);
    }

    modal('Catalogue', h('div', { class: 'catalog' }, search, tabs, results), { wide: true });
    renderResults();
    setTimeout(() => search.focus(), 50);
  }

  await load();

  // Temps réel : si l'autre personne coche un article, la liste se met à jour
  const reload = debounce(load, 400);
  const channel = sb
    .channel(`shopping-${hid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `household_id=eq.${hid}` }, reload)
    .subscribe();
  return () => sb.removeChannel(channel);
}

const byName = (a, b) => a.name.localeCompare(b.name, 'fr');
