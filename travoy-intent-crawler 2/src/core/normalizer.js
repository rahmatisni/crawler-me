import crypto from 'node:crypto';
import fs from 'node:fs';
import Papa from 'papaparse';

const NUMERIC = ['quote_count', 'reply_count', 'retweet_count', 'favorite_count'];

export function readCsv(csvPath) {
  const text = fs.readFileSync(csvPath, 'utf8');
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });
  return data.filter((row) => row.id_str);
}

const hash = (value, salt) =>
  value ? crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex').slice(0, 16) : null;

/** Bersihkan teks untuk dipakai sebagai kandidat ujaran (teks asli tetap disimpan). */
export function cleanText(text = '') {
  return text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/@\w+/g, '@USER')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ubah satu baris CSV tweet-harvest menjadi record JSON. */
export function normalizeTweet(row, { anonymize, hashSalt }) {
  const record = {
    id_str: row.id_str,
    created_at: row.created_at,
    full_text: row.full_text,
    text_clean: cleanText(row.full_text),
    lang: row.lang,
    conversation_id_str: row.conversation_id_str || null,
    tweet_url: `https://x.com/i/status/${row.id_str}`,
    has_image: Boolean(row.image_url),
  };
  for (const k of NUMERIC) record[k] = Number(row[k]) || 0;

  if (anonymize) {
    record.user_hash = hash(row.username || row.user_id_str, hashSalt);
    record.in_reply_to_hash = hash(row.in_reply_to_screen_name, hashSalt);
  } else {
    record.username = row.username || null;
    record.user_id_str = row.user_id_str || null;
    record.location = row.location || null;
    record.in_reply_to_screen_name = row.in_reply_to_screen_name || null;
  }
  return record;
}
