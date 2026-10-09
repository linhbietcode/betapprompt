import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {DEFAULT_GEMINI_MODEL} from '../public/gemini-errors.mjs';

export function readGeminiConfig(file = fileURLToPath(new URL('../gemini.env', import.meta.url)), environment = process.env) {
  let local = {};
  try { local = parseEnv(readFileSync(file, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('Khong doc duoc gemini.env. Kiem tra dinh dang tep.'); }
  const config = {...environment, ...local};
  const key = String(config.GEMINI_API_KEY ?? '').trim();
  return {
    GEMINI_API_KEY: key && key !== 'DAN_KHOA_GEMINI_CUA_BAN_VAO_DAY' ? key : undefined,
    GEMINI_MODEL: String(config.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim(),
  };
}
