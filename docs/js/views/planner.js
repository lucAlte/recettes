import { sb, check, imageUrl } from '../supa.js';
import { state, getPlan, setPlan } from '../state.js';
import { SECTIONS, sectionLabel, sectionEmoji, normalize } from '../catalog.js';
import { aggregateIngredients, formatQty, ingredientKey } from '../units.js';
import { h, stepper, toast, errorToast, recipeImage, debounce } from '../ui.js';

/**
 * Préparer les courses :
 * 1) je coche des recettes + nombre de portions
 * 2) je vois la liste agrégée, je décoche ce que j'ai déjà
 * 3) j'ajoute à ma liste de courses (fusion avec l'existant)
 */
export async function plannerView(root) {
  let recipes = [];
  try {
    recipes = check(
      await sb
        .from('recipes')
        .select('id, title, image_path, category, servings, ingredients')
        .eq('household_id', state.household.id)
        .order('title'),
    );
  } catch (e) {
    errorToast(e);
  }
  const plan = getPlan();
  // nettoie les recettes supprimées
  for (const id of Object.keys(plan)) if (!recipes.find((r) => r.id === id)) delete plan[id];
  setPlan(plan);

  stepSelect();

  function stepSelect() {
    document.body.classList.remove('task-mode');
    const list = h('div', { class: 'plan-list' });
    const fabSlot = h('div');
    const clearLink = h('button', { class: 'link small' }, 'Tout décocher');
    let query = '';

    // Bouton flottant au-dessus de la navigation, visible dès qu'une recette est cochée
    const refreshFooter = () => {
      const n = Object.keys(plan).length;
      clearLink.style.display = n ? '' : 'none';
      fabSlot.replaceChildren(
        n
          ? h(
              'div',
              { class: 'fab' },
              h('span', {}, `${n} recette${n > 1 ? 's' : ''}`),
              h('button', { class: 'btn primary', onClick: () => stepReview() }, 'Générer la liste →'),
            )
          : '',
      );
    };
    clearLink.onclick = () => {
      for (const k of Object.keys(plan)) delete plan[k];
      setPlan(plan);
      render();
      refreshFooter();
    };

    const render = () => {
      const q = normalize(query);
      const sorted = [...recipes]
        .filter((r) => !q || normalize(r.title).includes(q))
        .sort((a, b) => (plan[b.id] ? 1 : 0) - (plan[a.id] ? 1 : 0));
      list.replaceChildren(
        ...sorted.map((r) => {
          const selected = plan[r.id] != null;
          const portions = h('div', { class: 'plan-portions' });
          if (selected) {
            portions.append(
              h('span', { class: 'muted small' }, 'Portions'),
              stepper(plan[r.id], { onChange: (v) => { plan[r.id] = v; setPlan(plan); } }),
            );
          }
          return h(
            'div',
            { class: `plan-item ${selected ? 'selected' : ''}` },
            h(
              'label',
              { class: 'plan-main' },
              h('input', {
                type: 'checkbox',
                checked: selected,
                onChange: (e) => {
                  if (e.target.checked) plan[r.id] = r.servings || 2;
                  else delete plan[r.id];
                  setPlan(plan);
                  render();
                  refreshFooter();
                },
              }),
              h('div', { class: 'plan-thumb' }, recipeImage(imageUrl(r.image_path), r.category)),
              h('span', { class: 'plan-title' }, r.title, h('small', { class: 'muted' }, ` · ${r.ingredients?.length || 0} ingr.`)),
            ),
            portions,
          );
        }),
      );
      if (!recipes.length) list.append(h('p', { class: 'empty muted' }, "Ajoute d'abord des recettes."));
    };

    root.replaceChildren(
      h('div', { class: 'page-head' }, h('h1', {}, 'Préparer les courses'), h('a', { class: 'btn ghost', href: '#/courses' }, 'Ma liste →')),
      h('div', { class: 'row gap wrap', style: { justifyContent: 'space-between' } },
        h('p', { class: 'muted', style: { margin: 0 } }, 'Coche les recettes et choisis les portions.'),
        clearLink),
      h('input', { type: 'search', class: 'search', style: { marginTop: '0.75rem' }, placeholder: '🔎 Filtrer les recettes…', onInput: debounce((e) => { query = e.target.value; render(); }, 120) }),
      list,
      fabSlot,
    );
    render();
    refreshFooter();
  }

  function stepReview() {
    const entries = [];
    for (const [id, portions] of Object.entries(plan)) {
      const r = recipes.find((x) => x.id === id);
      if (!r) continue;
      const factor = portions / (r.servings || 1);
      for (const i of r.ingredients || []) entries.push({ ...i, factor, recipeTitle: r.title });
    }
    const items = aggregateIngredients(entries).map((it) => ({ ...it, keep: true }));
    const order = Object.fromEntries(SECTIONS.map((s, i) => [s.id, i]));
    items.sort((a, b) => (order[a.section] ?? 99) - (order[b.section] ?? 99) || a.name.localeCompare(b.name, 'fr'));

    const count = h('span');
    const addBtn = h('button', { class: 'btn primary' });
    const refresh = () => {
      const n = items.filter((i) => i.keep).length;
      count.textContent = `(${n}/${items.length} à acheter)`;
      addBtn.textContent = `🛒 Ajouter ${n} article${n > 1 ? 's' : ''}`;
      addBtn.disabled = !n;
    };

    const groups = [];
    let current = null;
    for (const it of items) {
      if (it.section !== current) {
        current = it.section;
        groups.push(h('h3', { class: 'section-title' }, `${sectionEmoji(current)} ${sectionLabel(current)}`));
      }
      groups.push(
        h(
          'label',
          { class: 'review-item' },
          h('input', { type: 'checkbox', checked: true, onChange: (e) => { it.keep = e.target.checked; refresh(); } }),
          h(
            'span',
            { class: 'review-text' },
            h('strong', {}, it.name),
            ' ',
            h('span', { class: 'qty' }, formatQty(it.quantity, it.unit)),
            h('small', { class: 'muted block' }, it.recipe_titles.join(', ')),
          ),
        ),
      );
    }

    addBtn.onclick = async () => {
      addBtn.disabled = true;
      try {
        const n = await mergeIntoShoppingList(items.filter((i) => i.keep));
        for (const k of Object.keys(plan)) delete plan[k];
        setPlan(plan);
        toast(`${n} article${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} à ta liste ✅`, 'success');
        location.hash = '#/courses';
      } catch (e) {
        errorToast(e);
        addBtn.disabled = false;
      }
    };

    document.body.classList.add('task-mode');
    window.scrollTo(0, 0);
    root.replaceChildren(
      h('button', { class: 'back', onClick: () => stepSelect() }, '← Modifier la sélection'),
      h('h1', {}, 'Vérifie ta liste'),
      h('p', { class: 'muted' }, 'Décoche ce que tu as déjà à la maison. ', count),
      items.length ? h('div', { class: 'card-box review' }, groups) : h('p', { class: 'empty muted' }, 'Ces recettes ne contiennent aucun ingrédient.'),
      h(
        'div',
        { class: 'action-bar' },
        h('div', { class: 'action-bar-inner' }, h('button', { class: 'btn ghost', onClick: () => stepSelect() }, 'Retour'), addBtn),
      ),
    );
    refresh();
  }
}

/** Fusionne des articles dans la liste (additionne les quantités des doublons non achetés) */
export async function mergeIntoShoppingList(items) {
  const hid = state.household.id;
  const existing = check(
    await sb.from('shopping_items').select('id, name, quantity, unit, recipe_titles, status').eq('household_id', hid).neq('status', 'done'),
  );
  const index = new Map(existing.map((e) => [ingredientKey(e.name) + '|' + (e.unit || ''), e]));
  const inserts = [];
  const updates = [];
  for (const it of items) {
    const e = index.get(ingredientKey(it.name) + '|' + (it.unit || ''));
    if (e) {
      updates.push({
        id: e.id,
        quantity: e.quantity == null && it.quantity == null ? null : Number(e.quantity || 0) + Number(it.quantity || 0),
        recipe_titles: [...new Set([...(e.recipe_titles || []), ...(it.recipe_titles || [])])],
      });
    } else {
      inserts.push({
        household_id: hid,
        name: it.name,
        quantity: it.quantity,
        unit: it.unit || '',
        section: it.section || 'autre',
        source: 'recipe',
        recipe_titles: it.recipe_titles || [],
      });
    }
  }
  if (inserts.length) check(await sb.from('shopping_items').insert(inserts));
  for (const u of updates) {
    check(await sb.from('shopping_items').update({ quantity: u.quantity, recipe_titles: u.recipe_titles }).eq('id', u.id));
  }
  return inserts.length + updates.length;
}
