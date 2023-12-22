package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	router := gin.Default()

	router.LoadHTMLGlob("views/*")
	router.Static("/public", "./public")

	router.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/"+generateUUID())
	})

	router.GET("/:room", func(c *gin.Context) {
		roomId := c.Param("room")
		c.HTML(http.StatusOK, "room.html", gin.H{"roomId": roomId})
	})

	hub := newHub()
	go hub.run()

	router.GET("/ws/:room", func(c *gin.Context) {
		roomId := c.Param("room")
		handleWebSocket(hub, c.Writer, c.Request, roomId)
	})

	router.Run(":3000")
}

func handleWebSocket(hub *Hub, w http.ResponseWriter, r *http.Request, roomId string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer conn.Close()

	clientId := generateUUID()

	client := &Client{
		conn:     conn,
		clientId: clientId,
		roomId:   roomId,
		send:     make(chan []byte),
		hub:      hub,
	}

	hub.register <- client

	go client.writePump()
	client.readPump()
}

func generateUUID() string {
	// Implement your UUID generation logic here
	id, err := uuid.NewRandom()
	if err != nil {
		fmt.Println("Error generating UUID:", err)
		return ""
	}
	return id.String()
}

//8
