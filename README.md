# MS Teams Clone 
This is a Video calling app which uses WebRTC for peer to peer connection and firestore for signalling. It employs firestore database, firebase authentication, storage, as well as  hosting. Node.js using express framework is used for backend. Nodemailer is used for sending mails.

### Link to App: https://fir-rtc-ff458.web.app/


## Steps to Use the App:
1. Open the website given above. If you are not a user yet, Sign up by filling the necessary fields, else log in to your existing account by entering the email & password.
2. Once the index page opens up, you may either create a video call by clicking the 'Create VideoChat Room' Button, or a Chat room by clicking on the 'Create ChatRoom' button  from the dropdown.
3. After the room is created, you can mail the room ID to any of your friends using the 'Send Email Invite' Button.
4. The other person can join the meet by clicking on the Join VideoRoom/ Join ChatRoom Button & entering the room ID received through mail.
5. A chat room can only be joined by clicking on 'Join ChatRoom' & the same applies for the video room. An error will be shown if a chat room ID is input after 'Join VideoRoom' & vice versa.
6. You will be able to send messages in the chat after the callee has joined the room.
7. If you are creating a Chat Room, you have the option to later convert it into a video room by clicking on the 'Convert to Video' Button and your chat progress will be saved. You can mail the new room ID to the person you were chatting earlier with, & the person can join the room by clicking on 'Join Video' button from his end. Your current chat progress will be saved after you have successfully converted to a video call.
8. If you are creating a Video Room, you will be able to mute/unmute your media using the toggle icons in the screen. You will also be given the option to share your screen once you are in a video call. You can also chat with the other person during a video call by clicking on the Chat option from the Navbar.
9. If you want to end the video call, you can click on the 'end call' icon present at the bottom of the screen. The video call will then end, but you will still be able to chat with the other person from the chat box.
10. If you want to leave the chat, you may do so by clicking on the 'Leave Chat' button, after which you will be given the option to Download your chat. You may download it or not as per your requirement.
11. After using the app, you can click on the LogOut button from the navbar which will redirect you to the Login Page.

## Resolving Issues:
1. If you are having issues in having a successful videocall, try using the app in Incognito mode of your browser. This may resolve any security issues which might be occuring due to a secure email account opened in the browser.
2. If you are still having problems during video call, (for eg- the call is automatically disconnecting just after the video call is established), it might be because of the firewall in your Wifi connection.
3. If you have an issue in Converting the chat into video call, make sure the callee is inputting the new room ID right after clicking the 'Join Video' button(without closing the modal & opening it again). This will resolve any issue in video which may be arising during conversion.
