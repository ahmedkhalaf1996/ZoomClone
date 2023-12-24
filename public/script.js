// Establish WebSocket connection using the ROOM_ID
const socket = new WebSocket(`ws://${window.location.host}/ws/${ROOM_ID}`);
const videoGrid = document.getElementById('video-grid');
const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');

let screenStream = null;
let startShareButton = document.getElementById('start-share-button');
let stopShareButton = document.getElementById('stop-share-button');


const myPeer = new Peer();
const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};

function toggleShare() {
  if (!screenStream) {
    startShare().then(() => {
      startShareButton.style.display = 'none';
      stopShareButton.style.display = 'block';
    });
  } else {
    stopShare();
    startShareButton.style.display = 'block';
    stopShareButton.style.display = 'none';
  }
}


function toggleShare() {
  if (!screenStream) {
    startShare().then(() => {
      startShareButton.style.display = 'none';
      stopShareButton.style.display = 'block';
    });
  } else {
    stopShare();
    startShareButton.style.display = 'block';
    stopShareButton.style.display = 'none';
  }
}

async function startShare() {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

    // Share the screen with existing users
    Object.values(peers).forEach((peer) => {
      peer.peerConnection.getSenders().find((s) => s.track.kind === 'video').replaceTrack(screenStream.getTracks()[0]);
    });

    // Show the shared screen locally
    const screenVideo = document.createElement('video');
    addVideoStream(screenVideo, screenStream);
  } catch (error) {
    stopShare();
    console.error('Error starting screen share:', error);
  }
}

function stopShare() {
  // Replace the screen stream with the camera stream
  Object.values(peers).forEach((peer) => {
    peer.peerConnection.getSenders().find((s) => s.track.kind === 'video').replaceTrack(myVideo.srcObject.getTracks()[1]);
  });

  // Remove the local screen sharing video element
  const screenVideo = document.querySelector('#video-grid video:last-child');
  if (screenVideo) {
    screenVideo.remove();
  }

  // Stop and close the screen sharing stream
  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());
    screenStream = null;
  }
}

// Set the initial button state based on the screenStream
function setInitialButtonState() {
  startShareButton.style.display = screenStream ? 'none' : 'block';
  stopShareButton.style.display = screenStream ? 'block' : 'none';
}

// Call the function to set the initial button state
setInitialButtonState();


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
