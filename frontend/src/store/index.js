import { createStore } from 'vuex' // 1. 修正了 Import 大写问题

// 2. 直接在这里定义，防止外部文件缺失导致报错
export default createStore({
  state: {
    // WebSSH 核心数据
    sshInfo: null,  // 存储当前连接信息
    sshList: null,  // 存储历史连接列表
    language: 'zh'  // 语言设置
  },
  getters: {
    // 构造连接字符串，Terminal.vue 会用到
    sshReq: state => {
      const s = state.sshInfo
      if (!s) return ''
      // 格式：username@hostname:port
      return `${encodeURIComponent(s.username)}@${encodeURIComponent(s.hostname)}:${s.port}`
    }
  },
  mutations: {
    // 设置 SSH 信息（TerminalPage.vue 会调用）
    SET_SSH(state, info) {
      state.sshInfo = info
      // 顺便存 Session 防止刷新丢失
      try {
        sessionStorage.setItem('sshInfo', JSON.stringify(info))
      } catch (e) {}
    },
    // 设置历史列表
    SET_LIST(state, list) {
      state.sshList = list
      try {
        localStorage.setItem('sshList', list)
      } catch (e) {}
    },
    // 设置语言
    SET_LANG(state, lang) {
      state.language = lang
    }
  },
  actions: {
    // 暂时不需要异步操作
  },
  modules: {
    // 如果有其他模块可以在这里引入
  }
})
