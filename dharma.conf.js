module.exports = {
	specDir: "build/",
	specFiles: ["**/*.spec.js"],
	srcFiles: ["build/**/!(*.spec|*.helper).js"],
	framework: "JasmineFramework",
	preprocessors: ["IstanbulPreprocessor"],
	reporters: ["IstanbulReporter", "IstanbulThresholdReporter"],
	jasmineFramework: {
		helpers: ['test/helpers/lambda_context.helper.js'],				
		reporters: [
			{
				name: "JUnitXmlReporter",
				config: {
					savePath: "build/testReports",
					filePrefix: "",
					consolidateAll: true
				}	
			},{
				name: "TapReporter",
				config: {
					
				}
			}
		]	
	},
	istanbulPreprocessor : {
		verbose: false	
	},
	istanbulThresholdReporter: {
		statements: 80,
		branches: 60,
		lines: 80,
		functions: 80
	},
	istanbulReporter: {
		outputDir: "build/testReports",
		reporters: ["html", "json"]
	}
}