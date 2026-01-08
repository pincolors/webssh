<template>
  <div class="terminal-page">
    <Terminal />
  </div>
</template>
<script>
import Terminal from '@/components/Terminal.vue'
export default {
  components: { Terminal },
  beforeCreate() {
    let { hostname, port, username, password, command, privateKey, passphrase, useKey } = this.$route.query;
    // 解码
    if (hostname) hostname = decodeURIComponent(hostname);
    if (username) username = decodeURIComponent(username);
    if (password) {
      try {
        password = atob(password);
      } catch (e) {
        password = decodeURIComponent(password);
      }
    }
    if (command) command = decodeURIComponent(command);
    if (privateKey) privateKey = decodeURIComponent(privateKey);
    if (passphrase) passphrase = decodeURIComponent(passphrase);

    // 如果是密钥登录，从 sessionStorage 读取完整 sshInfo
    if (useKey) {
      const savedInfo = sessionStorage.getItem('sshInfo');
      if (savedInfo) {
        const info = JSON.parse(savedInfo);
        hostname = info.hostname;
        port = info.port;
        username = info.username;
        password = info.password;
        command = info.command;
        privateKey = info.privateKey;
        passphrase = info.passphrase;
      }
    } else if (!hostname || !username || (!password && !privateKey)) {
      // fallback 到 sessionStorage
      const savedInfo = sessionStorage.getItem('sshInfo');
      if (savedInfo) {
        const info = JSON.parse(savedInfo);
        hostname = info.hostname;
        port = info.port;
        username = info.username;
        password = info.password;
        command = info.command;
        privateKey = info.privateKey;
        passphrase = info.passphrase;
      }
    }

    if (hostname && username && (password || privateKey)) {
      this.$store.commit('SET_SSH', {
        hostname,
        port: Number(port) || 22,
        username,
        password,
        command,
        privateKey,
        passphrase
      });
    }
  }
}
</script>
 <style scoped>
/* 1. 确保页面容器占满全屏 */
.terminal-page {
  width: 100vw;
  height: 100vh;
  background: #000; /* 强制背景为黑色，防止白屏刺眼 */
  overflow: hidden; /* 防止出现双滚动条 */
  display: flex;    /* 使用 Flex 布局 */
  flex-direction: column;
}

/* 2. 强制让内部的 Terminal 组件占满剩余空间 */
/* 注意：这里使用了深度选择器 :deep() 来影响子组件 */
.terminal-page :deep(.terminal-container),
.terminal-page :deep(#terminal) {
  width: 100%;
  height: 100%;
  flex: 1;
}
</style>
