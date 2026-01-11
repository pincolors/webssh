<template>
  <div class="terminal-page-wrapper">
    <div class="terminal-page-container">
      <div class="terminal-area">
        <div ref="terminalRef" class="xterm-container"></div>
      </div>
      <div class="file-tree" :class="{ 'is-visible': isSftpVisible }">
        <FileList />
      </div>
    </div>
    <div class="terminal-footer">
      <a href="https://github.com/adamj001/webssh-lw" target="_blank" class="github-link" title="GitHub">
        <i class="fab fa-github"></i>
      </a>
      <button @click="toggleSftpPanel" class="sftp-toggle-btn" title="文件管理">
        <i class="fas fa-folder-open" style="margin-left: 15px;"></i>
      </button>
    </div>
  </div>
</template>

<script>
import { checkSSH } from '@/api/common'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { AttachAddon } from 'xterm-addon-attach'
import FileList from '@/components/FileList'
import 'xterm/css/xterm.css' // 引入样式

export default {
    name: 'Terminal',
    components: { FileList },
    data() {
        return {
            term: null,
            ws: null,
            resetClose: false,
            ssh: null,
            savePass: false,
            fontSize: 15,
            isSftpVisible: false,
            fitAddon: null
        }
    },
    mounted() {
        this.$nextTick(() => {
            this.createTerm()
            window.addEventListener('resize', this.onWindowResize)
        })
    },
    // Vue 3 生命周期变更: beforeDestroy -> beforeUnmount
    beforeUnmount() {
        this.close()
        window.removeEventListener('resize', this.onWindowResize)
    },
    methods: {
        toggleSftpPanel() {
            this.isSftpVisible = !this.isSftpVisible
            setTimeout(() => {
                if (this.fitAddon) try { this.fitAddon.fit() } catch (e) {}
            }, 300)
        },
        onWindowResize() {
            if (this.fitAddon) try { this.fitAddon.fit() } catch (e) {}
            if (this.ws && this.ws.readyState === 1 && this.term) {
                this.ws.send(`resize:${this.term.rows}:${this.term.cols}`)
            }
        },
        createTerm() {
            const sshInfo = this.$store.state.sshInfo;
            if (!sshInfo || !sshInfo.hostname) {
                this.$message.error('无效的连接信息！正在返回登录页...')
                this.$router.push('/')
                return
            }

            const termContainer = this.$refs.terminalRef
            if (!termContainer) {
                console.error('Terminal container not found.')
                return
            }

            // --- 还原原始逻辑 ---
            const sshReq = this.$store.getters.sshReq 
            // 原始代码没有在这里再次 Base64 加密，我们保持一致
            // 依靠后端的“智能解密”来处理
            
            this.close()
            const prefix = process.env.NODE_ENV === 'production' ? '' : '/api'
            
            this.fitAddon = new FitAddon()
            this.term = new Terminal({
                cursorBlink: true,
                cursorStyle: 'bar',
                cursorWidth: 2,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                fontSize: this.fontSize,
                theme: {
                    background: '#000000',
                    foreground: '#ffffff',
                    cursor: '#ffffff',
                    selection: '#daffe77a',
                }
            })

            this.term.loadAddon(this.fitAddon)
            this.term.open(termContainer)
            this.term.focus()
            
            try { this.fitAddon.fit() } catch (e) {}

            this.term.write('\x1b[1;1H\x1b[1;32m正在连接 ' + sshInfo.hostname + '...\x1b[0m\r\n')

            const self = this
            const heartCheck = {
                timeout: 5000,
                intervalObj: null,
                stop: function() {
                    if (this.intervalObj) clearInterval(this.intervalObj)
                },
                start: function() {
                    this.intervalObj = setInterval(function() {
                        if (self.ws !== null && self.ws.readyState === 1) {
                            self.ws.send('ping')
                        }
                    }, this.timeout)
                }
            }

            let closeTip = '已超时关闭!'
            if (this.$store.state.language === 'en') {
                closeTip = 'Connection timed out!'
            }

            // --- 构建 WebSocket URL (还原原始逻辑，但加上 encodeURIComponent 比较稳妥) ---
            // 这里我们手动获取 password 参数，确保它被传递
            const password = sshInfo.password ? encodeURIComponent(window.btoa(sshInfo.password)) : ''
            
            const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
            
            // 注意：这里 sshReq 保持原始样子传给后端，后端现在能看懂它了！
            const wsUrl = `${protocol}://${location.host}${prefix}/term?sshInfo=${sshReq}&password=${password}&rows=${this.term.rows}&cols=${this.term.cols}&closeTip=${closeTip}`
            
            console.log('WS Connecting:', wsUrl) // 调试用
            
            this.ws = new WebSocket(wsUrl)

            this.ws.onopen = () => {
                console.log('WebSocket Connected')
                self.connected()
                heartCheck.start()
                self._initCmdSent = false
            }

            this.ws.onmessage = (event) => {
                if (typeof event.data === 'string') {
                    setTimeout(() => {
                        // 自动发送初始化命令逻辑
                        if (!self._initCmdSent && self.ssh) {
                            const term = self.term;
                            if (!term || !term.buffer || !term.buffer.active) return;
                            const line = term.buffer.active.getLine(term.buffer.active.baseY + term.buffer.active.cursorY);
                            if (line) {
                                const lineText = line.translateToString();
                                if (/[>$#%]\s*$/.test(lineText.trimEnd())) {
                                    self._initCmdSent = true;
                                    self.term.write('\x1b[s\x1b[1;1H\x1b[2K\x1b[u');
                                    if (self.ssh.command) {
                                        setTimeout(() => {
                                            if (self.ws && self.ws.readyState === 1) {
                                                self.ws.send(self.ssh.command + '\r');
                                            }
                                        }, 100);
                                    }
                                }
                            }
                        }
                    }, 10);
                }
            }

            // 给 close 加 try-catch 防止报错
            this.ws.onclose = () => {
                try {
                    if (!self.resetClose) {
                         if (self.ssh && !this.savePass) {
                            this.$store.commit('SET_PASS', '')
                            if (self.ssh) self.ssh.password = ''
                        }
                        this.$message({
                            message: this.$t ? this.$t('wsClose') : '连接已断开',
                            type: 'warning',
                            duration: 3000,
                            showClose: true
                        })
                        self.ws = null
                    }
                    heartCheck.stop()
                    self.resetClose = false
                } catch(e) { console.warn(e) }
            }

            this.ws.onerror = (e) => {
                console.error('WS Error:', e)
            }

            // --- 插件加载：加 try-catch 防崩 ---
            try {
                const attachAddon = new AttachAddon(this.ws, { bidirectional: false })
                this.term.loadAddon(attachAddon)
            } catch (e) {
                console.warn('AttachAddon load warning:', e)
            }

            this.term.onData(data => {
                if (self.ws && self.ws.readyState === 1) {
                    self.ws.send(data)
                }
            })
            
            // 滚轮缩放事件
            termContainer.addEventListener('wheel', (e) => {
                 if (e.ctrlKey) {
                    e.preventDefault()
                    if (e.deltaY < 0) self.fontSize++
                    else self.fontSize = Math.max(10, self.fontSize - 1)
                    self.term.setOption('fontSize', self.fontSize)
                    try { self.fitAddon.fit() } catch (e) {}
                }
            }, { passive: false })
        },
        async connected() {
            const sshInfo = this.$store.state.sshInfo
            this.ssh = Object.assign({}, sshInfo)
            try {
                const result = await checkSSH(this.$store.getters.sshReq)
                if (result.Msg !== 'success') return
                this.savePass = result.Data.savePass
            } catch(e) { console.error(e) }
            document.title = sshInfo.hostname || 'WebSSH'
            // 历史记录逻辑省略，保持简洁
        },
        close() {
            // --- 安全关闭逻辑 ---
            this.resetClose = true
            if (this.ws) {
                this.ws.onclose = null
                this.ws.onerror = null
                this.ws.close()
                this.ws = null
            }
            if (this.term) {
                try { this.term.dispose() } catch (e) { console.warn('term dispose ignored', e) }
                this.term = null
            }
        }
    }
}
</script>

<style scoped>
.terminal-page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #000;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.terminal-page-container {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}
.terminal-area {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: black;
}
.xterm-container {
  flex: 1;
  width: 100%;
  height: 100%;
  padding-left: 5px;
  overflow: hidden;
}
.file-tree {
  width: 350px;
  border-left: 1px solid var(--input-border);
  background: var(--input-bg);
  display: flex;
  flex-direction: column;
}
.terminal-footer {
  width: 100%;
  text-align: center;
  padding: 5px 0;
  font-size: 15px;
  color: #ccc;
  background: #1a1a1a;
  border-top: 1px solid #333;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.github-link { color: #ccc; margin-left: 4px; font-size: 18px; }
.sftp-toggle-btn { display: none; background: none; border: none; color: #ccc; font-size: 18px; cursor: pointer; }
@media (max-width: 768px) {
  .sftp-toggle-btn { display: inline-block; }
  .file-tree { position: absolute; top: 0; right: 0; bottom: 0; width: 85%; transform: translateX(100%); transition: transform 0.3s; z-index: 20; }
  .file-tree.is-visible { transform: translateX(0); }
}
</style>
