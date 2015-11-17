"use strict";

import * as archiver from "archiver";
import * as fs from "fs";
import * as path from "path";
import * as detective from "detective";
import * as promisify from "es6-promisify";
import * as mkdirp from "mkdirp";
import * as resolve from "resolve";

let readDir = promisify<string[], string>(fs.readdir);
let makeDirectory = promisify(mkdirp);
let stat = promisify<fs.Stats, string>(fs.stat);

export class Dependency {
	name: string;
	location: string = "";
	version: string;
	relative: boolean;
	constructor(name: string){
		this.name = name;		
	}
	
	buildLocation(){
		if(this.name.indexOf(".") > -1){
			this.relative = true;
			this.location = path.dirname(path.resolve("", this.name));
		}else{										
			let dependencyLocationTokens = resolve.sync(this.name, {basedir: process.cwd()}).split(path.sep);														
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
}

export class LambdaFunction {
	dependencies: Dependency[] = [];	
	directory: string;
	name: string;	
	
	constructor(name: string, srcDir: string){
		this.name = name;
		this.directory = path.join(process.cwd(), srcDir, this.name);
	}
	
	analyzeDependencies(excludes: string[]){
		if(!excludes){
			excludes = [];
		}		
		let allDependencies:string[] = [];
		function getDependencies(cwd: string, file: string){			
			let absolutePath = path.resolve(cwd, `${file}.js`);		
			let dependencies = detective(fs.readFileSync(absolutePath));
			allDependencies = allDependencies.concat(dependencies);			
			for(let d of dependencies){
				if(d.indexOf(".") > -1){					
					getDependencies(path.dirname(absolutePath), d);
				}
			}			
		}
		let originalWorkingDirectory = process.cwd();
		process.chdir(this.directory);
		getDependencies("", `${this.directory}/index`);								
		for(let dependency of allDependencies){			
			if(excludes.indexOf(dependency) < 0){					
				let lfDependency = new Dependency(dependency);
				this.dependencies.push(lfDependency);
				lfDependency.buildLocation();	
			}
		}
		process.chdir(originalWorkingDirectory);
	}
	
	createArchive(outputDirectory: string, srcDir: string, extras: string[]){
		let stream = fs.createWriteStream(`${outputDirectory}/${this.name}.zip`);
		stream.on("error", err => {
			console.log(err);				
			process.exit(-1);
		});
		let archive = archiver.create('zip', {});
		archive.pipe(stream);
		//place lambda function inside a directory in the zip - this way the source and final locations are the same		
		archive.directory(path.relative("", this.directory), `/${this.name}`);
		for(let dependency of this.dependencies){							
			if(!dependency.relative){				
				archive.directory(path.relative("", dependency.location));	
			}else{
				//if its a relative module then we want the location in the zip to be relative to source dir
				archive.directory(path.relative("", dependency.location), path.relative(srcDir, dependency.location));
			}									
		}
		for(let extra of extras){			
			if(extra.lastIndexOf(path.sep) === extra.length - 1){
				archive.directory(extra);	
			}else{
				archive.file(extra);
			}
			
		}
		archive.finalize();
	}
}

export async function compress(srcDir: string, pattern: string, excludes : string[], outputDir: string, extras: string[]){	
	try{	
		let lambdaFunctions: LambdaFunction[] = [];
		let dependencies: {[key: string]: string[]} = {};
		let files = await readDir(srcDir); //await
		let directories: string[] = await Promise.all(files.map((file) => { //await			
			if(file.match(pattern) != null){
				return stat(path.join(srcDir, file)).then(fileStat => {		
					if(!fileStat.isFile()){						
						return file;
					}
				});
			}	
		}));				
		for(let directory of directories){		
			if(directory){ //we will get undefined as a directory if it didn't meet the criteria above				
				let lambdaFunction = new LambdaFunction(directory, srcDir);					
				lambdaFunction.analyzeDependencies(excludes);								
				let outputDirectory = `${process.cwd()}/${outputDir}`;			
				await makeDirectory(outputDirectory); //await
				lambdaFunction.createArchive(outputDir, srcDir, extras);
			}											
		}	
	}catch(err){
		console.error(err);
	}		
};
