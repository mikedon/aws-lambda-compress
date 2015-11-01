"use strict";

import * as archiver from "archiver";
import * as fs from "fs";
import * as path from "path";
import * as analyzer from 'require-analyzer';
import * as promisify from "es6-promisify";

let readDir = promisify<string[], string>(fs.readdir);
let analyze = promisify(analyzer.analyze);

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
	console.log(srcDir);
	let lambdaFunctions: LambdaFunction[] = [];
	let dependencies: {[key: string]: string[]} = {};
	let files = await readDir(srcDir); //yield
	let directories: string[] = files.filter((file)=>{
		return !fs.statSync(path.join(srcDir, file)).isFile();
	});
	for(let directory of directories){		
		let lambdaFunction = new LambdaFunction(directory);
		lambdaFunction.directory = path.join(process.cwd(), srcDir, directory);		
		console.log(`Checking dependencies for ${lambdaFunction.directory}...`);
		let dependencies = await analyze({ // await
			target: lambdaFunction.directory
		});
		// console.log(dependencies);
		// dependencies.filter(element => {
		// 	return excludes.indexOf(element) > -1;
		// });
		// console.log(dependencies);
		for(let dependency in dependencies){
			console.log(`Found dependency: ${dependency}`);
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
		console.log(lambdaFunction.name);
		//TODO move to LambdaFunction class
		let output = fs.createWriteStream(`${process.cwd()}/${outputDir}/${lambdaFunction.name}.zip`);
		let archive = archiver.create('zip', {});
		archive.pipe(output);		
		archive.directory(path.relative("", lambdaFunction.directory));
		lambdaFunction.dependencies.forEach(dependency => {	
			console.log(dependency);		
			archive.directory(path.relative("", dependency.location));
		});		
		archive.finalize();		
	}			
};

module.exports = compress;