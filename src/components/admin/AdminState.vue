<script setup lang="ts">
import {LoaderCircle,Inbox} from '@lucide/vue';
defineProps<{loading?:boolean; title?:string; description?:string}>();
</script>
<template><div class="admin-state" :role="loading?'status':undefined"><LoaderCircle v-if="loading" class="spin" :size="30"/><Inbox v-else :size="30"/><strong>{{loading?'טוענים את הנתונים…':title||'אין נתונים להצגה'}}</strong><span v-if="description">{{description}}</span></div></template>
