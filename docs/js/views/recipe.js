import { sb, check, imageUrl, BUCKET } from '../supa.js';
import { state, getPlan, setPlan } from '../state.js';
import { formatQty, scale } from '../units.js';
import { h, stars, stepper, toast, errorToast, LABELS, formatMinutes, recipeImage } from '../ui.js';

/** Fiche recette : ingrédients (avec portions ajustables) puis étapes */
export async function recipeView(root, { id }) {
  let r;
  try {
    r = check(await sb.from('recipes').select('*').eq('id', id).single());
  } catch (e) {
    root.replaceChildren(h('div', { class: 'empty' }, h('p', {}, 'Recette introuvable.'), h('a', { class: 'btn', href: '#/recettes' }, '← Retour')));
    return;
  }

  let portions = r.servings || 2;
  const ingList = h('ul', { class: 'ingredients' });

  const renderIngredients = () => {
    const factor = portions / (r.servings || 1);
    ingList.replaceChildren(
      ...(r.ingredients || []).map((i) => {
        const qty = formatQty(scale(i.quantity, factor), i.unit);
        return h(
          'li',
          {},
          h('span', { class: 'qty' }, qty),
          h('span', {}, i.name, i.note ? h('span', { class: 'muted' }, ` — ${i.note}`) : null),
        );
      }),
    );
    if (!r.ingredients?.length) ingList.append(h('li', { class: 'muted' }, 'Aucun ingrédient renseigné.'));
  };
  renderIngredients();

  const rate = async (v) => {
    try {
      check(await sb.from('recipes').update({ rating: v }).eq('id', r.id));
      toast(v ? `Notée ${v}/5` : 'Note retirée', 'success');
    } catch (e) {
      errorToast(e);
    }
  };

  const addToShopping = () => {
    const plan = getPlan();
    plan[r.id] = portions;
    setPlan(plan);
    toast(`Ajoutée à la préparation des courses (${portions} portions)`, 'success');
    location.hash = '#/preparer';
  };

  const remove = async () => {
    if (!confirm(`Supprimer définitivement « ${r.title} » ?`)) return;
    try {
      if (r.image_path && !/^https?:/.test(r.image_path)) await sb.storage.from(BUCKET).remove([r.image_path]);
      check(await sb.from('recipes').delete().eq('id', r.id));
      const plan = getPlan();
      delete plan[r.id];
      setPlan(plan);
      toast('Recette supprimée', 'success');
      location.hash = '#/recettes';
    } catch (e) {
      errorToast(e);
    }
  };

  const pills = [
    h('span', { class: 'pill' }, LABELS.category[r.category] || r.category),
    r.prep_minutes != null ? h('span', { class: 'pill' }, '🔪 Prépa ', formatMinutes(r.prep_minutes)) : null,
    r.cook_minutes != null ? h('span', { class: 'pill' }, '🔥 Cuisson ', formatMinutes(r.cook_minutes)) : null,
    r.difficulty ? h('span', { class: 'pill' }, '📊 ', LABELS.difficulty[r.difficulty]) : null,
    ...(r.diets || []).map((d) => h('span', { class: 'pill green' }, LABELS.diets[d] || d)),
  ];

  root.replaceChildren(
    h('a', { class: 'back', href: '#/recettes' }, '← Mes recettes'),
    h(
      'article',
      { class: 'recipe' },
      h('div', { class: 'recipe-hero' }, recipeImage(imageUrl(r.image_path), r.category, 'hero-img')),
      h(
        'div',
        { class: 'recipe-head' },
        h('h1', {}, r.title),
        stars(r.rating, rate, { size: 'large' }),
        r.description ? h('p', { class: 'lead' }, r.description) : null,
        h('div', { class: 'pills' }, pills),
        h(
          'div',
          { class: 'actions' },
          h('button', { class: 'btn primary', onClick: addToShopping }, '🛒 Ajouter aux courses'),
          h('a', { class: 'btn', href: `#/recettes/${r.id}/modifier` }, '✏️ Modifier'),
          r.source_url ? h('a', { class: 'btn ghost', href: r.source_url, target: '_blank', rel: 'noopener' }, '▶️ Vidéo') : null,
          h('button', { class: 'btn ghost danger', onClick: remove }, '🗑️'),
        ),
      ),
      h(
        'div',
        { class: 'recipe-body' },
        h(
          'section',
          { class: 'card-box ingredients-box' },
          h(
            'div',
            { class: 'section-head' },
            h('h2', {}, 'Ingrédients'),
            h('div', { class: 'portions' }, h('span', { class: 'muted small' }, 'Portions'), stepper(portions, { onChange: (v) => { portions = v; renderIngredients(); } })),
          ),
          ingList,
        ),
        h(
          'section',
          { class: 'card-box' },
          h('h2', {}, 'Préparation'),
          r.steps?.length
            ? h('ol', { class: 'steps' }, r.steps.map((s) => h('li', {}, s)))
            : h('p', { class: 'muted' }, 'Aucune étape renseignée.'),
          r.tips ? h('div', { class: 'tips' }, h('strong', {}, '💡 Astuce : '), r.tips) : null,
        ),
      ),
      r.source_author ? h('p', { class: 'muted small center' }, `Source : @${r.source_author}`) : null,
    ),
  );
}
