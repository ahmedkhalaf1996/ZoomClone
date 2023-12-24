
// Establish WebSocket connection using the ROOM_ID
const socket = new WebSocket(`ws://${window.location.host}/ws/${ROOM_ID}`);
const videoGrid = document.getElementById('video-grid');
const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');

let screenStream = null; 

const myPeer = new Peer();

const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};



function sendMessage() {
  const message = messageInput.value;
  if (message.trim() !== '') {
    socket.send(JSON.stringify({
      roomId: ROOM_ID,
      clientId: myPeer.id,
      messageType: 2, // 2 indicates a text message
      payload: message,
    }));
    displayMyMessage(  messageInput.value);
    messageInput.value = '';

  }
}

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
}).then((stream) => {
  addMyVideoStream(myVideo, stream);

  myPeer.on('call', (call) => {
    call.answer(stream);
    const video = document.createElement('video');
    call.on('stream', (userVideoStream) => {
      addVideoStream(video, userVideoStream);
    });
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.roomId === ROOM_ID) {
      if (message.messageType === 1) {
        connectToNewUser(message.clientId, stream);
      }else if (message.messageType === 2) {
        displayMessage(message.clientId, message.payload);
      }
    }
  });
});

myPeer.on('open', (id) => {
  socket.send(JSON.stringify({
    roomId: ROOM_ID,
    clientId: id,
    messageType: 1, // 1 indicates a user connection
  }));
});

function displayMyMessage(message){
  const div = document.createElement('div');
  div.innerHTML = `<b>You : </b> ${message}`;
  messagesDiv.appendChild(div);
}

function displayMessage(clientId, message) {
  const div = document.createElement('div');
  div.innerHTML = `<b>${clientId}:</b> ${message}`;
  messagesDiv.appendChild(div);
}

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove();
  });

  peers[userId] = call;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
}



function addMyVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
}
