<script setup lang="ts">
import { TabsList } from "@sulaf/ui/components/ui/tabs";
import { cn } from "cn";
import type { HTMLAttributes } from "vue";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <TabsList :class="cn('justify-start gap-4 rounded-none bg-transparent px-0', props.class)">
    <slot />
  </TabsList>
</template>
