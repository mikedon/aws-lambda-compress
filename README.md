#AWS Lambda Compress
A glorified zip creator for projects that contain many separately deployed lambda functions.  

What this plugin does:

1. Scans ```srcDir``` for every directory that matches the ```pattern```.  Each one of these is a "lamda function"
2. For each lambda function analyze its dependencies and determine the location.  Handles both relative and ```node_module``` dependencies
3. Create a zip file for each lambda function packaging the handler code as well as any dependencies and any ```extras```
4. Place the zip file in ```outputDir```

###Usage
```aws-lambda-compress --srcDir=src --outputDir=dist --pattern=lambda --excludes=aws-sdk --extras=extra1/ --extras=extra2.txt compress```

###Assumptions
This plugin assumes a project struture where each lambda function lives in its own directory under ```srcDir```.  There may exist common, shared 
code in other directories and there may be extra files/directories that the lambda function depends on at runtime (e.g. configurations).  It is also 
assumed that any required relative path modules must exist in the same relative location in the zip that they do in src.