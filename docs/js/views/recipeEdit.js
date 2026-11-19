import { sb, check, imageUrl, BUCKET } from '../supa.js';
import { state } from '../state.js';
import { SECTIONS, guessSection } from '../catalog.js';
import { UNITS } from '../units.js';
import { h, stars, toast, errorToast, LABELS, resizeImage, recipeImage } from '../ui.js';

const EMPTY = {
  title: '', description: '', category: 'plat', difficulty: 'facile', prep_minutes: null, cook_minutes: null,
  servings: 2, diets: [], rating: null, ingredients: [], steps: [], tips: '', image_path: null, source_url: '',
};

/** Création (id absent) ou modification d'une recette */
export async function recipeEditView(root, { id } = {}) {
  const isNew = !id;
  let r = { ...EMPTY };
  if (!isNew) {
    try {
      r = check(await sb.from('recipes').select('*').eq('id', id).single());
    } catch (e) {
      errorToast(e);
      location.hash = '#/recettes';
      return;
    }
  }
  const recipeId = id || crypto.randomUUID();

  // --- Image ---
  let newImage = null; // Blob à envoyer
  let removeImage = false;
  const imgBox = h('div', { class: 'edit-img' });
  const renderImg = () => {
    const url = newImage ? URL.createObjectURL(newImage) : removeImage ? null : imageUrl(r.image_path);
    imgBox.replaceChildren(recipeImage(url, r.category, 'hero-img'));
  };
  renderImg();
  const fileInput = h('input', {
    type: 'file',
    accept: 'image/*',
    hidden: true,
    onChange: async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      newImage = await resizeImage(file);
      removeImage = false;
      renderImg();
    },
  });

  // --- Champs simples ---
  const title = h('input', { required: true, maxlength: 200, value: r.title, placeholder: 'Ex : Gratin dauphinois' });
  const description = h('textarea', { rows: 2, value: r.description, placeholder: 'Une phrase pour donner envie…' });
  const category = h('select', { value: r.category }, Object.entries(LABELS.category).map(([v, l]) => h('option', { value: v }, l)));
  const difficulty = h('select', { value: r.difficulty || '' }, [['', '—'], ...Object.entries(LABELS.difficulty)].map(([v, l]) => h('option', { value: v }, l)));
  const prep = h('input', { type: 'number', min: 0, inputmode: 'numeric', value: r.prep_minutes ?? '' });
  const cook = h('input', { type: 'number', min: 0, inputmode: 'numeric', value: r.cook_minutes ?? '' });
  const servings = h('input', { type: 'number', min: 1, max: 50, required: true, inputmode: 'numeric', value: r.servings });
  const tips = h('textarea', { rows: 2, value: r.tips || '', placeholder: 'Astuces, variantes…' });
  const source = h('input', { type: 'url', value: r.source_url || '', placeholder: 'https://…' });
  let rating = r.rating;
  const diets = new Set(r.diets || []);

  // --- Ingrédients ---
  const ingBox = h('div', { class: 'ing-rows' });
  const addIngredient = (i = { name: '', quantity: null, unit: '', section: '', note: '' }) => {
    const name = h('input', { class: 'ing-name', value: i.name, placeholder: 'Ingrédient', required: true });
    const qty = h('input', { class: 'ing-qty', type: 'number', step: 'any', min: 0, inputmode: 'decimal', value: i.quantity ?? '', placeholder: 'Qté' });
    const unit = h('select', { class: 'ing-unit', value: i.unit || '' }, UNITS.map(([v, l]) => h('option', { value: v }, l)));
    const section = h(
      'select',
      { class: 'ing-section', value: i.section || '', title: 'Rayon (pour la liste de courses)' },
      h('option', { value: '' }, 'Rayon auto'),
      SECTIONS.map((s) => h('option', { value: s.id }, `${s.emoji} ${s.label}`)),
    );
    const note = h('input', { class: 'ing-note', value: i.note || '', placeholder: 'Précision (émincé…)' });
    const row = h(
      'div',
      { class: 'ing-row' },
      qty, unit, name, note, section,
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Supprimer', onClick: () => row.remove() }, '✕'),
    );
    row.read = () => {
      const n = name.value.trim();
      if (!n) return null;
      return {
        name: n,
        quantity: qty.value === '' ? null : Number(qty.value),
        unit: unit.value,
        section: section.value || guessSection(n),
        note: note.value.trim(),
      };
    };
    ingBox.append(row);
    return row;
  };
  (r.ingredients || []).forEach(addIngredient);
  if (!r.ingredients?.length) addIngredient();

  // --- Étapes ---
  const stepBox = h('ol', { class: 'step-rows' });
  const addStep = (text = '') => {
    const ta = h('textarea', { rows: 2, value: text, placeholder: 'Décris cette étape…' });
    const li = h('li', { class: 'step-row' }, ta, h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Supprimer', onClick: () => li.remove() }, '✕'));
    li.read = () => ta.value.trim();
    stepBox.append(li);
    return ta;
  };
  (r.steps || []).forEach((s) => addStep(s));
  if (!r.steps?.length) addStep();

  const saveBtn = h('button', { class: 'btn primary', type: 'submit' }, '💾 Enregistrer');

  const form = h(
    'form',
    {
      class: 'edit-form',
      onSubmit: async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.textContent = 'Enregistrement…';
        try {
          const toInt = (el) => (el.value === '' ? null : Math.max(0, parseInt(el.value, 10)));
          const payload = {
            household_id: state.household.id,
            title: title.value.trim(),
            description: description.value.trim(),
            category: category.value,
            difficulty: difficulty.value || null,
            prep_minutes: toInt(prep),
            cook_minutes: toInt(cook),
            servings: Math.min(50, Math.max(1, toInt(servings) || 2)),
            diets: [...diets],
            rating,
            ingredients: [...ingBox.children].map((row) => row.read()).filter(Boolean),
            steps: [...stepBox.children].map((li) => li.read()).filter(Boolean),
            tips: tips.value.trim(),
            source_url: source.value.trim() || null,
          };

          const oldPath = r.image_path;
          if (newImage) {
            const path = `${state.household.id}/${recipeId}-${Date.now()}.jpg`;
            check(await sb.storage.from(BUCKET).upload(path, newImage, { contentType: newImage.type || 'image/jpeg', upsert: false }));
            payload.image_path = path;
          } else if (removeImage) {
            payload.image_path = null;
          }

          if (isNew) check(await sb.from('recipes').insert({ id: recipeId, ...payload }));
          else check(await sb.from('recipes').update(payload).eq('id', recipeId));

          // on supprime l'ancienne image du stockage si elle a été remplacée
          if ((newImage || removeImage) && oldPath && !/^https?:/.test(oldPath)) {
            await sb.storage.from(BUCKET).remove([oldPath]);
          }
          toast('Recette enregistrée ✅', 'success');
          location.hash = `#/recettes/${recipeId}`;
        } catch (err) {
          errorToast(err);
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 Enregistrer';
        }
      },
    },
    h(
      'div',
      { class: 'edit-top' },
      h(
        'div',
        {},
        imgBox,
        h(
          'div',
          { class: 'edit-img-actions' },
          h('button', { type: 'button', class: 'btn small', onClick: () => fileInput.click() }, '📷 Changer la photo'),
          h('button', { type: 'button', class: 'btn small ghost', onClick: () => { newImage = null; removeImage = true; renderImg(); } }, 'Retirer'),
          fileInput,
        ),
      ),
      h(
        'div',
        { class: 'stack' },
        h('label', { class: 'field' }, 'Titre *', title),
        h('label', { class: 'field' }, 'Description', description),
        h('div', { class: 'field' }, h('span', {}, 'Ma note'), stars(rating, (v) => { rating = v; }, { size: 'large' })),
      ),
    ),
    h(
      'div',
      { class: 'card-box grid-fields' },
      h('label', { class: 'field' }, 'Catégorie', category),
      h('label', { class: 'field' }, 'Difficulté', difficulty),
      h('label', { class: 'field' }, 'Préparation (min)', prep),
      h('label', { class: 'field' }, 'Cuisson (min)', cook),
      h('label', { class: 'field' }, 'Portions *', servings),
    ),
    h(
      'div',
      { class: 'card-box' },
      h('h2', {}, 'Régime'),
      h(
        'div',
        { class: 'chips' },
        Object.entries(LABELS.diets).map(([d, label]) =>
          h(
            'button',
            {
              type: 'button',
              class: `chip ${diets.has(d) ? 'active' : ''}`,
              onClick: (e) => {
                diets.has(d) ? diets.delete(d) : diets.add(d);
                e.currentTarget.classList.toggle('active');
              },
            },
            label,
          ),
        ),
      ),
    ),
    h(
      'div',
      { class: 'card-box' },
      h('h2', {}, 'Ingrédients ', h('span', { class: 'muted small' }, `(pour ${r.servings || 2} portions — ajuste « Portions » si besoin)`)),
      ingBox,
      h('button', { type: 'button', class: 'btn small', onClick: () => addIngredient().querySelector('.ing-name').focus() }, '+ Ingrédient'),
    ),
    h(
      'div',
      { class: 'card-box' },
      h('h2', {}, 'Étapes'),
      stepBox,
      h('button', { type: 'button', class: 'btn small', onClick: () => addStep().focus() }, '+ Étape'),
    ),
    h(
      'div',
      { class: 'card-box stack' },
      h('label', { class: 'field' }, 'Astuces', tips),
      h('label', { class: 'field' }, 'Lien de la vidéo', source),
    ),
    // Barre d'actions collée tout en bas de l'écran (remplace la navigation sur iPhone)
    h(
      'div',
      { class: 'action-bar' },
      h(
        'div',
        { class: 'action-bar-inner' },
        h('a', { class: 'btn ghost', href: isNew ? '#/recettes' : `#/recettes/${recipeId}` }, 'Annuler'),
        saveBtn,
      ),
    ),
  );

  document.body.classList.add('task-mode');
  root.replaceChildren(
    h('a', { class: 'back', href: isNew ? '#/recettes' : `#/recettes/${recipeId}` }, '← Retour'),
    h('h1', {}, isNew ? 'Nouvelle recette' : 'Modifier la recette'),
    form,
  );
}
