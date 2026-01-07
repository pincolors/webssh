<template>
  <div class="login-container" :class="{ 'dark-theme': isDarkTheme }">
    
    <div class="top-right-wrapper">
      <div class="icon-btn setting-btn" @click="showGithubDialog = true" title="GitHub 云同步配置">
        <el-icon :size="20"><Setting /></el-icon> 
      </div>
      <div class="theme-switch" @click="toggleTheme" title="切换主题">
        <el-icon :size="20">
          <component :is="isDarkTheme ? 'Sunny' : 'Moon'" />
        </el-icon>
      </div>
    </div>

    <div class="card" style="margin: 20px auto;">
      <el-form :model="sshInfo" label-position="top" class="form-grid">
         <el-row :gutter="20">
           <el-col :span="12">
             <el-form-item label="地址 (Hostname)">
               <el-input ref="hostnameInput" v-model="sshInfo.hostname" placeholder="IP or Hostname" />
             </el-form-item>
           </el-col>
           <el-col :span="12">
             <el-form-item label="端口 (Port)">
               <el-input v-model.number="sshInfo.port" placeholder="22" />
             </el-form-item>
           </el-col>
         </el-row>
         <el-row :gutter="20">
           <el-col :span="12">
             <el-form-item label="用户名 (Username)">
               <el-input ref="usernameInput" v-model="sshInfo.username" placeholder="username" />
             </el-form-item>
           </el-col>
           <el-col :span="12">
             <el-form-item label="密码 (Password)">
               <el-input ref="passwordInput" v-model="sshInfo.password" type="password" placeholder="password" show-password/>
             </el-form-item>
           </el-col>
         </el-row>
         <el-row :gutter="20">
           <el-col :xs="24" :sm="12">
             <el-form-item label="私钥 (Private Key)">
               <el-upload
                 class="upload-key"
                 :show-file-list="false"
                 :before-upload="handlePrivateKeyUpload"
                 accept=".pem,.ppk,.key,.rsa,.id_rsa,.id_dsa,.txt"
               >
                 <div class="upload-flex-row">
                   <div class="upload-btn">
                     <el-icon style="margin-right: 8px;"><FolderOpened /></el-icon>
                     上传密钥
                   </div>
                   <div class="upload-filename" style="width: 12rem">
                     {{ privateKeyFileName || '未上传密钥文件' }}
                   </div>
                 </div>
               </el-upload>
             </el-form-item>
           </el-col>
           <el-col :xs="24" :sm="12">
             <el-form-item label="密钥口令 (PIN)">
               <el-input v-model="sshInfo.passphrase" placeholder="如果有设置请输入密钥口令" />
             </el-form-item>
           </el-col>
         </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="初始命令 (Initial command)">
              <el-input v-model="sshInfo.command" placeholder="Command after login" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row type="flex" justify="center" style="margin-top: 10px; flex-wrap: wrap; gap: 10px;">
          <el-button type="danger" @click="onReset">
            <el-icon style="margin-right: 5px"><Refresh /></el-icon> 重置
          </el-button>
          
          <el-button type="primary" @click="onGenerateLink">
            <el-icon style="margin-right: 5px"><LinkIcon /></el-icon> 生成链接
          </el-button>
          
          <el-button type="warning" :loading="githubLoading" @click="syncToGitHub">
            <el-icon style="margin-right: 5px"><Upload /></el-icon> 保存链接
          </el-button>

          <el-button type="info" @click="fetchCloudList">
            <el-icon style="margin-right: 5px"><FolderOpened /></el-icon> 云端列表
          </el-button>
          
          <el-button type="success" @click="onConnect">
            <i class="fas fa-terminal" style="margin-right: 6px;"></i> 连接SSH
          </el-button>
        </el-row>

        <el-row v-if="generatedLink" style="margin-top: 18px;">
          <el-col :span="24">
            <el-input v-model="generatedLink" readonly class="gen-link-input">
              <template #append>
                <el-button style="color: #1adb6d;" @click="copyLink">
                   <el-icon><DocumentCopy /></el-icon>
                </el-button>
              </template>
            </el-input>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <div class="footer">
      <a href="https://github.com/adamj001/webssh-lw" target="_blank" rel="noopener noreferrer">wssh</a>
    </div>

    <el-dialog 
      title="GitHub 云同步配置" 
      v-model="showGithubDialog" 
      width="90%" 
      :class="isDarkTheme ? 'dark-dialog' : ''" 
      append-to-body
    >
      <el-form :model="githubConfig" label-width="100px" size="small">
        <el-form-item label="Token">
          <el-input v-model="githubConfig.token" type="password" show-password placeholder="ghp_xxxxxxxx..."></el-input>
          <div style="font-size:12px; opacity: 0.7;">需勾选 repo 权限</div>
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="githubConfig.owner" placeholder="GitHub Username"></el-input>
        </el-form-item>
        <el-form-item label="仓库名">
          <el-input v-model="githubConfig.repo" placeholder="Repository Name (私库)"></el-input>
        </el-form-item>
        <el-form-item label="文件路径">
          <el-input v-model="githubConfig.path" placeholder="例如: ssh_links.json"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showGithubDialog = false">取 消</el-button>
          <el-button type="primary" @click="saveGithubSettings">保存配置</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog 
      title="☁️ 云端保存的链接" 
      v-model="showCloudListDialog" 
      width="95%" 
      :class="isDarkTheme ? 'dark-dialog' : ''" 
      append-to-body
    >
      <el-table :data="cloudList" style="width: 100%" v-loading="githubLoading" empty-text="暂无数据或加载失败">
        <el-table-column prop="hostname" label="主机" min-width="100"></el-table-column>
        <el-table-column prop="username" label="用户" min-width="80"></el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" plain @click="openSavedUrl(scope.row.url)">打开</el-button>
            <el-button size="small" circle @click="copySavedUrl(scope.row.url)">
                <el-icon><DocumentCopy /></el-icon>
            </el-button>
            <el-button size="small" type="danger" circle @click="deleteFromCloud(scope.row.key)">
                <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

  </div>
</template>

<script>
// 1. 修正 Import 大写问题
import axios from 'axios' 
import { ElMessage } from 'element-plus'

// 2. 引入图标，建议给 Link 起个别名防止冲突
import { 
  Setting, 
  Sunny, 
  Moon, 
  FolderOpened, 
  Refresh, 
  Link as LinkIcon, // 关键：重命名为 LinkIcon
  Upload, 
  DocumentCopy, 
  Delete 
} from '@element-plus/icons-vue'

export default {
  // 3. 注册组件
  components: {
    Setting, 
    Sunny, 
    Moon, 
    FolderOpened, 
    Refresh, 
    LinkIcon, // 使用别名注册
    Upload, 
    DocumentCopy, 
    Delete
  },
  
  // ... 你的 data() 和 methods 等其他代码 ...

  data () {
    return {
      sshInfo: {
        hostname: '',
        port: '',
        username: '',
        password: '',
        privateKey: '',
        passphrase: '',
        command: ''
      },
      privateKeyFileName: '',
      generatedLink: '',
      isDarkTheme: false,
      
      // GitHub 相关数据
      showGithubDialog: false,
      showCloudListDialog: false,
      cloudList: [],
      githubLoading: false,
      githubConfig: {
        token: '',
        owner: '',
        repo: '',
        path: 'ssh_links.json'
      }
    }
  },
  watch: {
    sshInfo: {
      handler(newVal) {
        localStorage.setItem('sshInfo', JSON.stringify(newVal));
      },
      deep: true
    }
  },
  created() {
    const ghConfig = localStorage.getItem('gh_config');
    if (ghConfig) {
      this.githubConfig = JSON.parse(ghConfig);
    }

    const savedInfo = localStorage.getItem('connectionInfo')
    if (savedInfo) {
      const info = JSON.parse(savedInfo)
      this.sshInfo = {
        hostname: info.hostname || '',
        port: info.port || '',
        username: info.username || '',
        password: info.password || '',
        privateKey: info.privateKey || '',
        passphrase: info.passphrase || '',
        command: info.command || ''
      }
      if (info.privateKey) {
        this.privateKeyFileName = '已保存的密钥文件'
      }
    }
    
    const savedTheme = localStorage.getItem('isDarkTheme')
    if (savedTheme !== null) {
      this.isDarkTheme = savedTheme === 'true'
    }
    
    // 动态加载 FontAwesome (用于终端图标)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'
    document.head.appendChild(link)
  },
  methods: {
    saveGithubSettings() {
      localStorage.setItem('gh_config', JSON.stringify(this.githubConfig));
      this.showGithubDialog = false;
      ElMessage.success('GitHub 配置已保存');
    },

    async syncToGitHub() {
      const { token, owner, repo, path } = this.githubConfig;
      if (!token) {
        ElMessage.warning('请先配置 GitHub 信息');
        this.showGithubDialog = true;
        return;
      }
      
      if (!this.generatedLink) {
         this.onGenerateLink();
         if (!this.generatedLink) return; 
      }

      this.githubLoading = true;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const headers = { 'Authorization': `token ${token}` };
      const uniqueKey = `${this.sshInfo.hostname}_${this.sshInfo.username}`;
      
      const dataToSave = {
        url: this.generatedLink,
        hostname: this.sshInfo.hostname,
        username: this.sshInfo.username,
        updated_at: new Date().toLocaleString()
      };

      try {
        let existingContent = {};
        let sha = null;

        try {
          const res = await axios.get(apiUrl, { headers });
          sha = res.data.sha;
          const decodedContent = decodeURIComponent(escape(window.atob(res.data.content)));
          existingContent = JSON.parse(decodedContent);
        } catch (error) {
           if (!error.response || error.response.status !== 404) throw error;
        }

        existingContent[uniqueKey] = dataToSave;

        const contentBase64 = window.btoa(unescape(encodeURIComponent(JSON.stringify(existingContent, null, 2))));
        const payload = {
          message: `Add SSH Link: ${uniqueKey}`,
          content: contentBase64
        };
        if (sha) payload.sha = sha;

        await axios.put(apiUrl, payload, { headers });
        ElMessage.success('链接已保存到 GitHub！');
      } catch (e) {
        console.error(e);
        ElMessage.error('保存失败，请检查配置或网络');
      } finally {
        this.githubLoading = false;
      }
    },

    async fetchCloudList() {
      const { token, owner, repo, path } = this.githubConfig;
      if (!token) {
        ElMessage.warning('请先配置 GitHub');
        this.showGithubDialog = true;
        return;
      }
      
      this.showCloudListDialog = true;
      this.githubLoading = true;
      this.cloudList = [];

      try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const res = await axios.get(apiUrl, { headers: { 'Authorization': `token ${token}` } });
        
        const decodedContent = decodeURIComponent(escape(window.atob(res.data.content)));
        const jsonContent = JSON.parse(decodedContent);
        
        this.cloudList = Object.entries(jsonContent).map(([key, value]) => ({
          key: key,
          ...value
        }));
      } catch (e) {
        if (e.response && e.response.status === 404) {
           this.cloudList = []; 
        } else {
           ElMessage.error('获取列表失败');
        }
      } finally {
        this.githubLoading = false;
      }
    },

    openSavedUrl(url) {
        if(url) window.open(url, '_blank');
    },

    copySavedUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
          ElMessage.success('已复制');
        });
    },

    async deleteFromCloud(key) {
        const { token, owner, repo, path } = this.githubConfig;
        this.githubLoading = true;
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const headers = { 'Authorization': `token ${token}` };

        try {
            const res = await axios.get(apiUrl, { headers });
            const sha = res.data.sha;
            const decodedContent = decodeURIComponent(escape(window.atob(res.data.content)));
            const existingContent = JSON.parse(decodedContent);

            delete existingContent[key];

            const contentBase64 = window.btoa(unescape(encodeURIComponent(JSON.stringify(existingContent, null, 2))));
            await axios.put(apiUrl, {
                message: `Delete ${key}`,
                content: contentBase64,
                sha: sha
            }, { headers });

            ElMessage.success('删除成功');
            this.cloudList = this.cloudList.filter(item => item.key !== key);

        } catch (e) {
            ElMessage.error('删除失败');
        } finally {
            this.githubLoading = false;
        }
    },

    onConnect () {
      sessionStorage.removeItem('sshInfo')
      if (!this.sshInfo.hostname) {
        ElMessage.error('请输入主机地址！')
        return
      }
      if (!this.sshInfo.username) {
        ElMessage.error('请输入用户名！')
        return
      }
      if (!this.sshInfo.password && !this.sshInfo.privateKey) {
        ElMessage.error('请输入密码或上传密钥！')
        return
      }

      if (this.sshInfo.privateKey && this.sshInfo.privateKey.trim()) {
        this.sshInfo.password = ''
      } else if (this.sshInfo.password) {
        this.sshInfo.privateKey = ''
        this.sshInfo.passphrase = ''
        this.privateKeyFileName = ''
      }

      const connectionInfo = {
        hostname: this.sshInfo.hostname,
        port: this.sshInfo.port || 22,
        username: this.sshInfo.username,
        password: this.sshInfo.password || '',
        privateKey: this.sshInfo.privateKey || '',
        passphrase: this.sshInfo.passphrase || '',
        command: this.sshInfo.command || ''
      }
      localStorage.setItem('connectionInfo', JSON.stringify(connectionInfo))

      const query = {
        hostname: encodeURIComponent(this.sshInfo.hostname),
        port: Number(this.sshInfo.port) || 22,
        username: encodeURIComponent(this.sshInfo.username),
        command: encodeURIComponent(this.sshInfo.command || '')
      }

      if (this.sshInfo.privateKey && this.sshInfo.privateKey.trim()) {
        sessionStorage.setItem('sshInfo', JSON.stringify(this.sshInfo))
        query.useKey = 1
      } else if (this.sshInfo.password) {
        query.password = btoa(this.sshInfo.password)
      }

      const url = this.$router.resolve({ path: '/terminal', query }).href
      window.open(url, '_blank')
    },
    onReset () {
      this.sshInfo = { 
        hostname: '', 
        port: '', 
        username: '', 
        password: '', 
        command: '', 
        privateKey: '', 
        passphrase: '' 
      }
      this.privateKeyFileName = ''
      this.generatedLink = ''
      localStorage.removeItem('connectionInfo')
      sessionStorage.removeItem('sshInfo')
      // Vue 3 中通常不建议直接操作 DOM，但为了重置 input file 暂时保留
      const fileInput = document.querySelector('.upload-key input[type="file"]')
      if (fileInput) {
        fileInput.value = ''
      }
    },
    onGenerateLink () {
      if (this.sshInfo.privateKey) {
        ElMessage.warning('密钥方式登录不支持生成快捷链接，请改用密码登录方式')
        return
      }
      if (!this.sshInfo.hostname) {
        ElMessage.error('请输入主机地址！')
        return
      }
      if (!this.sshInfo.username) {
        ElMessage.error('请输入用户名！')
        return
      }
      if (!this.sshInfo.password && !this.sshInfo.privateKey) {
        ElMessage.error('请输入密码或上传密钥以生成链接！')
        return
      }
      const url = new URL(window.location.href)
      url.pathname = '/terminal'
      const cleanSshInfo = {}
      const infoToProcess = { ...this.sshInfo, port: this.sshInfo.port || 22 }
      for (const key in infoToProcess) {
        if (infoToProcess[key] !== '' && infoToProcess[key] !== null) {
          if (key === 'password') {
            cleanSshInfo[key] = btoa(infoToProcess[key])
          } else {
            cleanSshInfo[key] = infoToProcess[key]
          }
        }
      }
      url.search = new URLSearchParams(cleanSshInfo).toString()
      this.generatedLink = url.href
    },
    copyLink () {
      if (this.generatedLink) {
        navigator.clipboard.writeText(this.generatedLink).then(() => {
          ElMessage.success('链接已复制！')
        }).catch(err => {
          ElMessage.error('复制失败: ' + err)
        })
      }
    },
    toggleTheme () {
      this.isDarkTheme = !this.isDarkTheme;
      localStorage.setItem('isDarkTheme', this.isDarkTheme);
      // 调用 main.js 中定义的全局 window.setTheme (如果有的话)，或手动触发
      if (window.setTheme) {
        window.setTheme(this.isDarkTheme ? 'dark' : 'light');
      }
    },
    handlePrivateKeyUpload(file) {
      this.sshInfo.password = ''
      const reader = new FileReader()
      reader.onload = (e) => {
        this.sshInfo.privateKey = e.target.result
        this.privateKeyFileName = file.name
      }
      reader.readAsText(file)
      return false
    }
  }
}
</script>

<style lang="scss" scoped>
.top-right-wrapper {
  position: absolute;
  top: 25px;
  right: 30px;
  z-index: 10;
  display: flex;
  gap: 15px;
}

.icon-btn, .theme-switch {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.3s;
  background-color: var(--switch-bg);
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.icon-btn:hover, .theme-switch:hover {
  filter: brightness(0.9);
}

.icon-btn i, .theme-switch i {
  font-size: 20px;
  color: var(--icon-color);
  transition: color 0.3s;
}

/* 样式穿透修改 ::v-deep -> :deep() */
.login-container :deep(.el-input__wrapper) {
  font-size: medium;
  border-radius: 10px;
  background: hsl(0deg 0% 100% / 5%);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3); /* Element Plus 输入框边框改用 boxShadow */
  transition: all 0.3s;
  color: #333;
}
/* Element Plus input 内部结构变化 */
.login-container :deep(.el-input__inner) {
  color: #333;
}

.login-container :deep(.el-input__wrapper:hover) {
    box-shadow: 0 0 0 1px #409eff;
}

.login-container :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff !important; 
}

.login-container.dark-theme :deep(.el-input__wrapper) {
  background: hsl(0deg 0% 100% / 5%);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
}
.login-container.dark-theme :deep(.el-input__inner) {
    color: #fff;
}

.login-container {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  background: var(--bg-color);
  background-image: var(--bg-image);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  position: relative;
  padding-top: 5vh;
  padding-bottom: 60px;
  transition: background-color 0.3s, color 0.3s, background-image 0.3s;
  overflow-y: auto;
}

.card {
  background: var(--card-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: var(--shadow);
  border-radius: 20px;
  padding-top: 15px;
  padding-bottom: 25px;
  width: 100%;
  max-width: 42rem;
  position: relative;
  transition: background-color 0.3s, box-shadow 0.3s, backdrop-filter 0.3s;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.form-grid :deep(.el-form-item__label) {
  padding-bottom: 0;
  font-size: 15px;
  color: var(--text-color);
  line-height: 30px;
}

.form-grid :deep(.el-button) {
  font-size: 1rem;
  font-weight: 600;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  transition: all 0.3s;
}

.login-container :deep(.upload-btn) {
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  padding: 0 10px;
  height: 32px; /* 模拟 input 高度 */
  border-radius: 4px 0 0 4px;
}

.upload-flex-row {
    display: flex;
    align-items: center;
    border-radius: 4px;
    overflow: hidden;
}

.login-container :deep(.upload-filename) {
  background: hsl(0deg 0% 100% / 15%);
  color: #333;
  padding: 0 10px;
  line-height: 32px;
  font-size: 12px;
  border-radius: 0 4px 4px 0;
}
.login-container.dark-theme :deep(.upload-filename) {
  color: #fff !important;
}

@media (max-width: 768px) {
  .card{ width: 98% !important; }
  .form-grid :deep(.el-button) {
    font-size: 0.9rem !important;
    padding: 0.7rem 0.8rem !important;
    margin: 0 2px !important;
  }
  .login-container { padding-bottom: 120px !important; }
  .top-right-wrapper { top: 15px; right: 15px; }
}

.footer {
  position: absolute;
  bottom: 8px;
  text-align: center;
  width: 100%;
  color: var(--text-color);
  opacity: 0.6;
}
.footer a { color: #fefefe; text-decoration: none; }
.footer a:hover { color: #05d899; }

/* Variables */
.login-container {
  --bg-color: #ffff;
  --bg-image: url('/static/img/bg_light.webp');
  --card-bg: hsl(0deg 0% 100% / 15%);
  --text-color: #3b3d3d;
  --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  --success: #13af54;
  --success-hover: #0e8942; 
  --danger: #d63031;
  --danger-hover: #b247c2; 
  --primary: #409eff;
  --primary-hover: #0f9281; 
  --switch-bg: #f0f0f0;
  --icon-color: #232323;
}

.login-container.dark-theme {
  --bg-color: #ffffff;
  --bg-image: url('/static/img/bg_dark.webp');
  --card-bg: hsl(0deg 0% 100% / 5%);
  --text-color: #e0e0e0;
  --shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  --switch-bg: #333333;
  --icon-color: #f5f5f5;
}

.el-button--success { background-color: var(--success); border-color: var(--success); color: white; }
.el-button--danger { background-color: var(--danger); border-color: var(--danger); color: white; }
.el-button--primary { background-color: var(--primary); border-color: var(--primary); color: white; }
/* Element Plus 按钮默认样式微调 */
</style>

<style>
/* 全局样式覆盖（针对 Dialog 内部） */

/* Deep Dialog Styles (深色弹窗样式适配) */
.dark-dialog.el-dialog { 
  background: #2d2d2d; 
}

.dark-dialog .el-dialog__title { 
  color: #fff; 
}

/* 表格透明化 */
.dark-dialog .el-table { 
  background-color: transparent !important;
  color: #e0e0e0 !important;
  --el-table-bg-color: transparent !important;
  --el-table-tr-bg-color: transparent !important;
  --el-table-header-bg-color: transparent !important;
  --el-table-row-hover-bg-color: #505050 !important;
  --el-table-border-color: #444 !important;
}

.dark-dialog .el-table th, 
.dark-dialog .el-table tr { 
  background-color: transparent !important;
  border-bottom: 1px solid #444 !important;
}

.dark-dialog .el-table--enable-row-hover .el-table__body tr:hover > td { 
  background-color: #505050 !important;
  color: #ffffff !important;           
}

.dark-dialog .el-table::before {
  height: 0px !important;
}
</style>
