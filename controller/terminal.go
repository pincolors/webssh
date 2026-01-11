package controller

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"webssh/core"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// TermWs 获取终端ws
func TermWs(c *gin.Context, timeout time.Duration) *ResponseBody {
	responseBody := ResponseBody{Msg: "success"}
	
	// 1. 获取参数
	rawSshInfo := c.DefaultQuery("sshInfo", "")
	rawPassword := c.DefaultQuery("password", "")
	cols := c.DefaultQuery("cols", "150")
	rows := c.DefaultQuery("rows", "35")
	closeTip := c.DefaultQuery("closeTip", "Connection timed out!")
	col, _ := strconv.Atoi(cols)
	row, _ := strconv.Atoi(rows)

	// --- 第一步：解密 user@ip:port ---
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

	// --- 第二步：拆分信息 ---
	parts := strings.Split(cleanInfo, "@")
	if len(parts) != 2 {
		responseBody.Msg = "Invalid sshInfo format"
		return &responseBody
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

	// --- 第三步：解密密码 ---
	var password string
	if rawPassword != "" {
		pwdBytes, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(rawPassword, " ", "+"))
		if err == nil {
			password = string(pwdBytes)
		} else {
			password = rawPassword
		}
	}

	// --- 🔥🔥🔥 核心修正：使用 hostname 🔥🔥🔥 ---
	configMap := make(map[string]interface{})
	configMap["username"] = username
	configMap["password"] = password
	configMap["port"] = port
	configMap["type"] = "password"
	
	// ✅ 证据表明：这里必须叫 hostname
	configMap["hostname"] = ip 

	// 转 JSON
	jsonBytes, _ := json.Marshal(configMap)
	finalBase64Payload := base64.StdEncoding.EncodeToString(jsonBytes)

	fmt.Printf(">>> 正在连接: User=%s Hostname=%s Port=%d\n", username, ip, port)

	// 2. 传给 core
	sshClient, err := core.DecodedMsgToSSHClient(finalBase64Payload)
	if err != nil {
		fmt.Println("Core Init Error:", err)
		responseBody.Msg = err.Error()
		return &responseBody
	}

	// 3. 升级 WebSocket
	wsConn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		responseBody.Msg = err.Error()
		return &responseBody
	}

	// 4. 连接 SSH
	err = sshClient.GenerateClient()
	if err != nil {
		fmt.Printf("SSH Connect FAILED: %v\n", err) 
		wsConn.WriteMessage(1, []byte(err.Error()))
		wsConn.Close()
		responseBody.Msg = err.Error()
		return &responseBody
	}
	
	fmt.Println(">>> SSH 连接成功！终端初始化中...")
	sshClient.InitTerminal(wsConn, row, col)
	sshClient.Connect(wsConn, timeout, closeTip)
	return &responseBody
}
