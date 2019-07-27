const Discord = require('discord.js');

//Imaging
const Canvas = require('canvas');

const bot = new Discord.Client();
const http = require('http');
const express = require('express');
const app = express();
const fs = require('fs');
const prefix = "/";


app.get("/", (request, response) => {
  console.log(Date.now() + " Ping Received");
  response.sendStatus(200);
});
app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);


let spawn_table = JSON.parse(fs.readFileSync('configurations/spawn_table.json','utf8')); // Configuration for rng things.
let manage = JSON.parse(fs.readFileSync('configurations/management.json','utf8')); // Configuration for other things.
let glyph = JSON.parse(fs.readFileSync('configurations/shop.json','utf8'));
let data = JSON.parse(fs.readFileSync('.data/data.json','utf8')); //Data that needs to be stored.
var conditions = require("./conditions.js");

//Saving Data, Make sure the json is good before saving it.
function Validate(json){
    try {
        var save = JSON.stringify(json);
        var load = JSON.parse(save);
        return true;
    } catch (e){
        console.log("Invalid Data, will not save");
        console.log(e);
        return false;
    }
}
function SaveData(){
    //SaveData here
    if(Validate(data)){
        fs.writeFile('.data/data.json', JSON.stringify(data,null,2), (err) =>{
            if (err) console.error(err);
        })
    }
}

//Send information to channels
function CreateAnnouncement(announcement,id = 0){
    //Get the different channels
    switch(id){
        case 0:
            id = "595970390250225664";
        break;
        case 1:
            id = "595970413528481792";
        break;
        case 2:
            id = "596021883095482378";
        break;
        case 3:
            id = "596021725620207682";
        break;
    }
    const news = new Discord.RichEmbed()
    news.setTitle("Important Announcement")
    news.addField("News", announcement)
    news.setFooter("Read all about it!")
    news.setThumbnail(manage.announcement)
    var channel = bot.channels.get(id);
    channel.send(news);
}

//Raffle
function Raffle(){
    var players = [];
    var weights = [];
    for(var key in data){
        players.push(data[key].name);
        weights.push(data[key].weight);  
    }

    const raffle = new Discord.RichEmbed()
    raffle.setTitle("Raffle!")
    raffle.setThumbnail(manage.announcement)
    for(var i = 0 ; i < manage.prize.length; i++){
        //Roll the winner
        var winner = Roll(players,weights);
        raffle.addField("The winner for the " + manage.prize[i] + " is... " + winner + " !", "Congratulations!")
    }
    raffle.addField("Your prizes will arrive via mail shortly!","Enjoy!")
    var channel = bot.channels.get("574793843963199506");
    channel.send(raffle);
    
}
function Roll(loot, weights){
    var top = 0;
    var total = 0;
    for(var j = 0; j < weights.length; j++){
        total+=weights[j];
    }
    var rand = Math.floor(Math.random() * total);
    for(var i = 0; i < loot.length; i++){
        top+=weights[i]; 
        if(rand <= top){ 
            return loot[i];                         
        }                 
    }   
}

//Find Player
function FindPlayer(args){
    var person = "";
    for (var i = 1; i < args.length; i++) {
        if(data[person]){
                break;
        }
        if(args[i + 1] != args[args.length]){
                person += args[i].toString();
        }
        if (args[i + 1] != null && args[i + 1] != args[args.length - 1]) {
                person += " ";
        }
    }
    return person;
}

//Spawn Table
function Spawn(drop_table){
    var top = 0;
    var total = 0;
    //Weighted Randomness
    
    //Get the sum of all weights
    for(var key in drop_table){
        total+=drop_table[key].weight; 
    }
  
    //Generate a random number
    var rand = Math.floor(Math.random() * total);

    //For each key in the drop table, see if the random number is less than the top.
    //If so, that's your drop.
    for(var key in drop_table){
        top+=drop_table[key].weight; 
        if(rand <= top){ 
            //Return the name of that entry.
            return key;                         
        }                 
    }   
}

//Addpoints to the player
function AddPoints(player,amount){
    data[player].points += amount;
    if(data[player].points <= 0){
        data[player].points = 0;
    }
}
function AddCoins(player,amount){
    data[player].coins += amount;
    if(data[player].coins <= 0){
        data[player].coins = 0;
    }
}

//Roll the Slots
var limit = 10;
function Slots(player,amount,channel){
    const embed = new Discord.RichEmbed();
    embed.setTitle(data[player].name + " is Spinning Slots!")
    embed.setThumbnail(data[player].art);
  
    if(conditions.GreaterThan(data[player].coins,amount)){
        //Points Configuration and Set up Result
        var points = spawn_table["POINTS"];
        var result = {};

        //Roll the loot
        for(var i = 0; i < amount; i++){
            var drop = Spawn(spawn_table["CASINO"]);
            AddPoints(player,points[drop].amount);
            result[i] = {};
            result[i].amount = points[drop].amount;
            result[i].name = points[drop].name;
            result[i].image = points[drop].image;
        }
       
        //Substract the Coins
        AddCoins(player,-amount);
       
        Slots_Result(player,result,amount,channel);

    }
}
async function Slots_Result(player,result,amount,channel){
    const canvas = Canvas.createCanvas(400, 100 + (amount * 80));
    const ctx = canvas.getContext('2d');
    const background = await Canvas.loadImage(glyph.background);
    const border = await Canvas.loadImage(glyph.border);
    const backing = await Canvas.loadImage(glyph.token_holder);
    const tokens =  await Canvas.loadImage(glyph.coins);

    ctx.drawImage(background,0, 0, canvas.width, canvas.height);
   
   
    ctx.font = "600 30px Arial";
    ctx.lineWidth = 8;

    ctx.textAlign = "center";
    ctx.strokeStyle = "black";
    ctx.strokeText(data[player].name + "'s Results",200,50);

    ctx.fillStyle = "#FCDB00";
    ctx.fillText(data[player].name + "'s Results",200,50);

    var offset = 60;
    var distance = 70;
    for(var i = 0; i < amount; i++ ){
        var icon = await Canvas.loadImage(result[i].image);
        ctx.drawImage(icon , 25 , offset + (i * distance), 50, 50);

        ctx.lineWidth = 8;
        ctx.textAlign = "start";
        ctx.strokeStyle = "black";
        ctx.strokeText(result[i].amount,75,(offset + 30) + (i * distance));
    
        ctx.fillStyle = "#FCDB00";
        ctx.fillText(result[i].amount,75,(offset + 30) + (i * distance));
    }


    ctx.drawImage(border,0, 0, canvas.width, canvas.height);

    //Tokens Remaining
   
    ctx.drawImage(backing,0,canvas.height - 80,140,80)
    ctx.drawImage(tokens, 24, canvas.height - 60,40,40);

    ctx.font = "600 20px Arial";
    ctx.fillText(data[player].coins, offset + 40, canvas.height - 5);

    const attachment = new Discord.Attachment(canvas.toBuffer(), 'slots.png');

    channel.send(attachment);
}

function InstancePlayer(player){
    data[player] = {};
    data[player].weight = 0;
    data[player].points = 0;
    data[player].coins = 0;
    console.log("New data");
}

function PlayerBase(isAdmin = false){
    const players = new Discord.RichEmbed()
    players.setTitle("Current Playerbase")

    var base = [];

    for(var key in data){          
        try{
            if(data[key].name != undefined){
                if(!isAdmin){
                    base.push(data[key].name);
                } else {
                    base.push(data[key].name + " " + data[key].points + " points.");
                }
            }  
        } catch(e) {
            console.log(e);
            console.log("Not a player");
        }       
    }

    players.addField("Interesting:",base);

    return players;
}

//Viewing the player bank
async function Bank(icon,player,channel,rank){
    const canvas = Canvas.createCanvas(400, 200);
    const ctx = canvas.getContext('2d');
    const background = await Canvas.loadImage(glyph.background);
    const nameplate = await Canvas.loadImage(glyph.nameplate); 
    const coin_icon = await Canvas.loadImage(glyph.coins);
    const point_icon = await Canvas.loadImage(glyph.points);
    const player_icon = await Canvas.loadImage(icon);
    const border = await Canvas.loadImage(glyph.border); 

    ctx.drawImage(background,0, 0, canvas.width, canvas.height);
    ctx.drawImage(player_icon, 275,50,100,100);
    ctx.drawImage(nameplate, 240, 0, 175, 50);

    ctx.drawImage(coin_icon, 5,135,50,50);
    ctx.drawImage(point_icon, 5,90,50,50);
    ctx.drawImage(border,0,0,canvas.width,canvas.height);

    var coins = data[player].coins.toString();
    var points = data[player].points.toString();

    ctx.font = "600 15px Arial";

    //Name
    ctx.textAlign = "center";
    ctx.fillStyle = "#FCDB00";
    ctx.fillText(data[player].name,325,25);

    ctx.font = "600 20px Arial";

    //Points
    ctx.lineWidth = 8;
    ctx.textAlign = "start";
    ctx.strokeStyle = "black";
    ctx.strokeText("Points " + points,60,125);
    
 
    ctx.fillStyle = "#FCDB00";
    ctx.fillText("Points " + points,60,125);

    //Coins
    ctx.lineWidth = 8;
    ctx.strokeStyle = "black";
    ctx.strokeText("Tokens " + coins,60,175);
    
    ctx.textAlign = "start";
    ctx.fillStyle = "#FCDB00";
    ctx.fillText("Tokens " + coins,60,175);

    //Rank
    ctx.textAlign = "center";
    ctx.strokeStyle = "black";
    ctx.strokeText(rank,325,160);

    ctx.fillStyle = "#A60EE6";
    ctx.fillText(rank,325,160);

    const attachment = new Discord.Attachment(canvas.toBuffer(), 'player_stats.png');

    channel.send(attachment); 
}
//Create Listing on the Glyph Shop
async function CreateImage(image,name,price){
    var channel = bot.channels.get("596021725620207682");
	const canvas = Canvas.createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
    
    var newName = name.split("_");
    var combinedName = "";
    for(var i = 0; i < newName.length; i++){
        combinedName += newName[i];
        combinedName += " ";
    }
	// Since the image takes time to load, you should await it
    const background = await Canvas.loadImage(glyph.background);

    try{
        const test = await Canvas.loadImage(image);
    } catch(e){
        channel.send("Invalid Image");
        return;
    }

    //Create Image
    const item = await Canvas.loadImage(image);
    const fiend = await Canvas.loadImage(glyph.icon_fiend);
    const top_border = await Canvas.loadImage(glyph.border_top);
    const bottom_border = await Canvas.loadImage(glyph.border_bottom);

    // This uses the canvas dimensions to stretch the image onto the entire canvas
    ctx.drawImage(background, 1.5, 9, canvas.width - 2, canvas.height - 30);
    ctx.drawImage(top_border,0 , 0, canvas.width, 50);
    ctx.drawImage(bottom_border, 0, 350, canvas.width,50);

    //Draw this in the center
    ctx.drawImage(item, 67, 67, canvas.width/1.5, canvas.height/1.5);
    ctx.drawImage(fiend, 50, 58, 50,50);
    
    ctx.font = "600 30px Arial";

    ctx.lineWidth = 8;
    ctx.strokeStyle = "black";
    ctx.strokeText(combinedName,25,350);
    
    ctx.textAlign = "start";
    ctx.fillStyle = "#FCDB00";
    ctx.fillText(combinedName,25,350);
    
    ctx.font = "600 50px Arial"
    ctx.textAlign = "start";
    ctx.fillStyle = "#A60EE6";
    ctx.fillText(price,100,100);

    ctx.font = "600 30px Arial"
    ctx.fillStyle = "#FFD9C4";
    ctx.textAlign = "center";
    ctx.fillText("Ends Anytime!",200,385);

	// Use helpful Attachment class structure to process the file for you
	const attachment = new Discord.Attachment(canvas.toBuffer(), 'newItem.png');
    channel.send(attachment);
}

//Get the JSONs currently on disk
function Log(channel,json){
    const attachment = new Discord.Attachment(json);
    channel.send(attachment);
}
function CreateTXT(){
    var stream = fs.createWriteStream("log.txt");
    stream.once('open', function(fd) {
        stream.write("My first row\n");
        stream.end();
    })
}

bot.on('ready', () => {

    console.log("Raring to go!");
})
bot.on('messageUpdate', message =>{
    SaveData();
})
bot.on('message', message=> {
    if(message.channel.type === "dm"){
        return;
    } 

    let player = message.author.id;
   
    //Incase we need to clear data
    if(!data){
        data = {};
    }
    if(!data[player].art){
        data[player].art = message.author.avatarURL;
    }
    //Instancing Player Data
    if(!data[player]){
        InstancePlayer(player);
        data[player].name = message.author.username;
        data[player].art = message.author.avatarURL;
    }

    if(!data[player].coins){
        data[player].coins = 0;
    }
    if(!data.jackpot){
        data.jackpot = 0;
    }

    //Arguments
    let args = message.content.substring(prefix.length).split(" ");
    //Admin Powers
    var admin;
    if(message.channel.type === "text"){
        admin = message.guild.roles.find(role => role.name === "Pit Boss").id;
    }  
    
    switch(args[0]){
        //Check who has data
        case 'player':
            var play = PlayerBase(admin);
            message.author.send(play);
            //message.delete();
        break;
        case 'log':
            switch (args[1]) {
                case 'data':
                    Log(message.channel,'.data/data.json');
                break;
                case 'spawn_table':
                    Log(message.channel,'configurations/spawn_table.json');
                break;
                case 'management':
                    Log(message.channel,'configurations/management.json');
                break;
                case 'shop':
                    Log(message.channel,'configurations/shop.json');
                break;
            }
        break;
        //Check the loot tables!
        case 'slots':
            const check = new Discord.RichEmbed()
            check.setTitle("Prize Pool")
            var pool = [];

            pool.push("10 Points  -  ~53%")
            pool.push("30 Points  -  ~23%")
            pool.push("50 Points  -  ~11%")
            pool.push("200 Points  -  ~6%")
            pool.push("800 Points  -  ~2%")
            pool.push("-100 Points(Whammie) -  ~2%")
            pool.push("2000 Points(Jackpot) -  ~1%")

            check.addField("Good Luck:",pool)
            message.channel.send(check);
        break;
        case 'play':
            //Play various arcade games!
            if(!args[1]){
                message.author.send("You forgot to select something to play: You can pick: ")
                return;
            }

            switch(args[1]){
                case "slots":
                    if(args[2]){
                        try {
                            var amount = parseInt(args[2]);
                            
                            if(amount > limit){
                                message.reply("Maximum Number of spins at once is " + limit);
                                return;
                            }

                            Slots(player,amount,message.channel);

                        } catch (e){
                            console.log(e);
                            message.reply("Sorry, please try again!");
                        }
                    } else {
                        //Default to 1 if no spin limit is specified.
                        Slots(player,1,message.channel);
                    }
                break;
            }
        break;
       //Add Coins
        case 'addcoin':
                if(!message.member.roles.has(admin)){
                    message.author.send("You do not have the necessary roles.");
                    return;
                }
                if(!args[1]){
                    message.author.send("Please specify someone to add points to.");
                    return;
                }  
                var person = FindPlayer(args);
                var amount = parseFloat(args[args.length - 1].toString());
                for (var key in data){
                    if(data[key].name === person){
                        try {
                            AddCoins(key,amount);
                        } catch(e) {
                            console.log("Failed to give points, Syntax: /add [player] [points]");
                        }
                        message.author.send(amount + " coins Added to " + data[key].name);
                    } 
                }        
            //message.delete();
        break;
        //Add Points
        case 'add':
                if(!message.member.roles.has(admin)){
                    message.author.send("You do not have the necessary roles.");
                    return;
                }
                if(!args[1]){
                    message.author.send("Please specify someone to add points to.");
                    return;
                }  
                var person = FindPlayer(args);
                var amount = parseFloat(args[args.length - 1].toString());
                for (var key in data){
                    if(data[key].name === person){
                        try {
                            AddPoints(key,amount);
                        } catch(e) {
                            console.log("Failed to give points, Syntax: /add [player] [points]");
                        }
                        message.author.send(amount + " points Added to " + data[key].name);
                    } 
                }        
            //message.delete();
        break;

        //Check your points
        case 'points':
            var rank = "Gorgo";
            if(message.member.roles.find(r => r.name === "Devilite")){
                rank = "Devilite";
            } else if (message.member.roles.find(r => r.name === "Devilite Overtimer ")){
                rank = "Devilite Overtimer";
            } else if (message.member.roles.find(r => r.name === "Yesman")){
                rank = "Yesman";
            } else if (message.member.roles.find(r => r.name === "Pit Boss")){
                rank = "Pit Boss";
            }
            Bank(message.author.avatarURL,player,message.channel,rank);
        break;

        //Set a glyph deal
        case 'glyph':
            if(args.length < 3){
                message.reply("Invalid Command Syntax: /glyph [image link] [name] [price]")
                return;
            }
            try{
                CreateImage(args[1],args[2],args[3].toString(),message.channel);
                message.delete();
            } catch(e){
                console.log(e);
            }    
        break;
        //Announce something
        case 'announce':
            if(!message.member.roles.has(admin)){
                message.author.send("You do not have the necessary roles.").
                return;
            }
            if (!args[1]) {
                message.author.send("Please specify something to Announce.");
                return;
            }
            var announcement = "";
            for (var i = 1; i < args.length; i++) {
                announcement += args[i].toString();
                if (args[i + 1] != null) {
                    announcement += " ";
                }
            }   
            CreateAnnouncement(announcement,0);
        //message.delete();
        break;   

        //Add Weight to a player
        case 'raffle':
            if(!message.member.roles.has(admin)){
            message.author.send("You do not have the necessary roles.").
            return;
            }
            if(!args[1]){
            message.author.send("Please specify someone to raffle.");
            return;
            }  
            var person = FindPlayer(args);
            var amount = parseInt(args[args.length - 1].toString());
            for (var key in data){
                if(data[key].name === person){
                    data[key].weight += amount;
                    message.author.send("Entries Added");
                } 
            }    
            //message.delete();
        break;

        //Draw a raffle
        case 'draw':
            if(!message.member.roles.has(admin)){
                message.author.send("You do not have the necessary roles.").
                return;
            }
            Raffle();
            //message.delete();
        break;

        //Check people's weights
        case 'check':
          var available = [];
          for(var key in data){
            available.push(data[key].name + " they have " + data[key].weight + " entries.");
          }
          const embed = new Discord.RichEmbed()
          embed.setTitle("Checking")
          embed.addField("People",available);
          message.author.send(embed);
          //message.delete();
        break;

        //Info
        case 'info':
        if(!message.member.roles.has(admin)){
              message.author.send("You do not have the necessary roles.").
              return;
          }
         if (!args[1]) {
                message.author.send("Please specify something to Inform.");
                return;
            }
            var announcement = "";
            for (var i = 1; i < args.length; i++) {
                announcement += args[i].toString();
                if (args[i + 1] != null) {
                    announcement += " ";
                }
            }   
            CreateAnnouncement(announcement,1);
        //message.delete();
        break;

        //Job Channel
        case 'job':
          if(!message.member.roles.has(admin)){
              message.author.send("You do not have the necessary roles.").
              return;
          }
        if (!args[1]) {
                message.author.send("Please specify something to Inform.");
                return;
            }
            var job = "";
            for (var i = 1; i < args.length; i++) {
                job += args[i].toString();
                if (args[i + 1] != null) {
                    job += " ";
                }
            }   
            CreateAnnouncement(job,2);
        //message.delete();
        break;

        case 'rsrc':
            message.author.send("https://imgur.com/a/WISJigc");
        //message.delete();
        break;
        
    }  
    
    //All Data we need to keep track of
    SaveData();
})

bot.login(process.env.TOKEN);