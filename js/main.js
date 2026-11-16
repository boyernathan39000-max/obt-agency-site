/* ==========================================================================
   OBT Agency, main.js
   JavaScript vanilla, aucune dépendance.
   1. Menu burger
   2. Masquage du bandeau menu au défilement
   3. Carrousel « Nos réalisations » (boucle infinie dans les deux sens)
   4. Simulateur (accueil, section 6)
   5. Vitesse des taches des heros
   6. Apparitions au défilement
   7. Hauteur égalisée des cartes empilées
   8. Démo d'audit + refonte du hero d'accueil
   9. Tunnel « Nos offres » (Tarifs)
   10. FAQ en accordéon (Contact)
   11. Formulaire de devis (Contact)
   12. Mise en pause des animations hors écran
   13. Bandes défilantes : nombre de copies suffisant
   14. Piles collantes en mobile
   15. Curseur : un point bleu à la place de la flèche
   16. Voile de chargement
   17. Visionneuse de réalisation
   18. Carte d'avis qui défile (page Contact)
   19. Barre d'appel flottante : effacée devant certaines zones
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. MENU BURGER
     ------------------------------------------------------------------------ */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('primary-nav');
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      document.body.classList.toggle('is-locked', open);
    }

    toggle.addEventListener('click', function () {
      setOpen(!nav.classList.contains('is-open'));
    });

    // Un clic sur un lien referme le menu.
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    // Échap referme le menu.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Si on repasse au-dessus du point de rupture pendant que le menu est
    // ouvert, on remet tout à plat pour ne pas laisser le body verrouillé.
    var mq = window.matchMedia('(min-width: 769px)');
    var onChange = function (e) { if (e.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* ------------------------------------------------------------------------
     2. BANDEAU MENU, masqué en descendant, réaffiché en remontant
     ------------------------------------------------------------------------ */
  function initHeader() {
    var header = document.getElementById('site-header');
    if (!header) return;

    var last = window.scrollY;
    var ticking = false;
    /* Les sections au fond nuit. Le bandeau n'a pas de fond a lui : son logo
       et ses liens sont ecrits en sombre, donc ils disparaissent des qu'une
       de ces sections passe dessous. On le detecte a chaque image de
       defilement et on repeint le bandeau en clair. */
    var sombres = [].slice.call(document.querySelectorAll('[data-fond="sombre"]'));

    /* La bande nuit doit aussi passer SOUS le logo et SOUS les liens. Le
       bloc du dernier appel, par exemple, ne touche pas les bords sur un
       grand ecran : y repeindre le bandeau en blanc poserait le logo blanc
       sur le creme. Nathan, 2 novembre 2026. */
    function couvre(r, el) {
      if (!el) return true;
      var e = el.getBoundingClientRect();
      if (!e.width) return true;
      return r.left <= e.left + 1 && r.right >= e.right - 1;
    }

    function surFondSombre() {
      if (!sombres.length) return false;
      var milieu = header.offsetHeight / 2;
      var logo = header.querySelector('.logo');
      var liens = header.querySelector('.nav-list');
      return sombres.some(function (s) {
        var r = s.getBoundingClientRect();
        if (r.top > milieu || r.bottom < milieu) return false;
        return couvre(r, logo) && couvre(r, liens);
      });
    }

    function update() {
      var y = window.scrollY;
      header.classList.toggle('est-sombre', surFondSombre());
      /* Des qu'on quitte le haut de la page, le bandeau prend un fond : sans
         lui, les liens se posent sur le texte de la page et plus rien n'est
         lisible. En haut, il reste transparent. Nathan, 3 novembre 2026. */
      header.classList.toggle('est-posee', y > 12);
      var nav = document.getElementById('primary-nav');
      var menuOpen = nav && nav.classList.contains('is-open');
      /* Le bandeau ne s'affiche qu'en haut de page et à la remontée, sur
         toutes les largeurs. Il était cloué à l'écran en mobile tant que le
         bouton du menu s'y confondait avec le fond ; maintenant qu'il est bleu
         plein, on le retrouve dès qu'il revient. Jamais masqué quand le menu
         mobile est ouvert : il porte la croix de fermeture. */
      if (!menuOpen && y > 200 && y > last) header.classList.add('is-hidden');
      else header.classList.remove('is-hidden');
      last = y;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------------
     3. CARROUSEL « NOS RÉALISATIONS »
     Boucle infinie dans les deux sens : la piste contient trois copies de la
     liste et on démarre au premier élément de la copie du milieu. Quand on
     sort de cette copie, on recale d'une longueur de liste sans transition, le décalage est invisible, donc on peut tourner indéfiniment à gauche
     comme à droite sans le saut d'un simple modulo.
     ------------------------------------------------------------------------ */
  function initCarousel(root) {
    var track = root.querySelector('[data-carousel-track]');
    var viewport = root.querySelector('.carousel-viewport');
    var originals = Array.prototype.slice.call(root.querySelectorAll('[data-carousel-slide]'));
    var prev = root.querySelector('[data-carousel-prev]');
    var next = root.querySelector('[data-carousel-next]');
    if (!track || !viewport || originals.length === 0) return;

    var count = originals.length;

    // Deux copies supplémentaires, avant et après les originaux.
    function cloneSet() {
      var frag = document.createDocumentFragment();
      originals.forEach(function (node) {
        var c = node.cloneNode(true);
        c.setAttribute('data-carousel-clone', '');
        frag.appendChild(c);
      });
      return frag;
    }
    var before = cloneSet();
    var after = cloneSet();
    track.insertBefore(before, track.firstChild);
    track.appendChild(after);

    var slides = Array.prototype.slice.call(track.querySelectorAll('[data-carousel-slide]'));
    var index = count; // premier élément de la copie du milieu
    var animating = false;

    function place(animate) {
      var active = slides[index];
      if (!active) return;
      track.style.transition = animate ? '' : 'none';
      var offset = active.offsetLeft - (viewport.clientWidth - active.offsetWidth) / 2;
      if (active.offsetWidth >= viewport.clientWidth) offset = active.offsetLeft;
      track.style.transform = 'translateX(' + (-offset) + 'px)';
      if (!animate) {
        // Force un recalcul avant de rendre la transition à nouveau active,
        // sinon le navigateur regroupe les deux changements et anime le recalage.
        void track.offsetWidth;
        track.style.transition = '';
      }
      slides.forEach(function (slide, i) {
        var isActive = i === index;
        slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        // Seules les deux voisines portent le flou : les autres sont hors cadre.
        slide.classList.toggle('is-near', i === index - 1 || i === index + 1);
        slide.querySelectorAll('a, button').forEach(function (el) {
          el.tabIndex = isActive ? 0 : -1;
        });
      });
    }

    function normalize() {
      // Ramene l'index dans la copie du milieu, sans transition. Une boucle et
      // non deux tests : plusieurs clics enchaines peuvent l'avoir emmene a
      // plus d'une longueur de serie.
      var avant = index;
      while (index < count) index += count;
      while (index >= count * 2) index -= count;
      if (index !== avant) place(false);
      animating = false;
    }

    function go(step) {
      /* Le verrou d'origine avalait tout clic recu pendant l'animation, longue
         de 0,8 s : deux clics rapides sur la fleche n'en produisaient qu'un.
         On enchaine desormais, la transition en cours est simplement
         redirigee, en se contentant de rester dans la piste reellement
         rendue, qui contient trois copies de la serie. Au-dela, on ignore :
         il n'y aurait plus rien a montrer. */
      var suivant = index + step;
      if (suivant < 0 || suivant >= count * 3) return;
      animating = true;
      index = suivant;
      place(true);
    }

    track.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'transform' && e.target === track) normalize();
    });
    // Filet de sécurité si transitionend ne se déclenche pas (onglet en
    // arrière-plan, prefers-reduced-motion, transition à 0s).
    var guard;
    function armGuard() {
      clearTimeout(guard);
      guard = setTimeout(function () { if (animating) normalize(); }, 1000);
    }

    if (prev) prev.addEventListener('click', function () { go(-1); armGuard(); });
    if (next) next.addEventListener('click', function () { go(1); armGuard(); });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(-1); armGuard(); }
      else if (e.key === 'ArrowRight') { go(1); armGuard(); }
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { place(false); }, 120);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { place(false); }).catch(function () {});
    }

    place(false);
  }

  /* ------------------------------------------------------------------------
     4. SIMULATEUR (accueil, section 6)

     Modèle repris de la capture « Voir la méthode de calcul » :
       recherches       = population ÷ 10 000 × intensité du métier
       concurrents      = 3 + population ÷ 12 000
       visiteurs gagnés = recherches × (54 % − 5 %) ÷ concurrents × 1,6
       clients / an     = visiteurs gagnés × taux de transformation × 12
       manque à gagner  = visiteurs gagnés × taux × valeur d'un client × 12

     Les six métiers sont ceux demandés par le client (BTP, paysagiste,
     architecte, hôtel, restaurant, gîte). Leurs constantes sont des valeurs de
     travail, à valider, elles sont affichées dans le bloc « méthode de calcul »
     de la page, comme le promet son texte.
     ------------------------------------------------------------------------ */
  // `intro` porte toute l'ouverture de phrase : les accords (« installée »,
  // « situés ») changent d'un métier à l'autre, un gabarit unique produirait
  // des fautes.
  //
  // `intensite` (recherches mensuelles pour 10 000 habitants) et `taux`
  // (transformation contact → client) sont propres au métier.
  // `valeurs` donne la valeur d'un client PAR ZONE : un chantier, une nuitée ou
  // un couvert ne pèsent pas le même montant selon le secteur. C'est cette
  // valeur qui fait atterrir le manque à gagner sur les montants arrêtés par le
  // client ; elle est affichée dans le bloc « méthode de calcul », donc
  // vérifiable.
  var METIERS = {
    btp: {
      intro: "Pour une entreprise du BTP installée", intensite: 65, taux: 0.06,
      valeurs: { rurale: 6790, ville: 5710, grande: 5280, metropole: 5400 }
    },
    paysagiste: {
      intro: "Pour un paysagiste installé", intensite: 45, taux: 0.07,
      valeurs: { rurale: 3620, ville: 2890, grande: 2240, metropole: 2790 }
    },
    architecte: {
      intro: "Pour un architecte installé", intensite: 30, taux: 0.04,
      valeurs: { rurale: 18680, ville: 13160, grande: 13720, metropole: 16740 }
    },
    hotel: {
      intro: "Pour un hôtel installé", intensite: 90, taux: 0.06,
      valeurs: { rurale: 2640, ville: 2550, grande: 2610, metropole: 3190 }
    },
    restaurant: {
      intro: "Pour un restaurant installé", intensite: 130, taux: 0.09,
      // Zone rurale : c'est la valeur du client qui fait tomber le manque à
      // gagner sur le montant arrêté par le client
      // (28,7 clients par an, arrondi au millier).
      valeurs: { rurale: 520, ville: 430, grande: 400, metropole: 610 }
    },
    gite: {
      intro: "Pour un gîte ou une chambre d’hôtes situés", intensite: 70, taux: 0.08,
      valeurs: { rurale: 440, ville: 430, grande: 730, metropole: 850 }
    }
  };

  var ZONES = {
    rurale:    { population: 10000,  phrase: "en zone rurale, sur un bassin d’environ 10 000 habitants" },
    ville:     { population: 28000,  phrase: "dans une ville de 28 000 habitants" },
    grande:    { population: 110000, phrase: "dans une grande ville de 110 000 habitants" },
    metropole: { population: 450000, phrase: "dans une métropole de 450 000 habitants" }
  };

  var PART_TOP3 = 0.54;   // part des clics captés en top 3
  var PART_HORS = 0.05;   // part des clics au-delà du top 10
  var AVANTAGE  = 1.6;    // avantage d'un site mieux construit que la moyenne

  function formatNombre(n) {
    // Espace insécable fine comme séparateur de milliers (usage français).
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function initSimulateur(root) {
    var metierKey = 'btp';
    var zoneKey = 'ville';

    var elMontant    = root.querySelector('[data-sim-montant]');
    var elContext    = root.querySelector('[data-sim-context]');
    var elRecherches = root.querySelector('[data-sim-recherches]');
    var elVisiteurs  = root.querySelector('[data-sim-visiteurs]');
    var elClients    = root.querySelector('[data-sim-clients]');
    var elValeur     = root.querySelector('[data-sim-valeur]');

    function calcule() {
      var m = METIERS[metierKey];
      var z = ZONES[zoneKey];
      if (!m || !z) return;

      var recherches = (z.population / 10000) * m.intensite;
      var concurrents = 3 + z.population / 12000;
      var visiteurs = recherches * (PART_TOP3 - PART_HORS) / concurrents * AVANTAGE;
      var clientsAn = visiteurs * m.taux * 12;
      var valeurClient = m.valeurs[zoneKey];
      var manque = visiteurs * m.taux * valeurClient * 12;

      // Le montant est arrondi au millier, comme sur la capture (29 882 → 30 000).
      var manqueArrondi = Math.round(manque / 1000) * 1000;

      if (elMontant)    elMontant.textContent = formatNombre(manqueArrondi);
      if (elRecherches) elRecherches.textContent = formatNombre(Math.round(recherches));
      if (elVisiteurs)  elVisiteurs.textContent = formatNombre(Math.round(visiteurs));
      if (elClients)    elClients.textContent = formatNombre(Math.round(clientsAn));
      if (elValeur) elValeur.textContent = formatNombre(valeurClient) + ' €';
      if (elContext) {
        elContext.textContent = m.intro + ' ' + z.phrase +
          ', hors des trois premiers résultats Google.';
      }
    }

    function bind(attr, onPick) {
      var buttons = Array.prototype.slice.call(root.querySelectorAll('[' + attr + ']'));
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          buttons.forEach(function (other) {
            other.classList.remove('is-active');
            other.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');
          onPick(btn.getAttribute(attr));
          calcule();
        });
      });
    }

    bind('data-sim-metier', function (v) { if (METIERS[v]) metierKey = v; });
    bind('data-sim-zone',   function (v) { if (ZONES[v]) zoneKey = v; });

    // Dépliage du bloc « méthode de calcul ».
    var toggle = root.querySelector('[data-sim-toggle]');
    var method = root.querySelector('[data-sim-method]');
    if (toggle && method) {
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
        method.hidden = open;
        var sign = toggle.querySelector('.sim-method-sign');
        if (sign) sign.textContent = open ? '+' : '−';
      });
    }

    calcule();
  }

  /* ------------------------------------------------------------------------
     5. TACHES DES HEROS
     Elles bougent en permanence (animations CSS). Au survol du hero, on
     accélère la lecture via playbackRate : le mouvement s'accélère en continu,
     sans le saut que produirait un changement d'animation-duration.
     ------------------------------------------------------------------------ */
  function initBlobs(hero) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var blobs = Array.prototype.slice.call(hero.querySelectorAll('.blob'));
    if (!blobs.length || !blobs[0].getAnimations) return;

    var FAST = 3.4, NORMAL = 1;

    function setRate(rate) {
      blobs.forEach(function (b) {
        b.getAnimations().forEach(function (a) {
          // updatePlaybackRate change la vitesse en conservant la position
          // courante de l'animation : le mouvement accélère sans saut.
          if (a.updatePlaybackRate) a.updatePlaybackRate(rate);
          else a.playbackRate = rate;
        });
      });
    }

    hero.addEventListener('mouseenter', function () { setRate(FAST); });
    hero.addEventListener('mouseleave', function () { setRate(NORMAL); });
    // Au clavier ou au tactile, pas d'accélération : le mouvement de fond
    // continue en permanence, comme au repos.
  }

  /* ------------------------------------------------------------------------
     6. APPARITIONS AU DÉFILEMENT
     Les éléments à révéler sont désignés par une liste de sélecteurs plutôt
     que par un attribut posé à la main sur chaque balise : le HTML reste
     lisible et la liste se modifie en un seul endroit.
     Les enfants d'un même groupe sont décalés les uns des autres.
     ------------------------------------------------------------------------ */
  var REVEAL_GROUPS = [
    '.hero-lead', '.hero-bottom', '.svc-hero-inner',
    '.section-head', '.sim-head',
    '.stats-row', '.steps-row', '.reviews-grid', '.systems-grid',
    '.timeline', '.sim-grid', '.footer-top',
    '.testi-grid', '.contact-aside', '.faq-list'
  ];
  var REVEAL_ITEMS = [
    '.hero-lead > *', '.hero-bottom > *', '.svc-hero-inner > *',
    '.section-head > *', '.sim-head > *',
    '.stats-row > *', '.certs', '.proof-chart',
    '.steps-row > *', '.reviews-summary', '.reviews-grid > *',
    '.systems-grid > *', '.timeline > *', '.sim-grid > *',
    '.carousel', '.carousel-footer',
    '.cta-banner', '.steps-cta', '.footer-top > *', '.footer-bottom', '.footer-wordmark',
    '.tunnel', '.testi-grid > *', '.form-card', '.contact-aside > *', '.faq-list > *'
  ];
  // Ces éléments-là arrivent flous puis se fixent nets.
  // Le flou ne porte que sur du TEXTE et jamais sur la signature géante du
  // pied de page : flouter un mot de 180 px de haut coûte une rastérisation
  // énorme pour un gain visuel nul.
  var REVEAL_BLUR = 'h1, h2, .hero-title, .svc-hero-title, .sim-figure, .stat-figure, .reviews-score-figure';

  function initReveal() {
    if (!('IntersectionObserver' in window)) return;

    var pending = new Set();
    REVEAL_ITEMS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        // Une carte empilée gère déjà son propre effet (sticky) : pas de reveal
        // dessus, sinon la transformation casserait le collage.
        if (el.closest('.stack-list')) return;
        if (pending.has(el)) return;
        pending.add(el);
        el.classList.add('reveal');
        // Seul l'élément qui EST un titre est flouté. Avant, un panneau qui
        // *contenait* un titre héritait du flou : on floutait des cartes
        // entières (stat-card, sim-panel, cta-banner) pour animer leur titre.
        if (el.matches(REVEAL_BLUR)) {
          el.classList.add('reveal--blur');
        }
      });
    });

    // Décalage : chaque élément prend son rang à l'intérieur de son groupe.
    REVEAL_GROUPS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (group) {
        var i = 0;
        Array.prototype.forEach.call(group.children, function (child) {
          if (child.classList.contains('reveal')) {
            child.style.setProperty('--reveal-i', i);
            i += 1;
          }
        });
      });
    });

    /* Deux régimes et non un seul. Le contenu d'un hero doit être là dès
       l'arrivée : il occupe le premier écran, l'attendre serait absurde. Tout
       le reste ne se révèle qu'une fois VRAIMENT entré dans la page, sinon un
       surtitre qui dépasse de quelques dizaines de pixels sous la ligne de
       flottaison apparaît avant le moindre défilement, ce qui vide l'effet de
       son sens. D'où un seuil bas pour les hero, haut pour les autres. */
    function dansUnHero(el) { return !!el.closest('.hero, .svc-hero'); }
    var SEUIL_HERO = 0.95, SEUIL_PAGE = 0.78;

    function surIntersection(entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) show(entry.target);
      });
    }
    var ioHero = new IntersectionObserver(surIntersection,
      { rootMargin: '0px 0px -5% 0px', threshold: 0.05 });
    var io = new IntersectionObserver(surIntersection,
      { rootMargin: '0px 0px -22% 0px', threshold: 0.08 });

    function show(el) {
      if (!pending.has(el)) return;
      pending.delete(el);
      io.unobserve(el);
      ioHero.unobserve(el);
      el.classList.add('is-visible');
    }

    // Filet de sécurité indépendant de l'IntersectionObserver : un balayage
    // géométrique. L'observateur peut ne jamais se déclencher (onglet en
    // arrière-plan, moteur qui gèle les étapes de rendu) ; sans ce filet, la
    // page resterait invisible. Le balayage, lui, ne dépend que de setTimeout.
    function peutDefiler() {
      var de = document.documentElement;
      return de.scrollHeight > (window.innerHeight || de.clientHeight) + 4;
    }

    /* Page arrivée en butée basse : on ne peut plus rien faire remonter.
       Tout ce qui se trouve dans le dernier quart de l'écran, la signature
       géante du pied de page, la ligne de mentions légales, n'atteindrait
       JAMAIS le seuil de 78 % et resterait donc invisible pour de bon. Le
       seuil strict n'a de sens que tant qu'il reste du défilement devant soi. */
    function enButeeBasse() {
      var de = document.documentElement;
      return (window.pageYOffset || de.scrollTop) +
             (window.innerHeight || de.clientHeight) >= de.scrollHeight - 4;
    }

    var last = 0, timer = null;
    function sweep() {
      last = Date.now();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      // `Array.from` et pas `Array.prototype.slice.call` : un Set n'est pas
      // « array-like », slice y renverrait un tableau vide.
      Array.from(pending).forEach(function (el) {
        var r = el.getBoundingClientRect();
        // Pas de borne basse : un élément déjà dépassé (défilement rapide, lien
        // d'ancre, restauration de position) doit être révélé lui aussi, sinon
        // il resterait invisible pour de bon.
        // Page trop courte pour défiler : le seuil strict condamnerait à
        // l'invisibilité tout ce qui se trouve dans le dernier quart. On
        // repasse alors au seuil permissif.
        var seuil = (dansUnHero(el) || !peutDefiler()) ? SEUIL_HERO : SEUIL_PAGE;
        // En bas de page, tout ce qui est à l'écran est révélé, sans réserve.
        if (enButeeBasse()) seuil = 1;
        if (r.top < vh * seuil) show(el);
      });
    }
    function schedule() {
      if (timer) return;
      var wait = Math.max(0, 120 - (Date.now() - last));
      timer = setTimeout(function () { timer = null; sweep(); }, wait);
    }

    pending.forEach(function (el) { (dansUnHero(el) ? ioHero : io).observe(el); });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', schedule);
    sweep();
  }

  /* ------------------------------------------------------------------------
     7. CARTES EMPILÉES, hauteur égalisée
     Elles sont en flux normal (position: sticky), donc aucune règle CSS ne peut
     les aligner sur la plus haute. On mesure et on applique.
     ------------------------------------------------------------------------ */
  function initStack(list) {
    var cards = Array.prototype.slice.call(list.querySelectorAll('.stack-card'));
    if (cards.length < 2) return;

    var derniereLargeur = 0;

    function equalize() { egaliseHauteurs(cards); }

    // La première mesure peut tomber avant que la mise en page ne soit
    // stabilisée (police de secours encore active, largeur pas encore finale) :
    // elle fige alors une hauteur trop grande que plus rien ne corrige.
    // On recalcule donc à chaque changement de LARGEUR de la liste, la
    // hauteur, elle, est ce qu'on écrit, la surveiller boucherait en boucle.
    if ('ResizeObserver' in window) {
      new ResizeObserver(function (entries) {
        var w = Math.round(entries[0].contentRect.width);
        if (w === derniereLargeur) return;
        derniereLargeur = w;
        equalize();
      }).observe(list);
    }

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(equalize, 150);
    });
    // Filets : la police change la hauteur du texte et un différé garantit
    // au moins un recalcul après stabilisation même sans ResizeObserver.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(equalize).catch(function () {});
    }
    window.addEventListener('load', equalize);
    setTimeout(equalize, 400);
    equalize();
  }

  /* ------------------------------------------------------------------------
     8. DÉMO D'AUDIT + REFONTE (hero de l'accueil)
     Timeline reprise du hero d'aimcs.eu : une seule boucle pilotée par un temps
     `t` en secondes, plutôt que des setTimeout empilés qui se désynchronisent
     au bout de quelques tours. La séquence : le vieux site est balayé par un
     faisceau, les défauts s'affichent, la refonte se déroule de gauche à
     droite, les jauges montent, puis retour au point de départ.
     ------------------------------------------------------------------------ */
  function initScan(wrap) {
    var browser  = wrap.querySelector('.scan-browser');
    var scanLine = wrap.querySelector('.scan-line');
    var tags     = Array.prototype.slice.call(wrap.querySelectorAll('.scan-tag'));
    var after    = wrap.querySelector('.scan-after');
    var gauges   = Array.prototype.slice.call(wrap.querySelectorAll('.scan-gauge'));
    var scores   = wrap.querySelector('.scan-scores');
    var cursor   = wrap.querySelector('.scan-cursor');
    var urlEl    = wrap.querySelector('.scan-url-txt');
    var status   = wrap.querySelector('.scan-status');
    var statusTx = wrap.querySelector('.ss-txt');
    if (!browser || !after || !gauges.length) return;

    var CIRC = 175.9;                       // circonférence du cercle r=28
    var URL_OLD = 'ancien-site-client.fr';
    var URL_NEW = 'nouveau-site-client.fr';
    var targets = gauges.map(function (g) { return parseInt(g.getAttribute('data-target'), 10) || 0; });
    /* Relevé de l'ancien site : ce que l'audit mesure avant la refonte. Dans le
       HTML comme les cibles, pour que les deux chiffres d'une jauge se lisent
       au même endroit. */
    var avant   = gauges.map(function (g) { return parseInt(g.getAttribute('data-avant'), 10) || 0; });

    // Repères de la timeline, en secondes.
    var T = {
      scan: 0.6, scanEnd: 3.0, wipe: 4.0, wipeEnd: 5.4,
      // Les chiffres du nouveau site montent pendant la refonte et non après :
      // `fill` démarre au milieu du balayage, pas à sa fin.
      fill: 4.6, fillEnd: 6.1,
      // Attente sur l'état livré ramenée de 5,3 s à 3,1 s : la boucle reprend
      // plus vite une fois les jauges et le nouveau site en place.
      back: 9.2, backEnd: 10.2, loop: 10.6
    };
    var TAG_AT = [1.0, 1.55, 2.05, 2.55];

    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function seg(t, a, b) { return clamp01((t - a) / (b - a)); }
    function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
    function easeInOut(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

    var lastFill = '';
    /* `cibles` : les valeurs visées. `inverse` retourne l'ordre de la cascade,
       pour que la vidange parte de Performance comme le remplissage et non de
       la dernière jauge. `bilan` réserve le vert et le soulèvement au relevé du
       nouveau site : le relevé de l'ancien n'est pas un résultat à fêter. */
    function setGauges(p, cibles, inverse, bilan) {
      var cle = p.toFixed(3) + '|' + cibles[0] + '|' + (bilan ? 1 : 0);
      if (cle === lastFill) return;
      lastFill = cle;
      for (var i = 0; i < gauges.length; i++) {
        // chaque jauge démarre légèrement après la précédente
        var rang = inverse ? (gauges.length - 1 - i) : i;
        var local = clamp01((p - rang * 0.14) / (1 - 0.14 * (gauges.length - 1)));
        var v = cibles[i] * easeOut(local);
        gauges[i].querySelector('.sg-val').textContent = Math.round(v);
        gauges[i].querySelector('.sg-fill').style.strokeDashoffset =
          (CIRC * (1 - v / 100)).toFixed(1);
        var plein = cibles[i] ? v / cibles[i] : 0;
        // Le relevé de l'ancien site s'affiche en rouge : c'est un défaut.
        gauges[i].classList.toggle('is-alerte', !bilan && v > 0);
        gauges[i].classList.toggle('is-done', bilan && plein > .98);
        gauges[i].classList.toggle('is-pop',  bilan && plein > .55 && plein < .99);
      }
    }

    var lastStatus = '';
    function setStatus(txt, ok) {
      if (txt === lastStatus) return;
      lastStatus = txt;
      statusTx.classList.add('is-swapping');
      setTimeout(function () {
        statusTx.textContent = txt;
        statusTx.classList.remove('is-swapping');
      }, 180);
      status.classList.toggle('is-ok', !!ok);
    }

    var lastUrl = '';
    function setUrl(txt, typing) {
      if (txt !== lastUrl) { urlEl.textContent = txt; lastUrl = txt; }
      browser.classList.toggle('is-typing', !!typing);
    }

    var lastClip = '', lastLine = '', lastLineOp = '', lastCursor = '';

    function render(t) {
      var scanning = t >= T.scan && t < T.wipe;
      var scanP = seg(t, T.scan, T.scanEnd);
      var wipeP = easeInOut(seg(t, T.wipe, T.wipeEnd));
      var backP = easeInOut(seg(t, T.back, T.backEnd));
      var reveal = clamp01(wipeP - backP);

      // aller : la refonte se déroule vers la droite ; retour : elle s'efface
      // vers la droite elle aussi, la boucle ne rembobine jamais à l'envers.
      var clip = backP <= 0
        ? 'inset(0 ' + ((1 - wipeP) * 100).toFixed(1) + '% 0 0)'
        : 'inset(0 0 0 ' + (backP * 100).toFixed(1) + '%)';
      if (clip !== lastClip) { after.style.clipPath = clip; lastClip = clip; }

      var lineVisible = scanning || (t >= T.wipe && t < T.wipeEnd);
      var lineOp = lineVisible ? '1' : '0';
      if (lineOp !== lastLineOp) { scanLine.style.opacity = lineOp; lastLineOp = lineOp; }
      if (lineVisible) {
        var left = ((scanning ? easeInOut(scanP) : wipeP) * 100).toFixed(1) + '%';
        if (left !== lastLine) { scanLine.style.left = left; lastLine = left; }
      }

      for (var i = 0; i < tags.length; i++) {
        tags[i].classList.toggle('is-shown', t >= TAG_AT[i] && t < T.wipe + 0.25);
      }

      /* Trois temps. Pendant le scan les jauges montent jusqu'au relevé de
         l'ancien site ; les défauts une fois tous pointés, elles redescendent à
         zéro ; pendant la refonte elles montent jusqu'au relevé du nouveau. */
      var fillP = t < T.fill ? 0 : seg(t, T.fill, T.fillEnd);
      if (t < T.scan)          setGauges(0, avant, false, false);
      else if (t < T.scanEnd)  setGauges(seg(t, T.scan, T.scanEnd), avant, false, false);
      else if (t < T.wipe)     setGauges(1 - seg(t, T.scanEnd, T.wipe), avant, true, false);
      else                     setGauges(fillP, targets, false, true);
      var jaugesVives = (t >= T.scan && t < T.wipe) || fillP > 0.02;
      scores.classList.toggle('is-live', jaugesVives && backP < 0.5);
      scores.style.opacity = backP > 0 ? (1 - backP).toFixed(2) : '';

      // barre d'adresse : le nouveau domaine se tape pendant la refonte
      if (reveal < 0.12) {
        setUrl(URL_OLD, false);
        browser.classList.remove('is-after');
      } else if (reveal < 0.96) {
        var n = Math.round(URL_NEW.length * clamp01((reveal - 0.12) / 0.7));
        setUrl(URL_NEW.slice(0, n) || ' ', true);
        browser.classList.add('is-after');
      } else {
        setUrl(URL_NEW, false);
        browser.classList.add('is-after');
      }

      if (cursor) {
        var cTr = null;
        if (scanning) {
          cursor.classList.add('is-shown');
          cursor.classList.remove('is-clicking');
          cTr = 'translate(' + (easeInOut(scanP) * 88 + 6).toFixed(1) + '%,' +
                (34 + Math.sin(scanP * 7) * 16).toFixed(1) + '%)';
        } else if (t >= T.fillEnd && t < T.fillEnd + 1.6) {
          cursor.classList.add('is-shown');
          var cp = easeOut(seg(t, T.fillEnd, T.fillEnd + 0.9));
          cTr = 'translate(' + (12 + cp * 8).toFixed(1) + '%,' + (86 - cp * 8).toFixed(1) + '%)';
          cursor.classList.toggle('is-clicking', t > T.fillEnd + 0.95 && t < T.fillEnd + 1.45);
        } else {
          cursor.classList.remove('is-shown', 'is-clicking');
        }
        if (cTr && cTr !== lastCursor) { cursor.style.transform = cTr; lastCursor = cTr; }
      }

      if (t < T.scan)         setStatus('Audit en direct', false);
      else if (t < T.wipe)    setStatus(Math.min(4, Math.max(1, Math.floor(scanP * 4) + 1)) +
                                ' problème' + (scanP > .25 ? 's' : '') +
                                ' détecté' + (scanP > .25 ? 's' : ''), false);
      else if (t < T.fillEnd) setStatus('Refonte en cours…', false);
      else if (t < T.back)    setStatus('Refonte livrée · 14 jours', true);
      else                    setStatus('Audit en direct', false);
    }

    function endState() {
      after.style.clipPath = 'inset(0 0 0 0)';
      scanLine.style.opacity = '0';
      setGauges(1, targets, false, true);
      scores.classList.add('is-live');
      setUrl(URL_NEW, false);
      browser.classList.add('is-after');
      setStatus('Refonte livrée · 14 jours', true);
    }

    // Mouvement coupé : on montre directement l'état final, pas un écran figé
    // sur l'ancien site.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { endState(); return; }

    var t = 0, last = 0, running = false, rafId = 0;
    function frame(ts) {
      if (!running) return;
      if (!last) last = ts;
      var dt = (ts - last) / 1000;
      last = ts;
      if (dt > 0.25) dt = 0.25;   // onglet revenu au premier plan : pas de saut
      t = (t + dt) % T.loop;
      render(t);
      rafId = requestAnimationFrame(frame);
    }
    function play() { if (running) return; running = true; last = 0; rafId = requestAnimationFrame(frame); }
    function pause() { running = false; if (rafId) cancelAnimationFrame(rafId); }

    render(0);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? play() : pause(); });
      }, { threshold: 0.12 }).observe(wrap);
    } else {
      play();
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? pause() : play();
    });

    // Survol : la fenêtre se redresse et suit légèrement le curseur.
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      wrap.addEventListener('pointermove', function (e) {
        var r = wrap.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - .5;
        var dy = (e.clientY - r.top) / r.height - .5;
        browser.style.animation = 'none';
        browser.style.transform = 'perspective(1200px) rotateY(' + (dx * 7).toFixed(2) +
          'deg) rotateX(' + (-dy * 6).toFixed(2) + 'deg) translateY(-6px)';
      });
      wrap.addEventListener('pointerleave', function () {
        browser.style.transform = '';
        browser.style.animation = '';
      });
    }
  }

  /* ------------------------------------------------------------------------
     8 bis. ENVOI DES FORMULAIRES (Web3Forms)
     Les deux formulaires du site passent par ici. La clé est publique par
     nature, elle ne permet d'écrire que vers la boîte du compte, elle ne
     donne accès à rien. Le champ-piège `botcheck` reste vide chez un humain :
     rempli, Web3Forms écarte l'envoi.
     Aucun message de succès n'est montré avant la confirmation du serveur :
     un « Merci » affiché alors que rien n'est parti est pire que pas de
     formulaire du tout.
     ------------------------------------------------------------------------ */
  var W3F_CLE = '7ef5528a-58c3-481e-b542-5a5a038be548';
  var W3F_URL = 'https://api.web3forms.com/submit';

  function envoyerFormulaire(form, sujet, extras) {
    var data = new FormData(form);

    /* Les menus déroulants portent des codes (`creation`, `refonte`) alors que
       le visiteur, lui, a lu « Création de site ». C'est le libellé qu'il faut
       recevoir : on remplace la valeur par le texte de l'option choisie, sans
       quoi la demande arrive en jargon. */
    Array.prototype.forEach.call(form.querySelectorAll('select[name]'), function (sel) {
      var opt = sel.options[sel.selectedIndex];
      if (opt && opt.value) data.set(sel.name, opt.textContent.trim());
    });

    data.append('access_key', W3F_CLE);
    data.append('subject', sujet);
    data.append('from_name', 'Site OBT Agency');
    if (extras) {
      Object.keys(extras).forEach(function (k) {
        if (extras[k]) data.append(k, extras[k]);
      });
    }
    return fetch(W3F_URL, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    }).then(function (r) {
      return r.json().then(function (json) {
        // Web3Forms répond toujours en JSON ; `success` fait foi, pas le code
        // HTTP seul.
        if (!r.ok || !json.success) throw new Error(json.message || ('HTTP ' + r.status));
        return json;
      });
    });
  }

  /* ------------------------------------------------------------------------
     9. TUNNEL « NOS OFFRES » (page Tarifs)
     Trois étapes : service → formule → devis. Les formules dépendent
     du service : chaque service pointe, par `data-formules`, vers un groupe
     `[data-formules-for]` ; on n'affiche que celui-là. Depuis la fusion des
     services, chaque service a son propre groupe.
     La carte de formule n'est plus un bouton mais un article contenant un
     bouton « Parlons de votre projet », un bouton ne peut pas en contenir un
     autre et le choix est plus explicite.
     ------------------------------------------------------------------------ */
  function initTunnel(root) {
    var steps    = Array.prototype.slice.call(root.querySelectorAll('[data-tunnel-step]'));
    var progress = Array.prototype.slice.call(root.querySelectorAll('.progress-step'));
    var services = Array.prototype.slice.call(root.querySelectorAll('[data-service]'));
    var groupes  = Array.prototype.slice.call(root.querySelectorAll('[data-formules-for]'));
    var formules = Array.prototype.slice.call(root.querySelectorAll('[data-formule]'));
    var reset    = root.querySelector('[data-tunnel-reset]');
    if (!steps.length || !services.length || !formules.length) return;

    // Les deux questions ne nomment plus le choix précédent : ces crochets
    // peuvent être absents, tout le code les teste avant de s'en servir.
    var elService    = root.querySelector('[data-tunnel-service]');
    var elTitre      = root.querySelector('[data-tunnel-titre]');
    var elTagService = root.querySelector('[data-tunnel-tag-service]');
    var elTagFormule = root.querySelector('[data-tunnel-tag-formule]');
    var elTagDelai   = root.querySelector('[data-tunnel-tag-delai]');
    var elPrix       = root.querySelector('[data-tunnel-prix]');
    var elNote       = root.querySelector('[data-tunnel-note]');

    var service = null, formule = null;
    /* Leve pendant la preselection d'ouverture : le choix par defaut ne
       doit deplacer la page ni au chargement, ni apres « Recommencer ». */
    var sansDefilement = false;

    function showStep(n) {
      steps.forEach(function (el) {
        el.hidden = parseInt(el.getAttribute('data-tunnel-step'), 10) > n;
      });
      progress.forEach(function (el) {
        var i = parseInt(el.getAttribute('data-step'), 10);
        el.classList.toggle('is-active', i === n);
        el.classList.toggle('is-done', i < n);
      });
    }

    function press(list, active) {
      list.forEach(function (b) {
        var on = b === active;
        b.classList.toggle('is-selected', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    // Le bloc qui vient d'apparaître est amené sous les yeux sans arracher la
    // page : `nearest` ne défile que si c'est nécessaire.
    function amener(el) {
      if (sansDefilement) return;
      if (el) setTimeout(function () {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }

    services.forEach(function (btn) {
      btn.addEventListener('click', function () {
        service = btn.getAttribute('data-service');
        var cle = btn.getAttribute('data-formules');
        press(services, btn);
        if (elService) elService.textContent = service;
        // Changer de service annule la formule déjà choisie : elle appartenait
        // à un autre groupe et ne veut plus rien dire.
        formule = null;
        press(formules, null);
        groupes.forEach(function (g) {
          g.hidden = g.getAttribute('data-formules-for') !== cle;
        });
        showStep(2);
        amener(steps[1]);
      });
    });

    formules.forEach(function (carte) {
      var choisir = carte.querySelector('[data-formule-choose]');
      if (!choisir) return;
      // Toute la carte est cliquable ; le bouton reste là pour dire où cliquer.
      // On ignore le clic SUR le bouton, sinon il déclencherait deux fois.
      carte.addEventListener('click', function (e) {
        if (e.target.closest('[data-formule-choose]')) return;
        choisir.click();
      });
      choisir.addEventListener('click', function () {
        formule = {
          nom:   carte.getAttribute('data-formule'),
          prix:  carte.getAttribute('data-prix'),
          note:  carte.getAttribute('data-note'),
          delai: carte.getAttribute('data-delai')
        };
        press(formules, carte);
        if (elTitre)      elTitre.textContent = (service || 'Votre projet') + ' : formule ' + formule.nom;
        if (elTagService) elTagService.textContent = service || 'Non precise';
        if (elTagFormule) elTagFormule.textContent = formule.nom;
        if (elTagDelai)   elTagDelai.textContent = formule.delai;
        if (elPrix)       elPrix.textContent = formule.prix;
        if (elNote)       elNote.textContent = formule.note || 'HT · paiement unique';
        showStep(3);
        amener(steps[2]);
      });
    });

    /* Formulaire de la dernière étape. La validation est faite à la main :
       `novalidate` désactive les bulles du navigateur, qui ne se placent pas et
       ne se traduisent pas. Rien n'est envoyé nulle part, il n'y a pas de
       serveur derrière ce site statique ; le message de remerciement confirme
       la saisie et vous récupérez la demande par le canal que vous branchez. */
    var form  = root.querySelector('[data-tunnel-form]');
    var merci = root.querySelector('[data-tunnel-merci]');

    function verifie(champ) {
      var msg = root.querySelector('[data-error-for="' + champ.id + '"]');
      // Une case à cocher se juge sur son état, pas sur sa valeur : `value`
      // vaut « on » qu'elle soit cochée ou non.
      var vide = champ.type === 'checkbox' ? !champ.checked : !champ.value.trim();
      var ok = champ.hasAttribute('required') ? !vide : true;
      if (ok && champ.type === 'email' && champ.value.trim()) {
        ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(champ.value.trim());
      }
      if (msg) msg.hidden = ok;
      champ.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    }

    if (form) {
      var champs = Array.prototype.slice.call(
        form.querySelectorAll('input, select'));
      champs.forEach(function (c) {
        // On ne signale l'erreur qu'après une première tentative, pas pendant
        // la frappe : corriger sous les yeux de l'utilisateur est désagréable.
        c.addEventListener('blur', function () {
          if (form.classList.contains('is-tried')) verifie(c);
        });
        c.addEventListener('input', function () {
          if (c.getAttribute('aria-invalid') === 'true') verifie(c);
        });
        c.addEventListener('change', function () {
          if (form.classList.contains('is-tried')) verifie(c);
        });
      });

      var bouton = form.querySelector('[type="submit"]');
      var libelleBouton = bouton ? bouton.textContent.trim() : '';
      var erreurEnvoi = form.querySelector('[data-tunnel-erreur]');

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        form.classList.add('is-tried');
        var premierFaux = null;
        champs.forEach(function (c) { if (!verifie(c) && !premierFaux) premierFaux = c; });
        if (premierFaux) { premierFaux.focus(); return; }

        if (erreurEnvoi) erreurEnvoi.hidden = true;
        if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi en cours…'; }

        /* Le service et la formule ont été choisis aux étapes précédentes :
           ce ne sont pas des champs du formulaire, il faut les joindre à la
           main, sans quoi la demande arriverait sans son objet. */
        envoyerFormulaire(form, 'Demande de devis depuis le site OBT Agency', {
          origine: 'Page Tarifs, parcours de devis',
          service: service || '(non précisé)',
          formule: formule ? (formule.nom + ' : ' + formule.prix + ' (' + formule.delai + ')') : '(non précisée)'
        }).then(function () {
          form.hidden = true;
          if (merci) {
            merci.hidden = false;
            merci.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }).catch(function () {
          // On ne remercie jamais pour un envoi qui a échoué : on le dit et on
          // donne les deux autres moyens de nous joindre.
          if (bouton) { bouton.disabled = false; bouton.textContent = libelleBouton; }
          if (erreurEnvoi) {
            erreurEnvoi.hidden = false;
            erreurEnvoi.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
      });
    }

    if (reset) {
      reset.addEventListener('click', function () {
        service = null; formule = null;
        if (form) { form.hidden = false; form.reset(); form.classList.remove('is-tried'); }
        if (merci) merci.hidden = true;
        root.querySelectorAll('.field-error').forEach(function (m) { m.hidden = true; });
        press(services, null);
        press(formules, null);
        groupes.forEach(function (g) { g.hidden = true; });
        showStep(1);
        /* Même état qu'à l'arrivée : le service par défaut est de nouveau
           choisi. Ce choix-là ne défile pas, c'est la remise à zéro qui
           ramène le visiteur en haut du tunnel, juste après. */
        preselection(false);
        root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

    groupes.forEach(function (g) { g.hidden = true; });
    showStep(1);

    /* Service proposé par défaut : le tunnel s'ouvre sur ses formules plutôt
       que sur une question sans réponse et les prix sont lisibles d'emblée. */
    var SERVICE_PAR_DEFAUT = 'creation-refonte-site';

    /* Arrivée depuis un bouton « Voir nos offres » de la page Services :
       l'adresse porte `?offre=<identifiant>`. On rejoue le choix du service
       désigné et on ouvre directement l'étape des formules. Sans paramètre,
       c'est le service par défaut qui est choisi. Le clic passe dans les deux
       cas par le même gestionnaire que celui d'un visiteur : rien n'est
       court-circuité, l'état du tunnel est donc exactement celui d'un
       parcours normal. */
    function preselection(peutDefiler) {
      var cle;
      try { cle = new URLSearchParams(location.search).get('offre'); } catch (e) { cle = null; }
      /* Un paramètre absent n'est pas une erreur : c'est le cas courant et
         il vaut alors le service par défaut. Seul un paramètre PRÉSENT peut
         faire défiler, la section est alors la destination annoncée et
         encore faut-il que l'appelant l'autorise. */
      var demande = !!cle;
      if (!cle) cle = SERVICE_PAR_DEFAUT;
      /* Cette valeur vient de l'adresse, donc du visiteur et partait telle
         quelle dans un sélecteur. Deux conséquences : une valeur contenant un
         guillemet cassait la syntaxe du sélecteur, l'exception remontait et
         emportait toute la suite de l'initialisation, FAQ, formulaires,
         curseur, visionneuse, barre d'appel ; et une valeur bien formée
         pouvait viser n'importe quel élément de la page pour le cliquer.
         Les identifiants d'offre sont des mots en minuscules et tirets : on
         refuse tout le reste avant d'aller plus loin, en retombant sur le
         service par défaut, pour que le tunnel ne reste jamais vide. */
      if (!/^[a-z0-9-]{1,40}$/.test(cle)) { cle = SERVICE_PAR_DEFAUT; demande = false; }
      var service = root.querySelector('[data-service-cle="' + cle + '"]');
      /* Un identifiant inconnu dans l'adresse ne doit pas laisser le tunnel
         vide : on retombe sur le service par défaut. */
      if (!service) service = root.querySelector('[data-service-cle="' + SERVICE_PAR_DEFAUT + '"]');
      if (!service) return;
      sansDefilement = !(demande && peutDefiler);
      service.click();
      sansDefilement = false;
      // Quand il a lieu, le défilement du gestionnaire suffit : on n'en
      // déclenche pas un second, qui le contrarierait.
    }
    preselection(true);
  }

  /* ------------------------------------------------------------------------
     10 bis. REPLI DE LA FAQ
     Seules les cinq premières questions sont visibles au chargement ; le reste
     se déplie au bouton. Le pli est posé ICI et non dans le HTML : sans
     JavaScript, la liste reste entière et le bouton, `hidden` à la source, ne se montre pas. Le second clic replie, sinon on ne pourrait plus revenir
     à une liste courte une fois dépliée.
     ------------------------------------------------------------------------ */
  function initFaqRepli(btn) {
    var liste = document.getElementById(btn.getAttribute('aria-controls'));
    if (!liste || !liste.querySelector('.faq-item--extra')) return;

    var libelleDeplie = 'Voir moins de questions';
    var libelleReplie = btn.textContent.trim();

    liste.classList.add('est-repliee');
    btn.hidden = false;

    btn.addEventListener('click', function () {
      var replie = liste.classList.toggle('est-repliee');
      btn.setAttribute('aria-expanded', replie ? 'false' : 'true');
      btn.textContent = replie ? libelleReplie : libelleDeplie;
      if (replie) {
        // Une réponse restée ouverte dans la partie repliée garderait un
        // `aria-expanded` menteur : on la referme avec le pli.
        liste.querySelectorAll('.faq-item--extra .faq-question').forEach(function (q) {
          q.setAttribute('aria-expanded', 'false');
          var rep = document.getElementById(q.getAttribute('aria-controls'));
          if (rep) rep.hidden = true;
        });
        // Le haut de la liste se retrouverait au-dessus de l'écran si l'on
        // replie depuis le bas : on y ramène le lecteur.
        if (liste.getBoundingClientRect().top < 0) {
          liste.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     10. FAQ EN ACCORDÉON (page Contact)
     ------------------------------------------------------------------------ */
  function initFaq(root) {
    var questions = Array.prototype.slice.call(root.querySelectorAll('.faq-question'));
    questions.forEach(function (q) {
      var answer = document.getElementById(q.getAttribute('aria-controls'));
      if (!answer) return;
      q.addEventListener('click', function () {
        var open = q.getAttribute('aria-expanded') === 'true';
        // Un seul volet ouvert à la fois : la liste reste lisible.
        questions.forEach(function (other) {
          var a = document.getElementById(other.getAttribute('aria-controls'));
          other.setAttribute('aria-expanded', 'false');
          if (a) a.hidden = true;
        });
        if (!open) {
          q.setAttribute('aria-expanded', 'true');
          answer.hidden = false;
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     11. FORMULAIRE DE DEVIS (page Contact)
     La maquette ne transmet rien : la validation native est laissée au
     navigateur et on confirme la prise en compte sans mentir sur l'envoi.
     ------------------------------------------------------------------------ */
  function initQuoteForm(form) {
    var feedback = form.querySelector('.form-feedback');
    var champs = Array.prototype.slice.call(
      form.querySelectorAll('input, select, textarea'));

    /* Mêmes règles que le formulaire du tunnel Tarifs : `novalidate` écarte les
       bulles du navigateur, qui ne se placent pas et ne se traduisent pas et
       le message s'affiche sous le champ fautif. */
    function verifie(champ) {
      var msg = form.querySelector('[data-error-for="' + champ.id + '"]');
      var vide = champ.type === 'checkbox' ? !champ.checked : !champ.value.trim();
      var ok = champ.hasAttribute('required') ? !vide : true;
      if (ok && champ.type === 'email' && champ.value.trim()) {
        ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(champ.value.trim());
      }
      if (msg) msg.hidden = ok;
      champ.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    }

    champs.forEach(function (c) {
      // L'erreur ne se signale qu'après une première tentative d'envoi :
      // corriger quelqu'un pendant qu'il écrit est désagréable.
      c.addEventListener('blur', function () {
        if (form.classList.contains('is-tried')) verifie(c);
      });
      c.addEventListener('input', function () {
        if (c.getAttribute('aria-invalid') === 'true') verifie(c);
      });
      c.addEventListener('change', function () {
        if (form.classList.contains('is-tried')) verifie(c);
      });
    });

    var bouton = form.querySelector('[type="submit"]');
    var libelleBouton = bouton ? bouton.textContent.trim() : '';

    function dire(texte, etat) {
      if (!feedback) return;
      feedback.hidden = false;
      feedback.textContent = texte;
      feedback.classList.toggle('est-en-echec', etat === 'echec');
      feedback.classList.toggle('est-reussi', etat === 'reussi');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.classList.add('is-tried');
      var premierFaux = null;
      champs.forEach(function (c) { if (!verifie(c) && !premierFaux) premierFaux = c; });
      if (premierFaux) { premierFaux.focus(); return; }

      if (feedback) feedback.hidden = true;
      if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi en cours…'; }

      envoyerFormulaire(form, 'Nouveau message depuis le site OBT Agency', {
        origine: form.getAttribute('data-origine') || 'Page Contact, formulaire'
      }).then(function () {
        form.reset();
        form.classList.remove('is-tried');
        if (bouton) { bouton.disabled = false; bouton.textContent = libelleBouton; }
        dire('Merci, votre message est parti. Nous vous répondons sous 24 h ouvrées.', 'reussi');
      }).catch(function () {
        if (bouton) { bouton.disabled = false; bouton.textContent = libelleBouton; }
        dire('L’envoi n’a pas abouti. Écrivez-nous à contact@obt-agency.fr ou appelez le 06 41 33 64 51, nous répondons aussi vite.', 'echec');
      });
    });
  }


  /* ------------------------------------------------------------------------
     11 bis. PRISE DE RENDEZ-VOUS EN TROIS ETAPES (page Contact)
     1. le besoin, 2. le jour et l'heure, 3. les coordonnees. Le creneau
     n'est retenu qu'a l'envoi de la troisieme etape : tant que le visiteur
     n'a pas valide, rien n'est bloque dans l'agenda et il peut revenir en
     arriere autant qu'il veut.

     Les creneaux viennent de notre fonction serveur, qui parle a l'agenda :
       GET  <api>/creneaux?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ
            -> { "creneaux": { "2026-11-03": [ { "heure": "09:00",
                 "debut": "2026-11-03T09:00:00+01:00" } ] } }
       POST <api>/rendez-vous  (JSON)
            -> { "ok": true }
     La cle de l'agenda reste sur le serveur : elle n'apparait jamais ici.

     Tant que la fonction serveur n'est pas posee, l'adresse repond en erreur.
     Sur le site en ligne, on le dit honnetement et on donne le telephone.
     En apercu local (127.0.0.1), on dessine des creneaux de demonstration
     pour pouvoir juger le dessin : ils ne partent nulle part.
     ------------------------------------------------------------------------ */
  function initRdv(racine) {
    var API = racine.getAttribute('data-api') || '/api';
    var LOCAL = location.hostname === '127.0.0.1' || location.hostname === 'localhost';

    var fil = document.querySelector('[data-rdv-fil]');
    var etapes = {
      1: racine.querySelector('[data-rdv-etape="1"]'),
      2: racine.querySelector('[data-rdv-etape="2"]'),
      3: racine.querySelector('[data-rdv-etape="3"]')
    };
    var fini = racine.querySelector('[data-rdv-fini]');
    var boiteJours = racine.querySelector('[data-rdv-jours]');
    var boiteHeures = racine.querySelector('[data-rdv-creneaux]');
    var titreMois = racine.querySelector('[data-rdv-titre-mois]');
    var jourChoisiTexte = racine.querySelector('[data-rdv-jour-choisi]');
    var attente = racine.querySelector('[data-rdv-attente]');
    var recap = racine.querySelector('[data-rdv-recap-texte]');
    var form = racine.querySelector('[data-rdv-form]');
    var dit = racine.querySelector('[data-rdv-dit]');
    var finiQuand = racine.querySelector('[data-rdv-fini-quand]');

    var choix = { besoin: null, jour: null, heure: null, debut: null };
    var mois = new Date(); mois.setDate(1); mois.setHours(0, 0, 0, 0);
    var premierMois = new Date(mois);
    var creneaux = {};          // { "AAAA-MM-JJ": [{ heure, debut }, ...] }
    var moisCharges = {};       // les mois deja demandes au serveur

    /* --- petites aides de date, sans bibliotheque --- */
    function cle(d) {
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    function depuisCle(k) {
      var p = k.split('-');
      return new Date(+p[0], +p[1] - 1, +p[2]);
    }
    /* « 09:30 » se lit « 9 h 30 » dans une phrase : le zero de tete n'a de
       sens que dans une grille d'heures. */
    function enLettres(h) {
      var p = h.split(':');
      var heure = p[0].replace(/^0/, '');
      return p[1] === '00' ? heure + ' h' : heure + ' h ' + p[1];
    }
    function longue(k) {
      return depuisCle(k).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long'
      });
    }

    /* --- l'avancement --- */
    function montrer(n) {
      [1, 2, 3].forEach(function (i) { etapes[i].hidden = (i !== n); });
      /* Quand on revient sur le choix de la prestation, rien n'est plus
         selectionne : la page se redecouvre comme la premiere fois. Le
         focus laisse sur l'ancien bouton est retire aussi, sinon son
         contour bleu restait affiche. Nathan, 6 novembre 2026. */
      if (n === 2) {
        racine.querySelectorAll('[data-rdv-besoin]').forEach(function (a) {
          a.setAttribute('aria-pressed', 'false');
          a.blur();
        });
        choix.besoin = null;
      }
      if (fil) {
        Array.prototype.forEach.call(fil.children, function (li, i) {
          li.classList.toggle('est-actif', i + 1 === n);
          li.classList.toggle('est-faite', i + 1 < n);
        });
      }
      racine.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* --- etape 2 : la prestation. Choisie apres le creneau depuis le
       3 novembre 2026 : le visiteur vient pour un rendez-vous, on lui montre
       d'abord quand on est libre. --- */
    racine.querySelectorAll('[data-rdv-besoin]').forEach(function (b) {
      b.addEventListener('click', function () {
        racine.querySelectorAll('[data-rdv-besoin]').forEach(function (a) {
          a.setAttribute('aria-pressed', String(a === b));
        });
        choix.besoin = b.getAttribute('data-rdv-besoin');
        if (recap && choix.jour && choix.heure) {
          recap.textContent = longue(choix.jour) + ' à ' + enLettres(choix.heure)
            + ', trente minutes. ' + choix.besoin + '.';
        }
        montrer(3);
      });
    });

    racine.querySelectorAll('[data-rdv-retour]').forEach(function (b) {
      b.addEventListener('click', function () {
        montrer(+b.getAttribute('data-rdv-retour'));
      });
    });

    /* --- etape 2 : le calendrier --- */
    racine.querySelectorAll('[data-rdv-mois]').forEach(function (b) {
      b.addEventListener('click', function () {
        mois.setMonth(mois.getMonth() + (+b.getAttribute('data-rdv-mois')));
        chargeMois();
      });
    });

    /* Creneaux de demonstration pour l'apercu local : du lundi au samedi,
       de 9 h a 18 h 30, par demi-heures. Les vraies disponibilites viennent
       de l'agenda ; ceux-ci ne servent qu'a juger le dessin. */
    function demonstration(debut, fin) {
      var out = {}, d = new Date(debut);
      while (d <= fin) {
        if (d.getDay() !== 0) {            // ferme le dimanche seulement
          var h = [], k = cle(d);
          for (var x = 9; x <= 18; x++) {
            ['00', '30'].forEach(function (m) {
              var heure = ('0' + x).slice(-2) + ':' + m;
              h.push({ heure: heure, debut: k + 'T' + heure + ':00' });
            });
          }
          /* Un creneau deja passe n'en est pas un : l'apercu local le retire
             comme le ferait l'agenda. */
          var maintenant = new Date();
          out[k] = (cle(maintenant) === k)
            ? h.filter(function (c) {
                var t = c.heure.split(':');
                return (+t[0] * 60 + +t[1]) > (maintenant.getHours() * 60 + maintenant.getMinutes());
              })
            : h;
          if (!out[k].length) delete out[k];
        }
        d.setDate(d.getDate() + 1);
      }
      return out;
    }

    function chargeMois() {
      var k = mois.getFullYear() + '-' + mois.getMonth();
      dessineMois();
      if (moisCharges[k]) return;
      moisCharges[k] = true;

      var aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0);
      var debut = new Date(mois);
      if (debut < aujourdhui) debut = new Date(aujourdhui);
      var fin = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);
      if (fin < debut) { dessineMois(); return; }

      fetch(API + '/creneaux?debut=' + cle(debut) + '&fin=' + cle(fin), {
        headers: { 'Accept': 'application/json' }
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (json) {
        Object.keys(json.creneaux || {}).forEach(function (j) { creneaux[j] = json.creneaux[j]; });
        dessineMois();
      }).catch(function () {
        if (LOCAL) {
          var faux = demonstration(debut, fin);
          Object.keys(faux).forEach(function (j) { creneaux[j] = faux[j]; });
        }
        dessineMois();
      });
    }

    function dessineMois() {
      if (!boiteJours) return;
      titreMois.textContent = mois.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      var precedent = racine.querySelector('[data-rdv-mois="-1"]');
      if (precedent) {
        precedent.disabled = (mois.getFullYear() === premierMois.getFullYear()
          && mois.getMonth() === premierMois.getMonth());
      }

      boiteJours.textContent = '';
      var premier = new Date(mois.getFullYear(), mois.getMonth(), 1);
      var decalage = (premier.getDay() + 6) % 7;   // la semaine commence lundi
      var nb = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate();
      var aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0);

      for (var i = 0; i < decalage; i++) {
        var vide = document.createElement('span');
        vide.className = 'rdv__jour rdv__jour--vide';
        boiteJours.appendChild(vide);
      }
      for (var n = 1; n <= nb; n++) {
        var d = new Date(mois.getFullYear(), mois.getMonth(), n);
        var k = cle(d);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rdv__jour';
        b.textContent = String(n);
        b.setAttribute('data-jour', k);
        var libre = !!(creneaux[k] && creneaux[k].length) && d >= aujourdhui;
        if (libre) {
          b.classList.add('rdv__jour--libre');
          b.setAttribute('aria-pressed', String(choix.jour === k));
          b.setAttribute('aria-label', longue(k) + ', ' + creneaux[k].length + ' créneaux libres');
        } else {
          b.disabled = true;
          b.setAttribute('aria-label', longue(k) + ', aucun créneau');
        }
        boiteJours.appendChild(b);
      }

      boiteJours.querySelectorAll('[data-jour]').forEach(function (b) {
        b.addEventListener('click', function () {
          choix.jour = b.getAttribute('data-jour');
          choix.heure = null;
          boiteJours.querySelectorAll('[data-jour]').forEach(function (a) {
            if (!a.disabled) a.setAttribute('aria-pressed', String(a === b));
          });
          dessineHeures();
        });
      });
    }

    function dessineHeures() {
      if (!boiteHeures) return;
      boiteHeures.textContent = '';
      if (!choix.jour) { attente.hidden = false; jourChoisiTexte.textContent = ''; return; }
      var liste = creneaux[choix.jour] || [];
      jourChoisiTexte.textContent = longue(choix.jour);
      attente.hidden = liste.length > 0;
      if (!liste.length) { attente.textContent = 'Plus de créneau ce jour-là, choisissez-en un autre.'; return; }

      liste.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rdv__heure';
        b.textContent = c.heure;
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          choix.heure = c.heure;
          choix.debut = c.debut;
          boiteHeures.querySelectorAll('.rdv__heure').forEach(function (a) {
            a.setAttribute('aria-pressed', String(a === b));
          });
          montrer(2);
        });
        boiteHeures.appendChild(b);
      });
    }

    /* --- etape 3 : les coordonnees, puis la reservation --- */
    if (form) {
      var champs = Array.prototype.slice.call(form.querySelectorAll('input:not(.piege-robot), textarea'));

      function verifie(champ) {
        var msg = form.querySelector('[data-error-for="' + champ.id + '"]');
        var ok = champ.hasAttribute('required') ? !!champ.value.trim() : true;
        if (ok && champ.type === 'email' && champ.value.trim()) {
          ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(champ.value.trim());
        }
        if (msg) msg.hidden = ok;
        champ.setAttribute('aria-invalid', ok ? 'false' : 'true');
        return ok;
      }

      champs.forEach(function (c) {
        c.addEventListener('blur', function () {
          if (form.classList.contains('is-tried')) verifie(c);
        });
        c.addEventListener('input', function () {
          if (c.getAttribute('aria-invalid') === 'true') verifie(c);
        });
      });

      var bouton = form.querySelector('[type="submit"]');
      var libelle = bouton ? bouton.textContent.trim() : '';

      function parle(texte, etat) {
        if (!dit) return;
        dit.hidden = false;
        dit.textContent = texte;
        dit.classList.toggle('est-en-echec', etat === 'echec');
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        form.classList.add('is-tried');
        var faux = null;
        champs.forEach(function (c) { if (!verifie(c) && !faux) faux = c; });
        if (faux) { faux.focus(); return; }
        if (!choix.jour || !choix.heure) { montrer(1); return; }
        if (!choix.besoin) { montrer(2); return; }

        if (dit) dit.hidden = true;
        if (bouton) { bouton.disabled = true; bouton.textContent = 'Réservation en cours…'; }

        var corps = {
          besoin: choix.besoin,
          debut: choix.debut,
          jour: choix.jour,
          heure: choix.heure,
          nom: form.nom.value.trim(),
          email: form.email.value.trim(),
          tel: form.tel.value.trim(),
          entreprise: form.entreprise.value.trim(),
          site: form.site ? form.site.value.trim() : '',
          fiche: form.fiche ? form.fiche.value.trim() : '',
          message: form.message ? form.message.value.trim() : '',
          botcheck: form.botcheck.checked ? '1' : ''
        };

        fetch(API + '/rendez-vous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(corps)
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (json) {
            if (!r.ok || json.ok !== true) throw new Error(json.erreur || ('HTTP ' + r.status));
            return json;
          });
        }).then(termine).catch(function (err) {
          if (bouton) { bouton.disabled = false; bouton.textContent = libelle; }
          /* En apercu local, la fonction serveur n'existe pas : on montre
             l'ecran de fin pour juger le dessin, sans rien reserver. */
          if (LOCAL) { termine(); return; }
          parle('La réservation n’a pas abouti. Appelez le 06 41 33 64 51 ou écrivez à contact@obt-agency.fr, on vous donne un créneau tout de suite.', 'echec');
        });
      });
    }

    /* Le calendrier est la premiere etape : il se remplit des l'arrivee, sans
       attendre un clic. */
    chargeMois();

    function termine() {
      Object.keys(etapes).forEach(function (i) { etapes[i].hidden = true; });
      if (fil) {
        Array.prototype.forEach.call(fil.children, function (li) {
          li.classList.remove('est-actif');
          li.classList.add('est-faite');
        });
      }
      if (finiQuand && choix.jour && choix.heure) {
        finiQuand.textContent = longue(choix.jour) + ' à ' + enLettres(choix.heure);
      }
      if (fini) fini.hidden = false;
      racine.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }


  /* ------------------------------------------------------------------------
     11 ter. TEST DE VISIBILITE (page test-visibilite.html)
     Trois etats dans la meme carte : la demande, l'analyse, le resultat.
     L'analyse appelle notre fonction serveur :
       POST <api>/test-visibilite  { site, metier, ville }
            -> { score, verdict, resume, points: [ { etat, titre, dit } ],
                 amain: [ { titre, dit } ] }
     Les lignes qui defilent sont une animation : elles ne decident de rien.
     Le resultat n'est affiche que lorsque la reponse est arrivee. Aucun
     chiffre n'est invente. Si le serveur ne repond pas, on le dit.
     En apercu local (127.0.0.1), un resultat de demonstration permet de juger
     le dessin ; il est marque comme tel et ne sort pas du poste.
     ------------------------------------------------------------------------ */
  function initTestVisibilite(racine) {
    var API = racine.getAttribute('data-api') || '/api';
    var LOCAL = location.hostname === '127.0.0.1' || location.hostname === 'localhost';

    var etats = {};
    racine.querySelectorAll('[data-tv-etat]').forEach(function (e) {
      etats[e.getAttribute('data-tv-etat')] = e;
    });
    var formulaires = Array.prototype.slice.call(racine.querySelectorAll('[data-tv-form]'));
    var dit = racine.querySelector('[data-tv-dit]');
    var cible = racine.querySelector('[data-tv-cible]');
    var cibleResultat = racine.querySelector('[data-tv-cible-resultat]');
    var jauge = racine.querySelector('[data-tv-jauge]');
    var pistes = Array.prototype.slice.call(racine.querySelectorAll('[data-tv-pistes] li'));
    var anneau = racine.querySelector('[data-tv-anneau]');
    var trait = racine.querySelector('[data-tv-trait]');
    var chiffre = racine.querySelector('[data-tv-score]');
    var verdict = racine.querySelector('[data-tv-verdict]');
    var resume = racine.querySelector('[data-tv-resume]');
    var boitePoints = racine.querySelector('[data-tv-points]');
    var boiteAmain = racine.querySelector('[data-tv-amain]');
    var recommencer = racine.querySelector('[data-tv-recommencer]');
    var boutonRapport = racine.querySelector('[data-tv-rapport]');
    var boiteRapport = racine.querySelector('[data-tv-boite-rapport]');
    var formRapport = racine.querySelector('[data-tv-form-rapport]');
    var ditRapport = racine.querySelector('[data-tv-dit-rapport]');
    var merci = racine.querySelector('[data-tv-merci]');

    /* Ce qui a ete analyse, garde pour le rapport : on envoie le resultat
       avec la demande, sinon on recevrait un courriel sans savoir de quoi il
       parle. */
    var dernier = { quoi: null, cible: '', note: null, manques: [] };

    function montrer(nom) {
      Object.keys(etats).forEach(function (k) { etats[k].hidden = (k !== nom); });
      if (boiteRapport) boiteRapport.hidden = true;
      if (merci) merci.hidden = true;
    }

    function adresse(v) {
      return (v || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    }

    function parle(ou, texte, etat) {
      if (!ou) return;
      ou.hidden = !texte;
      ou.textContent = texte || '';
      ou.classList.toggle('est-en-echec', etat === 'echec');
    }

    /* --- verification d'un champ --- */
    function verifie(form, champ) {
      var msg = form.querySelector('[data-error-for="' + champ.id + '"]');
      var val = champ.value.trim();
      var ok = !!val;
      if (ok && champ.name === 'site') ok = /^[^\s/]+\.[a-z]{2,}([/?#].*)?$/i.test(adresse(val));
      if (ok && champ.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);
      /* Pour la fiche, on accepte aussi un simple nom d'entreprise : c'est le
         serveur qui dira s'il la retrouve. */
      if (ok && champ.name === 'fiche') ok = val.length >= 3;
      if (msg) msg.hidden = ok;
      champ.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    }

    formulaires.concat(formRapport ? [formRapport] : []).forEach(function (form) {
      if (!form) return;
      form.querySelectorAll('input:not(.piege-robot)').forEach(function (c) {
        c.addEventListener('blur', function () { if (form.classList.contains('is-tried')) verifie(form, c); });
        c.addEventListener('input', function () { if (c.getAttribute('aria-invalid') === 'true') verifie(form, c); });
      });
    });

    /* --- l'animation des lignes --- */
    var minuteur = null;
    function majJauge(pourcent) {
      if (!jauge) return;
      jauge.firstElementChild.style.width = pourcent + '%';
      jauge.setAttribute('aria-valuenow', String(pourcent));
    }
    function deroule() {
      var i = 0;
      pistes.forEach(function (li) { li.classList.remove('est-faite', 'est-en-cours'); });
      if (pistes[0]) pistes[0].classList.add('est-en-cours');
      majJauge(6);
      minuteur = setInterval(function () {
        if (i >= pistes.length - 1) { clearInterval(minuteur); minuteur = null; return; }
        pistes[i].classList.remove('est-en-cours');
        pistes[i].classList.add('est-faite');
        i++;
        pistes[i].classList.add('est-en-cours');
        majJauge(Math.round((i / pistes.length) * 92));
      }, 620);
    }
    function finitAnimation() {
      if (minuteur) { clearInterval(minuteur); minuteur = null; }
      pistes.forEach(function (li) { li.classList.remove('est-en-cours'); li.classList.add('est-faite'); });
      majJauge(100);
    }

    /* --- le resultat --- */
    var ICONES = { ok: '#i-check', moyen: '#i-clock', ko: '#i-cross' };
    function ligne(p) {
      var etat = (p.etat === 'ok' || p.etat === 'moyen') ? p.etat : 'ko';
      var div = document.createElement('div');
      div.className = 'tv__point tv__point--' + etat;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'icon');
      svg.setAttribute('aria-hidden', 'true');
      var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', ICONES[etat]);
      svg.appendChild(use);
      var txt = document.createElement('p');
      txt.style.margin = '0';
      var b = document.createElement('b');
      b.textContent = p.titre || '';
      txt.appendChild(b);
      div.appendChild(svg); div.appendChild(txt);
      return div;
    }

    function affiche(res, lu) {
      finitAnimation();
      if (cibleResultat) cibleResultat.textContent = lu;

      var note = Math.max(0, Math.min(100, Math.round(res.score || 0)));
      anneau.classList.remove('tv__anneau--bon', 'tv__anneau--moyen', 'tv__anneau--faible');
      anneau.classList.add(note >= 75 ? 'tv__anneau--bon'
        : note >= 45 ? 'tv__anneau--moyen' : 'tv__anneau--faible');
      verdict.textContent = res.verdict || '';
      resume.textContent = res.resume || '';

      boitePoints.textContent = '';
      (res.points || []).forEach(function (p) { boitePoints.appendChild(ligne(p)); });

      boiteAmain.textContent = '';
      (res.amain || []).forEach(function (p) {
        var li = document.createElement('li');
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
        var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', '#i-recherche');
        svg.appendChild(use);
        var txt = document.createElement('p');
        txt.style.margin = '0';
        var b = document.createElement('b'); b.textContent = p.titre || '';
        var sp = document.createElement('span'); sp.textContent = ' ' + (p.dit || '');
        txt.appendChild(b); txt.appendChild(sp);
        li.appendChild(svg); li.appendChild(txt);
        boiteAmain.appendChild(li);
      });

      dernier.note = note;
      dernier.cible = lu;
      dernier.manques = (res.points || []).filter(function (p) { return p.etat !== 'ok'; })
        .map(function (p) { return p.titre; });

      montrer('resultat');
      racine.scrollIntoView({ behavior: 'smooth', block: 'start' });

      var tour = 2 * Math.PI * 52;
      trait.style.strokeDasharray = String(tour);
      trait.style.strokeDashoffset = String(tour);
      var debut = null;
      requestAnimationFrame(function monte(t) {
        if (debut === null) debut = t;
        var part = Math.min(1, (t - debut) / 1100);
        var adouci = 1 - Math.pow(1 - part, 3);
        chiffre.textContent = String(Math.round(note * adouci));
        trait.style.strokeDashoffset = String(tour - tour * (note / 100) * adouci);
        if (part < 1) requestAnimationFrame(monte);
      });
    }

    /* Resultats de demonstration, apercu local uniquement. */
    function demonstration(quoi, lu) {
      if (quoi === 'fiche') {
        return {
          score: 61,
          verdict: 'Votre fiche existe, mais elle laisse la place aux autres.',
          resume: 'Quatre points vous coûtent des appels. Le détail et la marche à suivre sont dans le rapport.',
          points: [
            { etat: 'ok', titre: 'Une note de 4,8 sur 5' },
            { etat: 'moyen', titre: '12 avis, il en faut plus' },
            { etat: 'ok', titre: 'Vos horaires sont renseignés' },
            { etat: 'moyen', titre: '6 photos, il en faut plus' },
            { etat: 'ok', titre: 'Votre site est relié à la fiche' },
            { etat: 'ok', titre: 'Votre téléphone est sur la fiche' },
            { etat: 'ok', titre: 'Votre catégorie est choisie' },
            { etat: 'ok', titre: 'Votre adresse est complète' },
            { etat: 'ko', titre: 'Aucun avis récent' },
            { etat: 'ko', titre: 'La fiche n’a pas de description' }
          ],
          amain: [
            { titre: 'Vos réponses aux avis.', dit: 'Google ne les donne pas par son interface : on les lit une par une.' },
            { titre: 'Vos publications sur la fiche.', dit: 'Les posts comptent pour le classement local. On regarde ce que vous publiez. Et à quel rythme.' },
            { titre: 'Les concurrents qui sortent avant vous.', dit: 'On compare votre fiche aux trois du dessus, point par point.' }
          ]
        };
      }
      return {
        score: 58,
        verdict: 'Votre site se charge, mais Google ne sait pas quoi en faire.',
        resume: 'Six points vous coûtent des visites. Le détail et la marche à suivre sont dans le rapport.',
        points: [
          { etat: 'ok', titre: 'Le site répond en HTTPS' },
          { etat: 'ko', titre: 'La page n’a pas de description' },
          { etat: 'moyen', titre: 'Le titre sera coupé dans Google' },
          { etat: 'ok', titre: 'Un titre principal, un seul' },
          { etat: 'ok', titre: 'La page s’adapte au téléphone' },
          { etat: 'ko', titre: 'Votre entreprise n’est pas déclarée à Google' },
          { etat: 'ok', titre: 'Le téléphone est accessible' },
          { etat: 'ko', titre: 'Aucune rubrique d’articles' },
          { etat: 'ko', titre: 'Trop peu de liens entre vos pages' },
          { etat: 'ko', titre: 'Partage sans titre ni image' },
          { etat: 'ok', titre: 'Les images sont décrites' },
          { etat: 'ok', titre: 'Le plan du site est fourni à Google' }
        ],
        amain: [
          { titre: 'Votre position réelle sur Google.', dit: 'Relevée à la main sur vos mots-clés, Google ne la donne pas en direct.' },
          { titre: 'Les sites qui parlent de vous.', dit: 'Les liens entrants comptent pour beaucoup. Aucun outil gratuit ne les voit tous.' },
          { titre: 'Ce que répondent les IA.', dit: 'On demande à ChatGPT, Gemini et Perplexity un professionnel de votre métier dans votre ville. On regarde qui sort.' }
        ]
      };
    }

    /* --- lancement d'une analyse --- */
    formulaires.forEach(function (form) {
      var quoi = form.getAttribute('data-tv-form');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        form.classList.add('is-tried');
        var faux = null;
        form.querySelectorAll('input:not(.piege-robot)').forEach(function (c) {
          if (!verifie(form, c) && !faux) faux = c;
        });
        if (faux) { faux.focus(); return; }

        var lu = quoi === 'fiche' ? form.fiche.value.trim() : adresse(form.site.value);
        dernier.quoi = quoi;
        parle(dit, '');
        if (cible) cible.textContent = lu;
        montrer('analyse');
        racine.scrollIntoView({ behavior: 'smooth', block: 'start' });
        deroule();

        var depart = Date.now();
        fetch(API + '/test-visibilite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            quoi: quoi,
            site: quoi === 'site' ? lu : '',
            fiche: quoi === 'fiche' ? lu : '',
            botcheck: form.botcheck.checked ? '1' : ''
          })
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (json) {
            if (!r.ok) { var err = new Error(json.erreur || ('HTTP ' + r.status)); err.statut = r.status; throw err; }
            return json;
          });
        }).then(function (res) {
          var reste = Math.max(0, 2400 - (Date.now() - depart));
          setTimeout(function () { affiche(res, res.cible || lu); }, reste);
        }).catch(function (err) {
          if (LOCAL) {
            setTimeout(function () {
              affiche(demonstration(quoi, lu), lu + ' (aperçu local)');
            }, Math.max(0, 2400 - (Date.now() - depart)));
            return;
          }
          finitAnimation();
          montrer('demande');
          parle(dit, err.statut === 404
            ? (quoi === 'fiche'
              ? 'On ne retrouve pas cette fiche. Collez le lien depuis Google Maps, ou appelez-nous au 06 41 33 64 51.'
              : 'On n’arrive pas à ouvrir ce site. Vérifiez l’adresse, ou appelez-nous au 06 41 33 64 51.')
            : 'L’analyse n’a pas abouti. Réessayez dans un instant, ou appelez-nous au 06 41 33 64 51.', 'echec');
        });
      });
    });

    /* --- le rapport par courriel --- */
    if (boutonRapport && boiteRapport) {
      boutonRapport.addEventListener('click', function () {
        boiteRapport.hidden = false;
        boiteRapport.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        var champ = boiteRapport.querySelector('input[type="email"]');
        if (champ) { try { champ.focus({ preventScroll: true }); } catch (e) { champ.focus(); } }
      });
    }

    if (formRapport) {
      var bouton = formRapport.querySelector('[type="submit"]');
      var libelle = bouton ? bouton.textContent.trim() : '';
      formRapport.addEventListener('submit', function (e) {
        e.preventDefault();
        formRapport.classList.add('is-tried');
        var champ = formRapport.querySelector('input[type="email"]');
        if (!verifie(formRapport, champ)) { champ.focus(); return; }
        if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi en cours…'; }
        parle(ditRapport, '');

        envoyerFormulaire(formRapport, 'Demande de rapport de visibilité', {
          origine: 'Test de visibilité',
          analyse: dernier.quoi === 'fiche' ? 'Fiche Google' : 'Site internet',
          cible: dernier.cible,
          note: dernier.note === null ? '(non mesurée)' : dernier.note + '/100',
          a_corriger: dernier.manques.join(' | ') || '(rien)'
        }).then(function () {
          if (bouton) { bouton.disabled = false; bouton.textContent = libelle; }
          boiteRapport.hidden = true;
          if (merci) {
            merci.hidden = false;
            merci.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          confettis();
        }).catch(function () {
          if (bouton) { bouton.disabled = false; bouton.textContent = libelle; }
          parle(ditRapport, 'L’envoi n’a pas abouti. Écrivez-nous à contact@obt-agency.fr, on vous envoie le rapport à la main.', 'echec');
        });
      });
    }

    /* Le rendez-vous : si la page porte une fenetre de rendez-vous, on
       l'ouvre plutot que de quitter la page. Sinon, le lien fait son travail. */
    racine.querySelectorAll('[data-tv-rdv]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (typeof ouvreRendezVous === 'function' && ouvreRendezVous()) e.preventDefault();
      });
    });

    if (recommencer) {
      recommencer.addEventListener('click', function () {
        montrer('demande');
        parle(dit, '');
        formulaires.forEach(function (f) {
          f.reset();
          f.classList.remove('is-tried');
          f.querySelectorAll('.field-error').forEach(function (m) { m.hidden = true; });
          f.querySelectorAll('input').forEach(function (c) { c.setAttribute('aria-invalid', 'false'); });
        });
        racine.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  /* Les confettis : une volee de petits rectangles qui tombent une fois, puis
     le calque se retire. Aucune bibliotheque, aucune animation en fond. */
  function confettis() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var calque = document.createElement('div');
    calque.className = 'confetti';
    calque.setAttribute('aria-hidden', 'true');
    var teintes = ['#2558D6', '#3D8BFF', '#7FD1FF', '#4ADE98', '#F5B300'];
    for (var i = 0; i < 70; i++) {
      var c = document.createElement('i');
      c.style.setProperty('--c', teintes[i % teintes.length]);
      c.style.setProperty('--x', (Math.random() * 160 - 80).toFixed(0) + 'px');
      c.style.setProperty('--t', (Math.random() * 900 - 450).toFixed(0) + 'deg');
      c.style.setProperty('--d', (2.6 + Math.random() * 1.6).toFixed(2) + 's');
      c.style.setProperty('--r', (Math.random() * 0.7).toFixed(2) + 's');
      c.style.left = (Math.random() * 100).toFixed(2) + '%';
      calque.appendChild(c);
    }
    document.body.appendChild(calque);
    setTimeout(function () { calque.remove(); }, 5200);
  }

  /* ------------------------------------------------------------------------
     11 quater. LES FENETRES : bulle de rendez-vous et test de visibilite
     Deux fenetres identiques aux sections des pages Contact et Test, posees
     sur toutes les pages. Elles sont fabriquees ici plutot que recopiees dans
     chaque fichier : une seule source, donc aucun risque qu'une page prenne
     du retard sur les autres. Et aucun identifiant en double (ceux des
     fenetres portent tous le prefixe « m- »).
       - la bulle en bas a droite ouvre la prise de rendez-vous,
       - le test de visibilite s'affiche cinq secondes apres l'ouverture de la
         page, sauf sur la page du test, ou il serait en double.
     Nathan, 3 novembre 2026.
     ------------------------------------------------------------------------ */
  var DELAI_TEST = 5000;
  /* Rempli par initFenetres : permet au test de visibilite d'ouvrir la
     fenetre de rendez-vous au lieu de quitter la page. */
  var ouvreRendezVous = null;

  function squeletteRdv() {
    return ''
      + '<div class="modale__tete">'
      + '  <div class="a1__preuve modale__preuve">'
      + '    <a class="a1__note" href="https://share.google/RHD0CkD38IK6VSCKV" target="_blank" rel="noopener" aria-label="Note 5 sur 5 : voir nos avis Google (nouvel onglet)">'
      + '      <span class="a1__visages" aria-hidden="true"><i><img src="assets/img/humains/visage-charpentier.jpg" alt="" width="32" height="32" decoding="async"></i><i><img src="assets/img/humains/visage-gite.jpg" alt="" width="32" height="32" decoding="async"></i><i><img src="assets/img/humains/visage-peintre.jpg" alt="" width="32" height="32" decoding="async"></i><i><img src="assets/img/humains/visage-plombier.jpg" alt="" width="32" height="32" decoding="async"></i><i class="a1__visages--plus">+3</i></span>'
      + '      <svg class="icon icon--google" aria-hidden="true"><use href="#i-google"/></svg>'
      + '      <span class="a1__etoiles" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span><b>5/5</b>'
      + '    </a>'
      + '  </div>'
      + '  <h2 class="modale__titre">On regarde votre visibilité <span class="a1__surligne est-peint">avant de vous appeler</span><span class="a1__point a1__point--fin">.</span></h2>'
      + '  <p class="modale__gages">'
      + '    <span><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>Gratuit</span>'
      + '    <span><svg class="icon" aria-hidden="true"><use href="#i-clock"/></svg>30 minutes</span>'
      + '    <span><svg class="icon" aria-hidden="true"><use href="#i-shield"/></svg>Sans engagement</span>'
      + '  </p>'
      + '  <ol class="rdv__fil" data-rdv-fil>'
      + '    <li class="est-actif"><b>1</b><span class="visually-hidden">La date</span></li>'
      + '    <li><b>2</b><span class="visually-hidden">Votre besoin</span></li>'
      + '    <li><b>3</b><span class="visually-hidden">Vos coordonnées</span></li>'
      + '  </ol>'
      + '</div>'
      + '<div class="rdv__carte" data-rdv>'

      + '<div class="rdv__etape" data-rdv-etape="1">'
      + '  <div class="rdv__agenda">'
      + '    <div>'
      + '      <div class="rdv__mois-cadre">'
      + '      <div class="rdv__barre">'
      + '        <button type="button" class="rdv__fleche" data-rdv-mois="-1" aria-label="Mois précédent"><svg class="icon" aria-hidden="true" style="transform:rotate(180deg)"><use href="#i-arrow-right"/></svg></button>'
      + '        <span class="rdv__mois" data-rdv-titre-mois aria-live="polite"></span>'
      + '        <button type="button" class="rdv__fleche" data-rdv-mois="1" aria-label="Mois suivant"><svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></button>'
      + '      </div>'
      + '      <div class="rdv__semaine" aria-hidden="true"><span>Lu</span><span>Ma</span><span>Me</span><span>Je</span><span>Ve</span><span>Sa</span><span>Di</span></div>'
      + '      <div class="rdv__jours" data-rdv-jours role="group" aria-label="Choisir un jour"></div>'
      + '      </div>'
      + '    </div>'
      + '    <div>'
      + '      <p class="rdv__jourchoisi" data-rdv-jour-choisi></p>'
      + '      <div class="rdv__creneaux" data-rdv-creneaux role="group" aria-label="Choisir une heure"></div>'
      + '      <p class="rdv__attente" data-rdv-attente>Choisissez d’abord un jour en bleu.</p>'
      + '    </div>'
      + '  </div>'
      + '</div>'

      + '<div class="rdv__etape" data-rdv-etape="2" hidden>'
      + '  <div class="rdv__choix">'
      + option('Pack SEO &amp; GEO + Site Professionnel', 'i-etincelle', 'Pack <span class="a1__surligne est-peint">SEO &amp; GEO</span> +&nbsp;<span class="a1__surligne est-peint">Site Professionnel</span>', 'Le référencement et le site, ensemble, suivis tous les mois.', true)
      + option('SEO &amp; GEO', 'i-recherche', 'SEO &amp; GEO', 'Sortir sur votre métier et votre ville, sur Google et dans les IA.')
      + option('Création &amp; Refonte de Site Professionnel', 'i-fenetre', 'Création &amp; Refonte de Site Professionnel', 'Un site qui transforme les visites en appels, sur téléphone comme sur ordinateur.')
      + option('Identité Visuelle &amp; Charte Graphique', 'i-palette', 'Identité Visuelle &amp; Charte Graphique', 'Logo, couleurs, charte : la même image du site au devis.')
      + option('Automatisation IA', 'i-sparkle', 'Automatisation IA', 'Confier à un robot les tâches qui vous prennent vos soirées.')
      + '  </div>'
      + '  <p class="rdv__pied"><button type="button" class="rdv__retour" data-rdv-retour="1"><svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg>Changer de créneau</button></p>'
      + '</div>'

      + '<div class="rdv__etape" data-rdv-etape="3" hidden>'
      + '  <p class="rdv__recap" data-rdv-recap><svg class="icon" aria-hidden="true"><use href="#i-agenda"/></svg><span data-rdv-recap-texte></span></p>'
      + '  <form data-rdv-form novalidate>'
      + '    <div class="rdv__lignes">'
      + champ('m-rdv-nom', 'nom', 'Nom et prénom', 'name', 'Indiquez votre nom et votre prénom.')
      + champ('m-rdv-entreprise', 'entreprise', 'Votre entreprise', 'organization', 'Dites-nous le nom de votre entreprise.', 'text', false, false, 'Charpenterie Durand')
      + champ('m-rdv-email', 'email', 'E-mail', 'email', 'Indiquez une adresse e-mail valide, c’est là que part la confirmation.', 'email')
      + champ('m-rdv-tel', 'tel', 'Téléphone', 'tel', 'Indiquez un numéro où vous joindre.', 'tel')
      + champ('m-rdv-site', 'site', 'Lien de votre site', 'url', '', 'url', false, true, 'votre-entreprise.fr')
      + champ('m-rdv-fiche', 'fiche', 'Lien de votre fiche Google', 'off', '', 'text', false, true, 'Lien ou nom sur Google')
      + '    </div>'
      + '    <p class="rdv__rgpd">Ces informations sont utilisées par OBT Agency pour tenir le rendez-vous et vous envoyer sa confirmation. Elles passent par notre service d’agenda en ligne et sont conservées trois ans après notre dernier échange. Vous pouvez y accéder, les faire corriger ou les supprimer en écrivant à <a href="mailto:contact@obt-agency.fr">contact@obt-agency.fr</a>. En savoir plus&nbsp;: <a href="confidentialite.html">politique de confidentialité</a>.</p>'
      + '    <input type="checkbox" name="botcheck" class="piege-robot" tabindex="-1" autocomplete="off" aria-hidden="true">'
      + '    <p class="rdv__pied">'
      + '      <button type="button" class="rdv__retour" data-rdv-retour="2"><svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg>Changer de prestation</button>'
      + '      <button type="submit" class="a1__bouton a1__bouton--bleu">Confirmer le rendez-vous<svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></button>'
      + '      <span class="rdv__dit" data-rdv-dit role="status" hidden></span>'
      + '    </p>'
      + '  </form>'
      + '</div>'

      + '<div class="rdv__fini" data-rdv-fini hidden>'
      + '  <span class="rdv__coche" aria-hidden="true"><svg class="icon"><use href="#i-check"/></svg></span>'
      + '  <h3>C’est noté, le rendez-vous est bloqué.</h3>'
      + '  <p>Vous recevez la confirmation par e-mail d’ici une minute, avec le lien de l’appel et de quoi le déplacer si besoin.</p>'
      + '  <p class="rdv__quand"><svg class="icon" aria-hidden="true"><use href="#i-agenda"/></svg><span data-rdv-fini-quand></span></p>'
      + '</div>'
      + '</div>';
  }

  function option(valeur, icone, nom, dit, phare) {
    return '<button type="button" class="rdv__option' + (phare ? ' rdv__option--phare' : '') + '"'
      + ' data-rdv-besoin="' + valeur + '" aria-pressed="false">'
      + '<span class="rdv__option-tete"><span class="rdv__pastille" aria-hidden="true">'
      + '<svg class="icon"><use href="#' + icone + '"/></svg></span>'
      + (phare ? '<span class="rdv__etiquette">Le plus choisi</span>' : '')
      + '</span><b>' + nom + '</b><span>' + dit + '</span></button>';
  }

  /* `facultatif` : le champ n'est pas exige (le lien du site ou de la fiche
     Google, que tout le monde n'a pas). `aide` remplit l'exemple grise. */
  function champ(id, nom, libelle, auto, erreur, type, large, facultatif, aide) {
    return '<p class="rdv__champ' + (large ? ' rdv__champ--large' : '') + '">'
      + '<label for="' + id + '">' + libelle + (facultatif ? ' <small>(facultatif)</small>' : '') + '</label>'
      + '<input id="' + id + '" name="' + nom + '" type="' + (type || 'text') + '" autocomplete="' + auto + '"'
      + (aide ? ' placeholder="' + aide + '"' : '') + (type === 'url' ? ' inputmode="url"' : '') + (facultatif ? '' : ' required') + '>'
      + '<span class="field-error" data-error-for="' + id + '" hidden>' + erreur + '</span></p>';
  }

  function squeletteTest() {
    return ''
      + '<div class="modale__tete">'
      + '  <p class="a1__pastille modale__pastille">Test de visibilité gratuit</p>'
      + '  <h2 class="modale__titre">Vos concurrents sortent <span class="a1__surligne est-peint">avant vous</span>&nbsp;?</h2>'
      + '  <p class="modale__sous">On relève ce qui vous fait perdre des clients, sur votre site comme sur votre fiche Google. Résultat à l’écran en trente secondes.</p>'
      + '  <p class="modale__gages">'
      + '    <span><svg class="icon" aria-hidden="true"><use href="#i-clock"/></svg>Résultat immédiat</span>'
      + '    <span><svg class="icon" aria-hidden="true"><use href="#i-shield"/></svg>Gratuit, sans inscription</span>'
      + '  </p>'
      + '</div>'
      + '<div class="tv__carte" data-tv>'

      + '<div class="tv__etat" data-tv-etat="demande">'
      + '  <div class="tv__duo">'
      + bloc('site', 'i-fenetre', 'Votre site internet',
             'Vingt points décident de votre place sur Google. On les relève tous.',
             'm-tv-site', 'site', 'L’adresse de votre site', 'charpenterie-durand.fr',
             'Indiquez l’adresse de votre site, par exemple charpenterie-durand.fr',
             'Analyser mon site',
             ['Titres, descriptions, balises', 'Articles, liens, structure', 'Téléphone, mobile, sécurité'])
      + bloc('fiche', 'i-maps', 'Votre fiche Google',
             'C’est elle qui décroche les appels près de chez vous.',
             'm-tv-fiche', 'fiche', 'Le lien de votre fiche Google', 'maps.app.goo.gl/…',
             'Collez le lien de votre fiche Google, depuis Maps ou depuis le bouton Partager.',
             'Analyser ma fiche',
             ['Avis, note, fraîcheur', 'Photos, horaires, catégorie', 'Ce qui manque face aux voisins'])
      + '  </div>'
      + '  <p class="tv__dit" data-tv-dit role="status" hidden></p>'
      + '</div>'

      + '<div class="tv__etat" data-tv-etat="analyse" hidden>'
      + '  <p class="tv__cible" data-tv-cible></p>'
      + '  <div class="tv__jauge" role="progressbar" aria-label="Analyse en cours" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-tv-jauge><i></i></div>'
      + '  <ul class="tv__pistes" data-tv-pistes>'
      + piste('On ouvre ce que vous nous avez donné') + piste('On lit ce que Google peut comprendre')
      + piste('On vérifie les titres et les descriptions') + piste('On regarde ce qui manque')
      + piste('On compare à ce qui sort devant vous') + piste('On rassemble le résultat')
      + '  </ul>'
      + '</div>'

      + '<div class="tv__etat" data-tv-etat="resultat" hidden>'
      + '  <div class="tv__note">'
      + '    <div class="tv__anneau" data-tv-anneau>'
      + '      <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="tv__anneau-fond" cx="60" cy="60" r="52"></circle>'
      + '      <circle class="tv__anneau-trait" cx="60" cy="60" r="52" data-tv-trait></circle></svg>'
      + '      <p class="tv__chiffre"><b data-tv-score>0</b><span>sur 100</span></p>'
      + '    </div>'
      + '    <div class="tv__verdict">'
      + '      <p class="tv__cible tv__cible--resultat" data-tv-cible-resultat></p>'
      + '      <h3 class="tv__phrase" data-tv-verdict></h3>'
      + '      <p class="tv__resume" data-tv-resume></p>'
      + '    </div>'
      + '  </div>'
      + '  <div class="tv__points" data-tv-points></div>'
      + '  <div class="tv__amain"><p class="tv__amain-titre">Ce qu’on regarde à la main, pas d’ici</p>'
      + '    <ul class="tv__amain-liste" data-tv-amain></ul></div>'
      + '  <p class="tv__pied">'
      + '    <button type="button" class="a1__bouton a1__bouton--bleu" data-tv-rapport>Recevoir le rapport complet<svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></button>'
      + '    <a href="#rendez-vous" data-rdv-ouvrir class="a1__bouton" data-tv-rdv><span class="a1__bouton-points" aria-hidden="true"><i></i><i></i><i></i></span>Prendre rendez-vous<svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></a>'
      + '    <button type="button" class="tv__retour" data-tv-recommencer><svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg>Refaire un test</button>'
      + '  </p>'
      + '  <div class="tv__rapport" data-tv-boite-rapport hidden>'
      + '    <form data-tv-form-rapport novalidate>'
      + '      <p class="tv__rapport-titre">Où on vous l’envoie&nbsp;?</p>'
      + '      <p class="tv__rapport-dit">Le rapport complet reprend chaque point, ce qu’il coûte en visites et dans quel ordre le corriger. Vous le recevez dans l’heure.</p>'
      + '      <p class="tv__champ"><label for="m-tv-mail">Votre e-mail</label>'
      + '        <input id="m-tv-mail" name="email" type="email" autocomplete="email" placeholder="vous@votre-entreprise.fr" required>'
      + '        <span class="field-error" data-error-for="m-tv-mail" hidden>Indiquez une adresse e-mail valide.</span></p>'
      + '      <input type="checkbox" name="botcheck" class="piege-robot" tabindex="-1" autocomplete="off" aria-hidden="true">'
      + '      <p class="tv__pied"><button type="submit" class="a1__bouton a1__bouton--bleu">Envoyer le rapport<svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></button>'
      + '        <span class="tv__dit" data-tv-dit-rapport role="status" hidden></span></p>'
      + '      <p class="tv__rgpd">Cette adresse sert à vous envoyer ce rapport et rien d’autre. Elle est conservée trois ans après notre dernier échange. Pour la faire supprimer&nbsp;: <a href="mailto:contact@obt-agency.fr">contact@obt-agency.fr</a>.</p>'
      + '    </form>'
      + '  </div>'
      + '  <div class="tv__merci" data-tv-merci hidden>'
      + '    <span class="tv__coche" aria-hidden="true"><svg class="icon"><use href="#i-check"/></svg></span>'
      + '    <h3>C’est parti, votre rapport arrive.</h3>'
      + '    <p>Vous le recevez par e-mail dans l’heure qui suit, avec chaque point détaillé et l’ordre dans lequel s’y prendre.</p>'
      + '    <p class="tv__pied tv__pied--centre"><a href="#rendez-vous" data-rdv-ouvrir class="a1__bouton a1__bouton--bleu" data-tv-rdv>Prendre rendez-vous<svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></a></p>'
      + '  </div>'
      + '</div>'
      + '</div>';
  }

  function bloc(quoi, icone, nom, dit, id, champNom, libelle, exemple, erreur, action, liste) {
    return '<form class="tv__bloc' + (quoi === 'fiche' ? ' tv__bloc--google' : '') + '" data-tv-form="' + quoi + '" novalidate>'
      + '<p class="tv__bloc-tete"><span class="tv__rond' + (quoi === 'fiche' ? ' tv__rond--google' : '') + '" aria-hidden="true">'
      + '<svg class="icon"><use href="#' + icone + '"/></svg></span><b>' + nom + '</b></p>'
      + '<p class="tv__bloc-dit">' + dit + '</p>'
      + '<p class="tv__champ"><label for="' + id + '">' + libelle + '</label>'
      + '<input id="' + id + '" name="' + champNom + '" type="text" inputmode="url" placeholder="' + exemple + '" required>'
      + '<span class="field-error" data-error-for="' + id + '" hidden>' + erreur + '</span></p>'
      + '<input type="checkbox" name="botcheck" class="piege-robot" tabindex="-1" autocomplete="off" aria-hidden="true">'
      + '<button type="submit" class="a1__bouton' + (quoi === 'site' ? ' a1__bouton--bleu' : '') + ' tv__lancer">'
      + (quoi === 'fiche' ? '<span class="a1__bouton-points" aria-hidden="true"><i></i><i></i><i></i></span>' : '')
      + action + '<svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></button>'
      + '<ul class="tv__liste">' + liste.map(function (l) {
          return '<li><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>' + l + '</li>';
        }).join('') + '</ul>'
      + '</form>';
  }

  function piste(texte) {
    return '<li><span class="tv__puce" aria-hidden="true"><svg class="icon"><use href="#i-check"/></svg></span>' + texte + '</li>';
  }

  function initFenetres() {
    /* Sans JavaScript, rien de tout cela n'existe : c'est voulu, une fenetre
       qu'on ne peut pas fermer serait pire que pas de fenetre. */
    var surLaPageDuTest = !!document.querySelector('#test-visibilite-s1');
    var ouverte = null;

    function fabrique(nom, dedans, etiquette) {
      var m = document.createElement('div');
      m.className = 'modale';
      m.setAttribute('data-modale', nom);
      m.setAttribute('role', 'dialog');
      m.setAttribute('aria-modal', 'true');
      m.setAttribute('aria-label', etiquette);
      m.hidden = false;
      var boite = document.createElement('div');
      boite.className = 'modale__boite';
      boite.innerHTML = '<span class="modale__ronds" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'
        + '<button type="button" class="modale__fermer" aria-label="Fermer">'
        + '<svg class="icon" aria-hidden="true"><use href="#i-cross"/></svg></button>' + dedans;
      m.appendChild(boite);
      document.body.appendChild(m);
      m.addEventListener('click', function (e) { if (e.target === m) ferme(); });
      boite.querySelector('.modale__fermer').addEventListener('click', ferme);
      return m;
    }

    function ouvre(m) {
      colorePlus(m);
      if (ouverte) ferme();
      ouverte = m;
      m.classList.add('est-ouverte');
      document.body.classList.add('est-bloquee');
      var cible = m.querySelector('input, button, [href]');
      if (cible) { try { cible.focus({ preventScroll: true }); } catch (e) { cible.focus(); } }
    }
    function ferme() {
      if (!ouverte) return;
      ouverte.classList.remove('est-ouverte');
      ouverte = null;
      document.body.classList.remove('est-bloquee');
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') ferme(); });

    /* --- la prise de rendez-vous, ouverte par la bulle --- */
    var mRdv = fabrique('rdv', squeletteRdv(), 'Prendre rendez-vous');
    mRdv.querySelectorAll('[data-rdv]').forEach(initRdv);

    ouvreRendezVous = function () { ouvre(mRdv); return true; };

    /* La page Contact a ete supprimee le 6 novembre 2026 : tous les boutons
       de prise de rendez-vous du site ouvrent cette fenetre, la meme que la
       bulle en bas a droite. Ils pointent sur #rendez-vous ; sans JavaScript,
       ce lien descend aux coordonnees du bas de page. Une adresse arrivant
       avec #rendez-vous (l'ancienne page Contact y est redirigee) ouvre la
       fenetre des le chargement. */
    document.addEventListener('click', function (e) {
      var lien = e.target.closest ? e.target.closest('a[href="#rendez-vous"], [data-rdv-ouvrir]') : null;
      if (!lien) return;
      e.preventDefault();
      ouvre(mRdv);
    });
    if (location.hash === '#rendez-vous') {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* tant pis */ }
      ouvre(mRdv);
    }

    var bulle = document.createElement('button');
    bulle.type = 'button';
    bulle.className = 'bulle-rdv';
    bulle.setAttribute('aria-label', 'Prendre rendez-vous');
    bulle.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-agenda"/></svg>'
      + '<span class="bulle-rdv__infobulle">Prendre rendez-vous</span>';
    bulle.addEventListener('click', function () { ouvre(mRdv); });
    document.body.appendChild(bulle);

    /* --- le test de visibilite, cinq secondes apres l'ouverture ---
       Il ne s'affiche que sur la page d'accueil. Une seule fois par visite :
       pas au rafraichissement, pas en changeant de page. Le marqueur vit dans
       le stockage de session, donc il disparait a la fermeture de l'onglet et
       la fenetre revient a la prochaine venue. Nathan, 3 novembre 2026. */
    var surAccueil = /(^|\/)(index\.html)?$/.test(location.pathname);
    var dejaVu = false;
    try { dejaVu = sessionStorage.getItem('obt-test-vu') === '1'; } catch (e) { dejaVu = false; }
    if (!surLaPageDuTest && surAccueil && !dejaVu) {
      var mTest = fabrique('test', squeletteTest(), 'Test de visibilité');
      mTest.querySelectorAll('[data-tv]').forEach(initTestVisibilite);
      setTimeout(function () {
        /* On n'interrompt personne : si une autre fenetre est deja ouverte, le
           test attend la prochaine visite. */
        if (!ouverte) ouvre(mTest);
        try { sessionStorage.setItem('obt-test-vu', '1'); } catch (e) { /* tant pis */ }
      }, DELAI_TEST);
    }
  }

  /* ------------------------------------------------------------------------
     12. MISE EN PAUSE DES ANIMATIONS HORS ÉCRAN
     Taches des heros et bandes défilantes tournent en boucle. Hors du cadre,
     elles continuaient de faire travailler le compositeur pour rien, c'est
     autant de temps volé au défilement. On les suspend dès qu'elles sortent,
     on les relance dès qu'elles reviennent.
     Le survol n'est pas concerné : la consigne « la bande ne s'arrête jamais »
     porte sur le survol, pas sur une bande qu'on ne voit pas.
     ------------------------------------------------------------------------ */
  function initOffscreenPause() {
    if (!('IntersectionObserver' in window)) return;
    /* `.scan-wrap` et `.hero-readmore` en plus des fonds : le simulateur
       suspend bien sa boucle requestAnimationFrame hors de l'écran, mais les
       animations CSS qu'il porte, flottement du navigateur, curseur qui
       clignote, reflet, pulsation, continuaient, elles, à tourner. */
    var zones = Array.prototype.slice.call(
      document.querySelectorAll('.blobs, .marquee, .scan-wrap, .hero-readmore'));
    if (!zones.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var etat = e.isIntersecting ? 'running' : 'paused';
        e.target.querySelectorAll('*').forEach(function (el) {
          el.style.animationPlayState = etat;
        });
        e.target.style.animationPlayState = etat;
      });
    }, { rootMargin: '200px 0px' });

    zones.forEach(function (z) { io.observe(z); });
  }

  /* ------------------------------------------------------------------------
     13. BANDES DÉFILANTES, assez de copies pour ne jamais défiler à vide
     La piste boucle en se translatant d'exactement une largeur de groupe. Pour
     que le raccord soit invisible, il faut qu'après cette translation la piste
     couvre encore tout l'écran : il faut donc au moins (largeur écran /
     largeur d'un groupe) + 1 groupes. Avec deux groupes seulement, le cas
     jusqu'ici, une bande dont le contenu est plus court que l'écran laissait
     apparaître le vide de la fin de piste avant de reboucler.
     ------------------------------------------------------------------------ */
  function initMarquee(track) {
    var modele = track.querySelector('.marquee-group');
    if (!modele) return;

    function ajuste() {
      var groupes = Array.prototype.slice.call(track.querySelectorAll('.marquee-group'));
      var largeur = modele.getBoundingClientRect().width;
      if (!largeur) return;

      var ecran = document.documentElement.clientWidth;
      var voulu = Math.max(2, Math.ceil(ecran / largeur) + 1);

      while (groupes.length > voulu) {
        track.removeChild(groupes.pop());
      }
      while (groupes.length < voulu) {
        var copie = modele.cloneNode(true);
        copie.setAttribute('aria-hidden', 'true');   // une seule copie est lue
        /* Une copie est un doublon decoratif : elle ne doit pas non plus etre
           un arret de tabulation. Sans cela, une bande contenant des liens, celle des avis, ferait tabuler sur des liens masques aux
           lecteurs d'ecran, ce qui est precisement le piege que
           `aria-hidden` sur un element focalisable installe. Les bandes de
           texte n'ont aucun focalisable : la boucle ne trouve rien. */
        copie.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')
          .forEach(function (el) { el.setAttribute('tabindex', '-1'); });
        track.appendChild(copie);
        groupes.push(copie);
      }
      track.style.setProperty('--marquee-groups', voulu);
    }

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(ajuste, 150);
    });
    // La largeur d'un groupe dépend de la police : on recalcule une fois
    // celle-ci chargée, sinon le compte est fait sur la police de secours.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(ajuste).catch(function () {});
    }
    ajuste();
  }

  /* ------------------------------------------------------------------------
     14. PILES COLLANTES EN MOBILE
     Sur petite largeur, les blocs de « Nos services » et les quatre étapes du
     « Résumé de notre méthode » se recouvrent au défilement, comme les cartes
     de la page Services. Le recouvrement n'est exact que si toutes les cartes
     ont la même hauteur : on l'égalise ici et on la relâche dès qu'on
     repasse au-dessus du point de rupture.
     ------------------------------------------------------------------------ */
  function egaliseHauteurs(items) {
    items.forEach(function (c) { c.style.minHeight = ''; });
    var plusHaute = items.reduce(function (max, c) {
      return Math.max(max, c.getBoundingClientRect().height);
    }, 0);
    if (!plusHaute) return 0;
    var h = Math.ceil(plusHaute);
    items.forEach(function (c) { c.style.minHeight = h + 'px'; });
    return h;
  }

  // Position de repli : juste sous le bandeau menu.
  function collageParDefaut() {
    var v = parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height')) || 88;
    return Math.round(v) + 16;
  }

  /* `centrer` : la carte 01 se fige quand elle atteint le milieu de l'écran.
     Deux variables sont exposées à la feuille de style, `--pile-top`, le
     point de collage et `--pile-h`, la hauteur commune des cartes, qui
     dimensionne la réserve de défilement.
     La hauteur de référence est `clientHeight` et non `innerHeight` : sur
     mobile, `innerHeight` grandit quand la barre d'adresse se rétracte et un
     point de collage qui bouge en cours de défilement décale la superposition
     et ne revient pas au même endroit quand on remonte. */
  function initPileMobile(conteneur, selecteur, centrer) {
    var items = Array.prototype.slice.call(conteneur.querySelectorAll(selecteur));
    if (items.length < 2) return;

    var mq = window.matchMedia('(max-width: 768px)');
    var derniereLargeur = 0;

    function appliquer() {
      if (!mq.matches) {
        items.forEach(function (c) { c.style.minHeight = ''; });
        conteneur.style.removeProperty('--pile-h');
        conteneur.style.removeProperty('--pile-top');
        return;
      }
      var h = egaliseHauteurs(items);
      if (!centrer || !h) return;
      conteneur.style.setProperty('--pile-h', h + 'px');
      // Jamais au-dessus du bandeau menu, qui recouvrirait la carte.
      var haut = Math.max(collageParDefaut(),
                          Math.round((document.documentElement.clientHeight - h) / 2));
      conteneur.style.setProperty('--pile-top', haut + 'px');
    }

    // Comme pour les cartes de la page Services : la toute première mesure
    // peut tomber avant que la mise en page soit stabilisée. On recalcule à
    // chaque changement de largeur et jamais sur la hauteur, c'est elle
    // qu'on écrit, la surveiller ferait boucler.
    if ('ResizeObserver' in window) {
      new ResizeObserver(function (entries) {
        var w = Math.round(entries[0].contentRect.width);
        if (w === derniereLargeur) return;
        derniereLargeur = w;
        appliquer();
      }).observe(conteneur);
    }
    if (mq.addEventListener) mq.addEventListener('change', appliquer);
    else if (mq.addListener) mq.addListener(appliquer);

    var t;
    var derniereLargeurFenetre = window.innerWidth;
    function differe() { clearTimeout(t); t = setTimeout(appliquer, 150); }
    // On ne recalcule que si la LARGEUR change. Sur mobile, la rétractation de
    // la barre d'adresse émet `resize` en ne touchant que la hauteur : y
    // réagir ferait glisser le point de collage en plein défilement.
    window.addEventListener('resize', function () {
      if (window.innerWidth === derniereLargeurFenetre) return;
      derniereLargeurFenetre = window.innerWidth;
      differe();
    });
    window.addEventListener('orientationchange', function () {
      derniereLargeurFenetre = window.innerWidth;
      differe();
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(appliquer).catch(function () {});
    }
    window.addEventListener('load', appliquer);
    setTimeout(appliquer, 400);
    appliquer();
  }

  /* ------------------------------------------------------------------------

  /* ------------------------------------------------------------------------
     16. VOILE DE CHARGEMENT
     Le voile est déjà peint quand ce module s'exécute : le script en-tête a
     posé `html.is-loading` avant le premier rendu. Ici on ne fait que le
     retirer, une fois la page chargée et après une durée minimale, sans elle,
     sur une connexion rapide, le voile apparaîtrait et disparaîtrait dans le
     même battement de cil, ce qui se voit plus qu'un affichage franc.
     ------------------------------------------------------------------------ */
  /* Le logo rejoue l'ouverture, depuis n'importe quelle page.
     Un clic vers l'adresse deja affichee est un rechargement aux yeux du
     navigateur : depuis l'accueil, le voile revenait donc tout seul. Depuis
     une autre page, non. Le marqueur de session est donc oublie au clic et
     la page d'accueil qui suit se croit ouverte pour la premiere fois.
     C'est le meme marqueur qui est retire, pas un second : rien a ajouter a
     la politique de confidentialite.
     Les clics qui ouvrent un autre onglet (molette, ctrl, cmd, maj) sont
     laisses tranquilles : ils ne changent pas la page en cours et oublier le
     marqueur ferait revenir le voile au clic suivant dans CET onglet. */


  /* ------------------------------------------------------------------------
     17. VISIONNEUSE DE RÉALISATION
     Le site du client s'affiche dans une iframe posée par-dessus la page.
     La source n'est posée qu'à l'ouverture et retirée à la fermeture : sinon le
     site invité, vidéos comprises, tournerait en permanence en arrière-plan
     et le carrousel duplique ses diapositives, donc trois iframes par
     réalisation se chargeraient au chargement de la page.
     L'écoute est déléguée au document pour la même raison : les boutons des
     copies du carrousel n'existent pas encore quand ce module s'exécute.
     ------------------------------------------------------------------------ */
  function initViewer() {
    var vue = document.getElementById('viewer');
    if (!vue) return;

    var cadre    = vue.querySelector('[data-viewer-iframe]');
    /* Certains sites de démonstration doivent s'afficher et s'animer
       normalement, mais sans que leurs boutons n'emmènent nulle part. Le
       drapeau est porté par le bouton d'ouverture. */
    var inerte = false;
    /* `data-viewer-nom` et non `data-viewer-titre` : ce dernier est porté par
       les BOUTONS et un jour ou l'autre une recherche non restreinte au cadre
       tomberait sur l'un d'eux au lieu du titre. */
    var titre    = vue.querySelector('[data-viewer-nom]');
    var declencheur = null;

    /* Le site invité mesure la fenêtre au moment où il s'initialise. Si le
       cadre change de taille après coup, fin de l'animation d'ouverture,
       redimensionnement de la fenêtre, rotation du téléphone, ses animations
       de défilement restent calées sur les anciennes mesures et ne se
       déclenchent plus aux bons endroits. On lui demande donc de se remesurer.
       Tout est en `try` : le site invité n'est pas obligé d'utiliser GSAP et
       une page d'un autre domaine serait inaccessible. */
    function remesurer() {
      if (vue.hidden || !cadre || !cadre.contentWindow) return;
      try {
        var w = cadre.contentWindow;
        w.dispatchEvent(new w.Event('resize'));
        if (w.ScrollTrigger && w.ScrollTrigger.refresh) w.ScrollTrigger.refresh();
      } catch (e) {}
    }

    if (cadre) {
      // Une fois la page invitée chargée et une fois l'animation d'ouverture
      // terminée : à ce moment-là seulement le cadre a sa taille définitive.
      cadre.addEventListener('load', function () {
        remesurer();
        window.setTimeout(remesurer, 350);
        // Le point bleu s'efface à l'entrée dans le site du client.
        if (inerte) neutraliser(cadre.contentDocument);
      });
    }
    var minuteurTaille;
    window.addEventListener('resize', function () {
      if (vue.hidden) return;
      window.clearTimeout(minuteurTaille);
      minuteurTaille = window.setTimeout(remesurer, 150);
    });

    function ouvrir(btn) {
      var src = btn.getAttribute('data-viewer-src');
      if (!src) return;
      declencheur = btn;
      inerte = btn.hasAttribute('data-viewer-inerte');
      if (titre) titre.textContent = btn.getAttribute('data-viewer-titre') || 'Réalisation';
      if (cadre) cadre.src = src;
      vue.hidden = false;
      document.body.classList.add('is-locked');
      // Lecture forcée de la mise en page : elle fige l'état de départ avant
      // que la classe ne pose l'état d'arrivée, sans quoi le navigateur
      // calculerait les deux d'un coup et la transition sauterait.
      // Volontairement pas de `requestAnimationFrame` : dans un onglet en
      // arrière-plan il ne se déclenche pas et le cadre resterait à
      // `opacity: 0`, invisible mais bloquant la page.
      void vue.offsetHeight;
      vue.classList.add('is-open');
      var fermer = vue.querySelector('.viewer-close');
      if (fermer) fermer.focus();
    }

    /* Neutralise les commandes du site invité SANS toucher à ses fichiers ni à
       son apparence : on n'ajoute ni `disabled`, qui les griserait, ni
       `pointer-events: none`, qui supprimerait aussi les effets de survol. On
       intercepte l'événement en phase de capture, avant que le site ne le
       reçoive. Le reste du site continue de fonctionner : défilement,
       animations, ouverture des blocs dépliants. */
    var COMMANDES = 'a, button, [role="button"], input[type="submit"], input[type="button"]';
    function neutraliser(docInvite) {
      if (!docInvite) return;
      try {
        var bloquer = function (e) {
          var cible = e.target.closest ? e.target.closest(COMMANDES) : null;
          if (!cible) return;
          e.preventDefault();
          e.stopPropagation();
        };
        docInvite.addEventListener('click', bloquer, true);
        docInvite.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          bloquer(e);
        }, true);
        // Un formulaire peut partir sans clic : touche Entrée dans un champ.
        docInvite.addEventListener('submit', function (e) {
          e.preventDefault();
          e.stopPropagation();
        }, true);
      } catch (e) {}
    }

    function fermer() {
      if (vue.hidden) return;
      vue.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      window.setTimeout(function () {
        vue.hidden = true;
        // `about:blank` et non une chaîne vide : vider l'attribut relancerait
        // le chargement de la page courante dans l'iframe.
        if (cadre) cadre.src = 'about:blank';
      }, 280);
      if (declencheur) { declencheur.focus(); declencheur = null; }
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-viewer-src]') : null;
      if (btn) { e.preventDefault(); ouvrir(btn); return; }
      if (e.target.closest && e.target.closest('[data-viewer-close]')) fermer();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !vue.hidden) fermer();
    });

  }

  /* ------------------------------------------------------------------------
     18. CARTE D'AVIS QUI DÉFILE (page Contact)
     Trois avis empilés au même endroit, un seul visible. Le défilement
     s'interrompt au survol et au focus clavier : personne ne doit voir un texte
     disparaître pendant qu'il le lit.
     ------------------------------------------------------------------------ */
  function initAvis(carte) {
    var lames = Array.prototype.slice.call(carte.querySelectorAll('[data-avis-slide]'));
    var puces = Array.prototype.slice.call(carte.querySelectorAll('[data-avis-dot]'));
    if (lames.length < 2) return;

    var delai = parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--avis-delai')) || 3000;
    var index = 0, minuteur = null;

    function montrer(i) {
      index = (i + lames.length) % lames.length;
      lames.forEach(function (l, k) { l.classList.toggle('is-active', k === index); });
      puces.forEach(function (p, k) { p.classList.toggle('is-active', k === index); });
    }
    function demarrer() {
      arreter();
      minuteur = window.setInterval(function () { montrer(index + 1); }, delai);
    }
    function arreter() {
      if (minuteur) { window.clearInterval(minuteur); minuteur = null; }
    }

    puces.forEach(function (p, k) {
      p.addEventListener('click', function () { montrer(k); demarrer(); });
    });

    carte.addEventListener('pointerenter', arreter);
    carte.addEventListener('pointerleave', demarrer);
    carte.addEventListener('focusin', arreter);
    carte.addEventListener('focusout', demarrer);
    // Onglet en arrière-plan : inutile de faire tourner un minuteur que
    // personne ne regarde et le premier avis au retour est le bon.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) arreter(); else demarrer();
    });

    montrer(0);
    demarrer();
  }

  /* ------------------------------------------------------------------------
     19. BARRE D'APPEL FLOTTANTE
     Elle s'efface devant les zones qui portent déjà leur propre appel à
     l'action, ou qu'elle viendrait recouvrir : les heros, le pied de page et le
     formulaire de la page Contact.
     Deux règles, parce que les zones ne se ressemblent pas :

     - un HERO se juge sur son emprise à l'écran. Un simple test de
       chevauchement ne suffirait pas : les heros des pages intérieures
       s'arrêtent 140 px avant le bas de l'écran pour laisser deviner la section
       suivante et la barre se logeait pile dans cet interstice. On la masque
       donc tant que le hero occupe la moitié basse de l'écran ;
     - le PIED DE PAGE et le formulaire de contact se jugent au chevauchement :
       il s'agit seulement de ne pas les recouvrir, une fois passés la barre
       peut revenir.
     ------------------------------------------------------------------------ */
  var APPEL_HEROS  = '.hero, .svc-hero';
  var APPEL_BANDES = '.site-footer, #contact-s2';
  /* Étapes 2 et 3 du tunnel Tarifs : les cartes de formules et le formulaire de
     devis. La barre s'y logerait par-dessus les boutons « Parlons de votre
     projet » et les derniers champs du formulaire. */
  var APPEL_ETAPES = '[data-tunnel-step="2"], [data-tunnel-step="3"]';

  function initAppelFlottant(barre) {
    var heros  = Array.prototype.slice.call(document.querySelectorAll(APPEL_HEROS));
    var bandes = Array.prototype.slice.call(document.querySelectorAll(APPEL_BANDES));
    var etapes = Array.prototype.slice.call(document.querySelectorAll(APPEL_ETAPES));
    if (!heros.length && !bandes.length && !etapes.length) return;

    var enAttente = false;

    function evaluer() {
      enAttente = false;
      // Mesures relues à chaque passage : la hauteur de la barre change avec la
      // largeur de l'écran et celle du viewport avec la barre d'adresse.
      var h = window.innerHeight;
      var bas = h - (parseFloat(getComputedStyle(barre).bottom) || 0);
      var haut = bas - barre.offsetHeight;

      var surUnHero = heros.some(function (z) {
        return z.getBoundingClientRect().bottom > h * 0.5;
      });
      var surUneBande = bandes.some(function (z) {
        var r = z.getBoundingClientRect();
        return r.bottom > haut && r.top < bas;
      });
      /* Une étape non encore atteinte porte `hidden` : elle ne compte pas.
         Même critère que les hero et pour la même raison : ni la présence à
         l'écran ni le chevauchement ne conviennent ici. La présence masquait la
         barre jusque sur la section d'avis qui suit le tunnel, une étape haute
         de 800 px reste « à l'écran » longtemps après qu'on l'a dépassée. Le
         chevauchement, lui, la laissait revenir au milieu de l'étape 4 : le
         formulaire ne fait que 524 px et la barre se logeait dessous. On juge
         donc, comme pour un hero, si l'étape occupe encore la moitié basse. */
      var surUneEtape = etapes.some(function (z) {
        if (z.hidden) return false;
        var r = z.getBoundingClientRect();
        return r.bottom > h * 0.5 && r.top < h;
      });
      barre.classList.toggle('est-masquee', surUnHero || surUneBande || surUneEtape);
    }

    function planifier() {
      if (enAttente) return;
      enAttente = true;
      window.requestAnimationFrame(evaluer);
    }

    window.addEventListener('scroll', planifier, { passive: true });
    window.addEventListener('resize', planifier);
    /* Passer de l'étape 1 à l'étape 2 ne défile pas toujours : le tunnel se
       contente de retirer `hidden`. Sans cette observation, la barre resterait
       visible jusqu'au prochain mouvement de la molette. */
    if (etapes.length && window.MutationObserver) {
      var oeil = new MutationObserver(planifier);
      etapes.forEach(function (z) {
        oeil.observe(z, { attributes: true, attributeFilter: ['hidden'] });
      });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(evaluer).catch(function () {});
    }
    window.addEventListener('load', evaluer);
    evaluer();
  }

  /* ------------------------------------------------------------------------
     Initialisation
     ------------------------------------------------------------------------ */

  /* ------------------------------------------------------------------------
     20. LES NOMBRES QUI SE COMPTENT
     Un chiffre qui monte se regarde ; un chiffre posé se survole. Le nombre
     final est écrit dans le HTML : sans JavaScript, ou si le visiteur demande
     moins d'animation, il reste affiché tel quel. Le compte ne part qu'une
     fois, à l'entrée dans l'écran. Le nœud de texte d'origine est remis à la
     fin pour ne rien perdre de la mise en forme voisine.
     ------------------------------------------------------------------------ */
  function initCompteur(el) {
    var brut = el.getAttribute('data-compteur');
    var cible = parseFloat(brut);
    if (isNaN(cible)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var noeud = el.firstChild;
    if (!noeud || noeud.nodeType !== 3) return;

    var fin = noeud.nodeValue;
    /* Certains nombres sont suivis d'une espace dans le HTML, parce que le mot
       qui suit est dans le meme paragraphe. On la garde pendant le compte. */
    var espace = /\s$/.test(fin) ? ' ' : '';
    /* Une virgule dans l'attribut veut dire une virgule a l'ecran : 43.75
       s'affiche 43,75 et compte avec deux decimales, pas en entiers. */
    var pt = brut.indexOf('.');
    var decimales = pt < 0 ? 0 : brut.length - pt - 1;
    /* Le decalage vient du HTML : quatre cartes qui montent ensemble font un
       bloc, quatre cartes decalees de 120 ms font une vague. */
    var retard = parseInt(el.getAttribute('data-compteur-delai'), 10) || 0;

    var ecrire = function (v) {
      var t = decimales ? v.toFixed(decimales).replace('.', ',') : String(Math.round(v));
      if (!decimales && cible >= 1000) t = t.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
      noeud.nodeValue = t + espace;
    };

    var compter = function () {
      var depart = null, duree = 900;
      requestAnimationFrame(function pas(t) {
        if (depart === null) depart = t;
        var p = Math.min(1, (t - depart) / duree);
        ecrire(cible * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(pas);
        else noeud.nodeValue = fin;
      });
    };

    var oeil = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        oeil.disconnect();
        if (retard) setTimeout(compter, retard);
        else compter();
      });
    }, { threshold: 0.4 });
    oeil.observe(el);
  }


  /* ------------------------------------------------------------------------
     21 ter. LES PAGES D'EXPERTISE
     Deux aides a la lecture d'un guide long : une barre fine en haut de
     l'ecran qui se remplit a mesure qu'on avance. Puis le sommaire de gauche,
     qui allume le chapitre en cours. Sans JavaScript la page se lit pareil :
     le sommaire reste une liste de liens vers les chapitres.
     Nathan, 5 novembre 2026.
     ------------------------------------------------------------------------ */
  function initExpertise(guide) {
    var barre = document.querySelector('.ex-lecture');
    var liens = [].slice.call(document.querySelectorAll('.ex-sommaire a[href^="#"]'));
    var chapitres = liens.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);
    var attente = false;

    function mesure() {
      attente = false;
      if (barre) {
        var r = guide.getBoundingClientRect();
        var total = r.height - window.innerHeight * 0.6;
        var lu = total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : 0;
        barre.style.setProperty('--lu', lu.toFixed(4));
      }
      /* Le chapitre en cours est le dernier dont le titre a passe le tiers
         haut de l'ecran. */
      var seuil = window.innerHeight * 0.33, actif = 0;
      chapitres.forEach(function (c, k) { if (c.getBoundingClientRect().top < seuil) actif = k; });
      liens.forEach(function (a, k) { a.classList.toggle('est-actif', k === actif); });
    }
    /* Filet pose le 8 novembre 2026 : si le navigateur retient ses images
       (onglet en arriere-plan, economie d'energie), la minuterie mesure a
       sa place. La mesure n'a lieu qu'une fois, quel que soit le premier. */
    function demande() {
      if (attente) return;
      attente = true;
      window.requestAnimationFrame(function () { if (attente) mesure(); });
      window.setTimeout(function () { if (attente) mesure(); }, 150);
    }
    window.addEventListener('scroll', demande, { passive: true });
    window.addEventListener('resize', demande);
    mesure();
  }

  /* ------------------------------------------------------------------------
     21 bis. UN TITRE DONT LE SURLIGNAGE PASSE A LA LIGNE
     Le fond bleu du surlignage se coupe ligne par ligne. Quand un titre est
     compose serre, les deux bandes se chevauchent de quelques pixels et le
     mot du bas mord sur celui du haut. On mesure donc combien de lignes
     occupe chaque surlignage : s'il y en a plus d'une, le titre recoit un
     interligne plus large. Un surlignage qui tient sur une ligne ne change
     rien, le titre reste exactement comme il a ete valide.
     Demande de Nathan le 5 novembre 2026, vue sur la page Creation de site.
     ------------------------------------------------------------------------ */
  function aereLesTitresSurlignes() {
    document.querySelectorAll('.a1__surligne').forEach(function (bloc) {
      var titre = bloc.closest('h1, h2, h3');
      if (!titre) return;
      /* On mesure sans la classe : sinon l'interligne deja elargi fausserait
         la mesure suivante et le titre ne reviendrait jamais en arriere. */
      titre.classList.remove('est-aere');
      var lignes = bloc.getClientRects().length;
      if (lignes > 1) titre.classList.add('est-aere');
    });
  }

  function surveilleLesTitresSurlignes() {
    aereLesTitresSurlignes();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(aereLesTitresSurlignes);
    }
    var attente;
    window.addEventListener('resize', function () {
      window.clearTimeout(attente);
      attente = window.setTimeout(aereLesTitresSurlignes, 150);
    });
  }

  /* ------------------------------------------------------------------------
     21. LE MENU PRODUIT
     Plusieurs entrées du bandeau ouvrent chacune leur panneau. Deux règles
     posées par Nathan le 5 novembre 2026 : jamais deux panneaux affichés en
     même temps. Et le clic n'épingle rien. Pour cliquer sur une entrée il
     faut déjà être dessus, donc le panneau est déjà ouvert : garder le clic
     comme bascule ne faisait que laisser un panneau coincé derrière le
     visiteur.
     Les panneaux se déclarent dans un registre commun. Entrer sur une entrée
     ferme les autres dans la même image, sans délai : c'est ce qui supprime
     la superposition qu'on voyait en passant de « Nos services » à
     « Nos secteurs ».
     Là où il n'y a pas de souris (doigt, clavier), le clic reste la seule
     façon d'ouvrir. Le focus ouvre aussi le panneau pour la navigation
     au clavier. Échap, clic en dehors et sortie du focus referment.
     ------------------------------------------------------------------------ */
  var menusProduit = [];

  function fermeMenusProduit(sauf) {
    menusProduit.forEach(function (m) { if (m.item !== sauf) m.ferme(); });
  }

  function initMenuProduit(item) {
    var bouton = item.querySelector('.nav-produit__bouton');
    var panneau = item.querySelector('.nav-produit__panneau');
    if (!bouton || !panneau) return;
    var survol = window.matchMedia('(hover: hover) and (pointer: fine)');
    var minuteur;

    function pose(ouvert) {
      panneau.hidden = !ouvert;
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      if (ouvert) item.setAttribute('data-ouvert', '');
      else item.removeAttribute('data-ouvert');
    }

    function ouvre() {
      window.clearTimeout(minuteur);
      fermeMenusProduit(item);
      pose(true);
    }

    function ferme() {
      window.clearTimeout(minuteur);
      pose(false);
      panneau.querySelectorAll('.est-survol').forEach(function (c) { c.classList.remove('est-survol'); });
    }

    menusProduit.push({ item: item, ferme: ferme });

    /* À la souris, le clic ne change rien : le panneau est déjà ouvert par le
       survol. Au doigt, il reste la bascule. */
    bouton.addEventListener('click', function () {
      if (survol.matches) { ouvre(); return; }
      if (panneau.hidden) ouvre();
      else ferme();
    });

    item.addEventListener('mouseenter', function () {
      if (!survol.matches) return;
      ouvre();
    });
    item.addEventListener('mouseleave', function () {
      if (!survol.matches) return;
      window.clearTimeout(minuteur);
      minuteur = window.setTimeout(ferme, 90);
    });

    /* Le clavier : arriver sur le bouton ouvre, quitter le menu referme. */
    bouton.addEventListener('focus', function () {
      if (bouton.matches(':focus-visible')) ouvre();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panneau.hidden) {
        ferme();
        bouton.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (!panneau.hidden && !item.contains(e.target)) ferme();
    });
    item.addEventListener('focusout', function (e) {
      if (!item.contains(e.relatedTarget)) ferme();
    });

    /* Chaque case du volet se grise sous la souris. Le CSS le fait deja avec
       :hover, mais une seule regle mal ordonnee suffisait a l'eteindre sur la
       page courante : la classe posee ici double le mecanisme, une case
       survolee est toujours grisee et une seule l'est a la fois.
       Nathan, 5 novembre 2026. */
    var cases = panneau.querySelectorAll('.nav-produit__liste a');
    function survole(cible) {
      cases.forEach(function (c) { c.classList.toggle('est-survol', c === cible); });
    }
    cases.forEach(function (c) {
      c.addEventListener('mouseenter', function () { survole(c); });
      c.addEventListener('focus', function () { survole(c); });
    });
    panneau.addEventListener('mouseleave', function () { survole(null); });

    /* L'apercu de droite : il suit l'entree survolee ou pointee au clavier.
       Au repos il montre la creation de site, celle qui est mise en avant.
       Tout est decoratif : si ce bloc manque, le menu fonctionne pareil. */
    var apercu = panneau.querySelector('[data-nav-apercu]');
    if (!apercu) return;
    var vues = {};
    apercu.querySelectorAll('[data-vue]').forEach(function (v) { vues[v.getAttribute('data-vue')] = v; });
    var liens = panneau.querySelectorAll('.nav-produit__liste a[data-produit]');
    var repos = panneau.querySelector('.est-avant a[data-produit]');
    repos = repos ? repos.getAttribute('data-produit') : liens[0] && liens[0].getAttribute('data-produit');

    function montre(nom) {
      Object.keys(vues).forEach(function (k) { vues[k].classList.toggle('est-vue', k === nom); });
    }
    montre(repos);

    liens.forEach(function (a) {
      var nom = a.getAttribute('data-produit');
      a.addEventListener('mouseenter', function () { montre(nom); });
      a.addEventListener('focus', function () { montre(nom); });
    });
    panneau.addEventListener('mouseleave', function () { montre(repos); });
  }

  /* ======================================================================
     A1 : le titre qui se revele mot a mot. Les logos entrent en
     cascade. Repris de seobanana.fr, adapte au bleu OBT.

     L'emballage des mots se fait ICI et non dans le HTML : le titre reste
     lisible et modifiable en clair dans la page. Sans JavaScript aucun
     mot n'est eteint, donc rien ne manque. Le surlignage, lui, est un
     element du HTML : il porte le sens, pas seulement l'effet.
     ====================================================================== */

  function emballeMots(titre) {
    if (titre.dataset.motsPrets === '1') return;
    var sortie = document.createDocumentFragment();

    [].slice.call(titre.childNodes).forEach(function (noeud) {
      // Un retour a la ligne reste un retour a la ligne.
      if (noeud.nodeName === 'BR') { sortie.appendChild(noeud.cloneNode()); return; }

      if (noeud.nodeType === 3) {
        // On garde les espaces tels quels pour ne pas coller les mots.
        noeud.textContent.split(/(\s+)/).forEach(function (bout) {
          if (bout === '') return;
          if (!bout.trim()) { sortie.appendChild(document.createTextNode(bout)); return; }
          var m = document.createElement('span');
          m.className = 'mot';
          m.textContent = bout;
          sortie.appendChild(m);
        });
        return;
      }

      // Tout autre element, le surlignage par exemple, devient un mot entier :
      // il s'allume d'un bloc, ce qui est voulu.
      var enveloppe = document.createElement('span');
      enveloppe.className = 'mot';
      enveloppe.appendChild(noeud.cloneNode(true));
      sortie.appendChild(enveloppe);
    });

    titre.textContent = '';
    titre.appendChild(sortie);
    titre.dataset.motsPrets = '1';
  }

  function initMots(titre) {
    emballeMots(titre);
    var mots = titre.querySelectorAll('.mot');
    if (!mots.length) return;

    // Moins d'animations : tout est lu tout de suite, la feuille de style
    // neutralise deja la transition.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      [].forEach.call(mots, function (m) { m.classList.add('est-lu'); });
      return;
    }

    var allume = function () {
      [].forEach.call(mots, function (m, i) {
        setTimeout(function () { m.classList.add('est-lu'); }, i * 70);
      });
    };

    if (!('IntersectionObserver' in window)) { allume(); return; }
    var oeil = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        oeil.disconnect();
        allume();
      });
    }, { threshold: .25 });
    oeil.observe(titre);
  }

  function initCascade(liste) {
    var elements = liste.children;
    if (!elements.length) return;

    var entre = function () {
      [].forEach.call(elements, function (el, i) {
        setTimeout(function () { el.classList.add('est-entre'); }, 260 + i * 60);
      });
    };

    if (!('IntersectionObserver' in window) ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      [].forEach.call(elements, function (el) { el.classList.add('est-entre'); });
      return;
    }
    var oeil = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        oeil.disconnect();
        entre();
      });
    }, { threshold: .2 });
    oeil.observe(liste);
  }

  /* ======================================================================
     A1 : la plateforme qui defile DANS le titre. Reprise de oscar-seo.ai.

     La piste descend d'un cran toutes les 2,5 secondes. Le premier element
     est repete en fin de piste : arrive dessus, on revient au depart sans
     transition, donc sans saut visible. La largeur de la fenetre suit le nom
     affiche, sinon « Perplexity » serait coupe et « Bing » laisserait un
     trou dans la phrase.
     ====================================================================== */

  function initRotor(rotor) {
    var piste = rotor.querySelector('.a1__rotor-piste');
    if (!piste) return;

    // Les autres plateformes attendent dans un `template` : elles ne sont ni
    // lues par un moteur de recherche ni affichees sans JavaScript. On les
    // verse dans la piste seulement maintenant.
    var suite = rotor.querySelector('[data-rotor-suite]');
    if (suite) {
      piste.appendChild(suite.content.cloneNode(true));
      suite.remove();
      // Une liste qui tourne n'a pas de sens a l'oreille : on annonce les six
      // noms une fois. Le defile devient alors une image.
      rotor.setAttribute('role', 'img');
      rotor.setAttribute('aria-label',
        'Google, Google Maps, ChatGPT, Gemini, Perplexity et Bing');
    }

    var items = piste.children;
    if (items.length < 2) return;

    var largeur = function (i) {
      // `getBoundingClientRect` plutot que `offsetWidth` : la largeur est
      // fractionnaire et un arrondi au pixel decalait la phrase.
      return items[i].getBoundingClientRect().width;
    };
    var poser = function (i, anime) {
      var ecart = parseFloat(getComputedStyle(piste).rowGap) || 0;
      var h = items[0].getBoundingClientRect().height + ecart;
      piste.style.transition = anime ? '' : 'none';
      rotor.style.transition = anime ? '' : 'none';
      piste.style.transform = 'translateY(' + (-i * h) + 'px)';
      rotor.style.setProperty('--rotor-l', largeur(i).toFixed(2) + 'px');
      if (!anime) {
        // On force le calcul avant de rendre la transition, sinon le
        // navigateur regroupe les deux changements et le saut se voit.
        void piste.offsetWidth;
        piste.style.transition = '';
        rotor.style.transition = '';
      }
    };

    var rang = 0;
    var dernier = items.length - 1;   // le clone du premier

    poser(0, false);
    window.addEventListener('resize', function () { poser(rang, false); });

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setInterval(function () {
      if (document.hidden) return;    // rien ne tourne dans un onglet cache
      rang += 1;
      poser(rang, true);
      if (rang === dernier) {
        setTimeout(function () { rang = 0; poser(0, false); }, 600);
      }
    }, 2500);
  }

  /* ======================================================================
     A5 : LA MONTEE DU CLASSEMENT ET LE COMPARATEUR

     Deux petites choses, chacune dans son coin. La montee ne se joue qu'une
     fois, a l'entree dans l'ecran : rejouee a chaque passage elle deviendrait
     un gadget. Le comparateur est un vrai champ de type range, donc il
     fonctionne au doigt, a la souris et aux fleches du clavier ; le script
     ne fait que recopier sa valeur dans la variable qui rogne l'image.
     ====================================================================== */

  function initMontee(bloc) {
    var vous = bloc.querySelector('.a5__rang--vous');
    var place = vous && vous.querySelector('.a5__place');
    var autres = [].slice.call(bloc.querySelectorAll('.a5__rang:not(.a5__rang--vous) .a5__place'));
    var depart = place ? parseInt(place.getAttribute('data-place'), 10) : 0;

    /* L'etat d'arrivee, celui qu'on veut lire a la fin : premiere place pour
       l'entreprise, les quatre autres decalees d'un cran. C'est aussi l'etat
       pose d'emblee quand le visiteur demande moins d'animations. */
    var poserLaFin = function () {
      bloc.classList.add('est-joue');
      if (place) place.textContent = '1';
      autres.forEach(function (p, i) { p.textContent = String(i + 2); });
    };

    if (!depart || !('IntersectionObserver' in window) ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      poserLaFin();
      return;
    }

    /* Le compte a rebours dure exactement le temps du glissement, 1,4 s :
       le nombre atteint 1 au moment ou la ligne se pose en haut. Les quatre
       concurrents changent de numero en cours de route, l'un apres l'autre,
       comme s'ils se faisaient doubler. */
    var jouer = function () {
      bloc.classList.add('est-joue');
      var debut = null, duree = 1400;
      requestAnimationFrame(function pas(t) {
        if (debut === null) debut = t;
        var p = Math.min(1, (t - debut) / duree);
        var e = 1 - Math.pow(1 - p, 3);
        place.textContent = String(Math.max(1, Math.round(depart - (depart - 1) * e)));
        if (p < 1) requestAnimationFrame(pas);
        else poserLaFin();
      });
      autres.forEach(function (p, i) {
        setTimeout(function () { p.textContent = String(i + 2); }, 620 + i * 110);
      });
    };

    var oeil = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        oeil.disconnect();
        setTimeout(jouer, 420);
      });
    }, { threshold: .45 });
    oeil.observe(bloc);
  }

  function initCompare(bloc) {
    var curseur = bloc.querySelector('.a5__curseur');
    if (!curseur) return;

    var poser = function (v) {
      curseur.value = v;
      bloc.style.setProperty('--x', v + '%');
    };
    curseur.addEventListener('input', function () { poser(curseur.value); });
    poser(curseur.value);

    if (!('IntersectionObserver' in window) ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;

    /* Une demonstration d'un aller-retour, jouee une seule fois a l'entree
       dans l'ecran : sans elle, rien ne dit que la barre se deplace. Le
       premier geste du visiteur l'interrompt sur place, la main lui revient. */
    var etapes = [[46, 76, 900], [76, 22, 1200], [22, 46, 800]];
    var rendue = false;
    var rendreLaMain = function () { rendue = true; };
    ['pointerdown', 'touchstart', 'keydown', 'mousedown'].forEach(function (e) {
      curseur.addEventListener(e, rendreLaMain, { once: true, passive: true });
    });

    var jouer = function () {
      var i = 0, debut = null;
      requestAnimationFrame(function pas(t) {
        if (rendue) return;
        if (debut === null) debut = t;
        var etape = etapes[i];
        var p = Math.min(1, (t - debut) / etape[2]);
        /* Adouci aux deux bouts : la barre part et s'arrete sans a-coup. */
        var e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        poser(Math.round(etape[0] + (etape[1] - etape[0]) * e));
        if (p < 1) return requestAnimationFrame(pas);
        i += 1; debut = null;
        if (i < etapes.length) requestAnimationFrame(pas);
      });
    };

    var oeil = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        oeil.disconnect();
        setTimeout(jouer, 600);
      });
    }, { threshold: .5 });
    oeil.observe(bloc);
  }

  /* ======================================================================
     A6 : L'ETAPIER

     Quatre etapes a droite, une maquette collee a gauche. Celle qui traverse
     le milieu de l'ecran s'allume et commande la maquette. La fenetre
     d'observation est reduite a une bande au centre : sans cela, deux etapes
     seraient actives en meme temps sur un grand ecran. Sans JavaScript, la
     premiere etape et la premiere vue restent affichees, le texte des quatre
     etapes se lit quand meme en entier.
     ====================================================================== */

  function initEtapier(bloc) {
    // La methode de l'accueil et le chantier des pages produit utilisent le
    // meme etapier : les deux jeux de classes sont donc acceptes ici.
    var etapes = [].slice.call(bloc.querySelectorAll('.a6__etape, .p3__etape, .jr__moment'));
    var vues = [].slice.call(bloc.querySelectorAll('.a6__vue, .p3__vue, .jr__vue'));
    if (etapes.length < 2 || !vues.length) return;

    if (!('IntersectionObserver' in window)) {
      etapes.forEach(function (e) { e.classList.add('est-actif'); });
      return;
    }

    var allumer = function (rang) {
      etapes.forEach(function (e, i) { e.classList.toggle('est-actif', i === rang); });
      vues.forEach(function (v, i) { v.classList.toggle('est-actif', i === rang); });
    };

    /* L'etape active est la derniere dont le haut a passe le milieu de
       l'ecran. Corrige le 6 novembre 2026 : l'ancienne regle n'allumait une
       etape que lorsqu'elle traversait une bande de 4 % au milieu de l'ecran.
       En defilant vite, une etape passait la bande entre deux mesures et
       etait sautee : la maquette restait bloquee sur la mauvaise etape.
       Cette regle-ci ne peut rien sauter, dans un sens comme dans l'autre. */
    var actuel = -1, attente = false;
    function mesure() {
      attente = false;
      var milieu = window.innerHeight * 0.5, rang = 0;
      etapes.forEach(function (e, i) { if (e.getBoundingClientRect().top < milieu) rang = i; });
      if (rang !== actuel) { actuel = rang; allumer(rang); }
    }
    /* Filet pose le 8 novembre 2026 : si le navigateur retient ses images
       (onglet en arriere-plan, economie d'energie), la minuterie mesure a
       sa place. La mesure n'a lieu qu'une fois, quel que soit le premier. */
    function demande() {
      if (attente) return;
      attente = true;
      window.requestAnimationFrame(function () { if (attente) mesure(); });
      window.setTimeout(function () { if (attente) mesure(); }, 150);
    }
    window.addEventListener('scroll', demande, { passive: true });
    window.addEventListener('resize', demande);
    mesure();
  }

  /* ======================================================================
     A8 : LES HUIT CARTES QUI ENTRENT EN CASCADE
     Un seul observateur pour la grille entiere, pas un par carte : le
     decalage est porte par le style, pas par huit minuteurs. Sans
     JavaScript, les cartes sont deja posees, la regle qui les cache est
     prefixee par `.js`.
     ====================================================================== */

  function initCascadeCartes(grille) {
    if (!('IntersectionObserver' in window)) { grille.classList.add('est-entree'); return; }
    var oeil = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        oeil.disconnect();
        grille.classList.add('est-entree');
      });
    }, { threshold: .18 });
    oeil.observe(grille);
  }

  /* ======================================================================
     A7 : LE DEFILE SANS FIN
     Le groupe de cartes est ecrit UNE fois dans la page, le script le
     duplique. L'animation ramene la piste de la moitie de sa largeur, donc
     la copie prend exactement la place de l'original et la boucle ne saute
     pas. Ecrire le groupe deux fois a la main doublerait aussi le texte lu
     par un lecteur d'ecran : la copie est donc masquee pour lui.
     ====================================================================== */

  function initDefile(piste) {
    var groupe = piste.firstElementChild;
    if (!groupe || piste.children.length > 1) return;
    var copie = groupe.cloneNode(true);
    copie.setAttribute('aria-hidden', 'true');
    /* Les compteurs de la copie n'ont plus lieu d'etre : deux elements avec
       le meme crochet se declencheraient chacun de leur cote. */
    [].slice.call(copie.querySelectorAll('[data-compteur]')).forEach(function (e) {
      e.removeAttribute('data-compteur');
    });
    piste.appendChild(copie);
  }

  /* Le petit rond « +3 » des bulles d'avis change de couleur d'une bulle a
     l'autre et d'une visite a l'autre : violet, orange, vert, jaune... Le
     depart est tire au hasard, puis chaque bulle prend la teinte suivante.
     Demande de Nathan du 9 novembre 2026. */
  /* Teintes pastel (fond, chiffre), passees en pastel le 9 novembre 2026 :
     le chiffre prend la meme teinte en fonce pour rester lisible. */
  var TEINTES_PLUS = [['#D9CCFF', '#4C2A9E'], ['#FFD8B8', '#9A4510'], ['#C7EFD2', '#1D6B3A'],
                      ['#FFEDA8', '#7A5A00'], ['#FBCFE4', '#9A1D5A'], ['#C2EEEC', '#0F6463']];
  var rangPlus = Math.floor(Math.random() * TEINTES_PLUS.length);
  function colorePlus(racine) {
    (racine || document).querySelectorAll('.a1__visages--plus:not([data-teinte])').forEach(function (rond) {
      var teinte = TEINTES_PLUS[rangPlus % TEINTES_PLUS.length];
      rond.style.setProperty('--plus', teinte[0]);
      rond.style.setProperty('--plus-texte', teinte[1]);
      rond.setAttribute('data-teinte', '');
      rangPlus += 1;
    });
  }

  function init() {
    initNav();
    initHeader();
    document.querySelectorAll('[data-carousel]').forEach(initCarousel);
    document.querySelectorAll('[data-sim]').forEach(initSimulateur);
    document.querySelectorAll('.hero, .svc-hero').forEach(initBlobs);
    document.querySelectorAll('.stack-list').forEach(initStack);
    document.querySelectorAll('.scan-wrap').forEach(initScan);
    document.querySelectorAll('[data-mots]').forEach(initMots);
    document.querySelectorAll('[data-rotor]').forEach(initRotor);
    document.querySelectorAll('[data-compteur]').forEach(initCompteur);
    document.querySelectorAll('[data-montee]').forEach(initMontee);
    document.querySelectorAll('[data-compare]').forEach(initCompare);
    document.querySelectorAll('[data-etapier]').forEach(initEtapier);
    document.querySelectorAll('[data-cascade]').forEach(initCascadeCartes);
    document.querySelectorAll('[data-defile]').forEach(initDefile);
    document.querySelectorAll('[data-nav-produit]').forEach(initMenuProduit);
    document.querySelectorAll('[data-guide]').forEach(initExpertise);
    surveilleLesTitresSurlignes();
    document.querySelectorAll('[data-tunnel]').forEach(initTunnel);
    document.querySelectorAll('[data-faq]').forEach(initFaq);
    document.querySelectorAll('[data-faq-plus]').forEach(initFaqRepli);
    document.querySelectorAll('[data-quote-form]').forEach(initQuoteForm);
    document.querySelectorAll('[data-rdv]').forEach(initRdv);
    document.querySelectorAll('[data-tv]').forEach(initTestVisibilite);
    initFenetres();
    colorePlus();
    initReveal();
    document.querySelectorAll('.marquee-track').forEach(initMarquee);
    document.querySelectorAll('.steps-row').forEach(function (el) { initPileMobile(el, '.step', true); });
    initOffscreenPause();
    initViewer();
    document.querySelectorAll('[data-avis]').forEach(initAvis);
    document.querySelectorAll('.appel-flottant').forEach(initAppelFlottant);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
