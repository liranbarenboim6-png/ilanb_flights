<script setup lang="ts">
import {ref} from 'vue';
import {RouterLink} from 'vue-router';
import {Fingerprint,ChevronDown,ArrowUpLeft} from '@lucide/vue';
import {api} from '../../lib/api';
import type {ReportRecord} from '../../../shared/types';
import {categoryLabel} from '../../../shared/catalog';
import {displayDate,messageOf} from './helpers';
import AdminState from './AdminState.vue';
import StatusBadge from './StatusBadge.vue';
const props=defineProps<{group:{key:string;label:string;description:string;count:number;reportIds:string[]}}>();
const open=ref(false),loading=ref(false),error=ref(''),reports=ref<ReportRecord[]>([]),limit=ref(8);
async function load(){loading.value=true;error.value='';try{const result=await Promise.all(props.group.reportIds.slice(0,limit.value).map(id=>api<{report:ReportRecord}>('/api/admin/reports/'+encodeURIComponent(id))));reports.value=result.map(x=>x.report);}catch(e){error.value=messageOf(e);}finally{loading.value=false;}}
function toggle(){open.value=!open.value;if(open.value&&!reports.value.length)void load();}
function more(){limit.value+=12;void load();}
</script>
<template><section :class="['admin-pattern-group',{'is-open':open}]"><button class="admin-pattern-toggle" :aria-expanded="open" @click="toggle"><span class="admin-pattern-icon"><Fingerprint :size="23"/></span><span class="admin-pattern-title"><strong>{{group.label}}</strong><span>{{group.description}}</span></span><span class="admin-pattern-count"><strong>{{group.count}}</strong><small>דיווחים תואמים</small></span><ChevronDown :size="18"/></button><div v-if="open" class="admin-pattern-content"><div v-if="error" class="admin-error" role="alert">{{error}}</div><AdminState v-if="loading" loading/><template v-else><div class="table-wrap"><table class="data-table"><thead><tr><th>דיווח</th><th>תאריך אירוע</th><th>קטגוריה</th><th>סטטוס</th><th aria-label="פתיחה"/></tr></thead><tbody><tr v-for="report in reports" :key="report.id"><td><RouterLink :to="'/admin/reports/'+report.id" class="admin-report-reference">{{report.publicReference}}</RouterLink><small>{{report.companies.map(c=>c.name).join(', ')}}</small></td><td>{{displayDate(report.incidentDate)}}</td><td>{{categoryLabel(report.primaryCategory)}}</td><td><StatusBadge :status="report.status"/></td><td><RouterLink :to="'/admin/reports/'+report.id" class="admin-table-open" :aria-label="'פתיחת '+report.publicReference"><ArrowUpLeft :size="17"/></RouterLink></td></tr></tbody></table></div><button v-if="group.reportIds.length>limit" class="btn btn-secondary admin-pattern-more" @click="more">הצגת דיווחים נוספים ({{group.reportIds.length-limit}})</button></template></div></section></template>
