<template>
  <div class="<%= name %>">{{title}}</div>
<template>
<script lang="ts" setup>
  import { ref } from "vue";
  const title = ref(""<%= name %>")
</script>