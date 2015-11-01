declare module "archiver" {
    import * as FS from 'fs';
    
    interface nameInterface {
        name?: string;
    }
        
    interface Archiver {
        pipe(writeStream: FS.WriteStream): void;
        append(readStream: FS.ReadStream, name: nameInterface): void;
        finalize(): void;
		directory(path: string): void;
    }
    
    interface Options {
        
    }
    
    export function create(format: string, options?: Options): Archiver;    
}