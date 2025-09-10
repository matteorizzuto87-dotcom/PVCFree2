// ===== Sanitized Script for PVCFREE 22.28 (no template literals) =====

// Tabs
(function(){
  var btns = document.querySelectorAll('.tab-btn');
  for (var i=0;i<btns.length;i++){
    (function(b){
      b.addEventListener('click', function(){
        var tab = b.getAttribute('data-tab');
        if (!tab) return;
        var allBtns = document.querySelectorAll('.tab-btn');
        for (var j=0;j<allBtns.length;j++){ allBtns[j].classList.remove('active'); }
        var sections = document.querySelectorAll('.section');
        for (var k=0;k<sections.length;k++){ sections[k].classList.remove('active'); }
        b.classList.add('active');
        var target = document.getElementById(tab);
        if (target) target.classList.add('active');
      });
    })(btns[i]);
  }
})();

// ===== CONTATTI
var qs = function(s){ return document.querySelector(s); };
var $tbodyContatti = qs('#tbl-contatti tbody');

var CONTACT_SEQ = 0; // local id
var contactsData = []; // local cache (UI-level)

function escapeLt(s){
  return String(s||'').replace(/</g, '&lt;');
}

function addRowContatto(row){
  var id = row && row.id ? row.id : (++CONTACT_SEQ);
  row.id = id;
  // save/update dataset
  var idx = -1;
  for (var i=0;i<contactsData.length;i++){ if (contactsData[i].id===id){ idx=i; break; } }
  if (idx >= 0) contactsData[idx] = row; else contactsData.push(row);

  var tr = document.createElement('tr');
  tr.setAttribute('data-id', String(id));

  var imgCell = (row.imgName && row.imgName !== '') ? ('<span class="pill">' + escapeLt(row.imgName) + '</span>') : '—';
  var html = '';
  html += '<td>' + escapeLt(row.azienda||'') + '</td>';
  html += '<td>' + escapeLt(row.email||'') + '</td>';
  html += '<td>' + escapeLt(row.categoria||'') + '</td>';
  html += '<td>' + escapeLt(row.regione||'') + '</td>';
  html += '<td>' + escapeLt(row.polimero||'') + '</td>';
  html += '<td>' + escapeLt(row.processo||'') + '</td>';
  html += '<td>' + escapeLt(row.note||'') + '</td>';
  html += '<td>' + imgCell + '</td>';
  html += '<td class="right">' +
          '<button class="btn btn-outline" data-act="addimg" data-id="'+id+'">Aggiungi img</button> ' +
          '<button class="btn btn-outline" style="border-color:#dc2626;color:#fecaca" data-act="del" data-id="'+id+'">Elimina</button>' +
          '</td>';
  tr.innerHTML = html;

  if ($tbodyContatti) $tbodyContatti.prepend(tr);
}

// Netlify form submit (for attachments + admin)
async function inviaA_Netlify(obj){
  try{
    var nome = obj && obj.nome ? obj.nome : '';
    var email = obj && obj.email ? obj.email : '';
    var messaggio = obj && obj.messaggio ? obj.messaggio : '';
    var file = obj && obj.file ? obj.file : null;

    var frm = document.getElementById('nl-contatti');
    if (frm){
      var iNome = frm.querySelector('input[name="nome"]');
      var iEmail = frm.querySelector('input[name="email"]');
      var iMsg = frm.querySelector('textarea[name="messaggio"]');
      if (iNome) iNome.value = nome;
      if (iEmail) iEmail.value = email;
      if (iMsg) iMsg.value = messaggio;
    }

    var fd = new FormData(frm || undefined);
    if (file) fd.append('allegato', file);

    await fetch('/', { method: 'POST', body: fd });
    console.log('Inviato a Netlify');
  } catch(e){ console.error('Netlify form error:', e); }
}

// Delegation for actions in contacts table
if ($tbodyContatti){
  $tbodyContatti.addEventListener('click', function(ev){
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    var act = t.getAttribute('data-act');
    if (!act) return;
    var tr = t.closest('tr');
    var idAttr = t.getAttribute('data-id') || (tr && tr.getAttribute('data-id')) || '';
    var id = parseInt(idAttr, 10);
    if (act === 'addimg') addImgsToRow(id, tr);
    if (act === 'del') deleteContatto(id, tr);
  });
}

function addImgsToRow(id, tr){
  try{
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(){
      var file = input.files && input.files[0];
      if (!file) return;
      // update dataset
      for (var i=0;i<contactsData.length;i++){
        if (contactsData[i].id===id){ contactsData[i].imgName = file.name; break; }
      }
      // update UI
      if (tr){
        var tds = tr.querySelectorAll('td');
        if (tds.length >= 2){
          var imgTd = tds[tds.length-2];
          imgTd.innerHTML = '<span class="pill">' + escapeLt(file.name) + '</span>';
        }
      }
    };
    input.click();
  }catch(e){ console.error(e); }
}

async function deleteContatto(id, tr){
  if(!confirm('Sei sicuro di voler eliminare questo contatto? Operazione irreversibile.')) return;
  try{
    // optional: remote delete if supabase is present in future
    // remove from dataset
    for (var i=0;i<contactsData.length;i++){
      if (contactsData[i].id===id){ contactsData.splice(i,1); break; }
    }
    // remove row
    if (tr && tr.parentNode) tr.parentNode.removeChild(tr);
    alert('Contatto eliminato.');
  }catch(e){
    console.error(e);
    alert('Errore eliminazione: ' + (e.message || e));
  }
}

// Buttons
(function(){
  var addBtn = document.getElementById('btn-add-contact');
  if (addBtn){
    addBtn.addEventListener('click', async function(){
      var row = {
        azienda : (qs('#azienda') && qs('#azienda').value || '').trim(),
        email   : (qs('#email') && qs('#email').value || '').trim(),
        categoria: (qs('#categoria') && qs('#categoria').value) || '',
        regione : (qs('#regione') && qs('#regione').value || '').trim(),
        polimero: (qs('#polimero') && qs('#polimero').value || '').trim(),
        processo: (qs('#processo') && qs('#processo').value || '').trim(),
        note    : (qs('#note') && qs('#note').value || '').trim()
      };
      var fileInput = qs('#immagini');
      var file = (fileInput && fileInput.files && fileInput.files[0]) ? fileInput.files[0] : null;
      row.imgName = file ? file.name : '';

      addRowContatto(row);
      await inviaA_Netlify({ nome: row.azienda, email: row.email, messaggio: row.note, file: file });
      // lascia l'upload com'è; per resettarlo scommentare la riga seguente:
      // if (fileInput) fileInput.value = '';
    });
  }

  var resetBtn = document.getElementById('btn-reset');
  if (resetBtn){
    resetBtn.addEventListener('click', function(){
      var ids = ['azienda','email','regione','polimero','processo','note'];
      for (var i=0;i<ids.length;i++){ var el = qs('#'+ids[i]); if (el) el.value = ''; }
      var cat = qs('#categoria'); if (cat) cat.selectedIndex = 0;
      var f = qs('#immagini'); if (f) f.value = '';
    });
  }
})();

// Export Excel contacts
function exportXLSX(){
  try{
    if (typeof XLSX === 'undefined'){
      alert('Export non disponibile (libreria XLSX non caricata).');
      return;
    }
    // collect from DOM to keep 1:1 with what you see
    var rows = [];
    var trs = $tbodyContatti ? $tbodyContatti.querySelectorAll('tr') : [];
    for (var i=0;i<trs.length;i++){
      var tds = trs[i].querySelectorAll('td');
      if (tds.length < 8) continue;
      rows.push({
        "#": (i+1),
        "Azienda": tds[0].textContent || "",
        "Email": tds[1].textContent || "",
        "Categoria": tds[2].textContent || "",
        "Regione": tds[3].textContent || "",
        "Polimero": tds[4].textContent || "",
        "Processo": tds[5].textContent || "",
        "Note": tds[6].textContent || "",
        "Immagini (n°)": (tds[7].textContent && tds[7].textContent.trim() !== '—') ? 1 : 0,
        "Immagini URL": "" // Placeholder: in futuro, con Supabase, popola le URL pubbliche
      });
    }
    var ws = XLSX.utils.json_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contatti");
    XLSX.writeFile(wb, "Contatti_K2025_PVC_FREE.xlsx");
  }catch(e){
    console.error(e);
    alert('Errore export: ' + (e.message || e));
  }
}

// Add export button if not present
(function(){
  var tools = document.querySelector('#contatti .tools');
  if (tools && !document.getElementById('btn-export-contacts')){
    var b = document.createElement('button');
    b.id = 'btn-export-contacts';
    b.className = 'btn secondary';
    b.textContent = 'Esporta Excel';
    b.addEventListener('click', function(){ exportXLSX(); });
    tools.appendChild(b);
  }
})();

// ===== DATABASE MATERIALI
var DB = { rows:[], headers:[], idx:{} };

function parseCSV(text){
  var norm = String(text||'').replace(/\r\n/g, '\n');
  var lines = norm.split('\n').filter(function(l){ return l.trim().length; });
  if (lines.length === 0) return { headers:[], rows:[] };
  if (/^ *DATI.+OUTPUT/i.test(lines[0])) lines.shift();

  var sep = ';';
  var headers = lines[0].split(sep).map(function(h){ return h.trim(); });
  var rows = [];
  for (var i=1;i<lines.length;i++){
    var cells = lines[i].split(sep);
    var obj = {};
    for (var c=0;c<headers.length;c++){
      obj[headers[c]] = (cells[c] != null ? String(cells[c]).trim() : '');
    }
    rows.push(obj);
  }
  return { headers: headers, rows: rows };
}

async function loadCSV(){
  var urls = [
    '/data/materiali_database.csv',
    './data/materiali_database.csv',
    'data/materiali_database.csv'
  ];
  var txt = null, used = null;
  for (var i=0;i<urls.length;i++){
    var u = urls[i];
    try{
      var r = await fetch(u + '?v=' + Date.now());
      if (r && r.ok){
        txt = await r.text();
        used = u;
        break;
      }
    }catch(e){}
  }
  if (!txt) throw new Error('CSV non trovato nelle path /data, ./data, data');
  console.log('CSV caricato da:', used);
  var parsed = parseCSV(txt);
  var headers = parsed.headers;
  var rows = parsed.rows;

  DB.headers = headers;
  DB.rows = rows.map(function(r){
    return {
      tipologia: r['Tipologia polimero'] || '',
      applicazione: r['Applicazione'] || '',
      // FIX: manteniamo la stringa originale, niente replace -> parser robusto funzionerà
      durezza: (r['Durezza (ShA) - ISO 868'] || ''),
      sigla: r['Sigla'] || '',
      processo: r['Processo'] || r['Processo '] || '',
      regulation: r['regulation'] || '',
      densita: r['Peso Specifico (g/cm3) ISO 1183-1'] || '',
      carico: r['Carico di Rottura (N/mm2) ISO 527'] || '',
      allung: r['Allungamento a Rottura (N/mm2) ISO 527'] || '',
      cset: r['Compression Set  (ASTM D 395) ( 22°C/72h)'] || r['Compression Set (ASTM D 395) (22°C/72h)'] || '',
      features: r['special features'] || ''
    };
  });
  buildFilters();
  renderDB(DB.rows);
}

function uniq(arr){
  var out = [];
  var seen = {};
  for (var i=0;i<arr.length;i++){
    var v = arr[i];
    if (!v) continue;
    if (seen[v]) continue;
    seen[v] = true;
    out.push(v);
  }
  out.sort();
  return out;
}

function buildFilters(){
  var tip = uniq(DB.rows.map(function(r){ return r.tipologia; }));
  var app = uniq(DB.rows.map(function(r){ return r.applicazione; }));
  var $tip = qs('#f-tipologia'), $app = qs('#f-app');
  for (var i=0;i<tip.length;i++){ var o1=document.createElement('option'); o1.value=tip[i]; o1.textContent=tip[i]; if ($tip) $tip.appendChild(o1); }
  for (var j=0;j<app.length;j++){ var o2=document.createElement('option'); o2.value=app[j]; o2.textContent=app[j]; if ($app) $app.appendChild(o2); }
}

function renderDB(rows){
  var tb = qs('#tbl-db tbody'); if (!tb) return;
  tb.innerHTML = '';
  for (var i=0;i<rows.length;i++){
    var r = rows[i];
    var tr = document.createElement('tr');
    var html = '';
    html += '<td>' + (r.sigla||'') + '</td>';
    html += '<td>' + (r.processo||'') + '</td>';
    html += '<td>' + (r.regulation||'') + '</td>';
    html += '<td>' + (r.densita||'') + '</td>';
    html += '<td>' + (r.carico||'') + '</td>';
    html += '<td>' + (r.allung||'') + '</td>';
    html += '<td>' + (r.cset||'') + '</td>';
    html += '<td>' + (r.features||'') + '</td>';
    tr.innerHTML = html;
    tb.appendChild(tr);
  }
  var meta = qs('#db-meta'); if (meta) meta.textContent = String(rows.length) + ' risultati';
}

// Robust hardness parser
function getHardnessValue(row){
  try{
    var keys = ['durezza','Durezza','hardness','Hardness','ShA','Shore A','Shore_A','shore_a','ShoreA'];
    var raw = '';
    for (var i=0;i<keys.length;i++){
      var k = keys[i];
      if (row && row[k] != null && String(row[k]).trim() !== ''){
        raw = String(row[k]);
        break;
      }
    }
    if (!raw && row && row.durezza != null) raw = String(row.durezza);
    if (!raw) return NaN;
    raw = raw.replace(',', '.');
    var m = raw.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : NaN;
  }catch(e){ return NaN; }
}

function applyFilters(){
  var catEl = document.getElementById('f-tipologia');
  var appEl = document.getElementById('f-app');
  var minEl = document.getElementById('f-min');
  var maxEl = document.getElementById('f-max');

  var cat = catEl && catEl.value ? String(catEl.value).trim() : '';
  var app = appEl && appEl.value ? String(appEl.value).trim() : '';
  var minStr = minEl && minEl.value ? String(minEl.value).trim().replace(',', '.') : '';
  var maxStr = maxEl && maxEl.value ? String(maxEl.value).trim().replace(',', '.') : '';
  var min = (minStr === '') ? -Infinity : parseFloat(minStr);
  var max = (maxStr === '') ?  Infinity : parseFloat(maxStr);

  var src = (window.DB && Array.isArray(DB.rows)) ? DB.rows : [];
  var out = [];
  for (var i=0;i<src.length;i++){
    var r = src[i];
    if (cat && String(r.tipologia||'') !== cat) continue;
    if (app && String(r.applicazione||'') !== app) continue;

    var hv = getHardnessValue(r);
    if (!isFinite(hv)){
      if (isFinite(min) || isFinite(max)) continue;
    } else {
      if (hv < min) continue;
      if (hv > max) continue;
    }
    out.push(r);
  }
  renderDB(out);
}

function exportCSV(rows){
  var headers = ['Sigla','Processo','regulation','Peso Specifico (g/cm3) ISO 1183-1','Carico di Rottura (N/mm2) ISO 527','Allungamento a Rottura (N/mm2) ISO 527','Compression Set (ASTM D 395) ( 22°C/72h)','special features'];
  var lines = [];
  lines.push(headers.join(';'));
  for (var i=0;i<rows.length;i++){
    var r = rows[i];
    var arr = [r.sigla,r.processo,r.regulation,r.densita,r.carico,r.allung,r.cset,r.features].map(function(v){
      return String(v==null?'':v).replace(/;/g,',');
    });
    lines.push(arr.join(';'));
  }
  var blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='materiali_filtrati.csv'; a.click();
}

(function wireDB(){
  var applyBtn = document.getElementById('btn-apply');
  if (applyBtn) applyBtn.addEventListener('click', applyFilters);
  var resetBtn = document.getElementById('btn-reset-db');
  if (resetBtn){
    resetBtn.addEventListener('click', function(){
      var sel1 = document.getElementById('f-tipologia'); if (sel1) sel1.selectedIndex = 0;
      var sel2 = document.getElementById('f-app'); if (sel2) sel2.selectedIndex = 0;
      var fmin = document.getElementById('f-min'); if (fmin) fmin.value = '';
      var fmax = document.getElementById('f-max'); if (fmax) fmax.value = '';
      renderDB(DB.rows);
    });
  }
  var expBtn = document.getElementById('btn-export-db');
  if (expBtn){
    expBtn.addEventListener('click', function(){
      var tb = qs('#tbl-db tbody');
      var out = [];
      if (tb){
        var trs = tb.children;
        for (var i=0;i<trs.length;i++){
          var tds = trs[i].querySelectorAll('td');
          out.push({
            sigla: tds[0].textContent, processo: tds[1].textContent, regulation: tds[2].textContent,
            densita: tds[3].textContent, carico: tds[4].textContent, allung: tds[5].textContent,
            cset: tds[6].textContent, features: tds[7].textContent
          });
        }
      }
      exportCSV(out);
    });
  }
  // range triggers
  ['f-min','f-max'].forEach(function(id){
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', function(e){ if (e.key === 'Enter') applyFilters(); });
    el.addEventListener('blur', applyFilters);
  });
})();

// INIT
(function init(){
  loadCSV().catch(function(e){
    console.error(e);
    var meta = qs('#db-meta'); if (meta) meta.textContent = 'Errore: ' + (e && e.message ? e.message : e);
  });
})();

// ====== Gate (handled by gate_clean.js)
