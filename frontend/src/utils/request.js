import axios from 'axios'
import {  ElMessage, ElMessageBox } from 'element-plus'
import store from '@/store'
function validateStatus(status) {
    switch (status) {
    case 400:
         ElMessage.error('请求出错')
        break
    case 403:
         ElMessage.warning({
             ElMessage: '拒绝访问'
        })
        break
    case 404:
         ElMessage.warning({
             ElMessage: '请求错误,未找到该资源'
        })
        break
    case 500:
         ElMessage.warning({
             ElMessage: '服务端错误'
        })
        break
    }
    return status >= 200 && status < 300
}

var instance = axios.create({
    timeout: 15000,
    baseURL: process.env.NODE_ENV === 'production' ? '/' : '/api',
    validateStatus
})

// 响应拦截器即异常处理
instance.interceptors.response.use(
    response => {
        return response.data
    },
    err => {
        if (err.response === undefined && (!err.config || !err.config.cancelToken)) {
             ElMessage.error('连接服务器失败')
        }
        return Promise.reject(err.response)
    }
)

export default instance
