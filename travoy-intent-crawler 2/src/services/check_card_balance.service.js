import { startService } from '../core/topic-runner.js';

/**
 * Servis crawling untuk intent: check_card_balance
 * Mengecek saldo kartu uang elektronik untuk bayar tol (e-Toll, Flazz, e-Money, dsb.).
 *
 * Keyword memakai sintaks pencarian X: frasa dalam tanda kutip dicari persis,
 * kata tanpa kutip boleh muncul di mana saja dalam tweet.
 * Filter lang, retweet, dan rentang tanggal ditambahkan otomatis dari .env.
 */
export const topic = {
  intent: 'check_card_balance',
  description: 'Mengecek saldo kartu uang elektronik untuk bayar tol (e-Toll, Flazz, e-Money, dsb.).',
  keywords: {
    // Pengguna menyebut kebutuhan/fitur secara langsung
    eksplisit: [
      '"cek saldo" etoll',
      '"cek saldo e-toll"',
      '"cek saldo flazz"',
      '"cek saldo e-money"',
      '"saldo kartu tol"',
    ],
    // Pengguna menggambarkan situasi tanpa menyebut fiturnya
    implisit: [
      '"saldo tidak cukup" tol',
      '"saldo kurang" "gerbang tol"',
      '"kartu tol" ditolak',
      '"lupa isi" etoll',
      '"top up" etoll tol',
    ],
  },
};

startService(topic, import.meta.url);
