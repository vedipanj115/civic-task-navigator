import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from './app';
import { loadDataset } from './data';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Falls back to the M2 test fixture so `npm run dev` works before M3's
// real dataset lands — see api/src/data/README.md.
const dataDir = process.env.DATA_DIR ?? path.join(__dirname, '__tests__/fixtures/dataset');

// Loaded (and boot-validated) before the server starts listening, so a
// bad dataset fails loudly instead of serving broken data.
const dataset = loadDataset({ dataDir });

const port = Number(process.env.PORT ?? 3001);
const app = createApp(dataset);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`api listening on http://localhost:${port}/v1 (dataVersion=${dataset.dataVersion})`);
});
