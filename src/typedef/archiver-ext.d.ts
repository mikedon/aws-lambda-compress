declare module "archiver" {
    import * as FS from 'fs';
    
    interface nameInterface {
        name?: string;
    }
        
    interface Archiver {
        pipe(writeStream: FS.WriteStream): void;
        append(readStream: FS.ReadStream, name: nameInterface): void;
        finalize(): void;
		directory(path: string, destpath?: string, data?: any): void;
        file(filePath: string, data?: any);
        on(event:string, Function);
    }
    
    interface Options {
        
    }
    
    export function create(format: string, options?: Options): Archiver;    
}