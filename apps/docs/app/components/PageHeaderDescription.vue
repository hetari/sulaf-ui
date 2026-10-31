<script lang="ts" setup>
import { cn } from "cn";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <p :class="cn('max-w-3xl text-base text-balance text-foreground sm:text-lg', props.class)">
    <slot />
  </p>
</template>
