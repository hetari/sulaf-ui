<script lang="ts" setup>
import { cn } from "cn";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <h1
    :class="
      cn(
        'max-w-2xl text-4xl font-semibold tracking-tight text-balance text-primary lg:leading-[1.1] lg:font-semibold xl:text-5xl xl:tracking-tighter',
        props.class ?? '',
      )
    "
  >
    <slot />
  </h1>
</template>
