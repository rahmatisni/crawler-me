import { loadConfig } from './config.js';
import { runTopicService } from './core/topic-runner.js';
import { topic as emergencyCall } from './services/emergency_call.service.js';
import { topic as trafficInfo } from './services/get_traffic_info.service.js';
import { topic as restArea } from './services/find_rest_area.service.js';
import { topic as gasStation } from './services/find_gas_station.service.js';
import { topic as evCharger } from './services/find_ev_charger.service.js';
import { topic as tollTransactions } from './services/get_toll_transactions.service.js';
import { topic as cardBalance } from './services/check_card_balance.service.js';
import { topic as tollTariff } from './services/check_toll_tariff.service.js';
import { topic as openTravoy } from './services/open_travoy_go.service.js';
import { topic as travoyFm } from './services/play_travoy_fm.service.js';
import { topic as nearMe } from './services/get_near_me.service.js';

export const ALL_TOPICS = [
  emergencyCall, trafficInfo, restArea, gasStation, evCharger, tollTransactions,
  cardBalance, tollTariff, openTravoy, travoyFm, nearMe,
];

/** Menjalankan semua servis satu per satu (berurutan, bukan paralel, agar tidak kena rate limit). */
const config = loadConfig();
for (const topic of ALL_TOPICS) {
  try {
    await runTopicService(topic, config);
  } catch (err) {
    console.error(`\n✗ ${topic.intent}: ${err.message}`);
    if (err.message.includes('auth_token') || err.message.includes('TWITTER_AUTH_TOKEN')) process.exit(1);
  }
}
