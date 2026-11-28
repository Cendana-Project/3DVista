function safeDecode(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const segments = Array.isArray(params.path) ? params.path : [params.path];
  const key = `media/${segments.map(safeDecode).join('/')}`;

  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=604800');
  return new Response(object.body, { headers });
}
