// ============================================================
// KINOFILMUZ — admin panel logic
// ============================================================

const CATEGORY_LABELS = { kino: "Kino", serial: "Serial", animatsiya: "Animatsiya" };
let ALL_MOVIES = [];

// ---------------- Login gate ----------------
// Eslatma: bu faqat oddiy himoya (parolni brauzerda solishtiradi).
// Chinakam xavfsizlik uchun Firebase Authentication ishlatish tavsiya etiladi
// (README.md faylida qo'shimcha ma'lumot bor).
const SESSION_KEY = 'kinofilmuz_admin_session';

function checkLogin(){
  if (sessionStorage.getItem(SESSION_KEY) === 'true'){
    showDashboard();
  }
}
document.getElementById('loginBtn').addEventListener('click', tryLogin);
document.getElementById('passwordInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') tryLogin();
});
function tryLogin(){
  const val = document.getElementById('passwordInput').value;
  if (val === ADMIN_PASSWORD){
    sessionStorage.setItem(SESSION_KEY, 'true');
    showDashboard();
  } else {
    document.getElementById('loginError').innerText = "Parol noto'g'ri. Qayta urinib ko'ring.";
  }
}
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
});
function showDashboard(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  loadAndRender();
  setInterval(loadAndRender, 6000); // boshqa qurilmadan qilingan o'zgarishlarni ko'rish uchun
}
checkLogin();

// ---------------- JSONBin sync ----------------
async function loadAndRender(){
  try{
    ALL_MOVIES = await fetchMovies();
    renderStats();
    renderTable();
  } catch(err){
    document.getElementById('movieTable').innerHTML = `<p style="color:#c9382c;">Xatolik: ${err.message}. config.js faylini tekshiring.</p>`;
  }
}

function renderStats(){
  const total = ALL_MOVIES.length;
  const kino = ALL_MOVIES.filter(m => m.category === 'kino').length;
  const serial = ALL_MOVIES.filter(m => m.category === 'serial').length;
  const anim = ALL_MOVIES.filter(m => m.category === 'animatsiya').length;
  document.getElementById('statsRow').innerHTML = `
    ${statCard(total, "Jami kinolar")}
    ${statCard(kino, "Kinolar")}
    ${statCard(serial, "Seriallar")}
    ${statCard(anim, "Animatsiya")}
  `;
}
function statCard(num, label){
  return `<div class="stat-card"><div class="stat-card__num">${num}</div><div class="stat-card__label">${label}</div></div>`;
}

function esc(str){
  const d = document.createElement('div');
  d.innerText = str || '';
  return d.innerHTML;
}

function renderTable(list){
  const items = list || ALL_MOVIES;
  const table = document.getElementById('movieTable');
  if (!items.length){
    table.innerHTML = `<p style="color:var(--muted-2); text-align:center; padding:24px;">Hali kinolar qo'shilmagan.</p>`;
    return;
  }
  table.innerHTML = items.map(m => `
    <div class="movie-row">
      <img src="${esc(m.poster) || ''}" onerror="this.style.opacity=0">
      <div class="movie-row__info">
        <div class="movie-row__title">${esc(m.title)} ${m.featured ? '⭐' : ''}</div>
        <div class="movie-row__meta">${CATEGORY_LABELS[m.category] || m.category} • ${esc(m.genre || '—')} • ${esc(m.year || '—')} • ★ ${esc(m.rating || '—')}</div>
      </div>
      <div class="movie-row__actions">
        <button class="icon-btn" title="Tahrirlash" onclick="editMovie('${m.id}')">✎</button>
        <button class="icon-btn danger" title="O'chirish" onclick="deleteMovie('${m.id}')">🗑</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('adminSearch').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  renderTable(q ? ALL_MOVIES.filter(m => (m.title || '').toLowerCase().includes(q)) : ALL_MOVIES);
});

// ---------------- Form: add / edit ----------------
const form = document.getElementById('movieForm');
const fields = {
  title: document.getElementById('fTitle'),
  category: document.getElementById('fCategory'),
  genre: document.getElementById('fGenre'),
  year: document.getElementById('fYear'),
  rating: document.getElementById('fRating'),
  featured: document.getElementById('fFeatured'),
  poster: document.getElementById('fPoster'),
  backdrop: document.getElementById('fBackdrop'),
  watchLink: document.getElementById('fWatchLink'),
  desc: document.getElementById('fDesc'),
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const editId = document.getElementById('editId').value;
  const data = {
    title: fields.title.value.trim(),
    category: fields.category.value,
    genre: fields.genre.value.trim(),
    year: fields.year.value.trim(),
    rating: fields.rating.value.trim(),
    featured: fields.featured.checked,
    poster: fields.poster.value.trim(),
    backdrop: fields.backdrop.value.trim(),
    watchLink: fields.watchLink.value.trim(),
    description: fields.desc.value.trim(),
  };
  if (!data.title){ return; }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Saqlanmoqda...';

  try{
    const current = await fetchMovies();
    if (editId){
      const idx = current.findIndex(m => m.id === editId);
      if (idx !== -1) current[idx] = { ...current[idx], ...data };
    } else {
      data.id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
      data.createdAt = Date.now();
      current.push(data);
    }
    await saveMovies(current);
    resetForm();
    loadAndRender();
  } catch(err){
    alert("Xatolik yuz berdi: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = editId ? 'Saqlash' : "+ Qo'shish";
  }
});

function resetForm(){
  form.reset();
  document.getElementById('editId').value = '';
  document.getElementById('formTitle').innerText = "Yangi kino qo'shish";
  document.getElementById('submitBtn').innerText = "+ Qo'shish";
  document.getElementById('cancelEditBtn').style.display = 'none';
}

document.getElementById('cancelEditBtn').addEventListener('click', resetForm);

function editMovie(id){
  const m = ALL_MOVIES.find(x => x.id === id);
  if (!m) return;
  document.getElementById('editId').value = id;
  fields.title.value = m.title || '';
  fields.category.value = m.category || 'kino';
  fields.genre.value = m.genre || '';
  fields.year.value = m.year || '';
  fields.rating.value = m.rating || '';
  fields.featured.checked = !!m.featured;
  fields.poster.value = m.poster || '';
  fields.backdrop.value = m.backdrop || '';
  fields.watchLink.value = m.watchLink || '';
  fields.desc.value = m.description || '';
  document.getElementById('formTitle').innerText = "Kinoni tahrirlash: " + m.title;
  document.getElementById('submitBtn').innerText = "Saqlash";
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.editMovie = editMovie;

async function deleteMovie(id){
  const m = ALL_MOVIES.find(x => x.id === id);
  if (!confirm(`"${m ? m.title : ''}" kinosini o'chirishga aminmisiz?`)) return;
  try{
    const current = await fetchMovies();
    await saveMovies(current.filter(x => x.id !== id));
    loadAndRender();
  } catch(err){
    alert("O'chirishda xatolik: " + err.message);
  }
}
window.deleteMovie = deleteMovie;
