const functions = require('firebase-functions');

const express=require('express');
const nodemailer=require('nodemailer');
const path=require('path');

const app=express();
app.use(express.static(path.join('../public')));
console.log('inside index.js');

//Body Parser middleware replacement
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


app.post('/sendmail',async (req,res)=>{

    console.log('post request received');
    const receiver=req.body.receiver;
    //res.end();    
    const meetID=req.body.roomID;
    const output=`
        <h2>You have been invited to a meeting on MS Teams Clone WebApp!</h2>
        <p>Your meeting ID is:<b> ${meetID}</b> </p>
        <p> I hope you enjoy my app. See you there!</p>
        <br>
        <p>Regards,</p>
        <p>Vasundhara Pant</p>
        `;
    
    let transporter = nodemailer.createTransport({
        service:'gmail',
        auth: {
            user: 'msteams.clone.webapp@gmail.com', 
            pass: 'abc181001', 
        },
        tls:{
            rejectUnauthorized:false
        }
    });
    

    let mailOptions ={
        from: '"MSTeams-Clone" <msteams.clone.webapp@gmail.com>', // sender address
        to: receiver, // list of receivers
        subject: "Invitation to meeting", // Subject line
        text: "", // plain text body
        html: output, // html body
    }
    
    // send mail with defined transport object
    let info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));    
    res.end();
    return;
});

/* 
PORT=process.env.PORT || 5000;
app.listen(PORT,()=>{console.log(`server started at port: ${PORT}`)}); */

exports.app = functions.https.onRequest(app);
