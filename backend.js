const express=require('express');
const exphbs=require('express-handlebars');
const bodyParser=require('body-parser');
const nodemailer=require('nodemailer');
const path=require('path');

const app=express();
//View Engine setup
/* app.engine('handlebars',exphbs());
app.set('view engine','handlebars');
 */
app.use(express.static(path.join(__dirname, 'public'))); //  "public" off of current is root

//Body Parser middleware replacement
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


app.post('/send',async (req,res)=>{

    console.log('post request received');
    const receiver=req.body.receiver;
    //const meetID=req.body.meetID;
    const meetID=1234;
    const output=`
        <p>You have been invited to a meeting on MS Teams Clone WebApp!</p>
        <p>Your meeting ID is:<b> ${meetID}</b> </p>
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
    return;
    res.end();
    
});


PORT=process.env.PORT || 5000;
app.listen(PORT,()=>{console.log(`server started at port: ${PORT}`)});

