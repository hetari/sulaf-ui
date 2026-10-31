<script setup lang="ts">
import { cn } from "cn";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <td :class="cn('px-4 py-2', props.class)">
    <slot />
  </td>
</template>

<style scoped>
td {
  text-align: left;
}
td[align="center"] {
  text-align: center;
}
td[align="right"] {
  text-align: right;
}
</style>
