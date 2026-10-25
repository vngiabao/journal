// Run: node --env-file=.env.sync scripts/configure-sync.mjs
// Credentials travel over stdin, never command arguments or build variables.
import {spawnSync} from 'node:child_process';
if(!process.env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_'))throw new Error('Missing server-only Supabase secret');
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','put','SUPABASE_SECRET_KEY'],{input:process.env.SUPABASE_SECRET_KEY,encoding:'utf8',stdio:['pipe','pipe','pipe']});
process.stdout.write((result.stdout??'').replaceAll(process.env.SUPABASE_SECRET_KEY,'[redacted]'));
process.stderr.write((result.stderr??'').replaceAll(process.env.SUPABASE_SECRET_KEY,'[redacted]'));
process.exitCode=result.status??1;
