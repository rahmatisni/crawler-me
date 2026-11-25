import { startService } from '../core/topic-runner.js';

/**
 * Servis crawling untuk intent: get_traffic_info
 * Menanyakan kondisi lalu lintas jalan tol: macet, padat, contraflow, rekayasa lalin.
 *
 * Keyword memakai sintaks pencarian X: frasa dalam tanda kutip dicari persis,
 * kata tanpa kutip boleh muncul di mana saja dalam tweet.
 * Filter lang, retweet, dan rentang tanggal ditambahkan otomatis dari .env.
 */
export const topic = {
  intent: 'get_traffic_info',
  description: 'Menanyakan kondisi lalu lintas jalan tol: macet, padat, contraflow, rekayasa lalin.',
  keywords: {
    // Pengguna menyebut kebutuhan/fitur secara langsung
    eksplisit: [
      '"info lalin" tol',
      '"kondisi lalu lintas" tol',
      '"rekayasa lalin" tol',
      'contraflow tol',
      '"one way" tol',
      '"info tol" macet',
    ],
    // Pengguna menggambarkan situasi tanpa menyebut fiturnya
    implisit: [
      '"tol macet"',
      '"tol padat"',
      '"tol merayap"',
      'antrean "gerbang tol"',
      '"lewat tol" lancar',
      '"tol cikampek" macet',
    ],
  },
};

startService(topic, import.meta.url);
