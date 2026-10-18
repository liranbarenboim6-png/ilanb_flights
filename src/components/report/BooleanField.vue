<script setup lang="ts">
defineProps<{name:string;label:string;modelValue:boolean;error?:string}>();
defineEmits<{ 'update:modelValue':[value:boolean] }>();
</script>
<template>
  <fieldset class="report-bool">
    <legend>{{ label }}</legend>
    <div class="report-bool-options">
      <label v-for="option in [{value:true,label:'כן'},{value:false,label:'לא'}]" :key="String(option.value)" :class="{selected:modelValue===option.value}">
        <input type="radio" :name="name" :checked="modelValue===option.value" :aria-invalid="!!error" :aria-describedby="error ? `${name}-error` : undefined" @change="$emit('update:modelValue',option.value)" />{{ option.label }}
      </label>
    </div>
    <p v-if="error" :id="`${name}-error`" class="field-error" role="alert">{{ error }}</p>
  </fieldset>
</template>
