// =====================================================================
//  Rayons + catalogue des articles de supermarché (alimentaire et non alimentaire)
//  Pour ajouter un article : ajoute-le dans la chaîne du rayon (séparateur "|").
// =====================================================================

export const SECTIONS = [
  { id: 'fruits_legumes', label: 'Fruits & légumes', emoji: '🥕' },
  { id: 'boucherie', label: 'Boucherie & volaille', emoji: '🥩' },
  { id: 'poissonnerie', label: 'Poissonnerie', emoji: '🐟' },
  { id: 'cremerie', label: 'Crèmerie, œufs & fromages', emoji: '🧀' },
  { id: 'charcuterie_traiteur', label: 'Charcuterie & traiteur', emoji: '🥓' },
  { id: 'boulangerie', label: 'Boulangerie', emoji: '🥖' },
  { id: 'feculents', label: 'Pâtes, riz & féculents', emoji: '🍝' },
  { id: 'conserves', label: 'Conserves & bocaux', emoji: '🥫' },
  { id: 'condiments', label: 'Huiles, sauces & condiments', emoji: '🫒' },
  { id: 'epices', label: 'Épices, herbes & bouillons', emoji: '🧂' },
  { id: 'epicerie_sucree', label: 'Épicerie sucrée & pâtisserie', emoji: '🍫' },
  { id: 'petit_dejeuner', label: 'Petit-déjeuner', emoji: '☕' },
  { id: 'biscuits_aperitif', label: 'Biscuits, confiserie & apéro', emoji: '🍪' },
  { id: 'surgeles', label: 'Surgelés', emoji: '🧊' },
  { id: 'boissons', label: 'Boissons', emoji: '🧃' },
  { id: 'monde', label: 'Cuisine du monde', emoji: '🌏' },
  { id: 'bebe', label: 'Bébé', emoji: '🍼' },
  { id: 'hygiene', label: 'Hygiène & beauté', emoji: '🧴' },
  { id: 'entretien', label: 'Entretien & ménage', emoji: '🧽' },
  { id: 'maison', label: 'Maison & cuisine', emoji: '🏠' },
  { id: 'animaux', label: 'Animaux', emoji: '🐾' },
  { id: 'autre', label: 'Autre', emoji: '🛒' },
];

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
export const sectionLabel = (id) => SECTION_BY_ID[id]?.label || 'Autre';
export const sectionEmoji = (id) => SECTION_BY_ID[id]?.emoji || '🛒';

const RAW = {
  fruits_legumes:
    'Abricots|Ail|Ananas|Artichauts|Asperges vertes|Asperges blanches|Aubergines|Avocats|Bananes|Basilic frais|Betteraves cuites|Blettes|Brocoli|Butternut|Carottes|Céleri branche|Céleri-rave|Cerises|Champignons de Paris|Champignons shiitake|Champignons pleurotes|Châtaignes|Chou blanc|Chou chinois|Chou-fleur|Chou kale|Chou rouge|Choux de Bruxelles|Ciboulette|Citrons jaunes|Citrons verts|Clémentines|Concombre|Coriandre fraîche|Courge|Courgettes|Cresson|Échalotes|Endives|Épinards frais|Pousses d\'épinard|Estragon|Fenouil|Figues|Fraises|Framboises|Fruits de la passion|Germes de soja|Gingembre frais|Grenade|Groseilles|Haricots verts|Kakis|Kiwis|Laitue|Litchis|Mâche|Mandarines|Mangue|Melon|Menthe fraîche|Mesclun|Mirabelles|Myrtilles|Navets|Nectarines|Noix de coco|Oignons jaunes|Oignons rouges|Oignons blancs|Oignons nouveaux|Oranges|Oranges à jus|Pamplemousse|Panais|Pastèque|Patates douces|Pêches|Persil plat|Persil frisé|Petits pois frais|Piment frais|Poireaux|Poires|Poivrons rouges|Poivrons verts|Poivrons jaunes|Pommes|Pommes de terre|Pommes de terre grenaille|Potimarron|Potiron|Prunes|Radis|Raisin|Rhubarbe|Romarin frais|Roquette|Salade batavia|Salade iceberg|Sauge|Thym frais|Tomates|Tomates cerises|Tomates grappe|Topinambours',
  boucherie:
    'Bœuf haché|Steaks hachés|Entrecôte|Faux-filet|Rumsteck|Bavette|Bœuf bourguignon|Paleron|Pot-au-feu|Rôti de bœuf|Côte de bœuf|Carpaccio de bœuf|Escalopes de veau|Blanquette de veau|Osso buco|Rôti de veau|Viande hachée de veau|Côtes de porc|Échine de porc|Filet mignon de porc|Rôti de porc|Travers de porc|Poitrine de porc|Chair à saucisse|Saucisses de Toulouse|Chipolatas|Merguez|Gigot d\'agneau|Côtelettes d\'agneau|Épaule d\'agneau|Souris d\'agneau|Poulet entier|Blancs de poulet|Cuisses de poulet|Hauts de cuisse de poulet|Pilons de poulet|Ailes de poulet|Escalopes de dinde|Rôti de dinde|Cuisses de canard|Magret de canard|Confit de canard|Lapin|Pintade|Foies de volaille|Boulettes de viande|Cordons bleus|Nuggets de poulet',
  poissonnerie:
    'Saumon frais|Pavés de saumon|Saumon fumé|Truite fumée|Cabillaud|Dos de cabillaud|Colin|Merlu|Lieu noir|Églefin|Haddock|Dorade|Bar|Sole|Lotte|Thon frais|Sardines fraîches|Maquereaux|Rougets|Truite|Crevettes cuites|Crevettes crues|Gambas|Langoustines|Moules|Huîtres|Coquilles Saint-Jacques|Noix de pétoncles|Calamars|Encornets|Poulpe|Seiche|Crabe|Bulots|Surimi|Œufs de lump|Tarama',
  cremerie:
    'Lait demi-écrémé|Lait entier|Lait écrémé|Lait sans lactose|Boisson végétale avoine|Boisson végétale amande|Boisson végétale soja|Beurre doux|Beurre demi-sel|Margarine|Crème fraîche épaisse|Crème fraîche liquide|Crème légère|Crème végétale|Yaourts nature|Yaourts aux fruits|Yaourts grecs|Yaourts végétaux|Skyr|Fromage blanc|Petits-suisses|Faisselle|Kéfir|Crèmes dessert|Mousse au chocolat|Riz au lait|Œufs|Œufs bio|Gruyère râpé|Emmental|Comté|Beaufort|Parmesan|Grana Padano|Pecorino|Mozzarella|Burrata|Mascarpone|Ricotta|Feta|Chèvre frais|Bûche de chèvre|Camembert|Brie|Coulommiers|Roquefort|Bleu d\'Auvergne|Gorgonzola|Reblochon|Fromage à raclette|Mont d\'Or|Cheddar|Halloumi|Fromage à tartiner|Cancoillotte|Pâte feuilletée|Pâte brisée|Pâte sablée|Pâte à pizza|Pâte filo|Feuilles de brick',
  charcuterie_traiteur:
    'Jambon blanc|Jambon cru|Jambon de Bayonne|Prosciutto|Bacon|Lardons fumés|Lardons nature|Saucisson sec|Chorizo|Rosette|Coppa|Pancetta|Bresaola|Pâté de campagne|Rillettes|Terrine|Mousse de canard|Blanc de poulet tranché|Blanc de dinde|Saucisses de Strasbourg|Saucisses de Morteau|Andouillette|Boudin noir|Boudin blanc|Quenelles|Gnocchi frais|Pâtes fraîches|Ravioli frais|Tortellini|Houmous|Tzatziki|Taboulé|Salade piémontaise|Carottes râpées|Céleri rémoulade|Pizza fraîche|Quiche|Sushis|Wraps garnis|Sandwichs|Plats préparés|Soupe fraîche|Tofu|Tofu fumé|Tempeh|Seitan|Galettes végétales|Steaks végétaux',
  boulangerie:
    'Baguette|Baguette tradition|Pain de campagne|Pain complet|Pain aux céréales|Pain de seigle|Pain de mie|Pain de mie complet|Pains burger|Pains hot-dog|Pains pita|Tortillas de blé|Pain naan|Biscottes|Pain grillé|Croûtons|Chapelure|Gressins|Croissants|Pains au chocolat|Brioche|Pains au lait|Pain d\'épices|Madeleines|Muffins anglais|Bagels|Blinis|Pancakes|Crêpes|Galettes de sarrasin',
  feculents:
    'Spaghetti|Penne|Fusilli|Coquillettes|Tagliatelles|Linguine|Farfalle|Macaroni|Rigatoni|Feuilles de lasagne|Cannellonis|Orzo|Pâtes complètes|Pâtes sans gluten|Nouilles de riz|Nouilles chinoises|Nouilles udon|Nouilles soba|Vermicelles de riz|Riz basmati|Riz thaï|Riz long|Riz complet|Riz arborio|Riz à sushi|Riz sauvage|Semoule|Boulgour|Quinoa|Blé précuit|Lentilles vertes|Lentilles corail|Lentilles beluga|Pois chiches secs|Haricots rouges secs|Haricots blancs secs|Pois cassés|Flocons d\'avoine|Polenta|Purée en flocons|Gnocchi|Sarrasin|Millet|Petit épeautre',
  conserves:
    'Tomates pelées|Tomates concassées|Coulis de tomate|Passata|Concentré de tomate|Pois chiches en conserve|Haricots rouges en conserve|Haricots blancs en conserve|Lentilles cuisinées|Maïs doux|Petits pois carottes|Haricots verts en conserve|Flageolets|Champignons en conserve|Cœurs d\'artichaut|Cœurs de palmier|Olives vertes|Olives noires|Câpres|Cornichons|Oignons grelots|Poivrons marinés|Tomates séchées|Thon au naturel|Thon à l\'huile|Sardines à l\'huile|Maquereaux au vin blanc|Miettes de crabe|Anchois à l\'huile|Raviolis en conserve|Cassoulet|Choucroute|Soupe en brique|Compote|Fruits au sirop|Ananas en conserve|Pêches au sirop|Marrons cuits',
  condiments:
    'Huile d\'olive|Huile de tournesol|Huile de colza|Huile de sésame|Huile de noix|Huile de coco|Huile de friture|Vinaigre de vin|Vinaigre balsamique|Crème de balsamique|Vinaigre de cidre|Vinaigre de riz|Moutarde de Dijon|Moutarde à l\'ancienne|Mayonnaise|Ketchup|Sauce barbecue|Sauce soja|Sauce soja sucrée|Nuoc-mâm|Sauce huître|Sauce Worcestershire|Tabasco|Sriracha|Harissa|Pesto vert|Pesto rouge|Sauce tomate cuisinée|Sauce bolognaise|Vinaigrette|Sauce béarnaise|Sauce samouraï|Sauce algérienne|Tahini|Jus de citron|Mirin|Miso',
  epices:
    'Sel fin|Gros sel|Fleur de sel|Poivre noir|Poivre blanc|Baies roses|Paprika|Paprika fumé|Piment d\'Espelette|Piment de Cayenne|Cumin|Curry en poudre|Curcuma|Gingembre en poudre|Cannelle|Noix de muscade|Clous de girofle|Cardamome|Anis étoilé|Coriandre moulue|Graines de fenouil|Graines de moutarde|Ras el hanout|Garam masala|Colombo|Cinq-épices|Herbes de Provence|Thym séché|Origan|Laurier|Romarin séché|Basilic séché|Persil séché|Ail en poudre|Oignons frits|Safran|Gousses de vanille|Bouillon de volaille|Bouillon de bœuf|Bouillon de légumes|Fond de veau|Fumet de poisson|Levure boulangère|Graines de sésame|Graines de chia|Graines de lin|Graines de courge|Graines de tournesol',
  epicerie_sucree:
    'Sucre en poudre|Sucre glace|Sucre roux|Cassonade|Sucre vanillé|Sucre en morceaux|Miel|Sirop d\'érable|Sirop d\'agave|Farine de blé T45|Farine T55|Farine complète|Farine de sarrasin|Farine de riz|Farine sans gluten|Fécule de maïs|Levure chimique|Bicarbonate alimentaire|Gélatine|Agar-agar|Chocolat noir pâtissier|Chocolat au lait pâtissier|Chocolat blanc|Pépites de chocolat|Cacao en poudre|Poudre d\'amandes|Amandes|Amandes effilées|Noisettes|Poudre de noisettes|Noix|Noix de cajou|Noix de pécan|Pistaches|Pignons de pin|Raisins secs|Abricots secs|Dattes|Pruneaux|Cranberries séchées|Noix de coco râpée|Extrait de vanille|Arôme fleur d\'oranger|Lait concentré sucré|Caramel|Confiture de fraises|Confiture d\'abricots|Pâte à tartiner|Beurre de cacahuète|Crème de marrons|Pâte d\'amande|Vermicelles colorés|Colorant alimentaire|Meringues',
  petit_dejeuner:
    'Café moulu|Café en grains|Capsules de café|Dosettes de café|Café soluble|Thé noir|Thé vert|Infusions|Chicorée|Chocolat en poudre|Céréales|Muesli|Granola|Corn flakes|Barres de céréales|Galettes de riz soufflé',
  biscuits_aperitif:
    'Biscuits secs|Petits beurres|Biscuits au chocolat|Cookies|Gâteaux moelleux|Gaufrettes|Spéculoos|Boudoirs|Biscuits à la cuillère|Barres chocolatées|Tablette de chocolat|Bonbons|Chewing-gums|Compotes en gourde|Chips nature|Chips saveur|Tortilla chips|Crackers|Biscuits apéritifs|Cacahuètes|Pistaches grillées|Noix de cajou grillées|Mélange apéritif|Olives apéritif|Tapenade|Pop-corn|Bretzels',
  surgeles:
    'Frites surgelées|Pommes noisettes|Potatoes|Épinards surgelés|Haricots verts surgelés|Petits pois surgelés|Brocolis surgelés|Poêlée de légumes|Mélange wok|Ratatouille surgelée|Herbes surgelées|Ail surgelé|Oignons surgelés|Échalotes surgelées|Fruits rouges surgelés|Mangue surgelée|Poisson pané|Filets de cabillaud surgelés|Crevettes surgelées|Fruits de mer surgelés|Steaks hachés surgelés|Pizza surgelée|Lasagnes surgelées|Nems|Samoussas|Gyozas|Glace|Bâtonnets glacés|Sorbet|Glaçons',
  boissons:
    'Eau plate|Eau gazeuse|Eau aromatisée|Jus d\'orange|Jus de pomme|Jus multifruits|Nectar|Smoothie|Sirop de grenadine|Sirop de menthe|Sirop de citron|Soda cola|Soda zéro|Limonade|Thé glacé|Kombucha|Eau de coco|Boisson énergisante|Bière|Bière sans alcool|Cidre|Vin rouge|Vin blanc|Vin rosé|Champagne|Crémant|Prosecco|Porto|Apéritif anisé|Whisky|Rhum|Vodka|Gin|Liqueur',
  monde:
    'Lait de coco|Crème de coco|Pâte de curry rouge|Pâte de curry vert|Sauce teriyaki|Sauce sweet chili|Sauce hoisin|Gochujang|Kimchi|Feuilles de riz|Algues nori|Wasabi|Gingembre mariné|Bouillon dashi|Tofu soyeux|Nouilles instantanées|Tortillas de maïs|Coques à tacos|Haricots refrits|Salsa|Guacamole|Jalapeños|Épices fajitas|Pain azyme',
  bebe:
    'Couches|Lingettes bébé|Lait infantile|Petits pots|Compotes bébé|Céréales bébé|Liniment|Crème pour le change|Sérum physiologique|Coton bébé',
  hygiene:
    'Gel douche|Savon|Savon liquide mains|Shampooing|Après-shampooing|Masque cheveux|Dentifrice|Brosses à dents|Fil dentaire|Bain de bouche|Déodorant|Rasoirs|Lames de rasoir|Mousse à raser|Après-rasage|Crème hydratante|Crème pour les mains|Baume à lèvres|Crème solaire|Démaquillant|Cotons démaquillants|Coton|Cotons-tiges|Lingettes démaquillantes|Mouchoirs|Papier toilette|Serviettes hygiéniques|Tampons|Protège-slips|Pansements|Gel hydroalcoolique|Dissolvant|Gel coiffant|Laque|Élastiques cheveux|Produit lentilles de contact',
  entretien:
    'Liquide vaisselle|Pastilles lave-vaisselle|Sel régénérant|Liquide de rinçage|Nettoyant lave-vaisselle|Lessive liquide|Lessive en capsules|Lessive en poudre|Adoucissant|Détachant|Lingettes anti-décoloration|Eau déminéralisée|Javel|Nettoyant multi-usage|Nettoyant salle de bain|Anticalcaire|Nettoyant WC|Gel WC|Blocs WC|Nettoyant vitres|Nettoyant sol|Dégraissant cuisine|Vinaigre ménager|Bicarbonate de soude|Savon noir|Crème à récurer|Désinfectant|Lingettes ménagères|Éponges|Éponges grattantes|Microfibres|Serpillière|Gants de ménage|Sacs poubelle 30 L|Sacs poubelle 50 L|Sacs poubelle 100 L|Sacs de tri|Désodorisant|Insecticide|Anti-moustiques|Déboucheur canalisations|Dépoussiérant',
  maison:
    'Essuie-tout|Papier aluminium|Film alimentaire|Papier cuisson|Sacs congélation|Sachets zip|Boîtes de conservation|Serviettes en papier|Nappe en papier|Assiettes jetables|Gobelets|Couverts jetables|Pailles|Caissettes à muffins|Pique-brochettes|Cure-dents|Filtres à café|Allumettes|Briquet|Bougies|Piles AA|Piles AAA|Piles bouton|Ampoules|Ruban adhésif|Stylos|Pinces à linge|Charbon de bois|Allume-feu|Sacs cabas',
  animaux:
    'Croquettes chat|Pâtée chat|Friandises chat|Litière|Croquettes chien|Pâtée chien|Friandises chien|Sacs à déjections|Graines pour oiseaux|Nourriture pour poissons',
};

/** Catalogue : [{ name, section }] */
export const CATALOG = Object.entries(RAW).flatMap(([section, list]) =>
  list.split('|').map((name) => ({ name: name.trim(), section })),
);

export const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const INDEX = CATALOG.map((it) => ({ ...it, key: normalize(it.name) }));

/** Recherche dans le catalogue (préfixe > mot > contient) */
export function searchCatalog(query, limit = 60) {
  const q = normalize(query);
  if (!q) return CATALOG.slice(0, limit);
  const scored = [];
  for (const it of INDEX) {
    let score = -1;
    if (it.key === q) score = 0;
    else if (it.key.startsWith(q)) score = 1;
    else if (it.key.split(' ').some((w) => w.startsWith(q))) score = 2;
    else if (it.key.includes(q)) score = 3;
    if (score >= 0) scored.push([score, it]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name, 'fr'))
    .slice(0, limit)
    .map(([, it]) => ({ name: it.name, section: it.section }));
}

const singular = (w) => (w.length > 3 ? w.replace(/(s|x)$/, '') : w);

/** Devine le rayon d'un article libre ("2 courgettes" → fruits_legumes) */
const KEYWORDS = {
  pate: 'feculents', riz: 'feculents', nouille: 'feculents', farine: 'epicerie_sucree', sucre: 'epicerie_sucree',
  chocolat: 'epicerie_sucree', sel: 'epices', poivre: 'epices', beurre: 'cremerie', lait: 'cremerie',
  oeuf: 'cremerie', fromage: 'cremerie', creme: 'cremerie', yaourt: 'cremerie', huile: 'condiments',
  vinaigre: 'condiments', sauce: 'condiments', eau: 'boissons', vin: 'boissons', jus: 'boissons',
  poulet: 'boucherie', boeuf: 'boucherie', porc: 'boucherie', veau: 'boucherie', jambon: 'charcuterie_traiteur',
  poisson: 'poissonnerie', crevette: 'poissonnerie', pain: 'boulangerie', bouillon: 'epices', herbe: 'epices',
};

export function guessSection(name) {
  // retire les quantités et unités en tête : "2 x 500 g tomates" → "tomates"
  const q = normalize(name)
    .replace(/^(\d+\s*)?(x\s*)?(\d+\s*)?(g|kg|ml|cl|l|sachets?|boites?|paquets?|bouteilles?|packs?)?\s+/, '')
    .trim();
  if (!q) return 'autre';
  const words = q.split(' ').map(singular);
  if (KEYWORDS[words[0]] && !INDEX.some((it) => it.key === q)) {
    // un mot-clé simple l'emporte, sauf si l'article exact existe au catalogue
    const exact = INDEX.find((it) => it.key.split(' ').map(singular).join(' ') === words.join(' '));
    return exact ? exact.section : KEYWORDS[words[0]];
  }
  let best = null;
  for (const it of INDEX) {
    const itWords = it.key.split(' ').map(singular);
    if (it.key === q) return it.section;
    // le 1er mot du catalogue correspond au 1er mot cherché ("tomates cerises" ~ "tomate")
    if (itWords[0] === words[0]) {
      const common = itWords.filter((w) => words.includes(w)).length;
      if (!best || common > best.common) best = { common, section: it.section };
    }
  }
  return best ? best.section : 'autre';
}

/** Retrouve l'article exact du catalogue s'il existe */
export function findCatalogItem(name) {
  const q = normalize(name);
  return INDEX.find((it) => it.key === q) || null;
}
