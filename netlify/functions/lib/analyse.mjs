/* ============================================================================
   L'ANALYSE DE VISIBILITE, le calcul lui-meme.
   Ce fichier ne sait rien du web ni de Netlify : on lui donne une adresse, il
   rend une note et une liste de points. La fonction serveur et l'outil en
   ligne de commande l'utilisent tous les deux, pour qu'un test lance depuis
   le poste donne exactement le meme resultat qu'en ligne.

   REGLE : la note est reproductible. Deux analyses du meme site, a deux jours
   d'intervalle, rendent le meme chiffre tant que le site n'a pas change. On
   n'y met donc que des mesures stables (une balise est la ou elle n'y est
   pas), jamais une mesure de vitesse, qui varie a chaque appel selon le
   reseau et la machine. La vitesse est affichee a titre indicatif, elle ne
   compte pas dans la note. Nathan, 3 novembre 2026.
   ========================================================================== */

export const BAREME = [
  { cle: 'https',            poids: 10 },
  { cle: 'titre',            poids: 6 },
  { cle: 'titre-long',       poids: 4 },
  { cle: 'description',      poids: 6 },
  { cle: 'description-long', poids: 4 },
  { cle: 'h1',               poids: 6 },
  { cle: 'mobile',           poids: 6 },
  { cle: 'entreprise',       poids: 9 },
  { cle: 'telephone',        poids: 5 },
  { cle: 'robots',           poids: 3 },
  { cle: 'sitemap',          poids: 5 },
  { cle: 'images',           poids: 5 },
  { cle: 'langue',           poids: 3 },
  { cle: 'canonique',        poids: 3 },
  { cle: 'blog',             poids: 7 },
  { cle: 'structure',        poids: 4 },
  { cle: 'partage',          poids: 4 },
  { cle: 'poids',            poids: 3 },
  { cle: 'maillage',         poids: 4 },
  { cle: 'mixte',            poids: 3 }
];
/* 10+6+4+6+4+6+6+9+5+3+5+5+3+3+7+4+4+3+4+3 = 100 */

const LIMITE_OCTETS = 2 * 1024 * 1024;   // on ne lit jamais plus de 2 Mo
const DELAI = 12000;                      // 12 s, au-dela le site est hors jeu

/* --- nettoyage de l'adresse saisie --------------------------------------- */
export function adresseSure(saisie) {
  let v = String(saisie || '').trim();
  if (!v) throw new Error('adresse vide');
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  let u;
  try { u = new URL(v); } catch (e) { throw new Error('adresse illisible'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('protocole refuse');
  if (u.username || u.password) throw new Error('adresse refusee');
  const h = u.hostname.toLowerCase();
  /* On ne va pas chercher une adresse interne : ce point d'entree est public,
     il ne doit pas servir a lire le reseau prive de l'hebergeur. */
  /* Garde-fou leve uniquement pour nos propres essais depuis le poste :
     OBT_ANALYSE_LOCAL=1. En ligne, la variable n'existe pas. */
  const interdits = (typeof process !== 'undefined' && process.env && process.env.OBT_ANALYSE_LOCAL === '1') ? [] : [
    /^localhost$/, /\.local$/, /\.internal$/, /^\[?::1\]?$/,
    /^10\./, /^127\./, /^169\.254\./, /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./, /^0\./
  ];
  if (interdits.some((r) => r.test(h))) throw new Error('adresse refusee');
  if (!interdits.length ? false : !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(h)) throw new Error('nom de domaine invalide');
  u.hash = '';
  return u;
}

/* --- recuperation d'une page, bornee en taille et en temps ---------------- */
async function recupere(url, { methode = 'GET' } = {}) {
  const stop = AbortSignal.timeout ? AbortSignal.timeout(DELAI) : undefined;
  const r = await fetch(url, {
    method: methode,
    redirect: 'follow',
    signal: stop,
    headers: {
      'User-Agent': 'OBT-Agency-Test-Visibilite/1.0 (+https://obt-agency.fr/test-visibilite.html)',
      'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9'
    }
  });
  if (methode === 'HEAD') return { ok: r.ok, statut: r.status, url: r.url, texte: '' };
  const brut = await r.arrayBuffer();
  const coupe = brut.byteLength > LIMITE_OCTETS ? brut.slice(0, LIMITE_OCTETS) : brut;
  return {
    ok: r.ok,
    statut: r.status,
    url: r.url,
    octets: brut.byteLength,
    texte: new TextDecoder('utf-8', { fatal: false }).decode(coupe)
  };
}

/* --- petites aides de lecture du HTML ------------------------------------ */
const sansAccent = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const simple = (t) => sansAccent(t).toLowerCase();

function texteVisible(html) {
  return simple(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' '))
    .replace(/\s+/g, ' ');
}

/* Un mot saisi par le visiteur se retrouve rarement tel quel dans la page :
   « charpentier » peut y etre ecrit « charpenterie », « charpentiers ». On
   compare donc sur une racine, jamais sur le mot entier. */
function racine(mot) {
  const m = simple(mot).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').sort((a, b) => b.length - a.length)[0] || '';
  if (m.length <= 4) return m;
  return m.slice(0, Math.max(4, Math.min(7, m.length - 2)));
}

export function cherche(html, mot) {
  const r = racine(mot);
  if (!r) return false;
  return texteVisible(html).indexOf(r) !== -1;
}

/* --- l'analyse ------------------------------------------------------------ */
export async function analyse({ site }) {
  const u = adresseSure(site);
  const depart = Date.now();

  let page = null;
  let erreurHttps = null;
  try {
    page = await recupere(u.toString());
  } catch (e) {
    erreurHttps = e;
  }
  /* Le site ne repond pas en HTTPS : on tente le HTTP, pour savoir s'il est
     simplement en clair plutot que mort. La difference compte pour le
     visiteur. Et pour la note. */
  /* Le HTTPS se juge sur l'adresse finalement servie, pas sur le fait que la
     page reponde : un site en clair repond tres bien. */
  let httpsOk = !!(page && page.ok) && /^https:/i.test((page && page.url) || '');
  if (!httpsOk && u.protocol === 'https:') {
    const enClair = new URL(u.toString());
    enClair.protocol = 'http:';
    try {
      const p2 = await recupere(enClair.toString());
      if (p2.ok) { page = p2; httpsOk = /^https:/i.test(p2.url || ''); }
    } catch (e) { /* tant pis, on reste sur l'echec */ }
  }
  if (!page || !page.ok) {
    const err = new Error('site injoignable');
    err.code = 'injoignable';
    throw err;
  }
  if (/^https:/i.test(page.url || '')) httpsOk = true;

  const html = page.texte;
  const base = new URL(page.url || u.toString());

  /* robots.txt et sitemap.xml : deux appels courts, en tete seulement quand
     c'est possible. Un sitemap declare dans le robots compte aussi. */
  let robotsOk = false, sitemapOk = false, robotsTexte = '';
  try {
    const rb = await recupere(new URL('/robots.txt', base).toString());
    robotsOk = rb.ok && /user-agent/i.test(rb.texte);
    robotsTexte = rb.texte || '';
  } catch (e) { /* absent */ }
  if (/sitemap\s*:/i.test(robotsTexte)) sitemapOk = true;
  if (!sitemapOk) {
    for (const chemin of ['/sitemap.xml', '/sitemap_index.xml']) {
      try {
        const sm = await recupere(new URL(chemin, base).toString(), { methode: 'HEAD' });
        if (sm.ok) { sitemapOk = true; break; }
      } catch (e) { /* suivant */ }
    }
  }

  /* --- lecture des balises --- */
  const titre = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]
    .replace(/\s+/g, ' ').trim();
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]*>/i) || [''])[0]
    .match(/content=["']([^"']*)["']/i);
  const description = desc ? desc[1].replace(/\s+/g, ' ').trim() : '';
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  const mobile = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
  const langue = /<html[^>]+lang=["'][a-z]{2}/i.test(html);
  const canonique = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html);
  const telephone = /href=["']tel:/i.test(html)
    || /\b0[1-9](?:[\s.-]?\d{2}){4}\b/.test(html.replace(/<[^>]+>/g, ' '));

  /* Donnees d'entreprise : JSON-LD d'un type d'organisation, ou a defaut les
     anciennes microdonnees. On ne compte pas un simple « WebSite ». */
  let entreprise = false;
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (/"@type"\s*:\s*"?\[?[^"\]]*(LocalBusiness|ProfessionalService|Organization|Restaurant|Store|HomeAndConstructionBusiness|LodgingBusiness|Hotel|BedAndBreakfast|Winery|FoodEstablishment)/i.test(m[1])) {
      entreprise = true; break;
    }
  }
  if (!entreprise) entreprise = /itemtype=["']https?:\/\/schema\.org\/(LocalBusiness|Organization)/i.test(html);

  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const decrites = images.filter((t) => /\salt\s*=/.test(t)).length;
  const imagesOk = images.length === 0 ? true : (decrites / images.length) >= 0.8;

  /* Un site qui publie se positionne : on cherche une rubrique d'articles,
     quel que soit son nom. */
  const blog = /href=["'][^"']*(blog|actualites|actualit%C3%A9s|conseils|articles|journal|news)(\.html|\/|["'#?-])/i.test(html);
  /* Des sous-titres, donc un texte organise, pas un bloc. */
  const h2 = (html.match(/<h2[\s>]/gi) || []).length;
  /* Les liens internes : un site qui ne se relie pas a lui-meme n'est pas
     explore. On compte les liens du meme domaine, pages d'ancre exclues. */
  const liens = new Set();
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    const h = m[1];
    if (/^(#|mailto:|tel:|javascript:)/i.test(h)) continue;
    if (/^https?:\/\//i.test(h) && !h.includes(base.hostname)) continue;
    liens.add(h.split('#')[0]);
  }
  /* Du contenu appele en clair sur une page chiffree : le navigateur le
     bloque ou affiche un avertissement. */
  const mixte = /<(?:img|script|iframe|link)\b[^>]*(?:src|href)=["']http:\/\//i.test(html);
  const partage = /property=["']og:title["']/i.test(html) && /property=["']og:image["']/i.test(html);

  const long = (t) => t.length;
  const resultats = {
    https: httpsOk,
    titre: !!titre,
    'titre-long': !!titre && long(titre) >= 25 && long(titre) <= 65,
    description: !!description,
    'description-long': !!description && long(description) >= 70 && long(description) <= 165,
    h1: h1 === 1,
    mobile,
    entreprise,
    telephone,
    robots: robotsOk,
    sitemap: sitemapOk,
    images: imagesOk,
    langue,
    canonique,
    blog,
    structure: h2 >= 2,
    partage,
    poids: (page.octets || 0) <= 250 * 1024,
    maillage: liens.size >= 8,
    mixte: !mixte
  };

  const LIBELLES = {
    https: ['Le site répond en HTTPS', 'Le site n’est pas en HTTPS'],
    titre: ['La page d’accueil a un titre', 'La page d’accueil n’a pas de titre'],
    'titre-long': ['Le titre a la bonne longueur', 'Le titre sera coupé dans Google'],
    description: ['La page a une description', 'La page n’a pas de description'],
    'description-long': ['La description a la bonne longueur', 'La description sera coupée'],
    h1: ['Un titre principal, un seul', 'Pas de titre principal unique'],
    mobile: ['La page s’adapte au téléphone', 'La page n’est pas réglée pour le téléphone'],
    entreprise: ['Votre entreprise est déclarée à Google', 'Votre entreprise n’est pas déclarée à Google'],
    telephone: ['Le téléphone est accessible', 'Aucun téléphone sur la page d’accueil'],
    robots: ['Le fichier robots est en place', 'Pas de fichier robots'],
    sitemap: ['Le plan du site est fourni à Google', 'Aucun plan du site fourni à Google'],
    images: ['Les images sont décrites', 'Des images ne sont pas décrites'],
    langue: ['La langue de la page est déclarée', 'La langue de la page n’est pas déclarée'],
    canonique: ['L’adresse de référence est déclarée', 'Pas d’adresse de référence'],
    blog: ['Vous publiez des articles', 'Aucune rubrique d’articles'],
    structure: ['Le texte est découpé en sections', 'Le texte n’est pas découpé'],
    partage: ['Le partage est soigné', 'Partage sans titre ni image'],
    poids: ['La page est légère', 'La page est lourde à charger'],
    maillage: ['Les pages se relient entre elles', 'Trop peu de liens entre vos pages'],
    mixte: ['Tout est chargé en sécurité', 'Des éléments sont chargés hors sécurité']
  };

  let note = 0;
  const points = [];
  for (const { cle, poids } of BAREME) {
    const ok = !!resultats[cle];
    if (ok) note += poids;
    points.push({ cle, etat: ok ? 'ok' : 'ko', poids, titre: LIBELLES[cle][ok ? 0 : 1] });
  }

  const manques = points.filter((p) => p.etat === 'ko');
  const verdict = note >= 85 ? 'Votre site est en ordre, on vous trouve.'
    : note >= 65 ? 'Votre site tient la route, mais il laisse passer des clients.'
    : note >= 40 ? 'Votre site se charge, mais Google ne sait pas quoi en faire.'
    : 'Votre site est invisible pour Google en l’état.';
  const resume = manques.length === 0
    ? 'Les seize points que nous mesurons sont au vert. Le reste se joue sur votre fiche Google, vos contenus et vos liens.'
    : manques.length + (manques.length > 1 ? ' points vous coûtent des visites. ' : ' point vous coûte des visites. ')
      + 'Le détail et la marche à suivre sont dans le rapport.';

  return {
    site: base.origin,
    note,
    verdict,
    resume,
    points,
    mesure: {
      octets: page.octets || 0,
      images: images.length,
      duree: Date.now() - depart
    },
    amain: [
      { titre: 'Votre position réelle sur Google.',
        dit: 'Relevée à la main sur vos mots-clés, Google ne la donne pas en direct.' },
      { titre: 'Les sites qui parlent de vous.',
        dit: 'Les liens entrants comptent pour beaucoup. Aucun outil gratuit ne les voit tous.' },
      { titre: 'Ce que répondent les IA.',
        dit: 'On demande à ChatGPT, Gemini et Perplexity un professionnel de votre métier dans votre ville. On regarde qui sort.' }
    ]
  };
}
