<template>
  <div class="login-container" :class="{ 'dark-theme': isDarkTheme }">
    
    <div class="top-right-wrapper">
      <div class="icon-btn setting-btn" @click="showGithubDialog = true" title="GitHub 云同步配置">
       <el-icon><setting /></el-icon> 

      </div>
      <div class="theme-switch" @click="toggleTheme" title="切换主题">
        <el-icon :size="20">
  <component :is="isDarkTheme ? 'Sunny' : 'Moon'" />
</el-icon>

<el-icon :size="20">
  <Sunny v-if="isDarkTheme" />
  <Moon v-else />
</el-icon>


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
                     <i class="el-icon-folder-opened" style="margin-right:8px;"></i>
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
          <el-button type="danger" icon="el-icon-refresh" @click="onReset">重置</el-button>
          
          <el-button type="primary" icon="el-icon-link" @click="onGenerateLink">生成链接</el-button>
          
          <el-button type="warning" icon="el-icon-upload2" :loading="githubLoading" @click="syncToGitHub">
            保存链接
          </el-button>

          <el-button type="info" icon="el-icon-folder-opened" @click="fetchCloudList">
            云端列表
          </el-button>
          
          <el-button type="success" @click="onConnect"><i class="fas fa-terminal" style="margin-right: 6px;"></i>连接SSH</el-button>
        </el-row>

        <el-row v-if="generatedLink" style="margin-top: 18px;">
          <el-col :span="24">
            <el-input v-model="generatedLink" readonly class="gen-link-input">
              <template slot="append">
                <el-button style="color: #1adb6d;" @click="copyLink" icon="el-icon-document-copy"></el-button>
              </template>
            </el-input>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <div class="footer">
      <a href="https://github.com/adamj001/webssh-lw" target="_blank" rel="noopener noreferrer">wssh</a>
    </div>

    <el-dialog title="GitHub 云同步配置" :visible.sync="showGithubDialog" width="90%" :custom-class="isDarkTheme ? 'dark-dialog' : ''" append-to-body>
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
      <span slot="footer" class="dialog-footer">
        <el-button @click="showGithubDialog = false">取 消</el-button>
        <el-button type="primary" @click="saveGithubSettings">保存配置</el-button>
      </span>
    </el-dialog>

    <el-dialog title="☁️ 云端保存的链接" :visible.sync="showCloudListDialog" width="95%" :custom-class="isDarkTheme ? 'dark-dialog' : ''" append-to-body>
      <el-table :data="cloudList" style="width: 100%" v-loading="githubLoading" empty-text="暂无数据或加载失败">
        <el-table-column prop="hostname" label="主机" min-width="100"></el-table-column>
        <el-table-column prop="username" label="用户" min-width="80"></el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template slot-scope="scope">
            <el-button size="mini" type="primary" plain @click="openSavedUrl(scope.row.url)">打开</el-button>
            <el-button size="mini" icon="el-icon-document-copy" circle @click="copySavedUrl(scope.row.url)"></el-button>
            <el-button size="mini" type="danger" icon="el-icon-delete" circle @click="deleteFromCloud(scope.row.key)"></el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

  </div>
</template>

<script>
import axios from 'axios'

export default {
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
      showCloudListDialog: false, // 控制列表弹窗
      cloudList: [], // 存储从 GitHub 获取的列表
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
    
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'
    document.head.appendChild(link)
  },
  methods: {
    saveGithubSettings() {
      localStorage.setItem('gh_config', JSON.stringify(this.githubConfig));
      this.showGithubDialog = false;
      this.$message.success('GitHub 配置已保存');
    },

    // --- 修改点1：修复保存逻辑，确保保存的是 Link ---
    async syncToGitHub() {
      const { token, owner, repo, path } = this.githubConfig;
      if (!token) {
        this.$message.warning('请先配置 GitHub 信息');
        this.showGithubDialog = true;
        return;
      }
      
      // 检查：如果还没有生成链接，先自动尝试生成
      if (!this.generatedLink) {
         this.onGenerateLink(); // 调用生成方法
         if (!this.generatedLink) {
             // 如果生成失败（比如必填项没填），onGenerateLink 内部会报错，这里直接返回
             return; 
         }
      }

      this.githubLoading = true;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const headers = { 'Authorization': `token ${token}` };
      const uniqueKey = `${this.sshInfo.hostname}_${this.sshInfo.username}`;
      
      // 重点：这里保存了生成的 url
      const dataToSave = {
        url: this.generatedLink, // <--- 保存生成的长链接
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
        this.$message.success('链接已保存到 GitHub！');
      } catch (e) {
        console.error(e);
        this.$message.error('保存失败，请检查配置或网络');
      } finally {
        this.githubLoading = false;
      }
    },

    // --- 修改点2：新增获取列表和删除逻辑 ---
    async fetchCloudList() {
      const { token, owner, repo, path } = this.githubConfig;
      if (!token) {
        this.$message.warning('请先配置 GitHub');
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
        
        // 将对象转为数组，方便表格展示，并保留 Key 用于删除
        this.cloudList = Object.entries(jsonContent).map(([key, value]) => ({
          key: key,
          ...value
        }));
      } catch (e) {
        if (e.response && e.response.status === 404) {
           this.cloudList = []; // 文件不存在，就是空的
        } else {
           this.$message.error('获取列表失败');
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
          this.$message.success('已复制');
        });
    },

    async deleteFromCloud(key) {
        const { token, owner, repo, path } = this.githubConfig;
        this.githubLoading = true;
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const headers = { 'Authorization': `token ${token}` };

        try {
            // 1. Get current file
            const res = await axios.get(apiUrl, { headers });
            const sha = res.data.sha;
            const decodedContent = decodeURIComponent(escape(window.atob(res.data.content)));
            const existingContent = JSON.parse(decodedContent);

            // 2. Delete item
            delete existingContent[key];

            // 3. Push update
            const contentBase64 = window.btoa(unescape(encodeURIComponent(JSON.stringify(existingContent, null, 2))));
            await axios.put(apiUrl, {
                message: `Delete ${key}`,
                content: contentBase64,
                sha: sha
            }, { headers });

            this.$message.success('删除成功');
            // Refresh list local
            this.cloudList = this.cloudList.filter(item => item.key !== key);

        } catch (e) {
            this.$message.error('删除失败');
        } finally {
            this.githubLoading = false;
        }
    },

    // --- 以下保持原有的逻辑 ---
    onConnect () {
      sessionStorage.removeItem('sshInfo')
      if (!this.sshInfo.hostname) {
        this.$message.error('请输入主机地址！')
        return
      }
      if (!this.sshInfo.username) {
        this.$message.error('请输入用户名！')
        return
      }
      if (!this.sshInfo.password && !this.sshInfo.privateKey) {
        this.$message.error('请输入密码或上传密钥！')
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
      const fileInput = document.querySelector('.upload-key input[type="file"]')
      if (fileInput) {
        fileInput.value = ''
      }
    },
    onGenerateLink () {
      if (this.sshInfo.privateKey) {
        this.$message.warning('密钥方式登录不支持生成快捷链接，请改用密码登录方式')
        return
      }
      if (!this.sshInfo.hostname) {
        this.$message.error('请输入主机地址！')
        return
      }
      if (!this.sshInfo.username) {
        this.$message.error('请输入用户名！')
        return
      }
      if (!this.sshInfo.password && !this.sshInfo.privateKey) {
        this.$message.error('请输入密码或上传密钥以生成链接！')
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
          this.$message.success('链接已复制！')
        }).catch(err => {
          this.$message.error('复制失败: ' + err)
        })
      }
    },
    toggleTheme () {
      this.isDarkTheme = !this.isDarkTheme;
      localStorage.setItem('isDarkTheme', this.isDarkTheme);
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
/* 保持原有样式，新增部分样式 */
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

.theme-switch i {
  margin-top: 0;
}

/* 剩下的样式保持不变 */
.login-container ::v-deep .el-input__inner {
  font-size: medium;
  border-radius: 10px;
  background: hsl(0deg 0% 100% / 5%);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s;
  color: #333;
}

.login-container ::v-deep .el-input__inner:focus {
  border-color: #409eff !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2) !important;
  caret: 2px solid #409eff !important;
}
.login-container ::v-deep .el-input__inner::placeholder {
  color: #565454 !important;
  opacity: 1;
}
.login-container.dark-theme ::v-deep .el-input__inner {
  background: hsl(0deg 0% 100% / 5%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}
.login-container.dark-theme ::v-deep .el-input__inner::placeholder {
  color: #ccc !important;
  opacity: 1;
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

.form-grid ::v-deep .el-form-item__label {
  padding-bottom: 0;
  font-size: 15px;
  color: var(--text-color);
  line-height: 30px;
}

.form-grid ::v-deep .el-button {
  font-size: 1rem;
  font-weight: 600;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  transition: all 0.3s;
}

.login-container ::v-deep .upload-btn {
  background: var(--primary);
  color: #fff;
}

.login-container ::v-deep .upload-filename {
  background: hsl(0deg 0% 100% / 15%);
  color: #333;
}
.login-container.dark-theme ::v-deep .upload-filename {
  color: #fff !important;
}

@media (max-width: 768px) {
  .card{ width: 98% !important; }
  .form-grid ::v-deep .el-button {
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
.el-button--success:hover { background-color: var(--success-hover); border-color: var(--success-hover); }
.el-button--danger:hover { background-color: var(--danger-hover); border-color: var(--danger-hover); }
.el-button--primary:hover { background-color: var(--primary-hover); border-color: var(--primary-hover); }

/* Deep Dialog Styles (深色弹窗样式适配) */
::v-deep .dark-dialog { 
  background: #2d2d2d; 
}

::v-deep .dark-dialog .el-dialog__title { 
  color: #fff; 
}

/* 核心修复：表格背景透明 */
::v-deep .dark-dialog .el-table { 
  background-color: transparent; 
  color: #e0e0e0; /* 默认文字颜色 */
}

::v-deep .dark-dialog .el-table th, 
::v-deep .dark-dialog .el-table tr { 
  background-color: transparent; 
  border-bottom: 1px solid #444; /* 表格分割线颜色变暗 */
}

/* 核心修复：鼠标悬浮(hover)时的背景色 */
::v-deep .dark-dialog .el-table--enable-row-hover .el-table__body tr:hover > td { 
  background-color: #505050 !important; /* 强制改为深灰色背景 */
  color: #ffffff !important;            /* 强制文字为亮白色 */
}

/* 修复表格底部那一根白线 */
::v-deep .dark-dialog .el-table::before {
  background-color: #444;
}
</style>
<style>
/* 1. 强制覆盖鼠标悬浮时的背景色 (核心修复) */
.dark-dialog .el-table--enable-row-hover .el-table__body tr:hover > td {
  background-color: #555555 !important; /* 稍亮的深灰，确保在黑色背景下可见悬浮效果 */
  color: #ffffff !important;            /* 强制文字显示为白色，高对比度避免遮挡 */
  transition: background-color 0.2s ease; /* 添加平滑过渡，提升视觉效果 */
}

/* 2. 确保表格的基础背景是透明的，且文字是白色的 */
.dark-dialog .el-table,
.dark-dialog .el-table__expanded-cell {
  background-color: transparent !important;
  color: #e0e0e0 !important;
}

.dark-dialog .el-table th,
.dark-dialog .el-table tr,
.dark-dialog .el-table td {
  background-color: transparent !important;
  border-bottom: 1px solid #444 !important; /* 分割线颜色，保持可见但不刺眼 */
  color: #e0e0e0 !important; /* 默认文字色为浅灰白，确保可读性 */
}

/* 3. 去掉表格底部的白线 */
.dark-dialog .el-table::before {
  height: 0px !important;
}

/* 4. 修复弹窗本身的背景色 (以防万一) */
.dark-dialog.el-dialog {
  background: #2d2d2d !important;
}
.dark-dialog .el-dialog__title {
  color: #fff !important;
}

/* 5. 额外修复：确保悬浮时不影响子元素或链接文字 */
.dark-dialog .el-table--enable-row-hover .el-table__body tr:hover > td a,
.dark-dialog .el-table--enable-row-hover .el-table__body tr:hover > td span {
  color: #ffffff !important; /* 防止子元素文字被遮挡或变色 */
}
</style>




