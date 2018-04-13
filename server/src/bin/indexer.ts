import * as readline from 'readline';
import * as program from "commander";
import { SymbolIndex } from "../lib/SymbolIndex"

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

process.on('message', (params) => {
  if (params.files) {
    Promise.all(params.files.map((file:string) => {
      return symbolIndex.indexFile(file)
    })).then(() => {
      process.send({ done: true })
    })
  }
})
