// materials_section.js
// Database Materiali – loader CSV + filtri + export
// Compatibile con index: usa gli ID:
// #f-tipologia #f-app #f-min #f-max #btn-apply #btn-reset-db #btn-export-db #tbl-db #db-meta

(function(){
  'use strict';

  var DB = { rows: [] };

  function qs(sel){ return document.querySelector(sel); }
  function qsa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function uniq(arr){ return Array.from(new Set(arr.filter(Boolean))).sort(); }

  function parseCSV(text){
    // Normalizza e splitta in righe non vuote
    var lines = String(text||'').replace(/\r\n/g,'\n').split('\n').filter(function(l){ return l.trim().length; });
    if (!lines.length) return { headers: [], rows: [] };
    // Se esiste un header tecnico iniziale, scartalo (compat con zip che usavi)
    if (/^ *DATI.+OUTPUT/i.test(lines[0])) lines.shift();
    // Il tuo CSV è con separatore ';'
    var sep = ';';
    var headers = lines[0].split(sep).map(function(h){ return h.trim(); });
    var rows = lines.slice(1).map(function(line){
      // Non gestiamo campi con ; quotati: il tuo file usa valori semplici
      var cells = line.split(sep);
      var obj = {}; headers.forEach(function(h,i){ obj[h] = (cells[i]||'').trim(); });
      return obj;
    });
    return { headers: headers, rows: rows };
  }

  function mapRow(r){
    // Mappatura esatta delle colonne che avevi nel DB “perfetto”
    return {
      tipologia:   r['Tipologia polimero'] || '',
      applicazione:r['Applicazione'] || '',
      durezza:     String(r['Durezza (ShA) - ISO 868']||'').replace(/[^\d.]/g,''),
      sigla:       r['Sigla'] || '',
      processo:    r['Processo'] || r['Processo '] || '',
      regulation:  r['regulation'] || '',
      densita:     r['Peso Specifico (g/cm3) ISO 1183-1'] || '',
      carico:      r['Carico di Rottura (N/mm2) ISO 527'] || '',
      allung:      r['Allungamento a Rottura (N/mm2) ISO 527'] || '',
      cset:        r['Compression Set  (ASTM D 395) ( 22°C/72h)'] || r['Compression Set (ASTM D 395) (22°C/72h)'] || '',
      features:    r['special features'] || ''
    };
  }

  function renderDB(rows){
    var tb = qs('#tbl-db tbody');
    if (!tb) return;
    tb.innerHTML = '';
    rows.forEach(function(r){
      var tr = document.createElement('tr');
      function td(text){ var el=document.createElement('td'); el.textContent = text||''; return el; }
      tr.appendChild(td(r.sigla));
      tr.appendChild(td(r.processo));
      tr.appendChild(td(r.regulation));
      tr.appendChild(td(r.densita));
      tr.appendChild(td(r.carico));
      tr.appendChild(td(r.allung));
      tr.appendChild(td(r.cset));
      tr.appendChild(td(r.features));
      tb.appendChild(tr);
    });
    var meta = qs('#db-meta'); if (meta) meta.textContent = rows.length + ' righe';
  }

  function buildFilters(){
    var tip = uniq(DB.rows.map(function(r){ return r.tipologia; }));
    var app = uniq(DB.rows.map(function(r){ return r.applicazione; }));
    var $tip = qs('#f-tipologia'), $app = qs('#f-app');
    if ($tip){ tip.forEach(function(v){ var o=document.createElement('option'); o.value=v; o.textContent=v; $tip.appendChild(o); }); }
    if ($app){ app.forEach(function(v){ var o=document.createElement('option'); o.value=v; o.textContent=v; $app.appendChild(o); }); }
  }

  function applyFilters(){
    var tip = (qs('#f-tipologia') && qs('#f-tipologia').value) || '';
    var app = (qs('#f-app') && qs('#f-app').value) || '';
    var min = parseFloat(((qs('#f-min') && qs('#f-min').value) || '').replace(',','.'));
    var max = parseFloat(((qs('#f-max') && qs('#f-max').value) || '').replace(',','.'));
    var out = DB.rows.filter(function(r){
      if (tip && r.tipologia !== tip) return false;
      if (app && r.applicazione !== app) return false;
      var d = parseFloat(r.durezza || '');
      if (!isNaN(min) && !isNaN(d) && d < min) return false;
      if (!isNaN(max) && !isNaN(d) && d > max) return false;
      if ((isNaN(min) || isNaN(max)) && isNaN(d)){
        if (!isNaN(min) || !isNaN(max)) return false;
      }
      return true;
    });
    renderDB(out);
  }

  function exportCSVFromTable(){
    var tb = qs('#tbl-db tbody'); if (!tb) return;
    var rows = [];
    qsa('#tbl-db tbody tr').forEach(function(tr){
      var t = tr.querySelectorAll('td');
      rows.push({
        sigla: t[0].textContent, processo: t[1].textContent, regulation: t[2].textContent,
        densita: t[3].textContent, carico: t[4].textContent, allung: t[5].textContent,
        cset: t[6].textContent, features: t[7].textContent
      });
    });
    var headers = ['Sigla','Processo','regulation','Peso Specifico (g/cm3) ISO 1183-1','Carico di Rottura (N/mm2) ISO 527','Allungamento a Rottura (N/mm2) ISO 527','Compression Set (ASTM D 395) (22°C/72h)','special features'];
    var lines = [headers.join(';')].concat(rows.map(function(r){
      return [r.sigla,r.processo,r.regulation,r.densita,r.carico,r.allung,r.cset,r.features]
        .map(function(v){ return String(v).replace(/;/g, ','); }).join(';');
    }));
    var blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8'});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'materiali_filtrati.csv'; a.click();
  }

  async function loadCSV(){
    var urls = ['/data/materiali_database.csv', './data/materiali_database.csv', 'data/materiali_database.csv'];
    var txt=null;
    for (var i=0;i<urls.length;i++){
      var u = urls[i];
      try {
        var r = await fetch(u + '?v=' + Date.now(), { cache: 'no-store' });
        if (r.ok){ txt = await r.text(); break; }
      } catch(e) {}
    }
    if (!txt) throw new Error('CSV non trovato nelle path /data, ./data, data');
    var parsed = parseCSV(txt);
    DB.rows = parsed.rows.map(mapRow);
    buildFilters();
    renderDB(DB.rows);
  }

  function wireEvents(){
    var btnApply = qs('#btn-apply');        if (btnApply)  btnApply.addEventListener('click', applyFilters);
    var btnReset = qs('#btn-reset-db');     if (btnReset)  btnReset.addEventListener('click', function(){
      ['#f-tipologia','#f-app','#f-min','#f-max'].forEach(function(sel){
        var el = qs(sel); if (!el) return;
        if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = '';
      });
      renderDB(DB.rows);
    });
    var btnExport = qs('#btn-export-db');   if (btnExport) btnExport.addEventListener('click', exportCSVFromTable);
  }

  function initIfPresent(){
    if (!document.getElementById('view-materials')) return;
    wireEvents();
    // Carica il CSV quando il DOM è pronto
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', function(){ loadCSV().catch(function(e){ console.error(e); var m=qs('#db-meta'); if(m) m.textContent = 'Errore: ' + e.message; }); });
    } else {
      loadCSV().catch(function(e){ console.error(e); var m=qs('#db-meta'); if(m) m.textContent = 'Errore: ' + e.message; });
    }
  }

  // Avvio
  initIfPresent();
})();
