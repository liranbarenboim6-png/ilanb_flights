<script setup lang="ts">
import {computed,onMounted,ref} from 'vue';
import {ChartNoAxesCombined,ListFilter,ShieldCheck} from '@lucide/vue';
import {api} from '../../lib/api';
import {messageOf} from './helpers';
import AdminState from './AdminState.vue';
import PatternGroup from './PatternGroup.vue';
type Group={key:string;label:string;description:string;count:number;reportIds:string[]};
const groups=ref<Group[]>([]),loading=ref(true),error=ref(''),query=ref('');
const filtered=computed(()=>groups.value.filter(g=>(g.label+' '+g.description).toLocaleLowerCase().includes(query.value.toLocaleLowerCase())));
onMounted(async()=>{try{const result=await api<{groups:Group[]}>('/api/admin/patterns');groups.value=result.groups;}catch(e){error.value=messageOf(e);}finally{loading.value=false;}});
</script>
<template><div class="admin-page-heading"><div><span class="admin-eyebrow">איתור דפוסים חוזרים</span><h1>מחברים בין הדיווחים</h1><p>קבוצות דיווחים בעלות מאפיינים משותפים לבדיקה אנושית.</p></div><span class="admin-total-label"><ChartNoAxesCombined :size="18"/>{{groups.length}} קבוצות התאמה</span></div><div v-if="error" class="admin-error" role="alert">{{error}}</div><div class="admin-pattern-intro"><span><ListFilter :size="25"/></span><div><h2>כללי התאמה מובנים. שיקול דעת אנושי.</h2><p>המערכת משווה חברה, קטגוריה, טיסה ומועד לפי כללים. התאמה מצביעה על קשר אפשרי לבדיקה ואינה הוכחה להפרה או מסקנה משפטית.</p></div><ShieldCheck :size="28"/></div><div class="admin-pattern-toolbar"><h2>קבוצות לבדיקה</h2><label class="admin-search"><ListFilter :size="17"/><input v-model="query" placeholder="סינון לפי חברה או תיאור דפוס…" aria-label="סינון קבוצות התאמה"/></label></div><AdminState v-if="loading" loading/><div v-else-if="filtered.length" class="admin-pattern-list"><PatternGroup v-for="group in filtered" :key="group.key" :group="group"/></div><div v-else class="admin-panel"><AdminState title="לא נמצאו קבוצות התאמה" :description="query?'נסו חיפוש אחר.':'קבוצות יופיעו כאשר יהיו דיווחים בעלי מאפיינים משותפים.'"/></div></template>
