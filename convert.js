import sharp from "sharp"

await sharp("build/icon.png")
  .resize(256, 256)
  .toFile("build/icon.ico")

console.log("Icon converted successfully!")