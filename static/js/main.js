console.log('In main.js!');


var mapPeers = {};

var usernameInput = document.querySelector('#username');
var btnJoin = document.querySelector('#btn-join');

var username;

//Creating a global variable to store a websocket 

var webSocket;

//referencing on line no. 75 (Function to open Connection)
// Provides Handshaking for Initial Connection (One Time Connection Establishment)
function webSocketOnMessage(event)
{
	var parsedData = JSON.parse(event.data);
	var peerUsername = parsedData['peer'];
	var action = parsedData['action'];
	
	if(username == peerUsername){
		return;
	}
	
	var receiver_channel_name = parsedData['message']['receiver_channel_name'];
	
	if(action == 'new-peer'){
		createOfferer(peerUsername, receiver_channel_name);
	
		return; 
	}
	
	//Create answerer with parameter as offer, Username of the peer and parsed data obtained from async functions
	if(action == 'new-offer'){
		var offer = parsedData['message']['sdp'];
		
		createAnswerer(offer, peerUsername, receiver_channel_name);
		
		return;
	}
	//Create answer with parameter as offer, Username of the peer and parsed data obtained from async functions
	if(action == 'new-answer'){
		var answer = parsedData['message']['sdp'];
		
		var peer = mapPeers[peerUsername][0];
		
		peer.setRemoteDescription(answer);
		
		return;
	}
	
}

//changing username when button is clicked
btnJoin.addEventListener('click', () => 
	{
		username = usernameInput.value;
		console.log('username: ', username);
		
		if(username == '')
		{
			return;
		}  
		
		//When username is set, button and textbox will be disabled  
		usernameInput.value = '';
		usernameInput.disabled = true;
		usernameInput.getElementsByClassName.visibility = 'hidden';
		
		btnJoin.disabled = true;
		btnJoin.getElementsByClassName.visibility = 'hidden';
		
		//Changes the username label to the value passed in by the user
		var labelUsername = document.querySelector('#label-username'); 
		labelUsername.innerHTML = username;
		
		var loc = window.location;
		var wsStart = 'ws://';
		
		if(loc.protocol == 'https:')
		{
			wsStart = 'wss://';
		}
		
		//Creating endpoint for the localhost which could be used then for url sharing 
		var endPoint = wsStart + loc.host + loc.pathname;
		
		console.log('endPoint: ', endPoint);
		
		webSocket = new WebSocket(endPoint);
		
		webSocket.addEventListener('open', (e) => {
			console.log('Connection Opened!');
			
			sendSignal('new-peer', {});
		});
			
		webSocket.addEventListener('message', webSocketOnMessage);
		
		webSocket.addEventListener('close', (e) => {
			console.log('Connection Closed!');
		});
		
		webSocket.addEventListener('error', (e) => {
			console.log('Error Occured!');
		});
	});
	
var localStream = new MediaStream();
	
const constraints = {
	'video': true,
	'audio': true
};
	
const localVideo = document.querySelector('#local-video'); // Selects the local Video Container

const btnToggleAudio = document.querySelector('#btn-toggle-audio');
const btnToggleVideo = document.querySelector('#btn-toggle-video');
	
var userMedia = navigator.mediaDevices.getUserMedia(constraints)
	.then(stream => {
		localStream = stream;
		localVideo.srcObject = localStream;
		localVideo.muted = true;
		
		var audioTracks = stream.getAudioTracks();
		var videoTracks = stream.getVideoTracks();
		
		audioTracks[0].enabled = true;
		videoTracks[0].enabled = true;
		
		btnToggleAudio.addEventListener('click', () => {
			audioTracks[0].enabled = !audioTracks[0].enabled;
			
			if(audioTracks[0].enabled){
				btnToggleAudio.innerHTML = 'Audio Mute';
				
				return;
			}
			btnToggleAudio.innerHTML = 'Audio Unmute';
		});
		
		btnToggleVideo.addEventListener('click', () => {
			videoTracks[0].enabled = !videoTracks[0].enabled;
			
			if(videoTracks[0].enabled){
				btnToggleVideo.innerHTML = 'Video Off';
				
				return;S
			}
			btnToggleVideo.innerHTML = 'Video On';
		});
		
	})
	.catch(error => {
		console.log('Error accessing media devices.', error);
	});
	
var btnSendMsg = document.querySelector('#btn-send-msg');
var messageList = document.querySelector('#message-list'); //To strore the list of messages.
var messageInput = document.querySelector('#msg');

btnSendMsg.addEventListener('click', sendMsgOnClick());


//For Sending message to all the peers on the ME side
function sendMsgOnClick(){
	var message = messageInput.value;
	
	var li = document.createElement('li');
	li.appendChild(document.createTextNode('Me: ' + message));
	messageList.appendChild(li);  //Stores messages as list attributes
	
	var datachannels = getDataChannels();  // Function which lets you open a channel between two peers over which you may send and receive arbitrary data (Definition below)
	
	message = username + ': ' + message;
	li.appendChild(document.createTextNode(message));
	messageList.appendChild(message);
	
	for(index in datachannels){
		datachannels[index].send(message);
	}
	
	messageInput.value = ''
	
}

// DataChannel Function to open channel between peers 
function getDataChannels(){
	var dataChannels = [];
	
	for(peerUsername in mapPeers){
		var dataChannel = mapPeers[peerUsername][1];
		
		dataChannels.push(dataChannel);
	}
	
	return dataChannels;
}
	
	
//Function to send signal using webRTC (Establishing a connection)
function sendSignal(action, message){
	var jsonStr = JSON.stringify({
		'peer': username,
		'action': action,
		'message': message,
	});
		
	webSocket.send(jsonStr);
}
	
// Creating a offerer which could send back a signal to peer who is newly entered the room
	
function createOfferer(peerUsername, receiver_channel_name){
	var peer = new RTCPeerConnection(null);
		
	addLocalTracks(peer);
		
	var dc = peer.createDataChannel('channel');
	dc.addEventListener('open', () => {
		console.log('Connection Opened!');	
	});
	dc.addEventListener('message', dcOnMessage);
		
	var remoteVideo = createVideo(peerUsername);
	setOnTrack(peer, remoteVideo);  // The function is defined on Line 170
		
	mapPeers[peerUsername] = [peer, dc];
		
	peer.addEventListener('iceconnectionstatechange', () => {
		var iceConnectionState = peer.iceConnectionState;
		
		//When connection is closed unfortunately or failed to connect the peer will removed from the grid
		if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
			delete mapPeers[peerUsername];
				
			if (iceConnectionState != 'closed'){
				peer.close();	
			}
				
			removeVideo(remoteVideo);
		}	
	});
		
	peer.addEventListener('icecandidate', (event) => {
		if(event.candidate){
			console.log('New Ice Candidate: ', JSON.stringify(peer.localDescription));
				
			return;
		}
			
		sendSignal('new-offer', {
			'sdp': peer.localDescription,
			'receiver_channel_name': receiver_channel_name
		});
	});
	
	//Creating Offer 
	peer.createOffer()
		.then(o => peer.setLocalDescription(o))
		.then(() => {
			console.log('Local Description set Successfully.');
		});
}

// Adding new MediaStream so that video could made available on screen
function setOnTrack(peer, remoteVideo){
	var remoteStream = new MediaStream();
		
	remoteVideo.srcObject = remoteStream;
		
	peer.addEventListener('track', async (event) => {
		remoteStream.addTrack(event.track, remoteStream);
	});
}

// Answerer creates Answer to an offer in order to establish a connection between peers 
function createAnswerer(offer, peerUsername, receiver_channel_name){
	var peer = new RTCPeerConnection(null);
		
	addLocalTracks(peer);
	
	
	// Creating Remote video grid for reote peer 
	var remoteVideo = createVideo(peerUsername);
	setOnTrack(peer, remoteVideo);  // The function is defined on Line 263
	
	//Adding datachannel for transfer of data between peers 
	peer.addEventListener('datachannel', e => {
		peer.dc = e.channel;
		peer.dc.addEventListener('open', () => {
		console.log('Connection Opened!');	
		});
		peer.dc.addEventListener('message', dcOnMessage); //message transfer process
		
		mapPeers[peerUsername] = [peer, peer.dc];
	});
	
		
	peer.addEventListener('iceconnectionstatechange', () => {
		var iceConnectionState = peer.iceConnectionState;
			
		if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
			delete mapPeers[peerUsername];
				
			if (iceConnectionState != 'closed'){
				peer.close();	
			}
				
			removeVideo(remoteVideo); //To Remove the remote video grid from the window
		}	
	});
		
// Event Listener for Interactive Connectivity Establishment for passing connection data
	peer.addEventListener('icecandidate', (event) => {
		if(event.candidate){
			console.log('New Ice Candidate: ', JSON.stringify(peer.localDescription));
				
			return;
		}
			
		sendSignal('new-answer', {
			'sdp': peer.localDescription,
			'receiver_channel_name': receiver_channel_name
		});
	});
		
	peer.setRemoteDescription(offer)
		.then(() => {
			console.log('Remote description set successfully for %s.', peerUsername);
			
			return peer.createAnswer();
		})
		.then(a => {
			console.log('Answer Created!');
			
			peer.setLocalDescription(a);
		})
}

//Adding Local Video Tracks for Peer_1 Side
function addLocalTracks(peer){
	localStream.getTracks().forEach(track => {
		peer.addTrack(track, localStream);
	});
	
	return;
} 
	

	
// Function for chat messaging through data channels 
function dcOnMessage(event){ 
	var message = event.data;
		
	var li = document.createElement('li'); //Creating a message list element 
	li.appendChild(document.createTextNode(message));
	messageList.appendChild(li);
}
	
	
// Function to Create Video Container
// Includes Video Wrapper Object for capturing and setting up video containers/frames
function createVideo(peerUsername){
	var videoContainer = document.querySelector('#video-container');
		
	var remoteVideo = document.createElement('video');
		
	remoteVideo.id = peerUsername + '-video';
	console.log(remoteVideo.id);
	remoteVideo.autoplay = true;
	remoteVideo.playsInline = true;
		
	var videoWrapper = document.createElement('div');   //Video Wrapper for multiple video handlers
		
	videoContainer.appendChild(videoWrapper);
		
	videoWrapper.appendChild(remoteVideo);
		
	return remoteVideo;
}

// For removing the child from the main window 
function removeVideo(video){
	var videoWrapper = video.parentNode;
		
	videoWrapper.parentNode.removeChild(videoWrapper);
}

// Audio transcription using webkits (Trial Version started on Friday, Sept 3, 2021 11:32 PM)
// ////
//var speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
//var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList
//var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent

try {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = new SpeechRecognition();
}
catch(e) {
  console.error(e);
  $('.no-browser-support').show();
  $('.app').hide();
}

//var recognition = new speechRecognition()
//var speechRecognitionList = new SpeechGrammarList();

//speechRecognitionList.addFromString(grammar, 1);

var textbox = $("#textbox")
var instructions = $("#instructions")

var start_btn = $("#start-btn")
var noteContent = ''

recognition.continuous = true

//recognition.onstart = function() {
//	instructions.innerHTML = "Voice Recognition is On";
//}

//recognition.addEventListener('onstart', (event) => {
//			instructions.innerHTML = "Voice Recognition is On";
//		});

recognition.onstart = function() { 
  instructions.innerHTML = 'Voice recognition activated. Try speaking into the microphone.';
}

recognition.onspeechend = function() {
  instructions.innerHTML = 'You were quiet for a while so voice recognition turned itself off.';
}

recognition.onerror = function(event) {
  if(event.error == 'no-speech') {
    instructions.innerHTML = 'No speech was detected. Try again.';  
  };
}

//recognition.onresult = function (event) {
//	var current = event.resultIndex;
//	
//	var transcript = event.result[current][0].transcript;
	
//	content += transcript;
	
//	textbox.val(content);
//}


recognition.onresult = function(event) {

  // event is a SpeechRecognitionEvent object.
  // It holds all the lines we have captured so far. 
  // We only need the current one.
  var current = event.resultIndex;

  // Get a transcript of what was said.
  var transcript = event.results[current][0].transcript;

  // Add the current transcript to the contents of our Note.
  noteContent += transcript;
  textbox.val(noteContent);
}


$("#start-btn").click(function (event) {
	if(noteContent.length){
		content += ''
	}



//start_btn.addEventListener('event', (e) => {
//		if(content.length){
//			content += '';
//		}
	
	recognition.start();
});

	

