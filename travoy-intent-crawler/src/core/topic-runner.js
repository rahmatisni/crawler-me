import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from '../config.js';
import { buildQuery, flattenKeywords } from './query-builder.js';
import { runHarvest, harvestVersion, assertNodeCompatible } from './harvester.js';
import { normalizeTweet } from './normalizer.js';
import { writeJsonAtomic, writeTextAtomic, timestamp } from './storage.js';
import { toCsv, writeExports } from './exporter.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);

/** True bila file modul ini dijalankan langsung (node src/services/x.service.js). */
export const isMain = (metaUrl) =>
  Boolean(process.argv[1]) && pathToFileURL(path.resolve(process.argv[1])).href === metaUrl;

/**
 * Satu servis = satu topik (intent).
 * Menjalankan semua keyword topik secara berurutan, menggabungkan hasil,
 * menghapus duplikat berdasarkan id_str, dan menyimpan ke satu file JSON.
 */
export async function runTopicService(topic, config = loadConfig()) {
  const keywords = flattenKeywords(topic, config.only);
  const runId = timestamp();
  const topicDir = path.resolve(config.outputDir, topic.intent);
  const outFile = path.join(topicDir, `${topic.intent}_${runId}.json`);
  const workDir = path.join(topicDir, '_raw', runId);

  console.log(`\n▶ Servis ${topic.intent} — ${keywords.length} keyword`);

  if (config.dryRun) {
    for (const { keyword, type } of keywords) {
      console.log(`  [${type}] ${buildQuery(keyword, config)}`);
    }
    return null;
  }
  if (!config.token) {
    throw new Error('TWITTER_AUTH_TOKEN belum diisi di file .env');
  }
  if (config.engine === 'tweet-harvest' && !config.harvestBin) assertNodeCompatible();

  const tweets = new Map(); // id_str -> record
  const keywordLog = [];

  const csvFile = outFile.replace(/\.json$/, '.csv');
  const save = () => {
    writeTextAtomic(csvFile, toCsv([...tweets.values()]));
    writeJsonAtomic(outFile, {
      meta: {
        intent: topic.intent,
        description: topic.description,
        crawled_at: new Date().toISOString(),
        tool: config.engine === 'tweet-harvest' ? `tweet-harvest@${harvestVersion()}` : 'playwright',
        params: {
          lang: config.lang,
          tab: config.tab,
          since: config.since || null,
          until: config.until || null,
          limit_per_keyword: config.limitPerKeyword,
          exclude_retweets: config.excludeRetweets,
          anonymized: config.anonymize,
        },
        total_tweets: tweets.size,
        keywords: keywordLog,
      },
      data: [...tweets.values()],
    });
  };

  for (let i = 0; i < keywords.length; i++) {
    const { keyword, type } = keywords[i];
    const query = buildQuery(keyword, config);
    const entry = { keyword, type, query, fetched: 0, new_unique: 0, status: 'pending' };
    keywordLog.push(entry);
    console.log(`\n  (${i + 1}/${keywords.length}) [${type}] ${query}`);

    let attempt = 0;
    while (true) {
      const result = await runHarvest({
        query,
        outputName: `${String(i + 1).padStart(2, '0')}_${slug(keyword)}`,
        workDir,
        config,
      });

      if (result.invalidToken) {
        entry.status = 'error';
        entry.error = 'auth_token tidak valid';
        save();
        throw new Error('auth_token X tidak valid atau kedaluwarsa. Perbarui TWITTER_AUTH_TOKEN.');
      }

      if (result.rows) {
        const rows = result.rows;
        entry.fetched = rows.length;
        for (const row of rows) {
          const existing = tweets.get(row.id_str);
          if (existing) {
            if (!existing.matched_keywords.includes(keyword)) existing.matched_keywords.push(keyword);
            if (!existing.keyword_types.includes(type)) existing.keyword_types.push(type);
            continue;
          }
          tweets.set(row.id_str, {
            ...normalizeTweet(row, config),
            intent_candidate: topic.intent,
            source: result.source ?? config.engine,
            matched_keywords: [keyword],
            keyword_types: [type],
            label: null, // diisi anotator; tweet ini masih kandidat, bukan label final
            label_status: 'unlabeled',
          });
          entry.new_unique++;
        }
        entry.status = result.timedOut ? 'partial_timeout' : 'ok';
        break;
      }

      const retryable = result.rateLimited || result.timedOut;
      if (retryable && attempt < config.maxRetry) {
        attempt++;
        console.log(`  ⏸  Rate limit/timeout. Jeda ${config.rateLimitPauseMin} menit lalu coba lagi...`);
        await sleep(config.rateLimitPauseMin * 60 * 1000);
        continue;
      }
      entry.status = result.rateLimited ? 'rate_limited' : result.timedOut ? 'timeout' : 'no_result';
      break;
    }

    save();
    console.log(`  ✓ ${entry.status}: ${entry.fetched} diambil, ${entry.new_unique} unik baru (total ${tweets.size})`);

    if (i < keywords.length - 1 && config.pauseBetweenKeywordsSec > 0) {
      await sleep(config.pauseBetweenKeywordsSec * 1000);
    }
  }

  save();
  console.log(`\n■ Selesai ${topic.intent}: ${tweets.size} tweet unik`);
  console.log(`  JSON: ${outFile}`);
  console.log(`  CSV : ${csvFile}`);
  if (!config.skipExport) {
    const { xlsx } = await writeExports(path.resolve(config.outputDir));
    console.log(`  Gabungan diperbarui: ${xlsx}`);
  }
  return outFile;
}

/** Dipakai oleh setiap file servis agar bisa dijalankan langsung. */
export function startService(topic, metaUrl) {
  if (!isMain(metaUrl)) return;
  runTopicService(topic).catch((err) => {
    console.error(`\n✗ ${topic.intent}: ${err.message}`);
    process.exit(1);
  });
}
