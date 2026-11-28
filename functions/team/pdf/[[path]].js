// /team/pdf/<slug>.pdf
//
// Most submission PDFs ship as static assets (public/Vista/team/pdf). Cloudflare Pages
// rejects any single file over 25 MiB, so the few larger PDFs live in R2 instead
// (key: team/pdf/<slug>.pdf, see scripts/upload-team-pdfs-to-r2.sh).
//
// R2 is checked first, then we fall through to the static asset, so a PDF works from
// either place without the page having to know which one it is.
export async function onRequestGet(context) {
  const { env, params, request } = context;
  const segments = Array.isArray(params.path) ? params.path : [params.path];
  const name = segments.join('/');

  // Slugs only: lowercase letters, digits, dashes. Blocks path tricks like "../".
  if (!/^[a-z0-9-]+\.pdf$/.test(name)) {
    return new Response('Not found', { status: 404 });
  }

  if (env.MEDIA_BUCKET) {
    const object = await env.MEDIA_BUCKET.get(`team/pdf/${name}`);
    if (object) {
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Content-Type', 'application/pdf');
      headers.set('Cache-Control', 'public, max-age=86400');
      return new Response(object.body, { headers });
    }
  }

  return env.ASSETS.fetch(request);
}
