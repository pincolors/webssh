package controller

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
	"webssh/core"

	"github.com/gin-gonic/gin"
)

// ResponseBody 响应信息结构体
type ResponseBody struct {
	Duration string
	Data     interface{}
	Msg      string
}

// TimeCost 计算方法执行耗时
func TimeCost(start time.Time, body *ResponseBody) {
	body.Duration = time.Since(start).String()
}

// 🔥🔥🔥 新增：通用翻译工具函数 (供 file.go 和 terminal.go 使用) 🔥🔥🔥
func TranslateToCore(c *gin.Context) (string, error) {
	rawSshInfo := c.DefaultQuery("sshInfo", "")
	rawPassword := c.DefaultQuery("password", "")

	// 1. 解密 user@ip:port
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
		return "", fmt.Errorf("Invalid sshInfo format")
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

	// 3. 密码
	var password string
	if rawPassword != "" {
		pwdBytes, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(rawPassword, " ", "+"))
		if err == nil {
			password = string(pwdBytes)
		} else {
			password = rawPassword
		}
	}

	// 4. 构造 JSON (使用 hostname)
	configMap := make(map[string]interface{})
	configMap["username"] = username
	configMap["password"] = password
	configMap["port"] = port
	configMap["type"] = "password"
	configMap["hostname"] = ip

	jsonBytes, _ := json.Marshal(configMap)
	return base64.StdEncoding.EncodeToString(jsonBytes), nil
}

// CheckSSH 检查ssh连接是否能连接
func CheckSSH(c *gin.Context) *ResponseBody {
	responseBody := ResponseBody{Msg: "success"}
	defer TimeCost(time.Now(), &responseBody)

	// 🔥 使用通用工具处理参数
	finalBase64, err := TranslateToCore(c)
	if err != nil {
		responseBody.Msg = err.Error()
		return &responseBody
	}

	sshClient, err := core.DecodedMsgToSSHClient(finalBase64)
	if err != nil {
		fmt.Println("CheckSSH Init Error:", err)
		responseBody.Msg = err.Error()
		return &responseBody
	}

	err = sshClient.GenerateClient()
	defer sshClient.Close()

	if err != nil {
		fmt.Println("CheckSSH Connect Failed:", err)
		responseBody.Msg = err.Error()
	}
	return &responseBody
}
