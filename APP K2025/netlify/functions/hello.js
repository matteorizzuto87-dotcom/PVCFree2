// netlify/functions/hello.js
exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  body: 'hello from netlify functions'
});
