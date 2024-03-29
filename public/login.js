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

const email=document.getElementById('InputEmail1');
const password=document.getElementById('InputPassword1');
const loginbtn=document.getElementById('loginbtn');
const signupbtn=document.getElementById('signupbtn');
const auth=firebase.auth();

var state=-1;     //state=1 for login, state=2 for signup

var emailID,Password,uid;
loginbtn.addEventListener('click',event=>{
    state=1;
    event.preventDefault();
    emailID=email.value;
    Password=password.value;
    console.log('login');
    const promise=auth.signInWithEmailAndPassword(emailID,Password)
    .catch(e=>{
        document.getElementById('errormessage').innerHTML=e.message;
        $("#myModal").modal('show');
        //console.log(e.message)
    });
});
signupbtn.addEventListener('click',event=>{
    state=2;
    event.preventDefault();
    window.location.href="./signup.html";
});

auth.onAuthStateChanged(firebaseUser=>{
    if(firebaseUser){
        console.log("logged in");     
        //console.log(firebaseUser);
        uid=firebaseUser.uid;
        goToIndex();                                                        
    }
    else{
        console.log("not logged in");
        //window.location.href="./index.html";
    }
});
function logoutUser(){
    auth.signOut();
}
function goToIndex(){
    if(state==-1)return;
    let userInfo=[emailID,Password,uid];
    sessionStorage.setItem('userInfo',JSON.stringify(userInfo)); 
    state=-1;  
    window.location.href="./index.html";              
}