<template>
  <div class="content">
    <h1>{{ msg }}</h1>
    <button type="button" @click="count++">count is: {{ count }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{ msg: string }>();

const count = ref(0);
</script>

<style scoped>
.bar {
  width: 500px;
  height: 100px;
  margin: 50px 0;
  background-color: red;
}
</style>
