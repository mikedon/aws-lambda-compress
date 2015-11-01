"use strict";
let parseArgs = require("minimist");
var compress = require("./index");

function run(){
	let args = parseArgs(process.argv.slice(2));
	let cmd: string = args._.shift();
	switch(cmd){
		case "compress":
			console.log("calling compress...");
			compress(args["srcDir"], args["excludes"], args["outputDir"]);			
			break;		
		case "help":
			console.log("HELP ME");
			break;
		default:
			break;		
	}
}

module.exports = run;
