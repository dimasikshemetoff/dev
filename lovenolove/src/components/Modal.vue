<template>
  <div class="modal-overlay" v-if="isOpen">
    <div class="modal">

        <div class="toprom">
            <img src="../assets/toprom.png" alt="toprom">
        </div>
        <div class="leftrom">
            <img src="../assets/toprom.png" alt="toprom">
        </div>
        <div class="rightrom">
            <img src="../assets/toprom.png" alt="toprom">
        </div>
        <div class="bottomrom">
            <img src="../assets/toprom.png" alt="toprom">
        </div>

      <h2>Ромашка предсказала:
      </h2>
      <h3>{{ result }}</h3>
      <button @click="restart">Погадать ещё</button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    isOpen: Boolean,
    result: String
  },
  methods: {
    restart() {
      location.reload();
    }
  }
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: #FED402;
  padding: 2rem;
  border-radius: 57px;
  text-align: center;
  width: 250px;
  height: 250px;
  font-size: 13pt;
  font-family: 'Anonymous Pro';
  position: relative;
  h3{
    font-size: 25pt;
  }
}

.toprom{
    position: absolute;
    top: -16px;
    left: 53px;
}

.bottomrom{
    position: absolute;
    bottom: -16px;
    transform: rotate(180deg);
    left: 53px;
}

.leftrom{
    position: absolute;
    left: -109px;
    top: 145px;
    transform: rotate(-90deg);
}
.rightrom{
    position: absolute;
    right: -109px;
    top: 145px;
    transform: rotate(90deg);
}
button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: transparent;
  color: black;
  font-family: 'Anonymous Pro';
  text-decoration: underline;
  font-size: 18pt;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>