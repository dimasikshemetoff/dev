<template>
  <div class="page-container">
    <div class="content-wrap">
      <Logo />
      <Algoritm @petal-removed="updateResult" />
      <Slide v-if="showSlide && !showModal" />
      <Result v-else-if="!showModal" :result-text="currentResult" />
      <Modal 
        :isOpen="showModal" 
        :result="currentResult"
        @restart="restartGame"
      />
    </div>
    <Footer />
  </div>
</template>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.content-wrap {
  flex: 1;
}
</style>

<script>
import Algoritm from '@/components/Algoritm.vue';
import Footer from '@/components/Footer.vue';
import Logo from '@/components/Logo.vue';
import Result from '@/components/Result.vue';
import Slide from '@/components/Slide.vue';
import Modal from '@/components/Modal.vue';

export default {
  components: {
    Logo,
    Result,
    Algoritm,
    Slide,
    Footer,
    Modal
  },
  data() {
    return {
      showSlide: true,
      showModal: false,
      currentResult: 'любит',
      results: ['любит', 'не любит'],
      startIndex: Math.random() > 0.5 ? 0 : 1,
      petalCount: 0
    }
  },
  methods: {
    updateResult(petalsLeft) {
      //this.petalCount = 16 - petalsLeft;
      this.showSlide = false;
      if (petalsLeft === 0) {
        const index = (this.startIndex + this.petalCount - 1) % 2;
        this.currentResult = this.results[index];
        this.showModal = true;
        return;
      }

      if (this.petalCount === 1) {
        this.currentResult = this.results[this.startIndex];
      } else if (this.petalCount > 1) {
        const index = (this.startIndex + this.petalCount - 1) % 2;
        this.currentResult = this.results[index];
      }
    },
    restartGame() {
      this.showModal = false;
      this.showSlide = true;
      this.petalCount = 0;
      this.startIndex = Math.random() > 0.5 ? 0 : 1;
      this.$refs.algorithm.reset();
    }
  }
}
</script>

