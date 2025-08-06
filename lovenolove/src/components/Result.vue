<template>
    <div class="result">
        <span>{{ resultText }}</span>
    </div>
</template>

<script>
export default {
    props: {
        resultText: {
            type: String,
            default: 'любит'
        }
    }
}
</script>

<style scoped lang="scss">
    .result{
        width: 275px;
        height: 30px;
        background-color: #72A55f;
        border: 1px solid black;
        border-radius: 15px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 13px 0;
        padding: 20px 5px;
        justify-self: center;

        span{
            color: white;
            font-size: 20pt;
            font-family: 'Anonymous Pro';
        }
    }
</style>