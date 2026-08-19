/* =========================================================================
   ENBPA — Division of Commerce & Industry — Economic & MSME Survey (PHQ App)
   Connected to the shared Supabase database. Requires an internet connection.
   ========================================================================= */

const STORAGE_KEY = 'enb_msme_draft_cache_v1'; // local draft-only cache now, not the source of truth
const DRAFT_KEY = 'enb_msme_draft_v1';
const APP_ROLE = (document.body && document.body.dataset.role) || 'hq'; // 'hq' | 'enumerator'
const DISTRICTS = ['Gazelle', 'Kokopo', 'Pomio', 'Rabaul'];
// One distinct color per district, used purely for quick visual scanning
// (dots/badges) — chosen to be distinguishable from each other and from the
// existing green/amber business-status colors used elsewhere in the app.
const DISTRICT_COLORS = {
  'Gazelle': '#3A87AC',
  'Kokopo': '#D68A35',
  'Pomio': '#8058B5',
  'Rabaul': '#C74F45'
};
function districtDotHTML(district) {
  const color = DISTRICT_COLORS[district] || '#9C948A';
  return `<span class="district-dot" style="background:${color}"></span>`;
}
const LLG_BY_DISTRICT = {
  'Gazelle': ['Central Gazelle Rural', 'Inland Baining Rural', 'Lassul Baining Rural', 'Open Bay Rural', 'Livuan Rural', 'Reimber Rural', 'Toma Rural', 'Vunadidir Rural'],
  'Kokopo': ['Bitapaka Rural', 'Duke of York Rural', 'Kokopo-Vunamami Urban', 'Raluana Rural'],
  'Pomio': ['Central Pomio Rural', 'Inland Pomio Rural', 'East Pomio Rural', 'Melkoi Rural', 'Sinivit Rural', 'West Pomio Rural', 'Mamusi Rural'],
  'Rabaul': ['Balanataman Rural', 'Kombiu Rural', 'Rabaul Urban', 'Watom Island Rural']
};
function llgOptionsHTML(district, currentLlg) {
  const list = LLG_BY_DISTRICT[district] || [];
  let opts = `<option value="">${district ? 'Select LLG…' : 'Select district first'}</option>`;
  opts += list.map(llg => `<option value="${esc(llg)}" ${llg === currentLlg ? 'selected' : ''}>${esc(llg)}</option>`).join('');
  // Preserve an existing value that doesn't match the list (older records, imports) rather than silently wiping it
  if (currentLlg && !list.includes(currentLlg)) {
    opts += `<option value="${esc(currentLlg)}" selected>${esc(currentLlg)} (existing entry)</option>`;
  }
  return opts;
}

const WARDS_BY_LLG = {
  'Central Gazelle Rural': ['Napapar 1','Napapar 2','Napapar 3','Napapar 4','Napapar 5','Vunagogo','Takekel','Kadakada','Rakunai','Latlat','Navunaram','Tavui-liu','Malmaluan','Karavia no.1','Karavia no.2','Tavilo Settlement','Talakua','Kerevat Township','Tinganagalip'],
  'Inland Baining Rural': ['Alakasam','Lamarain','Raunsepna','Yayam','Malasaet','Burit','Nanapki','Liaga','Kereba','Vudal','Vunapalading #1','Vunapalading #2','Rangulit','Lamarainam','Mandres','Kulit','Radingi','Kamanakam','Ragaga','Rhungagi','Kadulaung settlement #1','Kadulaung settlement #2','Vungi','Gaulim','Kainagunan','Ivere','Malabonga'],
  'Lassul Baining Rural': ['Takia','Nangasn','Traiwara','Lassul','Puktas','Karo','Panarupkap','Laan','Yalom','Komgi','Naviu/Mamapit','Walmetki','Kolopom Settlement','Warakindam','Morokindam','Mobisberg Plantation'],
  'Open Bay Rural': ['Poniar/Kanako','Mobilum','Matanakunai','Mandrabit','Wilambemki/Poiniara','Open Bay Timbers'],
  'Livuan Rural': ['Rababat','Vunairoto','Kabakada','Nabata/Rakumkubur','Toboina','Raluana #3','Putanagororoi','Vunalir','Ratongor','Vunadavai','Lungalunga','Mei-Livuan','Volavolo/Rasimen'],
  'Reimber Rural': ['Vunalaka','Kuraip','Vunakalkalulu','Raburbur','Taranga','Rakotop','Kikitabu','Vunaulaiting','Totovel','Vunapaka','Rakada','Vunaiting','Ramalmal','Towaleka','Vunakainalama','Ramale'],
  'Vunadidir Rural': ['Gunanur','Rabagi no. 1','Rabagi no. 2','Raim','Rapitok no. 1','Rapitok no.2','Rapitok no.3','Rapitok no.4','Ratavul #1','Vunakabi','Tanaka','Taulil no.1','Taulil no.2','Vunadidir','Ratavul no. 2'],
  'Toma Rural': ['Bitakapuk no.1','Bitakapuk no. 2','Tagitagi no. 1','Tagitagi no. 2','Wairiki no. 1','Wairiki no. 2','Wairiki no. 3','Wairiki no. 4','Viviran no. 1','Viviran no. 2','Vunakaur','Baie','Papalaba','Vunararere','Tamanairik no. 1','Tamanairik no. 2','Rabata','Baitakapuk no. 3'],

  'Balanataman Rural': ['Ratung','Pilapila','Karavia','Ratavul','Volavolo','Nonga','Tavui no.1','Tavui no.2','Tavui no.3','Malaguna no.1','Malaguna no.2','Malaguna no.3','Iawakaka','Rapolo','Raluan no.1','Raluan no.2','Tavana','Valaur','Nonga Base Hospital'],
  'Kombiu Rural': ['Baai','Nodup','Matalau','Rakunat','Rabuana','Korere 1','Korere 2','Talvat','Matupit no. 1','Matupit no. 2','Matupit no. 3','Matupit no. 4','Matupit no. 5'],
  'Rabaul Urban': ['Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','Ward 9','Ward 10','Ward 11','Ward 12','Ward 13','Ward 15'],
  'Watom Island Rural': ['Rakival','Taranata','Valaur','Vunabuk','Vunakabai','Vunaulaiar'],

  'Bitapaka Rural': ['Tavui no.1','Tavui no.2','Ratavul','Balada','Ralubang','Vunabaur','Watwat','Ganai','Marmar','Menebunbun','Bilur','Korai','Kamakamar','Birar','Makurapau','Rainau','Malakuna','Togoro','Tabuna','Katakatai','Londip','Ulaveo'],
  'Duke of York Rural': ['Makada/Nagaila','Molot','Maren','Butlivuan','Waira','Nabual','Inolo Kabatirai','Kumaina','Kabilomo','Urakukur','Kababiai','Mualim','Urian','Palipal','Utuan','Karawara','Urukuk','Pirtop','Nakukur no.1 & 2','Rakanda','Palpal'],
  'Kokopo-Vunamami Urban': ['Karavia','Vunamami','Bitarebarebe','Vunabalbal','Gunanba','Tinganavudu','Malakuna','Ulagunan','Livuan','Ramale','Bitagalip','Kabakaul','Takubar','Palnakuar','Ulaulatava','Vunapope','Ngunguna','Gunanur','Palavirua','Vunamai no.2'],
  'Raluana Rural': ['Raburua','Bitatita','Nugvalian','Barovon','Raluana','Ialakua','Vunatagia','Ranguna','Bitabaur','Vunamurmur','Livuan','Vunaulul','Ralalar','Turagunan','Kunakunai','Ngatur','Tinganalom','Nanuk','Balanataman','Ravat','Talakua'],

  'Melkoi Rural': ['Makmak','Lopun','Simi','Tavolo','Meletong','Uvol','Einahelei','Ruachana','Mininga','Maso','Esletenae','Mainge','Atu','Haumakia','Poio','Pilematana','Lausus','Kenmininga','Warale'],
  'Sinivit Rural': ['Rieit','Arabam','Maranagi','Lemengi','Sanbum','Marambu','Lat','Gar','Marai','Ili','Karong','Sunam','Marunga','Kavudemki','Tol','Sikut','Laup','Ivon/Gore'],
  'West Pomio Rural': ['Gugulena','Malmal','Maginuna','Totongpal','Kaiton','Puapal','Rowan/Malo','Pomai/Mu','Poro/Salel','Irena','Mauna','Lau','Bairaman','Tolel','Palmalmal'],
  'Mamusi Rural': ['Maitao','Serenguna','Paliavulu','Viosopuna','Pokapuna','Bili','Pakia','Okempuna','Kaitoto','Mapuna','Peling','Aona','Yauyau','Kaitou','Kinsena','Ulutu','Kerongkorona','Sivaona','Pepeng','Kangelona'],
  'Central Pomio Rural': ['Parole','Malakur','Kerkernena','Baien (West)','Galue','Marmar','Pomio','Olaipun','Sali','Bovalpun','Kalakuru','Kawa/Pora','Tokai','Matong','Buka','Pulpul','Kavale'],
  'Inland Pomio Rural': ['Pakia','Mile','Mukulu','Malvoni','Muele','Bago','Pakaraman','Birigi','Bagitave','Kapkena','Tuki','Lakiri','Marmu','Masuari','Manigugule','Gelioi','Ngavale'],
  'East Pomio Rural': ['Lamarain','Long','Hoya','Kaukum','Milim','Guma','Klampun','Sampun','Wawas','Bain','Raolman','Ivai','Setwei']
};

function wardOptionsHTML(llg, currentWard) {
  const list = WARDS_BY_LLG[llg] || [];
  let opts = `<option value="">${llg ? 'Select ward…' : 'Select LLG first'}</option>`;
  opts += list.map(w => `<option value="${esc(w)}" ${w === currentWard ? 'selected' : ''}>${esc(w)}</option>`).join('');
  if (currentWard && !list.includes(currentWard)) {
    opts += `<option value="${esc(currentWard)}" selected>${esc(currentWard)} (existing entry)</option>`;
  }
  return opts;
}

// Supabase project: tulezready's enb-msme-survey
const SUPABASE_URL = 'https://lgfdzxcawggxrqvsgzpz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cX_rXW51KpL-k9arZupk9w_6MS9Jlo_';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUSINESS_ACTIVITIES = {
  general: { label: 'Commerce & Services', items: ['Trade store','Wholesale','Fast food outlet','Second hand clothing shop','Liquor / Bottle shop','Bakery','Service station','PMV / Transport / Taxi services','Pest Control','Professional services (accountancy/consultancy)','Tailoring','Coffin Making','Mechanical Workshop','Contracting services','Communication Towers'] },
  dpi: { label: 'DPI — Agriculture & Livestock', items: ['Cocoa Buying / Cocoa dealer','Livestock / Poultry / Cattle','Fresh produce','Cocoa/coconut nursery'] },
  tourism: { label: 'Tourism', items: ['Arts and craft','Guest house / hospitality','Restaurant','Tour operators','Tourism product owners','Sport tourism','Hiking','Bird watching','Homestay'] },
  nrmd: { label: 'Natural Resources (NRMD)', items: ['Nursery','Sawmilling','Mini down streaming (e.g. eaglewood)','Furniture (log to desk/tables)','Logging'] },
  fisheries: { label: 'Fisheries', items: ['Coastal fishing','Sea cucumber dealer','Inland fish farming'] }
};
const REG_FORM_TYPES = ['Company','Business Name','Business Group','Association','Co-operative','Other'];
const LICENSE_TYPES = ['Trading License','Liquor','Cocoa Dealers License','Frozen Goods License','Second hand License','Inflammable Liquids','Dangerous Goods License','Paddlers license','Others'];
const TRAINING_HISTORY_TYPES = ['Start Your Business (SYB)','Improve Your Business (IYB)','Business Awareness','Financial Literacy Training'];
const TRAINING_REQUIRED_TYPES = ['SIYB','Bookkeeping','Cost/Pricing & Financial Planning','Cash flows/Budgeting','Financial Literacy Training'];
const ASSISTANCE_TYPES = ['General Business Advice','Bookkeeping & Business Records','Costing/Pricing & Financial Planning','Cash flows','IPA Registration/Statutory Returns','IRC Statutory Returns','Financial Statement','Business Plan/Loan Proposals'];
const FIXED_CROPS = ['Cocoa','Coconut','Balsa','Coffee','Vanilla'];
const TURNOVER_BRACKETS = [['a','Less than K60,000'],['b','K60,001 – K250,000'],['c','K250,000 – K5,000,000'],['d','Over K5,000,000']];
const EXPENSE_BRACKETS = [['1','Less than K5,000'],['2','K5,001 – K250,000'],['3','K250,001 – K500,000'],['4','Over K500,001']];

const STEP_DEFS = {
  A: { letter: 'A', title: 'Location' },
  B: { letter: 'B', title: 'Employment & Business' },
  C: { letter: 'C', title: 'Business Background' },
  D: { letter: 'D', title: 'Development Assistance' },
  E: { letter: 'E', title: 'Economic Output' },
  F: { letter: 'F', title: 'Cash Crops' },
  G8: { letter: 'C8', title: 'Business Loan' },
  G: { letter: 'G', title: 'Informal Sector' },
  REVIEW: { letter: '✓', title: 'Review & Save' }
};

function stepsForStatus(status) {
  if (status === 'formal') return ['A', 'B', 'C', 'D', 'E', 'F', 'REVIEW'];
  if (status === 'informal') return ['A', 'B', 'F', 'G8', 'G', 'REVIEW'];
  return ['A', 'B', 'F', 'REVIEW'];
}

/* ---------------------------- storage layer ----------------------------
   Read-only district access - recordsCache is populated by whatever each
   view fetches (Dashboard, Records, Summary), never written back. */
function loadRecords() { return recordsCache; }

async function fetchAllRecords() {
  const { data, error } = await sb.from('msme_records').select('data').is('deleted_at', null).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => row.data);
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

/* ------------------------------- app state ------------------------------ */
let draft = null;
let editingExisting = false;
let stepIndex = 0;
let currentView = 'dashboard';
let myDistrict = null; // this login's own district, fetched right after sign-in - the whole app's scope depends on it
let currentDetailId = null; // tracks which record is open, so back/forward can restore it

// Real Android/iOS back-gesture support: every meaningful navigation change
// pushes a browser history entry describing exactly where the person is, so
// pressing back steps through the app's own navigation instead of closing
// it outright. Search-as-you-type and sort changes deliberately don't push -
// that would flood history with entries nobody wants to step back through.
let suppressNavPush = false;
function captureNavState() {
  return {
    view: currentView,
    drillLevel: recordsDrillLevel, drillDistrict: recordsDrillDistrict, drillLLG: recordsDrillLLG, drillWard: recordsDrillWard,
    flaggedCategory, flaggedLLG, flaggedWard, flaggedTitle,
    detailId: currentDetailId,
  };
}
function pushNavState() {
  if (suppressNavPush) return;
  history.pushState(captureNavState(), '');
}
// Re-enters whatever the browser's back/forward already recorded, using the
// same entry-point functions the app normally navigates through - just with
// pushing suppressed, so restoring never creates a duplicate history entry.
async function restoreNavState(state) {
  // Can't usefully restore navigation behind the lock screen - the person
  // needs to sign back in first, and any cached data underneath is stale.
  if (document.body.classList.contains('locked')) return;

  suppressNavPush = true;
  try {
    if (!state || !state.view) { switchView('dashboard'); return; }
    recordsDrillLevel = state.drillLevel || 'districts';
    recordsDrillDistrict = state.drillDistrict || null;
    recordsDrillLLG = state.drillLLG || null;
    recordsDrillWard = state.drillWard || null;
    flaggedCategory = state.flaggedCategory || null;
    flaggedLLG = state.flaggedLLG || null;
    flaggedWard = state.flaggedWard || null;
    flaggedTitle = state.flaggedTitle || null;
    if (state.view === 'detail' && state.detailId) {
      await openDetail(state.detailId);
    } else {
      switchView(state.view);
    }
  } finally {
    suppressNavPush = false;
  }
}
window.addEventListener('popstate', (e) => { restoreNavState(e.state); });
let recordsCache = [];

/* -------------------------------- utils --------------------------------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
function esc(s) { return (s === undefined || s === null) ? '' : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const PREFERS_REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Background photo slideshow - free, keyless image API, no external
// dependency beyond a plain image URL. Two stacked layers crossfade;
// the next photo is preloaded before it's ever shown, so a slow
// connection never shows a half-loaded or blank frame mid-transition.
const BG_SLIDESHOW_QUERIES = [
  'volcano landscape', 'tropical rainforest', 'pacific ocean coastline',
  'coconut palm plantation', 'cocoa plantation', 'coral reef',
  'tropical island aerial', 'rainforest waterfall'
];
function startBackgroundSlideshow() {
  const layerA = document.getElementById('bg-layer-a');
  const layerB = document.getElementById('bg-layer-b');
  if (!layerA || !layerB) return;
  const bgUrl = (q) => `https://www.sourcesplash.com/i/random?q=${encodeURIComponent(q)}&w=1600&h=900`;

  let showingA = true;
  let queryIndex = Math.floor(Math.random() * BG_SLIDESHOW_QUERIES.length);
  layerA.style.backgroundImage = `url("${bgUrl(BG_SLIDESHOW_QUERIES[queryIndex])}")`;
  layerA.classList.add('show');

  if (PREFERS_REDUCED_MOTION) return; // one photo, no rotation

  function advance() {
    queryIndex = (queryIndex + 1) % BG_SLIDESHOW_QUERIES.length;
    const nextLayer = showingA ? layerB : layerA;
    const currentLayer = showingA ? layerA : layerB;
    const img = new Image();
    img.onload = () => {
      nextLayer.style.backgroundImage = `url("${img.src}")`;
      nextLayer.classList.add('show');
      currentLayer.classList.remove('show');
      showingA = !showingA;
    };
    img.onerror = () => { /* one skipped photo - not worth surfacing to the user */ };
    img.src = bgUrl(BG_SLIDESHOW_QUERIES[queryIndex]);
  }
  setInterval(advance, 28000);
}
startBackgroundSlideshow();

// Animates a number counting up to its final value - purely cosmetic, never
// delays the real value from being correct; if the element gets removed or
// re-rendered mid-animation, it simply stops (no error, no orphaned timer).
function animateCountUp(el, target, duration = 700) {
  if (!el) return;
  const value = Number(target) || 0;
  if (PREFERS_REDUCED_MOTION || value === 0) { el.textContent = value; return; }
  const start = performance.now();
  function tick(now) {
    if (!document.body.contains(el)) return; // element was re-rendered away - stop quietly
    const elapsed = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3); // ease-out cubic
    el.textContent = Math.round(eased * value);
    if (elapsed < 1) requestAnimationFrame(tick);
    else el.textContent = value;
  }
  requestAnimationFrame(tick);
}

function skeletonRows(count = 4) {
  return Array.from({ length: count }).map(() => `
    <div class="skeleton-row">
      <div class="skeleton badge"></div>
      <div class="skeleton-lines">
        <div class="skeleton line-1"></div>
        <div class="skeleton line-2"></div>
      </div>
    </div>
  `).join('');
}
function skeletonStatGrid() {
  return `<div class="skeleton-stat-grid">${'<div class="skeleton"></div>'.repeat(4)}</div>`;
}
function skeletonChart() {
  return `<div class="skeleton skeleton-chart"></div>`;
}
// For content built as one large HTML string (like Summary) rather than
// individual element updates - render the number as a data attribute with
// "0" as the placeholder text, then call this once the HTML is in the DOM.
function activateCountUps(root) {
  $all('[data-countup]', root || document).forEach(el => {
    const target = Number(el.dataset.countup) || 0;
    animateCountUp(el, target);
  });
}
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function setPath(obj, path, value) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = value;
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._tm);
  toast._tm = setTimeout(() => t.classList.remove('show'), 2200);
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
// Upload timestamps are worth showing to the minute - unlike a collection
// date, the exact time a record arrived is genuinely useful when tracing
// which batch it came in with.
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/* ------------------------------ navigation ------------------------------- */

// Jumps from Dashboard directly into Records → Summary, optionally
// pre-scoped to a district (matching the scope selector Summary already
// has) and scrolled to a specific anchor once the render completes.
// Jumps from Dashboard straight into Records → the ward list for one LLG.
// District is always myDistrict here - there's only ever one - so this
// skips straight past the LLG-list level Dashboard's own breakdown already
// shows, landing directly on "which wards, how many."
function goToLLGWards(llg) {
  recordsDrillLevel = 'wards';
  recordsDrillDistrict = myDistrict;
  recordsDrillLLG = llg;
  recordsDrillWard = null;
  const searchInput = $('#search-input');
  if (searchInput) searchInput.value = ''; // a leftover query would otherwise hijack this into flat search results
  $all('#records-mode-toggle .chip').forEach(b => b.classList.toggle('active', b.dataset.mode === 'list'));
  $('#records-list-mode').hidden = false;
  $('#records-summary-mode').hidden = true;
  switchView('records');
}

async function goToSummary(opts = {}) {
  switchView('records');
  $all('#records-mode-toggle .chip').forEach(b => b.classList.toggle('active', b.dataset.mode === 'summary'));
  $('#records-list-mode').hidden = true;
  $('#records-summary-mode').hidden = false;
  // District is always myDistrict, read directly by renderRecordsSummary -
  // only LLG/Ward narrowing ever needs resetting here.
  renderRecordsSummary._llg = null;
  renderRecordsSummary._ward = null;
  await renderRecordsSummary();
  if (opts.scrollTo) {
    const el = document.getElementById(opts.scrollTo);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function switchView(view) {
  currentView = view;
  const twoPane = window.innerWidth >= 900 && view === 'detail';
  document.body.classList.toggle('two-pane', twoPane);
  ['dashboard', 'records', 'detail', 'transfer', 'dataquality'].forEach(v => {
    let shouldHide = (v !== view);
    if (twoPane && v === 'records') shouldHide = false; // keep the list visible alongside the detail panel
    $('#view-' + v).hidden = shouldHide;
  });
  $all('.bottomnav button').forEach(b => b.classList.remove('active'));
  const map = { dashboard: 'dashboard', records: 'records', detail: 'records', transfer: 'transfer' };
  const navBtn = $all('.bottomnav button').find(b => b.dataset.view === map[view]);
  if (navBtn) navBtn.classList.add('active');
  window.scrollTo(0, 0);
  if (view === 'dashboard') renderDashboard();
  if (view === 'records' || twoPane) renderRecordsList();
  if (view === 'transfer') renderTransfer();
  if (view === 'dataquality') renderDataQuality();
  pushNavState();
}

$all('.bottomnav button').forEach(btn => {
  btn.addEventListener('click', () => {
    switchView(btn.dataset.view);
  });
});

async function fetchRecordById(id) {
  const { data, error } = await sb.from('msme_records').select('data, created_at').eq('id', id).single();
  if (error) throw error;
  return { ...data.data, _uploadedAt: data.created_at };
}

/* ------------------------------- dashboard -------------------------------- */
async function renderDashboard() {
  const dEl = $('#district-breakdown');
  const rEl = $('#recent-list');
  dEl.innerHTML = skeletonRows(4);
  rEl.innerHTML = skeletonRows(3);

  let stats;
  try {
    const { data, error } = await sb.rpc('get_dashboard_stats');
    if (error) throw error;
    stats = data;
  } catch (e) {
    console.error('Failed to load dashboard stats:', e);
    dEl.innerHTML = `<div class="review-line"><span class="k">Could not load — check your connection</span><span class="v"></span></div>
      <button class="btn btn-outline btn-full" style="margin-top:10px;" id="btn-retry-dashboard">Retry</button>`;
    const retryBtn = $('#btn-retry-dashboard');
    if (retryBtn) retryBtn.addEventListener('click', renderDashboard);
    return;
  }

  $('#record-count-pill').textContent = stats.total;
  animateCountUp($('#stat-total'), stats.total);
  animateCountUp($('#stat-week'), stats.this_week);
  animateCountUp($('#stat-formal'), stats.formal);
  animateCountUp($('#stat-informal'), stats.informal);

  // Formal/Informal jump straight to the matching composition section in
  // Summary. Total records and This week are deliberately left as plain
  // numbers for now - discussed and agreed those need their own decisions
  // first (records list vs. aggregate view, and whether "this week" becomes
  // a real time-scope alongside the existing geographic one).
  $('#stat-formal').closest('.stat-card').classList.add('clickable');
  $('#stat-formal').closest('.stat-card').onclick = () => goToSummary({ scrollTo: 'summary-status-anchor' });
  $('#stat-informal').closest('.stat-card').classList.add('clickable');
  $('#stat-informal').closest('.stat-card').onclick = () => goToSummary({ scrollTo: 'summary-status-anchor' });

  try {
    const officialLLGs = LLG_BY_DISTRICT[myDistrict] || [];
    const { data, error } = await sb.rpc('get_llg_overview', { p_district: myDistrict, p_official_llgs: officialLLGs });
    if (error) throw error;
    const rows = data || [];
    dEl.innerHTML = rows.map(r => `
      <div class="review-line clickable" data-llg="${esc(r.llg)}"><span class="k">${esc(r.llg)}</span><span class="v">${r.total}</span></div>
    `).join('');
    $all('#district-breakdown .review-line').forEach(el => {
      el.addEventListener('click', () => goToLLGWards(el.dataset.llg));
    });
  } catch (e) {
    console.error('Failed to load LLG breakdown:', e);
    dEl.innerHTML = `<div class="review-line"><span class="k">Could not load — check your connection</span><span class="v"></span></div>`;
  }

  const recent = stats.recent || [];
  if (recent.length === 0) {
    rEl.innerHTML = `<div class="empty-state"><div class="icon">🗂️</div><p>No records yet.<br>They'll appear here once enumerators upload from the field.</p></div>`;
  } else {
    rEl.innerHTML = recent.map(recordItemHTML).join('');
    $all('#recent-list .record-item').forEach(el => el.addEventListener('click', () => openDetail(el.dataset.id)));
  }
}

// Records are always named District, LLG, Ward, Household — in that order —
// so they're easy to scan and locate regardless of business name (which may
// not exist for informal/no-business households).
function recordDisplayName(r) {
  const parts = [];
  if (r.location.district) parts.push(r.location.district);
  if (r.location.llg) parts.push(r.location.llg);
  if (r.location.ward) parts.push('Ward ' + r.location.ward);
  if (r.location.householdNo) parts.push('HH ' + r.location.householdNo);
  return parts.length ? parts.join(', ') : (r.business.name || 'Unnamed record');
}

function recordItemHTML(r) {
  const status = r.businessStatus || 'none';
  const initials = (r.location.village || r.location.district || '?').slice(0, 2).toUpperCase();
  const title = recordDisplayName(r);
  const sub = [r.location.village, r.business.name].filter(Boolean).join(' · ') || 'No further detail';
  const statusLabel = status === 'formal' ? 'Formal' : status === 'informal' ? 'Informal' : 'No business';
  const uploadedLine = r._uploadedAt
    ? `<strong>Uploaded:</strong> ${fmtDateTime(r._uploadedAt)}`
    : `<strong>Uploaded:</strong> —`;
  return `<div class="record-item" data-id="${r.id}">
    <div class="badge ${status}">${esc(initials)}</div>
    <div class="info">
      <strong>${districtDotHTML(r.location.district)}${esc(title)}</strong>
      <span>${esc(sub)}</span>
      <span class="record-dates"><strong>Collected:</strong> ${fmtDate(r.location.dateCollected)} &nbsp;&middot;&nbsp; ${uploadedLine}</span>
    </div>
    <div class="status-tag ${status}">${statusLabel}</div>
  </div>`;
}

/* ------------------------------ records list ------------------------------ */
const RECORDS_PAGE_SIZE = 50;
let recordsDrillLevel = 'llgs'; // 'llgs' | 'wards' | 'flagged' - no 'districts' level, there's only ever one
let recordsDrillDistrict = null; // set to myDistrict once login completes
let recordsDrillLLG = null;
let recordsDrillWard = null;
// State for the Data Quality "click through to actual records" flow - a
// pseudo drill-level alongside the normal district/llg/ward hierarchy.
let flaggedCategory = null, flaggedLLG = null, flaggedWard = null, flaggedTitle = null;

async function renderFlaggedRecords() {
  const breadcrumbEl = $('#records-breadcrumb');
  if (breadcrumbEl) breadcrumbEl.innerHTML = `<button class="btn btn-outline btn-sm" id="btn-flagged-back">‹ Back to Data Quality</button> <strong style="margin-left:8px;">${esc(flaggedTitle || 'Flagged Records')}</strong>`;
  const backBtn = $('#btn-flagged-back');
  if (backBtn) backBtn.addEventListener('click', () => switchView('dataquality'));

  const container = $('#records-list-container');
  container.innerHTML = skeletonRows(5);
  try {
    const { data, error } = await sb.rpc('get_flagged_records', { p_category: flaggedCategory, p_llg: flaggedLLG || null, p_ward: flaggedWard || null });
    if (error) throw error;
    const list = (data || []).map(row => ({ ...row.data, _uploadedAt: row.created_at }));
    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">✅</div><p>No records currently match this — it may have already been corrected.</p></div>`;
    } else {
      container.innerHTML = list.map(recordItemHTML).join('');
      $all('.record-item', container).forEach(el => el.addEventListener('click', () => openDetail(el.dataset.id)));
    }
  } catch (e) {
    console.error('Failed to load flagged records:', e);
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Could not load — check your connection.</p>
      <button class="btn btn-outline" id="btn-retry-flagged">Retry</button></div>`;
    const retryBtn = $('#btn-retry-flagged');
    if (retryBtn) retryBtn.addEventListener('click', renderFlaggedRecords);
  }
}

// Sets the flagged-records state, then switches into Records/List mode -
// mirrors goToDistrictLLGs' established pattern exactly, including clearing
// any leftover search text that would otherwise hijack the view.
function goToFlaggedRecords(category, llg, ward, title) {
  recordsDrillLevel = 'flagged';
  flaggedCategory = category;
  flaggedLLG = llg || null;
  flaggedWard = ward || null;
  flaggedTitle = title;
  const searchInput = $('#search-input');
  if (searchInput) searchInput.value = '';
  $all('#records-mode-toggle .chip').forEach(b => b.classList.toggle('active', b.dataset.mode === 'list'));
  $('#records-list-mode').hidden = false;
  $('#records-summary-mode').hidden = true;
  switchView('records');
}

function drillInto(level, district, llg) {
  recordsDrillLevel = level;
  if (district !== undefined) recordsDrillDistrict = district;
  if (llg !== undefined) recordsDrillLLG = llg;
  renderRecordsList._page = 1;
  renderRecordsList._resetPage = false;
  renderRecordsList();
  pushNavState();
}

function renderBreadcrumb() {
  const el = $('#records-breadcrumb');
  if (!el) return;
  if (recordsDrillLevel === 'llgs') { el.innerHTML = ''; return; }

  const backTarget = recordsDrillLevel === 'wards' ? 'llgs' : 'wards';
  const parts = [`<a data-nav="llgs">${esc(recordsDrillDistrict)}</a>`];
  if (recordsDrillLLG) parts.push(`<span>›</span><a data-nav="wards">${esc(recordsDrillLLG)}</a>`);

  el.innerHTML = `
    <button class="btn btn-outline" id="btn-records-back" style="padding:7px 12px; font-size:12.5px; margin-bottom:8px;">‹ Back</button>
    <div class="records-breadcrumb">${parts.join(' ')}</div>
  `;
  $('#btn-records-back').addEventListener('click', () => {
    if (backTarget === 'llgs') drillInto('llgs', recordsDrillDistrict, null);
    else if (backTarget === 'wards') drillInto('wards', recordsDrillDistrict, recordsDrillLLG);
  });
  $all('a[data-nav]', el).forEach(a => a.addEventListener('click', () => {
    const nav = a.dataset.nav;
    if (nav === 'llgs') drillInto('llgs', recordsDrillDistrict, null);
    else if (nav === 'wards') drillInto('wards', recordsDrillDistrict, recordsDrillLLG);
  }));
}

function drillRowHTML(label, total, lastUploaded, colorDot) {
  const isRecent = lastUploaded && (Date.now() - new Date(lastUploaded).getTime()) < 48 * 60 * 60 * 1000;
  const dateLine = lastUploaded
    ? `<div class="drill-recent${isRecent ? '' : ' drill-older'}"><span class="dot"></span>Last uploaded: ${fmtDate(lastUploaded)}</div>`
    : `<div class="drill-recent drill-none">No uploads yet</div>`;
  return `<div class="record-item drill-row" data-value="${esc(label)}">
    <div class="info"><strong>${colorDot || ''}${esc(label)}</strong>${dateLine}</div>
    <div class="stacked-total-badge">${total}</div>
    <div class="chev">›</div>
  </div>`;
}

async function renderRecordsList() {
  const q = ($('#search-input').value || '').trim();
  $('#records-breadcrumb').innerHTML = '';

  if (q) {
    await renderFlatSearch(q);
    return;
  }
  if (recordsDrillLevel === 'flagged') return renderFlaggedRecords();
  if (recordsDrillLevel === 'llgs') return renderLLGLevel();
  if (recordsDrillLevel === 'wards') return renderWardLevel();
  return renderRecordsAtWard();
}

async function renderLLGLevel() {
  renderBreadcrumb();
  const container = $('#records-list-container');
  container.innerHTML = skeletonRows(5);
  try {
    const officialLLGs = LLG_BY_DISTRICT[recordsDrillDistrict] || [];
    const { data, error } = await sb.rpc('get_llg_overview', { p_district: recordsDrillDistrict, p_official_llgs: officialLLGs });
    if (error) throw error;
    const rows = data || [];
    container.innerHTML = rows.map(r => drillRowHTML(r.llg, r.total, r.last_uploaded)).join('');
    $all('.drill-row', container).forEach(el => el.addEventListener('click', () => drillInto('wards', recordsDrillDistrict, el.dataset.value)));
  } catch (e) {
    console.error('Failed to load LLG overview:', e);
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Could not load — check your connection.</p>
      <button class="btn btn-outline" id="btn-retry-records">Retry</button></div>`;
    const retryBtn = $('#btn-retry-records');
    if (retryBtn) retryBtn.addEventListener('click', renderRecordsList);
  }
}

async function renderWardLevel() {
  renderBreadcrumb();
  const container = $('#records-list-container');
  container.innerHTML = skeletonRows(5);
  try {
    const officialWards = WARDS_BY_LLG[recordsDrillLLG] || [];
    const { data, error } = await sb.rpc('get_ward_overview', { p_llg: recordsDrillLLG, p_official_wards: officialWards });
    if (error) throw error;
    const rows = data || [];
    container.innerHTML = rows.map(r => drillRowHTML(r.ward, r.total, r.last_uploaded)).join('');
    $all('.drill-row', container).forEach(el => el.addEventListener('click', () => {
      recordsDrillWard = el.dataset.value;
      drillInto('records', recordsDrillDistrict, recordsDrillLLG);
    }));
  } catch (e) {
    console.error('Failed to load ward overview:', e);
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Could not load — check your connection.</p>
      <button class="btn btn-outline" id="btn-retry-records">Retry</button></div>`;
    const retryBtn = $('#btn-retry-records');
    if (retryBtn) retryBtn.addEventListener('click', renderRecordsList);
  }
}

function getSortConfig() {
  const sel = $('#sort-select');
  const value = sel ? sel.value : 'uploaded_desc';
  switch (value) {
    case 'uploaded_asc': return { column: 'created_at', ascending: true };
    case 'collected_desc': return { column: 'date_collected', ascending: false };
    case 'collected_asc': return { column: 'date_collected', ascending: true };
    // household_no is free text ("11 Room 19" for multi-unit dwellings, etc.)
    // - sorting the raw column would order it alphabetically, not
    // numerically. household_no_sort_key extracts just the leading number
    // for a genuinely numeric sort without ever touching the original text.
    case 'household_asc': return { column: 'household_no_sort_key', ascending: true };
    case 'household_desc': return { column: 'household_no_sort_key', ascending: false };
    case 'uploaded_desc': default: return { column: 'created_at', ascending: false };
  }
}

async function renderRecordsAtWard() {
  renderBreadcrumb();
  if (renderRecordsList._resetPage !== false) renderRecordsList._page = 1;
  renderRecordsList._resetPage = true;
  const page = renderRecordsList._page || 1;

  const container = $('#records-list-container');
  container.innerHTML = skeletonRows(5);

  try {
    const sortConfig = getSortConfig();
    let query = sb.from('msme_records').select('data, created_at', { count: 'exact' }).is('deleted_at', null)
      .eq('district', recordsDrillDistrict).eq('llg', recordsDrillLLG).eq('ward', recordsDrillWard)
      .order(sortConfig.column, { ascending: sortConfig.ascending });
    query = query.range(0, page * RECORDS_PAGE_SIZE - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    const list = (data || []).map(row => ({ ...row.data, _uploadedAt: row.created_at }));

    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>No records found.</p></div>`;
    } else {
      let html = list.map(recordItemHTML).join('');
      if (list.length < count) {
        html += `<button class="btn btn-outline btn-full" id="btn-load-more-records">Load more (${count - list.length} remaining)</button>`;
      }
      container.innerHTML = html;
      $all('.record-item', container).forEach(el => el.addEventListener('click', () => openDetail(el.dataset.id)));
      const loadMoreBtn = $('#btn-load-more-records');
      if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => {
        renderRecordsList._page = page + 1;
        renderRecordsList._resetPage = false;
        renderRecordsList();
      });
    }
  } catch (e) {
    console.error('Failed to load records:', e);
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Could not load records — check your connection.</p>
      <button class="btn btn-outline" id="btn-retry-records">Retry</button></div>`;
    const retryBtn = $('#btn-retry-records');
    if (retryBtn) retryBtn.addEventListener('click', () => { renderRecordsList._resetPage = false; renderRecordsList(); });
  }
}

async function renderFlatSearch(q) {
  if (renderRecordsList._resetPage !== false) renderRecordsList._page = 1;
  renderRecordsList._resetPage = true;
  const page = renderRecordsList._page || 1;

  const container = $('#records-list-container');
  container.innerHTML = skeletonRows(5);

  try {
    const term = `%${q}%`;
    const sortConfig = getSortConfig();
    let query = sb.from('msme_records').select('data, created_at', { count: 'exact' }).is('deleted_at', null)
      .or(`village.ilike.${term},household_no.ilike.${term},contact_person.ilike.${term},business_name.ilike.${term},ward.ilike.${term},llg.ilike.${term}`)
      .order(sortConfig.column, { ascending: sortConfig.ascending });
    query = query.range(0, page * RECORDS_PAGE_SIZE - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    const list = (data || []).map(row => ({ ...row.data, _uploadedAt: row.created_at }));

    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>No matching records.</p></div>`;
    } else {
      let html = list.map(recordItemHTML).join('');
      if (list.length < count) {
        html += `<button class="btn btn-outline btn-full" id="btn-load-more-records">Load more (${count - list.length} remaining)</button>`;
      }
      container.innerHTML = html;
      $all('.record-item', container).forEach(el => el.addEventListener('click', () => openDetail(el.dataset.id)));
      const loadMoreBtn = $('#btn-load-more-records');
      if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => {
        renderRecordsList._page = page + 1;
        renderRecordsList._resetPage = false;
        renderRecordsList();
      });
    }
  } catch (e) {
    console.error('Failed to load search results:', e);
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Could not load — check your connection.</p>
      <button class="btn btn-outline" id="btn-retry-records">Retry</button></div>`;
    const retryBtn = $('#btn-retry-records');
    if (retryBtn) retryBtn.addEventListener('click', () => { renderRecordsList._resetPage = false; renderRecordsList(); });
  }
}
let searchDebounceTimer = null;
$('#search-input').addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(renderRecordsList, 200);
});
$('#sort-select').addEventListener('change', () => {
  renderRecordsList();
});

/* ------------------------------ records summary (all roles) ------------------------------ */
$('#records-mode-toggle').style.display = 'flex';
$all('#records-mode-toggle .chip').forEach(btn => btn.addEventListener('click', () => {
  $all('#records-mode-toggle .chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const mode = btn.dataset.mode;
  $('#records-list-mode').hidden = (mode !== 'list');
  $('#records-summary-mode').hidden = (mode !== 'summary');
  if (mode === 'summary') renderRecordsSummary();
}));

function tallyEntries(tallyObj) {
  return Object.entries(tallyObj).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
}

function marketPricesCardHTML(marketPrices) {
  const commodities = ['Cocoa', 'Coconut/Copra', 'Coffee'];
  const cards = commodities.map(c => {
    const d = marketPrices[c];
    if (!d) {
      return `<div class="stat-card"><div class="num">—</div><div class="lbl">${esc(c)}<br><span style="font-weight:400; font-size:11px;">No observations yet</span></div></div>`;
    }
    return `<div class="stat-card">
      <div class="num">K${d.avg_price}</div>
      <div class="lbl">${esc(c)} — avg/kg (last 30 days)<br>
        <span style="font-weight:400; font-size:11px;">${d.observation_count} observation(s) · latest K${d.latest_price} at ${esc(d.latest_location)}, ${fmtDate(d.latest_date)}</span>
      </div>
    </div>`;
  }).join('');

  return `<div class="review-block card">
    <h4>Local Market Prices</h4>
    <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">Manually logged from actual market visits — averaged over the last 30 days per commodity.</p>
    <div class="stat-grid" style="margin-bottom:10px;">${cards}</div>
    <button class="btn btn-outline btn-full" id="btn-toggle-price-form">+ Log a Price Observation</button>
    <div id="price-observation-form" hidden style="margin-top:12px;">
      <div class="field"><label>Commodity</label>
        <select id="price-commodity-select">
          <option value="Cocoa">Cocoa</option>
          <option value="Coconut/Copra">Coconut/Copra</option>
          <option value="Coffee">Coffee</option>
        </select>
      </div>
      <div class="field-row">
        <div class="field"><label>Price per kg (K)</label><input type="number" id="price-value-input" step="0.01" min="0.01" placeholder="e.g. 8.75"></div>
        <div class="field"><label>Date</label><input type="date" id="price-date-input" value="${todayStr()}"></div>
      </div>
      <div class="field"><label>Market / Location</label><input type="text" id="price-location-input" placeholder="e.g. Kokopo Market"></div>
      <div class="field"><label>Notes (optional)</label><textarea id="price-notes-input" placeholder="Buyer name, quality grade, anything worth noting"></textarea></div>
      <div class="lock-error" id="price-form-error"></div>
      <button class="btn btn-primary btn-full" id="btn-save-price-observation">Save Observation</button>
    </div>
  </div>`;
}

// PNG-specific smallholder yield averages, dry/processed weight per tree per
// year - cocoa as dry bean, coconut as copra, coffee as dry parchment
// (matching whichever processed stage local prices are actually quoted
// against, per discussion). These are provincial averages standing in for
// ENB specifically, not measured ENB data - genuinely useful for spotting
// relative potential between LLGs, not a precise per-farm prediction.
const CROP_YIELD_PER_TREE_KG = { 'Cocoa': 0.38, 'Coconut': 7.7, 'Coffee': 0.43 };
const CROP_TO_PRICE_COMMODITY = { 'Cocoa': 'Cocoa', 'Coconut': 'Coconut/Copra', 'Coffee': 'Coffee' };

function priceComparisonCardHTML(priceComparison, marketPrices, cashCrops) {
  const byCommodity = {};
  (priceComparison || []).forEach(p => { byCommodity[p.commodity] = p; });
  const commodities = ['Cocoa', 'Coconut/Copra', 'Coffee'];

  const rows = commodities.map(c => {
    const p = byCommodity[c] || {};
    const hasBoth = p.local_price_pgk_kg != null && p.intl_price_pgk_kg != null;
    const ratioColor = !hasBoth ? 'var(--text-muted)' : (p.ratio_pct >= 90 ? 'var(--primary)' : p.ratio_pct >= 60 ? 'var(--accent-dark)' : 'var(--danger)');

    // Connects this commodity's price back to actual tree counts reported
    // in Section F for whatever scope is currently selected.
    const cropKey = Object.keys(CROP_TO_PRICE_COMMODITY).find(k => CROP_TO_PRICE_COMMODITY[k] === c);
    const treeCount = cropKey && cashCrops && cashCrops[cropKey] ? Number(cashCrops[cropKey].trees) || 0 : 0;
    const yieldPerTree = cropKey ? CROP_YIELD_PER_TREE_KG[cropKey] : null;
    let estimateHTML = '';
    if (treeCount > 0 && yieldPerTree) {
      const estKg = treeCount * yieldPerTree;
      const estKgRounded = Math.round(estKg);
      const localPrice = p.local_price_pgk_kg;
      const estValue = localPrice != null ? Math.round(estKg * localPrice) : null;
      estimateHTML = `<div style="background:var(--surface-2); border-radius:8px; padding:10px 12px; margin-top:10px;">
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--text-muted); margin-bottom:4px;">Estimated Production (from reported trees)</div>
        <div style="font-size:13px;">${treeCount.toLocaleString()} tree(s) reported \u00d7 ${yieldPerTree} kg/tree \u2248 <strong>${estKgRounded.toLocaleString()} kg</strong> ${esc(cropKey === 'Coffee' ? 'dry parchment' : cropKey === 'Coconut' ? 'copra' : 'dry beans')}/year</div>
        ${estValue != null ? `<div style="font-size:13px; margin-top:2px;">At local price: \u2248 <strong>K${estValue.toLocaleString()}</strong>/year</div>` : `<div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Log a local price above to estimate value</div>`}
        <div style="font-size:10px; color:var(--text-muted); margin-top:5px; font-style:italic;">Based on a provincial smallholder average yield, not measured ENB data — a rough estimate, not a precise figure.</div>
      </div>`;
    }

    return `<div class="review-block" style="margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid var(--border);">
      <h5 style="margin:0 0 8px; font-size:13.5px; font-weight:700; color:var(--primary-dark);">${esc(c)}</h5>
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr); gap:8px;">
        <div class="stat-card" style="padding:10px;"><div class="num" style="font-size:18px;">${p.local_price_pgk_kg != null ? 'K' + p.local_price_pgk_kg : '—'}</div><div class="lbl" style="font-size:10.5px;">Local /kg</div></div>
        <div class="stat-card" style="padding:10px;"><div class="num" style="font-size:18px;">${p.intl_price_pgk_kg != null ? 'K' + p.intl_price_pgk_kg : '—'}</div><div class="lbl" style="font-size:10.5px;">International /kg (converted)</div></div>
        <div class="stat-card" style="padding:10px; border-color:${ratioColor};"><div class="num" style="font-size:18px; color:${ratioColor};">${p.ratio_pct != null ? p.ratio_pct + '%' : '—'}</div><div class="lbl" style="font-size:10.5px;">Local as % of intl.</div></div>
      </div>
      ${p.intl_price_usd_tonne != null ? `<p style="font-size:11px; color:var(--text-muted); margin:8px 0 0;">International: $${p.intl_price_usd_tonne}/tonne${p.exchange_rate ? ` · converted at $1 = K${p.exchange_rate}${p.exchange_rate_date ? ' (' + fmtDate(p.exchange_rate_date) + ')' : ''}` : ' · no exchange rate on file yet'}</p>` : ''}
      ${estimateHTML}
    </div>`;
  }).join('');

  return `<div class="review-block card">
    <h4>Local vs. International Prices</h4>
    <p style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">International prices are entered manually by PHQ, converted to PGK per kg using the most recent exchange rate on file.</p>
    ${rows}
  </div>`;
}

function barBlockHTML(title, pairs, opts = {}) {
  const max = Math.max(1, ...pairs.map(([, v]) => Number(v) || 0));
  const rows = pairs.map(([label, value]) => {
    const pct = Math.round(((Number(value) || 0) / max) * 100);
    return `<div class="chart-row">
      <div class="chart-label">${esc(label)}</div>
      <div class="chart-track"><div class="chart-fill${opts.accent ? ' accent' : ''}" style="width:${pct}%"></div></div>
      <div class="chart-value">${esc(value)}</div>
    </div>`;
  }).join('');
  return `<div class="review-block card"><h4>${esc(title)}</h4>${rows}</div>`;
}

// Donut chart via CSS conic-gradient — no library needed, prints fine with
// the color-preservation rule already added to the print stylesheet.
function donutChartHTML(title, segments) {
  const total = segments.reduce((s, seg) => s + (Number(seg.value) || 0), 0) || 1;
  let cursor = 0;
  const stops = segments.map(seg => {
    const pct = (Number(seg.value) || 0) / total * 100;
    const start = cursor;
    cursor += pct;
    return `${seg.color} ${start}% ${cursor}%`;
  }).join(', ');
  const legend = segments.map(seg => {
    const pct = Math.round((Number(seg.value) || 0) / total * 100);
    return `<div class="donut-legend-row"><span class="donut-swatch" style="background:${seg.color}"></span>${esc(seg.label)} — ${seg.value} (${pct}%)</div>`;
  }).join('');
  return `<div class="review-block card"><h4>${esc(title)}</h4>
    <div class="donut-wrap">
      <div class="donut" style="background:conic-gradient(${stops})"><div class="donut-hole"><div class="donut-total">${total}</div><div class="donut-total-label">Total</div></div></div>
      <div class="donut-legend">${legend}</div>
    </div>
  </div>`;
}

// 100%-stacked composition bar per row (e.g. per district) — shows the mix
// of formal/informal/none within each row rather than just a raw total.
function stackedBarBlockHTML(title, rowsData, colorKeyField, groupByField, subtitle) {
  let rows = '';
  let lastGroup = null;
  rowsData.forEach(d => {
    if (groupByField && d[groupByField] !== lastGroup) {
      lastGroup = d[groupByField];
      rows += `<div class="chart-group-header">${districtDotHTML(lastGroup)}${esc(lastGroup)}</div>`;
    }
    const total = d.formal + d.informal + d.none;
    const fPct = total ? Math.round(d.formal / total * 100) : 0;
    const iPct = total ? Math.round(d.informal / total * 100) : 0;
    const nPct = total ? Math.max(0, 100 - fPct - iPct) : 0;
    const colorKey = colorKeyField ? d[colorKeyField] : d.label;
    rows += `<div class="chart-row${groupByField ? ' chart-row-grouped' : ''}">
      <div class="chart-label">${groupByField ? '' : districtDotHTML(colorKey)}${esc(d.label)}</div>
      <div class="chart-track stacked-track">
        <div class="stacked-seg formal" style="width:${fPct}%"></div>
        <div class="stacked-seg informal" style="width:${iPct}%"></div>
        <div class="stacked-seg none" style="width:${nPct}%"></div>
      </div>
      <div class="stacked-total-badge">${total}</div>
    </div>`;
  });
  const legend = `<div class="stacked-legend">
    <span><i class="dot formal"></i>Formal</span>
    <span><i class="dot informal"></i>Informal</span>
    <span><i class="dot none"></i>No business</span>

  </div>`;
  const subtitleHTML = subtitle ? `<p style="font-size:12px; color:var(--text-muted); margin:-6px 0 12px;">${esc(subtitle)}</p>` : '';
  return `<div class="review-block card"><h4>${esc(title)}</h4>${subtitleHTML}${rows}${legend}</div>`;
}

// Buckets records into the last N calendar weeks by date collected, so the
// trend always shows a consistent recent window even if some weeks had zero.
function computeWeeklyTrend(records, weeksBack = 8) {
  const now = new Date();
  const todayDow = now.getDay();
  const buckets = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - todayDow - (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    buckets.push({ start: weekStart, end: weekEnd, count: 0, label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}` });
  }
  records.forEach(r => {
    const raw = r.location && r.location.dateCollected;
    if (!raw) return;
    const d = new Date(raw);
    if (isNaN(d)) return;
    const bucket = buckets.find(b => d >= b.start && d < b.end);
    if (bucket) bucket.count++;
  });
  return buckets;
}

function trendChartHTML(title, buckets) {
  const max = Math.max(1, ...buckets.map(b => b.count));
  const w = 600, h = 150, pad = 26;
  const stepX = buckets.length > 1 ? (w - pad * 2) / (buckets.length - 1) : 0;
  const coords = buckets.map((b, i) => ({
    x: pad + i * stepX,
    y: h - pad - ((b.count / max) * (h - pad * 2)),
  }));
  const points = coords.map(c => `${c.x},${c.y}`).join(' ');
  const areaPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;
  const dots = coords.map(c => `<circle cx="${c.x}" cy="${c.y}" r="3.5" style="fill:var(--primary)"></circle>`).join('');
  const labels = buckets.map((b, i) => `<text x="${coords[i].x}" y="${h - 6}" font-size="10" style="fill:var(--text-muted)" text-anchor="middle">${esc(b.label)}</text>`).join('');
  return `<div class="review-block card"><h4>${esc(title)}</h4>
    <svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto; display:block;">
      <polygon points="${areaPoints}" style="fill:var(--primary-glow)"></polygon>
      <polyline points="${points}" fill="none" style="stroke:var(--primary)" stroke-width="2.5"></polyline>
      ${dots}
      ${labels}
    </svg>
  </div>`;
}

async function renderRecordsSummary() {
  const container = $('#records-summary-mode');
  container.innerHTML = skeletonStatGrid() + skeletonChart() + skeletonRows(3);

  const scopeDistrict = myDistrict;
  const scopeLLG = renderRecordsSummary._llg || null;
  const scopeWard = renderRecordsSummary._ward || null;
  const scopeOfficialWards = scopeLLG ? (WARDS_BY_LLG[scopeLLG] || []) : null;

  let s;
  try {
    const { data, error } = await sb.rpc('get_summary_stats', {
      weeks_back: 8, p_district: scopeDistrict, p_llg: scopeLLG, p_ward: scopeWard, p_official_wards: scopeOfficialWards
    });
    if (error) throw error;
    s = data;
  } catch (e) {
    console.error('Failed to load summary:', e);
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Could not load summary — check your connection.</p>
      <button class="btn btn-outline" id="btn-retry-summary">Retry</button></div>`;
    const retryBtn = $('#btn-retry-summary');
    if (retryBtn) retryBtn.addEventListener('click', renderRecordsSummary);
    return;
  }

  let marketPrices = {};
  try {
    const { data: mpData, error: mpError } = await sb.rpc('get_market_price_summary');
    if (mpError) throw mpError;
    marketPrices = mpData || {};
  } catch (e) {
    console.error('Failed to load market prices (non-fatal, rest of summary still shows):', e);
  }

  let priceComparison = [];
  try {
    const { data: pcData, error: pcError } = await sb.rpc('get_price_comparison');
    if (pcError) throw pcError;
    priceComparison = pcData || [];
  } catch (e) {
    console.error('Failed to load price comparison (non-fatal, rest of summary still shows):', e);
  }

  const total = s.total || 0;
  if (total === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">📊</div><p>No records yet.<br>The summary fills in once records are collected or imported.</p></div>`;
    return;
  }

  const byStatus = s.by_status || { formal: 0, informal: 0, none: 0 };

  const employment = s.employment || { total_formally_employed: 0, employed_listed: 0, unemployed_listed: 0 };
  const topActivities = (s.top_activities || []).map(a => [a.label, a.count]);
  const ipaLoans = s.ipa_loans || { ipa_yes: 0, ipa_no: 0, loan_yes: 0, loan_no: 0 };
  const training = s.training || { attended_yes: 0, attended_no: 0 };
  const trainingReqList = (s.training_required || []).map(a => [a.label, a.count]);
  const assistanceList = (s.assistance_required || []).map(a => [a.label, a.count]);
  const turnoverBracket = s.turnover_bracket || {};
  const expensesBracket = s.expenses_bracket || {};
  const cashCrops = s.cash_crops || {};
  const informalCount = s.informal_count || 0;

  const printHeader = `<div class="print-header"><div class="ph-row">
    <div class="ph-seal"><img src="logo.svg" alt="ENB logo"></div>
    <div>
      <div class="ph-title">ENBPA &middot; Division of Commerce &amp; Industry — Economic &amp; MSME Survey Report</div>
      <div class="ph-sub-label" style="font-size:10px; color:var(--text-muted); letter-spacing:.04em; text-transform:uppercase;">${esc(myDistrict)} District Office</div>
      <div class="ph-sub">Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} · ${total} record(s)</div>
    </div>
  </div></div>`;

  const scopeLabel = scopeWard ? `${scopeLLG} — ${scopeWard}` : scopeLLG ? scopeLLG : scopeDistrict;
  const scopeLLGList = LLG_BY_DISTRICT[scopeDistrict] || [];
  const scopeWardList = scopeLLG ? (WARDS_BY_LLG[scopeLLG] || []) : [];

  const scopeSelectorHTML = `<div class="review-block card">
    <h4>View Summary For</h4>
    <p style="font-size:12.5px; color:var(--text-muted); margin-bottom:10px;">District: <strong>${esc(scopeDistrict)}</strong></p>
    <div class="field-row">
      <div class="field"><label>LLG</label>
        <select id="summary-scope-llg">
          <option value="">All LLGs in ${esc(scopeDistrict)}</option>
          ${scopeLLGList.map(l => `<option value="${esc(l)}" ${l === scopeLLG ? 'selected' : ''}>${esc(l)}</option>`).join('')}
        </select>
      </div>
      ${scopeLLG ? `<div class="field"><label>Ward</label>
        <select id="summary-scope-ward">
          <option value="">All Wards in ${esc(scopeLLG)}</option>
          ${scopeWardList.map(w => `<option value="${esc(w)}" ${w === scopeWard ? 'selected' : ''}>${esc(w)}</option>`).join('')}
        </select>
      </div>` : ''}
    </div>
  </div>`;

  let html = printHeader + scopeSelectorHTML + `<div class="warn-box">Summary for ${esc(scopeLabel)} — ${total} record(s), computed live from the server, updates automatically.</div>`;

  html += marketPricesCardHTML(marketPrices);

  html += `<div class="stat-grid" id="summary-status-anchor">
    <div class="stat-card"><div class="num" data-countup="${total}">0</div><div class="lbl">Total surveyed</div></div>
    <div class="stat-card accent"><div class="num" data-countup="${byStatus.formal}">0</div><div class="lbl">Formal business</div></div>
    <div class="stat-card"><div class="num" data-countup="${byStatus.informal}">0</div><div class="lbl">Informal sector</div></div>
    <div class="stat-card"><div class="num" data-countup="${byStatus.none}">0</div><div class="lbl">No business</div></div>
  </div>`;
  html += donutChartHTML('Business Status Split', [
    { label: 'Formal', value: byStatus.formal, color: 'var(--primary)' },
    { label: 'Informal', value: byStatus.informal, color: 'var(--accent)' },
    { label: 'No business', value: byStatus.none, color: 'var(--chart-neutral)' }
  ]);
  html += trendChartHTML('Surveys Collected — Last 8 Weeks', s.weekly_trend || []);

  if (scopeWard) {
    // Already at the finest level - the stat cards above already show this
    // ward's own totals, so a composition chart here would just repeat them.
  } else if (scopeLLG) {
    const byWardRows = s.by_ward || [];
    if (byWardRows.length) {
      html += stackedBarBlockHTML('By Ward (composition)', byWardRows.map(row => ({
        label: row.label, formal: row.formal, informal: row.informal, none: row.none
      })));
    }
  } else if (scopeDistrict) {
    const byLLGRows = s.by_llg || [];
    if (byLLGRows.length) {
      html += stackedBarBlockHTML('By LLG (composition)', byLLGRows.map(row => ({
        label: row.label, district: row.district, formal: row.formal, informal: row.informal, none: row.none
      })), 'district');
    }
  }
  html += barBlockHTML('B. Employment', [
    ['Total formally employed (reported)', employment.total_formally_employed],
    ['Employed members listed (Table 1)', employment.employed_listed],
    ['Unemployed qualified members listed (Table 2)', employment.unemployed_listed]
  ]);
  if (topActivities.length) html += barBlockHTML('C. Top Business Activities', topActivities);
  const otherActivities = (s.other_activities_specified || []).map(a => [a.label, a.count]);
  if (otherActivities.length) {
    html += `<div class="review-block card">
      <h4>C. "Others" Specified</h4>
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">Free-text entries from the "Others (specify)" field, grouped where the same activity was described in slightly different words.</p>
      ${otherActivities.map(([label, count]) => `<div class="review-line"><span class="k">${esc(label)}</span><span class="v">${count}</span></div>`).join('')}
    </div>`;
  }
  html += barBlockHTML('C. IPA Registration & Loans', [
    ['IPA registered — Yes', ipaLoans.ipa_yes], ['IPA registered — No', ipaLoans.ipa_no],
    ['Loan access — Yes', ipaLoans.loan_yes], ['Loan access — No', ipaLoans.loan_no]
  ]);
  html += barBlockHTML('D. Training & Development', [
    ['Training attended — Yes', training.attended_yes], ['Training attended — No', training.attended_no]
  ]);
  if (trainingReqList.length) html += barBlockHTML('Training Required (demand)', trainingReqList, { accent: true });
  if (assistanceList.length) html += barBlockHTML('Assistance Required (demand)', assistanceList, { accent: true });
  html += barBlockHTML('E. Monthly Turnover Bracket', TURNOVER_BRACKETS.map(([c, label]) => [label, turnoverBracket[c] || 0]));
  html += barBlockHTML('E. Monthly Expenses Bracket', EXPENSE_BRACKETS.map(([c, label]) => [label, expensesBracket[c] || 0]));
  const econ = s.economic_amounts || {};
  html += `<div class="review-block card">
    <h4>E. Actual Amounts Reported (K)</h4>
    <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">From the specific amount entered alongside each bracket selection — not every record includes one.</p>
    <div class="stat-grid" style="grid-template-columns:repeat(2,1fr);">
      <div class="stat-card"><div class="num">K${(econ.total_turnover || 0).toLocaleString()}</div><div class="lbl">Total turnover<br><span style="font-weight:400; font-size:10.5px;">${econ.turnover_count || 0} record(s) with an amount</span></div></div>
      <div class="stat-card"><div class="num">${econ.avg_turnover != null ? 'K' + econ.avg_turnover.toLocaleString() : '—'}</div><div class="lbl">Average turnover</div></div>
      <div class="stat-card"><div class="num">K${(econ.total_expenses || 0).toLocaleString()}</div><div class="lbl">Total expenses<br><span style="font-weight:400; font-size:10.5px;">${econ.expenses_count || 0} record(s) with an amount</span></div></div>
      <div class="stat-card"><div class="num">${econ.avg_expenses != null ? 'K' + econ.avg_expenses.toLocaleString() : '—'}</div><div class="lbl">Average expenses</div></div>
    </div>
  </div>`;
  html += barBlockHTML('F. Cash Crop Totals (blocks)', FIXED_CROPS.map(c => [`${c} (${(cashCrops[c] && cashCrops[c].trees) || 0} trees)`, (cashCrops[c] && cashCrops[c].blocks) || 0]));
  html += priceComparisonCardHTML(priceComparison, marketPrices, cashCrops);
  const informalActivities = (s.informal_activities || []).map(a => [a.label, a.count]);
  if (informalActivities.length) html += barBlockHTML('G. Informal Sector — Activity Types', informalActivities);
  html += reviewBlockHTML('G. Informal Sector', [['Total informal activities recorded', informalCount]]);
  html += `<button class="btn btn-outline btn-full" id="btn-print-summary">Print / Save as PDF</button>`;

  container.innerHTML = html;
  activateCountUps(container);
  const printBtn = $('#btn-print-summary');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  const scopeLLGSelect = $('#summary-scope-llg');
  if (scopeLLGSelect) scopeLLGSelect.addEventListener('change', (e) => {
    renderRecordsSummary._llg = e.target.value || null;
    renderRecordsSummary._ward = null; // narrowing the LLG invalidates any deeper ward selection
    renderRecordsSummary();
  });
  const scopeWardSelect = $('#summary-scope-ward');
  if (scopeWardSelect) scopeWardSelect.addEventListener('change', (e) => {
    renderRecordsSummary._ward = e.target.value || null;
    renderRecordsSummary();
  });

  const toggleBtn = $('#btn-toggle-price-form');
  const formEl = $('#price-observation-form');
  if (toggleBtn && formEl) {
    toggleBtn.addEventListener('click', () => {
      formEl.hidden = !formEl.hidden;
      toggleBtn.textContent = formEl.hidden ? '+ Log a Price Observation' : 'Cancel';
    });
  }
  const savePriceBtn = $('#btn-save-price-observation');
  if (savePriceBtn) savePriceBtn.addEventListener('click', async () => {
    const commodity = $('#price-commodity-select').value;
    const price = parseFloat($('#price-value-input').value);
    const date = $('#price-date-input').value;
    const location = $('#price-location-input').value.trim();
    const notes = $('#price-notes-input').value.trim();
    const errEl = $('#price-form-error');
    errEl.textContent = '';
    if (!price || price <= 0) { errEl.textContent = 'Enter a valid price per kg.'; return; }
    if (!location) { errEl.textContent = 'Enter the market or location.'; return; }
    if (!date) { errEl.textContent = 'Select a date.'; return; }
    savePriceBtn.disabled = true;
    savePriceBtn.textContent = 'Saving…';
    try {
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.from('market_prices').insert({
        commodity, price_per_kg: price, recorded_date: date, market_location: location,
        notes: notes || null, recorded_by: user ? user.id : null
      });
      if (error) throw error;
      toast('Price observation saved');
      renderRecordsSummary();
    } catch (e) {
      console.error('Failed to save price observation:', e);
      errEl.textContent = 'Could not save — check your connection and try again.';
      savePriceBtn.disabled = false;
      savePriceBtn.textContent = 'Save Observation';
    }
  });
}

/* -------------------------------- detail view ------------------------------- */
async function openDetail(id) {
  currentDetailId = id;
  let r = recordsCache.find(x => x.id === id);
  if (!r) {
    try { r = await fetchRecordById(id); }
    catch (e) { console.error('Failed to load record:', e); toast('Could not load record — check your connection'); return; }
  }
  switchView('detail');
  const status = r.businessStatus || 'none';
  const statusLabel = status === 'formal' ? 'Formal business' : status === 'informal' ? 'Informal sector' : 'No business';

  let sections = '';
  sections += reviewBlockHTML('A. Location', [
    ['District', r.location.district ? districtDotHTML(r.location.district) + esc(r.location.district) : '—', { raw: true }],
    ['LLG', r.location.llg], ['Village', r.location.village], ['Ward', r.location.ward],
    ['Household No.', r.location.householdNo], ['Date collected', fmtDate(r.location.dateCollected)],
    ['Uploaded to PHQ', r._uploadedAt ? fmtDateTime(r._uploadedAt) : '—'],
    ['Contact person', r.location.contactPerson], ['Mobile', r.location.mobile], ['Postal address', r.location.postalAddress]
  ]);
  sections += reviewBlockHTML('B. Employment', [
    ['Formally employed members', r.employment.numFormallyEmployed],
    ['Business status', statusLabel]
  ], reviewSubList('Employed members', r.employment.employedMembers, fmtEmployed) + reviewSubList('Unemployed (qualified) members', r.employment.unemployedMembers, fmtUnemployed));
  if (status === 'formal') {
    sections += reviewBlockHTML('C. Business Background', [
      ['Business name', r.business.name], ['Date commenced', fmtDate(r.business.dateCommenced)],
      ['Owner', r.business.owner], ['IPA registered', r.business.ipaRegistered], ['Loan access', r.business.loanAccess]
    ], reviewSubList('Registration forms', r.business.regForms, fmtRegForm) + reviewSubList('Licenses', r.business.licenses, fmtLicense) + reviewSubList('Loans', r.business.loans, fmtLoan));
    sections += reviewBlockHTML('D. Development Assistance', [
      ['Training attended', r.development.trainingAttended],
      ['Assistance required', (r.development.assistanceRequired || []).join(', ') || '—']
    ], reviewSubList('Training history', Object.entries(r.development.trainingHistory || {}), ([t, f]) => `${t}${f ? ' — Facilitator: ' + f : ''}`));
    sections += reviewBlockHTML('E. Economic Output', [
      ['Casuals', r.economic.casualsCount], ['Permanent', r.economic.permanentCount],
      ['Turnover bracket', r.economic.turnoverBracket], ['Turnover amount (K)', r.economic.turnoverAmount],
      ['Expenses bracket', r.economic.expensesBracket], ['Expenses amount (K)', r.economic.expensesAmount],
      ['Initial capital (K)', r.economic.initialCapital], ['Assets value (K)', r.economic.assetsValue],
      ['Other investments (K)', r.economic.otherInvestments]
    ]);
  } else if (status === 'informal') {
    sections += reviewBlockHTML('C.8 Loan', [['Loan access', r.business.loanAccess]], reviewSubList('Loans', r.business.loans, fmtLoan));
  }
  // A record whose status ISN'T formal should never carry economic-section
  // data at all - if it does, it's leftover from before a status switch
  // (the bug this record surfaced). Surface it explicitly rather than
  // leaving it invisible and unfixable, since neither this view nor the
  // edit wizard normally render Section E outside the formal path.
  let hasLeftoverEconomic = false;
  if (status !== 'formal') {
    const e = r.economic || {};
    hasLeftoverEconomic = Object.values(e).some(v => v !== '' && v != null);
    if (hasLeftoverEconomic) {
      sections += `<div class="review-block" style="border:1.5px solid var(--danger); border-radius:8px; padding:12px; margin-bottom:16px; background:var(--danger-light);">
        <h4 style="color:var(--danger); border-bottom-color:var(--danger);">⚠ Leftover Economic Data</h4>
        <p style="font-size:12.5px; margin-bottom:8px;">This record's status is "${esc(statusLabel)}", but it still carries Economic Output data from before — almost certainly left over from switching status after this section was filled in. It has no legitimate place on a ${esc(statusLabel.toLowerCase())} record.</p>
        ${[
          ['Turnover bracket', e.turnoverBracket], ['Turnover amount (K)', e.turnoverAmount],
          ['Expenses bracket', e.expensesBracket], ['Expenses amount (K)', e.expensesAmount],
          ['Initial capital (K)', e.initialCapital]
        ].map(([k, v]) => `<div class="review-line"><span class="k">${esc(k)}</span><span class="v">${esc(v === '' || v == null ? '—' : v)}</span></div>`).join('')}
      </div>`;
    }
  }
  {
    const cropSummary = FIXED_CROPS.filter(c => r.cashCrops.fixed[c] && (r.cashCrops.fixed[c].blocks || r.cashCrops.fixed[c].trees))
      .map(c => `${c}: ${r.cashCrops.fixed[c].blocks || 0} blocks / ${r.cashCrops.fixed[c].trees || 0} trees`);
    sections += reviewBlockHTML('F. Cash Crops', [['Comments', r.cashCrops.comments || '—']],
      reviewSubList('Fixed crops recorded', cropSummary, x => x) + reviewSubList('Other crops', r.cashCrops.others, fmtOtherCrop));
  }
  if (status === 'informal') {
    sections += reviewBlockHTML('G. Informal Sector', [], reviewSubList('Entries', r.informal.entries, fmtInformal));
  }

  $('#detail-body').innerHTML = `
    <div class="card" style="display:flex; align-items:center; gap:12px;">
      <div class="badge ${status}" style="width:46px;height:46px;font-size:16px;">${esc((r.location.village || 'HH').slice(0,2).toUpperCase())}</div>
      <div style="flex:1;">
        <h3 style="margin-bottom:2px;">${esc(recordDisplayName(r))}</h3>
        <span style="font-size:12.5px; color:var(--text-muted);">${esc([r.location.village, r.business.name].filter(Boolean).join(' · '))} · Collected ${fmtDate(r.location.dateCollected)}</span>
      </div>
    </div>
    ${r.source === 'hq_manual' ? `<div class="warn-box" style="font-size:12px;">✎ Entered manually via PHQ — not from a field paper form.</div>` : ''}
    <div class="card">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-outline" id="btn-detail-print" style="flex:1;">Print</button>
        <button class="btn btn-outline" id="btn-detail-export" style="flex:1;">Export</button>
      </div>
    </div>
    ${sections}
    <button class="btn btn-outline btn-full" id="btn-detail-back">← Back to records</button>
  `;
  $('#btn-detail-back').onclick = () => switchView('records');
  $('#btn-detail-export').onclick = () => downloadFile(`msme-${recordDisplayName(r).replace(/[,\s]+/g,'-')}.json`, JSON.stringify(r, null, 2), 'application/json');
  $('#btn-detail-print').onclick = () => { window.print(); };
}
function reviewBlockHTML(title, pairs, extraHtml) {
  return `<div class="review-block card"><h4>${esc(title)}</h4>${
    pairs.map(([k, v, opts]) => {
      const raw = opts && opts.raw;
      const displayV = (v === '' || v == null) ? '—' : v;
      return `<div class="review-line"><span class="k">${esc(k)}</span><span class="v">${raw ? displayV : esc(displayV)}</span></div>`;
    }).join('')
  }${extraHtml || ''}</div>`;
}
// Renders a labeled list of full entries (names + detail) under a review block —
// used so the on-screen views show the same real detail as the CSV/JSON export.
function reviewSubList(label, arr, fmt) {
  if (!arr || arr.length === 0) return '';
  return `<div style="margin-top:10px;">
    <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:5px;">${esc(label)}</div>
    ${arr.map(item => `<div style="font-size:13px; padding:6px 0; border-bottom:1px dashed var(--border);">${esc(fmt(item))}</div>`).join('')}
  </div>`;
}
const fmtEmployed = m => `${m.name || 'Unnamed'} — ${[m.qualification, m.institution, m.yearGraduated && 'Grad. ' + m.yearGraduated, m.employer, m.grossPay && 'K' + m.grossPay + '/mo'].filter(Boolean).join(', ') || 'no further detail'}`;
const fmtUnemployed = m => `${m.name || 'Unnamed'} — ${[m.qualification, m.institution, m.yearGraduated && 'Grad. ' + m.yearGraduated, m.comments].filter(Boolean).join(', ') || 'no further detail'}`;
const fmtRegForm = f => `${f.form || 'Form'} — Reg#: ${f.regNo || '—'}, Date: ${f.dateReg || '—'}, Expiry: ${f.expiry || '—'}`;
const fmtLicense = l => `${l.type || 'License'} — Receipt: ${l.receiptNo || '—'}, Expiry: ${l.expiry || '—'}`;
const fmtLoan = l => `${l.institution || 'Lender'} — K${l.amount || '—'}, Date: ${l.date || '—'}, On schedule: ${l.onSchedule || '—'}`;
const fmtOtherCrop = c => `${c.name || 'Crop'} — ${c.blocks || 0} blocks, ${c.trees || 0} trees`;
const fmtInformal = e => `${e.ownerName || 'Owner'} — ${e.activityType || 'activity'} (Est. ${e.yearEstablished || '—'}, K${e.monthlyTurnover || '—'}/mo)`;

/* -------------------------------- transfer -------------------------------- */
async function renderTransfer() {
  $('#transfer-record-count').textContent = '…';
  try {
    const { count, error } = await sb.from('msme_records').select('id', { count: 'exact', head: true }).is('deleted_at', null);
    if (error) throw error;
    $('#transfer-record-count').textContent = count;
  } catch (e) {
    console.error('Failed to load record count:', e);
    $('#transfer-record-count').textContent = '—';
  }
  const { data: { user } } = await sb.auth.getUser();
  const emailEl = $('#account-email');
  if (emailEl) emailEl.textContent = user ? user.email : '—';
  const districtEl = $('#account-district');
  if (districtEl) districtEl.textContent = myDistrict || '—';
}
async function renderDataQuality() {
  const container = $('#dataquality-content');
  container.innerHTML = skeletonRows(4);
  let r;
  try {
    const { data, error } = await sb.rpc('get_data_quality_report');
    if (error) throw error;
    r = data;
  } catch (e) {
    console.error('Failed to load data quality report:', e);
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Could not load — check your connection.</p>
      <button class="btn btn-outline" id="btn-retry-dq">Retry</button></div>`;
    const retryBtn = $('#btn-retry-dq');
    if (retryBtn) retryBtn.addEventListener('click', renderDataQuality);
    return;
  }

  // Ward-name mismatches are computed here, client-side, against the same
  // WARDS_BY_LLG list the wizard and drill-down browser already use as the
  // single source of truth - never duplicated into SQL.
  const wardMismatches = (r.distinct_wards_in_use || []).filter(w => {
    const official = WARDS_BY_LLG[w.llg] || [];
    return official.length > 0 && !official.includes(w.ward);
  });

  const sections = [];

  const missing = r.missing_business_status || { total: 0, by_llg: [] };
  sections.push({
    title: 'Missing Business Status',
    count: missing.total,
    severity: missing.total > 0 ? 'warn' : 'ok',
    body: missing.total === 0 ? '' : `<p style="font-size:12.5px; color:var(--text-muted); margin-bottom:8px;">These records were saved without ever recording formal, informal, or none — likely an incomplete survey.</p>` +
      missing.by_llg.map(x => `<div class="review-line clickable" data-flag="missing_business_status" data-llg="${esc(x.llg)}" data-title="Missing Business Status \u2014 ${esc(x.llg)}"><span class="k">${esc(x.llg)}</span><span class="v">${x.count}</span></div>`).join('')
  });

  const neg = r.negative_cash_crop_values || [];
  sections.push({
    title: 'Negative Cash Crop Values',
    count: neg.length,
    severity: neg.length > 0 ? 'bad' : 'ok',
    body: neg.map(x => `<div class="review-line clickable" data-id="${esc(x.id)}"><span class="k">${esc(x.llg)} · HH ${esc(x.household_no || '—')} · ${esc(x.crop)}</span><span class="v" style="color:var(--danger);">${esc(x.field)}: ${esc(x.value)}</span></div>`).join('')
  });

  const tMismatch = r.turnover_bracket_mismatch || [];
  const eMismatch = r.expenses_bracket_mismatch || [];
  const bracketLabel = (kind, b) => {
    const t = { a: '<K60,000', b: 'K60,001–250,000', c: 'K250,001–5,000,000', d: '>K5,000,000' };
    const e = { '1': '<K5,000', '2': 'K5,001–250,000', '3': 'K250,001–500,000', '4': '>K500,001' };
    return kind === 'turnover' ? t[b] : e[b];
  };
  sections.push({
    title: 'Turnover Amount Doesn\u2019t Match Selected Bracket',
    count: tMismatch.length,
    severity: tMismatch.length > 0 ? 'warn' : 'ok',
    body: tMismatch.map(x => `<div class="review-line clickable" data-id="${esc(x.id)}"><span class="k">${esc(x.llg)}</span><span class="v">K${Number(x.amount).toLocaleString()} in bracket "${esc(bracketLabel('turnover', x.bracket))}"</span></div>`).join('')
  });
  sections.push({
    title: 'Expenses Amount Doesn\u2019t Match Selected Bracket',
    count: eMismatch.length,
    severity: eMismatch.length > 0 ? 'warn' : 'ok',
    body: eMismatch.map(x => `<div class="review-line clickable" data-id="${esc(x.id)}"><span class="k">${esc(x.llg)}</span><span class="v">K${Number(x.amount).toLocaleString()} in bracket "${esc(bracketLabel('expenses', x.bracket))}"</span></div>`).join('')
  });

  sections.push({
    title: 'Ward Name Not in Official List',
    count: wardMismatches.length,
    severity: wardMismatches.length > 0 ? 'warn' : 'ok',
    body: wardMismatches.map(x => `<div class="review-line clickable" data-flag="ward_mismatch" data-llg="${esc(x.llg)}" data-ward="${esc(x.ward)}" data-title="Ward Name Not in Official List \u2014 ${esc(x.llg)} \u201c${esc(x.ward)}\u201d"><span class="k">${esc(x.llg)} \u2014 "${esc(x.ward)}"</span><span class="v">${x.count} record(s)</span></div>`).join('')
  });

  sections.push({
    title: 'Missing Date Collected',
    count: r.missing_date_collected || 0,
    severity: (r.missing_date_collected || 0) > 0 ? 'warn' : 'ok',
    body: '',
    wholeCardFlag: (r.missing_date_collected || 0) > 0 ? 'missing_date_collected' : null
  });
  sections.push({
    title: 'Missing Village',
    count: r.missing_village || 0,
    severity: (r.missing_village || 0) > 0 ? 'warn' : 'ok',
    body: '',
    wholeCardFlag: (r.missing_village || 0) > 0 ? 'missing_village' : null
  });

  const totalIssues = sections.reduce((sum, s) => sum + s.count, 0);
  const colorFor = sev => sev === 'bad' ? 'var(--danger)' : sev === 'warn' ? 'var(--accent-dark)' : 'var(--primary)';

  let html = `<div class="warn-box" style="background:${totalIssues > 0 ? 'var(--accent-light)' : 'var(--success-light)'}; color:${totalIssues > 0 ? '#8A4A05' : 'var(--success)'};">
    ${totalIssues === 0 ? 'No data quality issues currently detected.' : `${totalIssues} record(s) across all categories below are worth a second look.`}
  </div>`;

  html += sections.map(s => `
    <div class="review-block card ${s.wholeCardFlag ? 'clickable' : ''}" style="border-left:3px solid ${colorFor(s.severity)};" ${s.wholeCardFlag ? `data-flag="${esc(s.wholeCardFlag)}" data-title="${esc(s.title)}"` : ''}>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:${s.body ? '8px' : '0'};">
        <h4 style="margin:0;">${esc(s.title)}</h4>
        <span style="font-family:var(--font-mono); font-weight:700; color:${colorFor(s.severity)};">${s.count}</span>
      </div>
      ${s.body}
    </div>
  `).join('');

  container.innerHTML = html;
  $all('#dataquality-content .review-line.clickable[data-id]').forEach(el => {
    el.addEventListener('click', () => openDetail(el.dataset.id));
  });
  $all('#dataquality-content [data-flag]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation(); // a sub-row's own click must not also fire its parent card's whole-card handler
      goToFlaggedRecords(el.dataset.flag, el.dataset.llg, el.dataset.ward, el.dataset.title);
    });
  });
}
$('#btn-open-dataquality').addEventListener('click', () => switchView('dataquality'));
$('#btn-dataquality-back').addEventListener('click', () => switchView('dashboard'));

$('#btn-sign-out').addEventListener('click', async () => {
  clearTimeout(inactivityTimer);
  await sb.auth.signOut();
  recordsCache = [];
  draft = null;
  $('#lock-screen').hidden = false;
  document.body.classList.add('locked');
  renderLoginForm();
});
$('#btn-export-json').addEventListener('click', async () => {
  const btn = $('#btn-export-json');
  btn.disabled = true;
  try {
    const all = await fetchAllRecords();
    if (all.length === 0) { toast('No records to export yet'); return; }
    const payload = { exportedAt: new Date().toISOString(), source: `ENBPA ${myDistrict} District Office — Economic & MSME Survey`, recordCount: all.length, records: all };
    downloadFile(`enb-msme-export-${todayStr()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    toast('JSON exported');
  } catch (e) {
    console.error('Export failed:', e);
    toast('Could not export — check your connection');
  } finally {
    btn.disabled = false;
  }
});
$('#btn-export-csv').addEventListener('click', async () => {
  const btn = $('#btn-export-csv');
  btn.disabled = true;
  try {
    const all = await fetchAllRecords();
    if (all.length === 0) { toast('No records to export yet'); return; }
    downloadFile(`enb-msme-export-${todayStr()}.csv`, recordsToCSV(all), 'text/csv');
    toast('CSV exported');
  } catch (e) {
    console.error('Export failed:', e);
    toast('Could not export — check your connection');
  } finally {
    btn.disabled = false;
  }
});

// Turns an array of row-objects into one readable cell: "entry 1 | entry 2 | ..."
function joinRows(arr, fmt) {
  if (!arr || arr.length === 0) return '';
  return arr.map(fmt).join(' | ');
}

function recordsToCSV(records) {
  const cols = [
    'id','createdAt','updatedAt','source','district','llg','village','ward','householdNo','dateCollected','contactPerson','mobile','postalAddress',
    'numFormallyEmployed','employedMembersDetail','unemployedMembersDetail','businessStatus',
    'businessActivities','businessName','dateCommenced','businessOwner','ipaRegistered',
    'regFormsDetail','licensesDetail','loanAccess','loansDetail','loanReasons',
    'trainingAttended','trainingHistoryDetail','trainingRequired','assistanceRequired','assistanceOtherSpecify',
    'casualsCount','casualsYears','permanentCount','permanentYears','casualWageK','permanentWageK',
    'turnoverBracket','turnoverAmount','expensesBracket','expensesAmount','initialCapital','assetsValue','otherInvestments','otherInvestmentsSpecify',
    'cashCropsSummary','cashCropsOthersDetail','cashCropsComments','informalEntriesDetail','informalComments'
  ];
  const rows = records.map(r => {
    const allActivities = Object.values(r.business.activities).filter(v => Array.isArray(v)).flat();
    const cropSummary = FIXED_CROPS.filter(c => r.cashCrops.fixed[c] && (r.cashCrops.fixed[c].blocks || r.cashCrops.fixed[c].trees))
      .map(c => `${c}:${r.cashCrops.fixed[c].blocks||0}blk/${r.cashCrops.fixed[c].trees||0}tr`).join('; ');

    const employedDetail = joinRows(r.employment.employedMembers, m =>
      `${m.name || 'Unnamed'} (${[m.qualification, m.institution, m.yearGraduated && 'Grad. ' + m.yearGraduated, m.employer, m.grossPay && 'K' + m.grossPay + '/mo'].filter(Boolean).join(', ')})`);
    const unemployedDetail = joinRows(r.employment.unemployedMembers, m =>
      `${m.name || 'Unnamed'} (${[m.qualification, m.institution, m.yearGraduated && 'Grad. ' + m.yearGraduated, m.comments].filter(Boolean).join(', ')})`);
    const regFormsDetail = joinRows(r.business.regForms, f =>
      `${f.form || 'Form'} (Reg#: ${f.regNo || '—'}, Date: ${f.dateReg || '—'}, Expiry: ${f.expiry || '—'})`);
    const licensesDetail = joinRows(r.business.licenses, l =>
      `${l.type || 'License'} (Receipt: ${l.receiptNo || '—'}, Expiry: ${l.expiry || '—'})`);
    const loansDetail = joinRows(r.business.loans, l =>
      `${l.institution || 'Lender'} (K${l.amount || '—'}, Date: ${l.date || '—'}, On schedule: ${l.onSchedule || '—'})`);
    const trainingHistoryDetail = joinRows(Object.entries(r.development.trainingHistory || {}), ([type, facilitator]) =>
      `${type}${facilitator ? ' (Facilitator: ' + facilitator + ')' : ''}`);
    const cashCropsOthersDetail = joinRows(r.cashCrops.others, c =>
      `${c.name || 'Crop'} (${c.blocks || 0} blocks, ${c.trees || 0} trees)`);
    const informalDetail = joinRows(r.informal.entries, e =>
      `${e.ownerName || 'Owner'} — ${e.activityType || 'activity'} (Est. ${e.yearEstablished || '—'}, K${e.monthlyTurnover || '—'}/mo)`);

    return [
      r.id, r.createdAt, r.updatedAt, r.source === 'hq_manual' ? 'hq_manual' : 'field', r.location.district, r.location.llg, r.location.village, r.location.ward, r.location.householdNo,
      r.location.dateCollected, r.location.contactPerson, r.location.mobile, r.location.postalAddress,
      r.employment.numFormallyEmployed, employedDetail, unemployedDetail, r.businessStatus,
      allActivities.join('; '), r.business.name, r.business.dateCommenced, r.business.owner, r.business.ipaRegistered,
      regFormsDetail, licensesDetail, r.business.loanAccess, loansDetail, r.business.loanReasons,
      r.development.trainingAttended, trainingHistoryDetail, r.development.trainingTypesRequired.join('; '), r.development.assistanceRequired.join('; '), r.development.assistanceOtherSpecify,
      r.economic.casualsCount, r.economic.casualsYears, r.economic.permanentCount, r.economic.permanentYears, r.economic.casualWageK, r.economic.permanentWageK,
      r.economic.turnoverBracket, r.economic.turnoverAmount, r.economic.expensesBracket, r.economic.expensesAmount,
      r.economic.initialCapital, r.economic.assetsValue, r.economic.otherInvestments, r.economic.otherInvestmentsSpecify,
      cropSummary, cashCropsOthersDetail, r.cashCrops.comments, informalDetail, r.informal.comments
    ];
  });
  const escCsv = v => {
    const s = (v === undefined || v === null) ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(','), ...rows.map(row => row.map(escCsv).join(','))].join('\n');
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}


/* ---------------------------- connection status --------------------------- */
function setConnectionStatus(online) {
  const dot = $('#offline-dot');
  const text = $('#offline-status-text');
  if (dot) dot.style.background = online ? '#8FD9A8' : '#E06B5C';
  if (text) text.textContent = online ? 'Online' : 'Offline';

  const icon = $('#offline-readiness-icon');
  const title = $('#offline-readiness-title');
  const desc = $('#offline-readiness-desc');
  const card = $('#offline-readiness-card');
  if (!icon) return;
  if (online) {
    icon.textContent = '✅';
    title.textContent = 'Connected';
    desc.textContent = 'Signed-in access to the shared database is working normally.';
    card.style.borderColor = 'var(--success)';
  } else {
    icon.textContent = '⚠️';
    title.textContent = 'No connection';
    desc.textContent = "This app needs internet to sign in and to load or save records — reconnect and try again.";
    card.style.borderColor = 'var(--danger)';
  }
}

/* ------------------------------- login screen ------------------------------- */
function showLoginError(msg) {
  const el = $('#lock-error');
  if (el) el.textContent = msg || '';
}

function renderLoginForm() {
  const c = $('#lock-content');
  c.innerHTML = `
    <h3>District Office Sign In</h3>
    <p class="lock-desc">Sign in with your ENBPA Division of Commerce &amp; Industry account.</p>
    <input type="email" id="login-email" placeholder="Email" autocomplete="username" style="width:100%; text-align:center; font-size:16px; letter-spacing:normal; padding:12px; border:1.5px solid var(--border); border-radius:10px; margin-bottom:10px;">
    <input type="password" id="login-password" placeholder="Password" autocomplete="current-password" style="width:100%; text-align:center; font-size:16px; letter-spacing:normal; padding:12px; border:1.5px solid var(--border); border-radius:10px; margin-bottom:10px;">
    <div class="lock-error" id="lock-error"></div>
    <button class="btn btn-primary btn-full" id="btn-login">Sign in</button>
  `;
  const submit = () => handleLogin($('#login-email').value.trim(), $('#login-password').value);
  $('#btn-login').addEventListener('click', submit);
  $('#login-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  setTimeout(() => { const el = $('#login-email'); if (el) el.focus(); }, 50);
}

async function handleLogin(email, password) {
  if (!email || !password) { showLoginError('Enter your email and password.'); return; }
  showLoginError('');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { showLoginError(error.message || 'Sign in failed.'); return; }
  await finishLogin();
}

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
let inactivityTimer = null;
async function signOutForInactivity() {
  await sb.auth.signOut().catch(() => {});
  recordsCache = [];
  draft = null;
  $('#lock-screen').hidden = false;
  document.body.classList.add('locked');
  renderLoginForm();
  toast('Signed out after 30 minutes of inactivity');
}
function resetInactivityTimer() {
  if (document.body.classList.contains('locked')) return; // not signed in - nothing to time out
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(signOutForInactivity, INACTIVITY_LIMIT_MS);
}
['click', 'keydown', 'touchstart', 'scroll'].forEach(evt => document.addEventListener(evt, resetInactivityTimer, { passive: true }));

async function finishLogin() {
  recordsCache = [];
  // Every other view in this app assumes myDistrict is a real value - verify
  // that BEFORE showing anything, rather than let a misconfigured or wrong
  // kind of account fall through into a blank or undefined-scope dashboard.
  const { data: districtResult, error: districtErr } = await sb.rpc('get_my_district');
  if (districtErr || !districtResult) {
    console.error('Account has no district assignment:', districtErr);
    showLoginError('This account is not set up for District access. Contact your survey coordinator.');
    await sb.auth.signOut();
    return;
  }
  myDistrict = districtResult;
  recordsDrillDistrict = myDistrict; // permanently fixed - this account only ever has one district
  const brandLabel = $('#brand-district-label');
  if (brandLabel) brandLabel.textContent = `ENBPA · ${myDistrict} District Office`;
  $('#lock-screen').hidden = true;
  document.body.classList.remove('locked');
  resetInactivityTimer();
  renderDashboard();
  // replaceState, not pushState - Dashboard is the true home screen, so
  // back from here should exit the app normally, not "undo" into a blank state.
  history.replaceState(captureNavState(), '');
}

async function initLockScreen() {
  $('#lock-screen').hidden = false;
  document.body.classList.add('locked');
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await finishLogin();
  } else {
    renderLoginForm();
  }
}

/* -------------------------------- boot -------------------------------- */
if (APP_ROLE === 'enumerator') {
  const importSection = document.getElementById('import-section');
  if (importSection) importSection.remove();
}

// Service worker still caches the static shell for fast loading and PWA
// install — it just no longer implies the app works without a connection.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.error('Service worker registration failed:', err));
  });
}

setConnectionStatus(navigator.onLine);
window.addEventListener('online', () => setConnectionStatus(true));
window.addEventListener('offline', () => setConnectionStatus(false));

initLockScreen();
