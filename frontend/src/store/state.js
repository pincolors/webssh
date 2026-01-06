import { getLanguage } from '@/lang/index'

const state = () => ({
  sshInfo: {
    hostname: '',
    username: '',
    port: '',
    password: '',
    command: ''
  },
  // 优化：直接 getItem 即可，如果不存在会返回 null，不需要用 Object.prototype 判断
  // 注意：通常 localStorage 存的是字符串，如果这里需要对象/数组，建议加上 JSON.parse
  sshList: localStorage.getItem('sshList') || null, 
  
  termList: [],
  currentTab: {},
  language: getLanguage()
})

export default state

