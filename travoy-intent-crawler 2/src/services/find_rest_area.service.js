import { startService } from '../core/topic-runner.js';

/**
 * Servis crawling untuk intent: find_rest_area
 * Mencari rest area terdekat, termasuk kebutuhan istirahat, toilet, atau makan.
 *
 * Keyword memakai sintaks pencarian X: frasa dalam tanda kutip dicari persis,
 * kata tanpa kutip boleh muncul di mana saja dalam tweet.
 * Filter lang, retweet, dan rentang tanggal ditambahkan otomatis dari .env.
 */
export const topic = {
  intent: 'find_rest_area',
  description: 'Mencari rest area terdekat, termasuk kebutuhan istirahat, toilet, atau makan.',
  keywords: {
    // Pengguna menyebut kebutuhan/fitur secara langsung
    eksplisit: [
      '"rest area" tol',
      '"rest area terdekat"',
      '"rest area km"',
      '"tempat istirahat" tol',
    ],
    // Pengguna menggambarkan situasi tanpa menyebut fiturnya
    implisit: [
      'ngantuk nyetir tol',
      'kebelet tol',
      '"cari toilet" tol',
      '"mau istirahat" tol',
      '"rest area penuh"',
      'laper "di tol"',
    ],
  },
};

startService(topic, import.meta.url);
