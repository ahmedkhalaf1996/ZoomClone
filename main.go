package main

import (
	"fmt"
	"net/http"

	"github.com/ahmedkhalaf1996/ZoomClone/pkg"

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

	hub := pkg.NewHub()
	go hub.Run()

	router.GET("/ws/:room", func(c *gin.Context) {
		roomId := c.Param("room")
		handleWebSocket(hub, c.Writer, c.Request, roomId)
	})

	router.Run(":3000")
}

func handleWebSocket(hub *pkg.Hub, w http.ResponseWriter, r *http.Request, roomId string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer conn.Close()

	clientId := generateUUID()

	client := &pkg.Client{
		Conn:     conn,
		ClientId: clientId,
		RoomId:   roomId,
		Send:     make(chan []byte),
		Hub:      hub,
	}

	hub.Register <- client

	go client.WritePump()
	client.ReadPump()
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
