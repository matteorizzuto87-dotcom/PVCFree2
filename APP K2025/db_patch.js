
// === PVC-FREE K2025 — Database runtime patch ===
// Scopo: sostituire SOLO la sezione "Database Materiali" di index.html al volo,
// mantenendo grafica e contatti intatti.
//
// Requisiti: cartella ./data/materiali_database.csv esistente

(function(){
  const CSV_PATH = "./data/materiali_database.csv";

  // Carica PapaParse se non presente
  function ensurePapa(cb){
    if (window.Papa && typeof window.Papa.parse === "function") return cb();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js";
    s.onload = cb;
    document.head.appendChild(s);
  }

  // Normalizzazioni/utility
  const norm = s => String(s||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ").trim();
  const toNumber = x => {
    if (x === null || x === undefined) return NaN;
    const s = String(x).toLowerCase().replace(",", ".");
    const m = s.match(/(\d+(\.\d+)?)/);
    return m ? parseFloat(m[1]) : NaN;
  };

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
      sigla:       findCol(header, COLS.sigla) || header[0],
      processo:    findCol(header, COLS.processo),
      regulation:  findCol(header, COLS.regulation),
      peso:        findCol(header, COLS.peso),
      carico:      findCol(header, COLS.carico),
      allung:      findCol(header, COLS.allung),
      compress:    findCol(header, COLS.compress),
      special:     findCol(header, COLS.special)
    };
  }

  function buildUI(container){
    container.innerHTML = `
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

  function setup(){
    const section = document.querySelector("#view-materials");
    if (!section) return; // niente da fare
    buildUI(section);

    let allRows = [];
    let filteredRows = [];

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

    function render(){
      const body = document.getElementById("materials-body");
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
      document.getElementById("materials-empty").style.display = filteredRows.length ? "none" : "block";
      document.getElementById("result-count").textContent = `${filteredRows.length} risultati`;
    }

    function applyFilters(){
      const fp = norm(document.getElementById("f-polimero").value);
      const fa = norm(document.getElementById("f-applicazione").value);
      const hmin = parseFloat(document.getElementById("f-hard-min").value || "0");
      const hmax = parseFloat(document.getElementById("f-hard-max").value || "100");

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
      document.getElementById("f-polimero").value = "";
      document.getElementById("f-applicazione").value = "";
      const hs = allRows.map(r => toNumber(r.durezza)).filter(v => !isNaN(v));
      document.getElementById("f-hard-min").value = hs.length ? Math.floor(Math.min.apply(null, hs)) : 0;
      document.getElementById("f-hard-max").value = hs.length ? Math.ceil(Math.max.apply(null, hs)) : 100;
      applyFilters();
    }

    document.getElementById("btn-apply").addEventListener("click", applyFilters);
    document.getElementById("btn-reset").addEventListener("click", resetFilters);
    document.getElementById("btn-export").addEventListener("click", exportCSV);

    // Carica CSV
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
        document.getElementById("materials-empty").style.display = "block";
      }
    });
  }

  function start(){
    const section = document.querySelector("#view-materials");
    if (!section) return;
    ensurePapa(setup);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
