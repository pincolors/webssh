package controller

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
	"webssh/core"

	"github.com/gin-gonic/gin"
	"github.com/pkg/sftp"
)

// File 结构体
type File struct {
	Name       string
	Size       string
	ModifyTime string
	IsDir      bool
}

const (
	BYTE = 1 << (10 * iota)
	KILOBYTE
	MEGABYTE
	GIGABYTE
	TERABYTE
	PETABYTE
	EXABYTE
)

func Bytefmt(bytes uint64) string {
	unit := ""
	value := float64(bytes)
	switch {
	case bytes >= EXABYTE:
		unit = "E"
		value = value / EXABYTE
	case bytes >= PETABYTE:
		unit = "P"
		value = value / PETABYTE
	case bytes >= TERABYTE:
		unit = "T"
		value = value / TERABYTE
	case bytes >= GIGABYTE:
		unit = "G"
		value = value / GIGABYTE
	case bytes >= MEGABYTE:
		unit = "M"
		value = value / MEGABYTE
	case bytes >= KILOBYTE:
		unit = "K"
		value = value / KILOBYTE
	case bytes >= BYTE:
		unit = "B"
	case bytes == 0:
		return "0B"
	}
	result := strconv.FormatFloat(value, 'f', 2, 64)
	result = strings.TrimSuffix(result, ".00")
	return result + unit
}

type fileSplice []File

func (f fileSplice) Len() int           { return len(f) }
func (f fileSplice) Swap(i, j int)      { f[i], f[j] = f[j], f[i] }
func (f fileSplice) Less(i, j int) bool { return f[i].IsDir }

// UploadFile 上传文件
func UploadFile(c *gin.Context) *ResponseBody {
	var (
		sshClient core.SSHClient
		err       error
	)
	responseBody := ResponseBody{Msg: "success"}
	defer TimeCost(time.Now(), &responseBody)

	// 获取 POST 参数
	sshInfo := c.PostForm("sshInfo")
	// 使用底部的辅助函数处理字符串参数
	finalBase64, err := translateString(sshInfo, "")
	if err != nil {
		finalBase64 = sshInfo // 失败回退
	}

	if sshClient, err = core.DecodedMsgToSSHClient(finalBase64); err != nil {
		fmt.Println(err)
		responseBody.Msg = err.Error()
		return &responseBody
	}

	id := c.PostForm("id")
	if err := sshClient.CreateSftp(); err != nil {
		fmt.Println(err)
		responseBody.Msg = err.Error()
		return &responseBody
	}
	defer sshClient.Close()
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		responseBody.Msg = err.Error()
		return &responseBody
	}
	defer file.Close()
	path := strings.TrimSpace(c.DefaultPostForm("path", ""))
	if path == "" {
		path = detectHomeDir(sshClient.Sftp, sshClient.Username)
	}
	pathArr := []string{strings.TrimRight(path, "/")}
	if dir := c.DefaultPostForm("dir", ""); "" != dir {
		pathArr = append(pathArr, dir)
		if err := sshClient.Mkdirs(strings.Join(pathArr, "/")); err != nil {
			responseBody.Msg = err.Error()
			return &responseBody
		}
	}
	pathArr = append(pathArr, header.Filename)
	err = sshClient.Upload(file, id, strings.Join(pathArr, "/"))
	if err != nil {
		fmt.Println(err)
		responseBody.Msg = err.Error()
	}
	return &responseBody
}

// DownloadFile 下载文件
func DownloadFile(c *gin.Context) *ResponseBody {
	var (
		sshClient core.SSHClient
		err       error
	)
	responseBody := ResponseBody{Msg: "success"}
	defer TimeCost(time.Now(), &responseBody)
	path := strings.TrimSpace(c.DefaultQuery("path", ""))

	// 🔥 使用 common.go 里的通用翻译器
	finalBase64, err := TranslateToCore(c)
	if err != nil {
		responseBody.Msg = err.Error()
		return &responseBody
	}

	if sshClient, err = core.DecodedMsgToSSHClient(finalBase64); err != nil {
		fmt.Println(err)
		responseBody.Msg = err.Error()
		return &responseBody
	}

	if err := sshClient.CreateSftp(); err != nil {
		fmt.Println(err)
		responseBody.Msg = err.Error()
		return &responseBody
	}

	if path == "" {
		path = detectHomeDir(sshClient.Sftp, sshClient.Username)
	}

	defer sshClient.Close()
	if sftpFile, err := sshClient.Download(path); err != nil {
		fmt.Println(err)
		responseBody.Msg = err.Error()
	} else {
		defer sftpFile.Close()
		c.Writer.WriteHeader(http.StatusOK)
		fileMeta := strings.Split(path, "/")
		c.Header("Content-Disposition", "attachment; filename="+fileMeta[len(fileMeta)-1])
		_, _ = io.Copy(c.Writer, sftpFile)
	}
	return &responseBody
}

// UploadProgressWs 获取上传进度ws
func UploadProgressWs(c *gin.Context) *ResponseBody {
	responseBody := ResponseBody{Msg: "success"}
	defer TimeCost(time.Now(), &responseBody)
	wsConn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		fmt.Println(err)
		responseBody.Msg = err.Error()
		return &responseBody
	}
	id := c.Query("id")

	var ready, find bool
	for {
		if !ready && core.WcList == nil {
			continue
		}
		for _, v := range core.WcList {
			if v.Id == id {
				wsConn.WriteMessage(1, []byte(strconv.Itoa(v.Total)))
				find = true
				if !ready {
					ready = true
				}
				break
			}
		}
		if ready && !find {
			wsConn.Close()
			break
		}

		if ready {
			time.Sleep(300 * time.Millisecond)
			find = false
		}
	}
	return &responseBody
}

// FileList 获取文件列表
func FileList(c *gin.Context) *ResponseBody {
	responseBody := ResponseBody{Msg: "success"}
	defer TimeCost(time.Now(), &responseBody)
	path := c.DefaultQuery("path", "")

	// 🔥 使用 TranslateToCore (彻底解决弹窗！)
	finalBase64, err := TranslateToCore(c)
	if err != nil {
		// fmt.Println("Translate Error:", err)
		responseBody.Msg = err.Error()
		return &responseBody
	}

	sshClient, err := core.DecodedMsgToSSHClient(finalBase64)
	if err != nil {
		fmt.Println("Core Init Error:", err)
		responseBody.Msg = err.Error()
		return &responseBody
	}
	if err := sshClient.CreateSftp(); err != nil {
		fmt.Println("Create SFTP Error:", err)
		responseBody.Msg = err.Error()
		return &responseBody
	}
	defer sshClient.Close()

	// 检测 home 目录
	home := detectHomeDir(sshClient.Sftp, sshClient.Username)

	// 如果 path 为 / 且 home 不为 /，且不是 root 用户，自动切换到 home
	if path == "/" && home != "/" && sshClient.Username != "root" {
		path = home
	}

	// 1. 如果 path 为空，首次进入，普通用户进入 home，root 进入 /
	if path == "" {
		if sshClient.Username == "root" {
			path = "/"
		} else {
			path = home
		}
	}

	files, err := sshClient.Sftp.ReadDir(path)
	if err != nil {
		if strings.Contains(err.Error(), "exist") {
			responseBody.Msg = fmt.Sprintf("Directory %s: no such file or directory", path)
		} else {
			responseBody.Msg = err.Error()
		}
		return &responseBody
	}
	var (
		fileList fileSplice
		fileSize string
	)
	for _, mFile := range files {
		if mFile.IsDir() {
			fileSize = strconv.FormatInt(mFile.Size(), 10)
		} else {
			fileSize = Bytefmt(uint64(mFile.Size()))
		}
		file := File{Name: mFile.Name(), IsDir: mFile.IsDir(), Size: fileSize, ModifyTime: mFile.ModTime().Format("2006-01-02 15:04:05")}
		fileList = append(fileList, file)
	}
	sort.Stable(fileList)
	responseBody.Data = gin.H{
		"list": fileList,
		"home": home, // home 字段始终返回 home 目录
	}
	return &responseBody
}

func detectHomeDir(sftpClient *sftp.Client, username string) string {
	if wd, err := sftpClient.Getwd(); err == nil && wd != "" {
		return wd
	}
	if username == "root" {
		return "/root"
	}
	potentialHome := fmt.Sprintf("/usr/home/%s", username)
	if _, err := sftpClient.Stat(potentialHome); err == nil {
		return potentialHome
	}
	potentialHome = fmt.Sprintf("/home/%s", username)
	if _, err := sftpClient.Stat(potentialHome); err == nil {
		return potentialHome
	}
	return "/home"
}

// 辅助函数：手动处理 POST 参数的翻译 (这里不需要再 import 了)
func translateString(rawSshInfo string, rawPassword string) (string, error) {
	// 1. 解密
	var cleanInfo string
	if strings.Contains(rawSshInfo, "@") && !strings.Contains(rawSshInfo, "=") {
		cleanInfo = rawSshInfo
	} else {
		safeBase64 := strings.ReplaceAll(rawSshInfo, " ", "+")
		decodedBytes, err := base64.StdEncoding.DecodeString(safeBase64)
		if err != nil {
			cleanInfo = rawSshInfo
		} else {
			cleanInfo = string(decodedBytes)
		}
	}
	// 2. 拆分
	parts := strings.Split(cleanInfo, "@")
	if len(parts) != 2 {
		return "", fmt.Errorf("Invalid sshInfo")
	}
	username := parts[0]
	hostPort := parts[1]

	var ip string
	var port int = 22
	if strings.Contains(hostPort, ":") {
		hostParts := strings.Split(hostPort, ":")
		ip = hostParts[0]
		if p, err := strconv.Atoi(hostParts[1]); err == nil {
			port = p
		}
	} else {
		ip = hostPort
	}
	// 3. 构造JSON
	configMap := make(map[string]interface{})
	configMap["username"] = username
	configMap["password"] = rawPassword // POST 上传暂时不支持复杂解密，直接传吧
	configMap["port"] = port
	configMap["type"] = "password"
	configMap["hostname"] = ip

	jsonBytes, _ := json.Marshal(configMap)
	return base64.StdEncoding.EncodeToString(jsonBytes), nil
}
