const express=require('express');

const app=express();
var path = require('path');
app.use(express.static(path.join(__dirname, 'public'))); //  "public" off of current is root


PORT=process.env.PORT || 5000;
app.listen(PORT,()=>{console.log(`server started at port: ${PORT}`)});

