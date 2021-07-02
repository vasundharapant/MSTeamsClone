  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  var firebaseConfig = {
    apiKey: "AIzaSyCm27xJOmzApVjEbQYSZISg1RbWaumAp7g",
    authDomain: "fir-rtc-ff458.firebaseapp.com",
    projectId: "fir-rtc-ff458",
    storageBucket: "fir-rtc-ff458.appspot.com",
    messagingSenderId: "368699893015",
    appId: "1:368699893015:web:3f07c542726f4440748352",
    measurementId: "G-QFX02TVEB7"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  function logoutPage(){
    console.log('in logout function');    
    firebase.auth().signOut();
    window.location.href="./login.html";
  } 
  function getUser(){
    let userInfo=JSON.parse(sessionStorage.getItem('userInfo'));
    if(!userInfo)
      window.location.href="./login.html";   
    firebase.auth().signInWithEmailAndPassword(userInfo[0],userInfo[1])
    .then(async e=>{
      console.log("logged in");
      const db=firebase.firestore();
      const uid=firebase.auth().currentUser.uid;
      const docRef=db.collection('users').doc(uid);     
      docRef.get().then((doc) => {
        if (doc.exists) {
            //console.log("name:"+ doc.data().name);
            document.getElementById('welcomeText').innerHTML=`Hey ${doc.data().name}! Welcome to MS Teams Clone!`;
        } else {
            // doc.data() will be undefined in this case
            document.getElementById('welcomeText').innerHTML=`Hey there! Welcome to MS Teams Clone!`;
            console.log("No nickname given!");
        }
        }).catch((error) => {
            console.log("Error getting document:", error);
        });
      
    });
    
  }
//function which calls backend to send meet ID through mail
  function sendmail(){
    const data={receiver: document.getElementById('receiverEmail').value,
            roomID: roomId};
    console.log(data);
    const options={
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body:JSON.stringify(data)
    };
    fetch('/sendmail',options);
  }

//on Click listener for opening chat Box

document.getElementById('openChatBox').addEventListener('click',()=>{
  const notif=document.getElementById('chatNotif');
  if(notif){
    document.getElementById('chatElementNav').removeChild(notif);
  }
  toggleChatBox();    
  
});

//function to open and close chat box
function toggleChatBox(){
  const videoDiv=document.getElementById('videoDiv');
  const videoElement=document.querySelectorAll('video');
  if(document.getElementById('chatBox').style.display=="none")
  {
    document.getElementById('chatBox').style.display="block";    
    videoDiv.classList.add('col-sm-6', 'col-md-8', 'col-lg-9');
    videoElement[0].style.width="30vw";   
    videoElement[1].style.width="30vw"; 
  }
  else      //close the chat Box
  {
    document.getElementById('chatBox').style.display="none";
    videoDiv.classList.remove('col-sm-6', 'col-md-8', 'col-lg-9');
    videoElement[0].style.width="40vw";   
    videoElement[1].style.width="40vw"; 
  }
}

//WebRTC part - for video calling and chatting
const configuration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',        
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let roomId = null;
let dataChannel=null;
let caller=1;   //if you are the caller then caller=1, if you are the callee then caller =0

function init() {
  document.querySelector('#cameraBtn').addEventListener('click', openUserMedia);
  document.querySelector('#hangupBtn').addEventListener('click', hangUp);
  document.querySelector('#createBtn').addEventListener('click', createRoom);
  document.querySelector('#joinBtn').addEventListener('click', joinRoom);
}

async function createRoom() {  
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#joinBtn').disabled = true;
  const db = firebase.firestore();
  const roomRef = await db.collection('rooms').doc();  
  console.log('Create PeerConnection with configuration: ', configuration); 
  peerConnection = new RTCPeerConnection(configuration);

  dataChannel = peerConnection.createDataChannel('myChannel');   //data channel for sending messages
  addEventListenerDC();   //add event listener for incoming messages in data channel
  document.getElementById('sendMsgBtn').disabled=false;  //allow sending messages


  registerPeerConnectionListeners();

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Code for collecting ICE candidates below
  const callerCandidatesCollection = roomRef.collection('callerCandidates');  
  peerConnection.addEventListener('icecandidate', event => {
    if (!event.candidate) {
      console.log('Got final candidate!');
      return;
    }
    console.log('Got candidate: ', event.candidate);
    callerCandidatesCollection.add(event.candidate.toJSON());
  });
  // Code for collecting ICE candidates above

  // Code for creating a room below
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log('Created offer:', offer);

  const roomWithOffer = {
    'offer': {
      type: offer.type,
      sdp: offer.sdp,
    },
  };
  await roomRef.set(roomWithOffer);
  roomId = roomRef.id;
  console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);
  document.querySelector(
      '#currentRoom').innerText = `Current room is ${roomRef.id} - You are the caller!`;
  // Code for creating a room above
  document.getElementById('sendMailBtn').style.display="block";
  setTimeout(()=>{
    $("#sendMailModal").modal('show');    
  },1000);
  peerConnection.addEventListener('track', event => {
    console.log('Got remote track:', event.streams[0]);
    event.streams[0].getTracks().forEach(track => {
      console.log('Add a track to the remoteStream:', track);
      remoteStream.addTrack(track);
    });
  });

  // Listening for remote session description below
  roomRef.onSnapshot(async snapshot => {
    const data = snapshot.data();    
    if (!peerConnection.currentRemoteDescription && data && data.answer) //adding answer
    {
      console.log('Got remote description: ', data.answer);
      const rtcSessionDescription = new RTCSessionDescription(data.answer);
      await peerConnection.setRemoteDescription(rtcSessionDescription);
    }   
  });
  // Listening for remote session description above

  // Listen for remote ICE candidates below
  roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        let data = change.doc.data();
        console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
  // Listen for remote ICE candidates above
  document.getElementById("hangupBtn").disabled=false;  
}

function joinRoom() {
  document.querySelector('#confirmJoinBtn').
      addEventListener('click', async () => {
        roomId = document.querySelector('#room-id').value.trim();
        console.log('Join room: ', roomId);        
        await joinRoomById(roomId);
      }, {once: true});  
}

async function joinRoomById(roomId) {
  caller=0;   //you are the callee, someone else created the room
  const db = firebase.firestore();
  const roomRef = db.collection('rooms').doc(`${roomId}`);
  const roomSnapshot = await roomRef.get();
  console.log('Got room:', roomSnapshot.exists);

  if (roomSnapshot.exists) {
    document.querySelector('#createBtn').disabled = true;
    document.querySelector('#joinBtn').disabled = true;
    document.querySelector(
      '#currentRoom').innerText = `Current room is ${roomId} - You are the callee!`;
    document.querySelector(
      '#currentRoom').style.color="black";
    console.log('Create PeerConnection with configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.addEventListener('datachannel', event => {
        console.log('data channel received');
        dataChannel = event.channel;
        addEventListenerDC();   //add event listener for incoming messages in data channel
    });
    document.getElementById('sendMsgBtn').disabled=false;   //allow sending messages

    registerPeerConnectionListeners();
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // Code for collecting ICE candidates below
    const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
    peerConnection.addEventListener('icecandidate', event => {
      if (!event.candidate) {
        console.log('Got final candidate!');
        return;
      }
      console.log('Got candidate: ', event.candidate);
      calleeCandidatesCollection.add(event.candidate.toJSON());
    });
    // Code for collecting ICE candidates above

    peerConnection.addEventListener('track', event => {
      console.log('Got remote track:', event.streams[0]);
      event.streams[0].getTracks().forEach(track => {
        console.log('Add a track to the remoteStream:', track);
        remoteStream.addTrack(track);
      });
    });

    // Code for creating SDP answer below
    const offer = roomSnapshot.data().offer;
    console.log('Got offer:', offer);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    console.log('Created answer:', answer);
    await peerConnection.setLocalDescription(answer);

    const roomWithAnswer = {
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
    };
    await roomRef.update(roomWithAnswer);
    // Code for creating SDP answer above

    // Listening for remote ICE candidates below
    roomRef.collection('callerCandidates').onSnapshot(snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          let data = change.doc.data();
          console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
          await peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
    // Listening for remote ICE candidates above
    document.getElementById("hangupBtn").disabled=false;    
  } 
  else{       //if room does not exist
    document.querySelector(
      '#currentRoom').innerText = `Sorry! The room could not be found. You can try creating a room with CreateRoom Button first.`;
    document.querySelector(
        '#currentRoom').style.color="red";
  }
}

async function openUserMedia(e) {
  const stream = await navigator.mediaDevices.getUserMedia(
      {video: true, audio: true});
  stream.getTracks().forEach(track=>{
    track.enabled=false;
  });
  document.querySelector('#localVideo').srcObject = stream;
  localStream = stream;
  remoteStream = new MediaStream();
  document.querySelector('#remoteVideo').srcObject = remoteStream;

  console.log('Stream:', document.querySelector('#localVideo').srcObject);
  document.querySelector('#cameraBtn').disabled = true;
  document.querySelector('#joinBtn').disabled = false;
  document.querySelector('#createBtn').disabled = false;
  //document.querySelector('#hangupBtn').disabled = false;
  document.getElementById("introMsg").innerText="";
  displayMeetButtons();
}

function displayMeetButtons(){
  document.getElementById('hangupBtn').style.visibility="visible";
  document.getElementById('videoBtn').style.visibility="visible";
  document.getElementById('micBtn').style.visibility="visible";
}
function toggleAudio() {
  let flag=1;     //variable to check which icon should be displayed on the mute button
  localStream.getAudioTracks().forEach(track => {
    track.enabled = !track.enabled;    
    if(track.enabled==false)
      flag=0;
  });
  const muteIcon=document.getElementById("muteIcon");
  if(flag==1)
  {
    muteIcon.classList.remove("fa-microphone-slash");
    muteIcon.classList.add("fa-microphone-alt");
  }
  else{
    muteIcon.classList.remove("fa-microphone-alt");
    muteIcon.classList.add("fa-microphone-slash");
  }  
}
function toggleVideo() {
  let flag=1;     ////variable to check which icon should be displayed on the video button
  localStream.getVideoTracks().forEach(track => {
    track.enabled = !track.enabled;
    if(track.enabled==false)
      flag=0;
  });
  const stopVideo=document.getElementById("stopVideo");
  if(flag==1)
  {
    stopVideo.classList.remove("fa-video-slash");
    stopVideo.classList.add("fa-video");
  }
  else{
    stopVideo.classList.remove("fa-video");
    stopVideo.classList.add("fa-video-slash");
  }  
}

//function that adds event listener to incoming messages in data channel
function addEventListenerDC(){      
  dataChannel.addEventListener('message', event => {
    const message = event.data;
    //console.log(message);

    //add the incoming message to html(in chat box)
    const myNewMsg=document.createElement("li");
    myNewMsg.classList.add('in');
    const myImgDiv=document.createElement('div');
    myImgDiv.classList.add('chat-img');
    const myImg=document.createElement('img');
    myImg.src="https://bootdey.com/img/Content/avatar/avatar1.png";
    myImg.alt="Avtar";
    myImgDiv.appendChild(myImg);
    const myChatDiv=document.createElement('div');
    myChatDiv.classList.add('chat-body');
    const myChatMsg=document.createElement('div');
    myChatMsg.classList.add('chat-message');
    const myName=document.createElement('h5');
    myName.textContent="XYZ";
    const myMsg=document.createElement('p');
    myMsg.textContent=message;
    myChatMsg.appendChild(myName);
    myChatMsg.appendChild(myMsg);
    myChatDiv.appendChild(myChatMsg);
    myNewMsg.appendChild(myImgDiv);myNewMsg.appendChild(myChatDiv);
    document.getElementById('myChat').appendChild(myNewMsg);

    //if chat box is on, leave it, else display notif on navbar
    if(document.getElementById('chatBox').style.display=="none")
    {
     /*  <span class="badge badge-pill badge-primary" style="float:right;margin-bottom:-10px;">!</span>  */
      const notif=document.createElement('span');
      notif.setAttribute('id','chatNotif');
      notif.classList.add('badge','badge-pill','badge-primary');
      notif.style.background="#24a0ed";notif.style.margin="auto";
      notif.innerHTML="!";
      document.getElementById('chatElementNav').appendChild(notif);
    }
  });
}
//adding event listener for pressing enter key in chat box
document.getElementById('myMsg').addEventListener('keydown',(e)=>{  
  if(e.key=='Enter' && dataChannel)
  {
    sendMessage();
  }
  else if(e.key=='Enter')
  {
    document.getElementById('errormessage').innerHTML="You need to be on a call to send a message";
      $('#myErrorModal').modal('show');
  }
});
function sendMessage(){
  const message = document.getElementById('myMsg').value;
  document.getElementById('myMsg').value='';
  if(message!='')
  {
    dataChannel.send(message);

    //create html element to display sent message
    const myNewMsg=document.createElement("li");
    myNewMsg.classList.add('out');
    const myImgDiv=document.createElement('div');
    myImgDiv.classList.add('chat-img');
    const myImg=document.createElement('img');
    myImg.src="https://bootdey.com/img/Content/avatar/avatar6.png";
    myImg.alt="Avtar";
    myImgDiv.appendChild(myImg);
    const myChatDiv=document.createElement('div');
    myChatDiv.classList.add('chat-body');
    const myChatMsg=document.createElement('div');
    myChatMsg.classList.add('chat-message');
    const myName=document.createElement('h5');
    myName.textContent="You";
    const myMsg=document.createElement('p');
    myMsg.textContent=message;
    myChatMsg.appendChild(myName);
    myChatMsg.appendChild(myMsg);
    myChatDiv.appendChild(myChatMsg);
    myNewMsg.appendChild(myImgDiv);myNewMsg.appendChild(myChatDiv);
    document.getElementById('myChat').appendChild(myNewMsg);

  }
    
}
async function hangUp(e) {
  const tracks = document.querySelector('#localVideo').srcObject.getTracks();
  tracks.forEach(track => {
    track.stop();
  });

  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }
  if(dataChannel)
    dataChannel.close();

  if (peerConnection) {
    peerConnection.close();
  }

  document.querySelector('#localVideo').srcObject = null;
  document.querySelector('#remoteVideo').srcObject = null;
  document.querySelector('#cameraBtn').disabled = false;
  document.querySelector('#joinBtn').disabled = true;
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#hangupBtn').disabled = true;
  document.querySelector('#currentRoom').innerText = '';
  document.querySelector('#hangupBtn').style.visibility="hidden";
  document.querySelector('#videoBtn').style.visibility="hidden";
  document.querySelector('#micBtn').style.visibility="hidden";
  document.getElementById('sendMailBtn').style.display="none";
  document.getElementById('sendMsgBtn').disabled=true;  //disable sending messages
  document.getElementById('myChat').innerHTML='';

  // Delete caller/callee candidates from room on hangup  
  if (roomId) {
    const db = firebase.firestore();
    const roomRef = db.collection('rooms').doc(roomId);
    const calleeCandidates = await roomRef.collection('calleeCandidates').get();
    calleeCandidates.forEach(async candidate => {
      await candidate.ref.delete();
    });
    await roomRef.update({ answer: firebase.firestore.FieldValue.delete() });    

    const callerCandidates = await roomRef.collection('callerCandidates').get();
    callerCandidates.forEach(async candidate => {
      await candidate.ref.delete();
    });
    await roomRef.delete();
    
    
  }

  document.location.reload(true);
}

function registerPeerConnectionListeners() {
  peerConnection.addEventListener('icegatheringstatechange', () => {
    console.log(
        `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
  });

  peerConnection.addEventListener('connectionstatechange', () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
    if(peerConnection.connectionState=='failed')
    {
      document.getElementById('errormessage').textContent="It seems that the connection was lost from the other end.";
      $('myErrorModal').modal('show');
      hangUp();
    }
      
  });

  peerConnection.addEventListener('signalingstatechange', () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
  });

  peerConnection.addEventListener('iceconnectionstatechange ', () => {
    console.log(
        `ICE connection state change: ${peerConnection.iceConnectionState}`);
  });
}

init();