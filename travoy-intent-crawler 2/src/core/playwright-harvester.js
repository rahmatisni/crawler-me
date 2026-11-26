import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { extractTweetsFromGraphql } from './x-parser.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (msg) => console.log(`    │ ${msg}`);

export function searchUrl(query, tab) {
  return `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query${tab === 'LATEST' ? '&f=live' : ''}`;
}

/**
 * Ambil tweet yang tampil di layar (cadangan bila respons jaringan tidak terbaca).
 * Tidak bergantung pada article[data-testid="tweet"]: mencari tautan /<user>/status/<id>,
 * lalu naik ke elemen pembungkus dan mengambil teks berlabel bahasa (atribut lang).
 */
async function readDomTweets(page) {
  return page.evaluate(() => {
    const out = new Map();
    for (const a of document.querySelectorAll('a[href*="/status/"]')) {
      const m = (a.getAttribute('href') || '').match(/^\/([^/]+)\/status\/(\d+)$/);
      if (!m || out.has(m[2])) continue;
      let box = a.closest('article') || a.closest('[data-testid="cellInnerDiv"]');
      if (!box) {
        box = a;
        for (let i = 0; i < 10 && box.parentElement; i++) {
          box = box.parentElement;
          if (box.querySelector('[lang]') && box.querySelector('a[href*="/status/"]')) break;
        }
      }
      const textEl = box.querySelector('[data-testid="tweetText"]');
      const langEls = [...box.querySelectorAll('div[lang], span[lang]')].filter((e) => !e.closest('[role="link"] [lang] [lang]'));
      const text = ((textEl && (textEl.innerText || textEl.textContent)) || langEls.map((e) => e.innerText || e.textContent).join(' ')).trim();
      if (!text) continue;
      out.set(m[2], {
        created_at: a.querySelector('time')?.getAttribute('datetime') || box.querySelector('time')?.getAttribute('datetime') || '',
        id_str: m[2],
        full_text: text,
        quote_count: 0,
        reply_count: 0,
        retweet_count: 0,
        favorite_count: 0,
        lang: (textEl || langEls[0])?.getAttribute('lang') || '',
        user_id_str: '',
        conversation_id_str: '',
        username: m[1],
        tweet_url: `https://x.com/i/status/${m[2]}`,
        image_url: '',
        location: '',
        in_reply_to_screen_name: '',
      });
    }
    return [...out.values()];
  });
}

/**
 * Crawling satu query langsung dengan Playwright:
 * buka x.com/search, tangkap respons GraphQL pencarian, scroll sampai limit tercapai.
 */
export async function harvestWithPlaywright({ query, config, debugDir, label }) {
  const result = { rows: null, rateLimited: false, invalidToken: false, timedOut: false, source: 'none' };
  const fromNetwork = new Map();
  const fromDom = new Map();
  const opsSeen = new Set();
  const limit = config.limitPerKeyword;

  // channel "chromium" = Chromium penuh dalam mode headless baru.
  // Tanpa ini Playwright memakai chrome-headless-shell yang mudah dikenali X sebagai bot.
  const browser = await chromium.launch({
    headless: config.headless,
    channel: config.browserChannel || undefined,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const ver = browser.version().split('.')[0];
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    locale: 'id-ID',
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36`,
  });
  await context.addCookies([
    { name: 'auth_token', value: config.token, domain: '.x.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
  ]);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();

  const netLog = [];
  const samples = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (!/(^https:\/\/(api\.)?(x|twitter)\.com\/)/.test(url)) return;
    const type = res.headers()['content-type'] || '';
    const op = url.includes('/graphql/')
      ? url.split('/graphql/')[1]?.split('/')[1]?.split('?')[0] ?? '?'
      : new URL(url).pathname;
    const entry = { op, status: res.status(), type: type.split(';')[0], url: url.split('?')[0], tweets: 0 };
    netLog.push(entry);
    if (url.includes('/graphql/')) opsSeen.add(op);
    if (res.status() === 429) result.rateLimited = true;
    if (!type.includes('json')) return;
    try {
      const json = await res.json();
      const before = fromNetwork.size;
      // Tweet dari semua respons API dihitung, kecuali yang jelas bukan hasil pencarian
      if (!/home|trend|explore|notification|recommend|who/i.test(op)) extractTweetsFromGraphql(json, fromNetwork);
      entry.tweets = fromNetwork.size - before;
      if (samples.length < 6 && (/search|timeline/i.test(op) || entry.tweets)) samples.push({ op, json });
    } catch {
      /* bukan JSON yang valid */
    }
  });

  const deadline = Date.now() + config.keywordTimeoutMin * 60 * 1000;
  try {
    const url = searchUrl(query, config.tab);
    log(`Membuka: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);

    if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
      result.invalidToken = true;
      return result;
    }

    await page
      .waitForSelector('a[href*="/status/"], [data-testid="empty_state_header_text"]', { timeout: 30000 })
      .catch(() => {});

    let idle = 0;
    let lastTotal = -1;
    while (Date.now() < deadline) {
      for (const row of await readDomTweets(page)) if (!fromDom.has(row.id_str)) fromDom.set(row.id_str, row);
      const total = Math.max(fromNetwork.size, fromDom.size);
      log(`terkumpul ${fromNetwork.size} (jaringan) / ${fromDom.size} (layar)`);
      if (total >= limit) break;
      idle = total === lastTotal ? idle + 1 : 0;
      lastTotal = total;
      if (idle >= 6 || result.rateLimited) break;
      await page.mouse.wheel(0, 2500);
      await sleep(config.delayPerTweetSec * 1000);
    }
    if (Date.now() >= deadline) result.timedOut = true;
  } finally {
    const useNetwork = fromNetwork.size >= fromDom.size && fromNetwork.size > 0;
    const picked = useNetwork ? fromNetwork : fromDom;
    result.source = picked.size ? (useNetwork ? 'graphql' : 'dom') : 'none';
    result.rows = picked.size ? [...picked.values()].slice(0, limit) : null;

    if ((!result.rows && !result.invalidToken) || config.debugDump) {
      const dir = path.join(debugDir, label);
      fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, 'screenshot.png') }).catch(() => {});
      fs.writeFileSync(path.join(dir, 'network-log.json'), JSON.stringify(netLog, null, 2));
      samples.forEach((s, i) => fs.writeFileSync(path.join(dir, `response-${i + 1}-${s.op.replace(/[^\w-]/g, '_')}.json`), JSON.stringify(s.json, null, 2)));
      const html = await page.content().catch(() => '');
      fs.writeFileSync(path.join(dir, 'page.html'), html);
      log(`Debug disimpan di: ${dir}`);
      log(`Operasi GraphQL yang terlihat: ${[...opsSeen].join(', ') || '(tidak ada)'}`);
      log(`Jumlah tautan /status/ di halaman: ${(html.match(/\/status\/\d+/g) || []).length}`);
    }
    if (result.rows) log(`Sumber data: ${result.source}`);
    await browser.close();
  }
  return result;
}
