import * as program from "commander";
import { SymbolIndex } from "../lib/SymbolIndex"

program
  .option('-d, --db <db>', 'DB File name')
  .option('-f, --file <file>', 'CoffeeScript source file name ')
  .parse(process.argv);

if (!program.db || !program.file) {
  program.outputHelp()
  process.exit(1)
}

const symbolIndex = new SymbolIndex(program.db)

symbolIndex.indexFile(program.file).then(() => {
  process.exit(0)
})
