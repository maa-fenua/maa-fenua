// Stockage réel : Firebase Authentication + Cloud Firestore.
// Les photos sont enregistrées dans Firestore (pas de Cloud Storage, donc pas de forfait Blaze).
import { firebaseConfig, APP } from "./config.js";

const V = "12.19.0";
const BASE = "https://www.gstatic.com/firebasejs/" + V + "/";
// Pas d'e-mail demandé à l'agriculteur : le numéro de téléphone sert d'identifiant.
// Firebase exige un format d'e-mail, on en fabrique un qui ne reçoit jamais de message.
const DOMAIN = "@maafenua.example";

export async function createStore() {
  const [A, AU, FS] = await Promise.all([
    import(BASE + "firebase-app.js"),
    import(BASE + "firebase-auth.js"),
    import(BASE + "firebase-firestore.js")
  ]);
  const app = A.initializeApp(firebaseConfig);
  const auth = AU.getAuth(app);
  let db;
  try {
    db = FS.initializeFirestore(app, { localCache: FS.persistentLocalCache({ tabManager: FS.persistentMultipleTabManager() }) });
  } catch (e) {
    db = FS.getFirestore(app);
  }
  const C = n => FS.collection(db, APP.prefix + n);
  const D = (n, id) => FS.doc(db, APP.prefix + n, id);
  const photoCol = pid => FS.collection(db, APP.prefix + "products", pid, "photos");
  const photoDoc = (pid, i) => FS.doc(db, APP.prefix + "products", pid, "photos", String(i));
  const list = snap => snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  const watch = (q, cb) => FS.onSnapshot(q, s => cb(list(s)), e => { console.error(e); cb([]); });

  // Mot de passe oublié : l'admin augmente un compteur pour ce numéro, ce qui permet
  // à l'agriculteur de se réinscrire avec le même numéro (nouvel identifiant interne).
  async function resetCount(phone) {
    try { const s = await FS.getDoc(D("resets", phone)); return s.exists() ? (s.data().n || 0) : 0; } catch (e) { return 0; }
  }
  async function mail(phone) { const n = await resetCount(phone); return phone + (n ? "-" + n : "") + DOMAIN; }

  async function savePhotos(pid, photos, oldCount) {
    for (let i = 0; i < photos.length; i++) await FS.setDoc(photoDoc(pid, i), { i, data: photos[i] });
    for (let i = photos.length; i < (oldCount || 0); i++) await FS.deleteDoc(photoDoc(pid, i));
  }

  return {
    mode: "firebase",

    onAuth(cb) {
      let unsub = null;
      return AU.onAuthStateChanged(auth, u => {
        if (unsub) { unsub(); unsub = null; }
        if (!u) { cb(null); return; }
        if (u.isAnonymous) { cb({ uid: u.uid, anon: true, profile: null }); return; }
        unsub = FS.onSnapshot(D("users", u.uid),
          s => cb({ uid: u.uid, anon: false, profile: s.exists() ? s.data() : null }),
          e => { console.error(e); cb({ uid: u.uid, anon: false, profile: null }); });
      });
    },
    async ensureBuyer() {
      if (auth.currentUser) return auth.currentUser.uid;
      const c = await AU.signInAnonymously(auth);
      return c.user.uid;
    },
    async signUp(phone, password, profile) {
      // Avec un vrai e-mail (facultatif), le compte peut recevoir un lien de réinitialisation.
      const c = await AU.createUserWithEmailAndPassword(auth, profile.email || await mail(phone), password);
      await this.saveProfile(c.user.uid, Object.assign({}, profile, { phone }));
    },
    saveProfile(uid, p) {
      return FS.setDoc(D("users", uid), {
        name: p.name, commune: p.commune, island: p.island, phone: p.phone,
        role: "farmer", status: "pending", createdAt: FS.serverTimestamp()
      });
    },
    async signIn(idf, password) { return AU.signInWithEmailAndPassword(auth, idf.includes("@") ? idf : await mail(idf), password); },
    resetPassword(email) { return AU.sendPasswordResetEmail(auth, email); },
    async allowReset(phone) { const n = await resetCount(phone); await FS.setDoc(D("resets", phone), { n: n + 1 }); },
    // L'agriculteur s'est réinscrit après un mot de passe oublié : on rattache ses produits,
    // points de retrait et demandes au nouveau compte, puis on supprime l'ancien profil.
    async replaceAccount(oldUid, newUid, role) {
      const b = FS.writeBatch(db);
      for (const n of ["products", "points", "orders"]) {
        const s = await FS.getDocs(FS.query(C(n), FS.where("farmerId", "==", oldUid)));
        s.forEach(d => b.update(d.ref, { farmerId: newUid }));
      }
      b.update(D("users", newUid), { status: "ok", role: role || "farmer" });
      b.delete(D("users", oldUid));
      await b.commit();
    },
    signOut() { return AU.signOut(auth); },

    watchCatalogue(cb) { return watch(FS.query(C("products"), FS.where("active", "==", true)), cb); },
    watchPoints(cb) { return watch(C("points"), cb); },
    watchMyProducts(uid, cb) { return watch(FS.query(C("products"), FS.where("farmerId", "==", uid)), cb); },
    watchOrders(kind, uid, cb) {
      if (kind === "all") return watch(C("orders"), cb);
      return watch(FS.query(C("orders"), FS.where(kind === "buyer" ? "buyerUid" : "farmerId", "==", uid)), cb);
    },
    watchUsers(cb) { return watch(C("users"), cb); },

    async addProduct(data, photos) {
      const ref = await FS.addDoc(C("products"), Object.assign({}, data, { active: true, photoCount: photos.length, createdAt: FS.serverTimestamp() }));
      await savePhotos(ref.id, photos, 0);
      return ref.id;
    },
    async updateProduct(id, patch, photos, oldCount) {
      if (photos) patch = Object.assign({}, patch, { photoCount: photos.length });
      await FS.updateDoc(D("products", id), patch);
      if (photos) await savePhotos(id, photos, oldCount);
    },
    async deleteProduct(id, photoCount) {
      for (let i = 0; i < (photoCount || 0); i++) await FS.deleteDoc(photoDoc(id, i));
      await FS.deleteDoc(D("products", id));
    },
    async getPhotos(id) {
      const s = await FS.getDocs(photoCol(id));
      return list(s).sort((a, b) => a.i - b.i).map(x => x.data);
    },

    addPoint(data) { return FS.addDoc(C("points"), Object.assign({}, data, { createdAt: FS.serverTimestamp() })); },
    deletePoint(id) { return FS.deleteDoc(D("points", id)); },

    // Chaque demande en attente occupe une des 3 « places » de l'acheteur (mf_locks/uid_1..3).
    // Les règles Firestore refusent une 4e place : la limite ne peut pas être contournée en modifiant l'app.
    async createOrder(data, usedSlots) {
      let last = null;
      for (const n of [1, 2, 3]) {
        if ((usedSlots || []).includes(n)) continue;
        const ref = FS.doc(C("orders")), lockId = data.buyerUid + "_" + n, b = FS.writeBatch(db);
        b.set(ref, Object.assign({}, data, { status: "pending", slot: "", lockId, createdAt: FS.serverTimestamp() }));
        b.set(D("locks", lockId), { n, buyerUid: data.buyerUid, orderId: ref.id });
        try { await b.commit(); return ref.id; } catch (e) { last = e; if (e.code !== "permission-denied") throw e; }
      }
      throw last || Object.assign(new Error("permission-denied"), { code: "permission-denied" });
    },
    acceptOrder(order, slot) {
      return FS.runTransaction(db, async t => {
        const pr = D("products", order.productId);
        const ps = await t.get(pr);
        if (ps.exists()) t.update(pr, { stock: Math.max(0, (ps.data().stock || 0) - order.qty) });
        t.update(D("orders", order.id), { status: "accepted", slot });
        if (order.lockId) t.delete(D("locks", order.lockId));
      });
    },
    async setOrderStatus(order, status) {
      const b = FS.writeBatch(db);
      b.update(D("orders", order.id), { status });
      if (order.lockId && order.status === "pending") b.delete(D("locks", order.lockId));
      await b.commit();
    },
    async markDone(order) {
      const b = FS.writeBatch(db);
      b.update(D("orders", order.id), { status: "done" });
      if (order.buyerPhone) b.set(D("buyerstats", order.buyerPhone), { done: FS.increment(1), verified: true }, { merge: true });
      await b.commit();
    },
    // L'acheteur n'est pas venu : la quantité revient dans le stock et l'absence est comptée.
    markNoShow(order) {
      return FS.runTransaction(db, async t => {
        const pr = D("products", order.productId);
        const ps = await t.get(pr);
        if (ps.exists()) t.update(pr, { stock: (ps.data().stock || 0) + order.qty });
        t.update(D("orders", order.id), { status: "noshow" });
        if (order.buyerPhone) t.set(D("buyerstats", order.buyerPhone), { noshow: FS.increment(1) }, { merge: true });
      });
    },
    // Le numéro a été vérifié par un agriculteur (appel ou WhatsApp) : valable pour tous les agriculteurs.
    verifyBuyer(phone) { return FS.setDoc(D("buyerstats", phone), { verified: true }, { merge: true }); },
    async getBuyerStats(phone) {
      const s = await FS.getDoc(D("buyerstats", phone));
      return s.exists() ? s.data() : { done: 0, noshow: 0 };
    },
    // Blocage d'un acheteur : par numéro et par appareil. scope = uid de l'agriculteur, ou "all" (admin).
    async block(scope, order) {
      const b = FS.writeBatch(db);
      b.set(D("blocks", scope + "_" + order.buyerPhone), { scope, key: order.buyerPhone, kind: "phone", uid: order.buyerUid, name: order.buyerName, createdAt: FS.serverTimestamp() });
      b.set(D("blocks", scope + "_u-" + order.buyerUid), { scope, key: "u-" + order.buyerUid, kind: "device", createdAt: FS.serverTimestamp() });
      await b.commit();
    },
    async unblock(bl) {
      const b = FS.writeBatch(db);
      b.delete(D("blocks", bl.id));
      if (bl.uid) b.delete(D("blocks", bl.scope + "_u-" + bl.uid));
      await b.commit();
    },
    watchBlocks(scope, cb) { return watch(FS.query(C("blocks"), FS.where("scope", "==", scope)), cb); },

    async setUserStatus(uid, status) {
      await FS.updateDoc(D("users", uid), { status });
      const s = await FS.getDocs(FS.query(C("products"), FS.where("farmerId", "==", uid)));
      if (s.empty) return;
      const b = FS.writeBatch(db);
      s.forEach(d => b.update(d.ref, { active: status === "ok" }));
      await b.commit();
    }
  };
}
