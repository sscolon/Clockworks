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

let table = JSON.parse(fs.readFileSync('config/spawn_table.json','utf8')); //Table
let items = JSON.parse(fs.readFileSync('config/items.json','utf8')); //Items




setInterval(function() {
    Update();
    console.log("Updating");
    for(var key in server){
        UpdateSwap(server[key]);
    }
}, 30000);
//Update is ran every second.
function Update(){
    //Game();
    Clockworks();
}

function SetDate(month, day, hours, minutes, seconds){
    var date = new Date();

    //Sets a specific date, we will add offsets to this date in order to produce a swap time.
    date.setMonth(month);
    date.setDate(day);
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(seconds);

    return date;
}
function GetDate(seconds = 0, timezone = 0){
 
    var date = new Date();
    date.setSeconds(date.getSeconds() + seconds);

    var est = date.getTime() +(date.getTimezoneOffset() * 60000)
    var newDate =  new Date(est + (3600000*timezone));

    return time = newDate.toLocaleString();

}
//Getting the next rotation
function OffsetDate(init, offset){
    var newDate = new Date();
    newDate.setSeconds(newDate.getSeconds() + offset);

    return newDate;
}

function InstanceSwapper(){


}

function Clockworks(){

}

function UpdateSwap(depth){
    //Get the inital swap of this depth
    var init = SetDate(depth.month,depth.day,depth.hour,depth.minute,depth.second); 
    //Find the next level and marker swaps
    var nextSwap = OffsetDate(init,depth.rotation);
    var marker = OffsetDate(init,depth.markerrotation);

    //Store this data in another json
    server.depths[depth.name] = depth;

    //Grab the milliseconds
    server.depths[depth.name].next = nextSwap.getMilliseconds();
    server.depths[depth.name].marked = marker.getMilliseconds();

    //While today is in the future, keep cycling the level.
    while(new Date().getMilliseconds() > server.depths[depth.name].next){
        nextSwap = OffsetDate(nextSwap,depth.rotation);
       
        server.depths[depth.name].next = nextSwap.getMilliseconds();

        switch(server.depths[depth.name].direction){
            case 'left':
                server.depths[depth.name].selection -= 1;
            case 'right':
                server.depths[depth.name].selection += 1;
            break;
        }

        if(server.depths[depth.name].selection >= server.depths[depth.name].levels.length){
            server.depths[depth.name].selection = 0;
        }
        if(server.depths[depth.name].selection < 0){
            server.depths[depth.name].selection = server.depths[depth.name].levels.length;
        }

    }
    //While today is in the future, keep cycling the marker
    while(new Date().getMilliseconds() > server.depths[depth.name].marker){
        marker = OffsetDate(marker,depth.markerrotation);

        server.depths[depth.name].marked = marker.getMilliseconds();
        server.depths[depth.name].selection += 1;

        if(server.depths[depth.name].selection >= server.depths[depth.name].marker.length){
            server.depths[depth.name].selection = 0;
        }
    }

    SaveData();
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

//#region Not Used
function Game(){
    if(!server.timer){
        server.timer = 12000;
    }
    server.timer -= 1;
  //  console.log(server.timer); 
    if(server.timer <= 0){
        //DO SOMETHING
        for(var key in user){
            AddItem(key,server.item,1);
           // console.log("Items Given out.");
           //var channel = bot.channels.get(server.channel);
          // channel.send(server.item + "s have been distributed.");
        }
        server.timer = 12000;
    }

}
function AddPrizeItem(player,item,amount = 1){
    if(amount < 0 || !items[item[0]]){
        console.log("Failure: Attempted to give: " + item + " Amount attempted to give: " + amount);
        return;
    }
    var newItem = item[1] + " " + item[0]; 
    if(!user[player].inventory[newItem]){
        user[player].inventory[newItem] = {};
        var config = items[item[0]];
        for (var key in config){
			if(key === item[1]){
				user[player].inventory[newItem].name = config[key].name;
			}
		}  
        user[player].inventory[newItem].color = item[1];
        user[player].inventory[newItem].amount = amount;
   //     console.log(user[player].inventory[item[0]].amount);
    } else {
        user[player].inventory[newItem].amount += amount;
     //   console.log(user[player].inventory[item[0]].amount);
    }
}
function AddItem(player,item,amount = 1){
    if(amount < 0 || !items[item]){
        console.log("Failure: Attempted to give: " + item + " Amount attempted to give: " + amount);
        return;
    }
    if(!user[player].inventory[item]){
        user[player].inventory[item] = {};
        user[player].inventory[item].name = items[item].name;
        user[player].inventory[item].amount = amount;
        console.log(user[player].inventory[item].amount);
    } else {
        user[player].inventory[item].amount += amount;
        console.log(user[player].inventory[item].amount);
    }
}

const arrSum = arr => arr.reduce((a,b) => a + b, 0)
function CreateLoot(myTable){
    var top = 0;
    var total = 0;

    //For each item entry, get the weight
    for(var key in myTable){
        total += myTable[key].weight;
    }
    //Generate random number
    var rand = Math.floor(Math.random() * total);
    console.log("Rand" + rand);
    var item;
    var colorPool;
    var final = [];
    //Get Prize
    for(var key in myTable){
        top += myTable[key].weight; 
        console.log("Top" + top);
        if(rand <= top){ 
            //Found Item, get color pool and roll for color.
            colorPool = table[myTable[key].colors];
            item = key;   
            break;                      
        }                 
    }  
    final.push(item);

    top = 0;
    total = 0;

    for(var key in colorPool){
        total += colorPool[key].weight;
    }
    rand = Math.floor(Math.random() * total);
    for(var key in colorPool){
        top += colorPool[key].weight;
        
        if(rand <= top){ 
            //Found Color
            final.push(key);  
            return final;                     
        }  
    }
   
}

function Use(player,item){
    //Get Player Channel
    var channel = bot.channels.get(user[player].channel);
    try {
        items[item].usage;
    } catch(e) {
        console.log(item + " is not a usable");
        return;
    }
    const embed = new Discord.RichEmbed();
    embed.setTitle(user[player].name + " is using " + items[item].name)

    if(user[player].inventory[item].amount < 1){
        embed.addField("You don't have that item","Sorry");
    } else {
        switch(items[item].effect){
            case "Prize":
                var prize = CreateLoot(table[items[item].table]);
                AddPrizeItem(player,prize,1);
                embed.addField(items[item].name + items[item].usage + user[player].name, "They have obtained a " + prize[1] + " " + prize[0] + " Congratulations!");
                
                var config = items[prize[0]];
                var icon;

                for (var key in config){
                    if(key === prize[1]){
                        icon = config[key].icon;
                    }
                } 
               
                embed.setThumbnail(icon);
                user[player].inventory[item].amount -= 1;
            break;
        }
    } 

    
    channel.send(embed);
}
function ValidatePlayer(player){
    if(!user[player]){
        user[player] = {};    
    }
    if(!user[player].inventory){
        user[player].inventory = {};
    }
}
function Argument(args){
    var object = "";
    for(var i = 1; i < args.length; i++){
        object += args[i];
        if(args[i + 1]){
            object += " ";
        }
    }
    return object;
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
   //#region no
    var player = message.author.id;
    
    ValidatePlayer(player);

    if(!user[player].name){
        user[player].name = message.author.username;
    } 
    //#endregion

 //   user[player].channel = message.channel.id;

    server.depths = {};
    
    let gm = message.guild.roles.find(x => x.name === "GameMaster").id;
    var powerful = message.member.roles.has(gm);

    let args = message.content.substring(prefix.length).split(" ");

    //Commands - Disabled
    if(message.content.startsWith(prefix)){
        //Arguments
        switch(args[0]){
            case 'date':
                message.channel.send(GetDate());
            break;
            
           /* case 'grant':
                var object = Argument(args);
                if(items[object.toUpperCase()]){
                    AddItem(player,object.toUpperCase(),1);
                    message.reply("Wish Granted");
                }
                message.delete();
            break;
	        case 'setchannel':
	           if(powerful){
	               server.channel = message.channel.id;
               }
               message.delete();
	        break;
            case 'force':
	           if(powerful){
					server.timer = 10;
                }
                message.delete();
            break;
            case 'hello':
                message.reply("Hello World!");
                message.delete();
            break;
            case 'use':
                var object = Argument(args);
                Use(player,object.toUpperCase());
            break;
            case 'inventory':
                
                const embed = new Discord.RichEmbed();
                embed.setTitle(user[player].name + "'s Inventory");

                var myItems = [];
                for(var key in user[player].inventory){
                    if(user[player].inventory[key].amount > 0){
                        if(user[player].inventory[key].color){
                            myItems.push(user[player].inventory[key].name + " | Amount: " + user[player].inventory[key].amount);
                        } else {
                            myItems.push(user[player].inventory[key].name + " | Amount: " + user[player].inventory[key].amount);
                        }
                       
                    }   
                }
                if(myItems.length < 1){
                    myItems.push("Nothing");
                }
                myItems.sort();

                embed.addField("Items",myItems);
                embed.setThumbnail(message.author.avatarURL);
                message.channel.send(embed);
            break;
            case 'setitem':
                if(powerful){
                    var newItem = Argument(args);
                    server.item = newItem.toUpperCase();
                    console.log(server.item);
                } else {
                    message.reply("You are not an admin");
                }
            break;
            case 'test':
                if(powerful){
                    AddItem(player,server.item,1);
                }
            break;
            case 'rsrc':
                message.reply("https://imgur.com/a/ZDHV8lC");
            break;
            case 'clearData':
                if(powerful){
                    user[player].inventory = null;
                    user[player].inventory = {};
                    message.reply("Inventory Cleared");
                } else {
                    message.reply("You are not an admin");
                }
            break; */
        }
    }

    SaveData();
})

bot.login(process.env.TOKEN);
