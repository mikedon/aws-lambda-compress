"use strict";
import * as parseArgs from "minimist";
import {compress} from "./index";

export function run(){
	let args = parseArgs(process.argv.slice(2));
	let cmd: string = args._.shift();
	switch(cmd){
		case "compress":						
			compress(args["srcDir"], args["pattern"], args["excludes"], args["outputDir"], args["extras"]);			
			break;		
		case "help":
			console.log("HELP ME");
			break;
		default:
			break;		
	}
}
