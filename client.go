package main

import (
	"github.com/gorilla/websocket"
)

type Client struct {
	conn     *websocket.Conn
	clientId string
	roomId   string
	send     chan []byte
	hub      *Hub
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for {
		messageType, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		c.hub.broadcast <- &Message{roomId: c.roomId, clientId: c.clientId, messageType: messageType, payload: message}
	}
}

func (c *Client) writePump() {
	defer func() {
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			err := c.conn.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				return
			}
		}
	}
}
