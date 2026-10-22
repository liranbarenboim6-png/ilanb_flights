<script setup lang="ts">
import {ref} from 'vue';
import {useRouter} from 'vue-router';
import {signInWithEmailAndPassword,signOut,sendEmailVerification} from 'firebase/auth';
import {LockKeyhole,ShieldCheck} from '@lucide/vue';
import BrandMark from '../components/BrandMark.vue';
import {firebaseAuth,emulatorMode,configured,authReady} from '../lib/firebase';
import {api} from '../lib/api';

const router=useRouter();
const email=ref(''),password=ref(''),error=ref(''),notice=ref('');
const busy=ref(false),verificationNeeded=ref(false);
function authError(cause:unknown):string{
 const authCode=(cause as {code?:string})?.code;
 if(authCode==='auth/too-many-requests')return 'בוצעו ניסיונות רבים מדי. המתינו ונסו שוב מאוחר יותר.';
 if(authCode==='auth/network-request-failed')return 'לא ניתן להתחבר כעת. בדקו את חיבור האינטרנט ונסו שוב.';
 if(authCode==='auth/multi-factor-auth-required')return 'לחשבון עדיין מוגדר אימות נוסף. פנו למנהל המערכת לעדכון הגדרות החשבון.';
 if(authCode?.startsWith('auth/'))return 'הכניסה לא הושלמה. בדקו את כתובת הדוא״ל ואת הסיסמה.';
 return cause instanceof Error?cause.message:'הכניסה נכשלה. נסו שוב.';
}
async function login(){
 if(!firebaseAuth||busy.value)return;
 busy.value=true;error.value='';notice.value='';verificationNeeded.value=false;
 try{
  await authReady;
  const result=await signInWithEmailAndPassword(firebaseAuth,email.value,password.value);
  if(!emulatorMode&&!result.user.emailVerified){
   verificationNeeded.value=true;
   throw new Error('יש לאמת את כתובת הדוא״ל לפני הכניסה למערכת. לאחר האימות היכנסו שוב.');
  }
  try{await api('/api/admin/session');}
  catch(cause){await signOut(firebaseAuth);throw cause;}
  await router.replace('/admin');
 }catch(cause){error.value=authError(cause);}
 finally{password.value='';busy.value=false;}
}
async function demo(role:'admin'|'reviewer'){
 email.value=role+'@example.invalid';password.value='DemoOnly!2026';await login();
}
async function verifyEmail(){
 if(!firebaseAuth?.currentUser||busy.value)return;
 busy.value=true;error.value='';
 try{await sendEmailVerification(firebaseAuth.currentUser);notice.value='הודעת אימות נשלחה לכתובת החשבון. פתחו את הקישור והיכנסו שוב.';}
 catch(cause){error.value=authError(cause);}
 finally{busy.value=false;}
}
</script>

<template>
 <main id="main-content" class="login-page">
  <div class="login-card">
   <RouterLink class="brand login-brand" to="/" aria-label="ארגון צרכני התעופה בישראל — עמוד הבית"><BrandMark class="brand-symbol" /></RouterLink>
   <p class="login-brand-caption">מערכת הצוות</p>
   <div class="login-icon"><LockKeyhole :size="28"/></div>
   <h1>כניסה למערכת הניהול</h1>
   <p class="muted">גישה לצוות מורשה בלבד</p>
   <div v-if="!configured" class="alert alert-error">יש להגדיר פרויקט Firebase לפני כניסה.</div>
   <form v-else @submit.prevent="login">
    <div class="field"><label for="login-email">דוא״ל</label><input id="login-email" v-model="email" class="input" type="email" autocomplete="username" dir="ltr" :disabled="busy" required/></div>
    <div class="field"><label for="login-password">סיסמה</label><input id="login-password" v-model="password" class="input" type="password" autocomplete="current-password" dir="ltr" :disabled="busy" required/></div>
    <p v-if="error" class="alert alert-error" role="alert">{{error}}</p>
    <button class="btn btn-primary" :disabled="busy">{{busy?'מתחברים…':'כניסה מאובטחת'}}</button>
   </form>
   <div v-if="verificationNeeded" class="demo-login"><button class="btn btn-secondary" :disabled="busy" @click="verifyEmail">שליחת הודעת אימות לדוא״ל</button></div>
   <p v-if="notice" class="alert" role="status">{{notice}}</p>
   <div v-if="emulatorMode" class="demo-login"><p>כניסה לנתונים פיקטיביים בסביבת ההדגמה</p><button class="btn btn-secondary" @click="demo('admin')" :disabled="busy">מנהל הדגמה</button> <button class="btn btn-secondary" @click="demo('reviewer')" :disabled="busy">בודק הדגמה</button></div>
   <p class="login-security"><ShieldCheck :size="16"/> פרטי הכניסה נשמרים בזיכרון הדף בלבד</p>
  </div>
 </main>
</template>

<style scoped>
.login-page{min-height:90vh;background:radial-gradient(at 20% 15%,var(--mint),transparent 55%),var(--pale);display:grid;place-items:center;padding:50px 20px}
.login-card{width:min(460px,100%);background:white;border:1px solid var(--line);border-radius:18px;padding:36px;box-shadow:0 20px 70px #102d460a}
.login-brand{display:flex;justify-content:center}.login-brand .brand-symbol{width:220px;height:138px}.login-brand-caption{text-align:center;color:var(--muted);font-size:14px;margin-top:8px}
.login-card h1{font-size:28px;margin:17px 0 8px}.login-card>.muted{margin-bottom:26px}.login-icon{display:grid;place-items:center;width:56px;height:56px;border-radius:14px;background:var(--mint);color:var(--blue);margin-top:35px}
form>.btn{width:100%;margin-top:18px}.demo-login{margin-top:25px;padding-top:22px;border-top:1px solid var(--line);font-size:14px}.demo-login p{margin-bottom:12px}.login-security{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:var(--muted);margin-top:24px}.alert{margin:15px 0}
@media(max-width:480px){.login-card{padding:28px 22px}.login-card h1{font-size:25px}.login-page{padding:24px 12px}}
</style>
