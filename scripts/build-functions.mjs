import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const result=spawnSync(process.execPath,['node_modules/esbuild/bin/esbuild','functions/src/index.ts','--bundle','--platform=node','--target=node22','--format=cjs','--packages=external','--outfile=functions/lib/index.cjs'],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;process.exitCode=result.status??1;
