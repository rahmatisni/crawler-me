import { startService } from '../core/topic-runner.js';

/**
 * Servis crawling untuk intent: emergency_call
 * Meminta bantuan darurat di jalan tol: kecelakaan, mogok, derek, ambulans, call center.
 *
 * Keyword memakai sintaks pencarian X: frasa dalam tanda kutip dicari persis,
 * kata tanpa kutip boleh muncul di mana saja dalam tweet.
 * Filter lang, retweet, dan rentang tanggal ditambahkan otomatis dari .env.
 */
export const topic = {
  intent: 'emergency_call',
  description: 'Meminta bantuan darurat di jalan tol: kecelakaan, mogok, derek, ambulans, call center.',
  keywords: {
    // Pengguna menyebut kebutuhan/fitur secara langsung
    eksplisit: [
      '"derek tol"',
      '"call center jasa marga"',
      '14080 tol',
      '"nomor darurat" tol',
      'ambulans "jalan tol"',
      '"minta bantuan" "jalan tol"',
    ],
    // Pengguna menggambarkan situasi tanpa menyebut fiturnya
    implisit: [
      '"mogok di tol"',
      '"ban pecah" tol',
      '"kecelakaan di tol"',
      '"mobil berasap" tol',
      '"terjebak di tol"',
      'tolong mobil mogok tol',
    ],
  },
};

startService(topic, import.meta.url);
