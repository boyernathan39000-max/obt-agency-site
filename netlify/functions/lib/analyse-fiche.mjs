/* ============================================================================
   L'ANALYSE DE LA FICHE GOOGLE.
   On part du lien de la fiche (lien de partage, lien Maps ou simplement le
   nom de l'etablissement), on retrouve la fiche par l'API Places de Google,
   puis on note ce que l'API rend.

   CE QUE L'API DONNE : la note, le nombre d'avis, les horaires, le site, le
   telephone, la categorie, les photos, l'adresse, la description et les cinq
   derniers avis.
   CE QU'ELLE NE DONNE PAS : les reponses aux avis, les posts et actualites
   publies sur la fiche, les mots-cles de la description, les questions des
   clients. Ces points-la sont regardes a la main et mis dans le rapport : on
   ne fait pas semblant de les mesurer.

   Il faut une cle d'API Google (variable GOOGLE_PLACES_CLE). Sans elle, la
   fonction le dit au lieu d'inventer une note. Nathan, 3 novembre 2026.
   ========================================================================== */

const API = 'https://places.googleapis.com/v1/places:searchText';
const CHAMPS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.rating',
  'places.userRatingCount', 'places.regularOpeningHours', 'places.websiteUri',
  'places.nationalPhoneNumber', 'places.primaryTypeDisplayName', 'places.photos',
  'places.editorialSummary', 'places.reviews', 'places.googleMapsUri'
].join(',');

export const BAREME_FICHE = [
  { cle: 'note',        poids: 12 },
  { cle: 'avis',        poids: 12 },
  { cle: 'horaires',    poids: 12 },
  { cle: 'photos',      poids: 12 },
  { cle: 'site',        poids: 10 },
  { cle: 'telephone',   poids: 10 },
  { cle: 'categorie',   poids: 8 },
  { cle: 'adresse',     poids: 8 },
  { cle: 'recent',      poids: 8 },
  { cle: 'description', poids: 8 }
];
/* 12+12+12+12+10+10+8+8+8+8 = 100 */

/* --- de ce que colle le visiteur, on tire de quoi chercher ---------------- */
export async function cherchable(saisie) {
  const v = String(saisie || '').trim();
  if (!v) throw new Error('lien vide');

  /* Un simple nom d'etablissement : on cherche avec, tel quel. */
  if (!/^https?:\/\//i.test(v) && !/\b(maps\.app\.goo\.gl|share\.google|google\.[a-z.]+\/maps)/i.test(v)) {
    return v.slice(0, 160);
  }

  let u;
  try { u = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v); } catch (e) {
    throw new Error('lien illisible');
  }
  if (!/(^|\.)(google\.[a-z.]+|goo\.gl)$/i.test(u.hostname)) throw new Error('lien refuse');

  /* Un lien de partage ne contient rien : il faut le suivre pour obtenir
     l'adresse complete, qui porte le nom de l'etablissement. */
  let finale = u.toString();
  try {
    const r = await fetch(finale, {
      redirect: 'follow',
      signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
      headers: { 'User-Agent': 'OBT-Agency-Test-Visibilite/1.0', 'Accept-Language': 'fr-FR,fr;q=0.9' }
    });
    finale = r.url || finale;
  } catch (e) { /* on reste sur ce qu'on a */ }

  const f = new URL(finale);
  const m = f.pathname.match(/\/maps\/place\/([^/]+)/);
  if (m) return decodeURIComponent(m[1].replace(/\+/g, ' ')).slice(0, 160);
  const q = f.searchParams.get('q') || f.searchParams.get('query');
  if (q) return q.slice(0, 160);
  throw new Error('impossible de reconnaitre la fiche');
}

export async function analyseFiche({ fiche }) {
  const cle = (typeof process !== 'undefined' && process.env) ? process.env.GOOGLE_PLACES_CLE : null;
  if (!cle) {
    const e = new Error('cle absente');
    e.code = 'sans-cle';
    throw e;
  }

  const recherche = await cherchable(fiche);
  const r = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': cle,
      'X-Goog-FieldMask': CHAMPS
    },
    body: JSON.stringify({ textQuery: recherche, languageCode: 'fr', maxResultCount: 1 })
  });
  if (!r.ok) {
    const e = new Error('API Places HTTP ' + r.status);
    e.code = 'api';
    throw e;
  }
  const json = await r.json();
  const p = (json.places || [])[0];
  if (!p) {
    const e = new Error('fiche introuvable');
    e.code = 'introuvable';
    throw e;
  }

  const note = typeof p.rating === 'number' ? p.rating : 0;
  const nbAvis = p.userRatingCount || 0;
  const photos = (p.photos || []).length;
  const horaires = !!(p.regularOpeningHours && (p.regularOpeningHours.weekdayDescriptions || []).length);
  const site = !!p.websiteUri;
  const tel = !!p.nationalPhoneNumber;
  const categorie = !!(p.primaryTypeDisplayName && p.primaryTypeDisplayName.text);
  const adresse = !!(p.formattedAddress && /\d/.test(p.formattedAddress));
  const description = !!(p.editorialSummary && p.editorialSummary.text);

  /* Un avis d'il y a trois ans ne dit rien de l'activite d'aujourd'hui. */
  let dernier = null;
  for (const a of (p.reviews || [])) {
    const t = a.publishTime ? Date.parse(a.publishTime) : NaN;
    if (!Number.isNaN(t) && (dernier === null || t > dernier)) dernier = t;
  }
  const recent = dernier !== null && (Date.now() - dernier) < 90 * 24 * 3600 * 1000;

  const points = [];
  let total = 0;
  const pose = (cleP, ok, moitie, titreOk, titreKo, titreMoitie) => {
    const poids = BAREME_FICHE.find((b) => b.cle === cleP).poids;
    const gagne = ok ? poids : (moitie ? Math.round(poids / 2) : 0);
    total += gagne;
    points.push({
      cle: cleP,
      etat: ok ? 'ok' : (moitie ? 'moyen' : 'ko'),
      poids,
      titre: ok ? titreOk : (moitie ? (titreMoitie || titreKo) : titreKo)
    });
  };

  pose('note', note >= 4.5, note >= 4, 'Une note de ' + note.toString().replace('.', ',') + ' sur 5',
       nbAvis ? 'Une note de ' + note.toString().replace('.', ',') + ' sur 5, trop basse' : 'Aucune note',
       'Une note de ' + note.toString().replace('.', ',') + ' sur 5, à faire monter');
  pose('avis', nbAvis >= 20, nbAvis >= 10, nbAvis + ' avis, c’est solide',
       nbAvis + ' avis, c’est trop peu', nbAvis + ' avis, il en faut plus');
  pose('horaires', horaires, false, 'Vos horaires sont renseignés', 'Vos horaires manquent');
  pose('photos', photos >= 10, photos >= 3, photos + ' photos sur la fiche',
       'Presque aucune photo', photos + ' photos, il en faut plus');
  pose('site', site, false, 'Votre site est relié à la fiche', 'Aucun site relié à la fiche');
  pose('telephone', tel, false, 'Votre téléphone est sur la fiche', 'Aucun téléphone sur la fiche');
  pose('categorie', categorie, false, 'Votre catégorie est choisie', 'Aucune catégorie principale');
  pose('adresse', adresse, false, 'Votre adresse est complète', 'Votre adresse est incomplète');
  pose('recent', recent, false, 'Vos avis sont récents', 'Aucun avis récent');
  pose('description', description, false, 'La fiche porte une description', 'La fiche n’a pas de description');

  const verdict = total >= 85 ? 'Votre fiche est tenue, elle travaille pour vous.'
    : total >= 65 ? 'Votre fiche existe, mais elle laisse la place aux autres.'
    : total >= 40 ? 'Votre fiche est à moitié remplie, Google ne la met pas en avant.'
    : 'Votre fiche est quasiment vide, autant ne pas en avoir.';
  const manques = points.filter((x) => x.etat !== 'ok').length;

  return {
    nom: (p.displayName && p.displayName.text) || recherche,
    note: total,
    verdict,
    resume: manques === 0
      ? 'Les dix points que nous mesurons sont au vert. Le reste se joue sur les réponses aux avis et sur vos publications.'
      : manques + (manques > 1 ? ' points vous coûtent des appels. ' : ' point vous coûte des appels. ')
        + 'Le détail et la marche à suivre sont dans le rapport.',
    points,
    amain: [
      { titre: 'Vos réponses aux avis.',
        dit: 'Google ne les donne pas par son interface : on les lit une par une.' },
      { titre: 'Vos publications sur la fiche.',
        dit: 'Les posts et les actualités comptent pour le classement local. On regarde ce que vous publiez. Et à quel rythme.' },
      { titre: 'Les concurrents qui sortent avant vous.',
        dit: 'On compare votre fiche aux trois qui apparaissent au-dessus, point par point.' }
    ]
  };
}
