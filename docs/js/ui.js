// Petits utilitaires d'interface (sans framework)

const DEFERRED = ['value', 'checked', 'selected', 'disabled', 'indeterminate'];

/** h('div', { class: 'x', onClick: fn }, enfant1, [enfants]…) */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  const deferred = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (DEFERRED.includes(k)) deferred[k] = v;
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  for (const [k, v] of Object.entries(deferred)) el[k] = v;
  return el;
}

export function toast(message, type = 'info') {
  const box = document.getElementById('toasts');
  const t = h('div', { class: `toast ${type}` }, message);
  box.append(t);
  setTimeout(() => t.classList.add('out'), 2800);
  setTimeout(() => t.remove(), 3200);
}

export function errorToast(e) {
  console.error(e);
  toast(e?.message || String(e), 'error');
}

/** Ouvre une fenêtre modale. Retourne { close }. */
export function modal(title, body, { wide = false, onClose } = {}) {
  const close = () => {
    overlay.remove();
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => e.key === 'Escape' && close();
  const overlay = h(
    'div',
    { class: 'overlay', onClick: (e) => e.target === overlay && close() },
    h(
      'div',
      { class: `modal ${wide ? 'wide' : ''}`, role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'modal-head' }, h('h2', {}, title), h('button', { class: 'icon-btn', 'aria-label': 'Fermer', onClick: close }, '✕')),
      h('div', { class: 'modal-body' }, body),
    ),
  );
  document.body.append(overlay);
  document.body.classList.add('no-scroll');
  document.addEventListener('keydown', onKey);
  return { close };
}

/** Étoiles de notation (1 à 5). onChange(null) si on reclique sur la note actuelle. */
export function stars(value, onChange, { size = '' } = {}) {
  const wrap = h('div', { class: `stars ${size} ${onChange ? 'editable' : ''}`, title: value ? `${value}/5` : 'Pas encore notée' });
  const render = (v) => {
    wrap.replaceChildren(
      ...[1, 2, 3, 4, 5].map((n) =>
        h(
          onChange ? 'button' : 'span',
          {
            type: onChange ? 'button' : null,
            class: n <= (v || 0) ? 'on' : '',
            'aria-label': onChange ? `${n} étoile${n > 1 ? 's' : ''}` : null,
            onClick: onChange
              ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const next = n === v ? null : n;
                  value = next;
                  render(next);
                  onChange(next);
                }
              : null,
          },
          '★',
        ),
      ),
    );
  };
  render(value);
  return wrap;
}

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function stepper(value, { min = 1, max = 50, onChange } = {}) {
  const out = h('span', { class: 'stepper-value' }, value);
  const set = (v) => {
    value = Math.min(max, Math.max(min, v));
    out.textContent = value;
    onChange?.(value);
  };
  return h(
    'div',
    { class: 'stepper' },
    h('button', { type: 'button', 'aria-label': 'Moins', onClick: () => set(value - 1) }, '−'),
    out,
    h('button', { type: 'button', 'aria-label': 'Plus', onClick: () => set(value + 1) }, '+'),
  );
}

export const LABELS = {
  difficulty: { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' },
  category: {
    entree: 'Entrée', plat: 'Plat', dessert: 'Dessert', petit_dejeuner: 'Petit-déj', aperitif: 'Apéritif',
    accompagnement: 'Accompagnement', sauce: 'Sauce', boisson: 'Boisson', autre: 'Autre',
  },
  diets: {
    vegetarien: 'Végétarien', vegan: 'Vegan', pescetarien: 'Pescétarien', sans_gluten: 'Sans gluten',
    sans_lactose: 'Sans lactose', leger: 'Léger', proteine: 'Riche en protéines',
  },
  courses: { entree: 'Entrée', plat: 'Plat', dessert: 'Dessert', base: 'Base' },
  meals: { petit_dejeuner: 'Petit-déj', brunch: 'Brunch', dejeuner: 'Déjeuner', diner: 'Dîner', apero: 'Apéro' },
  family: {
    salades: 'Salades', soupes: 'Soupes & bouillons', pates_riz: 'Pâtes, gnocchis & riz', mijotes: 'Plats en sauce & mijotés',
    currys: 'Currys', gratins_rotis: 'Gratins & rôtis', tartinades: 'Tartinades & planches', pains_pates: 'Pains & pâtes',
    gateaux_tartes: 'Gâteaux & tartes', patisseries: 'Pâtisseries', accompagnements: 'Accompagnements',
  },
};

export const MEAL_EMOJI = { petit_dejeuner: '☕', brunch: '🥞', dejeuner: '🌞', diner: '🌙', apero: '🥂' };

/** Types d'une recette (les anciennes recettes n'ont qu'une catégorie) */
export function coursesOf(r) {
  if (r.courses?.length) return r.courses;
  return [{ entree: 'entree', plat: 'plat', dessert: 'dessert', petit_dejeuner: 'plat', aperitif: 'entree',
    accompagnement: 'base', sauce: 'base', boisson: 'base' }[r.category] || 'plat'];
}

/** Catégorie principale déduite des types (pour l'icône de repli et la compatibilité) */
export function categoryFromCourses(courses) {
  if (courses.includes('dessert')) return 'dessert';
  if (courses.includes('plat')) return 'plat';
  if (courses.includes('entree')) return 'entree';
  if (courses.includes('base')) return 'accompagnement';
  return 'autre';
}

export const CATEGORY_EMOJI = {
  entree: '🥗', plat: '🍲', dessert: '🍰', petit_dejeuner: '🥐', aperitif: '🫒',
  accompagnement: '🥔', sauce: '🥣', boisson: '🍹', autre: '🍽️',
};

export function formatMinutes(m) {
  if (m == null) return '';
  if (m < 60) return `${m} min`;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${hh} h ${String(mm).padStart(2, '0')}` : `${hh} h`;
}

export function totalMinutes(r) {
  if (r.prep_minutes == null && r.cook_minutes == null) return null;
  return (r.prep_minutes || 0) + (r.cook_minutes || 0);
}

/** Image de recette avec repli élégant si absente/cassée */
export function recipeImage(url, category, cls = '') {
  const fallback = h('div', { class: `img-fallback ${cls}` }, CATEGORY_EMOJI[category] || '🍽️');
  if (!url) return fallback;
  const img = h('img', { class: cls, src: url, alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.replaceWith(fallback));
  return img;
}

/** Redimensionne une photo (max 1400 px, JPEG) avant envoi */
export async function resizeImage(file, max = 1400) {
  try {
    const bmp = await createImageBitmap(file);
    const ratio = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * ratio);
    canvas.height = Math.round(bmp.height * ratio);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (blob) return blob;
  } catch (e) {
    console.warn('Redimensionnement impossible, envoi du fichier original', e);
  }
  return file;
}

export function timeAgo(date) {
  const s = (Date.now() - new Date(date).getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
