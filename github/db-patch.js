// PVC-FREE K2025 — db-patch.js (v5c, CSV cache-bust)
(function(){
  const VERSION = "v5c";
  console.info(`[db-patch.js ${VERSION}] loaded`);

  try { window.loadMaterials = function(){}; } catch(e){}

  const originalSwitchTab = window.switchTab;
  window.switchTab = function(view){
    try { if (typeof originalSwitchTab === "function") originalSwitchTab(view); } catch(e){}
    if (/(material|database)/i.test(String(view||""))) setTimeout(start, 0);
  };

  // Cache-bust on CSV fetch (prevents 304 stale content)
  const CSV_PATH = "./data/materiali_database.csv?v=1757505148";

  function ensurePapa(cb){
    if (window.Papa && typeof window.Papa.parse === "function") return cb();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js";
    s.onload = cb;
    document.head.appendChild(s);
  }
  const norm = s => String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  const toNumber = x => { if (x == null) return NaN; const m = String(x).toLowerCase().replace(",", ".").match(/(\d+(\.\d+)?)/); return m ? parseFloat(m[1]) : NaN; };

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

  function findSection(){
    let el = document.querySelector("#view-materials, #materials, [data-view='materials'], [data-tab='database'], section#database, section[id*='material'], main #database");
    if (el) return el;
    const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4"));
    const found = headings.find(h => /(database|materiali)\s+material/i.test(h.textContent||""));
    if (found){
      const candidates = [".card",".section","section","main",".container"];
      for (const sel of candidates){ const c = found.closest(sel); if (c) return c; }
      return found.parentElement || found;
    }
    const mains = document.querySelectorAll("main, .main, .container");
    for (const m of mains){ const sec = m.querySelector("section"); if (sec) return sec; }
    return null;
  }

  function buildUI(container){
    if (!container) { console.warn("[db-patch v5c] container non trovato"); return false; }
    if (container.__dbUIBuilt) { console.info("[db-patch v5c] UI già presente"); return true; }
    container.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin:6px 0">
        <img src="./assets/sft-polymer.png" alt="SFT Polymer" style="height:26px"/>
      </div>
      <div class="card card-pad">
        <h2 id="db-title" style="margin-top:0">Database Materiali <span class="muted">— scegli tra i materiali a disposizione</span></h2>
        <div class="grid" style="margin-top:12px">
          <div class="col-4">
            <label for="f-polimero">Tipologia polimero</label>
            <select id="f-polimero" name="polimero" aria-labelledby="db-title">
              <option value="">Tutte</option>
              <option value="TPE-S">TPE-S</option>
              <option value="BIO">BIO</option>
              <option value="TPU">TPU</option>
              <option value="TPO">TPO</option>
            </select>
          </div>
          <div class="col-4">
            <label for="f-applicazione">Applicazione</label>
            <select id="f-applicazione" name="applicazione" aria-labelledby="db-title">
              <option value="">Tutte</option>
              <option value="tecnico">tecnico</option>
              <option value="biodegradabile">biodegradabile</option>
              <option value="medicale">medicale</option>
            </select>
          </div>
          <div class="col-2">
            <label for="f-hard-min">Durezza (ShA) — min</label>
            <input id="f-hard-min" name="durezza_min" type="number" min="0" max="100" placeholder="min" aria-describedby="db-title"/>
          </div>
          <div class="col-2">
            <label for="f-hard-max">…max</label>
            <input id="f-hard-max" name="durezza_max" type="number" min="0" max="100" placeholder="max" aria-describedby="db-title"/>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap">
          <button class="btn btn-primary" id="btn-apply" aria-label="Applica filtri materiali">Applica</button>
          <button class="btn btn-outline" id="btn-reset" aria-label="Reset filtri materiali">Reset</button>
          <button class="btn btn-outline" id="btn-export" aria-label="Esporta risultati in CSV">Esporta CSV</button>
          <div class="muted" id="result-count" role="status" aria-live="polite">0 risultati</div>
          <div class="right muted">Sorgente: <code>./data/materiali_database.csv</code></div>
        </div>
      </div>
      <div class="table-wrap card card-pad" style="margin-top:12px">
        <table aria-describedby="db-title">
          <thead>
            <tr>
              <th scope="col">Sigla</th>
              <th scope="col">Processo</th>
              <th scope="col">regulation</th>
              <th scope="col">Peso Specifico (g/cm3) ISO 1183-1</th>
              <th scope="col">Carico di Rottura (N/mm2) ISO 527</th>
              <th scope="col">Allungamento a Rottura (N/mm2) ISO 527</th>
              <th scope="col">Compression Set (ASTM D 395) (22°C/72h)</th>
              <th scope="col">special features</th>
            </tr>
          </thead>
          <tbody id="materials-body"></tbody>
        </table>
        <div id="materials-empty" class="muted" style="margin-top:8px;display:none">Nessun materiale corrispondente ai filtri.</div>
      </div>
    `;
    container.__dbUIBuilt = true;
    console.info("[db-patch v5c] UI costruita");
    return true;
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
      const lines = [header.join(";")];
      filteredRows.forEach(r => {
        const row = [r.sigla||"",r.processo||"",r.regulation||"",r.peso||"",r.carico||"",r.allung||"",r.compress||"",r.special||""];
        lines.push(row.map(v => `"$\{String(v).replace(/"/g,'""')\}"`).join(";"));
      });
      const blob = new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8"});
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
        const header = res.meta.fields || Object.keys(data[0] || {
        });
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

  function start(){
    ensurePapa(function(){
      const container = findSection();
      if (!container){ console.warn("[db-patch v5c] sezione Database non trovata"); return; }
      if (buildUI(container)) initLogic();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  document.addEventListener("click", (e)=>{
    const t = e.target;
    if (!t) return;
    const txt = (t.textContent||"") + " " + (t.getAttribute&&t.getAttribute("aria-label")||"");
    if (/(database|materiali|materials)/i.test(txt)) setTimeout(start, 0);
  });
})();