// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · Marketplace.js
//  Бэкенд маркетплейса — чтение каталога из таблиц
// ══════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────
//  Получить все товары маркетплейса
// ──────────────────────────────────────────────────────────────────────
function getMarketplaceProducts() {
  try {
    var rows = _rows(SH.MP_PRODUCTS);
    return _ok(rows);
  } catch(e) { return _err(e.message); }
}

// ──────────────────────────────────────────────────────────────────────
//  Получить один товар с продавцами и отзывами
// ──────────────────────────────────────────────────────────────────────
function getMarketplaceProduct(p) {
  try {
    var product = _findById(SH.MP_PRODUCTS, p.id);
    if (!product) return _err('Товар не найден');

    var sellers = _rows(SH.MP_SELLERS);
    var listings = _rows(SH.MP_LISTINGS).filter(function(l) {
      return String(l.product_id) === String(p.id);
    });
    var reviews = _rows(SH.MP_REVIEWS).filter(function(r) {
      return String(r.product_id) === String(p.id);
    });

    // Разделить листинги на Новые и Б/У, присоединить данные продавцов
    var sellersMap = _buildMap(_sh(SH.MP_SELLERS), 1, 0);
    var sellersNew = [];
    var sellersUsed = [];

    listings.forEach(function(l) {
      var seller = sellers.filter(function(s) { return String(s.id) === String(l.seller_id); })[0];
      var entry = {
        seller_id:  l.seller_id,
        seller:     seller || {},
        price:      Number(l.price),
        in_stock:   String(l.in_stock).toLowerCase() === 'true',
        note:       l.note || '',
      };
      if (l.condition === 'Б/У') {
        sellersUsed.push(entry);
      } else {
        sellersNew.push(entry);
      }
    });

    // Сортировка по цене
    sellersNew.sort(function(a,b) { return a.price - b.price; });
    sellersUsed.sort(function(a,b) { return a.price - b.price; });

    return _ok({
      product: product,
      sellers_new: sellersNew,
      sellers_used: sellersUsed,
      reviews: reviews,
    });
  } catch(e) { return _err(e.message); }
}

// ──────────────────────────────────────────────────────────────────────
//  CRUD операции (для админа) с LockService
// ──────────────────────────────────────────────────────────────────────
function addMarketplaceProduct(p) {
  return _withLock(function() {
    try {
      var id = _append(SH.MP_PRODUCTS, {
        category:    p.category,
        brand:       p.brand,
        name:        p.name,
        description: p.description,
        specs:       p.specs ? JSON.stringify(p.specs) : '{}',
        emoji:       p.emoji || '📱',
        color:       p.color || '#333333',
        rating:      p.rating || 0,
        created_at:  _today(),
      });
      _cDel(['mp_products']);
      return _ok({ id: id });
    } catch(e) { return _err(e.message); }
  });
}

function addMarketplaceSeller(p) {
  return _withLock(function() {
    try {
      var id = _append(SH.MP_SELLERS, {
        name:    p.name,
        address: p.address,
        phone:   p.phone,
        wa:      p.wa,
        rating:  p.rating || 0,
        created_at: _today(),
      });
      _cDel(['mp_sellers']);
      return _ok({ id: id });
    } catch(e) { return _err(e.message); }
  });
}

function addMarketplaceListing(p) {
  return _withLock(function() {
    try {
      var id = _append(SH.MP_LISTINGS, {
        product_id: p.product_id,
        seller_id:  p.seller_id,
        price:      p.price,
        condition:  p.condition || 'Новый',
        in_stock:   p.in_stock !== undefined ? p.in_stock : true,
        note:       p.note || '',
        created_at: _today(),
      });
      _cDel(['mp_listings']);
      return _ok({ id: id });
    } catch(e) { return _err(e.message); }
  });
}

function addMarketplaceReview(p) {
  return _withLock(function() {
    try {
      var id = _append(SH.MP_REVIEWS, {
        product_id: p.product_id,
        author:     p.author,
        rating:     p.rating,
        text:       p.text,
        created_at: _today(),
      });
      _cDel(['mp_reviews']);
      return _ok({ id: id });
    } catch(e) { return _err(e.message); }
  });
}
