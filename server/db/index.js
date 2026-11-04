import path from 'node:path';
import { config } from '../config.js';
import { createFileDriver } from './fileDriver.js';
import { createRepositories } from './repositories.js';

let driverPromise = null;

export async function getDriver() {
  if (!driverPromise) {
    driverPromise = (async () => {
      if (config.databaseUrl) {
        const { createPgDriver } = await import('./pgDriver.js');
        const driver = await createPgDriver({ connectionString: config.databaseUrl, ssl: config.pgSsl });
        console.log('[db] PostgreSQL conectado');
        return driver;
      }
      const file = path.join(config.dataDir, 'db.json');
      const driver = createFileDriver(file);
      await driver.init();
      console.log(`[db] Driver de archivo activo -> ${file}`);
      return driver;
    })();
  }
  return driverPromise;
}

export async function getDb() {
  const driver = await getDriver();
  return { driver, repos: createRepositories(driver) };
}
