declare module "require-analyzer" {
	export function analyze(config: any, callback: (err: string, result: string[]) => void): void;
}