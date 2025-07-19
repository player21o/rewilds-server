import * as fs from "fs";
import * as path from "path";
import { argv } from "process";
import { createCanvas, loadImage, CanvasRenderingContext2D } from "canvas";

// --- Interfaces ---
interface FontDef {
  imagePath: string;
  fontName: string;
  baselineChars: string;
  defs: [number, number, number, number, string][];
}

interface CharMetrics {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
  glyphTop: number; // Temporary property
  glyphBottom: number; // Temporary property
}

// --- NEW HELPER: Analyze a character's pixel data for top AND bottom ---
function analyzeCharMetrics(
  ctx: CanvasRenderingContext2D,
  charData: Omit<
    CharMetrics,
    "xoffset" | "yoffset" | "glyphTop" | "glyphBottom"
  >
): Omit<CharMetrics, "xoffset" | "yoffset"> {
  const imageData = ctx.getImageData(
    charData.x,
    charData.y,
    charData.width,
    charData.height
  );
  const pixels = imageData.data;
  let glyphTop = charData.height;
  let glyphBottom = 0;
  let foundTop = false;

  for (let y = 0; y < charData.height; y++) {
    for (let x = 0; x < charData.width; x++) {
      const alphaIndex = (y * charData.width + x) * 4 + 3;
      if (pixels[alphaIndex] > 0) {
        if (!foundTop) {
          glyphTop = y;
          foundTop = true;
        }
        glyphBottom = Math.max(glyphBottom, y + 1);
      }
    }
  }

  return { ...charData, glyphTop, glyphBottom };
}

// --- The Main Conversion Logic ---
async function convertWildsFontToFnt(
  fontDefPath: string,
  outputFntPath: string
) {
  console.log(`Reading font definition from: ${fontDefPath}`);
  const fontDef: FontDef = JSON.parse(fs.readFileSync(fontDefPath, "utf-8"));

  const imagePath = path.resolve(path.dirname(fontDefPath), fontDef.imagePath);
  console.log(`Loading image: ${imagePath}`);
  const image = await loadImage(imagePath);

  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);

  const allChars = new Map<number, Omit<CharMetrics, "xoffset" | "yoffset">>();
  let maxLineHeight = 0;

  // 1. Parse all character boundaries and basic metrics
  for (const def of fontDef.defs) {
    const [srcX, srcY, srcW, srcH, letters] = def;
    const charHeight = srcH - 1;
    maxLineHeight = Math.max(maxLineHeight, charHeight);

    const headerPixelData = ctx.getImageData(srcX, srcY, srcW, 1).data;
    let letterIndex = 0;
    let currentLetterWidth = 0;
    let currentLetterStartX = 0;

    for (let x = 0; x <= srcW; x++) {
      const isSeparator = x === srcW || headerPixelData[x * 4 + 3] === 0;
      if (isSeparator && currentLetterWidth > 0) {
        const char = letters[letterIndex];
        if (char) {
          const charCode = char.charCodeAt(0);
          const rawCharData = {
            id: charCode,
            x: srcX + currentLetterStartX,
            y: srcY + 1,
            width: currentLetterWidth,
            height: charHeight,
            xadvance: currentLetterWidth + 1,
          };
          const analyzedCharData = analyzeCharMetrics(ctx, rawCharData);
          allChars.set(charCode, analyzedCharData);
        }
        letterIndex++;
        currentLetterStartX = x + 1;
        currentLetterWidth = 0;
      } else if (!isSeparator) {
        currentLetterWidth++;
      }
    }
  }

  // 2. Determine the font-wide baseline and the font-wide minimum top
  let baseline = 0;
  let fontMinTop = maxLineHeight;
  for (const charData of allChars.values()) {
    if (charData.width > 0 && charData.height > 0) {
      fontMinTop = Math.min(fontMinTop, charData.glyphTop);
      if (fontDef.baselineChars.includes(String.fromCharCode(charData.id))) {
        baseline = Math.max(baseline, charData.glyphBottom);
      }
    }
  }

  if (baseline === 0) {
    console.warn(
      "Could not determine baseline from baselineChars, using maxLineHeight."
    );
    baseline = maxLineHeight;
  } else {
    console.log(
      `Determined font baseline to be at: ${baseline}px from the top of the line.`
    );
  }
  console.log(`Determined font-wide minimum top offset to be: ${fontMinTop}px`);

  // Add the space character
  const spaceWidth = Math.floor(maxLineHeight / 2);
  const spaceCharCode = 32;
  if (!allChars.has(spaceCharCode)) {
    allChars.set(spaceCharCode, {
      id: spaceCharCode,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      xadvance: spaceWidth,
      glyphTop: 0,
      glyphBottom: 0,
    });
  }

  // 3. Finalize all character data with correct yoffset RELATIVE to the font's minimum top
  const finalChars = new Map<number, CharMetrics>();
  for (const [charCode, charData] of allChars.entries()) {
    finalChars.set(charCode, {
      ...charData,
      yoffset: charData.glyphTop - fontMinTop, // <-- The key fix is here!
      xoffset: 0,
    });
  }

  // 4. Build the .fnt file content
  const imageName = path.basename(imagePath);
  let fntContent = "";
  fntContent += `info face="${fontDef.fontName}" size=${maxLineHeight} bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=0 aa=1 padding=0,0,0,0 spacing=1,1 outline=0\n`;
  // The 'base' value is now adjusted by the fontMinTop as well
  fntContent += `common lineHeight=${maxLineHeight} base=${
    baseline - fontMinTop
  } scaleW=${image.width} scaleH=${
    image.height
  } pages=1 packed=0 alphaChnl=1 redChnl=4 greenChnl=4 blueChnl=4\n`;
  fntContent += `page id=0 file="${imageName}"\n`;
  fntContent += `chars count=${finalChars.size}\n`;

  const sortedChars = Array.from(finalChars.values()).sort(
    (a, b) => a.id - b.id
  );

  for (const charData of sortedChars) {
    const { glyphTop, glyphBottom, ...dataToWrite } = charData;
    let line = "char";
    for (const key in dataToWrite) {
      line += ` ${key}=${(dataToWrite as any)[key]}`;
    }
    line += ` page=0 chnl=15\n`;
    fntContent += line;
  }

  fs.writeFileSync(outputFntPath, fntContent, "utf-8");
  console.log(`✅ Successfully created stable .fnt file at: ${outputFntPath}`);
}

// --- Command Line Execution ---
function run() {
  const args = argv.slice(2);
  if (args.length !== 2) {
    console.error(
      "Usage: ts-node convertFont.ts <path/to/font-def.json> <path/to/output.fnt>"
    );
    process.exit(1);
  }
  convertWildsFontToFnt(args[0], args[1]).catch((err) => console.error(err));
}

run();
