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
let items = JSON.parse(fs.readFileSync('config/items.json','utf8')); //Items
let table = JSON.parse(fs.readFileSync('config/spawn_table.json','utf8')); //Table


setInterval(function() {
    Update();
    
}, 1000);
//Update is ran every second.
function Update(){
    Game();
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
            console.log("Items Given out.");
        }
        server.timer = 12000;
    }

}
function AddItem(player,item,amount = 1){
    if(amount < 0 || !items[item]){
        console.log("Failure: Attempted to give: " + item + " Amount attempted to give: " + amount)
        return;
    }
    if(!user[player].inventory[item]){
        user[player].inventory[item] = {};
        user[player].inventory[item].name = items[item].name;
        user[player].inventory[item].amount = 0 + amount;
    } else {
        user[player].inventory[item].amount += amount;
    }
}

const arrSum = arr => arr.reduce((a,b) => a + b, 0)
function CreateLoot(table){
    var top = 0;
    var total = 0;

    total = arrSum(table.weights);

    var rand = Math.floor(Math.random() * total);

    for(var i = 0; i < table.weights.length; i++){
        top+=table.weights[i]; 
        
        if(rand <= top){ 
            return table.prizes[i];                         
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
                AddItem(player,prize,1);
                embed.addField(items[item].name + items[item].usage + user[player].name, "They have obtained a " + prize + " Congratulations!");
                embed.setThumbnail(items[prize].icon);
            break;
        }
    } 

    user[player].inventory[item].amount -= 1;
    
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
bot.on('ready', () => {
    console.log("Ready to go!");
})
bot.on('messageUpdate', message =>{
    SaveData();
 })
bot.on('message', message=> { 
    var player = message.author.id;
    
    ValidatePlayer(player);

    if(!user[player].name){
        user[player].name = message.author.username;
    }

    user[player].channel = message.channel.id;

    let gm = message.guild.roles.find(x => x.name === "GameMaster").id;
    var powerful = message.member.roles.has(gm);

    let args = message.content.substring(prefix.length).split(" ");

    //Commands
    if(message.content.startsWith(prefix)){
        //Arguments
        switch(args[0]){
            case 'hello':
                message.reply("Hello World!");
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
                        myItems.push(user[player].inventory[key].name + " Amount: " + user[player].inventory[key].amount);
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
                    server.item = newItem;
                    console.log(server.item);
                } else {
                    message.reply("You are not an admin");
                }
            break;
            case 'rsrc':
                message.reply("https://imgur.com/a/ZDHV8lC");
            break;
            case 'clearData':
                if(powerful){
                    user = {};
                } else {
                    message.reply("You are not an admin");
                }
            break;
        }
    }

    SaveData();
})

bot.login(process.env.TOKEN);
