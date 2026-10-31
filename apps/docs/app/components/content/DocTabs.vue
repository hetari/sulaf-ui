<script setup lang="ts">
import { Tabs } from "@sulaf/ui/components/ui/tabs";
import { cn } from "cn";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  defaultValue?: string;
  modelValue?: string;
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <Tabs
    :default-value="defaultValue"
    :model-value="modelValue"
    :class="cn('relative mt-6 w-full', props.class)"
  >
    <slot />
  </Tabs>
</template>
