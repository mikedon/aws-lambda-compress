// Topics to discuss
// * Motivation for plugin
// * Compiling to ES6
// * ES6 Promises
// * Async/Await

// Read https://davidwalsh.name/es6-generators as a primer on generator functions, promises, and async/await
 
// must be in strict mode to support block scoped declarations e.g. let, class
"use strict";

// we can still use import here even though nodejs doesn't support es6 module system yet
import * as archiver from "archiver";
import * as fs from "fs";
import * as path from "path";
import * as detective from "detective";
// simple module that gives us the promisify functionality with ES6 Promise
import * as promisify from "es6-promisify";
import * as mkdirp from "mkdirp";
import * as resolve from "resolve";

//promisify functions we'll need later
let readDir = promisify<string[], string>(fs.readdir);
let makeDirectory = promisify(mkdirp);
let stat = promisify<fs.Stats, string>(fs.stat);

// main entry point -  <b>async</b> tells node there are await calls inside. 
export async function compress(
	// where all the lambda functions exist. each lambda function should exist as a directory under this
	srcDir: string,
	// a regexp representing which directories to treat as lambda functions 
	pattern: string, 
	// a list of dependencies to exclude from the archives
	excludes : string[],
	// where to put all the archives 
	outputDir: string,
	// a list of extra directories and files to include in each archive 
	extras: string[]){
	//async/await lets us write async code as if it was sync with standard try/catch	
	try{	
		let lambdaFunctions: LambdaFunction[] = [];
		let dependencies: {[key: string]: string[]} = {};
		//await the readDir promise to finish
		let files = await readDir(srcDir);
		//<b>await</b> determine which things under srcDir are directories and match the pattern
		let directories: string[] = await Promise.all(files.map((file) => {			
			if(file.match(pattern) != null){
				return stat(path.join(srcDir, file)).then(fileStat => {		
					if(!fileStat.isFile()){						
						return file;
					}
				});
			}	
		}));						
		for(let directory of directories){					
			if(directory){//Because of how we are determining our list of directories above we can get "undefined" as a value in the array				
				let lambdaFunction = new LambdaFunction(directory, srcDir);												
				lambdaFunction.analyzeDependencies(excludes); //TODO unable to make async b/c archiver is doing some funny stuff with cwd								
				let outputDirectory = `${process.cwd()}/${outputDir}`;
				//<b>await</b> the creation of the outputDirectory			
				await makeDirectory(outputDirectory);
				lambdaFunction.createArchive(outputDir, srcDir, extras); 
			}											
		}	
	}catch(err){
		console.log("caught by try/catch");
		console.error(err);
	}		
};

//Represents a LambdaFunction which has a name, a directory location, and a list of Dependencies
export class LambdaFunction {
	dependencies: Dependency[] = [];	
	directory: string;
	name: string;	
	
	constructor(name: string, srcDir: string){
		this.name = name;
		//set directory to cwd + srcDir + name
		this.directory = path.join(process.cwd(), srcDir, this.name);
	}
	
	// determing dependencies for the Lambda Function
	analyzeDependencies(excludes: string[]){
		//default function args are not implemented yet
		if(!excludes){
			excludes = [];
		}		
		let allDependencies:string[] = [];
		
		
		//hold ont the original working directory so we can change it and set it back when we're done
		let originalWorkingDirectory = process.cwd();
		//change working directory to the lambda function
		process.chdir(this.directory);
		//get dependencies for lambda function, recursively following any local dependencies
		getDependencies("", `${this.directory}/index`);								
		for(let dependency of allDependencies){
			//if the dependency is not excluded then add the dependency to this Lambda Function			
			if(excludes.indexOf(dependency) < 0){					
				let lfDependency = new Dependency(dependency);
				this.dependencies.push(lfDependency);
				//find the exact directory where this dependency lives
				lfDependency.buildLocation();	
			}
		}
		//change back to the working directory we started with
		process.chdir(originalWorkingDirectory);
		
		//a local function to handle resursively checking each source file for its dependencies
		function getDependencies(cwd: string, file: string){			
			let absolutePath = path.resolve(cwd, `${file}.js`);		
			//read file and invoke the detective library which returns us the dependencies
			let dependencies = detective(fs.readFileSync(absolutePath)); //TODO async
			allDependencies = allDependencies.concat(dependencies);
			//if the dependency is a relative one then follow it and grab its dependencies			
			for(let d of dependencies){
				if(d.indexOf(".") > -1){					
					getDependencies(path.dirname(absolutePath), d);
				}
			}			
		}
	}
	
	// creates the zip file
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
		// add all the extras		
		if(extras){
			for(let extra of extras){
				if(extra.lastIndexOf(path.sep) === extra.length - 1){
					archive.directory(extra);	
				}else{					
					archive.file(extra);
				}
				
			}		
		}
		archive.on("error", err => {			
			console.log(err);
			process.exit(-1);
		});
		archive.on("end", () => {
			console.log(`created archive for ${this.name}`);	
		});
		archive.finalize();
	}
}

//Represents an individual dependency for a Lambda Function.  Keeps track of its name and where its located on the filesystem for inclusion into the archive later on
export class Dependency {
	name: string;
	location: string = "";
	version: string;
	relative: boolean;
	constructor(name: string){
		this.name = name;		
	}

	//determine where this dependency is located	
	buildLocation(){
		//if its a relative or local dependency then we just need to find the directory the file exists in.  
		if(this.name.indexOf(".") > -1){
			this.relative = true;
			//resolve the path from cwd to the name of the dependency which would some relative path
			this.location = path.dirname(path.resolve("", this.name));
		}else{										
			//using node-resolve determine the absolute path location of the dependency, should be under node_modules
			let dependencyLocationTokens = resolve.sync(this.name, {basedir: process.cwd()}).split(path.sep); //TODO async
			//take the absolute path and remove everything after the subdirectory under node_modules to include the entire dependency														
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

