<script setup lang="ts">
import {statuses} from '../../../shared/catalog';
defineProps<{status:string}>();
</script>
<template><span :class="['status-badge','status-'+(statuses.find(s=>s.id===status)?.color||'gray')]"><i/>{{statuses.find(s=>s.id===status)?.label||status}}</span></template>
