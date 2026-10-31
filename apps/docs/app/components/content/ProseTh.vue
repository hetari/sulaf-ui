<script setup lang="ts">
import { cn } from "cn";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <th :class="cn('px-4 py-2 font-bold', props.class)">
    <slot />
  </th>
</template>

<style scoped>
th {
  text-align: left;
}
th[align="center"] {
  text-align: center;
}
th[align="right"] {
  text-align: right;
}
</style>
