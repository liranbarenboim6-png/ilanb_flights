import {defineConfig,loadEnv} from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig(({mode,command})=>{
 const env=loadEnv(mode,process.cwd(),'');
 if(command==='build'&&mode!=='emulator'&&env.VITE_USE_EMULATORS==='true')throw new Error('Use build:emulator for local demo builds. Production cannot enable emulators.');
 return {plugins:[vue()],server:{port:5173,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:5001',rewrite:path=>'/demo-aviation-rights/europe-west1/api'+path}}},build:{outDir:mode==='emulator'?'dist-emulator':'dist',sourcemap:false}};
});
