import * as readline from 'readline';
import * as program from "commander";
import { SymbolIndex } from "../SymbolIndex"

if (!(process.send instanceof Function)) {
  throw new Error('Cannot run this bin in Worker');
}

program
  .option('-d, --db <db>', 'DB File name')
  .parse(process.argv);

if (!program.db) {
  program.outputHelp()
  process.exit(1)
}

const symbolIndex = new SymbolIndex(program.db)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  symbolIndex.indexFile(line)
})

interface Message {
  files: string[] | undefined;
}

process.on('message', async (params: Message) => {
  if (params.files) {
    await Promise.all(params.files.map((file:string) => {
      return symbolIndex.indexFile(file)
    }));

    if (process.send instanceof Function) {
      process.send({ done: true });
    }
  }
})
