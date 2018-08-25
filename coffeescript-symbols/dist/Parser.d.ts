/// <reference types="coffeescript-types" />
import * as Nodes from 'coffeescript/lib/coffeescript/nodes';
import { SymbolInformation, SymbolKind, Diagnostic } from "vscode-languageserver";
export interface SymbolMetadata {
    name: string;
    kind: SymbolKind;
}
export declare class Parser {
    includeClosure: boolean;
    constructor({includeClosure}?: {
        includeClosure: boolean;
    });
    validateSource(src: string): Diagnostic[];
    getSymbolsFromSource(src: string): SymbolInformation[];
    getExportedSymbolsFromSource(src: string): SymbolInformation[];
    _parse(src: string): Nodes.Block;
    getSymbolsFromClass(classNode: Nodes.Class): SymbolInformation[];
    getSymbolsFromBlock(block: Nodes.Block, container?: SymbolMetadata): SymbolInformation[];
    getSymbolsFromObj(objNode: Nodes.Obj, container?: SymbolMetadata): SymbolInformation[];
    getSymbolsFromAssign(assign: Nodes.Assign, container?: SymbolMetadata): SymbolInformation[];
}
