import { firebaseConfig, APP } from "./config.js";
import { tr, translateDom, getLang, setLang } from "./i18n.js";

/* ───────── État ───────── */
const configured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);
let store = null;
const NO = Symbol("no-render");
const state = {
  ready: false, loadError: "", session: null, mode: "buy",
  tab: { buy: "produits", sell: "mesproduits", admin: "resume" },
  island: "Toutes", cat: "Tous", q: "", pos: null,
  detail: null, qty: 1, photo: 0, photos: null, pin: null,
  form: null, accepting: null, slot: { date: "", time: "07:00" }, newPoint: null, pointName: "", pointIsland: "",
  authTab: "login", authf: { phone: "", password: "", name: "", commune: "", island: APP.islands[0], email: "", login: "" },
  buyerName: "", buyerPhone: "", busy: false, mapView: {}, sent: null, stats: {}, blocking: null, blocks: [], allBlocks: [], online: navigator.onLine !== false,
  catalogue: [], points: [], myProducts: [], myOrders: [], farmOrders: [], allOrders: [], users: []
};
try { state.buyerName = localStorage.getItem("maa-name") || ""; state.buyerPhone = localStorage.getItem("maa-phone") || ""; } catch (e) {}
try { state.pos = JSON.parse(sessionStorage.getItem("maa-pos")); } catch (e) {}

const UNITS = { kg: ["kg", "kg"], piece: ["pièce", "pièces"], regime: ["régime", "régimes"], paquet: ["paquet", "paquets"], sac: ["sac", "sacs"], pot: ["pot", "pots"], plant: ["plant", "plants"] };
const CATS = ["Fruits", "Légumes", "Vanille et épices", "Plantes"];
const ST = { pending: "En attente", accepted: "Acceptée", refused: "Refusée", done: "Remise et payée", cancelled: "Annulée", noshow: "Pas venu" };
const UST = { pending: "À valider", ok: "Actif", suspended: "Suspendu", refused: "Refusé" };

/* ───────── Outils ───────── */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ") + " F";
// Number(...) : une quantité trafiquée (texte au lieu d'un nombre) ne peut pas injecter de code.
const qtyLabel = (q, u) => { q = Number(q) || 0; return (Number.isInteger(q) ? q : q.toLocaleString("fr-FR")) + " " + (UNITS[u] || UNITS.piece)[q > 1 ? 1 : 0]; };
// Date locale AAAA-MM-JJ (toISOString donnerait la date UTC, en avance d'un jour l'après-midi à Tahiti).
const localDate = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const unitName = u => (UNITS[u] || UNITS.piece)[0];
const step = u => u === "kg" ? 0.5 : 1;
const ts = x => x == null ? Infinity : typeof x === "number" ? x : (x.seconds || 0) * 1000;
const newest = arr => arr.slice().sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
// Numéros de Polynésie : 8 chiffres. On enlève l'indicatif +689 / 00689 s'il est tapé.
const digits = s => { let d = String(s || "").replace(/\D/g, ""); if (d.length === 13 && d.startsWith("00689")) d = d.slice(5); else if (d.length === 11 && d.startsWith("689")) d = d.slice(3); return d; };
const validPhone = s => /^\d{8}$/.test(digits(s));
const PHONE_MSG = "Le numéro doit avoir 8 chiffres, par exemple 87 12 34 56.";
const waLink = (phone, msg) => "https://wa.me/689" + digits(phone) + "?text=" + encodeURIComponent(msg);
const smsLink = (phone, msg) => "sms:+689" + digits(phone) + "?body=" + encodeURIComponent(msg);
const totalOf = o => (Number(o.qty) || 0) * (Number(o.price) || 0);
const prettyPhone = s => { const d = digits(s); return d.length === 8 ? d.replace(/(\d\d)(?=\d)/g, "$1 ") : String(s || ""); };
const profile = () => state.session && state.session.profile;
const isFarmerOk = () => !!(profile() && profile().status === "ok");
const isAdmin = () => !!(profile() && profile().role === "admin" && profile().status === "ok");
const pointById = id => state.points.find(p => p.id === id);
const allProducts = () => { const m = new Map(); state.catalogue.concat(state.myProducts).forEach(p => m.set(p.id, p)); return m; };

function km(a, b) {
  const R = 6371, r = x => x * Math.PI / 180, dl = r(b.lat - a.lat), dn = r(b.lon - a.lon);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function distLabel(pt) {
  if (!state.pos || pt.lat == null) return "";
  const d = km(state.pos, pt);
  return "à " + (d < 10 ? d.toFixed(1).replace(".", ",") : Math.round(d)) + " km";
}
const islandOf = lat => lat > -16.70 ? APP.islands[0] : (APP.islands[1] || APP.islands[0]);
// Sécurité : une donnée modifiée hors de l'application ne doit jamais pouvoir injecter du code dans la page.
const mapsLink = o => { const a = Number(o.lat), b = Number(o.lon); return isFinite(a) && isFinite(b) ? "https://www.google.com/maps/dir/?api=1&destination=" + a + "," + b : "#"; };
const safeImg = u => typeof u === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u) ? u : "";
function slotLabel(date, time) {
  const d = new Date(date + "T" + (time || "07:00"));
  if (isNaN(d)) return "";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + " à " + (time || "07:00").replace(/^0/, "").replace(":", "h");
}
function toast(msg) {
  const t = $("#toast");
  t.innerHTML = '<div class="toast">' + esc(tr(msg)) + "</div>";
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.innerHTML = ""; }, 3600);
}
function fail(e) {
  console.error(e);
  const c = (e && e.code) || "";
  const M = {
    "auth/invalid-credential": "Numéro ou mot de passe incorrect.",
    "auth/wrong-password": "Numéro ou mot de passe incorrect.",
    "auth/user-not-found": "Numéro ou mot de passe incorrect.",
    "auth/invalid-email": "Numéro de téléphone invalide.",
    "auth/email-already-in-use": "Ce numéro a déjà un compte. Connectez-vous, ou demandez à l'admin si le mot de passe est oublié.",
    "auth/weak-password": "Mot de passe trop court : 6 caractères au minimum.",
    "auth/network-request-failed": "Pas de connexion. Réessayez quand le réseau revient.",
    "auth/too-many-requests": "Trop d'essais. Patientez quelques minutes.",
    "auth/operation-not-allowed": "Cette méthode de connexion n'est pas activée dans la console Firebase.",
    "auth/admin-restricted-operation": "La connexion anonyme n'est pas activée dans la console Firebase.",
    "permission-denied": "Action non autorisée pour ce compte.",
    "order-not-pending": "Cette demande n'est plus en attente. L'acheteur l'a peut-être annulée.",
    "unavailable": "Pas de connexion. Réessayez quand le réseau revient."
  };
  toast(M[c] || (e && e.userMessage) || "Une erreur est survenue" + (c ? " (" + c + ")" : "") + ". Réessayez.");
}
const userError = m => Object.assign(new Error(m), { userMessage: m });

/* ───────── Images ───────── */
function kindOf(name) {
  const n = String(name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const K = [["ananas", "ananas"], ["pasteque", "pasteque"], ["melon", "pasteque"], ["banan", "banane"], ["fe'i", "banane"], ["fei", "banane"], ["taro", "taro"], ["patate", "taro"], ["igname", "taro"], ["manioc", "taro"],
    ["vanille", "vanille"], ["citron", "citron"], ["lime", "citron"], ["tomate", "tomate"], ["papaye", "papaye"], ["mangue", "papaye"], ["concombre", "concombre"], ["courgette", "concombre"], ["aubergine", "concombre"],
    ["uru", "uru"], ["pota", "pota"], ["salade", "pota"], ["chou", "pota"], ["laitue", "pota"], ["gingembre", "gingembre"], ["curcuma", "gingembre"],
    ["coco", "coco"], ["corossol", "corossol"], ["tapotapo", "corossol"], ["patate", "patate"], ["umara", "patate"], ["'umara", "patate"], ["pitaya", "pitaya"], ["dragon", "pitaya"], ["ramboutan", "ramboutan"], ["litchi", "ramboutan"], ["passion", "passion"], ["avocat", "avocat"], ["pamplemousse", "agrume"], ["orange", "agrume"], ["mandarine", "agrume"],
    ["tiare", "plante"], ["plant", "plante"], ["fleur", "plante"], ["bouture", "plante"], ["orchidee", "plante"], ["monstera", "plante"], ["hibiscus", "plante"], ["pot", "plante"], ["arbre", "plante"], ["noni", "plante"], ["miri", "plante"], ["basilic", "plante"]];
  for (const k of K) if (n.includes(k[0])) return k[1];
  return p_cat === "Plantes" ? "plante" : "autre";
}
let p_cat = "";
function art(p, src) {
  const img = safeImg(src || p.thumb);
  if (img) return '<img alt="" loading="lazy" src="' + img + '">';
  p_cat = p.cat || "";
  const kind = kindOf(p.name || p.productName);
  const bg = { ananas: "#fbe9b0", pasteque: "#d8efd0", banane: "#e3f1c9", taro: "#e6ddd0", vanille: "#f1e3c6", citron: "#e2f3c2", tomate: "#fbdcd2", papaye: "#fde3c0", concombre: "#d6efd9", uru: "#dcefc4", pota: "#d9f0d6", gingembre: "#f3e6cc", plante: "#e4f1df", coco: "#e9dfd0", corossol: "#e2efd2", patate: "#f3e1d8", pitaya: "#fbdfe9", ramboutan: "#fbdcd2", passion: "#f0dfea", avocat: "#e2efd2", agrume: "#fdeec0", autre: "#d9f0ec" }[kind];
  const g = {
    ananas: '<path d="M60 14l6 14 10-10-3 15 13-5-10 13H44L34 28l13 5-3-15 10 10z" fill="#4f9a2e"/><ellipse cx="60" cy="58" rx="19" ry="24" fill="#e9a920"/><path d="M45 46l30 26M45 60l22 20M53 36l23 22M75 46L45 72M75 60L53 80M67 36L44 58" stroke="#b97a0c" stroke-width="1.6"/>',
    pasteque: '<path d="M20 44a40 40 0 0 0 80 0z" fill="#2f7d2a"/><path d="M26 44a34 34 0 0 0 68 0z" fill="#f4f7e4"/><path d="M30 44a30 30 0 0 0 60 0z" fill="#e2433c"/><g fill="#3a1d16"><ellipse cx="46" cy="54" rx="2" ry="3"/><ellipse cx="60" cy="60" rx="2" ry="3"/><ellipse cx="74" cy="54" rx="2" ry="3"/><ellipse cx="60" cy="49" rx="2" ry="3"/></g>',
    banane: '<g fill="none" stroke-linecap="round"><path d="M34 26c2 30 22 50 54 46" stroke="#d9a514" stroke-width="13"/><path d="M48 22c0 28 16 44 42 44" stroke="#f1c232" stroke-width="13"/><path d="M62 20c-2 22 10 36 30 38" stroke="#f7d75a" stroke-width="12"/></g><path d="M30 20h36v8H30z" fill="#6b4b1c"/>',
    taro: '<ellipse cx="60" cy="62" rx="26" ry="19" fill="#8a6748"/><path d="M40 58h40M38 66h44M44 73h32" stroke="#6d4f36" stroke-width="2"/><path d="M60 44c-12-18-2-30 10-32 6 12 2 24-10 32z" fill="#4f9a2e"/><path d="M60 44c2-10 5-18 10-32" stroke="#2f6d18" stroke-width="1.5" fill="none"/>',
    vanille: '<g fill="none" stroke="#3b2414" stroke-width="5" stroke-linecap="round"><path d="M34 76c8-24 22-44 44-58"/><path d="M46 80c8-22 20-40 40-54"/><path d="M58 82c6-18 16-32 32-44"/></g><path d="M30 62c10 2 24 6 36 14" stroke="#c9a253" stroke-width="3" fill="none"/>',
    citron: '<circle cx="46" cy="52" r="20" fill="#8cc63f"/><circle cx="74" cy="56" r="18" fill="#a5d24f"/><circle cx="74" cy="56" r="12" fill="#d9ef9f"/><path d="M74 44v24M62 56h24M65.5 47.5l17 17M82.5 47.5l-17 17" stroke="#a5d24f" stroke-width="1.5"/>',
    tomate: '<circle cx="46" cy="56" r="20" fill="#d9372a"/><circle cx="76" cy="58" r="17" fill="#e8553d"/><path d="M46 38l4 6 7-2-4 6 5 5-7 1-5 6-5-6-7-1 5-5-4-6 7 2z" fill="#3f8a25"/>',
    papaye: '<path d="M60 14c18 0 28 22 28 40S76 84 60 84 32 72 32 54s10-40 28-40z" fill="#f08a24"/><path d="M60 26c11 0 18 15 18 28S70 74 60 74 42 67 42 54s7-28 18-28z" fill="#f9b65a"/><g fill="#2a1a12"><circle cx="56" cy="46" r="2.6"/><circle cx="64" cy="50" r="2.6"/><circle cx="57" cy="56" r="2.6"/><circle cx="64" cy="62" r="2.6"/><circle cx="58" cy="66" r="2.6"/></g>',
    concombre: '<g stroke-linecap="round" fill="none"><path d="M28 66l56-34" stroke="#2f7d2a" stroke-width="18"/><path d="M36 76l56-30" stroke="#4f9a2e" stroke-width="16"/><path d="M40 72l46-25" stroke="#7fc25a" stroke-width="2" stroke-dasharray="3 6"/></g>',
    uru: '<path d="M60 12v10" stroke="#5a4326" stroke-width="4"/><circle cx="60" cy="54" r="30" fill="#7fb23a"/><g fill="#5f9226"><circle cx="48" cy="42" r="2.5"/><circle cx="60" cy="38" r="2.5"/><circle cx="72" cy="42" r="2.5"/><circle cx="42" cy="54" r="2.5"/><circle cx="54" cy="50" r="2.5"/><circle cx="66" cy="50" r="2.5"/><circle cx="78" cy="54" r="2.5"/><circle cx="48" cy="64" r="2.5"/><circle cx="60" cy="62" r="2.5"/><circle cx="72" cy="64" r="2.5"/><circle cx="60" cy="74" r="2.5"/></g>',
    pota: '<path d="M60 84c-4-20-22-22-22-44 0-12 8-22 22-26 14 4 22 14 22 26 0 22-18 24-22 44z" fill="#4f9a2e"/><path d="M60 84c-2-18-12-22-12-40 0-10 5-18 12-22 7 4 12 12 12 22 0 18-10 22-12 40z" fill="#8fce5c"/><path d="M60 82V30" stroke="#f1f7e6" stroke-width="5" stroke-linecap="round"/>',
    gingembre: '<g fill="#d9b06b" stroke="#b08845" stroke-width="2"><ellipse cx="50" cy="56" rx="20" ry="12"/><ellipse cx="74" cy="48" rx="14" ry="10"/><ellipse cx="72" cy="68" rx="12" ry="8"/><ellipse cx="36" cy="42" rx="10" ry="7"/></g>',
    corossol: '<path d="M60 18c18 4 28 20 26 38S72 86 58 84 30 72 32 52s10-38 28-34z" fill="#8cc63f"/><g fill="none" stroke="#5f9226" stroke-width="2.200" stroke-linecap="round"><path d="M46 32c2-2 4-2 5 1M62 28c2-2 4-2 5 1M76 38c2-2 4-1 4 2M40 48c2-2 4-2 5 1M56 44c2-2 4-2 5 1M72 52c2-2 4-1 4 2M44 64c2-2 4-2 5 1M60 62c2-2 4-2 5 1M74 68c2-2 3-1 4 2M52 76c2-2 4-2 5 1"/></g><path d="M58 18c0-6 2-10 6-12" stroke="#5a4326" stroke-width="3" stroke-linecap="round" fill="none"/>',
    patate: '<g transform="rotate(-22 60 50)"><path d="M24 52c0-12 14-20 36-20s36 8 36 20-14 20-36 20-36-8-36-20z" fill="#c9715a"/><path d="M38 44l2 2M58 40l2 2M76 46l2 2M48 58l2 2M70 60l2 2" stroke="#8a4a3a" stroke-width="2.500" stroke-linecap="round"/><path d="M96 52l10-2" stroke="#8a4a3a" stroke-width="2" stroke-linecap="round"/></g><g transform="rotate(14 60 70)"><path d="M36 74c0-8 10-13 24-13s24 5 24 13-10 13-24 13-24-5-24-13z" fill="#a67c6a"/></g>',
    coco: '<circle cx="60" cy="52" r="30" fill="#8a6748"/><path d="M38 40c14 8 30 8 44 0M34 54c16 8 36 8 52 0M40 68c12 6 28 6 40 0" stroke="#6d4f36" stroke-width="2.500" fill="none"/><g fill="#4a3320"><circle cx="52" cy="32" r="3"/><circle cx="66" cy="32" r="3"/><circle cx="59" cy="42" r="3"/></g>',
    pitaya: '<ellipse cx="60" cy="52" rx="24" ry="31" fill="#e2457a"/><g fill="#7fc25a"><path d="M46 30l-9-12 14 5zM66 24l5-14 7 14zM82 44l14-5-9 12zM38 56l-14 2 12 7zM80 68l12 7-14 2z"/></g><path d="M50 42l9 7M66 38l7 9M52 60l9 7M70 58l6 7" stroke="#c22f62" stroke-width="2.500" stroke-linecap="round"/>',
    ramboutan: '<g fill="#d9372a" stroke="#a8241a" stroke-width="5" stroke-dasharray="2 4"><circle cx="44" cy="54" r="17"/><circle cx="76" cy="46" r="16"/><circle cx="66" cy="70" r="14"/></g>',
    passion: '<circle cx="44" cy="52" r="21" fill="#7a2f5a"/><circle cx="44" cy="52" r="15" fill="#f4c93a"/><circle cx="78" cy="58" r="19" fill="#7a2f5a"/><circle cx="78" cy="58" r="13" fill="#f4c93a"/><g fill="#3a2418"><circle cx="39" cy="48" r="2.200"/><circle cx="48" cy="47" r="2.200"/><circle cx="44" cy="56" r="2.200"/><circle cx="74" cy="55" r="2"/><circle cx="82" cy="58" r="2"/><circle cx="77" cy="63" r="2"/></g>',
    avocat: '<path d="M60 16c14 0 24 22 24 40S74 84 60 84 36 74 36 56s10-40 24-40z" fill="#3f6b2a"/><path d="M60 24c10 0 17 18 17 32S70 77 60 77 43 70 43 56s7-32 17-32z" fill="#cfe08a"/><circle cx="60" cy="58" r="11" fill="#8a5a34"/>',
    agrume: '<circle cx="48" cy="54" r="24" fill="#f4c93a"/><circle cx="40" cy="46" r="6" fill="#fbe08a"/><circle cx="80" cy="60" r="18" fill="#f2a51e"/><path d="M48 30c4-6 10-8 16-6-4 6-10 8-16 6z" fill="#4f9a2e"/>',
    plante: '<path d="M44 66h32l-4 22H48z" fill="#c8693c"/><path d="M42 62h36v6H42z" fill="#a9532c"/><path d="M60 62V36" stroke="#3f7d22" stroke-width="3"/><path d="M60 50c-14-2-20-10-20-20 12 0 19 8 20 20z" fill="#4f9a2e"/><path d="M60 44c12-2 18-10 18-20-11 0-17 8-18 20z" fill="#6bb43f"/><g transform="translate(60 26)"><circle r="3" fill="#f2b632"/><g fill="#fff" stroke="#e8e1c8" stroke-width=".8"><ellipse cx="0" cy="-7" rx="3.2" ry="6"/><ellipse cx="0" cy="-7" rx="3.2" ry="6" transform="rotate(72)"/><ellipse cx="0" cy="-7" rx="3.2" ry="6" transform="rotate(144)"/><ellipse cx="0" cy="-7" rx="3.2" ry="6" transform="rotate(216)"/><ellipse cx="0" cy="-7" rx="3.2" ry="6" transform="rotate(288)"/></g><circle r="2.4" fill="#f2b632"/></g>',
    autre: '<path d="M60 80c0-26 4-38 24-50-4 22-8 36-24 50zm0 0c0-18-4-30-22-38 0 18 6 30 22 38z" fill="#0f8a86"/>'
  }[kind];
  return '<svg viewBox="0 0 120 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="120" height="96" fill="' + bg + '"/>' + g + "</svg>";
}

/* Réduit une photo et la convertit en JPEG léger, quel que soit le format de départ. */
function shrink(img, max, q) {
  const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", q);
}
function compress(file) {
  return new Promise(res => {
    let url;
    try { url = URL.createObjectURL(file); } catch (e) { res(null); return; }
    const im = new Image();
    im.onload = () => {
      try {
        let q = 0.78, out = shrink(im, 1000, q);
        while (out.length > 600000 && q > 0.4) { q -= 0.12; out = shrink(im, 1000, q); } // reste sous la limite Firestore de 1 Mo
        const thumb = shrink(im, 360, 0.7);
        URL.revokeObjectURL(url);
        res({ url: out, thumb });
      } catch (e) { res(null); }
    };
    im.onerror = () => res(null);
    im.src = url;
  });
}

/* ───────── Illustrations ───────── */
const BASKET_ART = `<svg viewBox="0 0 150 110" aria-hidden="true"><ellipse cx="75" cy="102" rx="58" ry="6" fill="#0c3440" opacity=".08"/>
<path d="M24 58h102l-10 42H34z" fill="#d9b07a"/><path d="M20 56h110" stroke="#b5793d" stroke-width="6" stroke-linecap="round"/><path d="M32 72h86M36 86h78" stroke="#b5793d" stroke-width="2" opacity=".6"/>
<path d="M40 56c0-26 70-26 70 0" fill="none" stroke="#b5793d" stroke-width="4"/>
<path d="M58 54c-4-14 0-26 10-32 2 12-2 24-10 32z" fill="#7fc25a" opacity=".85"/><path d="M84 54c6-12 16-18 28-16-6 10-16 16-28 16z" fill="#4f9a2e" opacity=".85"/>
<g transform="translate(75 30)"><g fill="#fff" stroke="#e8e1c8" stroke-width=".8"><ellipse cx="0" cy="-7" rx="3.4" ry="6.4"/><ellipse cx="0" cy="-7" rx="3.4" ry="6.4" transform="rotate(72)"/><ellipse cx="0" cy="-7" rx="3.4" ry="6.4" transform="rotate(144)"/><ellipse cx="0" cy="-7" rx="3.4" ry="6.4" transform="rotate(216)"/><ellipse cx="0" cy="-7" rx="3.4" ry="6.4" transform="rotate(288)"/></g><circle r="2.6" fill="#f2b632"/></g></svg>`;
// Raccourcis « De saison » avec les photos de Brian : touchez une vignette pour chercher ce produit.
const SEASON = [["ananas", "Ananas", "ananas"], ["papaye", "Papaye", "papaye"], ["coco", "Coco", "coco"], ["patate", "Patates douces", "patate"], ["corossol", "Corossol", "corossol"], ["plant", "Plants", "@Plantes"]];
function seasonRow() {
  return '<div class="season"><h3>De saison au fenua</h3><div class="season-row">' + SEASON.map(s => {
    const on = s[2][0] === "@" ? state.cat === s[2].slice(1) : state.q.trim().toLowerCase() === s[2];
    return '<button class="stile" data-action="season" data-v="' + esc(s[2]) + '" aria-pressed="' + on + '"><img alt="" loading="lazy" src="icons/photos/' + s[0] + '.jpg"><span>' + esc(s[1]) + "</span></button>";
  }).join("") + "</div></div>";
}
const emptyArt = (title, text) => '<div class="emptyart">' + BASKET_ART + "<strong>" + esc(title) + "</strong><span>" + esc(text) + "</span></div>";

/* ───────── Cartes (Leaflet + OpenStreetMap) ───────── */
const maps = {};
function pinIcon(label, sel) {
  const fill = sel ? "#f2b632" : "#d9482f", ink = sel ? "#3a2a00" : "#fff";
  return L.divIcon({
    className: "pinicon", iconSize: [30, 40], iconAnchor: [15, 39],
    html: '<svg width="30" height="40" viewBox="-15 -39 30 40"><path d="M0 0C-9 -12 -13 -17 -13 -24a13 13 0 0 1 26 0c0 7 -4 12 -13 24z" fill="' + fill + '" stroke="#fff" stroke-width="2"/>' +
      (label != null ? '<text y="-20" text-anchor="middle" font-size="11" font-weight="700" font-family="sans-serif" fill="' + ink + '">' + esc(label) + "</text>" : '<circle cy="-24" r="4.5" fill="#fff"/>') + "</svg>"
  });
}
function makeMap(id, o) {
  const el = document.getElementById(id);
  if (maps[id]) { try { maps[id].remove(); } catch (e) {} delete maps[id]; }
  if (!el) return;
  if (!window.L) { el.innerHTML = '<p class="nomap">Carte indisponible pour le moment.</p>'; return; }
  const fixed = o.fixed;
  const map = L.map(el, { zoomControl: !fixed, dragging: !fixed, scrollWheelZoom: false, doubleClickZoom: !fixed, touchZoom: !fixed, boxZoom: false, keyboard: !fixed, attributionControl: true });
  maps[id] = map;
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  const pins = (o.pins || []).filter(p => typeof p.lat === "number" && typeof p.lon === "number" && isFinite(p.lat) && isFinite(p.lon));
  pins.forEach(p => {
    const m = L.marker([p.lat, p.lon], { icon: pinIcon(p.label, p.sel), title: p.name || "", keyboard: !!p.onClick }).addTo(map);
    if (p.onClick) m.on("click", p.onClick);
  });
  if (o.temp) L.circleMarker([o.temp.lat, o.temp.lon], { radius: 9, color: "#fff", weight: 2, fillColor: "#f2b632", fillOpacity: 1 }).addTo(map);
  if (o.here && state.pos) L.circleMarker([state.pos.lat, state.pos.lon], { radius: 7, color: "#fff", weight: 2, fillColor: "#1e6fe0", fillOpacity: 1 }).addTo(map);
  const v = state.mapView[id];
  if (o.center) map.setView(o.center, o.zoom || 14);
  else if (v) map.setView(v.c, v.z);
  else if (pins.length > 1) map.fitBounds(pins.map(p => [p.lat, p.lon]), { padding: [36, 36], maxZoom: 14 });
  else if (pins.length === 1) map.setView([pins[0].lat, pins[0].lon], 13);
  else map.setView(APP.mapCenter, APP.mapZoom);
  if (!o.center) map.on("moveend", () => { const c = map.getCenter(); state.mapView[id] = { c: [c.lat, c.lng], z: map.getZoom() }; });
  if (o.onClick) map.on("click", e => o.onClick(e.latlng));
  setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 60);
}
function mountMaps() {
  const cur = state.tab[state.mode];
  if (state.mode === "buy" && cur === "carte" && !state.detail) {
    makeMap("map-all", { here: true, pins: pickupPins().map(p => Object.assign({}, p, { label: p.count, sel: p.id === state.pin, onClick: () => { state.pin = p.id; render(); } })) });
  } else makeMap("map-all", {});
  if (state.detail) {
    const p = allProducts().get(state.detail);
    if (p && isFinite(Number(p.lat)) && isFinite(Number(p.lon))) makeMap("map-detail", { fixed: true, here: true, center: [Number(p.lat), Number(p.lon)], zoom: 13, pins: [{ lat: p.lat, lon: p.lon, name: p.pointName }] });
  } else makeMap("map-detail", {});
  if (state.mode === "sell" && cur === "points" && isFarmerOk()) {
    makeMap("map-pick", { pins: myPoints(), temp: state.newPoint, onClick: ll => { setNewPoint(ll.lat, ll.lng); render(); } });
  } else makeMap("map-pick", {});
  if (state.mode === "admin" && cur === "resume") makeMap("map-admin", { pins: state.points });
  else makeMap("map-admin", {});
}
function setNewPoint(lat, lon) { state.newPoint = { lat, lon }; state.pointIsland = islandOf(lat); }
const myPoints = () => state.points.filter(p => state.session && p.farmerId === state.session.uid);
function pickupPins() {
  const m = new Map();
  state.catalogue.forEach(p => {
    if (p.lat == null) return;
    const k = p.pointId || (p.lat + "," + p.lon);
    if (!m.has(k)) m.set(k, { id: k, name: p.pointName, lat: p.lat, lon: p.lon, island: p.island, count: 0 });
    m.get(k).count++;
  });
  return Array.from(m.values());
}

/* ───────── Rendu ───────── */
function render() {
  const ae = document.activeElement, keep = ae && ae.id && ae.matches("input,select,textarea") ? { id: ae.id, s: null, e: null } : null;
  if (keep) { try { keep.s = ae.selectionStart; keep.e = ae.selectionEnd; } catch (e) {} }
  $("#demotag").hidden = !(store && store.mode === "local");
  if (!state.ready) {
    $("#main").innerHTML = state.loadError ? '<div class="warn">' + esc(state.loadError) + "</div>" : '<p class="empty">Chargement…</p>';
    return;
  }
  const s = state.session, logged = !!(s && !s.anon);
  const modes = [["buy", "Acheter"]];
  if (logged) modes.push(["sell", "Vendre"]);
  if (isAdmin()) modes.push(["admin", "Admin"]);
  if (!modes.some(m => m[0] === state.mode)) state.mode = "buy";
  const mEl = $("#modes");
  mEl.hidden = modes.length < 2;
  mEl.innerHTML = modes.map(m => '<button data-action="mode" data-v="' + m[0] + '" aria-pressed="' + (m[0] === state.mode) + '">' + m[1] + "</button>").join("");

  const pendMine = state.farmOrders.filter(o => o.status === "pending").length;
  const waitUsers = state.users.filter(u => u.status === "pending").length;
  const live = state.myOrders.filter(o => o.status === "pending" || o.status === "accepted").length;
  const waiting = pendMine + waitUsers;
  document.title = (waiting ? "(" + waiting + ") " : "") + APP.name;
  const tabs = {
    buy: [["produits", "Produits"], ["carte", "Carte"], ["demandes", "Mes demandes", live], ["compte", logged ? "Compte" : "Vendre"]],
    sell: [["mesproduits", "Mes produits"], ["recues", "Demandes", pendMine], ["points", "Points de retrait"]],
    admin: [["resume", "Résumé"], ["agriculteurs", "Comptes", waitUsers], ["commandes", "Demandes"]]
  }[state.mode];
  const cur = state.tab[state.mode];
  $("#tabs").innerHTML = tabs.map(t => '<button data-action="tab" data-v="' + t[0] + '" aria-current="' + (t[0] === cur) + '">' + t[1] + (t[2] ? '<span class="badge">' + t[2] + "</span>" : "") + "</button>").join("");
  const views = { produits: vProduits, carte: vCarte, demandes: vDemandes, compte: vCompte, mesproduits: vMesProduits, recues: vRecues, points: vPoints, resume: vResume, agriculteurs: vAgriculteurs, commandes: vCommandes };
  let html = (state.online ? "" : '<p class="warn"><strong>Pas de réseau.</strong> Ce que vous faites est gardé dans le téléphone et sera envoyé quand le réseau reviendra.</p>') + (store.mode === "local" ? '<p class="note"><strong>Mode démo.</strong> Les données sont des exemples et restent dans ce téléphone. Remplissez js/config.js pour brancher Firebase.</p>' : "");
  html += state.mode === "sell" ? sellGate(views[cur]) : views[cur]();
  $("#main").innerHTML = html;
  $("#sheet").innerHTML = state.detail ? vDetail() : state.sent ? vSent() : state.help ? vHelp() : "";
  if (!state.tuto && state.mode === "sell" && isFarmerOk() && !seenFlag("maa-tuto-farmer")) state.tuto = { kind: "farmer", i: 0 };
  $("#tuto").innerHTML = state.tuto ? vTuto() : "";
  document.querySelectorAll("#langbtn [data-l]").forEach(s => s.classList.toggle("on", s.dataset.l === getLang()));
  translateDom($("#app"));
  mountMaps();
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.e); } catch (e) {} } }
}
const busyAttr = () => state.busy ? " disabled" : "";

/* ── Acheteur ── */
function productCard(p) {
  const d = distLabel(p);
  return '<button class="pcard" data-action="open" data-id="' + esc(p.id) + '"><span class="pic">' + art(p) + '</span><span class="info"><span class="pname">' + esc(p.name) +
    '</span><span class="price">' + money(p.price) + " <small>/ " + unitName(p.unit) + '</small></span><span class="where">' + esc(p.farmerName) + " · " + esc(p.island) + "</span>" +
    (p.stock > 0 ? (d ? '<span class="where">' + d + "</span>" : "") : '<span class="soldout">Épuisé pour le moment</span>') + "</span></button>";
}
function locateBar() {
  return '<div class="row between"><span class="muted">' + (state.pos ? "Distances calculées depuis votre position." : "Activez la position pour voir les distances.") +
    '</span><button class="btn ghost small" data-action="locate">' + (state.pos ? "Actualiser ma position" : "Me localiser") + "</button></div>";
}
function vProduits() {
  const isl = ["Toutes"].concat(APP.islands), cats = ["Tous"].concat(CATS), q = state.q.trim().toLowerCase();
  let list = state.catalogue.filter(p => (state.island === "Toutes" || p.island === state.island) && (state.cat === "Tous" || p.cat === state.cat) && (!q || String(p.name).toLowerCase().includes(q)));
  list = list.sort((a, b) => (b.stock > 0) - (a.stock > 0) || (state.pos ? km(state.pos, a) - km(state.pos, b) : ts(b.createdAt) - ts(a.createdAt)));
  const nf = new Set(state.catalogue.map(p => p.farmerId)).size;
  const hero = '<div class="hero"><div class="txt"><p class="hi">Ia ora na !</p><p>Fruits, légumes et plantes de ' + esc(APP.islands.join(" et ")) + ", en direct des fa'a'apu. Retrait sur place, paiement en espèces.</p>" +
    (state.catalogue.length ? '<div class="stats"><span>' + state.catalogue.length + " produit" + (state.catalogue.length > 1 ? "s" : "") + "</span><span>" + nf + " fa'a'apu</span></div>" : "") + "</div></div>";
  return hero + seasonRow() +
    '<label class="field">Rechercher<input id="q" type="search" placeholder="Taro, ananas, vanille" value="' + esc(state.q) + '" data-keep="q" data-live="1"></label>' +
    '<div class="chips" role="group" aria-label="Île">' + isl.map(i => '<button class="chip" data-action="island" data-v="' + esc(i) + '" aria-pressed="' + (i === state.island) + '">' + esc(i) + "</button>").join("") + "</div>" +
    '<div class="chips" role="group" aria-label="Catégorie">' + cats.map(c => '<button class="chip" data-action="cat" data-v="' + esc(c) + '" aria-pressed="' + (c === state.cat) + '">' + esc(c) + "</button>").join("") + "</div>" +
    locateBar() +
    (list.length ? '<div class="products">' + list.map(productCard).join("") + "</div>"
      : (state.catalogue.length ? emptyArt("Rien ne correspond", "Essayez une autre île, une autre catégorie ou un autre mot.") : emptyArt("Le marché ouvre bientôt", "Les agriculteurs de " + APP.islands.join(" et ") + " ajoutent leurs produits. Revenez dans quelques jours.")));
}
function vDetail() {
  const p = allProducts().get(state.detail);
  if (!p) return '<div class="sheet"><div class="top"><button data-action="close">Retour</button></div><div class="body"><p class="empty">Ce produit n\'est plus en vente.</p></div></div>';
  const q = state.qty, ph = state.photos && state.photos.id === p.id ? state.photos.list : [], d = distLabel(p);
  return '<div class="sheet"><div class="top"><button data-action="close">Retour</button><strong>' + esc(p.name) + '</strong></div><div class="body">' +
    '<div class="pic hero-pic">' + art(p, ph[state.photo]) + '</div><div class="pad">' +
    (ph.length > 1 ? '<div class="row">' + ph.map((u, i) => '<button class="thumb pic" data-action="photo" data-v="' + i + '" aria-pressed="' + (i === state.photo) + '" aria-label="Photo ' + (i + 1) + '"><img alt="" src="' + safeImg(u) + '"></button>').join("") + "</div>" : "") +
    '<div class="row between"><div><h2>' + esc(p.name) + '</h2><p class="muted">' + (p.detail ? esc(p.detail) + " · " : "") + "Vendu par " + esc(p.farmerName) + (p.commune ? ", " + esc(p.commune) : "") + '</p></div><div class="price">' + money(p.price) + " <small>/ " + unitName(p.unit) + "</small></div></div>" +
    '<p class="muted">' + (p.stock > 0 ? "Disponible : " + qtyLabel(p.stock, p.unit) : "Épuisé pour le moment") + "</p>" +
    (p.stock > 0 ?
      '<div class="card"><h3>Quelle quantité voulez-vous ?</h3><div class="stepper"><button data-action="minus" aria-label="Moins">−</button><output id="qty">' + qtyLabel(q, p.unit) + '</output><button data-action="plus" aria-label="Plus">+</button></div>' +
      '<div class="total"><span>Total à payer en espèces au retrait</span><strong id="total">' + money(q * p.price) + "</strong></div></div>" : "") +
    '<div class="card"><h3>Point de retrait</h3><p>' + esc(p.pointName) + " (" + esc(p.island) + ")" + (d ? ' <span class="muted">· ' + d + " de vous</span>" : "") + "</p>" +
    '<div class="lmap mini" id="map-detail"></div><a class="btn ghost" target="_blank" rel="noopener" href="' + mapsLink(p) + '">Ouvrir l\'itinéraire dans Google Maps</a></div>' +
    (p.stock > 0 ?
      '<div class="card"><h3>Vos coordonnées</h3><p class="muted">Pas de compte à créer. L\'agriculteur voit seulement ces deux informations.</p><div class="grid2">' +
      '<label class="field">Prénom<input id="b-name" autocomplete="given-name" data-keep="buyerName" value="' + esc(state.buyerName) + '" placeholder="Ex. Maeva"></label>' +
      '<label class="field">Téléphone<input id="b-phone" type="tel" inputmode="tel" autocomplete="tel" data-keep="buyerPhone" value="' + esc(state.buyerPhone) + '" placeholder="87 12 34 56"></label></div></div>' +
      '<button class="btn wide" data-action="send"' + busyAttr() + ">Envoyer la demande à " + esc(p.farmerName) + "</button>" +
      '<p class="muted">L\'agriculteur confirme et vous propose un jour et une heure de retrait.</p>' : "") +
    "</div></div></div>";
}
function vCarte() {
  const pins = pickupPins(), sel = pins.find(p => p.id === state.pin);
  return "<h2>Où retirer les produits</h2>" + locateBar() + '<div class="lmap" id="map-all"></div>' +
    '<p class="muted">Le chiffre indique le nombre de produits à ce point.' + (state.pos ? " Le point bleu est votre position." : "") + "</p>" +
    (sel ? "<h3>" + esc(sel.name) + (distLabel(sel) ? ' <span class="muted">· ' + distLabel(sel) + "</span>" : "") + '</h3><div class="products">' + state.catalogue.filter(p => (p.pointId || (p.lat + "," + p.lon)) === sel.id).map(productCard).join("") + "</div>"
      : '<p class="note">' + (pins.length ? "Touchez une épingle rouge pour voir les produits de ce point de retrait." : "Aucun point de retrait pour le moment.") + "</p>");
}
function statsLine(o) {
  const st = state.stats[digits(o.buyerPhone)];
  if (!st) return "";
  const d = st.done || 0, n = st.noshow || 0, v = st.verified ? '<span class="status st-ok">Numéro vérifié</span> ' : "";
  if (!d && !n) return st.verified ? '<p class="muted">' + v + "Pas encore de retrait.</p>" : "";
  return '<p class="' + (n ? "warn" : "muted") + '">' + v + "Historique : " + d + " retrait" + (d > 1 ? "s" : "") + ", " + n + " absence" + (n > 1 ? "s" : "") + "</p>";
}
const msgToFarmer = o => "Ia ora na " + o.farmerName + ", je viens de vous envoyer une demande sur " + APP.name + " : " + qtyLabel(o.qty, o.unit) + " de " + o.productName + " (" + money(totalOf(o)) + "), à retirer à " + o.pointName + ". " + o.buyerName + ", " + prettyPhone(o.buyerPhone);
// Premier achat d'un numéro jamais vérifié : l'agriculteur doit appeler ou écrire avant d'accepter.
function needsCheck(o) { const st = state.stats[digits(o.buyerPhone)]; return !!st && !st.verified && !(st.done > 0); }
function msgToBuyer(o) {
  const q = qtyLabel(o.qty, o.unit) + " de " + o.productName;
  if (o.status === "accepted") return "Ia ora na " + o.buyerName + ", votre demande de " + q + " est acceptée. Retrait : " + o.slot + ", " + o.pointName + ". À payer en espèces : " + money(totalOf(o)) + ". " + o.farmerName;
  if (o.status === "refused") return "Ia ora na " + o.buyerName + ", désolé, je ne peux pas répondre à votre demande de " + q + ". " + o.farmerName;
  return "Ia ora na " + o.buyerName + ", c'est " + o.farmerName + " au sujet de votre demande de " + q + ".";
}
const waBtn = (phone, msg, label, primary) => digits(phone).length === 8 ? '<a class="btn ' + (primary ? "" : "ghost ") + 'small" target="_blank" rel="noopener" href="' + waLink(phone, msg) + '">' + esc(label) + "</a>" : "";
const smsBtn = (phone, msg) => digits(phone).length === 8 ? '<a class="btn ghost small" href="' + smsLink(phone, msg) + '">SMS</a>' : "";
const shareBtn = (msg) => navigator.share ? '<button class="btn ghost small" data-action="share" data-v="' + esc(msg) + '">Partager (Reo Fenua…)</button>' : "";
const row = btns => { const b = btns.filter(Boolean); return b.length ? '<div class="row">' + b.join("") + "</div>" : ""; };
function blockUI(o, scope) {
  if (["cancelled", "done", "refused"].includes(o.status) && state.blocking !== o.id) return "";
  const list = scope === "all" ? state.allBlocks : state.blocks;
  if (list.some(b => b.kind === "phone" && b.key === digits(o.buyerPhone))) return '<p class="muted">Ce numéro est bloqué' + (scope === "all" ? " partout" : "") + ".</p>";
  if (state.blocking === o.id) return '<div class="warn">Bloquer ' + esc(o.buyerName) + " (" + esc(prettyPhone(o.buyerPhone)) + ") ? " +
    (scope === "all" ? "Ce numéro ne pourra plus envoyer de demande à aucun agriculteur." : "Ce numéro ne pourra plus vous envoyer de demande.") + " Ses demandes en attente seront refusées." +
    '</div><div class="row"><button class="btn danger small" data-action="confirmblock" data-id="' + esc(o.id) + '" data-scope="' + scope + '"' + busyAttr() + '>Confirmer le blocage</button><button class="btn ghost small" data-action="noblock">Annuler</button></div>';
  return '<div><button class="btn ghost small" data-action="block" data-id="' + esc(o.id) + '">' + (scope === "all" ? "Bloquer ce numéro partout" : "Bloquer ce numéro") + "</button></div>";
}
function orderItem(o, who) {
  let h = '<div class="item"><div class="row between"><div class="row"><span class="thumb pic">' + art({ name: o.productName }) + '</span><div><div class="pname">' + qtyLabel(o.qty, o.unit) + " · " + esc(o.productName) +
    '</div><div class="muted">' + (who === "buyer" ? esc(o.farmerName) : "Acheteur : " + esc(o.buyerName)) + (who === "admin" ? " → " + esc(o.farmerName) : "") + " · " + money(totalOf(o)) + "</div></div></div>" +
    '<span class="status st-' + esc(o.status) + '">' + (ST[o.status] || esc(o.status)) + "</span></div>";
  if (who !== "buyer" && o.buyerPhone) h += '<p class="muted">Téléphone : <a href="tel:+689' + esc(digits(o.buyerPhone)) + '">' + esc(prettyPhone(o.buyerPhone)) + "</a></p>";
  if (who === "farmer" && (o.status === "pending" || o.status === "accepted")) h += statsLine(o);
  if (o.status === "accepted" || o.status === "done") h += '<p class="muted">Retrait : ' + esc(o.slot) + ", " + esc(o.pointName) + "</p>";
  else if (who === "buyer" && o.status === "pending") h += '<p class="muted">Retrait prévu à : ' + esc(o.pointName) + "</p>";
  if (who === "buyer") {
    if (o.status === "pending") {
      h += row([waBtn(o.farmerPhone, msgToFarmer(o), "Prévenir " + o.farmerName + " sur WhatsApp", true), state.online ? "" : smsBtn(o.farmerPhone, msgToFarmer(o)), state.online ? "" : shareBtn(msgToFarmer(o))]);
      h += '<div><button class="btn danger small" data-action="cancel" data-id="' + esc(o.id) + '"' + busyAttr() + ">Annuler ma demande</button></div>";
    }
    if (o.status === "accepted") h += row([o.lat != null ? '<a class="btn ghost small" target="_blank" rel="noopener" href="' + mapsLink(o) + '">Itinéraire</a>' : "",
      waBtn(o.farmerPhone, "Ia ora na " + o.farmerName + ", c'est " + o.buyerName + " pour " + qtyLabel(o.qty, o.unit) + " de " + o.productName + ".", "Écrire à " + o.farmerName)]);
  }
  if (who === "farmer") {
    if (o.status === "pending") {
      if (state.accepting === o.id) {
        h += '<div class="grid2"><label class="field">Jour du retrait<input id="slot-date" type="date" min="' + localDate(new Date()) + '" value="' + esc(state.slot.date) + '" data-keep="slot.date"></label>' +
          '<label class="field">Heure<input id="slot-time" type="time" value="' + esc(state.slot.time) + '" data-keep="slot.time"></label></div>' +
          '<div class="row"><button class="btn small" data-action="confirm" data-id="' + esc(o.id) + '"' + busyAttr() + '>Confirmer le retrait</button><button class="btn ghost small" data-action="unaccept">Annuler</button></div>';
      } else if (needsCheck(o)) {
        h += '<p class="warn"><strong>Nouveau numéro.</strong> Appelez ou écrivez à ' + esc(o.buyerName) + " avant d'accepter, pour vérifier que le numéro est bon. Une seule fois : ensuite il sera vérifié pour tous les agriculteurs.</p>";
        h += row(['<a class="btn ghost small" href="tel:+689' + esc(digits(o.buyerPhone)) + '">Appeler</a>', waBtn(o.buyerPhone, msgToBuyer(o), "WhatsApp"), smsBtn(o.buyerPhone, msgToBuyer(o))]);
        h += row(['<button class="btn small" data-action="verify" data-id="' + esc(o.id) + '"' + busyAttr() + ">J'ai vérifié le numéro, accepter</button>", '<button class="btn danger small" data-action="refuse" data-id="' + esc(o.id) + '"' + busyAttr() + ">Refuser</button>"]);
      } else h += row(['<button class="btn small" data-action="accept" data-id="' + esc(o.id) + '">Accepter</button>', '<button class="btn danger small" data-action="refuse" data-id="' + esc(o.id) + '"' + busyAttr() + ">Refuser</button>", waBtn(o.buyerPhone, msgToBuyer(o), "WhatsApp")]);
    }
    if (o.status === "accepted") {
      h += row([waBtn(o.buyerPhone, msgToBuyer(o), "Envoyer l'heure sur WhatsApp", true), smsBtn(o.buyerPhone, msgToBuyer(o))]);
      h += row(['<button class="btn ghost small" data-action="done" data-id="' + esc(o.id) + '"' + busyAttr() + ">Remise et payée</button>", '<button class="btn danger small" data-action="noshow" data-id="' + esc(o.id) + '"' + busyAttr() + ">Pas venu</button>"]);
    }
    if (o.status === "refused") h += row([waBtn(o.buyerPhone, msgToBuyer(o), "Prévenir sur WhatsApp")]);
    h += blockUI(o, state.session.uid);
  }
  if (who === "admin") h += blockUI(o, "all");
  return h + "</div>";
}
function vSent() {
  const o = state.sent;
  return '<div class="sheet"><div class="top"><button data-action="closesent">Fermer</button><strong>Demande envoyée</strong></div><div class="body"><div class="pad" style="padding-top:16px">' +
    "<h2>" + (state.online ? "Demande envoyée à " : "Demande prête pour ") + esc(o.farmerName) + "</h2>" +
    "<p>" + qtyLabel(o.qty, o.unit) + " de " + esc(o.productName) + " · " + money(totalOf(o)) + " · retrait à " + esc(o.pointName) + "</p>" +
    (state.online ? "" : '<p class="warn">Pas de réseau : la demande partira toute seule quand le réseau reviendra. Pour prévenir l\'agriculteur maintenant, envoyez-lui le message par SMS ou par Reo Fenua.</p>') +
    (digits(o.farmerPhone).length === 8 ?
      '<p class="note">Pour qu\'il la voie tout de suite, prévenez-le. Le message est déjà écrit, il suffit de l\'envoyer.</p>' +
      '<a class="btn wide" target="_blank" rel="noopener" href="' + waLink(o.farmerPhone, msgToFarmer(o)) + '">Prévenir ' + esc(o.farmerName) + " sur WhatsApp</a>" +
      '<a class="btn ghost wide" href="' + smsLink(o.farmerPhone, msgToFarmer(o)) + '">Prévenir par SMS</a>' : "") +
    (navigator.share ? '<button class="btn ghost wide" data-action="share" data-v="' + esc(msgToFarmer(o)) + '">Partager le message (Reo Fenua, Messenger…)</button>' : "") +
    '<button class="btn ghost wide" data-action="closesent">Plus tard</button></div></div></div>';
}
function alertCard(what) {
  const ok = "Notification" in window, p = ok ? Notification.permission : "unsupported";
  if (p === "granted") return '<p class="muted">Alertes activées : un son et une notification à chaque ' + what + ", tant que l'application est ouverte ou en arrière-plan.</p>";
  if (p === "denied") return '<p class="warn">Les notifications sont bloquées pour ce site. Autorisez-les dans les réglages du navigateur. Le son marche quand même quand l\'application est ouverte.</p>';
  if (!ok) return '<p class="muted">Ce téléphone ne permet pas les notifications ici. Sur iPhone, installez d\'abord l\'application sur l\'écran d\'accueil. Le son marche quand l\'application est ouverte.</p>';
  return '<div class="card"><h3>Être prévenu</h3><p class="muted">Un son et une notification à chaque ' + what + ", tant que l'application est ouverte ou en arrière-plan.</p><div><button class=\"btn small\" data-action=\"notif\">Activer les alertes</button></div></div>";
}
function blockList(list, scope) {
  const ph = list.filter(b => b.kind === "phone");
  if (!ph.length) return "";
  return "<h3>" + (scope === "all" ? "Numéros bloqués partout" : "Numéros bloqués") + '</h3><div class="list">' + ph.map(b => '<div class="item"><div class="row between"><div><div class="pname">' + esc(b.name || "Acheteur") + '</div><div class="muted">' + esc(prettyPhone(b.key)) + '</div></div><button class="btn ghost small" data-action="unblock" data-id="' + esc(b.id) + '" data-scope="' + esc(scope) + '"' + busyAttr() + ">Débloquer</button></div></div>").join("") + "</div>";
}
function vDemandes() {
  const mine = newest(state.myOrders);
  const pend = mine.filter(o => o.status === "pending").length;
  return "<h2>Mes demandes</h2>" + (mine.some(o => o.status === "pending" || o.status === "accepted") ? alertCard("réponse de l'agriculteur") : "") +
    (pend >= 3 ? '<p class="note">Vous avez 3 demandes en attente, le maximum. Attendez une réponse ou annulez-en une pour en envoyer une autre.</p>' : "") + (mine.length ? '<div class="list">' + mine.map(o => orderItem(o, "buyer")).join("") + "</div>"
    : emptyArt("Pas encore de demande", "Choisissez un produit dans l'onglet Produits, puis la quantité voulue.")) +
    '<p class="muted">Vos demandes sont liées à ce téléphone. Gardez la même application pour les suivre.</p>';
}

/* ── Compte ── */
function islandSelect(id, path, val) {
  return '<select id="' + id + '" data-keep="' + path + '">' + APP.islands.map(i => '<option' + (i === val ? " selected" : "") + ">" + esc(i) + "</option>").join("") + "</select>";
}
function vCompte() {
  const s = state.session, p = profile(), f = state.authf;
  if (s && !s.anon) {
    return "<h2>Mon compte</h2>" + '<div class="card">' + (p ? '<div class="row between"><div><div class="pname">' + esc(p.name) + '</div><div class="muted">' + esc(p.commune) + ", " + esc(p.island) + " · " + esc(prettyPhone(p.phone)) + '</div></div><span class="status st-' + esc(p.status) + '">' + (UST[p.status] || "") + "</span></div>" +
      (p.role === "admin" ? '<p class="muted">Vous êtes administrateur.</p>' : "") : '<p class="muted">Profil à compléter dans l\'onglet Vendre.</p>') +
      '<div class="row"><button class="btn small" data-action="mode" data-v="sell">Aller à l\'espace Vendre</button><button class="btn ghost small" data-action="signout">Se déconnecter</button></div></div>' + demoTools();
  }
  const login = state.authTab === "login";
  let h = "<h2>Espace agriculteurs et agricultrices</h2>" + '<p class="muted">Pour acheter, aucun compte n\'est nécessaire. Cet espace sert aux agriculteurs et agricultrices qui vendent leurs produits.</p>' +
    '<div class="roles light" role="group" aria-label="Connexion ou inscription"><button data-action="authtab" data-v="login" aria-pressed="' + login + '">J\'ai un compte</button><button data-action="authtab" data-v="signup" aria-pressed="' + !login + '">Je m\'inscris</button></div>';
  if (login) {
    h += '<form class="card" id="loginform"><label class="field">Numéro de téléphone (ou e-mail si vous en avez donné un)<input id="l-login" autocomplete="username" required data-keep="authf.login" value="' + esc(f.login) + '" placeholder="87 12 34 56"></label>' +
      '<label class="field">Mot de passe<input id="l-pass" type="password" autocomplete="current-password" required data-keep="authf.password" value="' + esc(f.password) + '"></label>' +
      '<button class="btn" type="submit"' + busyAttr() + ">Se connecter</button>" +
      '<p class="muted">Mot de passe oublié ? Appelez l\'admin : il autorise un nouveau mot de passe, puis vous vous réinscrivez avec le même numéro. Vos produits sont conservés.</p>' +
      '<p class="muted">Compte créé avec un e-mail ? Écrivez-le ci-dessus, puis :</p><div><button class="btn ghost small" type="button" data-action="resetmail"' + busyAttr() + ">Recevoir un lien par e-mail</button></div></form>";
  } else {
    h += '<form class="card" id="signupform"><label class="field">Prénom et nom<input id="s-name" autocomplete="name" required data-keep="authf.name" value="' + esc(f.name) + '" placeholder="Ex. Teva M."></label>' +
      '<div class="grid2"><label class="field">Commune<input id="s-commune" required data-keep="authf.commune" value="' + esc(f.commune) + '" placeholder="Ex. Haamene"></label><label class="field">Île' + islandSelect("s-island", "authf.island", f.island) + "</label></div>" +
      '<label class="field">Numéro de téléphone<input id="s-phone" type="tel" inputmode="tel" autocomplete="tel" required data-keep="authf.phone" value="' + esc(f.phone) + '" placeholder="87 12 34 56"></label>' +
      '<label class="field">Choisissez un mot de passe (6 caractères au minimum)<input id="s-pass" type="password" autocomplete="new-password" required minlength="6" data-keep="authf.password" value="' + esc(f.password) + '"></label>' +
      '<label class="field">E-mail (facultatif)<input id="s-email" type="email" autocomplete="email" data-keep="authf.email" value="' + esc(f.email) + '" placeholder="Recommandé pour l\'admin"></label>' +
      '<p class="muted">Avec un e-mail, vous vous connectez avec cet e-mail et vous pouvez recevoir un lien si le mot de passe est oublié. Sans e-mail, vous vous connectez avec votre numéro.</p>' +
      '<button class="btn" type="submit"' + busyAttr() + ">Envoyer mon inscription</button>" +
      '<p class="muted">Pas d\'e-mail ni de code à recevoir. L\'admin valide votre inscription, ensuite vous pouvez vendre.</p><p class="muted">Votre numéro sera visible par les acheteurs, pour qu\'ils puissent vous prévenir par WhatsApp ou SMS.</p></form>';
  }
  return h + demoTools();
}
function demoTools() {
  if (!store || store.mode !== "local") return "";
  return '<div class="card"><h3>Outils du mode démo</h3><div class="row"><button class="btn ghost small" data-action="demologin" data-v="farmer">Entrer comme agriculteur</button><button class="btn ghost small" data-action="demologin" data-v="admin">Entrer comme admin</button><button class="btn danger small" data-action="demoreset">Remettre la démo à zéro</button></div></div>';
}

/* ── Agriculteur ── */
function sellGate(view) {
  const s = state.session, p = profile();
  if (!s || s.anon) return '<p class="empty">Connectez-vous dans l\'onglet Vendre.</p>';
  if (!p) {
    const f = state.authf;
    return "<h2>Compléter mon profil</h2>" + '<form class="card" id="profileform"><label class="field">Prénom et nom<input id="s-name" required data-keep="authf.name" value="' + esc(f.name) + '"></label>' +
      '<div class="grid2"><label class="field">Commune<input id="s-commune" required data-keep="authf.commune" value="' + esc(f.commune) + '"></label><label class="field">Île' + islandSelect("s-island", "authf.island", f.island) + "</label></div>" +
      '<label class="field">Numéro de téléphone<input id="s-phone" type="tel" required data-keep="authf.phone" value="' + esc(f.phone) + '"></label>' +
      '<button class="btn" type="submit"' + busyAttr() + ">Enregistrer</button></form>";
  }
  if (p.status === "pending") return "<h2>Inscription envoyée</h2>" + '<div class="warn">Votre inscription attend la validation de l\'admin. Dès qu\'elle est validée, vous pourrez ajouter vos produits ici.</div>';
  if (p.status === "suspended") return "<h2>Compte suspendu</h2>" + '<div class="warn">Votre compte est suspendu et vos produits ne sont plus visibles. Contactez l\'admin.</div>';
  if (p.status !== "ok") return "<h2>Inscription refusée</h2>" + '<div class="warn">Votre inscription n\'a pas été acceptée. Contactez l\'admin.</div>';
  return view();
}
function productForm() {
  const f = state.form, pts = myPoints();
  return '<form class="card" id="productform"><h3>' + (f.id ? "Modifier le produit" : "Nouveau produit") + "</h3>" +
    '<label class="field">Nom du produit<input id="n-name" required maxlength="60" data-keep="form.name" value="' + esc(f.name) + '" placeholder="Ex. Patates douces"></label>' +
    '<div class="grid2"><label class="field">Catégorie<select id="n-cat" data-keep="form.cat">' + CATS.map(c => "<option" + (c === f.cat ? " selected" : "") + ">" + c + "</option>").join("") + "</select></label>" +
    '<label class="field">Vendu par<select id="n-unit" data-keep="form.unit">' + Object.keys(UNITS).map(u => '<option value="' + u + '"' + (u === f.unit ? " selected" : "") + ">" + UNITS[u][0] + "</option>").join("") + "</select></label></div>" +
    '<div class="grid2"><label class="field">Prix par unité (F)<input id="n-price" type="number" inputmode="numeric" min="1" step="1" required data-keep="form.price" value="' + esc(f.price) + '" placeholder="500"></label>' +
    '<label class="field">Quantité disponible<input id="n-stock" type="number" inputmode="decimal" min="0" step="0.5" required data-keep="form.stock" value="' + esc(f.stock) + '" placeholder="20"></label></div>' +
    '<label class="field">Précision (facultatif)<input id="n-detail" maxlength="80" data-keep="form.detail" value="' + esc(f.detail) + '" placeholder="Ex. Paquet de 10 gousses"></label>' +
    '<label class="field">Point de retrait<select id="n-point" data-keep="form.pointId">' + pts.map(p => '<option value="' + esc(p.id) + '"' + (p.id === f.pointId ? " selected" : "") + ">" + esc(p.name) + "</option>").join("") + "</select></label>" +
    '<label class="field">Photos (3 au maximum)<input id="n-photo" type="file" accept="image/*" multiple' + (f.photos.length >= 3 ? " disabled" : "") + "></label>" +
    (f.photos.length ? '<div class="previews">' + f.photos.map((ph, i) => '<div class="preview"><img alt="Photo ' + (i + 1) + '" src="' + ph.thumb + '"><button type="button" data-action="rmphoto" data-v="' + i + '" aria-label="Retirer la photo ' + (i + 1) + '">×</button></div>').join("") + "</div>" : "") +
    '<p class="muted">' + (f.id && !f.photos.length ? "Les photos actuelles sont conservées. Choisissez-en de nouvelles pour les remplacer. " : "") + "Chaque photo est réduite et convertie en JPEG léger avant l'envoi, quel que soit son format.</p>" +
    '<div class="row"><button class="btn" type="submit"' + busyAttr() + ">" + (f.id ? "Enregistrer" : "Publier le produit") + '</button><button class="btn ghost" type="button" data-action="cancelform">Annuler</button></div></form>';
}
function vMesProduits() {
  const mine = newest(state.myProducts), pts = myPoints();
  let h = "<h2>Mes produits</h2>";
  if (state.form) h += productForm();
  else h += '<button class="btn wide" data-action="add"' + (pts.length ? "" : " disabled") + ">Ajouter un produit</button>" + (pts.length ? "" : '<p class="note">Ajoutez d\'abord un point de retrait dans l\'onglet Points de retrait.</p>');
  h += '<div class="list">' + mine.map(p => '<div class="item"><div class="row"><span class="thumb pic">' + art(p) + '</span><div><div class="pname">' + esc(p.name) + '</div><div class="muted">' + money(p.price) + " / " + unitName(p.unit) + " · " + esc(p.pointName) + "</div></div></div>" +
    '<div class="row between"><span>Stock : <strong>' + qtyLabel(p.stock, p.unit) + '</strong></span><div class="row"><button class="btn ghost small" data-action="stock" data-id="' + esc(p.id) + '" data-d="-1" aria-label="Diminuer le stock">−</button><button class="btn ghost small" data-action="stock" data-id="' + esc(p.id) + '" data-d="1" aria-label="Augmenter le stock">+</button></div></div>' +
    '<div class="row"><button class="btn ghost small" data-action="edit" data-id="' + esc(p.id) + '">Modifier</button><button class="btn danger small" data-action="del" data-id="' + esc(p.id) + '"' + busyAttr() + ">Retirer de la vente</button></div></div>").join("") + "</div>";
  if (!mine.length && !state.form) h += emptyArt("Votre étal est vide", pts.length ? "Touchez « Ajouter un produit » pour mettre en vente vos fruits, légumes ou plantes." : "Commencez par placer un point de retrait, puis ajoutez vos produits.");
  return h;
}
function vRecues() {
  const mine = newest(state.farmOrders);
  needStats(mine.filter(o => o.status === "pending" || o.status === "accepted").map(o => digits(o.buyerPhone)));
  return "<h2>Demandes reçues</h2>" + alertCard("nouvelle demande") + (mine.length ? '<div class="list">' + mine.map(o => orderItem(o, "farmer")).join("") + "</div>" : emptyArt("Aucune demande pour le moment", "Les demandes des acheteurs apparaîtront ici.")) + blockList(state.blocks, state.session.uid);
}
function vPoints() {
  const pts = myPoints();
  return "<h2>Mes points de retrait</h2>" + '<p class="note">Touchez la carte à l\'endroit où les acheteurs viennent chercher les produits, ou utilisez votre position.</p>' +
    '<div class="lmap" id="map-pick"></div><button class="btn ghost" data-action="gpspoint">Placer le point à ma position GPS</button>' +
    (state.newPoint ? '<form class="card" id="pointform"><div class="grid2"><label class="field">Nom du point<input id="pt-name" required maxlength="50" data-keep="pointName" value="' + esc(state.pointName) + '" placeholder="Ex. Stand devant la mairie"></label><label class="field">Île' + islandSelect("pt-island", "pointIsland", state.pointIsland) + "</label></div>" +
      '<div class="row"><button class="btn" type="submit"' + busyAttr() + '>Enregistrer le point</button><button class="btn ghost" type="button" data-action="cancelpoint">Annuler</button></div></form>' : "") +
    '<div class="list">' + pts.map(p => '<div class="item"><div class="row between"><div><div class="pname">' + esc(p.name) + '</div><div class="muted">' + esc(p.island) + " · " + state.myProducts.filter(x => x.pointId === p.id).length + ' produit(s)</div></div><button class="btn danger small" data-action="delpoint" data-id="' + esc(p.id) + '"' + busyAttr() + ">Supprimer</button></div></div>").join("") + "</div>" +
    (pts.length ? "" : '<p class="empty">Aucun point de retrait enregistré.</p>');
}

/* ── Admin ── */
function vResume() {
  const fs = state.users.filter(u => u.role !== "admin" || u.status), ok = fs.filter(u => u.status === "ok").length, wait = fs.filter(u => u.status === "pending").length;
  const pend = state.allOrders.filter(o => o.status === "pending").length;
  const sold = state.allOrders.filter(o => o.status === "done").reduce((s, o) => s + totalOf(o), 0);
  return "<h2>Tableau de bord</h2>" + alertCard("nouvelle inscription") + '<div class="tiles"><div class="tile' + (wait ? " alert" : "") + '"><b>' + wait + '</b><span>inscriptions à valider</span></div><div class="tile' + (pend ? " alert" : "") + '"><b>' + pend + '</b><span>demandes en attente</span></div><div class="tile"><b>' + ok + '</b><span>comptes actifs</span></div><div class="tile"><b>' + state.catalogue.length + "</b><span>produits en vente</span></div></div>" +
    '<div class="card"><h3>Ventes remises et payées</h3><div class="total" style="border:0;padding:0"><span class="muted">Total des demandes terminées</span><strong>' + money(sold) + "</strong></div></div>" +
    '<div class="card"><h3>Produits par île</h3>' + APP.islands.map(i => '<div class="row between"><span>' + esc(i) + "</span><strong>" + state.catalogue.filter(p => p.island === i).length + "</strong></div>").join("") + "</div>" +
    '<div class="lmap" id="map-admin"></div>';
}
function vAgriculteurs() {
  const wait = newest(state.users.filter(u => u.status === "pending")), rest = state.users.filter(u => u.status !== "pending").sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const twin = u => state.users.find(x => x.id !== u.id && x.status !== "pending" && digits(x.phone) === digits(u.phone));
  const me = state.session.uid;
  return "<h2>Agriculteurs et agricultrices</h2><h3>Inscriptions à valider</h3>" + (wait.length ? '<div class="list">' + wait.map(u => {
    const t = twin(u);
    return '<div class="item"><div class="pname">' + esc(u.name) + '</div><div class="muted">' + esc(u.commune) + ", " + esc(u.island) + ' · <a href="tel:' + esc(digits(u.phone)) + '">' + esc(prettyPhone(u.phone)) + "</a></div>" +
      (t ? '<p class="warn">Même numéro que ' + esc(t.name) + ". Si c'est bien la même personne (mot de passe oublié), validez : ses produits seront rattachés au nouveau compte.</p>" : "") +
      '<div class="row"><button class="btn small" data-action="approve" data-id="' + esc(u.id) + '"' + busyAttr() + ">" + (t ? "Valider et remplacer l'ancien compte" : "Valider") + '</button><button class="btn danger small" data-action="reject" data-id="' + esc(u.id) + '"' + busyAttr() + ">Refuser</button></div></div>";
  }).join("") + "</div>" : '<p class="muted">Aucune inscription en attente.</p>') +
    "<h3>Inscrits</h3>" + '<div class="list">' + rest.map(u => '<div class="item"><div class="row between"><div><div class="pname">' + esc(u.name) + (u.role === "admin" ? " (admin)" : "") + '</div><div class="muted">' + esc(u.commune) + ", " + esc(u.island) + ' · <a href="tel:' + esc(digits(u.phone)) + '">' + esc(prettyPhone(u.phone)) + "</a> · " + state.catalogue.filter(p => p.farmerId === u.id).length + ' produit(s)</div></div><span class="status st-' + esc(u.status) + '">' + (UST[u.status] || esc(u.status)) + "</span></div>" +
      (u.id === me ? "" : '<div class="row"><button class="btn ghost small" data-action="suspend" data-id="' + esc(u.id) + '"' + busyAttr() + ">" + (u.status === "ok" ? "Suspendre" : "Réactiver") + '</button><button class="btn ghost small" data-action="allowreset" data-id="' + esc(u.id) + '"' + busyAttr() + ">Mot de passe oublié</button>" +
        (u.status === "ok" ? '<button class="btn ghost small" data-action="role" data-id="' + esc(u.id) + '"' + busyAttr() + ">" + (u.role === "admin" ? "Retirer le rôle admin" : "Nommer admin") + "</button>" : "") + "</div>") +
      (state.roleAsk === u.id ? '<div class="warn">' + (u.role === "admin" ? esc(u.name) + " ne sera plus admin, mais pourra toujours vendre." : esc(u.name) + " pourra valider les inscriptions, bloquer des numéros, voir toutes les demandes et nommer d'autres admins.") +
        '</div><div class="row"><button class="btn small" data-action="confirmrole" data-id="' + esc(u.id) + '"' + busyAttr() + '>Confirmer</button><button class="btn ghost small" data-action="norole">Annuler</button></div>' : "") + "</div>").join("") + "</div>";
}
function vCommandes() {
  const all = newest(state.allOrders);
  return "<h2>Toutes les demandes</h2>" + blockList(state.allBlocks, "all") + (all.length ? '<div class="list">' + all.map(o => orderItem(o, "admin")).join("") + "</div>" : '<p class="empty">Aucune demande pour le moment.</p>');
}

/* ───────── Tutoriels ───────── */
const seenFlag = k => { try { return localStorage.getItem(k) === "1"; } catch (e) { return true; } };
const setFlag = k => { try { localStorage.setItem(k, "1"); } catch (e) {} };
const ICON = {
  basket: '<path d="M14 30h44l-5 22H19z"/><path d="M10 30h52M24 30l8-14M48 30l-8-14M28 38v8M36 38v8M44 38v8"/>',
  pin: '<path d="M36 58S18 40 18 28a18 18 0 0 1 36 0c0 12-18 30-18 30z"/><circle cx="36" cy="28" r="6"/>',
  cash: '<rect x="12" y="22" width="48" height="28" rx="4"/><circle cx="36" cy="36" r="7"/><path d="M20 30v12M52 30v12"/>',
  help: '<circle cx="36" cy="36" r="22"/><path d="M29 30a7 7 0 1 1 10 6c-2 1-3 3-3 5v2"/><circle cx="36" cy="49" r="1.5"/>',
  check: '<circle cx="36" cy="36" r="22"/><path d="M26 36l7 7 14-15"/>',
  phone: '<rect x="24" y="12" width="24" height="48" rx="5"/><path d="M33 54h6"/><path d="M30 26l6 6 8-10"/>',
  bell: '<path d="M22 46h28l-4-6V31a10 10 0 0 0-20 0v9z"/><path d="M32 50a4 4 0 0 0 8 0"/><path d="M14 26c1-6 4-10 8-13M58 26c-1-6-4-10-8-13"/>'
};
const TUTO = {
  app: [
    { photo: "papaye", t: "Ia ora na !", d: "Mā'a Fenua relie les agriculteurs et agricultrices de Taha'a et Raiatea à celles et ceux qui veulent acheter leurs produits.", lang: true },
    { photo: "ananas", t: "Trouvez vos produits", d: "Fruits, légumes, vanille et plantes. Filtrez par île ou touchez une vignette de saison." },
    { icon: "basket", t: "Demandez la quantité", d: "Choisissez des kg, des pièces ou des paquets, puis donnez votre prénom et votre numéro. Aucun compte à créer." },
    { icon: "pin", t: "Venez chercher, payez sur place", d: "Le fa'a'apu confirme le jour et l'heure. Vous payez en espèces au point de retrait." },
    { icon: "help", t: "Vous vendez vos produits ?", d: "Touchez l'onglet Vendre pour vous inscrire. Le bouton ? en haut répond à vos questions." }
  ],
  farmer: [
    { icon: "check", t: "Bienvenue dans votre espace", d: "Votre compte est validé : vous pouvez vendre. Voici l'essentiel en 4 étapes." },
    { icon: "pin", t: "1. Placez votre point de retrait", d: "Onglet Points de retrait : touchez la carte là où les acheteurs viennent, ou utilisez le GPS." },
    { photo: "patate", t: "2. Publiez vos produits", d: "Ajouter un produit : nom, prix, unité (kg, pièce, pot…), quantité et jusqu'à 3 photos." },
    { icon: "phone", t: "3. Répondez aux demandes", d: "Pour un nouveau numéro, appelez d'abord. Acceptez, choisissez le jour et l'heure, puis prévenez par WhatsApp." },
    { icon: "bell", t: "4. Après le retrait", d: "Touchez Remise et payée, ou Pas venu. Activez les alertes pour ne rater aucune demande." }
  ]
};
function vTuto() {
  const T = TUTO[state.tuto.kind], i = Math.min(state.tuto.i, T.length - 1), s = T[i], last = i === T.length - 1;
  const art = s.photo ? '<img class="tuto-photo" alt="" src="icons/photos/' + s.photo + '.jpg">'
    : '<svg class="tuto-icon" viewBox="0 0 72 72" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">' + ICON[s.icon] + "</g></svg>";
  return '<div class="tuto" role="dialog" aria-modal="true" aria-label="Présentation"><div class="tuto-top"><span class="tuto-count">' + (i + 1) + " / " + T.length + '</span><button class="tuto-skip" data-action="tutoskip">Passer</button></div>' +
    '<div class="tuto-body">' + art + "<h2>" + esc(s.t) + "</h2><p>" + esc(s.d) + "</p>" +
    (s.lang ? '<div class="tuto-lang"><span>Choisissez votre langue</span><div class="roles light" role="group" aria-label="Langue"><button data-action="tutolang" data-v="fr" aria-pressed="' + (getLang() === "fr") + '">Français</button><button data-action="tutolang" data-v="tah" aria-pressed="' + (getLang() === "tah") + '">Reo tahiti</button></div></div>' : "") +
    '</div><div class="tuto-dots">' + T.map((x, k) => '<span class="' + (k === i ? "on" : "") + '"></span>').join("") + "</div>" +
    '<div class="tuto-nav">' + (i > 0 ? '<button class="btn ghost" data-action="tutoprev">Précédent</button>' : "<span></span>") +
    '<button class="btn" data-action="tutonext">' + (last ? (state.tuto.kind === "farmer" ? "Commencer à vendre" : "C'est parti !") : "Suivant") + "</button></div></div>";
}
function closeTuto() { setFlag(state.tuto.kind === "farmer" ? "maa-tuto-farmer" : "maa-tuto"); state.tuto = null; }

/* ───────── Aide ───────── */
const FAQ = [
  ["Faut-il payer pour utiliser l'application ?", "Non. Elle est gratuite pour tout le monde. Les produits se paient en espèces au moment du retrait."],
  ["Comment acheter ?", "Choisissez un produit, la quantité, puis donnez votre prénom et votre numéro. Le fa'a'apu vous confirme le jour et l'heure du retrait."],
  ["« Le numéro doit avoir 8 chiffres »", "Tapez le numéro sans indicatif, par exemple 87 12 34 56."],
  ["« La demande n'a pas pu être envoyée »", "Vous avez peut-être déjà 3 demandes en attente : attendez une réponse ou annulez-en une. Sinon, appelez directement le fa'a'apu."],
  ["Je ne vois plus mes demandes.", "Elles sont liées à ce téléphone et à ce navigateur. Si vous en changez, elles disparaissent de votre côté."],
  ["Comment vendre mes produits ?", "Onglet Vendre, puis Je m'inscris. L'admin valide votre inscription, ensuite vous pouvez publier."],
  ["J'ai oublié mon mot de passe.", "Avec un e-mail : « Recevoir un lien par e-mail » sur l'écran de connexion. Sans e-mail : contactez l'admin."],
  ["Je ne reçois pas d'alerte.", "Touchez « Activer les alertes » et acceptez les notifications. Elles arrivent quand l'application est ouverte ou en arrière-plan."]
];
function vHelp() {
  const c = digits(APP.contact || ""), logged = state.session && !state.session.anon;
  return '<div class="sheet"><div class="top"><button data-action="closehelp">Fermer</button><strong>Aide</strong></div><div class="body"><div class="pad" style="padding-top:16px">' +
    "<h2>Comment pouvons-nous vous aider ?</h2>" +
    '<div class="row"><button class="btn small" data-action="tutoshow" data-v="app">Revoir la présentation</button>' + (logged ? '<button class="btn ghost small" data-action="tutoshow" data-v="farmer">Tutoriel agriculteurs et agricultrices</button>' : "") + "</div>" +
    "<h3>Questions fréquentes</h3>" + '<div class="faq">' + FAQ.map(q => "<details><summary>" + esc(q[0]) + "</summary><p>" + esc(q[1]) + "</p></details>").join("") + "</div>" +
    "<h3>Guides complets</h3>" + '<div class="row"><a class="btn ghost small" target="_blank" rel="noopener" href="docs/Maa-Fenua-guide-utilisation.pdf">Guide d\'utilisation (PDF)</a>' + (isAdmin() ? '<a class="btn ghost small" target="_blank" rel="noopener" href="docs/Maa-Fenua-guide-admin.pdf">Guide de l\'admin (PDF)</a>' : "") + "</div>" +
    (c.length === 8 ? "<h3>Contacter l'admin</h3>" + row([waBtn(c, "Ia ora na, j'ai une question sur " + APP.name + " :", "Écrire sur WhatsApp", true), '<a class="btn ghost small" href="tel:+689' + c + '">Appeler ' + esc(prettyPhone(c)) + "</a>"]) : "") +
    "</div></div></div>";
}

/* ───────── Actions ───────── */
function locate() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) { rej(userError("Ce téléphone ne donne pas sa position.")); return; }
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => rej(userError("Position refusée ou indisponible. Autorisez la localisation pour ce site.")), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
}
const orderById = id => state.farmOrders.concat(state.allOrders, state.myOrders).find(o => o.id === id);
const act = {
  help() { state.help = true; state.detail = null; state.sent = null; },
  closehelp() { state.help = false; },
  tutoshow(v) { state.help = false; state.tuto = { kind: v, i: 0 }; },
  tutonext() { if (state.tuto.i >= TUTO[state.tuto.kind].length - 1) closeTuto(); else state.tuto.i++; },
  tutoprev() { if (state.tuto.i > 0) state.tuto.i--; },
  tutoskip() { closeTuto(); },
  tutolang(v) { setLang(v); },
  lang() { setLang(getLang() === "tah" ? "fr" : "tah"); toast(getLang() === "tah" ? "Reo tahiti (version à faire relire)" : "Français"); },
  mode(v) { state.mode = v; state.detail = null; state.form = null; },
  tab(v) { state.tab[state.mode] = v; state.form = null; state.accepting = null; state.newPoint = null; },
  island(v) { state.island = v; }, cat(v) { state.cat = v; },
  season(v) {
    if (v[0] === "@") { const c = v.slice(1); state.cat = state.cat === c ? "Tous" : c; state.q = ""; }
    else { state.q = state.q.trim().toLowerCase() === v ? "" : v; state.cat = "Tous"; }
  },
  authtab(v) { state.authTab = v; },
  async locate() { state.pos = await locate(); try { sessionStorage.setItem("maa-pos", JSON.stringify(state.pos)); } catch (e) {} },
  open(v, d) {
    state.detail = d.id; state.qty = 1; state.photo = 0; state.photos = null;
    const p = allProducts().get(d.id);
    if (p && p.photoCount > 0) store.getPhotos(p.id).then(list => { list = list.filter(safeImg); if (state.detail === p.id && list.length) { state.photos = { id: p.id, list }; render(); } }).catch(e => console.error(e));
  },
  photo(v) { state.photo = +v; },
  close() { state.detail = null; },
  minus() { return bump(-1); }, plus() { return bump(1); },
  async send() {
    const p = allProducts().get(state.detail), nm = state.buyerName.trim(), tel = state.buyerPhone.trim();
    const pend = state.myOrders.filter(o => o.status === "pending");
    if (pend.length >= 3) throw userError("Vous avez déjà 3 demandes en attente. Attendez une réponse ou annulez-en une dans Mes demandes.");
    if (!nm) throw userError("Indiquez votre prénom pour que l'agriculteur sache qui vient.");
    if (!validPhone(tel)) throw userError(PHONE_MSG);
    try { localStorage.setItem("maa-name", nm); localStorage.setItem("maa-phone", prettyPhone(tel)); } catch (e) {}
    const uid = await store.ensureBuyer();
    const data = { productId: p.id, productName: p.name, unit: p.unit, price: p.price, qty: state.qty, total: state.qty * p.price, farmerId: p.farmerId, farmerName: p.farmerName, farmerPhone: p.farmerPhone || "",
      pointName: p.pointName, lat: p.lat, lon: p.lon, island: p.island, buyerUid: uid, buyerName: nm, buyerPhone: digits(tel) };
    const used = pend.map(o => +String(o.lockId || "").split("_").pop()).filter(Boolean);
    const sending = store.createOrder(data, used).catch(e => {
      if (e && e.code === "permission-denied") throw userError("La demande n'a pas pu être envoyée. Vous avez peut-être déjà 3 demandes en attente, le prix a changé (rechargez la page), ou ce numéro a été bloqué. Vous pouvez appeler l'agriculteur directement.");
      throw e;
    });
    // Sans réseau, Firestore garde la demande et l'enverra plus tard : on n'attend pas la réponse du serveur.
    if (state.online) await sending; else sending.catch(fail);
    state.sent = data; state.detail = null; state.tab.buy = "demandes"; state.mode = "buy";
  },
  async cancel(v, d) { await store.setOrderStatus(orderById(d.id), "cancelled"); toast("Demande annulée"); },
  closesent() { state.sent = null; },
  async share(v) { try { await navigator.share({ text: v }); } catch (e) { if (e && e.name !== "AbortError") throw userError("Le partage n'a pas marché sur ce téléphone."); } return NO; },
  async notif() {
    unlockAudio();
    if (!("Notification" in window)) throw userError("Ce téléphone ne permet pas les notifications ici.");
    const r = await Notification.requestPermission();
    if (r === "granted") { beep(); toast("Alertes activées"); } else toast("Alertes non autorisées. Vous pourrez les activer plus tard dans les réglages du navigateur.");
  },
  block(v, d) { state.blocking = d.id; },
  noblock() { state.blocking = null; },
  async confirmblock(v, d) {
    const o = orderById(d.id);
    await store.block(d.scope, o);
    // Les demandes encore en attente de ce numéro sont refusées.
    const pool = d.scope === "all" ? state.allOrders : state.farmOrders;
    for (const x of pool.filter(x => x.status === "pending" && digits(x.buyerPhone) === digits(o.buyerPhone))) await store.setOrderStatus(x, "refused");
    state.blocking = null; toast(o.buyerName + " est bloqué");
  },
  async unblock(v, d) { const list = d.scope === "all" ? state.allBlocks : state.blocks, b = list.find(x => x.id === d.id); await store.unblock(b); toast("Numéro débloqué"); },
  async resetmail() {
    const id = loginId(state.authf.login);
    if (!id.includes("@")) throw userError("Écrivez d'abord votre e-mail dans la première case. Sans e-mail, demandez à l'admin.");
    await store.resetPassword(id);
    toast("Si un compte existe avec cet e-mail, un lien vient d'être envoyé.");
  },
  async signout() { await store.signOut(); state.mode = "buy"; state.tab.buy = "produits"; },
  async demologin(v) { const a = store.demoAccounts[v]; await store.signIn(a[0], a[1]); state.mode = v === "admin" ? "admin" : "sell"; },
  demoreset() { store.reset(); },
  add() { const pts = myPoints(); state.form = { id: null, name: "", cat: CATS[0], unit: "kg", price: "", stock: "", detail: "", pointId: pts[0] ? pts[0].id : "", photos: [] }; },
  edit(v, d) { const p = state.myProducts.find(x => x.id === d.id); state.form = { id: p.id, name: p.name, cat: p.cat, unit: p.unit, price: p.price, stock: p.stock, detail: p.detail || "", pointId: p.pointId, photos: [], oldCount: p.photoCount || 0 }; $("#main").scrollTop = 0; },
  cancelform() { state.form = null; },
  rmphoto(v) { state.form.photos.splice(+v, 1); },
  async stock(v, d) { const p = state.myProducts.find(x => x.id === d.id), s = Math.max(0, p.stock + step(p.unit) * (d.d === "1" ? 1 : -1)); p.stock = s; await store.updateProduct(p.id, { stock: s }); },
  async del(v, d) { const p = state.myProducts.find(x => x.id === d.id); await store.deleteProduct(p.id, p.photoCount); toast(p.name + " est retiré de la vente"); },
  accept(v, d) { state.accepting = d.id; const t = new Date(); t.setDate(t.getDate() + 1); state.slot = { date: localDate(t), time: "07:00" }; },
  unaccept() { state.accepting = null; },
  async verify(v, d) {
    const o = orderById(d.id), ph = digits(o.buyerPhone);
    await store.verifyBuyer(ph);
    state.stats[ph] = Object.assign({ done: 0, noshow: 0 }, state.stats[ph], { verified: true });
    act.accept(v, d);
  },
  async confirm(v, d) {
    const o = orderById(d.id), label = slotLabel(state.slot.date, state.slot.time);
    if (!label) throw userError("Choisissez le jour et l'heure du retrait.");
    await store.acceptOrder(o, label); state.accepting = null; toast("Retrait confirmé. Envoyez l'heure à " + o.buyerName + " sur WhatsApp ou par SMS.");
  },
  async refuse(v, d) { await store.setOrderStatus(orderById(d.id), "refused"); },
  async done(v, d) { const o = orderById(d.id); await store.markDone(o); bumpStat(o, "done"); toast("Vente enregistrée"); },
  async noshow(v, d) { const o = orderById(d.id); await store.markNoShow(o); bumpStat(o, "noshow"); toast("Absence notée, la quantité est remise en stock"); },
  async gpspoint() { const p = await locate(); setNewPoint(p.lat, p.lon); state.mapView["map-pick"] = { c: [p.lat, p.lon], z: 15 }; },
  cancelpoint() { state.newPoint = null; state.pointName = ""; },
  async delpoint(v, d) {
    if (state.myProducts.some(p => p.pointId === d.id)) throw userError("Des produits utilisent ce point. Changez leur point de retrait avant de le supprimer.");
    await store.deletePoint(d.id);
  },
  async approve(v, d) {
    const u = state.users.find(x => x.id === d.id), t = state.users.find(x => x.id !== u.id && x.status !== "pending" && digits(x.phone) === digits(u.phone));
    if (t) await store.replaceAccount(t.id, u.id, t.role); else await store.setUserStatus(u.id, "ok");
    toast(u.name + " peut maintenant vendre");
  },
  async reject(v, d) { await store.setUserStatus(d.id, "refused"); },
  async suspend(v, d) { const u = state.users.find(x => x.id === d.id); await store.setUserStatus(u.id, u.status === "ok" ? "suspended" : "ok"); },
  role(v, d) { state.roleAsk = d.id; },
  norole() { state.roleAsk = null; },
  async confirmrole(v, d) {
    const u = state.users.find(x => x.id === d.id), next = u.role === "admin" ? "farmer" : "admin";
    await store.setUserRole(u.id, next);
    state.roleAsk = null;
    toast(next === "admin" ? u.name + " est maintenant admin" : u.name + " n'est plus admin");
  },
  async allowreset(v, d) {
    const u = state.users.find(x => x.id === d.id);
    await store.allowReset(digits(u.phone));
    toast(u.name + " peut se réinscrire avec le même numéro et un nouveau mot de passe.");
  }
};
function bumpStat(o, k) { const st = state.stats[digits(o.buyerPhone)]; if (st) st[k] = (st[k] || 0) + 1; }
function needStats(phones) {
  const miss = Array.from(new Set(phones)).filter(p => p && !(p in state.stats));
  if (!miss.length) return;
  miss.forEach(p => { state.stats[p] = null; });
  Promise.all(miss.map(p => store.getBuyerStats(p).then(x => { state.stats[p] = x; }).catch(() => { state.stats[p] = { done: 0, noshow: 0 }; }))).then(() => render());
}
function bump(dir) {
  const p = allProducts().get(state.detail), s = step(p.unit), n = state.qty + dir * s;
  if (n < s) return NO;
  if (n > p.stock) { toast("Stock disponible : " + qtyLabel(p.stock, p.unit)); return NO; }
  state.qty = n;
  $("#qty").textContent = qtyLabel(n, p.unit); $("#total").textContent = money(n * p.price);
  return NO;
}
const loginId = s => String(s).includes("@") ? String(s).trim().toLowerCase() : digits(s);
const forms = {
  async loginform() {
    const f = state.authf, id = loginId(f.login);
    if (!id.includes("@") && !validPhone(id)) throw userError(PHONE_MSG);
    await store.signIn(id, f.password); f.password = ""; state.mode = "sell"; },
  async signupform() {
    const f = state.authf, phone = digits(f.phone);
    if (!f.name.trim() || !f.commune.trim()) throw userError("Indiquez votre nom et votre commune.");
    if (!validPhone(phone)) throw userError(PHONE_MSG);
    if (f.password.length < 6) throw userError("Mot de passe trop court : 6 caractères au minimum.");
    const email = f.email.trim().toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw userError("Cet e-mail n'est pas valide. Corrigez-le ou laissez la case vide.");
    await store.signUp(phone, f.password, { name: f.name.trim(), commune: f.commune.trim(), island: f.island, email });
    f.password = ""; state.mode = "sell"; toast("Inscription envoyée. L'admin doit la valider.");
  },
  async profileform() {
    const f = state.authf;
    if (!f.name.trim() || !f.commune.trim()) throw userError("Indiquez votre nom et votre commune.");
    if (!validPhone(f.phone)) throw userError(PHONE_MSG);
    await store.saveProfile(state.session.uid, { name: f.name.trim(), commune: f.commune.trim(), island: f.island, phone: digits(f.phone) });
  },
  async productform() {
    const f = state.form, name = String(f.name).trim(), price = Number(f.price), stock = Number(f.stock), pt = pointById(f.pointId), me = profile();
    if (!name || !(price > 0) || !(stock >= 0) || f.stock === "") throw userError("Indiquez un nom, un prix et une quantité.");
    if (!pt) throw userError("Choisissez un point de retrait.");
    const data = { farmerId: state.session.uid, farmerName: me.name, farmerPhone: me.phone || "", commune: me.commune, pointId: pt.id, pointName: pt.name, lat: pt.lat, lon: pt.lon, island: pt.island,
      name, cat: f.cat, unit: f.unit, price, stock, detail: String(f.detail || "").trim() };
    const photos = f.photos.map(p => p.url);
    if (f.id) {
      if (photos.length) data.thumb = f.photos[0].thumb;
      await store.updateProduct(f.id, data, photos.length ? photos : null, f.oldCount);
      toast(name + " est mis à jour");
    } else {
      data.thumb = f.photos[0] ? f.photos[0].thumb : "";
      await store.addProduct(data, photos);
      toast(name + " est en vente");
    }
    state.form = null;
  },
  async pointform() {
    const name = state.pointName.trim(), n = state.newPoint;
    if (!name || !n) throw userError("Donnez un nom au point de retrait.");
    await store.addPoint({ farmerId: state.session.uid, name, lat: n.lat, lon: n.lon, island: state.pointIsland || islandOf(n.lat) });
    state.newPoint = null; state.pointName = ""; toast("Point de retrait enregistré");
  }
};
async function run(fn, args) {
  if (state.busy) return;
  let r;
  try {
    r = fn.apply(null, args);
    if (r && typeof r.then === "function") { state.busy = true; r = await r; }
  } catch (e) { fail(e); }
  state.busy = false;
  if (r !== NO) render();
}
document.addEventListener("click", e => {
  unlockAudio();
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled || !act[el.dataset.action]) return;
  run(act[el.dataset.action], [el.dataset.v, el.dataset]);
});
document.addEventListener("submit", e => { e.preventDefault(); if (forms[e.target.id]) run(forms[e.target.id], []); });
document.addEventListener("input", e => {
  const k = e.target.dataset && e.target.dataset.keep;
  if (!k) return;
  const path = k.split("."); let o = state;
  while (path.length > 1) o = o[path.shift()];
  if (!o) return;
  o[path[0]] = e.target.value;
  if (e.target.dataset.live) render();
});
document.addEventListener("change", async e => {
  if (e.target.id !== "n-photo" || !state.form) return;
  const files = Array.from(e.target.files || []), room = 3 - state.form.photos.length, form = state.form;
  const res = await Promise.all(files.slice(0, room).map(compress));
  if (state.form !== form) return;
  const ok = res.filter(Boolean);
  form.photos = form.photos.concat(ok);
  if (ok.length < Math.min(files.length, room)) toast("Une photo n'a pas pu être lue. Essayez un autre format (JPG ou PNG).");
  else if (files.length > room) toast("3 photos au maximum : les autres n'ont pas été ajoutées.");
  render();
});

/* ───────── Alertes ───────── */
let audio = null;
function unlockAudio() {
  if (audio) return;
  try { const A = window.AudioContext || window.webkitAudioContext; if (A) audio = new A(); } catch (e) {}
}
function beep() {
  if (!audio) return;
  try {
    if (audio.state === "suspended") audio.resume();
    [0, 0.22].forEach((t, i) => {
      const o = audio.createOscillator(), g = audio.createGain(), at = audio.currentTime + t;
      o.type = "sine"; o.frequency.value = i ? 1046 : 784;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.3, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
      o.connect(g); g.connect(audio.destination); o.start(at); o.stop(at + 0.22);
    });
  } catch (e) {}
}
function alertUser(title, body, tag) {
  toast(title + " : " + body);
  beep();
  try { if (navigator.vibrate) navigator.vibrate([180, 90, 180]); } catch (e) {}
  if (!("Notification" in window) || Notification.permission !== "granted" || !document.hidden) return;
  const opt = { body, tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png" };
  const plain = () => { try { new Notification(title, opt); } catch (e) {} };
  if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(title, opt)).catch(plain);
  else plain();
}
const appStart = Date.now() - 60000;
let seen = {};
function track(key, list, check) {
  const prev = seen[key];
  seen[key] = new Map(list.map(x => [x.id, x.status]));
  if (!prev) return;
  list.forEach(x => { const m = check(x, prev.has(x.id), prev.get(x.id)); if (m) alertUser(m[0], m[1], key + "-" + x.id); });
}
const isFresh = x => ts(x.createdAt) === Infinity || ts(x.createdAt) > appStart;
const WATCH = {
  farmOrders: (o, had) => !had && o.status === "pending" && isFresh(o) ? ["Nouvelle demande", qtyLabel(o.qty, o.unit) + " de " + o.productName + " pour " + o.buyerName] : null,
  myOrders: (o, had, was) => had && was === "pending" && o.status === "accepted" ? ["Demande acceptée", o.productName + " : retrait " + o.slot + ", " + o.pointName]
    : had && was === "pending" && o.status === "refused" ? ["Demande refusée", o.farmerName + " ne peut pas répondre à votre demande de " + o.productName] : null,
  users: (u, had) => !had && u.status === "pending" && isFresh(u) ? ["Nouvelle inscription", u.name + ", " + u.commune] : null
};
window.addEventListener("online", () => { state.online = true; render(); });
window.addEventListener("offline", () => { state.online = false; render(); });

/* ───────── Démarrage ───────── */
let unsubs = [], subKey = "";
function subscribe() {
  const s = state.session, p = profile();
  const key = [s ? s.uid : "", p ? p.role : "", p ? p.status : ""].join("|");
  if (key === subKey) return;
  subKey = key;
  unsubs.forEach(u => { try { u(); } catch (e) {} });
  unsubs = [];
  state.myOrders = []; state.myProducts = []; state.farmOrders = []; state.allOrders = []; state.users = []; state.blocks = []; state.allBlocks = [];
  seen = {};
  const on = k => list => { if (WATCH[k]) track(k, list, WATCH[k]); state[k] = list; render(); };
  if (s) unsubs.push(store.watchOrders("buyer", s.uid, on("myOrders")));
  if (s && isFarmerOk()) {
    unsubs.push(store.watchMyProducts(s.uid, list => { state.myProducts = list; backfillPhone(list); render(); }));
    unsubs.push(store.watchOrders("farmer", s.uid, on("farmOrders")));
    unsubs.push(store.watchBlocks(s.uid, on("blocks")));
  }
  if (s && isAdmin()) { unsubs.push(store.watchUsers(on("users"))); unsubs.push(store.watchOrders("all", s.uid, on("allOrders"))); unsubs.push(store.watchBlocks("all", on("allBlocks"))); }
}
// Les produits publiés avant l'ajout de WhatsApp n'ont pas le numéro de l'agriculteur : on le complète.
let backfilled = false;
function backfillPhone(list) {
  const ph = profile() && profile().phone;
  if (backfilled || !ph) return;
  backfilled = true;
  list.filter(p => p.farmerPhone !== ph).forEach(p => store.updateProduct(p.id, { farmerPhone: ph }).catch(e => console.error(e)));
}
// Animation d'accueil : seulement à la toute première ouverture, et on peut la passer en touchant l'écran.
function intro(done) {
  const el = $("#intro");
  let seenIntro = false;
  try { seenIntro = localStorage.getItem("maa-intro") === "1"; localStorage.setItem("maa-intro", "1"); } catch (e) { seenIntro = true; }
  if (!el || seenIntro || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) { done(); return; }
  el.querySelector(".intro-title").textContent = APP.name;
  el.hidden = false;
  translateDom(el);
  let gone = false;
  const close = () => { if (gone) return; gone = true; el.classList.add("out"); setTimeout(() => { el.hidden = true; }, 480); done(); };
  el.addEventListener("click", close);
  setTimeout(close, 3200);
}
async function start() {
  // Après l'animation, la présentation s'affiche une seule fois (on peut la revoir avec le bouton ?).
  intro(() => { if (!seenFlag("maa-tuto")) { state.tuto = { kind: "app", i: 0 }; render(); } });
  $("#appname").textContent = APP.name;
  document.title = APP.name;
  try {
    const mod = await import(configured ? "./store-firebase.js" : "./store-local.js");
    store = await mod.createStore();
  } catch (e) {
    console.error(e);
    state.loadError = "Impossible de démarrer. Vérifiez la connexion Internet, puis rechargez la page.";
    render();
    return;
  }
  state.ready = true;
  store.watchCatalogue(list => { state.catalogue = list; render(); });
  store.watchPoints(list => { state.points = list; render(); });
  store.onAuth(s => {
    state.session = s;
    if (s && s.profile && !state.authf.name) Object.assign(state.authf, { name: s.profile.name || "", commune: s.profile.commune || "", island: s.profile.island || APP.islands[0] });
    subscribe();
    render();
  });
  render();
}
start();
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
}
