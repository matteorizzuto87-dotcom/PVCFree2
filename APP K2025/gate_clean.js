// Gate clean script
(function(){
  function unlock() {
    var pwEl = document.getElementById('sharedPw');
    var msg = document.getElementById('gateMsg');
    var val = (pwEl && pwEl.value) ? pwEl.value.replace(/^\s+|\s+$/g,'') : "";
    if (val === "Elicottero64") {
      try { sessionStorage.setItem('k2025_gate','ok'); } catch(e) {}
      var g = document.getElementById('gate'); if (g) g.style.display='none';
    } else {
      if (msg) msg.textContent = "Password errata";
    }
  }
  function setUp() {
    var gate = document.getElementById('gate');
    if (!gate) return;
    var ok = false;
    try { ok = sessionStorage.getItem('k2025_gate') === 'ok'; } catch(e) {}
    if (!ok) { gate.style.display = 'grid'; }
    var btn = document.getElementById('gateBtn'); if (btn) btn.onclick = unlock;
    var clr = document.getElementById('gateClear'); if (clr) clr.onclick = function(){
      var p=document.getElementById('sharedPw'); if(p){p.value=''; p.focus();}
    };
    var input = document.getElementById('sharedPw');
    if (input) input.addEventListener('keydown', function(e){ if (e.key === 'Enter') unlock(); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setUp);
  } else {
    setUp();
  }
})();