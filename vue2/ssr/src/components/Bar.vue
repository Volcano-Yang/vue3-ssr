<template>
  <div class="bar">
    {{ msg }}
  </div>
</template>

<script>
export default {
  name: "Bar",
  data() {
    return {
      msg: "bar",
    };
  },
};
</script>

<style scoped>
.bar {
  width: 500px;
  height: 100px;
  margin: 50px 0;
  background-color: red;
}
</style>
