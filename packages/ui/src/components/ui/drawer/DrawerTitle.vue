<script lang="ts" setup>
import { reactiveOmit } from "@vueuse/core";
import { cn } from "cn";
import type { DrawerTitleProps } from "reka-ui";
import { DrawerTitle } from "reka-ui";
import type { HTMLAttributes } from "vue";

const props = defineProps<DrawerTitleProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
  <DrawerTitle
    data-slot="drawer-title"
    v-bind="delegatedProps"
    :class="cn('text-foreground font-semibold', props.class)"
  >
    <slot />
  </DrawerTitle>
</template>
