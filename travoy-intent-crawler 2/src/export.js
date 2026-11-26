import path from 'node:path';
import { loadConfig } from './config.js';
import { writeExports, summarize } from './core/exporter.js';

/** npm run export — bangun ulang CSV gabungan per intent dan workbook Excel. */
const config = loadConfig();
const outputDir = path.resolve(config.outputDir);
const { exportDir, xlsx } = await writeExports(outputDir);
console.table(summarize(outputDir));
console.log(`CSV per intent : ${path.join(exportDir, 'csv')}`);
console.log(`Excel (sheet)  : ${xlsx}`);
