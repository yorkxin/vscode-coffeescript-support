import * as Datastore from "nedb";
import { Parser } from "coffeescript-symbols";
import { SymbolInformation } from "vscode-languageserver";
import Uri from 'vscode-uri';
export interface SymbolInformationEntry {
    searchableName: string;
    locationDescriptor: string;
    symbolInformation: SymbolInformation;
}
export declare class SymbolIndex {
    db: Datastore;
    dbFilename: string;
    parser: Parser;
    constructor(dbFilename: string);
    indexFile(uriOrPath: Uri | string): Promise<void>;
    removeFile(uriOrPath: Uri | string): Promise<void>;
    find(query: string): Promise<SymbolInformation[]>;
    destroy(): Promise<{}>;
    _normalizeAsURI(uriOrPath: Uri | string | any): {
        fsPathWithoutScheme: string;
        locationURI: string;
    };
    _saveSymbols(symbols: SymbolInformation[], fsPath: string): Promise<void>;
    _removeSymbolsOfFile(fsPath: string): Promise<void>;
    _serializeSymbol(symbolInformation: SymbolInformation): SymbolInformationEntry;
}
