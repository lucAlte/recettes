import { sb, check, imageUrl, avatarUrl } from '../supa.js';
import { state } from '../state.js';
import { normalize } from '../catalog.js';
import { formatQty, scale } from '../units.js';
import {
  h, toast, errorToast, debounce, LABELS, MEAL_EMOJI, coursesOf, formatMinutes, totalMinutes,
  recipeImage, avatar, avatarStack, formatCode,
} from '../ui.js';

const blocked = (root) =>
  root.replaceChildren(
    h('div', { class: 'empty' },
      h('div', { class: 'empty-icon' }, '🔒'),
      h('p', {}, 'L’Explorer est réservé aux espaces validés.'),
      h('a', { class: 'btn', href: '#/recettes' }, '← Mes recettes')),
  );

/** Catalogue partagé : toutes les recettes des espaces validés, une seule fois chacune */
export async function exploreView(root) {
  if (state.household.status !== 'approved') return blocked(root);

  let list = [];
  let q = '';
  let meal = '';
  let hideMine = false;

  const grid = h('div', { class: 'recipe-grid' });
  const count = h('p', { class: 'muted small' });

  const mealChips = h('div', { class: 'chips scroll meal-chips' },
    [['', '✨', 'Tout'], ...Object.entries(LABELS.meals).map(([id, l]) => [id, MEAL_EMOJI[id], l])].map(([id, emoji, label]) =>
      h('button', {
        type: 'button', class: `chip ${id === meal ? 'active' : ''}`,
        onClick: (e) => {
          meal = id;
          mealChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
          e.currentTarget.classList.add('active');
          render();
        },
      }, `${emoji} ${label}`)));

  root.replaceChildren(
    h('a', { class: 'back', href: '#/recettes' }, '← Mes recettes'),
    h('div', { class: 'page-head' }, h('h1', {}, '🌍 Explorer')),
    h('p', { class: 'muted' }, 'Les recettes de tous les espaces validés. Ajoute celles qui te tentent à ton carnet.'),
    h('input', {
      type: 'search', class: 'search', placeholder: '🔎 Recette, ingrédient ou code (ex : 12345)',
      onInput: debounce((e) => { q = e.target.value; render(); }, 150),
    }),
    mealChips,
    h('label', { class: 'row gap small muted', style: { marginBottom: '0.75rem', cursor: 'pointer' } },
      h('input', { type: 'checkbox', onChange: (e) => { hideMine = e.target.checked; render(); } }),
      'Masquer les recettes que j’ai déjà'),
    count,
    grid,
  );

  function render() {
    const nq = normalize(q.replace('#', ''));
    const items = list.filter((r) => {
      if (hideMine && r.mine_id) return false;
      if (meal && !(r.meals || []).includes(meal)) return false;
      if (nq) {
        if (/^\d{1,5}$/.test(nq)) return String(r.share_code).startsWith(nq);
        const hay = normalize(`${r.title} ${r.ingredient_names || ''}`);
        if (!nq.split(' ').every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    count.textContent = `${items.length} recette${items.length > 1 ? 's' : ''}`;
    grid.replaceChildren(...(items.length ? items.map(card) : [h('p', { class: 'empty muted' }, 'Aucune recette ne correspond.')]));
  }

  try {
    list = check(await sb.rpc('community_recipes', { p_household: state.household.id })) || [];
    render();
  } catch (e) {
    errorToast(e);
  }
}

function card(r) {
  const t = totalMinutes(r);
  return h('a', { class: 'recipe-card', href: `#/explorer/${r.share_code}` },
    h('div', { class: 'recipe-card-img' },
      recipeImage(imageUrl(r.image_path), r.category),
      r.mine_id ? h('span', { class: 'card-badge ok' }, '✓ Dans mes recettes') : null,
      h('span', { class: 'card-code' }, formatCode(r.share_code))),
    h('div', { class: 'recipe-card-body' },
      h('h3', {}, r.title),
      h('div', { class: 'meta' },
        t != null ? h('span', {}, '⏱ ', formatMinutes(t)) : null,
        r.difficulty ? h('span', {}, LABELS.difficulty[r.difficulty]) : null),
      h('div', { class: 'card-foot' },
        avatarStack(r.owners, avatarUrl, { max: 3, size: 24 }),
        r.owner_count > 1 ? h('span', { class: 'muted small' }, `${r.owner_count} pers.`) : null)));
}

/** Aperçu d'une recette du catalogue + ajout à mon carnet */
export async function exploreRecipeView(root, { code }) {
  if (state.household.status !== 'approved') return blocked(root);
  let r;
  try {
    r = check(await sb.rpc('community_recipe', { p_household: state.household.id, p_code: Number(code) }));
  } catch (e) {
    errorToast(e);
  }
  if (!r) {
    root.replaceChildren(h('div', { class: 'empty' }, h('p', {}, 'Recette introuvable.'), h('a', { class: 'btn', href: '#/explorer' }, '← Explorer')));
    return;
  }

  const add = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const id = check(await sb.rpc('copy_community_recipe', { p_household: state.household.id, p_code: Number(code) }));
      toast('Ajoutée à tes recettes ✅ (statut « à tester »)', 'success');
      location.hash = `#/recettes/${id}`;
    } catch (err) {
      errorToast(err);
      btn.disabled = false;
    }
  };

  const owners = r.owners || [];
  root.replaceChildren(
    h('a', { class: 'back', href: '#/explorer' }, '← Explorer'),
    h('article', { class: 'recipe' },
      h('div', { class: 'recipe-hero' }, recipeImage(imageUrl(r.image_path), r.category, 'hero-img')),
      h('div', { class: 'recipe-head' },
        h('h1', {}, r.title),
        h('p', { class: 'muted small' }, `Code recette ${formatCode(r.share_code)}`),
        r.description ? h('p', { class: 'lead' }, r.description) : null,
        h('div', { class: 'pills' },
          ...coursesOf(r).map((c) => h('span', { class: 'pill' }, LABELS.courses[c] || c)),
          r.family ? h('span', { class: 'pill' }, LABELS.family[r.family] || r.family) : null,
          ...(r.meals || []).map((m) => h('span', { class: 'pill' }, `${MEAL_EMOJI[m] || ''} ${LABELS.meals[m] || m}`)),
          r.prep_minutes != null ? h('span', { class: 'pill' }, '🔪 ', formatMinutes(r.prep_minutes)) : null,
          r.cook_minutes != null ? h('span', { class: 'pill' }, '🔥 ', formatMinutes(r.cook_minutes)) : null,
          ...(r.diets || []).map((d) => h('span', { class: 'pill green' }, LABELS.diets[d] || d))),
        h('div', { class: 'owners' },
          h('span', { class: 'muted small' }, 'Dans le carnet de'),
          h('div', { class: 'owners-list' }, owners.map((o) => h('span', { class: 'owner' }, avatar(o.name, avatarUrl(o.avatar), 30), o.name)))),
        h('div', { class: 'actions' },
          r.mine_id
            ? h('a', { class: 'btn primary', href: `#/recettes/${r.mine_id}` }, '✓ Déjà dans mes recettes — ouvrir')
            : h('button', { class: 'btn primary', onClick: add }, '➕ Ajouter à mes recettes'),
          r.source_url ? h('a', { class: 'btn ghost', href: r.source_url, target: '_blank', rel: 'noopener' }, '▶️ Vidéo') : null)),
      h('div', { class: 'recipe-body' },
        h('section', { class: 'card-box ingredients-box' },
          h('h2', {}, `Ingrédients `, h('span', { class: 'muted small' }, `(${r.servings} portions)`)),
          (r.ingredients || []).length
            ? h('ul', { class: 'ingredients' }, r.ingredients.map((i) =>
                h('li', {}, h('span', { class: 'qty' }, formatQty(scale(i.quantity, 1), i.unit)),
                  h('span', {}, i.name, i.note ? h('span', { class: 'muted' }, ` — ${i.note}`) : null))))
            : h('p', { class: 'muted' }, 'Aucun ingrédient renseigné.')),
        h('section', { class: 'card-box' },
          h('h2', {}, 'Préparation'),
          (r.steps || []).length ? h('ol', { class: 'steps' }, r.steps.map((s) => h('li', {}, s))) : h('p', { class: 'muted' }, 'Aucune étape renseignée.'),
          r.tips ? h('div', { class: 'tips' }, h('strong', {}, '💡 Astuce : '), r.tips) : null))),
  );
}
