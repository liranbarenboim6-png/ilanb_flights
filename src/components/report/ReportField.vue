<script setup lang="ts">
defineProps<{name:string;label:string;optional?:boolean;help?:string;error?:string}>();
</script>
<template>
  <div class="field">
    <label class="field-label" :for="name">{{ label }}<span v-if="optional" class="report-optional">רשות</span></label>
    <p v-if="help" :id="`${name}-help`" class="report-field-help">{{ help }}</p>
    <slot />
    <p v-if="error" :id="`${name}-error`" class="field-error" role="alert">{{ error }}</p>
  </div>
</template>
