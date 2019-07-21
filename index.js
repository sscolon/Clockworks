const Discord = require('discord.js');
const bot = new Discord.Client();
const http = require('http');
const express = require('express');
const app = express();
const prefix = "/";

app.get("/", (request, response) => {
  ////console.log(Date.now() + " Ping Received");
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
let level_names = JSON.parse(fs.readFileSync('config/names.json','utf8'));
let rotations = JSON.parse(fs.readFileSync('config/depth.json','utf8'));

setInterval(function() {
    Update();
}, 5000);

//Check for updates, this is called every 5 seconds.
function Update(){
    ////console.log("Updating");
    for(var key in rotations){
        if(rotations[key].name){
            Instance(key);
        } 
    }
    for(var key in server.depths){
        ////console.log(key);
        UpdateSwap(server.depths[key]);
        
    }
}

//Instance a new depth for cycling.
function Instance(depth){
    if(!server.depths[rotations[depth].name]){
        server.depths[rotations[depth].name] = {};
        server.depths[rotations[depth].name] = rotations[depth];
        SaveData();
        //console.log("New Depth!");
    }
}

//Get the date that that depth was recorded
function SetDate(depth){
    var initialize = new Date();

    //Sets a specific date, we will add offsets to this date in order to produce a swap time.
    initialize.setMonth(depth.month);
    initialize.setDate(depth.day);
    initialize.setHours(depth.hour);
    initialize.setMinutes(depth.minute);
    initialize.setSeconds(depth.second);

   // //console.log("Init " + initialize);
    return initialize;
}

//Get today's date, this was for testing purposes
function GetDate(seconds = 0, timezone = 0){
 
    var date = new Date();
    date.setSeconds(date.getSeconds() + seconds);

    var est = date.getTime() +(date.getTimezoneOffset() * 60000)
    var newDate =  new Date(est + (3600000*timezone));

    return newDate.toLocaleString();

}
//Offset Date
function OffsetDate(init, offset){
    var nextDate = new Date(init);
    nextDate.setSeconds(init.getSeconds() + offset);
    return nextDate;
}


//Update the swap of a Depth
function UpdateSwap(depth){
    //Store this data in another json
    var instance = false;
    if(!server.depths[depth.name].ready) {
        //console.log("I am not ready!.");
        //Get the inital swap of this depth
        var init = SetDate(depth); 
        instance = true;
        //Grab the milliseconds
        server.depths[depth.name].next = new Date(init);
        server.depths[depth.name].marked = new Date(init);

        server.depths[depth.name].ready = true;

        //Swap out the level names for the actual icons
        server.depths[depth.name].icons = GetIcon(server.depths[depth.name].levels);
        server.depths[depth.name].names = GetNames(server.depths[depth.name].levels);
    }

   
    //While today is in the future, keep cycling the level.
    var currentDate = new Date();
    server.depths[depth.name].next = new Date(server.depths[depth.name].next);
    server.depths[depth.name].marked = new Date(server.depths[depth.name].marked);

    //Debugging
   // //console.log("Current Time " + new Date().toLocaleString());
  //  //console.log("Next Swap " + server.depths[depth.name].next.toLocaleString());
   // //console.log("Next Marker " + server.depths[depth.name].marked.toLocaleString());

    var updated = false;
  
    var left = server.depths[depth.name].levels.length - 1;
    var right = 1;

    while(currentDate >= server.depths[depth.name].next){

        //Swap Left or Right
        switch(server.depths[depth.name].direction){
            case 'left':
                server.depths[depth.name].levels = shiftArrayToRight(server.depths[depth.name].levels,left); 
                ////console.log(server.depths[depth.name].levels);
                //console.log("Swap to the left " + server.depths[depth.name].levels);
            break;
            case 'right':
                server.depths[depth.name].levels = shiftArrayToRight(server.depths[depth.name].levels,right); 
            break;
        }

        server.depths[depth.name].next = OffsetDate(server.depths[depth.name].next,depth.rotation);
       
        updated = true;
    }


  /*  if(instance){
        //Something is causing it to shift 1 too many times, so we have to shift back.
        //console.log("Shift Back");
        switch(server.depths[depth.name].direction){
            case 'left':
                server.depths[depth.name].levels = shiftArrayToRight(server.depths[depth.name].levels,right); 
                ////console.log(server.depths[depth.name].levels);
                //console.log("Swap to the left " + server.depths[depth.name].levels);
            break;
            case 'right':
                server.depths[depth.name].levels = shiftArrayToRight(server.depths[depth.name].levels,left); 
            break;
        }
    } */
   

    //While today is in the future, keep cycling the marker
    while(currentDate >= server.depths[depth.name].marked){
        //Update the index
        server.depths[depth.name].selection += 1;


        //Make sure the index doesn't go further than the array.
        if(server.depths[depth.name].selection >= server.depths[depth.name].marker.length){

            server.depths[depth.name].selection = 0;
        }

        if(server.depths[depth.name].selection < 0){
          
            server.depths[depth.name].selection = server.depths[depth.name].marker.length - 1;
        }

        //Offset the date by the rotation time
        server.depths[depth.name].marked = OffsetDate(server.depths[depth.name].marked,depth.markerrotation)
        updated = true;
    }
    
    if(updated){
        //console.log(server.depths[depth.name].levels);
        var level = GetLevel(server.depths[depth.name]);
        SendInfo(server.depths[depth.name],level);
    }
    
    SaveData();
}


//Shifting array for Marker and Level Cycles
//Moving the length of the array minus 1 is the same as 1 to the left.
function shiftArrayToRight(arr, places) {
    for (var i = 0; i < places; i++) {
        arr.unshift(arr.pop());
    }
    return arr;
}


//Send out the info to the channel
function SendInfo(depth,level){
   
    var upcoming = GetFuture(depth);
    var channel = bot.channels.get("602110386967150600");


    //Combine the arrows and emojis to create a nice looking view of that depth.
    var cycle = "";
    for(var i = 0; i < depth.icons.length; i++){
        cycle += depth.icons[i];
        cycle += " ";
        if(i + 1 < depth.icons.length){
            cycle += images[depth.direction];
        }
    }

    console.log(level);
    var current = level_names[level];
    var icon = images[level];

    var embed = new Discord.RichEmbed();
    embed.setTitle("Clockworks")
    embed.addField(depth.name + "'s Status", `${depth.name} recently swapped to ${current}  ${icon}`)
    embed.addBlankField();
    embed.addField("Level Cycle ", `${cycle}`)
    embed.addField("Next Level in Queue: ", `${level_names[upcoming]}  ${images[upcoming]}`)
    embed.addBlankField();
    embed.addField("Next Marker Swap: ",  depth.marked)
    embed.addField("Next Level Swap:", depth.next)
    embed.addField("Marker Position and Pattern: " + depth.marker[depth.selection],depth.marker)

    embed.setThumbnail(depth.icon);

    //Try to edit previous message, if you can't do that, create a new one.
    try{
        channel.fetchMessage(depth.id).then (levelset => {
            levelset.edit(embed);
        })
    } catch(e){
        
        //console.log("Instancing New Depth")
        channel.send(embed).then (sentEmbed => {
            depth.id = sentEmbed.id;
        });
    } 
}

//Get the icon for this.
function GetIcon(arr){
    var icons = Array.from(arr);
    for(var i = 0; i < arr.length; i++){
        for (var key in images){
            if(icons[i] === key){
                icons[i] = images[key];
            }
        }
    }
    return icons;
}

//Get Level Names
function GetNames(arr){
    var names = Array.from(arr);
    for(var i = 0; i < arr.length; i++){
        for (var key in level_names){
            if(names[i] === key){
                names[i] = level_names[key];
            }
        }
    }
    return names;
}


//Getting the future level
function GetFuture(depth){
    var temp = depth.selection;
    var first = false;
    var same = false;
    //console.log("Selection " + temp);

    //Checking if the marker will rotate first.
    if(depth.marked < depth.next){
        temp = depth.selection + 1;
        if(temp >= depth.marker.length){
            temp = 0;
        }
        console.log("marker rotating first");
        first = true;
    }

    //Debugging
    console.log(depth.name + "  " + depth.marked);
    console.log(depth.name + "  " + depth.next);
    console.log(depth.name + " subtraction " + (depth.marked - depth.next));

    var diff = depth.marked - depth.next;

    //If they're at the same time, we want both to happen.
    if(diff === 0){
        temp = depth.selection + 1;
        if(temp >= depth.marker.length){
            temp = 0;
        }
        console.log("both will happen!")
        same = true;
    }
    
    //New Marker Position
    var pos = depth.marker[temp];
    //console.log(temp);
    //console.log("Future Position " + pos);
    var future = Array.from(depth.levels);
  
    //Depth rotating first
    if(first === false || same === true){
        
        switch(depth.direction){
            case 'left':
                console.log(depth.name + " will shift to the left");
                future = shiftArrayToRight(future,depth.levels.length - 1);
            break;
            case 'right':
                console.log(depth.name + " will shift to the right");
                future = shiftArrayToRight(future,1);
            break;
        }
    }

    //Debugging Purposes
    //console.log("Future Cycle : " + future);
    var level;

    switch(pos){
        case 'far right':
            level = future[future.length - 1];
            //console.log(future[future.length - 1]);
        break;
        case 'far left':
            level = future[0];
        break;
        case 'three middle':
            level = future[1];
        break;
        case 'five middle':
            level = future[2];
        break;
        case 'four middle left':
            level = future[1];
        break;
        case 'four middle right':
            level = future[2];
        break;
        case 'five middle left':
            level = future[1];
        break;
        case 'five middle right':
            level = future[3];
        break;
    }
    return level;
}

//Getting the current level
function GetLevel(depth){
    //What position the marker is in.
    var pos = depth.marker[depth.selection];
    var level;
    //console.log("Get Level " + depth.levels);
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


//Validating and Saving Data
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

bot.on('ready', () => {
    console.log("Ready to go!");
})

//This is ran everytime a message is edited
bot.on('messageUpdate', message =>{
    SaveData();
 })

 //This is ran every message
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
        if(powerful){
            switch(args[0]){
                case 'clear':
                    var mychannel = bot.channels.get("602110386967150600");
                    for(var key in server.depths){
                        try {
                            mychannel.fetchMessage(server.depths[key].id).then (sentEmbed => {
                                sentEmbed.delete();
                            });
                        } catch(e){
                            console.log("message doesn't exist");
                        }
                        
                    }
                    server = {};
                    server.depths = {};
                    SaveData();
                    Update();
                    //console.log("Data Cleared");
                break;
                case 'update':
                    Update();
                break;
                case 'date':
                    message.channel.send(GetDate());
                break;
            }
        }
        
    }

    SaveData();
})

bot.login(process.env.TOKEN);
