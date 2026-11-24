import { sb } from './supa.js';
import { state, loadHouseholds, resetState } from './state.js';
import { APP_NAME, SUPABASE_URL } from './config.js';
import { h, errorToast } from './ui.js';
import { renderAuth, renderRecovery, renderOnboarding } from './views/auth.js';
import { recipesView } from './views/recipes.js';
import { recipeView } from './views/recipe.js';
import { recipeEditView } from './views/recipeEdit.js';
import { plannerView } from './views/planner.js';
import { shoppingView } from './views/shopping.js';
import { settingsView } from './views/settings.js';
import { exploreView, exploreRecipeView } from './views/explore.js';

const app = document.getElementById('app');
let cleanup = null;
let recovering = false;

const ROUTES = [
  { re: /^#\/recettes\/?$/, view: recipesView, nav: 'recettes' },
  { re: /^#\/recettes\/nouvelle$/, view: (root) => recipeEditView(root), nav: 'recettes' },
  { re: /^#\/recettes\/([\w-]+)\/modifier$/, view: (root, p) => recipeEditView(root, p), nav: 'recettes', params: ['id'] },
  { re: /^#\/recettes\/([\w-]+)$/, view: recipeView, nav: 'recettes', params: ['id'] },
  { re: /^#\/explorer\/?$/, view: exploreView, nav: 'recettes' },
  { re: /^#\/explorer\/(\d{5})$/, view: exploreRecipeView, nav: 'recettes', params: ['code'] },
  { re: /^#\/preparer$/, view: plannerView, nav: 'preparer' },
  { re: /^#\/courses$/, view: shoppingView, nav: 'courses' },
  { re: /^#\/reglages$/, view: settingsView, nav: 'reglages' },
];

const NAV = [
  { id: 'recettes', href: '#/recettes', icon: '📖', label: 'Recettes' },
  { id: 'preparer', href: '#/preparer', icon: '🍽️', label: 'Préparer' },
  { id: 'courses', href: '#/courses', icon: '🛒', label: 'Courses' },
  { id: 'reglages', href: '#/reglages', icon: '⚙️', label: 'Réglages' },
];

function shell(active) {
  const nav = h(
    'nav',
    { class: 'nav' },
    NAV.map((n) =>
      h('a', { href: n.href, class: n.id === active ? 'active' : '' }, h('span', { class: 'nav-icon' }, n.icon), h('span', { class: 'nav-label' }, n.label)),
    ),
  );
  const main = h('main', { id: 'view' });
  app.replaceChildren(
    h(
      'header',
      { class: 'topbar' },
      h('a', { class: 'brand', href: '#/recettes' }, '🍳 ', h('span', {}, APP_NAME)),
      h('span', { class: 'hh-name', title: 'Espace actif' }, state.household.name),
      nav,
    ),
    main,
  );
  return main;
}

async function route() {
  if (typeof cleanup === 'function') {
    try { cleanup(); } catch { /* rien */ }
  }
  cleanup = null;
  document.body.classList.remove('task-mode', 'no-scroll');
  document.querySelectorAll('.overlay').forEach((o) => o.remove());

  if (recovering) return renderRecovery(app, () => { recovering = false; location.hash = '#/recettes'; route(); });
  if (!state.session) return renderAuth(app);

  if (!state.loaded) {
    try {
      await loadHouseholds();
    } catch (e) {
      errorToast(e);
      return;
    }
  }
  if (!state.household) return renderOnboarding(app, () => { location.hash = '#/recettes'; route(); });

  const hash = location.hash;
  const match = ROUTES.map((r) => ({ r, m: hash.match(r.re) })).find((x) => x.m);
  if (!match) {
    location.replace('#/recettes');
    return;
  }
  const params = {};
  (match.r.params || []).forEach((p, i) => (params[p] = match.m[i + 1]));

  const root = shell(match.r.nav);
  window.scrollTo(0, 0);
  try {
    cleanup = await match.r.view(root, params, route);
  } catch (e) {
    errorToast(e);
  }
}

async function boot() {
  if (SUPABASE_URL.includes('VOTRE-PROJET')) {
    app.replaceChildren(
      h('div', { class: 'auth-page' }, h('div', { class: 'auth-card' }, h('h1', {}, '⚙️ Configuration requise'), h('p', {}, 'Renseigne SUPABASE_URL et SUPABASE_ANON_KEY dans docs/js/config.js.'))),
    );
    return;
  }

  // Les liens e-mail Supabase ajoutent #access_token=… : on attend la session puis on nettoie l'URL
  if (/access_token|error_description|type=recovery/.test(location.hash)) recovering = /type=recovery/.test(location.hash);

  const { data } = await sb.auth.getSession();
  state.session = data.session;
  state.user = data.session?.user ?? null;
  if (!location.hash.startsWith('#/')) history.replaceState(null, '', location.pathname + location.search + '#/recettes');

  sb.auth.onAuthStateChange((event, session) => {
    // pas d'appel Supabase directement dans ce callback (recommandation Supabase)
    setTimeout(() => {
      const wasLogged = !!state.session;
      if (event === 'PASSWORD_RECOVERY') recovering = true;
      if (event === 'SIGNED_OUT') {
        resetState();
        route();
        return;
      }
      state.session = session;
      state.user = session?.user ?? null;
      if ((event === 'SIGNED_IN' && !wasLogged) || event === 'PASSWORD_RECOVERY') {
        if (!location.hash.startsWith('#/')) history.replaceState(null, '', location.pathname + '#/recettes');
        route();
      }
    }, 0);
  });

  window.addEventListener('hashchange', route);
  route();
}

boot();
