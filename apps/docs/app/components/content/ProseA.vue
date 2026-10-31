<script setup lang="ts">
import { cn } from "cn";
import type { HTMLAttributes } from "vue";

const props = withDefaults(
  defineProps<{
    href?: string;
    target?: "_blank" | "_parent" | "_self" | "_top" | (string & object) | null | undefined;
    class?: HTMLAttributes["class"];
  }>(),
  {
    href: "",
  },
);
</script>

<template>
  <NuxtLink
    prefetch-on="interaction"
    :href="props.href"
    :target="props.target"
    :class="cn('font-medium underline underline-offset-4', props.class)"
  >
    <slot />
  </NuxtLink>
</template>
