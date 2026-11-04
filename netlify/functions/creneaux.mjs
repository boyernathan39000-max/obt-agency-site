/* ============================================================================
   CRENEAUX LIBRES, pour l'etape 2 de la prise de rendez-vous.
   Le site appelle /api/creneaux?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ ; cette
   fonction interroge Cal.com et renvoie, par jour, les heures encore libres.
   La cle de l'agenda reste ici : elle n'apparait jamais dans la page.
   Nathan, 2 novembre 2026.
   ========================================================================== */

const FUSEAU = 'Europe/Paris';

/* Version de l'API Cal.com demandee pour les creneaux. Elle est fixee ici
   volontairement : une API qui change de forme sans prevenir casserait le
   calendrier, autant savoir quelle forme on attend. */
const VERSION_CRENEAUX = '2024-09-04';

const entetes = {
  'Content-Type': 'application/json; charset=utf-8',
  /* Les creneaux changent a chaque reservation : jamais de cache. */
  'Cache-Control': 'no-store'
};

function reponse(corps, code = 200) {
  return new Response(JSON.stringify(corps), { status: code, headers: entetes });
}

/* Une date de la forme AAAA-MM-JJ, rien d'autre : ce parametre vient du
   visiteur, il part dans une adresse, on le verifie avant. */
const DATE_SEULE = /^\d{4}-\d{2}-\d{2}$/;

export default async (request) => {
  const cle = process.env.CAL_CLE_API;
  const typeEvenement = process.env.CAL_TYPE_EVENEMENT;
  if (!cle || !typeEvenement) {
    return reponse({ erreur: "L'agenda n'est pas encore relie." }, 503);
  }

  const url = new URL(request.url);
  const debut = url.searchParams.get('debut');
  const fin = url.searchParams.get('fin');
  if (!DATE_SEULE.test(debut || '') || !DATE_SEULE.test(fin || '')) {
    return reponse({ erreur: 'Dates attendues au format AAAA-MM-JJ.' }, 400);
  }

  const appel = new URL('https://api.cal.com/v2/slots');
  appel.searchParams.set('eventTypeId', typeEvenement);
  appel.searchParams.set('start', debut);
  appel.searchParams.set('end', fin);
  appel.searchParams.set('timeZone', FUSEAU);

  let brut;
  try {
    const r = await fetch(appel, {
      headers: {
        Authorization: `Bearer ${cle}`,
        'cal-api-version': VERSION_CRENEAUX,
        Accept: 'application/json'
      }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    brut = await r.json();
  } catch (e) {
    /* On ne fabrique jamais de faux creneaux : si l'agenda ne repond pas, la
       page le dit et donne le telephone. */
    return reponse({ erreur: "L'agenda ne repond pas." }, 502);
  }

  const source = brut?.data ?? brut ?? {};
  const creneaux = {};

  for (const [jour, liste] of Object.entries(source)) {
    if (!DATE_SEULE.test(jour) || !Array.isArray(liste)) continue;
    const heures = [];
    for (const item of liste) {
      /* Selon la version, un creneau est une chaine ISO ou un objet { start }.
         Les deux formes sont acceptees, le reste est ignore. */
      const iso = typeof item === 'string' ? item : item?.start;
      if (typeof iso !== 'string') continue;
      const quand = new Date(iso);
      if (Number.isNaN(quand.getTime())) continue;
      heures.push({
        heure: new Intl.DateTimeFormat('fr-FR', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: FUSEAU
        }).format(quand),
        debut: iso
      });
    }
    if (heures.length) creneaux[jour] = heures;
  }

  return reponse({ creneaux, fuseau: FUSEAU });
};
