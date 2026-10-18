import {initializeApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,setPersistence,inMemoryPersistence,onIdTokenChanged,type User} from 'firebase/auth';
import {initializeAppCheck,ReCaptchaEnterpriseProvider,getToken,type AppCheck} from 'firebase/app-check';
import {ref} from 'vue';
const env=import.meta.env;
const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
export const emulatorMode=env.VITE_USE_EMULATORS==='true'&&local&&env.VITE_FIREBASE_PROJECT_ID==='demo-aviation-rights';
export const configured=!!(env.VITE_FIREBASE_API_KEY&&env.VITE_FIREBASE_PROJECT_ID&&env.VITE_FIREBASE_APP_ID)&&(!env.VITE_USE_EMULATORS||env.VITE_USE_EMULATORS!=='true'||emulatorMode);
export const firebaseApp=configured?initializeApp({apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,projectId:env.VITE_FIREBASE_PROJECT_ID,storageBucket:env.VITE_FIREBASE_STORAGE_BUCKET,appId:env.VITE_FIREBASE_APP_ID}):null;
export const firebaseAuth=firebaseApp?getAuth(firebaseApp):null;
export const currentUser=ref<User|null>(null);
let appCheck:AppCheck|null=null;
if(firebaseApp&&!emulatorMode&&env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY)appCheck=initializeAppCheck(firebaseApp,{provider:new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY),isTokenAutoRefreshEnabled:true});
export const authReady=firebaseAuth?(async()=>{
 if(emulatorMode)connectAuthEmulator(firebaseAuth,'http://127.0.0.1:9099',{disableWarnings:true});
 await setPersistence(firebaseAuth,inMemoryPersistence);
 return new Promise<void>(resolve=>{let first=true;onIdTokenChanged(firebaseAuth,user=>{currentUser.value=user;if(first){first=false;resolve();}});});
})():Promise.resolve();
export async function requestHeaders():Promise<Record<string,string>>{
 await authReady;
 const headers:Record<string,string>={};
 if(firebaseAuth?.currentUser)headers.Authorization='Bearer '+await firebaseAuth.currentUser.getIdToken();
 if(appCheck)headers['X-Firebase-AppCheck']=(await getToken(appCheck)).token;
 return headers;
}
