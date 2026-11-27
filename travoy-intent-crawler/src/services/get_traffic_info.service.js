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
      '"kondisi lalu lintas" tol',
      '"lalu lintas" tol',
      '"lalin" tol',
      '"gangguan" tol',
      '"kepadatan" tol',
      '"rekayasa" tol',
      '"contraflow" tol',
      '"one way" tol',
      '"pemeliharaan" tol',
      '"pekerjaan" tol',
      '"proyek" tol',
    ],
    // Pengguna menggambarkan situasi tanpa menyebut fiturnya
    implisit: [
    
    ],
  },
};

startService(topic, import.meta.url);
