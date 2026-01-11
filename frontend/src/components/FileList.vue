<template>
    <div class="file-list-wrapper">
        <div class="sftp-title">SFTP文件管理</div>

        <div class="file-header">
            <el-input class="path-input" v-model="currentPath" size="small" @keyup.enter="getFileList()" @blur="getFileList" placeholder="当前路径..."></el-input>
            <el-button-group>
                <el-button type="primary" size="small" :icon="HomeFilled" @click="goToHome()" title="主目录"></el-button>
                <el-button type="primary" size="small" :icon="ArrowUp" @click="upDirectory()" title="返回上级目录"></el-button>
                <el-button type="primary" size="small" :icon="Refresh" @click="getFileList()" title="刷新当前目录"></el-button>
                
                <el-dropdown trigger="click" @command="handleUploadCommand">
                    <el-button type="primary" size="small" :icon="Upload" class="upload-btn-trigger"></el-button>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item command="file">{{ $t('uploadFile') }}</el-dropdown-item>
                            <el-dropdown-item command="folder">{{ $t('uploadFolder') }}</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </el-button-group>
        </div>

        <el-dialog custom-class="uploadContainer" :title="$t(titleTip)" v-model="uploadVisible" append-to-body width="32%">
            <el-upload ref="upload" multiple drag :action="uploadUrl" :data="uploadData" :before-upload="beforeUpload" :on-progress="uploadProgress" :on-success="uploadSuccess">
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">{{ $t(selectTip) }}</div>
                <template #tip>
                    <div class="el-upload__tip">{{ uploadTip }}</div>
                </template>
            </el-upload>
        </el-dialog>
        
        <el-table :data="fileList" class="file-table" @row-click="rowClick" height="100%">
            <el-table-column
                :label="$t('Name')"
                min-width="140"
                sortable :sort-method="nameSort">
                <template #default="scope">
                    <div style="display: flex; align-items: center; cursor: pointer;">
                        <el-icon v-if="scope.row.IsDir" style="color:#0c60b5; margin-right: 5px; font-size: 16px;"><Folder /></el-icon>
                        <el-icon v-else style="margin-right: 5px; font-size: 16px;"><Document /></el-icon>
                        <span :style="{ color: scope.row.IsDir ? '#0c60b5' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">{{ scope.row.Name }}</span>
                    </div>
                </template>
            </el-table-column>
            <el-table-column :label="$t('Size')" prop="Size" width="90"></el-table-column>
            <el-table-column :label="$t('ModifiedTime')" prop="ModifyTime" width="160" sortable></el-table-column>
        </el-table>
    </div>
</template>

<script>
import { fileList } from '@/api/file'
import { mapState } from 'vuex'
import { HomeFilled, ArrowUp, Refresh, Upload, UploadFilled, Folder, Document } from '@element-plus/icons-vue'

export default {
    name: 'FileList',
    data() {
        return {
            // 图标
            HomeFilled, ArrowUp, Refresh, Upload, UploadFilled, Folder, Document,

            uploadVisible: false,
            fileList: [],
            downloadFilePath: '',
            currentPath: '/',
            selectTip: 'clickSelectFile',
            titleTip: 'uploadFile',
            uploadTip: '',
            progressPercent: 0,
            initialRedirectDone: false,
            homePath: ''
        }
    },
    mounted() {
        if (!this.currentPath || this.currentPath === '/') {
            this.getFileList()
        }
    },
    computed: {
        ...mapState(['currentTab']),
        sshInfoReady() {
            return this.$store.state.sshInfo && this.$store.state.sshInfo.hostname;
        },
        passwordEncoded() {
            const pwd = this.$store.state.sshInfo.password
            return pwd ? window.btoa(pwd) : ''
        },
        uploadUrl: () => {
            return `${process.env.NODE_ENV === 'production' ? `${location.origin}` : 'api'}/file/upload`
        },
        uploadData: function() {
            return {
                sshInfo: this.$store.getters.sshReq,
                password: this.passwordEncoded,
                path: this.currentPath
            }
        }
    },
    watch: {
        sshInfoReady(newValue, oldValue) {
            if (newValue && !oldValue) {
                this.getFileList();
            }
        },
        currentTab: function() {
            this.fileList = []
            this.currentPath = this.currentTab && this.currentTab.path ? this.currentTab.path : '/';
        }
    },
    methods: {
        goToHome() {
            if (this.homePath) {
                if (this.currentPath !== this.homePath) {
                    this.currentPath = this.homePath;
                    this.getFileList();
                }
            } else {
                this.$message.warning('主目录信息尚不可用，请刷新重试。');
            }
        },
        openUploadDialog() {
            this.uploadTip = `${this.$t('uploadPath')}: ${this.currentPath}`
            this.uploadVisible = true
        },
        handleUploadCommand(cmd) {
            if (cmd === 'folder') {
                this.selectTip = 'clickSelectFolder'
                this.titleTip = 'uploadFolder'
            } else {
                this.selectTip = 'clickSelectFile'
                this.titleTip = 'uploadFile'
            }
            this.openUploadDialog();
            const isFolder = 'folder' === cmd,
                supported = this.webkitdirectorySupported();
            if (!supported) {
                isFolder && this.$message.warning('当前浏览器不支持');
                return;
            }
            this.$nextTick(() => {
                // Element Plus 上传组件 input 获取方式可能略有不同，这里做兼容尝试
                const input = document.querySelector('.uploadContainer .el-upload__input');
                if (input) input.webkitdirectory = isFolder;
            })
        },
        webkitdirectorySupported(){
            return 'webkitdirectory' in document.createElement('input')
        },
        beforeUpload(file) {
            this.uploadTip = `${this.$t('uploading')} ${file.name} ${this.$t('to')} ${this.currentPath}, ${this.$t('notCloseWindows')}..`
            this.uploadData.id = file.uid
            const dirPath = file.webkitRelativePath;
            this.uploadData.dir = dirPath ? dirPath.substring(0, dirPath.lastIndexOf('/')) : '';
            return true
        },
        uploadSuccess(r, file) {
            this.uploadTip = `${file.name}${this.$t('uploadFinish')}!`
            this.getFileList();
        },
        uploadProgress(e, f) {
            e.percent = e.percent / 2
            f.percentage = f.percentage / 2
            if (e.percent === 50) {
                const ws = new WebSocket(`${(location.protocol === 'http:' ? 'ws' : 'wss')}://${location.host}${process.env.NODE_ENV === 'production' ? '' : '/api'}/file/progress?id=${f.uid}`)
                ws.onmessage = e1 => {
                    f.percentage = (f.size + Number(e1.data)) / (f.size * 2) * 100
                }
                ws.onclose = () => {}
            }
        },
        nameSort(a, b) {
            return a.Name > b.Name
        },
        rowClick(row) {
            if (row.IsDir) {
                this.currentPath = this.currentPath.charAt(this.currentPath.length - 1) === '/' ? this.currentPath + row.Name : this.currentPath + '/' + row.Name
                this.getFileList()
            } else {
                this.downloadFilePath = this.currentPath.charAt(this.currentPath.length - 1) === '/' ? this.currentPath + row.Name : this.currentPath + '/' + row.Name
                this.downloadFile()
            }
        },
        async getFileList() {
            this.currentPath = this.currentPath.replace(/\\+/g, '/')
            if (this.currentPath === '') {
                this.currentPath = '/'
            }
            const result = await fileList(this.currentPath, this.$store.getters.sshReq, this.passwordEncoded)
            
            if (result.Msg === 'success') {
                if (result.Data.home) {
                    this.homePath = result.Data.home;
                }
                if (result.Data.list === null) {
                    this.fileList = []
                } else {
                    this.fileList = result.Data.list
                }
                if (!this.initialRedirectDone && result.Data.home && result.Data.home !== '/' && this.currentPath !== result.Data.home) {
                    this.initialRedirectDone = true
                    this.currentPath = result.Data.home
                    await this.getFileList()
                    return
                }
            } else {
                this.fileList = []
                this.$message({
                    message: result.Msg,
                    type: 'error',
                    duration: 3000
                })
            }
        },
        upDirectory() {
            if (this.currentPath === '/') {
                return
            }
            let pathList = this.currentPath.split('/')
            if (pathList[pathList.length - 1] === '') {
                pathList = pathList.slice(0, pathList.length - 2)
            } else {
                pathList = pathList.slice(0, pathList.length - 1)
            }
            this.currentPath = pathList.length === 1 ? '/' : pathList.join('/')
            this.getFileList()
        },
        downloadFile() {
            const prefix = process.env.NODE_ENV === 'production' ? `${location.origin}` : 'api'
            const safePass = encodeURIComponent(this.passwordEncoded)
            const downloadUrl = `${prefix}/file/download?path=${this.downloadFilePath}&sshInfo=${this.$store.getters.sshReq}&password=${safePass}`
            window.open(downloadUrl)
        }
    }
}
</script>

<style lang="scss">
.file-list-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: 10px;
    box-sizing: border-box;
    /* 确保背景色和你的主题一致，如果是暗色主题需要调整 */
    background-color: var(--input-bg, #fff); 

    /* 🔥 修复：标题样式 */
    .sftp-title {
        font-size: 16px;
        font-weight: bold;
        /* 为了防止变量缺失导致看不见，我这里加了个备选颜色 */
        color: var(--text-color, #303133); 
        text-align: center;
        padding-bottom: 8px;
        margin-bottom: 8px;
        border-bottom: 1px solid var(--input-border, #dcdfe6);
        flex-shrink: 0;
    }

    .file-header {
        flex-shrink: 0;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        padding: 0 5px;
    }

    .path-input {
        flex: 1;
        margin-right: 5px;
    }

    /* 调整按钮组样式，确保对齐 */
    .file-header .el-button-group {
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }

    .file-header .el-button-group .el-button {
        padding: 8px;
        width: 32px;
        height: 32px;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    /* 修正下拉按钮在 group 中的样式 */
    .upload-btn-trigger {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        margin-left: -1px;
    }

    .file-table {
        flex-grow: 1;
        width: 100%;
        /* 确保表格头部高度正常 */
        & .el-table__header-wrapper th {
            height: 40px;
            padding: 4px 0;
            background-color: var(--input-bg, #fff);
        }
        & .el-table__body-wrapper td {
            padding: 2px 0;
        }
        .cell {
            padding-left: 5px;
            line-height: 1.2;
        }
    }
}
/* 上传弹窗样式调整 */
.uploadContainer {
    .el-upload { display: flex; flex-direction: column; align-items: center;}
    .el-upload-dragger { width: 100%; }
    .el-icon--upload { font-size: 60px; color: #c0c4cc; margin-bottom: 16px; line-height: 50px;}
}
</style>
