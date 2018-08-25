"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline = require("readline");
const program = require("commander");
const SymbolIndex_1 = require("../SymbolIndex");
if (!(process.send instanceof Function)) {
    throw new Error('Cannot run this bin in Worker');
}
program
    .option('-d, --db <db>', 'DB File name')
    .parse(process.argv);
if (!program.db) {
    program.outputHelp();
    process.exit(1);
}
const symbolIndex = new SymbolIndex_1.SymbolIndex(program.db);
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});
rl.on('line', (line) => {
    symbolIndex.indexFile(line);
});
process.on('message', (params) => __awaiter(this, void 0, void 0, function* () {
    if (params.files) {
        yield Promise.all(params.files.map((file) => {
            return symbolIndex.indexFile(file);
        }));
        if (process.send instanceof Function) {
            process.send({ done: true });
        }
    }
}));
//# sourceMappingURL=coffeescript-symbol-indexer.js.map