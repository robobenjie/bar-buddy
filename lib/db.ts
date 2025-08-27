import { init } from '@instantdb/react';
import schema from '../instant.schema';

const APP_ID = 'd940775b-1600-473e-9329-55aaaadd8dcd';
const db = init({ appId: APP_ID, schema });

export default db;