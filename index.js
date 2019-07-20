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
var server;
var user;

try{
    server = JSON.parse(fs.readFileSync('.data/server.json','utf8')); //Server Information
    user = JSON.parse(fs.readFileSync('.data/user.json','utf8')); // Player Stats
} catch (e){
    server = {};
    user = {};
}

let images = JSON.parse(fs.readFileSync('config/image.json','utf8'));
let rotations = JSON.parse(fs.readFileSync('config/depth.json','utf8'));

setInterval(function() {
    Update();
}, 30000);

function Update(){
    console.log("Updating");
    for(var key in rotations){
        if(rotations[key].name){
            Instance(key);
        } 
    }
    for(var key in server.depths){
        console.log(key);
        UpdateSwap(server.depths[key]);
        
    }
}
function Instance(depth){
    if(!server.depths[rotations[depth].name]){
        server.depths[rotations[depth].name] = {};
        server.depths[rotations[depth].name] = rotations[depth];
        SaveData();
        console.log("New Depth!");
    }
}
function SetDate(depth){
    var initialize = new Date();

    //Sets a specific date, we will add offsets to this date in order to produce a swap time.
    initialize.setMonth(depth.month);
    initialize.setDate(depth.day);
    initialize.setHours(depth.hour);
    initialize.setMinutes(depth.minute);
    initialize.setSeconds(depth.second);

    console.log("Init " + initialize);
    return initialize;
}
function GetDate(seconds = 0, timezone = 0){
 
    var date = new Date();
    date.setSeconds(date.getSeconds() + seconds);

    var est = date.getTime() +(date.getTimezoneOffset() * 60000)
    var newDate =  new Date(est + (3600000*timezone));

    return newDate.toLocaleString();

}
//Getting the next rotation
function OffsetDate(init, offset){
    var nextDate = new Date(init);
    nextDate.setSeconds(init.getSeconds() + offset);
    return nextDate;
}

function UpdateSwap(depth){
    //Store this data in another json
    var nextSwap;
    var marker;

    if(!server.depths[depth.name].ready) {
        console.log("I am not ready!.");
        //Get the inital swap of this depth
        var init = SetDate(depth); 

        //Find the next level and marker swaps
        nextSwap = OffsetDate(init,depth.rotation);
        marker = OffsetDate(init,depth.markerrotation);

         //Grab the milliseconds
        server.depths[depth.name].next = new Date(nextSwap);
        server.depths[depth.name].marked = new Date(marker);

        server.depths[depth.name].ready = true;
    }

   
    //While today is in the future, keep cycling the level.
    var currentDate = new Date();
    server.depths[depth.name].next = new Date(server.depths[depth.name].next);
    server.depths[depth.name].marked = new Date(server.depths[depth.name].marked);

    //Debugging
    console.log("Current Time " + new Date().toLocaleString());
    console.log("Next Swap " + server.depths[depth.name].next.toLocaleString());
    console.log("Next Marker " + server.depths[depth.name].marked.toLocaleString());

    var updated = false;
    while(currentDate > server.depths[depth.name].next){
        server.depths[depth.name].next = OffsetDate(server.depths[depth.name].next,depth.rotation);

     //   console.log("Rotation! " + server.depths[depth.name].next + "Offset by " + depth.rotation);

        //Does it switch left or right?
        var left = server.depths[depth.name].levels.length - 1;
        var right = 1;
        switch(server.depths[depth.name].direction){
            case 'left':
                server.depths[depth.name].levels = shiftArrayToRight(server.depths[depth.name].levels,left);
                console.log("Swap to the left " + server.depths[depth.name].levels);
            break;
            case 'right':
                server.depths[depth.name].levels = shiftArrayToRight(server.depths[depth.name].levels,right);
            break;
        }

        updated = true;
    }

    //While today is in the future, keep cycling the marker
    while(currentDate > server.depths[depth.name].marked){
        //Offset the date by the rotation time
        server.depths[depth.name].marked = OffsetDate(server.depths[depth.name].marked,depth.markerrotation)
     //   console.log("Cycle! " + server.depths[depth.name].marked + " offset by " + depth.markerrotation);
      
   
        //Update the index
        server.depths[depth.name].selection += 1;


        //Make sure the index doesn't go further than the array.
        if(server.depths[depth.name].selection >= server.depths[depth.name].marker.length){

            server.depths[depth.name].selection = 0;
        }

        if(server.depths[depth.name].selection < 0){
          
            server.depths[depth.name].selection = server.depths[depth.name].marker.length - 1;
        }
        updated = true;
    }

    if(updated){
        console.log(server.depths[depth.name].levels);
        var level = GetLevel(server.depths[depth.name]);
        SendInfo(server.depths[depth.name],level);
    }
    
    SaveData();
}

function shiftArrayToRight(arr, places) {
    for (var i = 0; i < places; i++) {
        arr.unshift(arr.pop());
    }
    return arr;
}
function SendInfo(depth,level){
    var channel = bot.channels.get("602110386967150600");
    var embed = new Discord.RichEmbed();
    embed.setTitle("Clockworks")
    embed.addField(depth.name + " is updating!", `${depth.name} has swapped to ${level}`)
    embed.addField("Current Marker Position: ", depth.marker[depth.selection])
    embed.addField("Next Marker Swap: ",  depth.marked)
    embed.addField("Next Level Swap:", depth.next)
    embed.addField("Level Cycle ", "From Left to Right " + `${depth.levels}`)
    embed.addField("Direction: ", depth.direction)
    embed.setThumbnail(depth.icon);

    //Try to edit previous message, if you can't do that, create a new one.
    try{
        channel.fetchMessage(depth.id).then (levelset => {
            levelset.edit(embed);
        })
    } catch(e){
        
        console.log("Instancing New Depth")
        channel.send(embed).then (sentEmbed => {
            depth.id = sentEmbed.id;
        });
    } 
}

function GetLevel(depth){
    //What position the marker is in.
    var pos = depth.marker[depth.selection];
    var level;
    console.log("Get Level " + depth.levels);
    switch(pos){
        case 'far right':
            level = depth.levels[depth.levels.length - 1];
        break;
        case 'far left':
            level = depth.levels[0];
        break;
        case 'three middle':
            level = depth.levels[1];
        break;
        case 'five middle':
            level = depth.levels[2];
        break;
        case 'four middle left':
            level = depth.levels[1];
        break;
        case 'four middle right':
            level = depth.levels[2];
        break;
        case 'five middle left':
            level = depth.levels[1];
        break;
        case 'five middle right':
            level = depth.levels[3];
        break;
    }
    return level;
}


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

//#endregion

bot.on('ready', () => {
    console.log("Ready to go!");
})
bot.on('messageUpdate', message =>{
    SaveData();
 })
bot.on('message', message=> { 
    if(message.channel.type === "dm"){
        return;
    } 
    
    let gm = message.guild.roles.find(x => x.name === "GameMaster").id;
    var powerful = message.member.roles.has(gm);

    let args = message.content.substring(prefix.length).split(" ");

    //Commands - Disabled
    if(message.content.startsWith(prefix)){
        //Arguments
        switch(args[0]){
            case 'clear':
                server = {};
                server.depths = {};
                SaveData();
                console.log("Data Cleared");
            break;
            case 'update':
                Update();
            break;
            case 'date':
                message.channel.send(GetDate());
            break;
        }
    }

    SaveData();
})

bot.login(process.env.TOKEN);
