package main

type Message struct {
	roomId      string
	clientId    string
	messageType int
	payload     []byte
}
