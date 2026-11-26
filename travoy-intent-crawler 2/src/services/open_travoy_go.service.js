import { startService } from '../core/topic-runner.js';

/**
 * Servis crawling untuk intent: open_travoy_go
 * Membuka aplikasi Travoy / Travoy Go atau fitur di dalamnya.
 *
 * Keyword memakai sintaks pencarian X: frasa dalam tanda kutip dicari persis,
 * kata tanpa kutip boleh muncul di mana saja dalam tweet.
 * Filter lang, retweet, dan rentang tanggal ditambahkan otomatis dari .env.
 */
export const topic = {
  intent: 'open_travoy_go',
  description: 'Membuka aplikasi Travoy / Travoy Go atau fitur di dalamnya.',
  keywords: {
    // Pengguna menyebut kebutuhan/fitur secara langsung
    eksplisit: [
      'travoy',
      '"aplikasi travoy"',
      '"travoy go"',
      '"buka travoy"',
    ],
    // Pengguna menggambarkan situasi tanpa menyebut fiturnya
    implisit: [
      '"aplikasi jasa marga"',
      '"aplikasi jalan tol"',
      'aplikasi "info tol"',
      '"jasa marga" aplikasi cctv',
    ],
  },
};

startService(topic, import.meta.url);
