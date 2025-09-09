// github/netlify/functions/get-submissions.js
export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json; charset=utf-8"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };

  const token = process.env.NETLIFY_TOKEN;
  const siteHint = (process.env.NETLIFY_SITE_ID || "").trim();   // può essere nome o id
  const formName = (process.env.FORM_NAME || "contatti").toLowerCase();
  const per_page = Math.min(parseInt((event.queryStringParameters && event.queryStringParameters.per_page) || "1000", 10), 1000);
  const page = parseInt((event.queryStringParameters && event.queryStringParameters.page) || "1", 10);

  if (!token) return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing NETLIFY_TOKEN env var." }) };

  const base = "https://api.netlify.com/api/v1";
  const api = (path, opts={}) => fetch(base + path, { headers: { Authorization: `Bearer ${token}` }, ...opts });

  async function resolveSite() {
    // 1) Prova diretta con hint (nome o id)
    if (siteHint) {
      const r = await api(`/sites/${siteHint}`);
      if (r.ok) return await r.json();
    }
    // 2) Risolvi dal dominio richiesto (es. pvcfree2.netlify.app)
    const host = (event.headers?.host || "").split(":")[0];
    if (host) {
      const rs = await api(`/sites`);
      if (rs.ok) {
        const sites = await rs.json();
        const found = sites.find(s =>
          s.ssl_url?.includes(host) || s.url?.includes(host) ||
          s.name === siteHint || s.name === host.split(".")[0]
        );
        if (found) return found;
      }
    }
    // 3) Ultimo tentativo: lista siti e cerca per hint
    if (siteHint) {
      const rs = await api(`/sites`);
      if (rs.ok) {
        const sites = await rs.json();
        const found = sites.find(s => s.name === siteHint || s.id === siteHint);
        if (found) return found;
      }
    }
    throw new Error(`Cannot resolve site (hint='${siteHint || "none"}').`);
  }

  try {
    const site = await resolveSite();

    // prendi i forms del sito (con fallback)
    let formsRes = await api(`/sites/${site.id}/forms`);
    let forms;
    if (formsRes.ok) {
      forms = await formsRes.json();
    } else {
      const allRes = await api(`/forms`);
      if (!allRes.ok) {
        const t = await allRes.text();
        throw new Error(`List forms fallback failed: ${allRes.status} ${t}`);
      }
      const all = await allRes.json();
      forms = all.filter(f => f.site_id === site.id);
      if (!forms.length) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: `No forms found for site ${site.name} (${site.id})` }) };
      }
    }

    const form = forms.find(f => (f.name || "").toLowerCase() === formName) || forms[0];
    if (!form) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: `Form '${formName}' not found`, forms: forms.map(f => ({ id: f.id, name: f.name })) }) };
    }

    const subsRes = await api(`/forms/${form.id}/submissions?per_page=${per_page}&page=${page}`);
    if (!subsRes.ok) {
      const t = await subsRes.text();
      throw new Error(`List submissions failed: ${subsRes.status} ${t}`);
    }
    const raw = await subsRes.json();

    const norm = raw.map(s => {
      const d = s.data || {};
      const att = [];
      (Array.isArray(s.attachments) ? s.attachments : []).forEach(a => { if (a?.url) att.push({ url: a.url, name: a.name || a.filename || "file" }); });
      (Array.isArray(s.files) ? s.files : []).forEach(a => { if (a?.url) att.push({ url: a.url, name: a.name || a.filename || "file" }); });
      Object.entries(d).forEach(([k,v]) => {
        const sv = String(v || "");
        if (/^https?:\/\//.test(sv) && (/\.(png|jpe?g|gif|webp|pdf)(\?|$)/i.test(sv) || sv.includes("/forms/"))) att.push({ url: sv, name: k });
      });
      const seen = new Set();
      const attachments = att.filter(a => { if (!a.url || seen.has(a.url)) return false; seen.add(a.url); return true; });
      return { id: s.id, created_at: s.created_at, number: s.number, data: d, name: s.name || d.nome || "", email: s.email || d.email || "", attachments };
    });

    return { statusCode: 200, headers, body: JSON.stringify({ form_id: form.id, form_name: form.name, count: norm.length, submissions: norm }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
}
