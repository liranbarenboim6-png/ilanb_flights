import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createWriteStream} from 'node:fs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const argv=new Set(process.argv.slice(2));
const check=argv.has('--check'),noOpen=argv.has('--no-open');
const projectId='demo-aviation-rights',url='http://127.0.0.1:5000';
const home=process.env.USERPROFILE||os.homedir();
const env={...process.env,PATH:`${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH||''}`};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let running=null,stopping=false;
const command=(file,args,options={})=>new Promise((resolve,reject)=>{
 const child=spawn(file,args,{cwd:root,env,stdio:'inherit',windowsHide:true,...options});
 child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(new Error(`${path.basename(file)} exited ${signal||code}.`)));
});
function where(name){
 const probe=spawnSync(process.platform==='win32'?'where.exe':'which',[name],{env,encoding:'utf8',windowsHide:true});
 return probe.status===0?probe.stdout.split(/\r?\n/).map(x=>x.trim()).filter(Boolean):[];
}
function javaVersion(executable){
 const result=spawnSync(executable,['-version'],{env,encoding:'utf8',windowsHide:true});
 const version=(result.stderr||'')+' '+(result.stdout||'');
 const match=version.match(/version\s+"(\d+)(?:\.(\d+))?/i)||version.match(/(?:openjdk|java)\s+(\d+)(?:\.(\d+))?/i);
 const major=match?(Number(match[1])===1?Number(match[2]):Number(match[1])):0;
 return result.status===0&&major>=21?{file:executable,major}:null;
}
async function javaCandidates(base){
 if(!existsSync(base))return [];
 const rows=await fs.readdir(base,{withFileTypes:true});
 return [path.join(base,'bin',process.platform==='win32'?'java.exe':'java'),...rows.filter(x=>x.isDirectory()).map(x=>path.join(base,x.name,'bin',process.platform==='win32'?'java.exe':'java'))];
}
async function findJava(){
 const candidates=[...(env.JAVA_HOME?[path.join(env.JAVA_HOME,'bin',process.platform==='win32'?'java.exe':'java')]:[]),...where(process.platform==='win32'?'java.exe':'java'),...await javaCandidates(path.resolve(root,'../../work/tools/java21')),...await javaCandidates(path.join(root,'.local','tools','java21'))];
 for(const candidate of candidates){const result=javaVersion(candidate);if(result)return result;}
 return null;
}
async function download(urlValue,destination){
 const response=await fetch(urlValue,{signal:AbortSignal.timeout(240000)});
 if(!response.ok||!response.body)throw new Error(`Download failed (${response.status}).`);
 let bytes=0,last=0;
 const source=Readable.fromWeb(response.body);source.on('data',chunk=>{bytes+=chunk.length;if(bytes>400*1024*1024)source.destroy(new Error('Download exceeds the expected size.'));if(bytes-last>32*1024*1024){last=bytes;console.log(`Downloaded ${Math.round(bytes/1024/1024)} MB...`);}});
 await pipeline(source,createWriteStream(destination));
}
async function ensureJava(){
 let java=await findJava();if(java)return java;
 if(check)throw new Error('Java 21+ is not available. A normal launch can download a portable Microsoft JDK into .local/tools.');
 if(process.platform!=='win32'||process.arch!=='x64')throw new Error('Install Java 21+ for your operating system, then run the launcher again.');
 const tools=path.join(root,'.local','tools'),archive=path.join(tools,'microsoft-jdk21.zip'),destination=path.join(tools,'java21');
 await fs.mkdir(tools,{recursive:true});await fs.mkdir(destination,{recursive:true});
 console.log('Downloading a portable Microsoft Java 21 runtime. No administrator access is needed.');
 await download('https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip',archive);
 const quote=value=>`'${value.replaceAll("'","''")}'`;
 await command('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath ${quote(archive)} -DestinationPath ${quote(destination)} -Force`]);
 await fs.rm(archive,{force:true});java=await findJava();if(!java)throw new Error('The downloaded Java runtime could not be started.');return java;
}
async function findPnpm(){
 const candidates=[path.resolve(path.dirname(process.execPath),'../node_modules/pnpm/bin/pnpm.mjs'),path.join(home,'.cache','codex-runtimes','codex-primary-runtime','dependencies','node','node_modules','pnpm','bin','pnpm.mjs'),path.resolve(path.dirname(process.execPath),'node_modules/pnpm/bin/pnpm.mjs'),path.resolve(path.dirname(process.execPath),'node_modules/corepack/dist/pnpm.js')];
 for(const candidate of candidates)if(existsSync(candidate))return {file:process.execPath,prefix:[candidate]};
 const native=where(process.platform==='win32'?'pnpm.cmd':'pnpm')[0];
 if(native&&process.platform!=='win32')return {file:native,prefix:[]};
 if(native){for(const filename of ['pnpm.mjs','pnpm.cjs']){const entry=path.join(path.dirname(native),'node_modules','pnpm','bin',filename);if(existsSync(entry))return {file:process.execPath,prefix:[entry]};}}
 const portable=path.join(root,'.local','tools','pnpm','package','bin','pnpm.mjs');
 if(existsSync(portable))return {file:process.execPath,prefix:[portable]};
 if(check)throw new Error('pnpm is unavailable. A normal launch can download a portable copy into .local/tools.');
 const tools=path.join(root,'.local','tools','pnpm');await fs.mkdir(tools,{recursive:true});
 const archive=path.join(tools,'pnpm.tgz');console.log('Downloading portable pnpm 11.25.0...');
 await download('https://registry.npmjs.org/pnpm/-/pnpm-11.25.0.tgz',archive);
 await command(process.platform==='win32'?'tar.exe':'tar',['-xf',archive,'-C',tools]);await fs.rm(archive,{force:true});
 if(!existsSync(portable))throw new Error('The portable pnpm download could not be extracted.');return {file:process.execPath,prefix:[portable]};
}
async function healthy(){try{const response=await fetch(`${url}/api/config`,{signal:AbortSignal.timeout(2000),cache:'no-store'});if(!response.ok)return false;const data=await response.json();return data.mode==='emulator'&&data.projectId===projectId;}catch{return false;}}
function occupied(port){return new Promise(resolve=>{const connection=net.createConnection({host:'127.0.0.1',port});connection.once('connect',()=>{connection.destroy();resolve(true);});connection.once('error',()=>resolve(false));connection.setTimeout(1000,()=>{connection.destroy();resolve(false);});});}
function openBrowser(){if(noOpen)return;if(process.platform==='win32'){const child=spawn('explorer.exe',[url],{stdio:'ignore',windowsHide:true});child.on('error',()=>{});child.unref();}else{const child=spawn(process.platform==='darwin'?'open':'xdg-open',[url],{stdio:'ignore'});child.on('error',()=>{});child.unref();}}
function banner(){console.log('\nAVIATION RIGHTS - VUE 3 + FIREBASE\n');console.log(`Website: ${url}`);console.log(`Admin:   ${url}/admin/login`);console.log('Local demo login: admin@example.invalid / DemoOnly!2026');console.log('Reviewer:         reviewer@example.invalid / DemoOnly!2026');console.log('Only fictional local data. Keep this window open while using the app.\n');}
async function seed(){await command(process.execPath,[path.join(root,'scripts','seed-emulator.mjs')],{env:{...env,GCLOUD_PROJECT:projectId,FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'}});}
function stop(){if(stopping)return;stopping=true;if(running){if(process.platform==='win32')spawnSync('taskkill.exe',['/pid',String(running.pid),'/t','/f'],{stdio:'ignore',windowsHide:true});else running.kill('SIGINT');}}
async function main(){
 console.log('Preparing the local Vue + Firebase application...');
 if(Number(process.versions.node.split('.')[0])<22)throw new Error('Node.js 22 or later is required.');
 console.log(`Node.js ${process.version}`);
 const alreadyHealthy=await healthy();
 if(alreadyHealthy&&!check){console.log('The matching Firebase app is already running.');banner();openBrowser();return;}
 const java=await ensureJava();env.JAVA_HOME=path.resolve(path.dirname(java.file),'..');env.PATH=`${path.dirname(java.file)}${path.delimiter}${env.PATH}`;console.log(`Java ${java.major}: ${java.file}`);
 const pnpm=await findPnpm();console.log(`Project: ${root}`);
 if(check){console.log(`pnpm runtime: ${pnpm.file} ${pnpm.prefix.join(' ')}`);console.log(existsSync(path.join(root,'node_modules','firebase-tools','lib','bin','firebase.js'))?'Dependencies are installed.':'Dependencies will be installed during normal launch.');console.log(alreadyHealthy?`Matching emulator app is running at ${url}`:'A normal launch will build and start Firebase emulators.');console.log('Local checks passed. No cloud resources were created.');return;}
 const emulatorPorts=[5000,5001,8080,9099,9199];const conflicts=[];for(const port of emulatorPorts)if(await occupied(port))conflicts.push(port);
 if(conflicts.length)throw new Error(`Ports already in use: ${conflicts.join(', ')}. Stop the existing Firebase emulator console, then run this launcher again. This launcher has not stopped any other application.`);
 if(!existsSync(path.join(root,'firebase.emulator.json')))throw new Error('firebase.emulator.json is missing. Extract the complete source folder before starting.');
 const firebaseCli=path.join(root,'node_modules','firebase-tools','lib','bin','firebase.js');
 if(!existsSync(firebaseCli)||!existsSync(path.join(root,'functions','node_modules','firebase-admin','package.json'))){console.log('Installing project dependencies. This can take several minutes the first time.');await command(pnpm.file,[...pnpm.prefix,'install','--frozen-lockfile']);}
 const secret=path.join(root,'functions','.secret.local');if(!existsSync(secret))await fs.copyFile(path.join(root,'functions','.secret.local.example'),secret);
 console.log('Building the Vue application and Firebase Functions...');await command(pnpm.file,[...pnpm.prefix,'build:emulator']);
 console.log('Starting the Firebase Emulator Suite. First launch may download emulator files.');
 running=spawn(process.execPath,[firebaseCli,'emulators:start','--project',projectId,'--config','firebase.emulator.json','--only','auth,firestore,storage,functions,hosting'],{cwd:root,env,stdio:'inherit',windowsHide:true});
 let finished=false,exitCode=null,startError=null;
 const completion=new Promise(resolve=>{running.once('error',error=>{startError=error;finished=true;resolve(null);});running.once('exit',code=>{finished=true;exitCode=code;resolve(code);});});
 process.once('SIGINT',stop);process.once('SIGTERM',stop);
 const deadline=Date.now()+240000;
 while(Date.now()<deadline&&!finished){if(await healthy()){await seed();banner();openBrowser();await completion;if(startError)throw startError;if(exitCode&&exitCode!==130&&!stopping)throw new Error(`Firebase emulators stopped with exit code ${exitCode}.`);return;}await delay(1000);}
 if(startError)throw startError;
 if(finished)throw new Error(`Firebase emulators stopped before the app was ready (${exitCode}). Read the Firebase error above.`);
 stop();throw new Error('The Firebase app did not become ready within four minutes. Check the emulator messages above, internet access and available memory.');
}
main().catch(error=>{stop();console.error(`\nSTART FAILED: ${error.message}`);console.error(`Source folder: ${root}`);console.error('See README.md for setup and troubleshooting.');process.exitCode=1;});
