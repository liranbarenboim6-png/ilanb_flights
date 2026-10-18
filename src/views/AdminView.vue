<script setup lang="ts">
import {computed,onMounted,provide,ref,watch} from 'vue';
import {useRoute,useRouter,RouterLink} from 'vue-router';
import {signOut} from 'firebase/auth';
import {Plane,LayoutDashboard,Files,Building2,Fingerprint,Users,ShieldCheck,LogOut,Menu,ArrowUpLeft,ChevronLeft,LockKeyhole} from '@lucide/vue';
import {api} from '../lib/api';
import {firebaseAuth} from '../lib/firebase';
import type {AdminSession} from '../../shared/types';
import {adminSessionKey,messageOf} from '../components/admin/helpers';
import AdminState from '../components/admin/AdminState.vue';
import DashboardPanel from '../components/admin/DashboardPanel.vue';
import ReportsPanel from '../components/admin/ReportsPanel.vue';
import ReportDetail from '../components/admin/ReportDetail.vue';
import CompaniesPanel from '../components/admin/CompaniesPanel.vue';
import PatternsPanel from '../components/admin/PatternsPanel.vue';
import UsersPanel from '../components/admin/UsersPanel.vue';
import PrivacyPanel from '../components/admin/PrivacyPanel.vue';
import '../components/admin/admin.css';
const route=useRoute(),router=useRouter();
const session=ref<AdminSession|null>(null),loading=ref(true),error=ref(''),open=ref(false);
// The provider exposes the verified session; every API request verifies it again on the server.
provide(adminSessionKey, new Proxy({} as AdminSession,{get:(_,key)=>session.value?.[key as keyof AdminSession]}));
const section=computed(()=>route.path.split('/')[2]||'dashboard');
const reportId=computed(()=>route.path.startsWith('/admin/reports/')?String(route.params.id||route.path.split('/')[3]||''):'');
const links=[{key:'dashboard',path:'/admin',label:'תמונת מצב',icon:LayoutDashboard},{key:'reports',path:'/admin/reports',label:'כל הדיווחים',icon:Files},{key:'companies',path:'/admin/companies',label:'חברות וגופים',icon:Building2},{key:'patterns',path:'/admin/patterns',label:'דפוסים חוזרים',icon:Fingerprint},{key:'users',path:'/admin/users',label:'משתמשים והרשאות',icon:Users},{key:'privacy',path:'/admin/privacy',label:'בקשות פרטיות',icon:ShieldCheck}];
const visibleLinks=computed(()=>links.filter(l=>session.value?.role==='administrator'||!['users','privacy'].includes(l.key)));
const title=computed(()=>links.find(l=>l.key===section.value)?.label||'ניהול דיווח');
async function load(){loading.value=true;error.value='';try{const data=await api<{session:AdminSession|null}>('/api/admin/session');if(!data.session){await router.replace('/admin/login');return;}session.value=data.session;}catch(e){error.value=messageOf(e);}finally{loading.value=false;}}
async function logout(){if(firebaseAuth)await signOut(firebaseAuth);session.value=null;await router.replace('/admin/login');}
watch(()=>route.fullPath,()=>{open.value=false;});
onMounted(load);
</script>
<template>
  <div v-if="loading" class="admin-loading"><AdminState loading/></div>
  <div v-else-if="!session" class="admin-loading"><div v-if="error" class="admin-error" role="alert">{{error}}</div><button class="btn btn-primary" @click="load">ניסיון נוסף</button><RouterLink to="/admin/login">חזרה לכניסה</RouterLink></div>
  <div v-else class="admin-shell" dir="rtl">
    <button v-if="open" class="admin-backdrop" aria-label="סגירת תפריט" @click="open=false"/>
    <aside :class="['admin-sidebar',{'is-open':open}]">
      <RouterLink to="/admin" class="admin-brand"><span class="admin-brand-mark"><Plane :size="27"/></span><span>צרכני התעופה<small>סביבת הניהול של הארגון</small></span></RouterLink>
      <div class="admin-nav-label">סביבת עבודה</div><nav aria-label="ניווט ניהול"><RouterLink v-for="link in visibleLinks" :key="link.key" :to="link.path" :class="{active:section===link.key}"><component :is="link.icon" :size="19"/>{{link.label}}<ChevronLeft v-if="section===link.key" :size="15"/></RouterLink></nav>
      <div class="admin-sidebar-bottom"><div class="admin-private-note"><LockKeyhole :size="18"/><span>מרחב פרטי לצוות המורשה<small>הגישה והפעולות נבדקות בשרת</small></span></div><RouterLink to="/" class="admin-public-link">לאתר הציבורי<ArrowUpLeft :size="16"/></RouterLink></div>
    </aside>
    <div class="admin-main"><header class="admin-topbar"><div class="admin-breadcrumb"><button class="admin-menu-button" aria-label="פתיחת תפריט" :aria-expanded="open" @click="open=!open"><Menu :size="22"/></button><span>ניהול הארגון</span><ChevronLeft :size="12"/><strong>{{title}}</strong></div><div class="admin-user"><span class="admin-user-avatar">{{session.email.charAt(0).toUpperCase()}}</span><span class="admin-user-info"><strong dir="ltr">{{session.email}}</strong><small>{{session.role==='administrator'?'מנהל מערכת':'בודק דיווחים'}}</small></span><button class="admin-icon-button" aria-label="יציאה מהמערכת" @click="logout"><LogOut :size="19"/></button></div></header>
      <div v-if="session.mode==='emulator'" class="admin-demo-strip"><span class="admin-live-dot"/><strong>סביבת Firebase מקומית</strong><span>נתוני הדגמה בלבד · המידע נשמר באמולטורים במחשב זה</span></div>
      <main class="admin-content"><ReportDetail v-if="reportId" :key="reportId" :id="reportId"/><DashboardPanel v-else-if="section==='dashboard'"/><ReportsPanel v-else-if="section==='reports'"/><CompaniesPanel v-else-if="section==='companies'"/><PatternsPanel v-else-if="section==='patterns'"/><UsersPanel v-else-if="section==='users'"/><PrivacyPanel v-else-if="section==='privacy'"/><AdminState v-else title="העמוד לא נמצא"/></main>
      <footer class="admin-footer"><ShieldCheck :size="13"/>מערכת ארגון צרכני התעופה בישראל · מידע אישי זמין לצוות מורשה בלבד</footer>
    </div>
  </div>
</template>
