/* ============================================================================
   TEST DE VISIBILITE : le point d'entree appele par la page.
   Il ne fait que recevoir la demande, la verifier et passer le relais au
   calcul, qui vit dans lib/analyse.mjs. Le meme calcul tourne en ligne et
   depuis le poste, donc la note ne depend pas d'ou on la demande.
   Nathan, 3 novembre 2026.
   ========================================================================== */
import { analyse } from './lib/analyse.mjs';
import { analyseFiche } from './lib/analyse-fiche.mjs';

const entetes = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const reponse = (corps, code = 200) =>
  new Response(JSON.stringify(corps), { status: code, headers: entetes });
const texte = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async (request) => {
  if (request.method !== 'POST') return reponse({ erreur: 'Methode refusee.' }, 405);

  let demande;
  try { demande = await request.json(); }
  catch (e) { return reponse({ erreur: 'Demande illisible.' }, 400); }

  /* Champ-piege : un robot remplit tout. On refuse sans expliquer pourquoi. */
  if (texte(demande.botcheck, 10)) return reponse({ erreur: 'Demande refusee.' }, 400);

  /* Deux analyses possibles, independantes : le site, la fiche Google. Le
     visiteur peut n'avoir que l'un des deux. */
  const quoi = texte(demande.quoi, 10) || 'site';
  const site = texte(demande.site, 300);
  const fiche = texte(demande.fiche, 400);

  try {
    if (quoi === 'fiche') {
      if (!fiche) return reponse({ erreur: 'Il manque le lien de la fiche.' }, 400);
      const r = await analyseFiche({ fiche });
      return reponse({
        quoi: 'fiche',
        cible: r.nom,
        score: r.note,
        verdict: r.verdict,
        resume: r.resume,
        points: r.points.map(({ etat, titre }) => ({ etat, titre })),
        amain: r.amain
      });
    }
    if (!site) return reponse({ erreur: "Il manque l'adresse du site." }, 400);
    const r = await analyse({ site });
    return reponse({
      quoi: 'site',
      cible: r.site,
      score: r.note,
      verdict: r.verdict,
      resume: r.resume,
      /* La page n'affiche que le nom du point, pas la facon de le corriger :
         le detail est le travail qu'on vend. */
      points: r.points.map(({ etat, titre }) => ({ etat, titre })),
      amain: r.amain
    });
  } catch (e) {
    const code = e && e.code;
    if (code === 'injoignable') return reponse({ erreur: "On n'arrive pas a ouvrir ce site." }, 404);
    if (code === 'introuvable') return reponse({ erreur: 'On ne retrouve pas cette fiche Google.' }, 404);
    if (code === 'sans-cle') return reponse({ erreur: "L'analyse de fiche n'est pas encore branchee." }, 503);
    const msg = String((e && e.message) || '');
    if (/adresse|domaine|protocole|lien/.test(msg)) return reponse({ erreur: 'Adresse invalide.' }, 400);
    return reponse({ erreur: "L'analyse n'a pas abouti." }, 502);
  }
};
