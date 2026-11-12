# Mā'a Fenua

Application web pour vendre les fruits et légumes des agriculteurs de Taha'a et Raiatea.
L'acheteur choisit un produit et une quantité, l'agriculteur confirme un jour et une heure, le retrait se fait sur place et le paiement en espèces.

Le nom « Mā'a Fenua » est provisoire. Pour le changer : `js/config.js` (ligne `name`), `manifest.webmanifest` et le titre dans `index.html`.

## Ce que fait l'application

| Rôle | Ce qu'il peut faire |
|---|---|
| Acheteur (sans compte) | Voir les produits par île et catégorie, voir les points de retrait sur la carte, demander une quantité en donnant son prénom et son téléphone, suivre et annuler ses demandes |
| Agriculteur | S'inscrire avec son numéro de téléphone et un mot de passe, placer ses points de retrait sur la carte ou par GPS, publier des produits (3 photos au maximum, réduites automatiquement), accepter ou refuser les demandes, fixer le jour et l'heure du retrait |
| Admin | Valider ou refuser les inscriptions, suspendre un compte, débloquer un mot de passe oublié, voir toutes les demandes |

## Alertes et messages

- **Alertes dans l'application** : un son, une vibration et une notification du téléphone pour l'agriculteur (nouvelle demande), l'acheteur (demande acceptée ou refusée) et l'admin (nouvelle inscription). Chacun touche « Activer les alertes » une fois. Les alertes arrivent tant que l'application est ouverte ou en arrière-plan. Si elle est complètement fermée, rien n'arrive : il faudrait le forfait Blaze et Cloud Functions pour de vraies notifications « push ». Sur iPhone, l'application doit être installée sur l'écran d'accueil.
- **WhatsApp et SMS** : après une demande, l'acheteur peut prévenir l'agriculteur avec un message déjà écrit. Quand l'agriculteur accepte, un bouton envoie le jour et l'heure à l'acheteur. Le numéro de l'agriculteur est donc visible des acheteurs.
- **Sans réseau** : une demande envoyée sans réseau part toute seule au retour du réseau. En attendant, l'acheteur peut prévenir par SMS ou avec « Partager », qui ouvre le menu de partage d'Android (Reo Fenua, Messenger…). Pour que Reo Fenua apparaisse dans ce menu, il doit accepter le texte partagé par les autres applications.

## Protections contre les abus

- **3 demandes en attente au maximum** par téléphone. La limite est vérifiée par les règles Firestore, pas seulement par l'application.
- **Numéro vérifié** : pour un numéro qui n'a jamais commandé, l'agriculteur doit appeler ou écrire à l'acheteur, puis toucher « J'ai vérifié le numéro, accepter ». Ensuite le numéro est marqué vérifié pour tous les agriculteurs. Un retrait réussi le vérifie aussi.
- **Historique du numéro** : l'agriculteur voit combien de fois ce numéro est venu chercher sa commande, et combien de fois il n'est pas venu.
- **Pas venu** : remet la quantité en stock et compte une absence.
- **Bloquer ce numéro** : l'agriculteur bloque un acheteur pour lui seul. L'admin peut bloquer « partout ». Le blocage vise le numéro et le téléphone utilisé. Les demandes en attente de ce numéro sont refusées. On peut débloquer à tout moment.
- Le numéro de l'acheteur n'est pas vérifié par SMS : l'agriculteur peut appeler avant d'accepter. Quelqu'un de très décidé peut contourner la limite en changeant de téléphone ou en effaçant les données du navigateur ; le blocage par numéro et l'historique rendent cela pénible.

## Mode démo

Tant que `js/config.js` n'est pas rempli, l'application tourne en **mode démo** : des données d'exemple, enregistrées seulement dans le téléphone. Dans l'onglet « Agriculteur », trois boutons permettent d'entrer comme agriculteur ou comme admin, et de remettre la démo à zéro.

Vous pouvez donc mettre le site en ligne tout de suite et le montrer, puis brancher Firebase ensuite.

Pour voir les alertes en démo : ouvrez l'application dans deux onglets, entrez comme agriculteur dans l'un et envoyez une demande à Teva M. depuis l'autre.

## Étape 1 : mettre en ligne avec GitHub Pages

1. Sur github.com, créez un dépôt **public**, par exemple `maa-fenua`.
2. Décompressez le zip. Dans le dépôt : **Add file → Upload files**, puis glissez **tout le contenu** du dossier (`index.html`, `css`, `js`, `vendor`, `icons`, etc.). `index.html` doit être à la racine du dépôt.
3. **Settings → Pages → Source : Deploy from a branch → Branch : main, dossier / (root) → Save**.
4. Après une ou deux minutes, le site est à l'adresse `https://VOTRE-NOM.github.io/maa-fenua/`.

Sur Android, ouvrez cette adresse dans Chrome, puis menu ⋮ → **Ajouter à l'écran d'accueil** : l'application s'installe comme une app normale.

## Étape 2 : brancher Firebase

### a. Projet

Dans la [console Firebase](https://console.firebase.google.com), créez un projet (ou ouvrez un projet existant), puis **Paramètres du projet → Vos applications → Ajouter une application Web**. Copiez les valeurs de `firebaseConfig` dans `js/config.js`.

Ces valeurs ne sont pas des secrets, elles peuvent être publiques sur GitHub. La sécurité vient des règles Firestore.

### b. Authentication

**Authentication → Sign-in method**, activez :

- **Adresse e-mail/Mot de passe**
- **Anonyme** (pour les acheteurs, qui n'ont pas de compte)

Si une erreur « unauthorized-domain » apparaît un jour, ajoutez `VOTRE-NOM.github.io` dans **Authentication → Settings → Domaines autorisés**.

### c. Firestore

**Firestore Database → Créer une base de données** (mode production).

Puis onglet **Règles** : collez le contenu de `firestore.rules` et publiez. À chaque nouvelle version de l'application, recollez ce fichier : il change quand des fonctions sont ajoutées.

> **Si vous réutilisez un projet Firebase qui a déjà une autre application**, ne remplacez pas vos règles actuelles : vous casseriez l'autre application. Copiez seulement les fonctions et les blocs `match /mf_...` à l'intérieur de votre bloc `match /databases/{database}/documents { ... }` existant. Toutes les collections de cette application commencent par `mf_`, elles ne se mélangent donc pas avec les vôtres.

### d. Créer l'admin

1. Dans l'application, onglet **Agriculteur → Je m'inscris**. Pour l'admin, **remplissez la case e-mail** : c'est ce qui permet de récupérer le mot de passe par e-mail.
2. Dans la console Firebase : **Firestore → mf_users →** le document de ce compte. Changez `role` en `admin` et `status` en `ok`.
3. Rechargez l'application : un bouton **Admin** apparaît en haut.

Conseil : créez **deux admins** (vous et votre ami). Si l'un oublie son mot de passe, l'autre peut le débloquer dans l'application.

## Mots de passe oubliés

- **Agriculteur inscrit avec son numéro seulement** : il appelle l'admin. L'admin ouvre **Admin → Agriculteurs** et touche **Mot de passe oublié** sur sa ligne. L'agriculteur se réinscrit avec le même numéro et un nouveau mot de passe. L'admin valide : ses produits, points de retrait et demandes sont rattachés au nouveau compte.
- **Compte créé avec un e-mail** : sur l'écran de connexion, écrire l'e-mail puis **Recevoir un lien par e-mail**.
- **En dernier recours** : la console Firebase (Authentication → Users) permet de supprimer un compte.

Sans e-mail, l'identifiant technique du compte est fabriqué à partir du numéro (`87123456@maafenua.example`). Aucun message n'est jamais envoyé à cette adresse.

## Photos

Les photos sont réduites dans le téléphone (1000 pixels au plus, JPEG) avant l'envoi, puis enregistrées dans Firestore. L'application n'utilise pas Cloud Storage, elle fonctionne donc avec le forfait gratuit Spark, sans carte bancaire.

## Fichiers

| Fichier | Rôle |
|---|---|
| `js/config.js` | **Le seul fichier à modifier** : clés Firebase, nom, îles |
| `index.html`, `css/style.css` | Page et apparence |
| `js/app.js` | Écrans et actions |
| `js/store-firebase.js` | Lecture et écriture dans Firebase |
| `js/store-local.js` | Mode démo |
| `firestore.rules` | Règles de sécurité à coller dans la console Firebase |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installation sur le téléphone |
| `vendor/` | Bibliothèque de carte Leaflet (carte OpenStreetMap) |

## Après une modification

Si une ancienne version reste affichée sur un téléphone après une mise à jour, changez `maa-fenua-v1` en `maa-fenua-v2` dans `sw.js`.

## Limites connues

- **Non testé avec un vrai projet Firebase.** Le mode démo a été testé de bout en bout dans un navigateur. Le code Firebase a été vérifié avec le vrai SDK (chargement et appels), mais pas contre une base réelle. Les règles `firestore.rules` n'ont pas pu être testées : si la console Firebase signale une erreur en les publiant, ou si une action affiche « Action non autorisée », c'est probablement là. Faites un essai complet (inscription, validation, produit, demande, acceptation, blocage) avant de donner l'application aux agriculteurs. L'onglet Règles de la console a un « Terrain de jeu des règles » pour simuler une lecture ou une écriture.
- Alertes seulement quand l'application est ouverte ou en arrière-plan (voir plus haut).
- Les demandes d'un acheteur sont liées à son téléphone. S'il efface les données du navigateur, il ne les voit plus (l'agriculteur, lui, les garde).
- L'île d'un point de retrait est proposée automatiquement selon sa position, et reste modifiable.
- La carte utilise les serveurs publics d'OpenStreetMap, prévus pour un usage modéré.
