"use strict";

import * as archiver from "archiver";
import * as fs from "fs";
import * as path from "path";
import * as analyzer from 'require-analyzer';
import * as promisify from "es6-promisify";
import * as mkdirp from "mkdirp";

let readDir = promisify<string[], string>(fs.readdir);
let analyze = promisify(analyzer.analyze);
let makeDirectory = promisify(mkdirp);

class Dependency {
	name: string;
	location: string = "";
	version: string;
	constructor(name: string){
		this.name = name;		
	}
}

class LambdaFunction {
	dependencies: Dependency[] = [];	
	directory: string;
	name: string;	
	
	constructor(name: string){
		this.name = name;
	}
}

// this can't be let because of cli.ts?
export async function compress(srcDir: string, excludes : string[], outputDir: string){	
	try{	
		let lambdaFunctions: LambdaFunction[] = [];
		let dependencies: {[key: string]: string[]} = {};
		let files = await readDir(srcDir); //yield
		let directories: string[] = files.filter((file)=>{
			return !fs.statSync(path.join(srcDir, file)).isFile();
		});
		for(let directory of directories){		
			let lambdaFunction = new LambdaFunction(directory);
			lambdaFunction.directory = path.join(process.cwd(), srcDir, directory);					
			let dependencies = await analyze({ // await
				target: lambdaFunction.directory
			});						
			for(let dependency in dependencies){
				if(excludes.indexOf(dependency) < 0){					
					let lfDependency = new Dependency(dependency);
					lambdaFunction.dependencies.push(lfDependency);
					let dependencyLocationTokens = require.resolve(dependency).split(path.sep);									
					let doneBuildingPath = false;
					let i = 0;
					while(!doneBuildingPath){
						lfDependency.location += `${dependencyLocationTokens[i]}${path.sep}`;
						if(dependencyLocationTokens[i - 1] === "node_modules"){
							doneBuildingPath = true;
						}else{
							i++;	
						}								
					}							
				}
			}		
			//TODO move to LambdaFunction class
			let outputDirectory = `${process.cwd()}/${outputDir}`;
			await makeDirectory(outputDirectory); //await
			let output = fs.createWriteStream(`${outputDirectory}/${lambdaFunction.name}.zip`);
			output.on("error", err => {
				console.log(err);				
				process.exit(-1);
			});						
			let archive = archiver.create('zip', {});
			archive.pipe(output);		
			archive.directory(path.relative("", lambdaFunction.directory));
			lambdaFunction.dependencies.forEach(dependency => {	
				console.log(dependency);		
				archive.directory(path.relative("", dependency.location));
			});		
			archive.finalize();		
		}	
	}catch(err){
		console.log("hit the catch");
		console.error(err);
	}		
};

module.exports = compress;