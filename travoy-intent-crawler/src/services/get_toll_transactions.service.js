import { startService } from '../core/topic-runner.js';

/**
 * Servis crawling untuk intent: get_toll_transactions
 * Melihat riwayat transaksi tol atau memeriksa potongan saldo saat melintas.
 *
 * Keyword memakai sintaks pencarian X: frasa dalam tanda kutip dicari persis,
 * kata tanpa kutip boleh muncul di mana saja dalam tweet.
 * Filter lang, retweet, dan rentang tanggal ditambahkan otomatis dari .env.
 */
export const topic = {
  intent: 'get_toll_transactions',
  description: 'Melihat riwayat transaksi tol atau memeriksa potongan saldo saat melintas.',
  keywords: {
    // Pengguna menyebut kebutuhan/fitur secara langsung
    eksplisit: [
      '"riwayat transaksi" tol',
      '"transaksi tol"',
      '"histori transaksi" etoll',
      '"cek transaksi" etoll',
    ],
    // Pengguna menggambarkan situasi tanpa menyebut fiturnya
    implisit: [
      '"kepotong dua kali" tol',
      '"saldo kepotong" tol',
      'double "gerbang tol" saldo',
      '"tadi bayar tol"',
      '"potongan tol" salah',
    ],
  },
};

startService(topic, import.meta.url);
