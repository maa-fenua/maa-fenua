# Audit de sécurité et de code — Mā'a Fenua

Date : 12 novembre 2026. Périmètre : `index.html`, `js/*.js`, `sw.js`, `firestore.rules`.

**Limite de cet audit :** il a été fait par relecture du code et par tests du mode démo dans un navigateur. Les règles Firestore n'ont pas pu être exécutées (l'émulateur Firebase n'était pas téléchargeable). Elles se publient sans erreur d'écriture, mais leur comportement réel reste à vérifier par un essai complet.

## 1. Corrigé dans cette version

| # | Gravité | Problème | Correction |
|---|---|---|---|
| 1 | Haute | Injection de code (XSS) : un agriculteur validé pouvait, en écrivant dans Firebase sans passer par l'application, mettre du texte à la place du stock ; ce texte était affiché sans protection chez tous les acheteurs. | `qtyLabel` force un nombre ; les règles exigent des nombres pour prix et stock. |
| 2 | Haute | Même type d'injection par une photo ou une position trafiquée. | `safeImg` n'accepte que de vraies images ; `mapsLink` n'accepte que des nombres. |
| 3 | Moyenne | Une position non numérique faisait planter la carte pour tout le monde. | Les épingles invalides sont ignorées ; les règles exigent `lat` et `lon` numériques. |
| 4 | Moyenne | Un acheteur pouvait créer une demande avec un faux prix, ou pour un produit d'un autre agriculteur. | Les règles vérifient que le produit existe, appartient à l'agriculteur visé et que le prix est le bon. Le total est toujours recalculé (quantité × prix). |
| 5 | Moyenne | Un agriculteur pouvait accepter une demande que l'acheteur venait d'annuler. | L'acceptation vérifie que la demande est encore « en attente ». |
| 6 | Moyenne | Bug de date : l'après-midi à Tahiti, le jour de retrait proposé était décalé d'un jour, et « aujourd'hui » n'était plus sélectionnable. | Dates calculées en heure locale. |
| 7 | Basse | N'importe qui pouvait lister les numéros ayant demandé un nouveau mot de passe (`mf_resets`). | Lecture d'un seul document à la fois (`get`), plus de liste. |
| 8 | Basse | Textes sans limite de longueur (nom, commune, nom de produit, prénom de l'acheteur). | Limites dans les règles (40 à 80 caractères). |
| 9 | Défense | Aucune politique de sécurité du contenu. | En-tête CSP dans `index.html` : seuls les scripts de l'application et de Firebase peuvent s'exécuter. |

**À faire de votre côté : republier `firestore.rules`** (elles ont changé), puis refaire un essai complet.

## 2. Risques qui restent

| # | Gravité | Risque | Que faire |
|---|---|---|---|
| A | Haute | Règles Firestore jamais testées en conditions réelles. | Essai complet : inscription, validation, point de retrait, produit avec photo, demande, acceptation, « pas venu », blocage, mot de passe oublié. |
| B | Moyenne | Usurpation par réinscription : quelqu'un peut s'inscrire avec le numéro d'un agriculteur ; si l'admin valide « Même numéro que… » sans appeler, il récupère ses produits (et son rôle admin s'il en avait un). | L'admin appelle toujours le numéro connu avant de valider. Amélioration possible : confirmation par code SMS (payant). |
| C | Moyenne | Un agriculteur validé peut fausser l'historique d'un numéro d'acheteur (ajouter des retraits ou des absences, le marquer « vérifié »). | Ne valider que des agriculteurs connus. Amélioration : lier chaque ajout à une demande réelle (Cloud Functions, forfait Blaze). |
| D | Moyenne | Spam : la limite de 3 demandes et le blocage se contournent en changeant d'appareil ou de numéro. Des robots peuvent aussi épuiser le quota gratuit (l'application s'arrête alors jusqu'au lendemain, sans frais). | Activer **Firebase App Check** (gratuit) si cela arrive. |
| E | Moyenne | Compte admin ou compte Google de la console compromis. | Mot de passe long et unique, e-mail sur le compte admin, validation en deux étapes sur le compte Google. |
| F | Basse | Les numéros des agriculteurs sont publics (voulu, pour WhatsApp). Un admin voit les numéros de tous les acheteurs. | Le dire aux agriculteurs ; ne nommer admin que des personnes de confiance. |
| G | Basse | Pas de sauvegarde automatique (forfait gratuit). | Ajouter un bouton d'export pour l'admin, ou exporter de temps en temps depuis la console. |
| H | Basse | Un agriculteur peut afficher le nom d'un autre sur ses produits (le nom n'est pas vérifié par les règles). | Amélioration : vérifier dans les règles que `farmerName` est celui du profil. |
| I | Info | Le SDK Firebase est chargé depuis `gstatic.com` (Google) et la carte depuis OpenStreetMap : l'application dépend de ces services. | Acceptable. |

## 3. Qualité du code

Points solides : un seul fichier de configuration, deux couches de stockage interchangeables (démo et Firebase) avec les mêmes fonctions, tout le texte affiché passe par `esc`, pas de dépendance à installer, fonctionnement hors ligne.

Points faibles, sans urgence :

- `js/app.js` fait environ 800 lignes dans un seul fichier, avec du HTML construit par concaténation. C'est la principale source de risques d'injection : chaque nouvelle donnée affichée doit passer par `esc`. À découper par écran si l'application grandit.
- Pas de tests automatiques dans le dépôt. Les tests ont été faits à la main avec un navigateur piloté.
- Tout le catalogue et toutes les demandes sont chargés d'un coup. Avec quelques centaines de produits ou de visites par jour, le quota gratuit de lectures (50 000 par jour) peut être atteint. À prévoir : pagination, et limiter l'écran admin aux demandes récentes.
- Les miniatures des photos sont stockées dans chaque produit : pratique, mais chaque lecture du catalogue est plus lourde.
- Les erreurs de lecture Firebase sont masquées (liste vide affichée). Un message « chargement impossible » serait plus clair.
- La traduction en reo tahiti remplace le texte après l'affichage : simple, mais une phrase modifiée en français perd sa traduction sans prévenir.
- Si un acheteur s'inscrit ensuite comme agriculteur sur le même téléphone, il ne voit plus ses anciennes demandes d'acheteur.

## 4. Améliorations proposées, par ordre d'utilité

1. Essai réel complet et correction des règles si besoin.
2. App Check contre les robots.
3. Bouton d'export des données pour l'admin (sauvegarde).
4. Relecture de la traduction en reo tahiti.
5. Page « Confidentialité » courte : quelles données sont gardées (prénom, numéro, demandes), qui les voit, comment demander leur suppression.
6. Bouton « Signaler un produit » pour les acheteurs.
7. Pagination du catalogue et de l'écran admin.
8. Notifications quand l'application est fermée, et vérification du numéro par SMS (forfait Blaze, payant à l'usage).
