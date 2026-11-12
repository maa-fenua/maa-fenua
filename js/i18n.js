// ───────────────────────────────────────────────────────────────
//  Traduction français → reo tahiti
// ───────────────────────────────────────────────────────────────
// PREMIÈRE VERSION, À FAIRE RELIRE par une personne qui parle bien le reo tahiti.
// Pour corriger : changez seulement le texte à droite des « : ».
// Une phrase absente de cette liste reste en français.
// Les lignes PATTERNS contiennent une partie variable ($1 = nom, nombre…).

const TAH = {
  // En-tête et onglets
  "Acheter": "Hoʻo mai",
  "Vendre": "Hoʻo atu",
  "Admin": "Faʻatere",
  "Produits": "Tauihaʻa",
  "Carte": "Hōhoʻa fenua",
  "Mes demandes": "Taʻu mau aniraʻa",
  "Agriculteur": "Taʻata faʻaʻapu",
  "Compte": "Taʻu tītōraʻa",
  "Mes produits": "Taʻu mau tauihaʻa",
  "Demandes": "Aniraʻa",
  "Points de retrait": "Vāhi raveraʻa",
  "Résumé": "Haʻapotoraʻa",
  "Agriculteurs": "Taʻata faʻaʻapu",
  "Démo": "Faʻaʻiteraʻa",

  // Accueil acheteur
  "Ia ora na !": "Ia ora na !",
  "De saison au fenua": "Nō teie tau i te fenua",
  "Ananas": "Painapo",
  "Papaye": "ʻĪʻītā",
  "Coco": "Haʻari",
  "Patates douces": "ʻUmara",
  "Corossol": "Tapotapo",
  "Plants": "Rāʻau tupu",
  "Rechercher": "ʻImi",
  "Taro, ananas, vanille": "Taro, painapo, vanira",
  "Toutes": "Pauroa",
  "Tous": "Pauroa",
  "Fruits": "Maʻa hotu",
  "Légumes": "Maʻa tupu",
  "Vanille et épices": "Vanira e te mau ʻinaʻi",
  "Plantes": "Rāʻau tupu",
  "Me localiser": "ʻImi i tōʻu vāhi",
  "Actualiser ma position": "Faʻaʻāpī i tōʻu vāhi",
  "Activez la position pour voir les distances.": "Faʻaohipa i tō ʻoe vāhi nō te ʻite i te ātea.",
  "Distances calculées depuis votre position.": "Ua nūmerahia te ātea mai tō ʻoe vāhi.",
  "Épuisé pour le moment": "Ua pau i teie nei",
  "Le marché ouvre bientôt": "Fātata te mātete i te ʻiriti",
  "Rien ne correspond": "ʻAita e tauihaʻa",
  "Essayez une autre île, une autre catégorie ou un autre mot.": "Tāmata i te tahi atu motu, te tahi atu pupu, aore rā te tahi atu parau.",

  // Fiche produit
  "Retour": "Hoʻi",
  "Quelle quantité voulez-vous ?": "Ehia tā ʻoe e hinaaro ?",
  "Total à payer en espèces au retrait": "Te moni e aufau i te raveraʻa",
  "Point de retrait": "Vāhi raveraʻa",
  "Ouvrir l'itinéraire dans Google Maps": "ʻIriti i te ʻēʻa i Google Maps",
  "Vos coordonnées": "Tō ʻoe iʻoa e tō ʻoe niuniu",
  "Pas de compte à créer. L'agriculteur voit seulement ces deux informations.": "ʻAita e tītauhia ia hāmani i te tītōraʻa. E ʻite noa te taʻata faʻaʻapu i teie nā parau e piti.",
  "Prénom": "Iʻoa",
  "Téléphone": "Niuniu",
  "Ex. Maeva": "Ei hiʻoraʻa : Maeva",
  "L'agriculteur confirme et vous propose un jour et une heure de retrait.": "E haʻapāpū te taʻata faʻaʻapu e e horoʻa mai i te mahana e te hora nō te raveraʻa.",
  "Moins": "Iti aʻe",
  "Plus": "Rahi aʻe",

  // Demande envoyée
  "Demande envoyée": "Ua hapono-ʻāna te aniraʻa",
  "Fermer": "Ōpani",
  "Plus tard": "A muri aʻe",
  "Prévenir par SMS": "Faʻaara nā roto i te SMS",
  "Pour qu'il la voie tout de suite, prévenez-le. Le message est déjà écrit, il suffit de l'envoyer.": "Nō te ʻite ʻoioi ʻona, a faʻaara iāna. Ua papaʻihia te parau, a hapono noa.",

  // États des demandes
  "En attente": "Te tiaʻi nei",
  "Acceptée": "Ua fāriʻihia",
  "Refusée": "Ua pātoʻihia",
  "Remise et payée": "Ua horoʻahia, ua aufauhia",
  "Annulée": "Ua faʻaorehia",
  "Pas venu": "ʻAita i tae mai",
  "Annuler ma demande": "Faʻaore i taʻu aniraʻa",
  "Itinéraire": "ʻĒʻa",
  "Pas encore de demande": "ʻAita ā e aniraʻa",
  "Choisissez un produit dans l'onglet Produits, puis la quantité voulue.": "Mā'iti i te hō'ē tauihaʻa i roto i « Tauihaʻa », i muri iho i te rahiraʻa.",
  "Vos demandes sont liées à ce téléphone. Gardez la même application pour les suivre.": "Tei roto tō ʻoe mau aniraʻa i teie niuniu. A faʻaohipa i teie ā niuniu nō te pāʻeʻe.",
  "Être prévenu": "Ia faʻaarahia",
  "Activer les alertes": "Faʻaohipa i te mau faʻaararaʻa",

  // Carte
  "Où retirer les produits": "Ihea e rave ai i te mau tauihaʻa",
  "Touchez une épingle rouge pour voir les produits de ce point de retrait.": "Pūtē i te hō'ē tāpaʻo ʻura nō te ʻite i te mau tauihaʻa o teie vāhi.",

  // Espace agriculteur
  "Espace agriculteur": "Vāhi nō te taʻata faʻaʻapu",
  "Pour acheter, aucun compte n'est nécessaire. Cet espace sert aux agriculteurs qui vendent leurs produits.": "Nō te hoʻo mai, ʻaita e tītōraʻa e tītauhia. Nō te feiā faʻaʻapu e hoʻo atu i tā rātou tauihaʻa teie vāhi.",
  "J'ai un compte": "E tītōraʻa tōʻu",
  "Je m'inscris": "E tāpaʻo vau i tōʻu iʻoa",
  "Mot de passe": "Parau huna",
  "Se connecter": "Tomo",
  "Se déconnecter": "Haere i rapae",
  "Prénom et nom": "Iʻoa e te iʻoa ʻōpū",
  "Commune": "ʻOire",
  "Île": "Motu",
  "Numéro de téléphone": "Numera niuniu",
  "E-mail (facultatif)": "E-mail (ʻaita e tītauhia)",
  "Envoyer mon inscription": "Hapono i tōʻu tāpaʻoraʻa",
  "Recevoir un lien par e-mail": "Fāriʻi i te hō'ē taʻai nā roto i te e-mail",
  "Inscription envoyée": "Ua hapono-ʻāna te tāpaʻoraʻa",
  "Mon compte": "Taʻu tītōraʻa",
  "Aller à l'espace Vendre": "Haere i te vāhi « Hoʻo atu »",

  // Mes produits
  "Ajouter un produit": "Faʻaʻī i te hō'ē tauihaʻa",
  "Nouveau produit": "Tauihaʻa ʻāpī",
  "Modifier le produit": "Taui i te tauihaʻa",
  "Nom du produit": "Iʻoa o te tauihaʻa",
  "Catégorie": "Pupu",
  "Vendu par": "Hoʻohia nā roto i te",
  "Prix par unité (F)": "Moni nō te hō'ē (F)",
  "Quantité disponible": "Rahiraʻa e vai ra",
  "Précision (facultatif)": "Haʻamāramaraʻa (ʻaita e tītauhia)",
  "Photos (3 au maximum)": "Hōhoʻa (3 i te rahi roa)",
  "Publier le produit": "Hoʻo atu i te tauihaʻa",
  "Enregistrer": "Haʻapaʻo",
  "Annuler": "Faʻaore",
  "Modifier": "Taui",
  "Retirer de la vente": "Faʻaore i te hoʻoraʻa",
  "Votre étal est vide": "Pāʻoreʻore tō ʻoe ʻamuraʻa",
  "Diminuer le stock": "Haʻaiti",
  "Augmenter le stock": "Haʻarahi",

  // Points de retrait
  "Mes points de retrait": "Taʻu mau vāhi raveraʻa",
  "Touchez la carte à l'endroit où les acheteurs viennent chercher les produits, ou utilisez votre position.": "Pūtē i te hōhoʻa fenua i te vāhi e tae mai ai te feiā hoʻo nō te rave i te tauihaʻa, aore rā a faʻaohipa i tō ʻoe vāhi.",
  "Placer le point à ma position GPS": "Tuʻu i te vāhi i tōʻu vāhi GPS",
  "Nom du point": "Iʻoa o te vāhi",
  "Enregistrer le point": "Haʻapaʻo i te vāhi",
  "Supprimer": "Faʻaore",
  "Aucun point de retrait enregistré.": "ʻAita e vāhi raveraʻa.",

  // Demandes reçues
  "Demandes reçues": "Aniraʻa i tae mai",
  "Accepter": "Fāriʻi",
  "Refuser": "Pātoʻi",
  "Appeler": "Niuniu",
  "Jour du retrait": "Mahana raveraʻa",
  "Heure": "Hora",
  "Confirmer le retrait": "Haʻapāpū i te raveraʻa",
  "J'ai vérifié le numéro, accepter": "Ua hiʻo vau i te numera, fāriʻi",
  "Bloquer ce numéro": "Ōpani i teie numera",
  "Confirmer le blocage": "Haʻapāpū i te ōpaniraʻa",
  "Débloquer": "Iriti",
  "Numéros bloqués": "Numera ōpanihia",
  "Numéro vérifié": "Numera hiʻohia",
  "Aucune demande pour le moment": "ʻAita e aniraʻa i teie nei",
  "Les demandes des acheteurs apparaîtront ici.": "E fā mai te mau aniraʻa a te feiā hoʻo i ʻō nei.",

  // Admin
  "Tableau de bord": "Papa faʻatereraʻa",
  "Inscriptions à valider": "Tāpaʻoraʻa e haʻapāpū",
  "Inscrits": "Feiā tāpaʻohia",
  "Valider": "Haʻapāpū",
  "Suspendre": "Haʻafaʻaea",
  "Réactiver": "Faʻaohipa faʻahou",
  "Mot de passe oublié": "Ua moʻe te parau huna",
  "Nommer admin": "Faʻatoroʻa ei faʻatere",
  "Retirer le rôle admin": "Iriti i te toroʻa faʻatere",
  "Confirmer": "Haʻapāpū",
  "Toutes les demandes": "Te mau aniraʻa pauroa",
  "Bloquer ce numéro partout": "Ōpani i teie numera i te mau vāhi atoa",
  "Numéros bloqués partout": "Numera ōpanihia i te mau vāhi atoa",
  "Ventes remises et payées": "Hoʻoraʻa ua oti",
  "Total des demandes terminées": "Te moni o te mau aniraʻa ua oti",
  "Produits par île": "Tauihaʻa i te motu tātaʻitahi",
  "Actif": "Ohipa",
  "À valider": "E haʻapāpū",
  "Suspendu": "Haʻafaʻaeahia",
  "Refusé": "Pātoʻihia",
  "inscriptions à valider": "tāpaʻoraʻa e haʻapāpū",
  "demandes en attente": "aniraʻa e tiaʻi ra",
  "comptes actifs": "tītōraʻa ohipa",
  "produits en vente": "tauihaʻa e hoʻohia ra",

  // Divers
  "Pas de réseau.": "ʻAita e niuniu.",
  "Partager (Reo Fenua…)": "Faʻaite (Reo Fenua…)",
  "Partager le message (Reo Fenua, Messenger…)": "Faʻaite i te parau (Reo Fenua, Messenger…)",
  "Fruits et légumes de Taha'a et Raiatea": "Maʻa hotu e maʻa tupu nō Tahaʻa e Raiātea",
  "Touchez pour passer": "Pūtē nō te haere"
};

const PATTERNS = [
  [/^(\d+) produits?$/, "$1 tauihaʻa"],
  [/^(\d+) agriculteurs?$/, "$1 taʻata faʻaʻapu"],
  [/^Envoyer la demande à (.+)$/, "Hapono i te aniraʻa iā $1"],
  [/^Demande envoyée à (.+)$/, "Ua hapono-ʻāna te aniraʻa iā $1"],
  [/^Prévenir (.+) sur WhatsApp$/, "Faʻaara iā $1 nā roto i te WhatsApp"],
  [/^Écrire à (.+)$/, "Papaʻi iā $1"],
  [/^Vendu par (.+)$/, "Hoʻo atu e $1"],
  [/^Disponible : (.+)$/, "E vai ra : $1"],
  [/^Retrait prévu à : (.+)$/, "Vāhi raveraʻa : $1"],
  [/^Retrait : (.+)$/, "Raveraʻa : $1"],
  [/^Acheteur : (.+)$/, "Taʻata hoʻo : $1"],
  [/^Téléphone : ?$/, "Niuniu : "],
  [/^Stock : ?$/, "E vai ra : "],
  [/^Historique : (.+)$/, "Aʻamu : $1"],
  [/^à (\S+) km$/, "$1 km"],
  [/^Demande envoyée à (.+)$/, "Ua hapono-ʻāna te aniraʻa iā $1"],
  [/^(.+) est en vente$/, "Te hoʻohia nei $1"],
  [/^Un son et une notification à chaque (.+), tant que l'application est ouverte ou en arrière-plan\.$/, (m, w) => "E faʻaara te niuniu ia tae mai te " + (EVT[w] || w) + ", ia vai matara noa te taʻu."],
  [/^Alertes activées : un son et une notification à chaque (.+), tant que l'application est ouverte ou en arrière-plan\.$/, (m, w) => "Ua faʻaohipahia te mau faʻaararaʻa : e faʻaara te niuniu ia tae mai te " + (EVT[w] || w) + "."],
  [/^Fruits, légumes et plantes de (.+), en direct des fa'a'apu\. Retrait sur place, paiement en espèces\.$/, "Te mau maʻa hotu, maʻa tupu e rāʻau tupu nō $1, mai te faʻaʻapu mai. E rave i ʻō, e aufau i te moni pāpie."]
];

const EVT = { "réponse de l'agriculteur": "pāhonoraʻa a te taʻata faʻaʻapu", "nouvelle demande": "aniraʻa ʻāpī", "nouvelle inscription": "tāpaʻoraʻa ʻāpī" };
let lang = "fr";
try { lang = localStorage.getItem("maa-lang") === "tah" ? "tah" : "fr"; } catch (e) {}
export const getLang = () => lang;
export function setLang(l) { lang = l; try { localStorage.setItem("maa-lang", l); } catch (e) {} document.documentElement.lang = l === "tah" ? "ty" : "fr"; }
document.documentElement.lang = lang === "tah" ? "ty" : "fr";

export function tr(s) {
  if (lang !== "tah" || !s) return s;
  const k = String(s).trim();
  if (Object.prototype.hasOwnProperty.call(TAH, k)) return String(s).replace(k, TAH[k]);
  for (const [re, out] of PATTERNS) if (re.test(k)) return String(s).replace(k, k.replace(re, out));
  // « 3 retraits, 0 absence » et autres morceaux : mots simples
  return s;
}

const ATTRS = ["placeholder", "aria-label", "title"];
export function translateDom(root) {
  if (lang !== "tah" || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentNode && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  const nodes = [];
  while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(n => { if (n.nodeValue.trim()) { const t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; } });
  root.querySelectorAll("[placeholder],[aria-label],[title]").forEach(el => ATTRS.forEach(a => { const v = el.getAttribute(a); if (v) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } }));
}
