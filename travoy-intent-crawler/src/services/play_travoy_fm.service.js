import { startService } from '../core/topic-runner.js';

/**
 * Servis crawling untuk intent: play_travoy_fm
 * Memutar siaran radio atau musik Travoy FM selama perjalanan.
 *
 * Keyword memakai sintaks pencarian X: frasa dalam tanda kutip dicari persis,
 * kata tanpa kutip boleh muncul di mana saja dalam tweet.
 * Filter lang, retweet, dan rentang tanggal ditambahkan otomatis dari .env.
 */
export const topic = {
  intent: 'play_travoy_fm',
  description: 'Memutar siaran radio atau musik Travoy FM selama perjalanan.',
  keywords: {
    // Pengguna menyebut kebutuhan/fitur secara langsung
    eksplisit: [
      '"travoy fm"',
      '"radio travoy"',
      '"radio jasa marga"',
      '"radio tol"',
    ],
    // Pengguna menggambarkan situasi tanpa menyebut fiturnya
    implisit: [
      '"puter radio" nyetir',
      '"dengerin radio" mobil tol',
      'radio "info lalin"',
      '"playlist mudik"',
      'musik "perjalanan jauh" nyetir',
    ],
  },
};

startService(topic, import.meta.url);
