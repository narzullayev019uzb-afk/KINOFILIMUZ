// ============================================================
// SOZLAMALAR — bu yerga JSONBin.io'dan olingan qiymatlarni qo'ying.
// README.md faylida qadam-baqadam tushuntirilgan (5 daqiqa).
// ============================================================

const JSONBIN_BIN_ID = "6a5ba54ef5f4af5e29a116bc";
const JSONBIN_API_KEY = "$2a$10$6dF6Nk2ptiICNyryyWeuneumk9SnNaxP7uUx3arPjoocYycsYdYG2";

// Admin panelga kirish paroli — buni albatta o'zgartiring!
const ADMIN_PASSWORD = "kinofilmuz2026";

const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

// -------- yordamchi funksiyalar (barcha sahifalarda ishlatiladi) --------
async function fetchMovies(){
  const res = await fetch(`${JSONBIN_URL}/latest`, {
    headers: { "X-Master-Key": JSONBIN_API_KEY }
  });
  if (!res.ok) throw new Error("Ma'lumot bazasidan o'qib bo'lmadi (status " + res.status + ")");
  const json = await res.json();
  return (json.record && json.record.movies) || [];
}

async function saveMovies(movies){
  const res = await fetch(JSONBIN_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": JSONBIN_API_KEY
    },
    body: JSON.stringify({ movies })
  });
  if (!res.ok) throw new Error("Saqlab bo'lmadi (status " + res.status + ")");
  return res.json();
}
