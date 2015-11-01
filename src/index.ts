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
	
	buildLocation(){
		let dependencyLocationTokens = require.resolve(this.name).split(path.sep);									
		let doneBuildingPath = false;
		let i = 0;
		while(!doneBuildingPath){
			this.location += `${dependencyLocationTokens[i]}${path.sep}`;
			if(dependencyLocationTokens[i - 1] === "node_modules"){
				doneBuildingPath = true;
			}else{
				i++;	
			}								
		}
	}
}

class LambdaFunction {
	dependencies: Dependency[] = [];	
	directory: string;
	name: string;	
	
	constructor(name: string, srcDir: string){
		this.name = name;
		this.directory = path.join(process.cwd(), srcDir, this.name);
	}
	
	async analyzeDependencies(excludes: string[]){
		if(!excludes){
			excludes = [];
		}
		let dependencies = await analyze({ // await
			target: this.directory
		});
								
		for(let dependency in dependencies){			
			if(excludes.indexOf(dependency) < 0){					
				let lfDependency = new Dependency(dependency);
				this.dependencies.push(lfDependency);
				lfDependency.buildLocation();	
			}
		}
	}
	
	createArchive(outputDirectory: string){
		let stream = fs.createWriteStream(`${outputDirectory}/${this.name}.zip`);
		stream.on("error", err => {
			console.log(err);				
			process.exit(-1);
		});
		let archive = archiver.create('zip', {});
		archive.pipe(stream);		
		archive.directory(path.relative("", this.directory));
		this.dependencies.forEach(dependency => {						
			archive.directory(path.relative("", dependency.location));
		});		
		archive.finalize();
	}
}

export async function compress(srcDir: string, excludes : string[], outputDir: string){	
	try{	
		let lambdaFunctions: LambdaFunction[] = [];
		let dependencies: {[key: string]: string[]} = {};
		let files = await readDir(srcDir); //await
		let directories: string[] = files.filter((file)=>{
			return !fs.statSync(path.join(srcDir, file)).isFile();
		});
		for(let directory of directories){		
			let lambdaFunction = new LambdaFunction(directory, srcDir);					
			await lambdaFunction.analyzeDependencies(excludes);								
			let outputDirectory = `${process.cwd()}/${outputDir}`;
			await makeDirectory(outputDirectory); //await
			lambdaFunction.createArchive(outputDir);											
		}	
	}catch(err){
		console.error(err);
	}		
};

module.exports = compress;