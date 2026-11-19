// Unités, mise à l'échelle des portions et agrégation de la liste de courses
import { guessSection, normalize } from './catalog.js';

export const UNITS = [
  ['', '—'],
  ['g', 'g'],
  ['kg', 'kg'],
  ['ml', 'ml'],
  ['cl', 'cl'],
  ['l', 'L'],
  ['cac', 'c. à café'],
  ['cas', 'c. à soupe'],
  ['piece', 'pièce(s)'],
  ['pincee', 'pincée(s)'],
  ['gousse', 'gousse(s)'],
  ['tranche', 'tranche(s)'],
  ['botte', 'botte(s)'],
  ['sachet', 'sachet(s)'],
  ['boite', 'boîte(s)'],
  ['tasse', 'tasse(s)'],
];
const LABEL = Object.fromEntries(UNITS);

// Conversion vers une unité de base pour pouvoir additionner
const BASE = { g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], cl: ['ml', 10], l: ['ml', 1000] };

export function toBase(quantity, unit) {
  const b = BASE[unit];
  if (!b || quantity == null) return { quantity, unit: unit || '' };
  return { quantity: quantity * b[1], unit: b[0] };
}

function fmtNumber(n) {
  const digits = n < 10 ? 2 : n < 100 ? 1 : 0;
  return Number(n.toFixed(digits)).toLocaleString('fr-FR');
}

/** 1500 g → "1,5 kg" ; 2 piece → "2" ; null → "" */
export function formatQty(quantity, unit) {
  if (quantity == null || quantity === '' || Number.isNaN(Number(quantity))) {
    return unit && unit !== 'piece' ? LABEL[unit] || unit : '';
  }
  let q = Number(quantity);
  let u = unit || '';
  if (u === 'g' && q >= 1000) { q /= 1000; u = 'kg'; }
  if (u === 'ml' && q >= 1000) { q /= 1000; u = 'l'; }
  if (u === 'ml' && q >= 100 && q % 10 === 0) { q /= 10; u = 'cl'; }
  const n = fmtNumber(q);
  if (!u || u === 'piece') return n;
  const forms = FORMS[u];
  if (!forms) return `${n} ${LABEL[u] || u}`;
  return `${n} ${q > 1 ? forms[1] : forms[0]}`;
}

const FORMS = {
  g: ['g', 'g'], kg: ['kg', 'kg'], ml: ['ml', 'ml'], cl: ['cl', 'cl'], l: ['L', 'L'],
  cac: ['c. à café', 'c. à café'], cas: ['c. à soupe', 'c. à soupe'],
  pincee: ['pincée', 'pincées'], gousse: ['gousse', 'gousses'], tranche: ['tranche', 'tranches'],
  botte: ['botte', 'bottes'], sachet: ['sachet', 'sachets'], boite: ['boîte', 'boîtes'], tasse: ['tasse', 'tasses'],
};

export const ingredientKey = (name) => normalize(name);

/**
 * Agrège des ingrédients de plusieurs recettes.
 * entries : [{ name, quantity, unit, section, factor, recipeTitle }]
 * → [{ name, quantity, unit, section, recipe_titles: [] }]
 */
export function aggregateIngredients(entries) {
  const map = new Map();
  for (const it of entries) {
    if (!it || !String(it.name || '').trim()) continue;
    const scaled = it.quantity == null || it.quantity === '' ? null : Number(it.quantity) * (it.factor || 1);
    const b = toBase(scaled, it.unit || '');
    const key = ingredientKey(it.name) + '|' + b.unit;
    let e = map.get(key);
    if (!e) {
      e = {
        name: String(it.name).trim(),
        quantity: b.quantity,
        unit: b.unit,
        section: it.section || guessSection(it.name),
        recipe_titles: [],
      };
      map.set(key, e);
    } else if (b.quantity != null) {
      e.quantity = (e.quantity ?? 0) + b.quantity;
    }
    if (it.recipeTitle && !e.recipe_titles.includes(it.recipeTitle)) e.recipe_titles.push(it.recipeTitle);
  }
  return [...map.values()];
}

/** Mise à l'échelle simple pour l'affichage d'une recette */
export function scale(quantity, factor) {
  if (quantity == null || quantity === '') return null;
  return Number(quantity) * factor;
}
