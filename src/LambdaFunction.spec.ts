"use strict";

import {LambdaFunction} from "./index";
import * as detective from "detective";

describe("Lambda Function Class", () => {
	it("should get all dependencies", () => {
		let lambdaFunction = new LambdaFunction("test", "src");
		lambdaFunction.analyzeDependencies(["exclude1"]);
		
		expect(lambdaFunction.dependencies.length).toBe(1);
	});
	it("should create an archive with all dependencies", () => {
		
	});
	it("should create an archive with dependencies and extras", () => {
		
	});
});