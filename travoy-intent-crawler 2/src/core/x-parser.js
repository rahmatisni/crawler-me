/**
 * Mengambil tweet dari respons GraphQL X secara "toleran struktur":
 * menelusuri seluruh JSON dan mengambil setiap objek tweet (punya rest_id + legacy.full_text),
 * sehingga tidak bergantung pada urutan instructions/entries yang sering berubah.
 */
const SKIP_KEYS = new Set(['quoted_status_result', 'retweeted_status_result']);

function userOf(tweet) {
  const u = tweet?.core?.user_results?.result;
  if (!u) return {};
  return {
    username: u.legacy?.screen_name ?? u.core?.screen_name ?? null,
    location: u.legacy?.location ?? u.location?.location ?? null,
  };
}

/** Kenali objek tweet dengan beberapa kemungkinan skema (lama maupun baru). */
function tweetText(node) {
  const legacy = node.legacy ?? node;
  return (
    node.note_tweet?.note_tweet_results?.result?.text ??
    legacy.full_text ??
    (typeof legacy.text === 'string' ? legacy.text : undefined)
  );
}

function isTweet(node) {
  const id = String(node.rest_id ?? node.id_str ?? '');
  if (!/^\d{6,}$/.test(id)) return false;
  const legacy = node.legacy ?? node;
  if (typeof tweetText(node) !== 'string') return false;
  // Bedakan dari objek user: tweet punya salah satu penanda ini
  return Boolean(legacy.created_at || legacy.conversation_id_str || 'favorite_count' in legacy || node.__typename === 'Tweet');
}

function toRow(tweet) {
  const legacy = tweet.legacy ?? tweet;
  const { username, location } = userOf(tweet);
  const id = String(tweet.rest_id ?? tweet.id_str);
  return {
    created_at: legacy.created_at ?? '',
    id_str: id,
    full_text: tweetText(tweet),
    quote_count: legacy.quote_count ?? 0,
    reply_count: legacy.reply_count ?? 0,
    retweet_count: legacy.retweet_count ?? 0,
    favorite_count: legacy.favorite_count ?? 0,
    lang: legacy.lang,
    user_id_str: legacy.user_id_str,
    conversation_id_str: legacy.conversation_id_str,
    username,
    tweet_url: `https://x.com/i/status/${id}`,
    image_url: legacy.entities?.media?.[0]?.media_url_https ?? '',
    location,
    in_reply_to_screen_name: legacy.in_reply_to_screen_name ?? '',
  };
}

export function extractTweetsFromGraphql(json, out = new Map()) {
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.__typename === 'TweetWithVisibilityResults' && node.tweet) return walk(node.tweet);
    if (isTweet(node)) {
      const row = toRow(node);
      if (!out.has(row.id_str)) out.set(row.id_str, row);
      return; // jangan masuk ke quoted/retweeted tweet
    }
    for (const [k, v] of Object.entries(node)) {
      if (!SKIP_KEYS.has(k)) walk(v);
    }
  };
  walk(json);
  return out;
}
