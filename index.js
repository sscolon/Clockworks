const Discord = require('discord.js');
const bot = new Discord.Client();
const http = require('http');
const express = require('express');
const app = express();
const prefix = "/";

app.get("/", (request, response) => {
  //console.log(Date.now() + " Ping Received");
  response.sendStatus(200);
});
app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);

const fs = require('fs');

let server = JSON.parse(fs.readFileSync('.data/server.json','utf8')); //Server Information
let user = JSON.parse(fs.readFileSync('.data/user.json','utf8')); // Player Stats
let items = JSON.parse(fs.readFileSync('config/items.json','utf8'));

function Validate(json){
    try {
    //Stringify the json and then attempt to Parse it.  If the parse fails we won't save the data and should neglect all changes made.
        var check = JSON.stringify(json);
        JSON.parse(check);
        return true;
    } catch (e) {
        return false;
    }
}
function SaveData(){
    if(Validate(user)){
        fs.writeFile('.data/user.json', JSON.stringify(user,null,4), (err) =>{
            if (err) console.error(err);
        })   
    } 
    if(Validate(server)){
        fs.writeFile('.data/server.json', JSON.stringify(server,null,4), (err) =>{
            if (err) console.error(err);
        })   
    }
}

bot.on('messageUpdate', message =>{
    SaveData();
 })
bot.on('message', message=> { 
    var player = message.author.id;
    if(!user[player]){
        user[player] = {};
        user[player].name = message.author.username;
    }

    let args = message.content.substring(prefix.length).split(" ");
    if(message.content.startsWith(prefix)){
        switch(args[0]){
            case 'hello':
                message.reply("Hello World!");
            break;
        }
    }
    SaveData();
})

bot.login(process.env.TOKEN);
