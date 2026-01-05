<template>
  <div id="app">
    <el-config-provider :locale="elLocale">
      <router-view />
    </el-config-provider>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
// 引入 Element Plus 的官方语言包
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'

export default {
  name: 'App',
  setup() {
    // 获取 i18n 实例
    const { locale } = useI18n()

    // 创建一个计算属性，根据 i18n 的当前语言，返回对应的 Element Plus 语言包
    const elLocale = computed(() => {
      // 注意：这里的判断依据要和你 lang/index.js 里 messages 的 key 一致
      return locale.value === 'en' ? en : zhCn
    })

    return {
      elLocale
    }
  }
}
</script>
