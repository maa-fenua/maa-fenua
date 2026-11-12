// ───────────────────────────────────────────────────────────────
//  CONFIGURATION — le seul fichier à modifier
// ───────────────────────────────────────────────────────────────
// 1. Console Firebase → Paramètres du projet → Vos applications → Application Web
// 2. Copiez les valeurs de « firebaseConfig » ci-dessous.
// Tant que apiKey est vide, l'application tourne en MODE DÉMO
// (données d'exemple enregistrées seulement dans le téléphone).
//
// Ces valeurs ne sont pas des secrets : elles sont faites pour être publiques.
// La protection des données vient des règles Firestore (fichier firestore.rules).

export const firebaseConfig = {
  apiKey: "AIzaSyDX4cRUvNJ0pvzLtUISSy8LOKjzXHPI5Bg",
  authDomain: "maa-fenua.firebaseapp.com",
  projectId: "maa-fenua",
  storageBucket: "maa-fenua.firebasestorage.app",
  messagingSenderId: "13900688671",
  appId: "1:13900688671:web:52d8115fe7e5ba6cf1d42a"
};

export const APP = {
  name: "Mā'a Fenua",
  // Préfixe des collections Firestore. Il évite tout mélange avec les données
  // d'une autre application si vous réutilisez un projet Firebase existant.
  prefix: "mf_",
  // Îles proposées dans l'application.
  islands: ["Taha'a", "Raiatea"],
  // Vue de départ de la carte (entre Taha'a et Raiatea).
  mapCenter: [-16.74, -151.47],
  mapZoom: 11
};
