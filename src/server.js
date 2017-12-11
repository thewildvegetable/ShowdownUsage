"use strict";

var http = require("http");
var url = require('url');
var oakdex = require("oakdex-pokedex");
var request = require("request");
var query = require('querystring');

//built-in node module for accessing the file system
var fs = require('fs');

var port = process.env.PORT || process.env.NODE_PORT || 3000;

var index = fs.readFileSync(__dirname + "/../client/client.html");

var onRequest = function(request, response){
    //get the url and the paramaters
    var parsedUrl = url.parse(request.url);
    var params = query.parse(parsedUrl.query);
    
    var headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };
    response.writeHead(200, headers);
    //get the usage stats
    if(parsedUrl.pathname === "/format"){
        formatUsageStatsSearch(request, response, params);
    }
    //get the details on a specific pokemon
    else if(parsedUrl.pathname === "/pokemon"){
        //api call done here to avoid having multiple methods for getting pokemon and to avoid the unneeded extra hoops needed with the recursive method made
        oakdex.findPokemon(params.name, function(pokemon){
            //send over all the information gotten
            response.writeHead(200, { "Content-Type": "application/json"});
            response.write(JSON.stringify(pokemon));
            response.end();
        });
    }
    //get the details on a specific ability
    else if (parsedUrl.pathname === "/ability"){
        abilitySearch(request, response, params);
    }
    //get the details on a specific move
    else if (parsedUrl.pathname === "/move"){
        moveSearch(request, response, params);
    }
    //go to the client page
    else{
        //set 200 (okay) status for success
        //set content type for the html file to text/html
        response.writeHead(200, { "Content-Type" : "text/html"} );
        //write html file into the response
        response.write(index);
        //send response to client
        response.end();
    }
};

//search for the usage stats for the given format
function formatUsageStatsSearch(req, res, params){
    //create the request url for the stats
    var format = "gen" + params.generation + params.format.toLowerCase() + "-0.txt";
    var monthYear = "2017-10";      //the month and year for the stats lookup
    var requestUrl = "http://www.smogon.com/stats/" + monthYear + "/" + format;     //the url for the usage stas text file from smogon
    
    //request the contents of request url
    request.get(requestUrl, function(error, response, body){
        //clear the old usage stats
        var usageStats = [];    //array to store the usage stats from a search
        
        //if no error, parse the text file and send it to the pokeAPI to work with
        if (!error && response.statusCode == 200) {
            var responseArray = body.split("\n");
            //parse the text file and add it to usage stats
            //be sure to trim values in usageStats whenever using them
            for (var i = 5; i < 25; i++){   //replace the 25 with a global value that holds the top x to look up submitted by the user
                var parse = responseArray[i].split(" | ");
                usageStats.push(parse);
            }
            //get the specific data based on the usage stats
            usageStatsToClient(req, res, params, usageStats);
        }
        //if an error, send that an error occurred to the client
        else {
            var error = { message: "Usage stats could not be acquired. Check that the format exists in the given generation and the format was spelt correctly" };
            res.writeHead(400, { "Content-Type": "application/json"});
            res.write(JSON.stringify(error.message));
            res.end();
        }
    });
}

//make use of the usage stats and the oakdex to send the info to the client
function usageStatsToClient(req, res, params, usageStats){
    var pokeArray = [];     //array of json objects for each pokemon from the usage stats
    
    //loop through the usageStats array and send them to the pokeapi for the data
    var count = 0;
    pokemonSearch(req, res, params, count, usageStats, pokeArray);
}

//search for any amount of pokemon recursively and send them to the user
function pokemonSearch(req, res, params, num, usageStats, pokeArray){
    //remove any - characters thatm ight be in the name
    usageStats[num][2] = usageStats[num][2].split('-')[0];
    
    //trim the name of excess spaces and set it to lowercase for successful search
    //oakdex.findPokemon(usageStats[num][2].trim(), function(pokemon){
    oakdex.findPokemon(usageStats[num][2].trim(), function(pokemon){
        //add the pokemon to the array
        pokeArray.push(pokemon);
        
        //if at the end of the usageStats array send the data to the client
        if (num === usageStats.length-1){
            //send over all the information gotten
            res.writeHead(200, { "Content-Type": "application/json"});
            res.write(JSON.stringify(pokeArray));
            res.end();
        }
        //get the next pokemon
        else{
            num++;
            pokemonSearch(req, res, params, num, usageStats, pokeArray);
        }
    });
    
    //currently seems like showdown doesnt have usage stats from november, the month that added the new mon. will uncomment this section once those are available
    /*
    //check that the pokemon isn't one of the new ones from ultra sun and moon
    if (usageStats[i][2].trim() === "Poipole"){
        //link to the serebii page https://serebii.net/pokedex-sm/803.shtml
    }
    else if (usageStats[i][2].trim() === "Naganadel"){
        //link to the serebii page https://serebii.net/pokedex-sm/804.shtml
    }
    else if (usageStats[i][2].trim() === "Stakataka"){
        //link to the serebii page https://serebii.net/pokedex-sm/805.shtml
    }
    else if (usageStats[i][2].trim() === "Blacephalon"){
        //link to the serebii page https://serebii.net/pokedex-sm/806.shtml
    }
    else if (usageStats[i][2].trim() === "Zeraora"){
        //link to the serebii page https://serebii.net/pokedex-sm/807.shtml
    }
    else if (usageStats[i][2].trim() === "Lycanroc-Dusk"){
        //link to the serebii page https://serebii.net/pokedex-sm/745.shtml
    }
    else if (usageStats[i][2].trim() ==- "Necrozma-Dusk Mane"){
        //add other necrozma form as well and check wording of the form
        //link to the serebii page https://serebii.net/pokedex-sm/800.shtml
    }
    //add an else here to put around the normal code
    */
}

//search for an ability's data and send it to the client
function abilitySearch(req, res, params){
    //search for the submitted ability
    oakdex.findAbility(params.abilityName, function(ability) {
        //send the ability
        res.writeHead(200, { "Content-Type": "application/json"});
        res.write(JSON.stringify(ability));
        res.end();
    });
}

//search for a move's data and send it to the client
function moveSearch(req, res, params){
    //search for the submitted move
    oakdex.findMove(params.moveName, function(move) {
        //send the move
        res.writeHead(200, { "Content-Type": "application/json"});
        res.write(JSON.stringify(move));
        res.end();
    });
}

http.createServer(onRequest).listen(port);