import { sb, check, imageUrl } from '../supa.js';
import { state } from '../state.js';
import { normalize } from '../catalog.js';
import { h, debounce, LABELS, OCCASIONS, MEAL_EMOJI, coursesOf, formatMinutes, totalMinutes, recipeImage, errorToast } from '../ui.js';

const FILTER_KEY = 'recettes:filters';
const DEFAULTS = { q: '', meal: '', course: '', family: '', tested: '', difficulty: '', time: '', diets: [], occasion: '', sort: 'recent' };

function loadFilters() {
  try {
    return { ...DEFAULTS, ...JSON.parse(sessionStorage.getItem(FILTER_KEY)) };
  } catch {
    return { ...DEFAULTS };
  }
}

const TIME_OPTIONS = [
  ['', 'Tous les temps'],
  ['15', '≤ 15 min'],
  ['30', '≤ 30 min'],
  ['45', '≤ 45 min'],
  ['60', '≤ 1 h'],
  ['61', '> 1 h'],
];
const SORT_OPTIONS = [
  ['recent', 'Plus récentes'],
  ['time', 'Plus rapides'],
  ['alpha', 'A → Z'],
];

export async function recipesView(root) {
  const f = loadFilters();
  const save = () => sessionStorage.setItem(FILTER_KEY, JSON.stringify(f));
  let recipes = [];

  const select = (key, options) =>
    h(
      'select',
      { value: f[key], onChange: (e) => { f[key] = e.target.value; apply(); } },
      options.map(([v, l]) => h('option', { value: v }, l)),
    );

  const search = h('input', {
    type: 'search',
    class: 'search',
    placeholder: '🔎 Rechercher une recette ou un ingrédient…',
    value: f.q,
    onInput: debounce((e) => { f.q = e.target.value; apply(); }, 150),
  });

  const dietChips = h(
    'div',
    { class: 'chips' },
    Object.entries(LABELS.diets).map(([id, label]) =>
      h(
        'button',
        {
          type: 'button',
          class: `chip ${f.diets.includes(id) ? 'active' : ''}`,
          onClick: (e) => {
            f.diets = f.diets.includes(id) ? f.diets.filter((d) => d !== id) : [...f.diets, id];
            e.currentTarget.classList.toggle('active');
            apply();
          },
        },
        label,
      ),
    ),
  );

  // Filtre rapide par repas, toujours visible (« qu'est-ce qu'on mange ce soir ? »)
  const mealChips = h(
    'div',
    { class: 'chips scroll meal-chips' },
    [['', '✨', 'Tout'], ...Object.entries(LABELS.meals).map(([id, l]) => [id, MEAL_EMOJI[id], l])].map(([id, emoji, label]) =>
      h(
        'button',
        {
          type: 'button',
          class: `chip ${f.meal === id ? 'active' : ''}`,
          onClick: (e) => {
            f.meal = id;
            mealChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            apply();
          },
        },
        `${emoji} ${label}`,
      ),
    ),
  );

  // Filtre « Occasion » : n'apparaît que si au moins une recette a une occasion renseignée
  const occasionField = h('label', { class: 'field', style: { display: 'none' } }, 'Occasion',
    select('occasion', [['', 'Toutes'], ...Object.entries(OCCASIONS)]));

  const filterCount = h('span', { class: 'badge' });
  const details = h(
    'details',
    { class: 'filters', open: window.innerWidth > 900 ? true : null },
    h('summary', {}, '⚙️ Filtres ', filterCount),
    h(
      'div',
      { class: 'filters-grid' },
      h('label', { class: 'field' }, 'Type', select('course', [['', 'Tous'], ...Object.entries(LABELS.courses)])),
      h('label', { class: 'field' }, 'Famille', select('family', [['', 'Toutes'], ...Object.entries(LABELS.family)])),
      h('label', { class: 'field' }, 'Statut', select('tested', [['', 'Toutes'], ['yes', '✅ Testées'], ['no', '🧪 À tester']])),
      h('label', { class: 'field' }, 'Difficulté', select('difficulty', [['', 'Toutes'], ...Object.entries(LABELS.difficulty)])),
      h('label', { class: 'field' }, 'Temps total', select('time', TIME_OPTIONS)),
      occasionField,
      h('label', { class: 'field' }, 'Trier par', select('sort', SORT_OPTIONS)),
    ),
    h('div', { class: 'field' }, h('span', {}, 'Régime'), dietChips),
    h(
      'button',
      {
        type: 'button',
        class: 'link small',
        onClick: () => {
          sessionStorage.removeItem(FILTER_KEY);
          recipesView(root);
        },
      },
      'Réinitialiser les filtres',
    ),
  );

  const count = h('p', { class: 'muted small' });
  const grid = h('div', { class: 'recipe-grid' });
  const importsBox = h('div');

  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h('h1', {}, 'Mes recettes'),
      h('a', { class: 'btn primary', href: '#/recettes/nouvelle' }, '+ Nouvelle'),
    ),
    importsBox,
    search,
    mealChips,
    details,
    count,
    grid,
  );

  function apply() {
    save();
    const q = normalize(f.q);
    let list = recipes.filter((r) => {
      if (f.meal && !(r.meals || []).includes(f.meal)) return false;
      if (f.course && !coursesOf(r).includes(f.course)) return false;
      if (f.family && r.family !== f.family) return false;
      if (f.tested === 'yes' && r.tested === false) return false;
      if (f.tested === 'no' && r.tested !== false) return false;
      if (f.difficulty && r.difficulty !== f.difficulty) return false;
      if (f.time) {
        const t = totalMinutes(r);
        if (t == null) return false;
        if (f.time === '61' ? t <= 60 : t > Number(f.time)) return false;
      }
      if (f.occasion && !(r.occasions || []).includes(f.occasion)) return false;
      if (f.diets.length && !f.diets.every((d) => (r.diets || []).includes(d))) return false;
      if (q) {
        const hay = normalize(r.title + ' ' + (r.ingredients || []).map((i) => i.name).join(' '));
        if (!q.split(' ').every((w) => hay.includes(w))) return false;
      }
      return true;
    });

    const by = {
      recent: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      time: (a, b) => (totalMinutes(a) ?? 9999) - (totalMinutes(b) ?? 9999),
      alpha: (a, b) => a.title.localeCompare(b.title, 'fr'),
    }[f.sort];
    list = list.sort(by);

    const active = ['course', 'family', 'tested', 'difficulty', 'time', 'occasion'].filter((k) => f[k]).length + f.diets.length;
    filterCount.textContent = active ? active : '';
    filterCount.style.display = active ? '' : 'none';
    count.textContent = `${list.length} recette${list.length > 1 ? 's' : ''}${list.length !== recipes.length ? ` sur ${recipes.length}` : ''}`;

    if (!recipes.length) {
      grid.replaceChildren(
        h(
          'div',
          { class: 'empty' },
          h('div', { class: 'empty-icon' }, '📖'),
          h('p', {}, 'Aucune recette pour le moment.'),
          h('p', { class: 'muted small' }, 'Partage un Reel au bot Telegram ou ajoute une recette à la main.'),
          h('a', { class: 'btn primary', href: '#/recettes/nouvelle' }, '+ Ajouter une recette'),
        ),
      );
      return;
    }
    grid.replaceChildren(...(list.length ? list.map(card) : [h('p', { class: 'empty muted' }, 'Aucune recette ne correspond à ces filtres.')]));
  }

  try {
    recipes = check(
      await sb
        .from('recipes')
        .select('id, title, image_path, category, courses, meals, family, tested, difficulty, prep_minutes, cook_minutes, diets, occasions, created_at, ingredients')
        .eq('household_id', state.household.id),
    );
    const hasOccasions = recipes.some((r) => r.occasions?.length);
    occasionField.style.display = hasOccasions ? '' : 'none';
    if (!hasOccasions) f.occasion = '';
    apply();
  } catch (e) {
    errorToast(e);
  }
  renderImports(importsBox);
}

function card(r) {
  const t = totalMinutes(r);
  return h(
    'a',
    { class: 'recipe-card', href: `#/recettes/${r.id}` },
    h(
      'div',
      { class: 'recipe-card-img' },
      recipeImage(imageUrl(r.image_path), r.category),
      r.tested === false ? h('span', { class: 'card-badge' }, '🧪 À tester') : null,
    ),
    h(
      'div',
      { class: 'recipe-card-body' },
      h('h3', {}, r.title),
      h(
        'div',
        { class: 'meta' },
        t != null ? h('span', {}, '⏱ ', formatMinutes(t)) : null,
        r.difficulty ? h('span', {}, LABELS.difficulty[r.difficulty]) : null,
      ),
      h(
        'div',
        { class: 'card-foot' },
        (r.occasions || []).includes('quotidien') ? h('span', { class: 'tag' }, '🏠 Quotidien') : h('span'),
        (r.diets || []).includes('vegan') ? h('span', { class: 'tag green' }, 'Vegan') : (r.diets || []).includes('vegetarien') ? h('span', { class: 'tag green' }, 'Végé') : null,
      ),
    ),
  );
}

async function renderImports(box) {
  const { data } = await sb
    .from('import_queue')
    .select('status')
    .eq('household_id', state.household.id)
    .in('status', ['pending', 'processing', 'error']);
  if (!data?.length) return;
  const n = (s) => data.filter((r) => r.status === s).length;
  const waiting = n('pending') + n('processing');
  const errors = n('error');
  box.replaceChildren(
    h(
      'a',
      { class: 'banner', href: '#/reglages' },
      waiting ? `⏳ ${waiting} vidéo${waiting > 1 ? 's' : ''} en attente d'import (traitement au démarrage du PC)` : '',
      waiting && errors ? ' · ' : '',
      errors ? `⚠️ ${errors} import${errors > 1 ? 's' : ''} en erreur` : '',
      h('span', { class: 'banner-link' }, 'Voir →'),
    ),
  );
}
