declare module "require-analyzer" {
	export function analyze(config: any, callback: (err: string, result: {[key: string]: string}) => void): void;
}