//functions for changing drop down text
function showCreate(item){
    document.getElementById("createBtn").innerHTML = item.innerHTML;
}
function showJoin(item){
    document.getElementById("joinBtn").innerHTML = item.innerHTML;
}
  
function create(){
    let text=document.getElementById('createBtn').innerHTML;
    if(text=='Create VideoChat Room')
    {
        createRoom();
    }
    else{
        createChatRoom();
    }
}
function join(){
    let text=document.getElementById('joinBtn').innerHTML;
    if(text=='Join VideoChat')
    {
        $('#joinModal').modal('show');
        joinRoom();
    }
    else{
        $('#joinModal').modal('show');
        joinChatRoom();
    }
}
