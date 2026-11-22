import { sb, check, imageUrl, BUCKET } from '../supa.js';
import { state, getPlan, setPlan } from '../state.js';
import { formatQty, scale } from '../units.js';
import { h, stepper, OCCASIONS, toast, errorToast, LABELS, MEAL_EMOJI, coursesOf, formatMinutes, recipeImage } from '../ui.js';

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
    r.tested === false ? h('span', { class: 'pill warn' }, '🧪 À tester') : null,
    ...coursesOf(r).map((c) => h('span', { class: 'pill' }, LABELS.courses[c] || c)),
    r.family ? h('span', { class: 'pill' }, LABELS.family[r.family] || r.family) : null,
    ...(r.occasions || []).map((o) => h('span', { class: 'pill accent' }, OCCASIONS[o] || o)),
    ...(r.meals || []).map((m) => h('span', { class: 'pill' }, `${MEAL_EMOJI[m] || ''} ${LABELS.meals[m] || m}`)),
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
        r.description ? h('p', { class: 'lead' }, r.description) : null,
        h('div', { class: 'pills' }, pills),
        h(
          'div',
          { class: 'actions' },
          h('button', { class: 'btn primary', onClick: addToShopping }, '🛒 Ajouter aux courses'),
          h('a', { class: 'btn', href: `#/recettes/${r.id}/modifier` }, '✏️ Modifier'),
          r.tested === false
            ? h('button', {
                class: 'btn',
                onClick: async (e) => {
                  try {
                    check(await sb.from('recipes').update({ tested: true }).eq('id', r.id));
                    toast('Recette marquée comme testée ✅', 'success');
                    recipeView(root, { id: r.id });
                  } catch (err) { errorToast(err); }
                },
              }, '✅ Testée')
            : null,
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
