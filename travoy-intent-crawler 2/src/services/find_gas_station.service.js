import { startService } from '../core/topic-runner.js';

/**
 * Servis crawling untuk intent: find_gas_station
 * Mencari SPBU di jalan tol atau rest area.
 *
 * Keyword memakai sintaks pencarian X: frasa dalam tanda kutip dicari persis,
 * kata tanpa kutip boleh muncul di mana saja dalam tweet.
 * Filter lang, retweet, dan rentang tanggal ditambahkan otomatis dari .env.
 */
export const topic = {
  intent: 'find_gas_station',
  description: 'Mencari SPBU di jalan tol atau rest area.',
  keywords: {
    // Pengguna menyebut kebutuhan/fitur secara langsung
    eksplisit: [
      'spbu tol',
      '"spbu rest area"',
      '"pom bensin" tol',
      '"isi bensin" tol',
    ],
    // Pengguna menggambarkan situasi tanpa menyebut fiturnya
    implisit: [
      '"bensin habis" tol',
      '"kehabisan bensin" tol',
      '"bensin tinggal" tol',
      '"antre spbu" "rest area"',
      '"bbm habis" tol',
    ],
  },
};

startService(topic, import.meta.url);
