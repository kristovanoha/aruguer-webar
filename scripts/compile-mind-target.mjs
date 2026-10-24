import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadImage } from "canvas";
import { OfflineCompiler } from "mind-ar/src/image-target/offline-compiler.js";

const [imagePath = "public/targets/house-target.png", outputPath = "public/targets/house-target.mind"] = process.argv.slice(2);
const image = await loadImage(readFileSync(imagePath));
const compiler = new OfflineCompiler();
const data = await compiler.compileImageTargets([image], (progress) => {
  process.stdout.write(`\rCompiling target: ${Math.round(progress)}%`);
});

mkdirSync("public/targets", { recursive: true });
writeFileSync(outputPath, Buffer.from(compiler.exportData()));
process.stdout.write(`\nCompiled ${data.length} target image to ${outputPath}\n`);
