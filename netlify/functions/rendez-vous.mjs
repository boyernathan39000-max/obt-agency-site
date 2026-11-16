/* ============================================================================
   RESERVATION DU CRENEAU, pour l'etape 3 de la prise de rendez-vous.
   Le site envoie ici le creneau choisi et les coordonnees. C'est Cal.com qui
   bloque la place dans l'agenda et qui envoie la confirmation par courriel au
   client comme a nous, avec le lien pour deplacer ou annuler.
   Rien n'est bloque avant cet appel. Nathan, 2 novembre 2026.
   ========================================================================== */

const FUSEAU = 'Europe/Paris';
const VERSION_RESERVATION = '2024-08-13';

const entetes = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const reponse = (corps, code = 200) =>
  new Response(JSON.stringify(corps), { status: code, headers: entetes });

const texte = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async (request) => {
  if (request.method !== 'POST') return reponse({ erreur: 'Methode refusee.' }, 405);

  const cle = process.env.CAL_CLE_API;
  const typeEvenement = process.env.CAL_TYPE_EVENEMENT;
  if (!cle || !typeEvenement) {
    return reponse({ erreur: "L'agenda n'est pas encore relie." }, 503);
  }

  let demande;
  try { demande = await request.json(); }
  catch (e) { return reponse({ erreur: 'Demande illisible.' }, 400); }

  /* Champ-piege : un robot remplit tout, un humain ne voit pas ce champ.
     On repond « ok » sans rien reserver, pour ne pas lui apprendre la regle. */
  if (texte(demande.botcheck, 10)) return reponse({ ok: true });

  /* Depuis le 6 novembre 2026, le formulaire demande « Nom et prenom » en une
     seule case. L'ancien champ prenom reste accepte s'il arrive. */
  const prenom = texte(demande.prenom, 80);
  const nom = texte(demande.nom, 120);
  const site = texte(demande.site, 300);
  const fiche = texte(demande.fiche, 300);
  const email = texte(demande.email, 160);
  const tel = texte(demande.tel, 40);
  const entreprise = texte(demande.entreprise, 160);
  const message = texte(demande.message, 2000);
  const besoin = texte(demande.besoin, 120);
  const debut = texte(demande.debut, 40);

  if (!nom || !tel || !entreprise) {
    return reponse({ erreur: 'Il manque des informations.' }, 400);
  }
  if (!COURRIEL.test(email)) return reponse({ erreur: 'Adresse de courriel invalide.' }, 400);

  const quand = new Date(debut);
  if (Number.isNaN(quand.getTime())) return reponse({ erreur: 'Creneau invalide.' }, 400);
  /* Un creneau deja passe n'est pas un creneau : la page a pu rester ouverte
     plusieurs heures avant la validation. */
  if (quand.getTime() < Date.now()) return reponse({ erreur: 'Ce creneau est passe.' }, 409);

  let resultat;
  try {
    const r = await fetch('https://api.cal.com/v2/bookings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cle}`,
        'cal-api-version': VERSION_RESERVATION,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        start: quand.toISOString(),
        eventTypeId: Number(typeEvenement),
        attendee: {
          name: prenom ? `${prenom} ${nom}` : nom,
          email,
          phoneNumber: tel,
          timeZone: FUSEAU,
          language: 'fr'
        },
        metadata: {
          besoin: besoin || '(non precise)',
          entreprise,
          telephone: tel,
          site: site || '(non indique)',
          fiche: fiche || '(non indiquee)',
          origine: 'Site OBT Agency, page Contact'
        },
        bookingFieldsResponses: {
          title: `${besoin || 'Rendez-vous'} : ${entreprise}`,
          notes: [besoin && `Besoin : ${besoin}`, `Entreprise : ${entreprise}`,
                  `Telephone : ${tel}`, site && `Site : ${site}`, fiche && `Fiche Google : ${fiche}`,
                  message && `Message : ${message}`]
            .filter(Boolean).join('\n')
        }
      })
    });
    resultat = await r.json().catch(() => ({}));
    /* Le creneau a pu etre pris entre l'affichage et la validation : Cal.com
       repond alors en erreur. C'est une vraie information pour le visiteur. */
    if (!r.ok) {
      const pris = r.status === 400 || r.status === 409;
      return reponse({
        erreur: pris ? 'Ce creneau vient d’etre pris.' : "La reservation n'a pas abouti."
      }, pris ? 409 : 502);
    }
  } catch (e) {
    return reponse({ erreur: "L'agenda ne repond pas." }, 502);
  }

  return reponse({ ok: true, reference: resultat?.data?.uid ?? null });
};
