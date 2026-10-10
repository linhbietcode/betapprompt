import {handleRecommend} from '../server/gemini.mjs';

export function createVercelHandler(environment = process.env, fetcher = fetch) {
  return async request => {
    const key = String(environment.GEMINI_API_KEY ?? '').trim();
    const headers = new Headers(request.headers);
    headers.delete('oai-authenticated-user-id');
    headers.delete('cf-connecting-ip');
    // Vercel supplies this header; do not trust client-supplied identity headers.
    const address = headers.get('x-vercel-forwarded-for')?.split(',')[0].trim();
    headers.set('cf-connecting-ip', 'vercel:' + (address || 'unknown'));
    return handleRecommend(new Request(request, {headers}), {
      GEMINI_API_KEY: key && key !== 'DAN_KHOA_GEMINI_CUA_BAN_VAO_DAY' ? key : undefined,
      GEMINI_MODEL: environment.GEMINI_MODEL,
    }, fetcher);
  };
}

export default {fetch: createVercelHandler()};
