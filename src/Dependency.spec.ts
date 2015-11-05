"use strict";

import {Dependency} from "./index";
import * as path from "path";
import * as resolve from "resolve";

describe("Dependeny Class", () => {	
	it("should build the location of a local module", () => {
		let resolveSpy = spyOn(path, "resolve");
		resolveSpy.and.returnValue("/absolute/path/local/lib.js");
		
		let localModule = new Dependency("../local/lib");
		
		localModule.buildLocation();
		
		expect(resolveSpy).toHaveBeenCalled();
		expect(localModule.location).toBe("/absolute/path/local");
	});
	
	it("should build the location of a node module", () => {
		let resolveSpy = spyOn(resolve, "sync");
		resolveSpy.and.returnValue("/absolute/path/node_modules/test/build/index.js");
		let nodeModule = new Dependency("test");
		nodeModule.buildLocation();
		expect(resolveSpy).toHaveBeenCalled();
		expect(nodeModule.location).toBe("/absolute/path/node_modules/test/");
	});
});