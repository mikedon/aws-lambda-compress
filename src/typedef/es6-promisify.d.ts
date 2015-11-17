declare module "es6-promisify" {
	function promisify<T>(func: (callback: (err:any, result: T) => void) => void, receiver?: any): () => Promise<T>;
	function promisify<T, A1>(func: (arg1: A1, callback: (err: any, result: T) => void) => void, receiver?: any): (arg1: A1) => Promise<T>;
	function promisify<T, A1, A2>(func: (arg1: A1, arg2: A2, callback: (err: any, result: T) => void) => void, receiver?: any): (arg1: A1) => Promise<T>;
	function promisify(nodeFunction: Function): Function;
	
	module promisify {
		
	}
	
	export = promisify;
}