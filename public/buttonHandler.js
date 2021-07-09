//functions for changing drop down button text
function showCreate(item){
    document.getElementById("createBtn").innerHTML = item.innerHTML;
}
function showJoin(item){
    document.getElementById("joinBtn").innerHTML = item.innerHTML;
}

//function to create a room on pressing the create chat/video room btn
function create(){
    let text=document.getElementById('createBtn').innerHTML;
    if(text=='Create VideoChat Room')
    {
        if(document.getElementById('cameraBtn').disabled==false)
        {
            document.getElementById('errormessage').innerHTML='You need to give access to media first to start a video call.'
            $('#myErrorModal').modal('show');
            return;
        }
        createRoom();
    }
    else{
        createChatRoom();
        document.getElementById('leaveChatBtn').style.display="block";
    }
}

//function to join a room on pressing the join chat/video room btn
function join(){
    let text=document.getElementById('joinBtn').innerHTML;
    if(text=='Join VideoChat')
    {
        if(document.getElementById('cameraBtn').disabled==false)
        {
            document.getElementById('errormessage').innerHTML='You need to give access to media first to join a video call.'
            $('#myErrorModal').modal('show');
            return;
        }
        $('#joinModal').modal('show');
        joinRoom();
    }
    else{
        $('#joinModal').modal('show');
        joinChatRoom();
        document.getElementById('leaveChatBtn').style.display="block";
    }
}
