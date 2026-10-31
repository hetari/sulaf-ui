<script setup lang="ts">
import { TabsContent } from "@sulaf/ui/components/ui/tabs";
import { cn } from "cn";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  value: string;
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <TabsContent
    :value="props.value"
    :class="
      cn('relative [&_h3.font-heading]:text-base [&_h3.font-heading]:font-medium', props.class)
    "
  >
    <slot />
  </TabsContent>
</template>

<style scoped>
:deep(> figure:first-child) {
  margin-top: 0;
}
:deep(> .steps) {
  margin-top: 1.5rem;
}
</style>
