import request from '@/utils/request'

// 获取文件列表
// 🔥 增加了 password 参数
export function fileList(path, sshInfo, password) {
  return request({
    url: '/file/list',
    method: 'get',
    params: {
      path,
      sshInfo,
      password // 透传密码给后端
    }
  })
}
