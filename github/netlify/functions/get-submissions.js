// netlify/functions/get-submissions.js
export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json; charset=utf-8"
  };
  if (event.httpMethod === "OPTIONS") { return { statusCode: 204, headers }; }

  const token = process.env.NETLIFY_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  const formName = (process.env.FORM_NAME || "contatti").toLowerCase();
  const per_page = Math.min(parseInt((event.queryStringParameters && event.queryStringParameters.per_page) || "1000", 10), 1000);
  const page = parseInt((event.queryStringParameters && event.queryStringParameters.page) || "1", 10);

  if (!token || !siteId) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing NETLIFY_TOKEN or NETLIFY_SITE_ID env vars." }) };
  }

  const base = "https://api.netlify.com/api/v1";
  try {
    const formsRes = await fetch(`${base}/sites/${siteId}/forms`, { headers: { Authorization: `Bearer ${token}` } });
    if (!formsRes.ok) { const t = await formsRes.text(); throw new Error(`List forms failed: ${formsRes.status} ${t}`); }
    const forms = await formsRes.json();
    const form = forms.find(f => (f.name || "").toLowerCase() === formName);
    if (!form) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: `Form '${formName}' not found on site ${siteId}`, forms: forms.map(f=>({id:f.id,name:f.name})) }) };
    }

    const subsRes = await fetch(`${base}/forms/${form.id}/submissions?per_page=${per_page}&page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!subsRes.ok) { const t = await subsRes.text(); throw new Error(`List submissions failed: ${subsRes.status} ${t}`); }
    const raw = await subsRes.json();

    const norm = raw.map(s => {
      const d = s.data || {};
      const att = [];
      if (Array.isArray(s.attachments)) s.attachments.forEach(a => { if (a && a.url) att.push({ url: a.url, name: a.name || a.filename || "file" }); });
      if (Array.isArray(s.files)) s.files.forEach(a => { if (a && a.url) att.push({ url: a.url, name: a.name || a.filename || "file" }); });
      Object.entries(d).forEach(([k,v]) => {
        const sv = String(v||"");
        if (/^https?:\/\/.+/.test(sv) && (/\.(png|jpe?g|gif|webp|pdf)(\?|$)/i.test(sv) || sv.includes("/forms/"))) att.push({ url: sv, name: k });
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
