
// === PVC-FREE K2025 — Database runtime patch (v3, resilient) ===
(function(){
  // Optional: clear service worker when ?clear-sw=1
  (async function(){
    try{
      if (location.search.includes("clear-sw=1") && 'serviceWorker' in navigator){
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
        if (window.caches && caches.keys) caches.keys().then(keys=>keys.forEach(k=>caches.delete(k)));
        console.info("[K2025] Service worker cleared.");
      }
    }catch(e){ console.debug(e); }
  })();

  // Neutralize old loadMaterials to avoid null.value errors on tab switch
  try { window.loadMaterials = function(){}; } catch(e){}

  const CSV_PATH = "./data/materiali_database.csv";

  // Utils
  function ensurePapa(cb){
    if (window.Papa && typeof window.Papa.parse === "function") return cb();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js";
    s.onload = cb;
    document.head.appendChild(s);
  }
  const norm = s => String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const toNumber = x => { if (x==null) return NaN; const m=String(x).toLowerCase().replace(",",".").match(/(\d+(\.\d+)?)/); return m?parseFloat(m[1]):NaN; };

  const COLS = {
    polimero:    ["polimero","polymer","categoria materiale","categoria","famiglia","tipo"],
    applicazione:["applicazione","application","uso","use"],
    durezza:     ["durezza","shore a","shorea","shore","hardness","durezza (sha)","durezza (shore a)"],
    sigla:       ["sigla","codice","materiale","nome","name","product","grade"],
    processo:    ["processo","process"],
    regulation:  ["regulation","regolazione","normativa","compliance","regulatory"],
    peso:        ["peso specifico","densita","density","g/cm3","g/cm³","iso 1183"],
    carico:      ["carico di rottura","tensile strength","iso 527","carico","rottura"],
    allung:      ["allungamento a rottura","allungamento","elongazione","elongation"],
    compress:    ["compression set","astm d 395","compress","compression"],
    special:     ["special features","features","caratteristiche","note speciali","note"]
  };

  function findCol(header, synonyms){
    const H = header.map(h => ({ raw:h, key:norm(h) }));
    for (const syn of synonyms){
      const k = norm(syn);
      for (const h of H){
        if (h.key.includes(k)) return h.raw;
      }
    }
    return null;
  }
  function mapColumns(header){
    return {
      polimero:    findCol(header, COLS.polimero),
      applicazione:findCol(header, COLS.applicazione),
      durezza:     findCol(header, COLS.durezza),
      sigla:       findCol(header, COLS.sigla) || (header[0] || "Sigla"),
      processo:    findCol(header, COLS.processo),
      regulation:  findCol(header, COLS.regulation),
      peso:        findCol(header, COLS.peso),
      carico:      findCol(header, COLS.carico),
      allung:      findCol(header, COLS.allung),
      compress:    findCol(header, COLS.compress),
      special:     findCol(header, COLS.special)
    };
  }

  // Find DB section
  function findSection(){
    let el = document.querySelector("#view-materials, #materials, [data-view='materials'], [data-tab='database'], section#database, section[id*='material'], main #database");
    if (el) return el;
    const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4"));
    const found = headings.find(h => /database\s+material/i.test(h.textContent||""));
    if (found){
      const candidates = [".card",".section","section","main",".container"];
      for (const sel of candidates){ const c = found.closest(sel); if (c) return c; }
      return found.parentElement || found;
    }
    const tables = Array.from(document.querySelectorAll("table"));
    if (tables.length){ const t = tables[0]; return t.closest("section") || t.closest(".card") || t.parentElement; }
    return null;
  }

  function buildUI(section){
    if (!section || section.__dbUIBuilt) return;
    section.__dbUIBuilt = true;
    section.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin:6px 0">
        <img src="./assets/sft-polymer.png" alt="SFT Polymer" style="height:26px"/>
      </div>
      <div class="card card-pad">
        <h2 style="margin-top:0">Database Materiali</h2>
        <div class="muted">— scegli tra i materiali a disposizione</div>
        <div class="grid" style="margin-top:12px">
          <div class="col-4">
            <label>Tipologia polimero</label>
            <select id="f-polimero">
              <option value="">Tutte</option>
              <option value="TPE-S">TPE-S</option>
              <option value="BIO">BIO</option>
              <option value="TPU">TPU</option>
              <option value="TPO">TPO</option>
            </select>
          </div>
          <div class="col-4">
            <label>Applicazione</label>
            <select id="f-applicazione">
              <option value="">Tutte</option>
              <option value="tecnico">tecnico</option>
              <option value="biodegradabile">biodegradabile</option>
              <option value="medicale">medicale</option>
            </select>
          </div>
          <div class="col-2">
            <label>Durezza (ShA) — min</label>
            <input id="f-hard-min" type="number" min="0" max="100" placeholder="min"/>
          </div>
          <div class="col-2">
            <label>…max</label>
            <input id="f-hard-max" type="number" min="0" max="100" placeholder="max"/>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap">
          <button class="btn btn-primary" id="btn-apply">Applica</button>
          <button class="btn btn-outline" id="btn-reset">Reset</button>
          <button class="btn btn-outline" id="btn-export">Esporta CSV</button>
          <div class="muted" id="result-count">0 risultati</div>
          <div class="right muted">Sorgente: <code>./data/materiali_database.csv</code></div>
        </div>
      </div>
      <div class="table-wrap card card-pad" style="margin-top:12px">
        <table>
          <thead>
            <tr>
              <th>Sigla</th>
              <th>Processo</th>
              <th>regulation</th>
              <th>Peso Specifico (g/cm3) ISO 1183-1</th>
              <th>Carico di Rottura (N/mm2) ISO 527</th>
              <th>Allungamento a Rottura (N/mm2) ISO 527</th>
              <th>Compression Set (ASTM D 395) (22°C/72h)</th>
              <th>special features</th>
            </tr>
          </thead>
          <tbody id="materials-body"></tbody>
        </table>
        <div id="materials-empty" class="muted" style="margin-top:8px;display:none">Nessun materiale corrispondente ai filtri.</div>
      </div>
    `;
  }

  function initLogic(){
    let allRows = [];
    let filteredRows = [];

    function render(){
      const body = document.getElementById("materials-body");
      if (!body) return;
      body.innerHTML = "";
      filteredRows.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${r.sigla ?? ""}</td>
          <td>${r.processo ?? ""}</td>
          <td>${r.regulation ?? ""}</td>
          <td>${r.peso ?? ""}</td>
          <td>${r.carico ?? ""}</td>
          <td>${r.allung ?? ""}</td>
          <td>${r.compress ?? ""}</td>
          <td>${r.special ?? ""}</td>`;
        body.appendChild(tr);
      });
      const empty = document.getElementById("materials-empty");
      if (empty) empty.style.display = filteredRows.length ? "none" : "block";
      const count = document.getElementById("result-count");
      if (count) count.textContent = `${filteredRows.length} risultati`;
    }

    function applyFilters(){
      const fpEl = document.getElementById("f-polimero");
      const faEl = document.getElementById("f-applicazione");
      const minEl = document.getElementById("f-hard-min");
      const maxEl = document.getElementById("f-hard-max");
      if (!fpEl || !faEl || !minEl || !maxEl) return;

      const fp = norm(fpEl.value);
      const fa = norm(faEl.value);
      const hmin = parseFloat(minEl.value || "0");
      const hmax = parseFloat(maxEl.value || "100");

      filteredRows = allRows.filter(r => {
        if (fp && norm(r.polimero) !== fp) return false;
        if (fa && norm(r.applicazione) !== fa) return false;
        const hv = toNumber(r.durezza);
        if (!isNaN(hmin) && hv < hmin) return false;
        if (!isNaN(hmax) && hv > hmax) return false;
        return true;
      });
      render();
    }

    function resetFilters(){
      const minEl = document.getElementById("f-hard-min");
      const maxEl = document.getElementById("f-hard-max");
      const hs = allRows.map(r => toNumber(r.durezza)).filter(v => !isNaN(v));
      if (minEl) minEl.value = hs.length ? Math.floor(Math.min.apply(null, hs)) : 0;
      if (maxEl) maxEl.value = hs.length ? Math.ceil(Math.max.apply(null, hs)) : 100;
      const fpEl = document.getElementById("f-polimero"); if (fpEl) fpEl.value = "";
      const faEl = document.getElementById("f-applicazione"); if (faEl) faEl.value = "";
      applyFilters();
    }

    function exportCSV(){
      if (!filteredRows.length){ alert("Nessun dato da esportare."); return; }
      const header = ["Sigla","Processo","regulation","Peso Specifico (g/cm3) ISO 1183-1","Carico di Rottura (N/mm2) ISO 527","Allungamento a Rottura (N/mm2) ISO 527","Compression Set (ASTM D 395) (22°C/72h)","special features"];
      const csv = [header.join(";")].concat(filteredRows.map(r => [
        r.sigla ?? "", r.processo ?? "", r.regulation ?? "", r.peso ?? "",
        r.carico ?? "", r.allung ?? "", r.compress ?? "", r.special ?? ""
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(";"))).join("\n");
      const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "Materiali_filtrati.csv";
      document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 200);
    }

    const btnApply = document.getElementById("btn-apply"); if (btnApply) btnApply.addEventListener("click", applyFilters);
    const btnReset = document.getElementById("btn-reset"); if (btnReset) btnReset.addEventListener("click", resetFilters);
    const btnExport = document.getElementById("btn-export"); if (btnExport) btnExport.addEventListener("click", exportCSV);

    window.Papa.parse(CSV_PATH, {
      download: true, header: true, skipEmptyLines: true, dynamicTyping: false,
      complete: function(res){
        const data = res.data || [];
        const header = res.meta.fields || Object.keys(data[0] || {});
        const m = mapColumns(header);
        allRows = data.map(r => ({
          polimero:     r[m.polimero],
          applicazione: r[m.applicazione],
          durezza:      r[m.durezza],
          sigla:        r[m.sigla],
          processo:     r[m.processo],
          regulation:   r[m.regulation],
          peso:         r[m.peso],
          carico:       r[m.carico],
          allung:       r[m.allung],
          compress:     r[m.compress],
          special:      r[m.special]
        }));
        resetFilters();
      },
      error: function(err){
        console.error(err);
        const empty = document.getElementById("materials-empty");
        if (empty) empty.style.display = "block";
      }
    });
  }

  function startIfReady(){
    const section = findSection();
    if (!section) return false;
    buildUI(section);
    initLogic();
    return true;
  }

  function start(){
    ensurePapa(function(){
      if (startIfReady()) return;
      const obs = new MutationObserver(() => { if (startIfReady()) obs.disconnect(); });
      obs.observe(document.body, {childList:true, subtree:true});
    });
  }

  document.addEventListener("click", (e)=>{
    const t = e.target;
    if (!t) return;
    const txt = (t.textContent||"") + " " + (t.getAttribute&&t.getAttribute("aria-label")||"");
    if (/database/i.test(txt)) setTimeout(start, 0);
  });
  window.addEventListener("hashchange", start);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
