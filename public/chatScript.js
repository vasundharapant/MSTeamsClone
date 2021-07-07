function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
}

let script;     //string to store chat messages

function saveScript(){
    script='';
    let myChat=document.getElementById('myChat');
    while(myChat.firstElementChild)
    {
        let temp=document.getElementById('myChat').firstElementChild;
        let temp2=temp.firstElementChild;       //chat image
        temp.removeChild(temp2);
        temp2=temp.firstElementChild;       //chat-body
        let chatMsg=temp2.firstElementChild;
        let username=chatMsg.firstElementChild.innerHTML;
        chatMsg.removeChild(chatMsg.firstElementChild);
        let textMsg=chatMsg.firstElementChild.innerHTML;  
        script=script+username+": "+textMsg+"\n";   
        myChat.removeChild(temp);
    }
}
function downloadChat()
{
    // Start file download.      
  download("chat.txt",script);
}
 
  