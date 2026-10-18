import {readFile,writeFile,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));process.chdir(root);
const args=process.argv.slice(2);
const project=args[0];
if(args.slice(1).some(arg=>arg!=='--non-interactive'))fail('Usage: node scripts/deploy.mjs YOUR_REAL_FIREBASE_PROJECT_ID [--non-interactive]');
const nonInteractive=args.includes('--non-interactive');
function fail(message){console.error(message);process.exit(1);}
if(!project||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)||project.startsWith('demo-'))fail('Usage: node scripts/deploy.mjs YOUR_REAL_FIREBASE_PROJECT_ID [--non-interactive]');
if(Object.keys(process.env).some(key=>key.endsWith('_EMULATOR_HOST')&&process.env[key]))fail('Unset emulator environment variables before deploying.');
const parseEnv=text=>Object.fromEntries(text.split(/\r?\n/).filter(line=>/^[A-Z_][A-Z0-9_]*=/.test(line)).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1).trim().replace(/^(["'])(.*)\1$/,'$2')];}));
let client,server;try{client=parseEnv(await readFile('.env.production.local','utf8'));server=parseEnv(await readFile(`functions/.env.${project}`,'utf8'));}catch{fail('Create .env.production.local and functions/.env.PROJECT_ID using the examples and DEPLOYMENT.md.');}
if(client.VITE_USE_EMULATORS==='true'||client.VITE_FIREBASE_PROJECT_ID!==project)fail('Production client must target the selected real project with emulators disabled.');
for(const key of ['VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_STORAGE_BUCKET','VITE_FIREBASE_APP_ID','VITE_RECAPTCHA_ENTERPRISE_SITE_KEY'])if(!client[key]||/YOUR_|REPLACE_|demo-/i.test(client[key]))fail(`Configure ${key} before deploying.`);
const origins=(server.APP_ORIGIN||'').split(',').map(value=>value.trim());
if(!origins.includes(`https://${project}.web.app`)||origins.some(value=>{try{return new URL(value).protocol!=='https:';}catch{return true;}}))fail('APP_ORIGIN must include the exact HTTPS Firebase Hosting origin.');
if(server.EVIDENCE_BUCKET!==client.VITE_FIREBASE_STORAGE_BUCKET)fail('Server EVIDENCE_BUCKET and client VITE_FIREBASE_STORAGE_BUCKET must match.');
const firebase=path.join(root,'node_modules/firebase-tools/lib/bin/firebase.js');
const pnpmCandidates=[path.resolve(path.dirname(process.execPath),'../node_modules/pnpm/bin/pnpm.mjs'),path.join(path.dirname(process.execPath),'node_modules/pnpm/bin/pnpm.mjs'),path.join(root,'node_modules/pnpm/bin/pnpm.mjs'),path.join(root,'.local/tools/pnpm/package/bin/pnpm.mjs')];
let pnpm;for(const candidate of pnpmCandidates){try{await access(candidate);pnpm=candidate;break;}catch{}}
const env={...process.env,Path:path.dirname(process.execPath)+path.delimiter+(process.env.Path||process.env.PATH||'')};
async function run(args,capture=false){return await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:root,env,stdio:capture?['ignore','pipe','pipe']:'inherit'});let output='';if(capture){child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);}child.on('error',reject);child.on('exit',code=>code===0?resolve(output):reject(new Error(capture?output:`Command failed (${code})`)));});}
try{
 const status=JSON.parse(await run([firebase,'login:list','--json'],true));
 if(!Array.isArray(status.result)||!status.result.length)fail('Sign in to your Google account first: pnpm exec firebase login. Then create/configure your project using DEPLOYMENT.md.');
 if(!pnpm)fail('Use a Node installation with pnpm available beside it, or run pnpm build followed by pnpm exec firebase deploy --project YOUR_PROJECT_ID.');
 await run([pnpm,'typecheck']);await run([pnpm,'test']);await run([pnpm,'build']);
 const html=await readFile('dist/index.html','utf8');if(!html.includes('/assets/'))fail('Production output is missing.');
 // A build marker lets reviewers distinguish cloud artifacts from local demo output.
 await writeFile('dist/build-target.json',JSON.stringify({projectId:project,emulators:false,builtAt:new Date().toISOString()}));
 // First deployments can require API setup or an Artifact Registry retention choice.
 // CI can opt out of prompts only after those project settings are provisioned.
 await run([firebase,'deploy','--project',project,'--only','hosting,functions,firestore,storage',...(nonInteractive?['--non-interactive']:[])]);
 console.log(`Application deployed: https://${project}.web.app`);
}catch(error){fail(error instanceof Error?error.message:String(error));}
