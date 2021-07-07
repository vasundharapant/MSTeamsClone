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

let imgURL=null;
let curr_uid=null;    //stores UID of current user
let uid;
function getUser(){
  let userInfo=JSON.parse(sessionStorage.getItem('userInfo'));
  if(!userInfo)
    window.location.href="./login.html";  

  curr_uid=userInfo[2]; 
  firebase.auth().signInWithEmailAndPassword(userInfo[0],userInfo[1])
  .then(async e=>{
    console.log("logged in");
    const db=firebase.firestore();    
    const docRef=db.collection('users').doc(curr_uid);     
    docRef.get().then((doc) => {
      if (doc.exists) {
          //console.log("name:"+ doc.data().name);
          document.getElementById('welcomeText').innerHTML=`Hey <i>${doc.data().name}</i>! Welcome to MS Teams Clone!`;
      } else {
          // doc.data() will be undefined in this case
          document.getElementById('welcomeText').innerHTML=`Hey there! Welcome to MS Teams Clone!`;
          console.log("No nickname given!");
      }
      }).catch((error) => {
          console.log("Error getting document:", error);
      });
      
      //getting user image from firebase storage
      var storageRef = firebase.storage().ref('images/'+curr_uid).getDownloadURL()
      .then((url)=>{
        var img = document.getElementById('userImg');
        imgURL=url;
        img.setAttribute('src', url);
      })
      .catch(e=>{
        console.log("no image found");
        const img=document.getElementById('userImg');
        document.getElementById('imgDiv').removeChild(img);
      });

  })
  .catch(e=>{console.log(e)});
  
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
    videoElement[0].style.width="35vw";   
    videoElement[1].style.width="35vw"; 
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
let displayLocalStream=null;    //stream for screen sharing of local user
let remoteStream = null;
let displayRemoteStream=null;    //stream for screen sharing of remote user
let roomId = null;
let dataChannel=null;
let caller=1;   //if you are the caller then caller=1, if you are the callee then caller =0
let remoteUsername=null;
let remote_UID=null;
let remoteImgURL=null;
let senders=[];
let sharing=0;    //sharing=1 when screen is being presented, else sharing=0
let onlyChat=0;   //onlyChat=1 when chat room is created, 0 when video room is created
let convertToVideo=0;   // =1 when call is being converted from chat to video, otherwise =0


function init() {
  document.querySelector('#cameraBtn').addEventListener('click', openUserMedia);
  document.querySelector('#hangupBtn').addEventListener('click', hangUp);
}

async function createRoom() {  
  caller=1;     //you are the caller
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

  if(!onlyChat)   //only add video streams in video call, not in chat room
  {   
    localStream.getTracks().forEach(track => {
      senders.push(peerConnection.addTrack(track, localStream));
    });
    addVideoLabel("localVideoDiv","You",'localVideoLabel');
    convertToVideo=1;
  }  

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
    'offer_UID':{     //put the current user's UID into firebase, so that callee can access it's username and photo
      uid: curr_uid,
    },
  };
  await roomRef.set(roomWithOffer);
  if(onlyChat)
    await roomRef.update({'chatRoom':1,'videoRoom':0});
  else
    await roomRef.update({'chatRoom':0,'videoRoom':1});
  roomId = roomRef.id;
  console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);
  document.querySelector(
      '#currentRoom').innerText = `Current room is ${roomRef.id} - You are the caller!`;
  // Code for creating a room above
  document.getElementById('sendMailBtn').style.display="block";
  setTimeout(()=>{
    $("#sendMailModal").modal('show');    
  },1000);

  if(!onlyChat)   //recieve tracks only during video call, not in chat room
  {
    peerConnection.addEventListener('track', event => {
      console.log('Got remote track:', event.streams[0]);    
      event.streams[0].getTracks().forEach(track => {         
          console.log('Add a track to the remoteStream:', track);
          remoteStream.addTrack(track);      
      });
    });
  }  

  // Listening for remote session description below
  roomRef.onSnapshot(async snapshot => {
    const data = snapshot.data();    
    if (!peerConnection.currentRemoteDescription && data && data.answer) //adding answer
    {
      console.log('Got remote description: ', data.answer);
      const rtcSessionDescription = new RTCSessionDescription(data.answer);
      await peerConnection.setRemoteDescription(rtcSessionDescription);
      if(convertToVideo)
      {
        let new_remote_UID=data.answer_UID.uid;
        if(new_remote_UID!=remote_UID)    //check if the person joining the call is the same person you earlier were on a chat with
        {
          document.getElementById('myChat').innerHTML=''; 
        }
      }
      remote_UID=data.answer_UID.uid;
      setRemoteUserImg();
      setRemoteLabel();
      if(!onlyChat)
        document.getElementById('screenBtn').style.visibility="visible";
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
  
  if(!onlyChat)
  {
    document.getElementById("hangupBtn").disabled=false;    
  }  
  if(onlyChat)
    document.getElementById('leaveChatBtn').disabled=false;   
}
async function createChatRoom(){
  onlyChat=1;
  document.getElementById('convertToVideoBtn').style.display="block";
  createRoom();
}
function joinChatRoom(){
  onlyChat=1;  
  joinRoom();
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

  //temp is a variable to ensure that chatRooms and joined by 'join chat room' btn and video rooms are joined by 'join video' btn respectively
  let temp=(roomSnapshot.exists &&((onlyChat && roomSnapshot.data().chatRoom==1)||(!onlyChat && roomSnapshot.data().videoRoom==1)));
  if (roomSnapshot.exists && temp) { 
    if(onlyChat)
      document.getElementById('joinVideoBtn').style.display="block";
    if(onlyChat==0)
    {
      convertToVideo=1;
      document.getElementById('joinVideoBtn').style.display="none";
      document.getElementById('leaveChatBtn').style.display="none";
    }      
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
    if(!onlyChat)
    {
      localStream.getTracks().forEach(track => {
        senders.push(peerConnection.addTrack(track, localStream));
      });
      addVideoLabel("localVideoDiv","You",'localVideoLabel');
    }
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

    if(!onlyChat)
    {
      peerConnection.addEventListener('track', event => {
        console.log('Got remote track:', event.streams[0]);    
        event.streams[0].getTracks().forEach(track => {
          console.log('Add a track to the remoteStream:', track);
          remoteStream.addTrack(track); 
        });
      });
    }

    // Code for creating SDP answer below
    const offer = roomSnapshot.data().offer;
    if(convertToVideo)
      {
        let new_remote_UID=roomSnapshot.data().offer_UID.uid;
        if(new_remote_UID!=remote_UID)    //check if the caller is the same person you earlier were on a chat with
        {
          document.getElementById('myChat').innerHTML=''; 
        }
      }
    remote_UID=roomSnapshot.data().offer_UID.uid;
    if(!onlyChat)
      document.getElementById('screenBtn').style.visibility="visible";
    setRemoteUserImg();
    setRemoteLabel();
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
      answer_UID:{
        uid: curr_uid,
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
    if(!onlyChat)
      document.getElementById("hangupBtn").disabled=false;
    if(onlyChat)
      document.getElementById('leaveChatBtn').disabled=false;    
  } 
  else{       //if room does not exist
    onlyChat=0;
    document.querySelector(
      '#currentRoom').innerText = `Sorry! The room could not be found. You can try creating a room with CreateRoom Button first.`;
    document.querySelector(
        '#currentRoom').style.color="red";
  }
}

//function to convert from chat to video call 
async function joinVideoCall(){
  if(document.getElementById('cameraBtn').disabled==false)
  {
    document.getElementById('errormessage').innerHTML='You need to give access to your media first to convert to video call';
    $('#myErrorModal').modal('show');
  } 
  else if(dataChannel!=null)
  {
    document.getElementById('errormessage').innerHTML='The caller needs to convert the call to video first. Only then you will be able to join.';
    $('#myErrorModal').modal('show');
  }
  else{
    onlyChat=0;    
    $('#joinModal').modal('show');
    joinRoom();
  }
} 
async function convertToVideoCall(){
  if(document.getElementById('cameraBtn').disabled==false)
  {
    document.getElementById('errormessage').innerHTML='You need to give access to your media first to convert to video call';
    $('#myErrorModal').modal('show');
  } 
  else{
    convertToVideo=1;
      // Delete caller/callee candidates from room on hangup  
      if (roomId) {
        const db = firebase.firestore();
        const roomRef = db.collection('rooms').doc(roomId);
        const roomSnapshot = await roomRef.get();
        if(roomSnapshot.exists)
        {
          const calleeCandidates = await roomRef.collection('calleeCandidates').get();
          calleeCandidates.forEach(async candidate => {
            await candidate.ref.delete();
          });
          await roomRef.update({ answer: firebase.firestore.FieldValue.delete() });    

          const callerCandidates = await roomRef.collection('callerCandidates').get();
          callerCandidates.forEach(async candidate => {
            await candidate.ref.delete();
          });
        }    
        await roomRef.delete();
    
    
      }
    leaveChat();
    onlyChat=0;
    document.getElementById('convertToVideoBtn').style.display="none";
    document.getElementById('leaveChatBtn').style.display="none";
    createRoom();
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
  if(!convertToVideo && !dataChannel)
  {
    document.querySelector('#joinBtn').disabled = false;
    document.querySelector('#createBtn').disabled = false;
  }  
  //document.querySelector('#hangupBtn').disabled = false;
  document.getElementById("introMsg").innerText="";
  displayMeetButtons();
}

async function openUserScreen() {  
  const screenConstraints={
        video: {
            cursor: 'always' | 'motion' | 'never',
            displaySurface: 'application' | 'browser' | 'monitor' | 'window'
        }
    } 
  
  if (!displayLocalStream) {
    try{
      displayLocalStream = await navigator.mediaDevices.getDisplayMedia(screenConstraints);
      senders.find(sender => sender.track.kind === 'video').replaceTrack(displayLocalStream.getTracks()[0]);
  
      //set the local video as that of your screen
      document.getElementById('localVideo').srcObject = displayLocalStream;
      //change icon
      document.getElementById('screenIcon').classList.remove( 'fa-share-square');
      document.getElementById('screenIcon').classList.add('fa-stop-circle');
      sharing=1;

      //add listener for when the user clicks on 'stop sharing' 
      displayLocalStream.getTracks()[0].onended = function () {
        stopSharing();
      };
    }
    catch(err){
      console.log(err);
    }    
  }  
}
function stopSharing(){
  senders.find(sender => sender.track.kind === 'video')
      .replaceTrack(localStream.getTracks().find(track => track.kind === 'video'));
    document.getElementById('localVideo').srcObject = localStream;
  displayLocalStream.getTracks().forEach(track=>track.stop());
  displayLocalStream=null;
  document.getElementById('screenIcon').classList.remove( 'fa-stop-circle');
  document.getElementById('screenIcon').classList.add('fa-share-square');
  sharing=0;
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
function toggleScreen(){
  if(sharing)
    stopSharing();
  else
    openUserScreen();
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
    if(remoteImgURL)
      myImg.setAttribute('src',remoteImgURL);
    else      
      myImg.src="https://bootdey.com/img/Content/avatar/avatar1.png";
    myImg.style.width="48px";myImg.style.height="48px";
    myImg.alt="Avtar";
    myImgDiv.appendChild(myImg);
    const myChatDiv=document.createElement('div');
    myChatDiv.classList.add('chat-body');
    const myChatMsg=document.createElement('div');
    myChatMsg.classList.add('chat-message','mt-1','mb-1');
    const myName=document.createElement('h5');
    myName.textContent=remoteUsername;
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
      let notif=document.getElementById('chatNotif');
      if(notif)
        return;
      notif=document.createElement('span');
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
  if(e.key=='Enter' && dataChannel && dataChannel.readyState=="open")
  {
    sendMessage();
  }
  else if(e.key=='Enter')
  {
    document.getElementById('myMsg').value='';
    console.log('No data channel exists');
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
    if(imgURL)
      myImg.setAttribute('src',imgURL);
    else  
      myImg.src="https://bootdey.com/img/Content/avatar/avatar7.png";
    myImg.style.width="48px";myImg.style.height="48px";
    myImg.alt="Avtar";
    myImgDiv.appendChild(myImg);
    const myChatDiv=document.createElement('div');
    myChatDiv.classList.add('chat-body');
    const myChatMsg=document.createElement('div');
    myChatMsg.classList.add('chat-message','mt-1','mb-1');
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

//function for adding labels to video elements
function addVideoLabel(videoDivID,label,id){
  const videoEl=document.getElementById(videoDivID);
  const div = document.createElement('div');
  div.classList.add('videoLabels'); 
  div.setAttribute('id',id); 
  div.innerHTML = label.trim();
  videoEl.appendChild(div);
}

//function to retrieve username of remote user from firebase and use it as label
function setRemoteLabel(){
  const db=firebase.firestore();
  const docRef=db.collection('users').doc(remote_UID);     
  docRef.get().then((doc) => {
    if (doc.exists) {
        remoteUsername=doc.data().name;
        if(!onlyChat)
          addVideoLabel('remoteVideoDiv',remoteUsername,'remoteVideoLabel');
    } else {
        console.log("No nickname given!");
    }
    }).catch((error) => {
        console.log("Error getting document:", error);
    });
}
function setRemoteUserImg(){
  //getting remote user image from firebase storage
  var storageRef = firebase.storage().ref('images/'+remote_UID).getDownloadURL()
  .then((url)=>{    
    remoteImgURL=url;
  })
  .catch(e=>{
    remoteImgURL=null;
    console.log("no remote image found");
  });
}
async function hangUp(e) {  
  if(localStream)
  localStream.getTracks().forEach(track => {
    track.stop();
  });
  senders=[];
  if(displayLocalStream)
    displayLocalStream.getTracks().forEach(track=>track.stop());
  displayLocalStream=null;
  
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }
  const localLabel=document.getElementById('localVideoLabel');
  if(localLabel)
    document.getElementById('localVideoDiv').removeChild(localLabel);
  const remoteLabel=document.getElementById('remoteVideoLabel');
  if(remoteLabel)
    document.getElementById('remoteVideoDiv').removeChild(remoteLabel);

  document.querySelector('#localVideo').srcObject = null;
  document.querySelector('#remoteVideo').srcObject = null;
  document.querySelector('#cameraBtn').disabled=false;
  document.querySelector('#joinBtn').disabled = true;  
  document.querySelector('#hangupBtn').style.visibility="hidden";
  document.querySelector('#screenBtn').style.visibility="hidden";
  document.querySelector('#videoBtn').style.visibility="hidden";
  document.querySelector('#micBtn').style.visibility="hidden";  
  
  if(dataChannel)
    document.getElementById('leaveChatBtn').style.display="block";

  // Delete caller/callee candidates from room on hangup  
  if (roomId) {
    const db = firebase.firestore();
    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnapshot = await roomRef.get();
    if(roomSnapshot.exists)
    {
      const calleeCandidates = await roomRef.collection('calleeCandidates').get();
      calleeCandidates.forEach(async candidate => {
        await candidate.ref.delete();
      });
      await roomRef.update({ answer: firebase.firestore.FieldValue.delete() });    

      const callerCandidates = await roomRef.collection('callerCandidates').get();
      callerCandidates.forEach(async candidate => {
        await candidate.ref.delete();
      });
    }    
    await roomRef.delete();
    
    
  }
  onlyChat=1;
}
function leaveChatUser()
{
  convertToVideo=0;
  leaveChat();
}
function leaveChat(){
  if(dataChannel)
    dataChannel.close();

  if (peerConnection) {
    peerConnection.close();
    document.querySelector('#cameraBtn').disabled = false;
  }
  if(!convertToVideo)
  {
    document.getElementById('sendMsgBtn').disabled=true;  
    document.getElementById('myChat').innerHTML='';  
    document.getElementById('leaveChatBtn').style.display="none";     
    document.getElementById('createBtn').disabled=false;
    document.getElementById('joinBtn').disabled=false;
    document.getElementById('convertToVideoBtn').style.display="none";
    document.getElementById('joinVideoBtn').style.display="none";
  }  
  
  document.getElementById('currentRoom').innerText='';
  document.getElementById('sendMailBtn').style.display="none";
  
  roomId=null;dataChannel=null;
  onlyChat=0;
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
      if(!onlyChat ||(onlyChat && !convertToVideo))
      {
        document.getElementById('errormessage').textContent="The connection failed. The call was probably ended from the other end.";
        $('#myErrorModal').modal('show');
        hangUp();
      }
      else if((onlyChat && convertToVideo)|| caller)
      {        
        leaveChatUser();
      }      
    }
    if(peerConnection.connectionState=='disconnected')
    {
      if(onlyChat && !convertToVideo && caller==0)
      {
        $('#convertToVideoModal').modal('show');
        hangUp();
        convertToVideo=1;
        leaveChat();
      }
      else{
        document.getElementById('errormessage').textContent="The connection was lost from the other end. You may wait for connection to reestablish or end the call.";
        $('#myErrorModal').modal('show');
      }      
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