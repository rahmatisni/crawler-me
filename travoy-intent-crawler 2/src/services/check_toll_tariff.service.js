import { startService } from '../core/topic-runner.js';

/**
 * Servis crawling untuk intent: check_toll_tariff
 * Menanyakan tarif tol untuk ruas atau perjalanan tertentu.
 *
 * Keyword memakai sintaks pencarian X: frasa dalam tanda kutip dicari persis,
 * kata tanpa kutip boleh muncul di mana saja dalam tweet.
 * Filter lang, retweet, dan rentang tanggal ditambahkan otomatis dari .env.
 */
export const topic = {
  intent: 'check_toll_tariff',
  description: 'Menanyakan tarif tol untuk ruas atau perjalanan tertentu.',
  keywords: {
    // Pengguna menyebut kebutuhan/fitur secara langsung
    eksplisit: [
      '"tarif tol"',
      '"tarif tol terbaru"',
      '"kenaikan tarif tol"',
      '"cek tarif tol"',
      '"harga tol"',
    ],
    // Pengguna menggambarkan situasi tanpa menyebut fiturnya
    implisit: [
      '"bayar tol" berapa',
      '"biaya tol" mudik',
      '"habis berapa" tol',
      '"tol mahal"',
      '"ongkos tol"',
    ],
  },
};

startService(topic, import.meta.url);
