import { startService } from '../core/topic-runner.js';

/**
 * Servis crawling untuk intent: get_near_me
 * Meminta siaran informasi di sekitar lokasi / broadcast lalu lintas terkini.
 *
 * Keyword memakai sintaks pencarian X: frasa dalam tanda kutip dicari persis,
 * kata tanpa kutip boleh muncul di mana saja dalam tweet.
 * Filter lang, retweet, dan rentang tanggal ditambahkan otomatis dari .env.
 */
export const topic = {
  intent: 'get_near_me',
  description: 'Meminta siaran informasi di sekitar lokasi / broadcast lalu lintas terkini.',
  keywords: {
    // Pengguna menyebut kebutuhan/fitur secara langsung
    eksplisit: [
      '"info sekitar" tol',
      'broadcast lalin tol',
      'siaran "lalu lintas" tol',
      '"info terkini" tol',
    ],
    // Pengguna menggambarkan situasi tanpa menyebut fiturnya
    implisit: [
      '"ada apa" "di depan" tol',
      'kenapa tol berhenti',
      '"km berapa" macet',
      '"di depan ada" kecelakaan tol',
      '"sekitar sini" tol',
    ],
  },
};

startService(topic, import.meta.url);
