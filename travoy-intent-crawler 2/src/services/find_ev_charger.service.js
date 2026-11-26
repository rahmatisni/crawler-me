import { startService } from '../core/topic-runner.js';

/**
 * Servis crawling untuk intent: find_ev_charger
 * Mencari SPKLU atau charger mobil listrik di jalan tol.
 *
 * Keyword memakai sintaks pencarian X: frasa dalam tanda kutip dicari persis,
 * kata tanpa kutip boleh muncul di mana saja dalam tweet.
 * Filter lang, retweet, dan rentang tanggal ditambahkan otomatis dari .env.
 */
export const topic = {
  intent: 'find_ev_charger',
  description: 'Mencari SPKLU atau charger mobil listrik di jalan tol.',
  keywords: {
    // Pengguna menyebut kebutuhan/fitur secara langsung
    eksplisit: [
      'spklu tol',
      '"spklu rest area"',
      '"charging station" tol',
      '"ngecas mobil listrik"',
      '"stasiun pengisian" "mobil listrik"',
    ],
    // Pengguna menggambarkan situasi tanpa menyebut fiturnya
    implisit: [
      '"mobil listrik" mudik tol',
      '"mobil listrik" baterai habis tol',
      '"antre spklu"',
      '"range anxiety"',
      '"cas mobil listrik" "rest area"',
    ],
  },
};

startService(topic, import.meta.url);
