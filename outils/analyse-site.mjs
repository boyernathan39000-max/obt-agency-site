/* Outil de verification, a lancer depuis le poste :
     node "outils/analyse-site.mjs" <adresse>
   Il appelle exactement le meme calcul que la page en ligne. Il sert a
   verifier que la note est reproductible et que nos propres sites sortent en
   haut. Nathan, 3 novembre 2026. */
import { analyse } from '../netlify/functions/lib/analyse.mjs';

const [site] = process.argv.slice(2);
if (!site) { console.error('usage : node outils/analyse-site.mjs <adresse>'); process.exit(1); }

try {
  const r = await analyse({ site });
  console.log('\n' + r.site + '  ->  ' + r.note + '/100   (' + r.mesure.duree + ' ms)');
  console.log(r.verdict);
  for (const p of r.points) console.log((p.etat === 'ok' ? '  OK  ' : '  --  ') + String(p.poids).padStart(2) + '  ' + p.titre);
} catch (e) {
  console.error('ECHEC :', e.message);
  process.exit(2);
}
