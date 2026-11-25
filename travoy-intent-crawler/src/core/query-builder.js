/**
 * Menyusun query pencarian X dari satu keyword.
 * Keyword ditulis dalam sintaks pencarian X (frasa pakai tanda kutip, OR, dsb.),
 * lalu ditambah filter bahasa, retweet, dan rentang tanggal.
 */
export function buildQuery(keyword, { lang, excludeRetweets, since, until }) {
  const parts = [keyword.trim()];
  if (lang) parts.push(`lang:${lang}`);
  if (excludeRetweets) parts.push('-filter:retweets');
  if (since) parts.push(`since:${since}`);
  if (until) parts.push(`until:${until}`);
  return parts.join(' ');
}

/** Ubah daftar keyword topik menjadi [{ keyword, type }] sesuai filter --only. */
export function flattenKeywords(topic, only) {
  const out = [];
  for (const type of ['eksplisit', 'implisit']) {
    if (only && only !== type) continue;
    for (const keyword of topic.keywords[type] ?? []) out.push({ keyword, type });
  }
  return out;
}
