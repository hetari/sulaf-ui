<script setup lang="ts">
import { cn } from "cn";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <ol :class="cn('my-6 ml-6 list-decimal', props.class)">
    <slot />
  </ol>
</template>
