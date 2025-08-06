<template>
    <footer>
        <span class="princip">Принцип работы сервиса: случайным образом выбирается количество лепестков ромашки, затем также выбирается фраза отсчета (любит или не любит) и как в жизни начинается перебор вариантов.</span>

        <div class="bio">
            <div class="link">
            
                <img src="../assets/vk.svg" alt="vk">
                <img src="../assets/tt.svg" alt="tt">
                <img src="../assets/tg.svg" alt="tg">
            
            </div>
            <span>2025 год</span>
        </div>
    </footer>
    
</template>

<style lang="scss" scoped>
    footer{
        background-color: #72A55F;
        padding: 12px 0;
        margin: 20px 0 0 0;
        .princip{
            display: flex;
            width: 90%;
            text-align: justify;
            font-family: 'Anonymous Pro';
            font-size: 14pt;
            margin-bottom: 21px;
            justify-self: center;
            color: white;
        }
        .bio{
            display: flex;
            width: 90%;
            justify-self: center;
            justify-content: space-between;
            color: white;
            .link{
                display: flex;
                align-items: center;
                gap: 5px;
            }
        }
    }
</style>