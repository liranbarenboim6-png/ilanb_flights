<script setup lang="ts">
import {onMounted,onUnmounted,ref,nextTick} from 'vue';
import {X} from '@lucide/vue';
const props=defineProps<{title:string;busy?:boolean}>();
const emit=defineEmits<{close:[]}>();
const dialog=ref<HTMLElement>();
let previous:HTMLElement|null=null;
function key(event:KeyboardEvent){if(event.key==='Escape'&&!props.busy)emit('close');if(event.key==='Tab'){const controls=dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]');if(!controls?.length)return;const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}
onMounted(async()=>{previous=document.activeElement as HTMLElement;document.addEventListener('keydown',key);await nextTick();dialog.value?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();});
onUnmounted(()=>{document.removeEventListener('keydown',key);previous?.focus();});
</script>
<template><Teleport to="body"><div class="admin-modal-backdrop" @click.self="!busy&&emit('close')"><section ref="dialog" class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title" dir="rtl"><header class="admin-modal-header"><h2 id="admin-modal-title">{{title}}</h2><button class="admin-icon-button" aria-label="סגירה" :disabled="busy" @click="emit('close')"><X :size="21"/></button></header><slot/></section></div></Teleport></template>
