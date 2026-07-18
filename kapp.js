// ============================================================
// KINOFILMUZ — public site logic
// Firestore'dan real vaqtda o'qiydi: admin panelda o'zgartirish
// qilinishi bilan barcha foydalanuvchilarda avtomatik yangilanadi.
// ============================================================

let ALL_MOVIES = [];
let heroIndex = 0;
let heroTimer = null;

const CATEGORY_LABELS = {
  kino: "Kinolar",
  serial: "Seriallar",
  animatsiya: "Animatsiya"
};

const FALLBACK_POSTER = "data:image/svg+xml;utf8," + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="210" height="300">
    <rect width="100%" height="100%" fill="#1c1710"/>
    <text x="50%" y="50%" font-size="42" text-anchor="middle" fill="#d4a94a" dy=".3em">🎬</text>
  </svg>`);

function esc(str){
  const d = document.createElement('div');
  d.innerText = str || '';
  return d.innerHTML;
}

// ---------------- JSONBin sync (yangilanishlarni har 5 soniyada tekshiradi) ----------------
async function loadMovies(){
  try{
    const movies = await fetchMovies();
    // yangi kinolar tepada chiqishi uchun
    ALL_MOVIES = [...movies].reverse();
    renderHero();
    renderRows();
  } catch(err){
    console.error(err);
    document.getElementById('mainContent').innerHTML = `
      <div class="empty-state">
        <h3>Ma'lumot bazasiga ulanib bo'lmadi</h3>
        <p>config.js faylidagi sozlamalarni tekshiring. README.md faylida qo'llanma bor.</p>
      </div>`;
  }
}
loadMovies();
setInterval(loadMovies, 5000); // boshqa foydalanuvchilar qo'shgan o'zgarishlarni ko'rish uchun

// ---------------- Hero carousel ----------------
function renderHero(){
  const featured = ALL_MOVIES.filter(m => m.featured).slice(0, 5);
  const slides = featured.length ? featured : ALL_MOVIES.slice(0, 5);

  const slidesEl = document.getElementById('heroSlides');
  const dotsEl = document.getElementById('heroDots');
  const contentEl = document.getElementById('heroContent');

  if (!slides.length){
    slidesEl.innerHTML = '';
    dotsEl.innerHTML = '';
    contentEl.innerHTML = `
      <div class="hero__eyebrow" style="opacity:1">Xush kelibsiz</div>
      <h1 class="hero__title" style="opacity:1">KINOFILMUZ</h1>
      <p class="hero__desc" style="opacity:1">Hozircha kinolar qo'shilmagan. Admin panel orqali birinchi kinoni qo'shing.</p>`;
    return;
  }

  slidesEl.innerHTML = slides.map((m, i) => `
    <div class="hero__slide ${i === 0 ? 'active' : ''}" data-i="${i}"
         style="background-image:url('${esc(m.backdrop || m.poster || '')}')"></div>
  `).join('');

  dotsEl.innerHTML = slides.map((_, i) => `
    <button class="hero__dot ${i === 0 ? 'active' : ''}" data-i="${i}"></button>
  `).join('');

  dotsEl.querySelectorAll('.hero__dot').forEach(dot => {
    dot.addEventListener('click', () => goToHero(parseInt(dot.dataset.i), slides));
  });

  updateHeroContent(slides[0]);
  clearInterval(heroTimer);
  heroIndex = 0;
  heroTimer = setInterval(() => {
    heroIndex = (heroIndex + 1) % slides.length;
    goToHero(heroIndex, slides);
  }, 6500);
}

function goToHero(i, slides){
  heroIndex = i;
  document.querySelectorAll('.hero__slide').forEach(s => s.classList.toggle('active', parseInt(s.dataset.i) === i));
  document.querySelectorAll('.hero__dot').forEach(d => d.classList.toggle('active', parseInt(d.dataset.i) === i));
  updateHeroContent(slides[i]);
}

function updateHeroContent(m){
  const contentEl = document.getElementById('heroContent');
  contentEl.innerHTML = `
    <div class="hero__eyebrow">${m.category ? '★ ' + (CATEGORY_LABELS[m.category] || '') : '★ Tavsiya etiladi'}</div>
    <h1 class="hero__title">${esc(m.title)}</h1>
    <p class="hero__desc">${esc(m.description || '')}</p>
    <div class="hero__actions">
      <a class="btn btn-primary" href="${esc(m.watchLink || '#')}" target="_blank" rel="noopener">▶ Tomosha qilish</a>
      <button class="btn btn-ghost" onclick="openModal('${m.id}')">Batafsil</button>
    </div>`;
}

// ---------------- Rows by category ----------------
function renderRows(){
  const main = document.getElementById('mainContent');

  if (!ALL_MOVIES.length){
    main.innerHTML = `
      <div class="empty-state">
        <h3>Hali kinolar yo'q</h3>
        <p>Admin panel (admin.html) orqali birinchi kinongizni qo'shing.</p>
      </div>`;
    return;
  }

  const cats = ['kino', 'serial', 'animatsiya'];
  let html = '';

  cats.forEach(cat => {
    const items = ALL_MOVIES.filter(m => m.category === cat);
    if (!items.length) return;
    html += `
      <section class="section" id="${cat}">
        <div class="section__head">
          <h2 class="section__title">${CATEGORY_LABELS[cat]} <small>${items.length} ta</small></h2>
        </div>
        <div class="row-scroll">${items.map(cardHtml).join('')}</div>
      </section>`;
  });

  main.innerHTML = html || `<div class="empty-state"><h3>Natija topilmadi</h3></div>`;
}

function cardHtml(m){
  return `
    <div class="card" onclick="openModal('${m.id}')">
      <div class="card__poster">
        <img src="${esc(m.poster) || FALLBACK_POSTER}" alt="${esc(m.title)}"
             onerror="this.src='${FALLBACK_POSTER}'">
        ${m.year ? `<div class="card__badge">${esc(m.year)}</div>` : ''}
        ${m.rating ? `<div class="card__rating">★ ${esc(m.rating)}</div>` : ''}
        <div class="card__overlay"><div class="card__play">▶</div></div>
      </div>
      <div class="card__title">${esc(m.title)}</div>
      <div class="card__meta">${esc(m.genre || '')}</div>
    </div>`;
}

// ---------------- Search ----------------
document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const main = document.getElementById('mainContent');

  if (!q){
    renderRows();
    return;
  }
  const results = ALL_MOVIES.filter(m =>
    (m.title || '').toLowerCase().includes(q) ||
    (m.genre || '').toLowerCase().includes(q)
  );

  if (!results.length){
    main.innerHTML = `<div class="empty-state"><h3>"${esc(q)}" bo'yicha hech narsa topilmadi</h3></div>`;
    return;
  }

  main.innerHTML = `
    <section class="section">
      <div class="section__head"><h2 class="section__title">Qidiruv natijalari <small>${results.length} ta</small></h2></div>
      <div class="row-scroll" style="flex-wrap:wrap; overflow:visible;">${results.map(cardHtml).join('')}</div>
    </section>`;
});

// ---------------- Modal ----------------
function openModal(id){
  const m = ALL_MOVIES.find(x => x.id === id);
  if (!m) return;
  document.getElementById('modalHero').style.backgroundImage = `url('${m.backdrop || m.poster || ''}')`;
  document.getElementById('modalTitle').innerText = m.title || '';
  document.getElementById('modalDesc').innerText = m.description || 'Tavsif kiritilmagan.';
  document.getElementById('modalTags').innerHTML = [
    m.category ? CATEGORY_LABELS[m.category] : null,
    m.genre, m.year, m.rating ? '★ ' + m.rating : null
  ].filter(Boolean).map(t => `<span class="tag">${esc(t)}</span>`).join('');
  document.getElementById('modalWatchBtn').href = m.watchLink || '#';
  document.getElementById('modalBackdrop').classList.add('open');
}
window.openModal = openModal;

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', (e) => {
  if (e.target.id === 'modalBackdrop') closeModal();
});
function closeModal(){
  document.getElementById('modalBackdrop').classList.remove('open');
}
