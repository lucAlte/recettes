import { h } from '../ui.js';
import { APP_NAME, TELEGRAM_BOT_USERNAME } from '../config.js';

// Photos du site vitrine : à déposer dans docs/assets/landing/ (voir README des photos)
const IMG = (name) => `assets/landing/${name}`;

/** Emplacement photo : affiche la photo si elle existe, sinon un joli dégradé avec un emoji */
function photo(name, emoji, cls = '') {
  const box = h('div', { class: `lp-photo ${cls}` }, h('span', { class: 'lp-photo-fallback' }, emoji));
  const img = h('img', { src: IMG(name), alt: '', loading: 'lazy', decoding: 'async' });
  img.addEventListener('load', () => box.classList.add('loaded'));
  img.addEventListener('error', () => img.remove());
  box.append(img);
  return box;
}

const STEPS = [
  { n: '1', icon: '📱', title: 'Tu vois une recette sur Instagram', text: 'Un Reel qui donne faim ? Appuie sur l’avion en papier, puis « Partager vers » Telegram.' },
  { n: '2', icon: '🤖', title: 'Tu l’envoies à notre bot', text: 'Choisis le bot Mes Recettes. Il te répond « Reçu ! » en une seconde. C’est tout.' },
  { n: '3', icon: '✨', title: 'La recette se range toute seule', text: 'Ingrédients, quantités, étapes, temps, photo : tout est écrit et classé dans ton carnet.' },
];

const FEATURES = [
  { icon: '🎬', title: 'Import Instagram automatique', text: 'L’IA écoute la vidéo, lit la légende et rédige une vraie recette, en français, avec des quantités précises.' },
  { icon: '🛒', title: 'Liste de courses intelligente', text: 'Coche tes recettes de la semaine, choisis les portions : la liste se fait seule, triée par rayon.' },
  { icon: '👨‍👩‍👧', title: 'Un carnet pour toute la maison', text: 'Recettes et liste de courses partagées en temps réel. L’un coche le lait, l’autre le voit aussitôt.' },
  { icon: '🌍', title: 'Explorer', text: 'Pioche dans les carnets de tes proches et ajoute leurs meilleures recettes au tien en un geste.' },
  { icon: '🌙', title: 'On mange quoi ce soir ?', text: 'Filtre par repas, occasion, temps, difficulté ou régime. La bonne idée en deux taps.' },
  { icon: '📲', title: 'Comme une vraie app', text: 'Ajoute-la à l’écran d’accueil de ton iPhone : plein écran, rapide, toujours dans ta poche.' },
];

const GALLERY = [
  { file: 'plat-1.jpg', emoji: '🍝', label: 'Pasta alle vongole' },
  { file: 'plat-2.jpg', emoji: '🍛', label: 'Curry du mardi soir' },
  { file: 'plat-3.jpg', emoji: '🥗', label: 'Salade d’été' },
  { file: 'plat-4.jpg', emoji: '🍰', label: 'Le gâteau du dimanche' },
  { file: 'plat-5.jpg', emoji: '🐟', label: 'Crudo pour l’apéro' },
  { file: 'plat-6.jpg', emoji: '🥐', label: 'Brunch à rallonge' },
];

const bot = TELEGRAM_BOT_USERNAME && !TELEGRAM_BOT_USERNAME.startsWith('VotreBot') ? TELEGRAM_BOT_USERNAME : null;

const FAQ = [
  {
    q: 'Comment importer une recette depuis Instagram ?',
    a: [
      h('ol', { class: 'lp-faq-steps' },
        h('li', {}, 'Crée ton compte, puis ton espace (ou rejoins celui de ta moitié avec son code).'),
        h('li', {}, 'Dans l’app : ', h('b', {}, 'Réglages → Bot Telegram → Lier Telegram'), '. Telegram s’ouvre, appuie sur ', h('b', {}, 'Démarrer'), '.'),
        h('li', {}, 'Sur Instagram, sous le Reel : icône ', h('b', {}, 'avion en papier'), ' → ', h('b', {}, 'Partager vers…'), ' → ', h('b', {}, 'Telegram'), ' → le bot.'),
        h('li', {}, 'Le bot confirme la réception. La recette apparaît dans ton carnet quelques minutes plus tard, avec un message « ✅ Recette ajoutée ».')),
      bot ? h('p', {}, 'Le bot : ', h('a', { href: `https://t.me/${bot}`, target: '_blank', rel: 'noopener' }, `@${bot}`)) : null,
    ],
  },
  { q: 'Faut-il installer Telegram ?', a: 'Oui, seulement pour l’import automatique : c’est par là que tu envoies les Reels. Telegram est gratuit, sur iPhone comme sur Android. Pour ajouter des recettes à la main, consulter ton carnet ou faire tes courses, l’app suffit.' },
  { q: 'Et si la vidéo n’a pas de voix, juste de la musique ?', a: 'Pas de souci : la légende du post est lue aussi. Si la recette y est écrite, elle sera importée. Si la vidéo ne contient vraiment aucune recette, le bot te le dit.' },
  { q: 'Les quantités et les étapes sont-elles fiables ?', a: 'L’IA reprend ce qui est dit et écrit, convertit les unités (cups, oz…) et range chaque ingrédient par rayon. Elle n’invente pas d’ingrédient. Chaque recette reste modifiable : quantités, étapes, photo, étiquettes.' },
  { q: 'Comment partager mon carnet avec ma famille ?', a: 'Dans Réglages → Mon espace, appuie sur « Inviter ». La personne crée son compte et choisit « Rejoindre un espace » avec ton code. Vous partagez alors recettes et liste de courses, synchronisées en temps réel.' },
  { q: 'C’est gratuit ?', a: 'Chaque nouvel espace dispose de 5 imports Instagram offerts pour essayer. Ensuite, l’accès est validé sur invitation : l’app tourne sur une IA payante, et chacun participe simplement à ce qu’il consomme (quelques centimes par mois). L’ajout de recettes à la main, la liste de courses et le partage restent illimités.' },
  { q: 'Ça marche sur iPhone ?', a: 'Oui, l’app est pensée d’abord pour l’iPhone. Dans Safari : bouton Partager → « Sur l’écran d’accueil ». Elle s’ouvre alors en plein écran, comme une app classique. Elle fonctionne aussi sur Android, iPad et ordinateur.' },
  { q: 'Qui voit mes recettes ?', a: 'Les membres de ton espace. Une fois ton espace validé, tes recettes sont aussi visibles dans l’Explorer par les autres espaces validés (des proches invités), avec ton prénom et ta photo de profil. Ta liste de courses et tes occasions restent privées.' },
  { q: 'Je peux importer mes recettes depuis Notion ou un autre carnet ?', a: 'Oui, sur demande : un export de ton carnet peut être importé en une fois, photos comprises.' },
];

export function renderLanding(root) {
  const year = new Date().getFullYear();

  const faq = h('div', { class: 'lp-faq' },
    FAQ.map((f, i) =>
      h('details', { class: 'lp-faq-item', open: i === 0 ? true : null },
        h('summary', {}, h('span', {}, f.q), h('span', { class: 'lp-faq-icon' }, '+')),
        h('div', { class: 'lp-faq-body' }, typeof f.a === 'string' ? h('p', {}, f.a) : f.a))));

  const page = h('div', { class: 'lp' },
    // ---------- navigation ----------
    h('header', { class: 'lp-nav' },
      h('a', { class: 'lp-brand', href: '#/' }, h('span', { class: 'lp-logo' }, '🍳'), APP_NAME),
      h('nav', { class: 'lp-nav-links' },
        h('a', { href: '#comment', class: 'lp-hide-sm', onClick: scrollTo('comment') }, 'Comment ça marche'),
        h('a', { href: '#faq', class: 'lp-hide-sm', onClick: scrollTo('faq') }, 'FAQ'),
        h('a', { href: '#/connexion', class: 'lp-btn ghost sm' }, 'Se connecter'))),

    // ---------- hero ----------
    h('section', { class: 'lp-hero' },
      h('div', { class: 'lp-hero-text reveal' },
        h('span', { class: 'lp-eyebrow' }, '📌 Fini les recettes perdues dans les « enregistrés »'),
        h('h1', {}, 'Toutes les recettes que tu ', h('em', {}, 'enregistres'), ', enfin ', h('em', {}, 'cuisinées'), '.'),
        h('p', { class: 'lp-lead' },
          'Partage un Reel Instagram, et il devient une vraie recette : ingrédients, quantités, étapes. Rangée dans ton carnet, prête pour ta liste de courses.'),
        h('div', { class: 'lp-cta' },
          h('a', { href: '#/inscription', class: 'lp-btn primary lg' }, 'Créer mon carnet'),
          h('a', { href: '#comment', class: 'lp-btn ghost lg', onClick: scrollTo('comment') }, 'Voir comment ça marche')),
        h('p', { class: 'lp-micro' }, '✓ 5 imports offerts  ·  ✓ Sans carte bancaire  ·  ✓ iPhone, Android & ordinateur')),
      h('div', { class: 'lp-hero-visual reveal' },
        photo('hero-1.jpg', '🍝', 'lp-tilt lp-tilt-1'),
        photo('hero-2.jpg', '🥗', 'lp-tilt lp-tilt-2'),
        photo('hero-3.jpg', '🍰', 'lp-tilt lp-tilt-3'),
        h('div', { class: 'lp-toast-demo' }, h('span', {}, '✅'), h('div', {}, h('b', {}, 'Recette ajoutée'), h('small', {}, 'Pasta alle vongole · 2 pers. · 25 min'))))),

    // ---------- bandeau preuve ----------
    h('section', { class: 'lp-strip' },
      h('div', {}, h('b', {}, '30 s'), h('span', {}, 'pour enregistrer une recette')),
      h('div', {}, h('b', {}, '800+'), h('span', {}, 'articles dans le catalogue de courses')),
      h('div', {}, h('b', {}, '0'), h('span', {}, 'recette perdue dans tes captures d’écran'))),

    // ---------- comment ça marche ----------
    h('section', { class: 'lp-section', id: 'comment' },
      h('div', { class: 'lp-section-head reveal' },
        h('span', { class: 'lp-eyebrow' }, 'Comment ça marche'),
        h('h2', {}, 'D’Instagram à ton assiette, en 3 gestes')),
      h('div', { class: 'lp-steps' },
        STEPS.map((s) =>
          h('div', { class: 'lp-step reveal' },
            h('div', { class: 'lp-step-num' }, s.n),
            h('div', { class: 'lp-step-icon' }, s.icon),
            h('h3', {}, s.title),
            h('p', {}, s.text))))),

    // ---------- galerie ----------
    h('section', { class: 'lp-section' },
      h('div', { class: 'lp-section-head reveal' },
        h('span', { class: 'lp-eyebrow' }, 'Ton carnet'),
        h('h2', {}, 'Un carnet qui donne envie de cuisiner')),
      h('div', { class: 'lp-gallery' },
        GALLERY.map((g) =>
          h('figure', { class: 'lp-gallery-item reveal' }, photo(g.file, g.emoji), h('figcaption', {}, g.label))))),

    // ---------- fonctionnalités ----------
    h('section', { class: 'lp-section' },
      h('div', { class: 'lp-section-head reveal' },
        h('span', { class: 'lp-eyebrow' }, 'Tout est inclus'),
        h('h2', {}, 'Bien plus qu’un carnet de recettes')),
      h('div', { class: 'lp-features' },
        FEATURES.map((f) =>
          h('div', { class: 'lp-feature reveal' }, h('div', { class: 'lp-feature-icon' }, f.icon), h('h3', {}, f.title), h('p', {}, f.text))))),

    // ---------- courses ----------
    h('section', { class: 'lp-section lp-split' },
      h('div', { class: 'reveal' }, photo('courses.jpg', '🛒', 'lp-split-photo')),
      h('div', { class: 'lp-split-text reveal' },
        h('span', { class: 'lp-eyebrow' }, 'Liste de courses'),
        h('h2', {}, 'Tes courses, faites en 2 minutes'),
        h('ul', { class: 'lp-checks' },
          h('li', {}, 'Choisis tes recettes et le nombre de portions'),
          h('li', {}, 'Les quantités s’additionnent toutes seules (200 g + 300 g = 500 g)'),
          h('li', {}, 'Décoche ce que tu as déjà dans tes placards'),
          h('li', {}, 'Ajoute le reste : gel douche, sacs poubelle, pastilles lave-vaisselle…'),
          h('li', {}, 'Introuvable en magasin ? Garde-le en mémoire pour la prochaine fois')))),

    // ---------- partage ----------
    h('section', { class: 'lp-section lp-split reverse' },
      h('div', { class: 'reveal' }, photo('partage.jpg', '👨‍👩‍👧', 'lp-split-photo')),
      h('div', { class: 'lp-split-text reveal' },
        h('span', { class: 'lp-eyebrow' }, 'En famille'),
        h('h2', {}, 'Un seul carnet pour toute la maison'),
        h('p', { class: 'lp-lead' }, 'Invite ta moitié, tes colocs ou toute la famille avec un simple code. Chacun ajoute ses trouvailles, tout le monde en profite, et la liste de courses se met à jour en direct pendant que vous êtes au magasin.'),
        h('a', { href: '#/inscription', class: 'lp-btn primary' }, 'Commencer à deux'))),

    // ---------- FAQ ----------
    h('section', { class: 'lp-section', id: 'faq' },
      h('div', { class: 'lp-section-head reveal' },
        h('span', { class: 'lp-eyebrow' }, 'Questions fréquentes'),
        h('h2', {}, 'Tout ce que tu veux savoir')),
      faq),

    // ---------- CTA final ----------
    h('section', { class: 'lp-final reveal' },
      h('h2', {}, 'Ta prochaine recette préférée est déjà dans tes enregistrés.'),
      h('p', {}, 'Crée ton carnet maintenant et importe tes 5 premières recettes gratuitement.'),
      h('div', { class: 'lp-cta center' },
        h('a', { href: '#/inscription', class: 'lp-btn primary lg' }, 'Créer mon carnet'),
        h('a', { href: '#/connexion', class: 'lp-btn ghost lg' }, 'J’ai déjà un compte'))),

    h('footer', { class: 'lp-footer' }, `🍳 ${APP_NAME} · ${year} · Fait avec gourmandise`),
  );

  root.replaceChildren(page);
  window.scrollTo(0, 0);

  // Apparition douce au défilement
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { threshold: 0.12 })
    : null;
  page.querySelectorAll('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));
}

function scrollTo(id) {
  return (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}
