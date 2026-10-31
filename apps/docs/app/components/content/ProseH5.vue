<script setup lang="ts">
import { cn } from "cn";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <h5 :class="cn('mt-8 scroll-m-28 text-base font-medium tracking-tight', props.class)">
    <slot />
  </h5>
</template>
