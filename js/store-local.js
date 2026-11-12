// Mode démo : mêmes fonctions que store-firebase.js, mais les données restent
// dans le navigateur (localStorage). Utilisé tant que js/config.js n'est pas rempli.
const K = "maa-fenua-demo-v3", KS = "maa-fenua-demo-session";
const now = Date.now();

function seed() {
  const users = {
    f1: { name: "Hinano T.", commune: "Patio", island: "Taha'a", phone: "87000001", role: "farmer", status: "ok", createdAt: now - 9e8 },
    f2: { name: "Manutea R.", commune: "Tapuamu", island: "Taha'a", phone: "87000002", role: "farmer", status: "ok", createdAt: now - 8e8 },
    f3: { name: "Teva M.", commune: "Haamene", island: "Taha'a", phone: "87000003", role: "farmer", status: "ok", createdAt: now - 7e8 },
    f4: { name: "Vaea P.", commune: "Avera", island: "Raiatea", phone: "87000004", role: "farmer", status: "ok", createdAt: now - 6e8 },
    f5: { name: "Tamatoa L.", commune: "Opoa", island: "Raiatea", phone: "87000005", role: "farmer", status: "ok", createdAt: now - 5e8 },
    f6: { name: "Moana F.", commune: "Tevaitoa", island: "Raiatea", phone: "87000006", role: "farmer", status: "pending", createdAt: now - 2e7 },
    f7: { name: "Heiarii T.", commune: "Vaitoare", island: "Taha'a", phone: "87000007", role: "farmer", status: "pending", createdAt: now - 1e7 },
    adm: { name: "Admin démo", commune: "Haamene", island: "Taha'a", phone: "87000000", role: "admin", status: "ok", createdAt: now - 1e9 }
  };
  const points = [
    { id: "p1", farmerId: "f1", name: "Bord de route, Patio", lat: -16.585, lon: -151.490, island: "Taha'a" },
    { id: "p2", farmerId: "f2", name: "Quai de Tapuamu", lat: -16.615, lon: -151.545, island: "Taha'a" },
    { id: "p3", farmerId: "f3", name: "Fa'a'apu de Haamene", lat: -16.636, lon: -151.488, island: "Taha'a" },
    { id: "p4", farmerId: "f4", name: "Stand d'Avera", lat: -16.780, lon: -151.415, island: "Raiatea" },
    { id: "p5", farmerId: "f5", name: "Fa'a'apu d'Opoa", lat: -16.840, lon: -151.368, island: "Raiatea" },
    { id: "p6", farmerId: "f3", name: "Marché d'Uturoa", lat: -16.733, lon: -151.443, island: "Raiatea" }
  ];
  const raw = [
    ["a1", "f3", "p3", "Vanille de Taha'a", "Vanille et épices", "paquet", 5000, 12, "Paquet de 10 gousses"],
    ["a2", "f1", "p1", "Ananas Queen Tahiti", "Fruits", "piece", 300, 40, ""],
    ["a3", "f1", "p1", "Pastèque", "Fruits", "kg", 250, 120, ""],
    ["a4", "f2", "p2", "Bananes", "Fruits", "regime", 1500, 9, ""],
    ["a5", "f3", "p6", "Taro", "Légumes", "kg", 600, 35, ""],
    ["a6", "f4", "p4", "Tomates", "Légumes", "kg", 700, 18, ""],
    ["a7", "f4", "p4", "Concombres", "Légumes", "kg", 300, 25, ""],
    ["a8", "f5", "p5", "Citrons verts", "Fruits", "kg", 500, 30, ""],
    ["a9", "f5", "p5", "Papaye", "Fruits", "piece", 400, 22, ""],
    ["a10", "f2", "p2", "'Uru", "Légumes", "piece", 300, 15, ""],
    ["a11", "f3", "p6", "Pota", "Légumes", "paquet", 300, 20, ""],
    ["a12", "f5", "p5", "Gingembre", "Vanille et épices", "kg", 1200, 8, ""],
    ["a13", "f1", "p1", "Plant de tiare", "Plantes", "pot", 800, 14, "Pot de 2 litres"],
    ["a14", "f4", "p4", "Boutures de monstera", "Plantes", "plant", 500, 10, ""]
  ];
  const products = raw.map((r, i) => {
    const pt = points.find(p => p.id === r[2]), f = users[r[1]];
    return { id: r[0], farmerId: r[1], farmerName: f.name, commune: f.commune, pointId: pt.id, pointName: pt.name, lat: pt.lat, lon: pt.lon, island: pt.island,
      name: r[3], cat: r[4], unit: r[5], price: r[6], stock: r[7], detail: r[8], thumb: "", photoCount: 0, active: true, createdAt: now - 1e6 * (20 - i) };
  });
  const mk = (id, pid, qty, buyer, phone, status, slot, ago) => {
    const p = products.find(x => x.id === pid);
    return { id, productId: pid, productName: p.name, unit: p.unit, price: p.price, qty, total: qty * p.price, farmerId: p.farmerId, farmerName: p.farmerName,
      pointName: p.pointName, lat: p.lat, lon: p.lon, island: p.island, buyerUid: "x-" + buyer, buyerName: buyer, buyerPhone: phone, status, slot, createdAt: now - ago };
  };
  const orders = [
    mk("o1", "a5", 4, "Maeva", "87111111", "pending", "", 4e6),
    mk("o2", "a1", 2, "Rainui", "87222222", "accepted", "jeudi à 7h00", 9e6),
    mk("o3", "a6", 3, "Poema", "87333333", "done", "lundi à 8h00", 2e8),
    mk("o4", "a2", 6, "Maeva", "87111111", "pending", "", 2e6),
    mk("o5", "a11", 5, "Rainui", "87222222", "done", "mardi à 6h30", 1e8)
  ];
  products.forEach(p => { p.farmerPhone = users[p.farmerId].phone; });
  orders.forEach(o => { o.farmerPhone = users[o.farmerId].phone; });
  const stats = { "87111111": { done: 3, noshow: 0, verified: true }, "87222222": { done: 2, noshow: 1, verified: true }, "87333333": { done: 1, noshow: 0, verified: true } };
  return { users, points, products, orders, photos: {}, stats, blocks: [], pw: { "87000003": { uid: "f3", pw: "demo" }, "87000000": { uid: "adm", pw: "demo" } } };
}

export async function createStore() {
  let db;
  try { db = JSON.parse(localStorage.getItem(K)); } catch (e) {}
  if (!db || !db.users) db = seed();
  db.stats = db.stats || {}; db.blocks = db.blocks || [];
  // La session est propre à chaque onglet : on peut ouvrir l'acheteur dans un onglet et l'agriculteur dans un autre.
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem(KS)); } catch (e) {}
  const subs = new Set();
  let authCb = null;
  const id = () => "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const err = code => Object.assign(new Error(code), { code });
  const pushAuth = () => {
    if (!authCb) return;
    if (!session) authCb(null);
    else if (session.anon) authCb({ uid: session.uid, anon: true, profile: null });
    else authCb({ uid: session.uid, anon: false, profile: db.users[session.uid] || null });
  };
  const emit = () => {
    try { localStorage.setItem(K, JSON.stringify(db)); } catch (e) { /* stockage plein : la démo continue en mémoire */ }
    try { sessionStorage.setItem(KS, JSON.stringify(session)); } catch (e) {}
    subs.forEach(f => f());
    pushAuth();
  };
  const sub = f => { subs.add(f); f(); return () => subs.delete(f); };
  // Un autre onglet a modifié la démo : on recharge les données (permet de tester les alertes).
  window.addEventListener("storage", e => {
    if (e.key !== K || !e.newValue) return;
    try { db = JSON.parse(e.newValue); db.stats = db.stats || {}; db.blocks = db.blocks || []; } catch (x) { return; }
    subs.forEach(f => f()); pushAuth();
  });
  const denied = () => err("permission-denied");
  const copy = x => JSON.parse(JSON.stringify(x));

  return {
    mode: "local",
    demoAccounts: { farmer: ["87000003", "demo"], admin: ["87000000", "demo"] },
    reset() { try { localStorage.removeItem(K); sessionStorage.removeItem(KS); } catch (e) {} location.reload(); },

    onAuth(cb) { authCb = cb; pushAuth(); return () => { authCb = null; }; },
    async ensureBuyer() { if (!session) { session = { uid: "buyer-" + id(), anon: true }; emit(); } return session.uid; },
    async signUp(phone, password, profile) {
      if (profile.email && db.pw[profile.email]) throw err("auth/email-already-in-use");
      if (db.pw[phone] && !(db.resetOk && db.resetOk[phone])) throw err("auth/email-already-in-use");
      if (db.resetOk) delete db.resetOk[phone];
      if (password.length < 6) throw err("auth/weak-password");
      const uid = id();
      db.pw[profile.email || phone] = { uid, pw: password };
      db.users[uid] = { name: profile.name, commune: profile.commune, island: profile.island, phone, role: "farmer", status: "pending", createdAt: Date.now() };
      session = { uid, anon: false };
      emit();
    },
    async saveProfile(uid, p) {
      db.users[uid] = { name: p.name, commune: p.commune, island: p.island, phone: p.phone, role: "farmer", status: "pending", createdAt: Date.now() };
      emit();
    },
    async signIn(phone, password) {
      const a = db.pw[phone];
      if (!a || a.pw !== password) throw err("auth/invalid-credential");
      session = { uid: a.uid, anon: false };
      emit();
    },
    async signOut() { session = null; emit(); },
    async resetPassword() { /* démo : aucun e-mail n'est envoyé */ },
    async setUserRole(uid, role) { db.users[uid].role = role; emit(); },
    async allowReset(phone) { db.resetOk = db.resetOk || {}; db.resetOk[phone] = true; emit(); },
    async replaceAccount(oldUid, newUid, role) {
      for (const n of ["products", "points", "orders"]) db[n].forEach(x => { if (x.farmerId === oldUid) x.farmerId = newUid; });
      db.users[newUid].status = "ok"; db.users[newUid].role = role || "farmer";
      delete db.users[oldUid];
      emit();
    },

    watchCatalogue(cb) { return sub(() => cb(copy(db.products.filter(p => p.active)))); },
    watchPoints(cb) { return sub(() => cb(copy(db.points))); },
    watchMyProducts(uid, cb) { return sub(() => cb(copy(db.products.filter(p => p.farmerId === uid)))); },
    watchOrders(kind, uid, cb) {
      return sub(() => cb(copy(db.orders.filter(o => kind === "all" || (kind === "buyer" ? o.buyerUid === uid : o.farmerId === uid)))));
    },
    watchUsers(cb) { return sub(() => cb(Object.keys(db.users).map(k => Object.assign({ id: k }, db.users[k])))); },

    async addProduct(data, photos) {
      const pid = id();
      db.products.push(Object.assign({}, data, { id: pid, active: true, photoCount: photos.length, createdAt: Date.now() }));
      db.photos[pid] = photos;
      emit();
      return pid;
    },
    async updateProduct(pid, patch, photos) {
      const p = db.products.find(x => x.id === pid);
      Object.assign(p, patch);
      if (photos) { db.photos[pid] = photos; p.photoCount = photos.length; }
      emit();
    },
    async deleteProduct(pid) { db.products = db.products.filter(p => p.id !== pid); delete db.photos[pid]; emit(); },
    async getPhotos(pid) { return (db.photos[pid] || []).slice(); },

    async addPoint(data) { db.points.push(Object.assign({ id: id() }, data)); emit(); },
    async deletePoint(pid) { db.points = db.points.filter(p => p.id !== pid); emit(); },

    async createOrder(data) {
      if (db.orders.filter(o => o.buyerUid === data.buyerUid && o.status === "pending").length >= 3) throw denied();
      if (db.blocks.some(b => (b.scope === data.farmerId || b.scope === "all") && (b.key === data.buyerPhone || b.key === "u-" + data.buyerUid))) throw denied();
      db.orders.push(Object.assign({ id: id() }, data, { status: "pending", slot: "", createdAt: Date.now() }));
      emit();
    },
    async acceptOrder(order, slot) {
      const o = db.orders.find(x => x.id === order.id), p = db.products.find(x => x.id === order.productId);
      if (!o || o.status !== "pending") throw err("order-not-pending");
      if (p) p.stock = Math.max(0, p.stock - o.qty);
      o.status = "accepted"; o.slot = slot;
      emit();
    },
    async setOrderStatus(order, status) { db.orders.find(x => x.id === order.id).status = status; emit(); },
    async markDone(order) {
      db.orders.find(x => x.id === order.id).status = "done";
      const s = db.stats[order.buyerPhone] = db.stats[order.buyerPhone] || {}; s.done = (s.done || 0) + 1; s.verified = true;
      emit();
    },
    async markNoShow(order) {
      const o = db.orders.find(x => x.id === order.id), p = db.products.find(x => x.id === order.productId);
      if (p) p.stock += o.qty;
      o.status = "noshow";
      const s = db.stats[order.buyerPhone] = db.stats[order.buyerPhone] || {}; s.noshow = (s.noshow || 0) + 1;
      emit();
    },
    async verifyBuyer(phone) { const s = db.stats[phone] = db.stats[phone] || {}; s.verified = true; emit(); },
    async getBuyerStats(phone) { return Object.assign({ done: 0, noshow: 0 }, db.stats[phone]); },
    async block(scope, o) {
      db.blocks = db.blocks.filter(b => !(b.scope === scope && (b.key === o.buyerPhone || b.key === "u-" + o.buyerUid)));
      db.blocks.push({ id: scope + "_" + o.buyerPhone, scope, key: o.buyerPhone, kind: "phone", uid: o.buyerUid, name: o.buyerName, createdAt: Date.now() });
      db.blocks.push({ id: scope + "_u-" + o.buyerUid, scope, key: "u-" + o.buyerUid, kind: "device", createdAt: Date.now() });
      emit();
    },
    async unblock(bl) { db.blocks = db.blocks.filter(b => b.id !== bl.id && b.id !== bl.scope + "_u-" + bl.uid); emit(); },
    watchBlocks(scope, cb) { return sub(() => cb(copy(db.blocks.filter(b => b.scope === scope)))); },
    async setUserStatus(uid, status) {
      db.users[uid].status = status;
      db.products.forEach(p => { if (p.farmerId === uid) p.active = status === "ok"; });
      emit();
    }
  };
}
