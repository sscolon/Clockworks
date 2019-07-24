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

//#region Date Stuff
//Get the date that that depth was recorded
function SetDate(depth, marker = false){
    var initialize = new Date();

    //Sets a specific date, we will add offsets to this date in order to produce a swap time.
    if(marker === false){
        initialize.setMonth(depth.month);
        initialize.setDate(depth.day);
        initialize.setHours(depth.hour);
        initialize.setMinutes(depth.minute);
        initialize.setSeconds(depth.second);
    
    } else {
        initialize.setMonth(depth.month);
        initialize.setDate(depth.day);
        initialize.setHours(depth.marker_hour);
        initialize.setMinutes(depth.marker_minute);
        initialize.setSeconds(depth.marker_second);

    }
    
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
//#endregion

function WithinBounds(arr,val){
    if(val >= arr.length){
        val = 0;
    }
    if(val < 0){
        val = arr.length - 1;
    }
    var check = val;
    return check;
}
//Update the swap of a Depth
function UpdateSwap(depth){
    //Store this data in another variable to make the code look better.
    var myDepth = server.depths[depth.name];

    if(!myDepth.ready) {
        //Get the inital swap of this depth
        var init = SetDate(depth); 
        var init_marker = SetDate(depth,true);


        //Create new dates from the instances,
        myDepth.next = new Date(init);
        myDepth.marked = new Date(init_marker);

        myDepth.ready = true;

        //Swap out the level names for the actual icons
        myDepth.icons = GetIcon(myDepth.levels);
        myDepth.names = GetNames(myDepth.levels);

        //Initial Offsets
        //We don't want it to swap levels when initializing, so we offset right here.
        myDepth.next = OffsetDate(myDepth.next,depth.rotation[myDepth.rotation_index]);
        myDepth.marked = OffsetDate(myDepth.marked,depth.markerrotation[myDepth.marker_index])
    }

   
    //While today is in the future, keep cycling the level.
    var currentDate = new Date();
    myDepth.next = new Date(myDepth.next);
    myDepth.marked = new Date(myDepth.marked);

    var updated = false;
  
    var left = myDepth.levels.length - 1;
    var right = 1;

    while(currentDate >= myDepth.next){
        //Swap Left or Right
        switch(myDepth.direction){
            case 'left':
                myDepth.levels = shiftArrayToRight(myDepth.levels,left); 
            break;
            case 'right':
                myDepth.levels = shiftArrayToRight(myDepth.levels,right); 
            break;
        }

        //Offset Date
        myDepth.next = OffsetDate(myDepth.next,depth.rotation[myDepth.rotation_index]);
        //Next in the array
        myDepth.rotation_index += 1;
        //Making sure the number is within the array;
        myDepth.rotation_index = WithinBounds(depth.rotation,myDepth.rotation_index);
        
        updated = true;
    }

    //While today is in the future, keep cycling the marker
    while(currentDate >= myDepth.marked){
        //Offset the date by the rotation time
        myDepth.marked = OffsetDate(myDepth.marked,depth.markerrotation[myDepth.marker_index])
  
        //Move to the next in the array
        myDepth.selection += 1;
        myDepth.marker_index += 1;
        
             //Make sure the index doesn't go further than the array.
        myDepth.selection = WithinBounds(depth.marker,myDepth.selection);
        myDepth.marker_index = WithinBounds(depth.markerrotation,myDepth.marker_index);

        updated = true;
    }
    
    if(updated){
        //console.log(server.depths[depth.name].levels);
        var level = GetLevel(myDepth);
        SendInfo(myDepth,level);
    }

    server.depths[depth.name] = myDepth;
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


    depth.icons = GetIcon(depth.levels);
    depth.markers = GetIcon(depth.marker);
    //Combine the arrows and emojis to create a nice looking view of that depth.
    var cycle = "";
    for(var i = 0; i < depth.icons.length; i++){
        cycle += depth.icons[i];
        cycle += " ";
        if(i + 1 < depth.icons.length){
            cycle += images[depth.direction];
        }
    }

    var marker_cycle = "";
    var marker_pos = depth.markers[depth.selection];

    for(var j = 0; j < depth.markers.length; j++){

        if(marker_pos === depth.markers[j]){
            switch(marker_pos){
                case '<:numeral_1:602902321256595476>':
                    marker_pos = "<:numeral_1_selected:602911430533971997>";
                break;
                case '<:numeral_2:602902321109663745>':
                    marker_pos = "<:numeral_2_selected:602911431482015754>";
                break;
                case '<:numeral_3:602902321042817035>':
                    marker_pos = "<:numeral_3_selected:602911431519764494>";
                break;
                case '<:numeral_4:602902321277435905>':
                    marker_pos = "<:numeral_4_selected:602911431507312650>";
                break;
                case '<:numeral_5:602902321760043034>':
                    marker_pos = "<:numeral_5_selected:602911431452786689>"
                break;
            }

            marker_cycle += marker_pos;
        } else {
            marker_cycle += depth.markers[j];
        }

      
        marker_cycle += " ";
        if(j + 1 < depth.markers.length){
            marker_cycle += images["right"];
        }
    }

    console.log(level);
    var current = level_names[level];
    var icon = images[level];

    var embed = new Discord.RichEmbed();
    embed.setTitle("Clockworks")
    embed.addField(depth.name + "'s Status", `${depth.name} recently swapped to ${current}  ${icon}`)
    Log(`${depth.name} is now on ${current}  ${icon}`);
    
    embed.addBlankField();

    embed.addField("Marker Cycle: ", `${marker_cycle}`)
    embed.addField("Level Cycle ", `${cycle}`)
    
    embed.addField("Next Level in Queue: ", `${level_names[upcoming]}  ${images[upcoming]}`)
    embed.addBlankField();
    embed.addField("Next Marker Swap: ",  depth.marked)
    embed.addField("Next Level Swap:", depth.next)
    

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
    //console.log(depth.name + "  " + depth.marked);
    //console.log(depth.name + "  " + depth.next);
    //console.log(depth.name + " subtraction " + (depth.marked - depth.next));

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
        case 'two left':
            level = future[0];
        break;
        case 'two right':
            level = future[1];
        break;
        case 'three left':
            level = future[0];
        break;
        case 'three right':
            level = future[future.length - 1];
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
        case 'four right':
            level =  future[future.length - 1];
        break;
        case 'four left':
            level = future[0];
        break;
        case 'five right':
            level =  future[future.length - 1];
        break;
        case 'five left':
            level = future[0];
        break;
        case 'five middle':
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
    console.log(pos);
    var level;
    //console.log("Get Level " + depth.levels);
    switch(pos){
        case 'two left':
            level = depth.levels[0];
        break;
        case 'two right':
            level = depth.levels[1];
        break;
        case 'three left':
            level = depth.levels[0];
        break;
        case 'three right':
            level = depth.levels[depth.levels.length - 1];
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
        case 'four right':
            level =  depth.levels[depth.levels.length - 1];
        break;
        case 'four left':
            level = depth.levels[0];
        break;
        case 'five right':
            level =  depth.levels[depth.levels.length - 1];
        break;
        case 'five left':
            level = depth.levels[0];
        break;
        case 'five middle':
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
//Logging Updates
function Log(msg){
    if(server.log){
        var mychannel = bot.channels.get("603378159060123712");
        mychannel.send(msg);
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
                    server.log = false;
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
                case 'enable':
                    switch (args[1]){
                        case 'log':
                            server.log = !server.log;
                            message.reply("Gate Log was set to " + server.log);
                        break;
                    }           
                break;
            }
        }
        //Player Commands
        switch(args[0]){
            case 'role':
               switch(args[1]){
                    
               }
            break; 
        }
        
    }

    SaveData();
})

bot.login(process.env.TOKEN);
