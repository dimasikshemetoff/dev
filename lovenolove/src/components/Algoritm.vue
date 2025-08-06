<template>
  <div @click="initAudio">
    <svg 
      width="248" 
      height="248" 
      viewBox="0 0 308 308" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      class="rotating-image"
      ref="flowerSvg"
    >
    <!-- Each petal with combined transformations -->
    <g 
      v-for="(petal, index) in petals" 
      :key="index"
      @mousedown="startDrag(index, $event)"
      @touchstart.passive="startDrag(index, $event)"
      :style="getPetalStyle(index)"
      :transform="`rotate(${petal.angle} 154 154) translate(${petal.offset.x}, ${petal.offset.y})`"
    >
      <path 
        v-if="!petal.removed"
        :d="petal.path" 
        :fill="petal.fill"
      />
    </g>
    
    <!-- Flower center -->
    <path 
      d="M154 188.878C173.263 188.878 188.878 173.263 188.878 154C188.878 134.737 173.263 119.122 154 119.122C134.737 119.122 119.122 134.737 119.122 154C119.122 173.263 134.737 188.878 154 188.878Z" 
      fill="#FED402"
    />
    <path 
      d="M188.881 154C188.881 173.265 173.266 188.881 154 188.881C144.965 188.881 136.73 185.448 130.534 179.803C134.376 181.265 138.552 182.065 142.908 182.065C162.167 182.065 177.783 166.449 177.783 147.184C177.783 136.953 173.383 127.757 166.369 121.381C179.53 126.369 188.881 139.091 188.881 154Z" 
      fill="#FAC600"
    />
  </svg>
  </div>
</template>

<script>
// Base petal shapes
const basePath1 = 'M176.417 71.9312L164.346 132.629H143.654L131.583 71.9312C126.334 37.1471 132.597 13.8889 137.888 1.52194C137.894 1.5069 137.901 1.49126 137.907 1.47622C138.736 -0.457799 141.478 -0.495096 142.426 1.38358L154 24.3386L165.574 1.38358C166.522 -0.495096 169.263 -0.457799 170.093 1.47622C170.1 1.49126 170.106 1.5069 170.112 1.52194C175.403 13.8895 181.666 37.1477 176.417 71.9312Z';
const basePath2 = 'M132.379 71.7183L152.275 130.32L134.355 140.666L93.5526 94.1355C71.6148 66.6363 65.4097 43.3624 63.8077 30.0071C63.8059 29.9909 63.8035 29.9741 63.8017 29.9578C63.5527 27.8686 65.909 26.4651 67.6686 27.6183L89.1696 41.7105L87.7156 16.0437C87.5965 13.943 89.9901 12.6039 91.6751 13.8642C91.6884 13.8738 91.7016 13.8841 91.7148 13.8943C102.48 21.9588 119.533 38.9698 132.379 71.7183Z';

// Generate 16 petals with uniform distribution
const generateAllPetals = () => {
  const petals = [];
  for (let i = 0; i < 16; i++) {
    const angle = i * 22.5; // 360/16=22.5°
    petals.push({
      path: i % 2 === 0 ? basePath1 : basePath2,
      fill: i % 2 === 0 ? '#EAF6FF' : '#C4E2FF',
      removed: false,
      offset: { x: 0, y: 0 },
      angle: angle
    });
  }
  return petals;
};

// Full set of 16 petals
const allPetals = generateAllPetals();

export default {
  data() {
    return {
      draggedPetal: null,
      dragStartPos: { x: 0, y: 0 },
      petalStartOffset: { x: 0, y: 0 },
      center: { x: 154, y: 154 },
      isDragging: false,
      petals: [],
      audioContext: null,
      audioBuffer: null,
      audioInitialized: false
    }
  },
  created() {
    this.resetPetals();
  },
  methods: {
    // Initialize with 11 base petals + random extra (0-5)
    resetPetals() {
      // Create a copy of all petals
      const petals = JSON.parse(JSON.stringify(allPetals));
      
      // Always show first 11 petals (base layer)
      for (let i = 0; i < 11; i++) {
        petals[i].removed = false;
      }
      
      // Determine how many extra petals to show (0-5)
      const extraPetalsCount = Math.floor(Math.random() * 6);
      
      // Show random extra petals from positions 11-15
      const availableExtraIndices = [11, 12, 13, 14, 15];
      
      // Shuffle indices to randomize selection
      for (let i = availableExtraIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableExtraIndices[i], availableExtraIndices[j]] = 
          [availableExtraIndices[j], availableExtraIndices[i]];
      }
      
      // Select the first 'extraPetalsCount' indices to show
      const selectedExtraIndices = availableExtraIndices.slice(0, extraPetalsCount);
      
      // Hide all extra petals first
      for (let i = 11; i < 16; i++) {
        petals[i].removed = true;
      }
      
      // Show selected extra petals
      selectedExtraIndices.forEach(index => {
        petals[index].removed = false;
      });
      
      this.petals = petals;
      this.draggedPetal = null;
      this.isDragging = false;
    },
    
    async initAudio() {
      if (this.audioInitialized) return;
      
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioPath = process.env.NODE_ENV === 'production' 
          ? '/assets/petal-pluck.wav' 
          : '/assets/petal-pluck.wav';
        
        const response = await fetch(audioPath);
        const arrayBuffer = await response.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.audioInitialized = true;
      } catch (e) {
        console.error("Audio initialization failed:", e);
      }
    },
    
    playSound() {
      if (!this.audioBuffer) {
        this.initAudio().then(() => this.playSound());
        return;
      }
      
      try {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.3;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(0);
      } catch (e) {
        console.error("Sound play failed:", e);
      }
    },
    
    startDrag(index, event) {
      if (this.petals[index].removed) return;
      if (event.type === 'mousedown' && event.button !== 0) return;
      
      event.stopPropagation();
      this.draggedPetal = index;
      this.isDragging = false;
      
      const svgRect = this.$el.getBoundingClientRect();
      const clientX = event.type.includes('touch') ? event.touches[0].clientX : event.clientX;
      const clientY = event.type.includes('touch') ? event.touches[0].clientY : event.clientY;
      
      this.dragStartPos = {
        x: clientX - svgRect.left,
        y: clientY - svgRect.top
      };
      
      this.petalStartOffset = { ...this.petals[index].offset };
      
      document.addEventListener('mousemove', this.handleDrag);
      document.addEventListener('mouseup', this.endDrag);
      document.addEventListener('touchmove', this.handleDrag, { passive: false });
      document.addEventListener('touchend', this.endDrag);
    },
    
    handleDrag(event) {
      if (this.draggedPetal === null) return;
      event.preventDefault();
      
      const svgRect = this.$el.getBoundingClientRect();
      const clientX = event.type.includes('touch') ? event.touches[0].clientX : event.clientX;
      const clientY = event.type.includes('touch') ? event.touches[0].clientY : event.clientY;
      
      const deltaX = clientX - svgRect.left - this.dragStartPos.x;
      const deltaY = clientY - svgRect.top - this.dragStartPos.y;
      
      if (!this.isDragging && Math.sqrt(deltaX * deltaX + deltaY * deltaY) < 5) return;
      
      this.isDragging = true;
      const currentPetal = this.petals[this.draggedPetal];
      currentPetal.offset = {
        x: this.petalStartOffset.x + deltaX,
        y: this.petalStartOffset.y + deltaY
      };
      
      const distance = Math.sqrt(
        Math.pow(currentPetal.offset.x, 2) + 
        Math.pow(currentPetal.offset.y, 2)
      );
      
      if (distance > 60) {
        this.playSound();
        this.removePetal(this.draggedPetal);
      }
    },
    
    endDrag() {
      if (this.draggedPetal !== null) {
        if (!this.petals[this.draggedPetal].removed) {
          this.petals[this.draggedPetal].offset = { x: 0, y: 0 };
        }
        this.draggedPetal = null;
        this.isDragging = false;
      }
      
      document.removeEventListener('mousemove', this.handleDrag);
      document.removeEventListener('mouseup', this.endDrag);
      document.removeEventListener('touchmove', this.handleDrag);
      document.removeEventListener('touchend', this.endDrag);
    },
    
    removePetal(index) {
      this.petals[index].removed = true;
      setTimeout(() => {
        this.$emit('petal-removed', this.petals.filter(p => !p.removed).length);
      }, 300);
    },
    
    getPetalStyle(index) {
      const petal = this.petals[index];
      if (petal.removed) {
        return {
          opacity: 0,
          transition: 'opacity 0.3s ease-out'
        };
      }
      return {
        opacity: 1,
        transition: this.draggedPetal === index ? 'none' : 'opacity 0.3s ease',
        cursor: 'pointer',
        pointerEvents: 'auto'
      };
    }
  }
}
</script>

<style lang="scss" scoped>
.rotating-image {
  margin: 35px 0;
  display: flex;
  justify-self: center;
  touch-action: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

path {
  transition: opacity 0.3s ease;
  transform-origin: center;
}

g {
  transition: transform 0.2s ease;
}
</style>