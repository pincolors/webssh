import { createStore } from 'vuex' // 1. 核心改变：引入 createStore

import state from './state'
import getters from './getters'
import actions from './actions'
import mutations from './mutations'

// 2. 移除 Vue.use(Vuex) - 在 Vue 3 中不需要在这里注册

// 3. 使用 createStore 创建实例
export default createStore({
    state,
    getters,
    mutations,
    actions
})
