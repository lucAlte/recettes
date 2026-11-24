import { sb, check } from './supa.js';

export const state = {
  session: null,
  user: null,
  memberships: [], // [{ household_id, display_name, role, households: {...} }]
  household: null, // espace courant
  me: null, // mon membership dans l'espace courant
  loaded: false,
};

const LS_KEY = 'recettes:household';

export async function loadHouseholds() {
  const rows = check(
    await sb
      .from('household_members')
      .select('household_id, display_name, role, avatar_path, households(id, name, invite_code, telegram_link_code, status)')
      .eq('user_id', state.user.id),
  );
  state.memberships = rows.filter((r) => r.households);
  const wanted = localStorage.getItem(LS_KEY);
  const current =
    state.memberships.find((m) => m.household_id === wanted) || state.memberships[0] || null;
  applyHousehold(current);
  state.loaded = true;
}

function applyHousehold(m) {
  state.me = m || null;
  state.household = m ? m.households : null;
  if (m) localStorage.setItem(LS_KEY, m.household_id);
}

export function switchHousehold(id) {
  applyHousehold(state.memberships.find((m) => m.household_id === id));
}

export function resetState() {
  Object.assign(state, { session: null, user: null, memberships: [], household: null, me: null, loaded: false });
}

// Sélection du planificateur de courses : { recipeId: portions }
export function getPlan() {
  try {
    return JSON.parse(localStorage.getItem('recettes:plan:' + state.household.id)) || {};
  } catch {
    return {};
  }
}
export function setPlan(plan) {
  localStorage.setItem('recettes:plan:' + state.household.id, JSON.stringify(plan));
}
