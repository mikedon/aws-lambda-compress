declare module "resolve" {
	module resolve {
		function sync(id:string, opts: any):string;
	}
	
	function resolve(id:string, opts: any, callback: (err: any, result: string) => void):void;
	export = resolve;
}