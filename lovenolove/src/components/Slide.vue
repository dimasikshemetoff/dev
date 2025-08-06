<template>
    <img v-if="visible" src="../assets/slide.svg" alt="slide">
</template>

<script>
export default {
  props: {
    visible: {
      type: Boolean,
      default: true
    }
  }
}
</script>

<style lang="scss" scoped>
    img {
        display: flex;
        justify-self: center;
        padding: 20px 0;
        animation: floatAnimation 3s infinite ease-in;
    }

    @keyframes floatAnimation {
        0%, 100% {
            transform: translateY(0);
        }
        75% {
            transform: translateY(20px);
        }
    }
</style>