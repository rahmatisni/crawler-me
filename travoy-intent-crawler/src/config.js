import 'dotenv/config';

const bool = (v, d) => (v === undefined || v === '' ? d : ['1', 'true', 'yes'].includes(String(v).toLowerCase()));
const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

/** Argumen CLI: --dry-run, --limit=50, --only=eksplisit|implisit */
export function parseCliArgs(argv = process.argv.slice(2)) {
  const args = { dryRun: false, limit: undefined, only: undefined };
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--limit=')) args.limit = int(a.split('=')[1], undefined);
    else if (a.startsWith('--only=')) args.only = a.split('=')[1];
  }
  return args;
}

export function loadConfig(cli = parseCliArgs()) {
  const e = process.env;
  return {
    token: e.TWITTER_AUTH_TOKEN?.trim() || '',
    lang: e.TWEET_LANG ?? 'id', // kosongkan TWEET_LANG= untuk tanpa filter bahasa
    tab: (e.SEARCH_TAB || 'LATEST').toUpperCase(),
    since: e.SINCE || '',
    until: e.UNTIL || '',
    limitPerKeyword: cli.limit ?? int(e.LIMIT_PER_KEYWORD, 200),
    excludeRetweets: bool(e.EXCLUDE_RETWEETS, true),
    delayPerTweetSec: int(e.DELAY_PER_TWEET_SEC, 3),
    pauseBetweenKeywordsSec: int(e.PAUSE_BETWEEN_KEYWORDS_SEC, 60),
    keywordTimeoutMin: int(e.KEYWORD_TIMEOUT_MIN, 30),
    maxRetry: int(e.MAX_RETRY, 1),
    rateLimitPauseMin: int(e.RATE_LIMIT_PAUSE_MIN, 15),
    anonymize: bool(e.ANONYMIZE_USER, true),
    hashSalt: e.HASH_SALT || '',
    outputDir: e.OUTPUT_DIR || 'output',
    engine: (e.HARVEST_ENGINE || 'playwright').toLowerCase(),
    headless: bool(e.HEADLESS, true),
    debugDump: bool(e.DEBUG_DUMP, false),
    browserChannel: e.BROWSER_CHANNEL ?? 'chromium', // chromium | chrome | kosong (headless shell)
    harvestBin: e.TWEET_HARVEST_BIN || '', // opsional, untuk pengujian
    dryRun: cli.dryRun,
    only: cli.only,
  };
}
