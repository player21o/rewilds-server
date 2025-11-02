import * as fs from "fs";
import * as path from "path";
import { argv } from "process";
import { fileURLToPath } from "url";

// --- Interfaces ---
// Add optional markers to the base interface for better type checking
interface WildsAtlasBaseData {
  width: number;
  height: number;
  frames: number; // Frames per row or total frames
  rows?: number;
  srcX?: number;
  srcY?: number;
}

// Keep the detailed interface for the complex format
interface WildsAtlasFrameData extends WildsAtlasBaseData {
  rows: number; // Now mandatory for this type
  markers?: { [key: string]: [number, number] };
  trim: number[];
  regions: number[];
}

interface TexturePackerFrame {
  frame: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  rotated?: boolean;
  trimmed?: boolean;
  pivot?: { x: number; y: number };
}

interface TexturePackerMeta {
  image: string;
  format: string;
  size: { w: number; h: number };
  scale: number;
  app?: string;
  version?: string;
}

interface TexturePackerAtlas {
  frames: { [key: string]: TexturePackerFrame };
  meta: TexturePackerMeta;
  animations: { [key: string]: string[] };
}

// --- NEW HELPER: Generate Data for Simple Spritesheets ---
/**
 * Takes a simple atlas format and generates the detailed `regions` and `trim` arrays
 * that the rest of the conversion logic expects.
 * @param simpleData The atlas data with only width, height, and frames.
 * @param sheetWidth The total width of the source image.
 * @returns A complete WildsAtlasFrameData object.
 */
function generateDetailedDataFromSimple(
  simpleData: WildsAtlasBaseData,
  sheetWidth: number
): WildsAtlasFrameData {
  const { width, height, frames } = simpleData;
  const totalFrames = frames;
  const cols = Math.floor(sheetWidth / width);
  const rows = Math.ceil(totalFrames / cols);

  const regions: number[] = [];
  const trim: number[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    // Region: [x, y, w, h]
    regions.push(col * width, row * height, width, height);

    // Trim: [x, y] - no trimming in this format
    trim.push(0, 0);
  }

  // Return a complete data object that the other functions can use
  return {
    ...simpleData,
    rows: rows, // Calculate and add the rows property
    regions,
    trim,
  };
}

// --- Helper: Populate a single TexturePacker frame (No changes needed) ---
function populateTexturePackerFrame(
  wildsData: WildsAtlasFrameData,
  frameIndex: number,
  totalFrames: number,
  srcOffsetX: number,
  srcOffsetY: number
): TexturePackerFrame | null {
  const regionIndex = frameIndex * 4;
  const trimIndex = frameIndex * 2;

  if (regionIndex + 3 >= wildsData.regions.length) {
    console.warn(
      `Warning: Region data insufficient for frame index ${frameIndex}. Skipping.`
    );
    return null;
  }
  if (trimIndex + 1 >= wildsData.trim.length) {
    console.warn(
      `Warning: Trim data insufficient for frame index ${frameIndex}. Skipping.`
    );
    return null;
  }

  const sourceX = wildsData.regions[regionIndex + 0] + srcOffsetX;
  const sourceY = wildsData.regions[regionIndex + 1] + srcOffsetY;
  const sourceW = wildsData.regions[regionIndex + 2];
  const sourceH = wildsData.regions[regionIndex + 3];

  const trimX = wildsData.trim[trimIndex + 0];
  const trimY = wildsData.trim[trimIndex + 1];

  const visualCenterX = trimX + sourceW / 2;
  const visualCenterY = trimY + sourceH / 2;
  const pivotX = wildsData.width > 0 ? visualCenterX / wildsData.width : 0.5;
  const pivotY = wildsData.height > 0 ? visualCenterY / wildsData.height : 0.5;

  return {
    frame: { x: sourceX, y: sourceY, w: sourceW, h: sourceH },
    sourceSize: { w: wildsData.width, h: wildsData.height },
    spriteSourceSize: { x: trimX, y: trimY, w: sourceW, h: sourceH },
    rotated: false,
    trimmed:
      trimX !== 0 ||
      trimY !== 0 ||
      sourceW !== wildsData.width ||
      sourceH !== wildsData.height,
    pivot: { x: pivotX, y: pivotY },
  };
}

// --- Conversion Function (Standard: Markers > Default) (No changes needed) ---
function convertWildsToTexturePackerStandard(
  wildsData: WildsAtlasFrameData,
  imagePath: string,
  sheetWidth: number,
  sheetHeight: number,
  frameNamePrefix: string = "frame"
): TexturePackerAtlas {
  // This function now works because it will receive complete data
  const outputAtlas: TexturePackerAtlas = {
    frames: {},
    meta: {
      image: path.basename(imagePath),
      format: "RGBA8888",
      size: { w: sheetWidth, h: sheetHeight },
      scale: 1,
      app: "Wilds Atlas Converter (Standard)",
      version: "1.2",
    },
    animations: {},
  };

  const totalFrames = wildsData.rows * wildsData.frames;
  const srcOffsetX = wildsData.srcX || 0;
  const srcOffsetY = wildsData.srcY || 0;
  const allFrameNames: string[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const frameName = `${frameNamePrefix}_${i}`;
    const tpFrame = populateTexturePackerFrame(
      wildsData,
      i,
      totalFrames,
      srcOffsetX,
      srcOffsetY
    );
    if (tpFrame) {
      outputAtlas.frames[frameName] = tpFrame;
      allFrameNames.push(frameName);
    } else {
      break;
    }
  }

  let markersProcessed = false;
  if (wildsData.markers && Object.keys(wildsData.markers).length > 0) {
    for (const markerName in wildsData.markers) {
      // ... (rest of this function is unchanged) ...
      const markerData = wildsData.markers[markerName];
      if (
        Array.isArray(markerData) &&
        markerData.length === 2 &&
        typeof markerData[0] === "number" &&
        typeof markerData[1] === "number"
      ) {
        const [startFrame, endFrame] = markerData;
        const animationFrames: string[] = [];
        const clampedStart = Math.max(0, startFrame);
        const clampedEnd = Math.min(allFrameNames.length - 1, endFrame);
        if (clampedStart > clampedEnd) continue;
        for (let i = clampedStart; i <= clampedEnd; i++) {
          const frameName = `${frameNamePrefix}_${i}`;
          if (outputAtlas.frames[frameName]) animationFrames.push(frameName);
        }
        if (animationFrames.length > 0) {
          outputAtlas.animations[markerName] = animationFrames;
          markersProcessed = true;
        }
      }
    }
  }

  if (!markersProcessed && allFrameNames.length > 0) {
    const defaultAnimationName =
      frameNamePrefix === "frame" ? "default" : frameNamePrefix;
    outputAtlas.animations[defaultAnimationName] = allFrameNames;
  }

  return outputAtlas;
}

// --- Conversion Function (Row-Based) (No changes needed) ---
function convertWildsToTexturePackerRowBased(
  wildsData: WildsAtlasFrameData,
  imagePath: string,
  sheetWidth: number,
  sheetHeight: number,
  frameNamePrefix: string = "frame"
): TexturePackerAtlas {
  // This function also now works as it expects complete data
  const outputAtlas: TexturePackerAtlas = {
    frames: {},
    meta: {
      image: path.basename(imagePath),
      format: "RGBA8888",
      size: { w: sheetWidth, h: sheetHeight },
      scale: 1,
      app: "Wilds Atlas Converter (Row-Based)",
      version: "1.2",
    },
    animations: {},
  };

  const totalFrames = wildsData.rows * wildsData.frames;
  const srcOffsetX = wildsData.srcX || 0;
  const srcOffsetY = wildsData.srcY || 0;

  for (let i = 0; i < totalFrames; i++) {
    const frameName = `${frameNamePrefix}_${i}`;
    const tpFrame = populateTexturePackerFrame(
      wildsData,
      i,
      totalFrames,
      srcOffsetX,
      srcOffsetY
    );
    if (tpFrame) {
      outputAtlas.frames[frameName] = tpFrame;
      const rowIndex = Math.floor(i / wildsData.frames);
      const animationName = `${frameNamePrefix}_row_${rowIndex}`;
      if (!outputAtlas.animations[animationName]) {
        outputAtlas.animations[animationName] = [];
      }
      outputAtlas.animations[animationName].push(frameName);
    } else {
      break;
    }
  }
  return outputAtlas;
}

// --- MODIFIED Command Line Execution ---
function runConverter() {
  // ... (argument parsing logic remains the same) ...
  const args = argv.slice(2);
  const rowBasedFlagIndex = args.findIndex(
    (arg) => arg === "--row-based" || arg === "-r"
  );
  const isRowBased = rowBasedFlagIndex !== -1;
  if (isRowBased) args.splice(rowBasedFlagIndex, 1);

  if (args.length < 5) {
    console.error(
      "Usage: ts-node convertAtlas.ts [--row-based|-r] <inputFile.json> <outputFile.json> <imagePath> <sheetWidth> <sheetHeight> [framePrefix]"
    );
    process.exit(1);
  }

  const inputFilePath = path.resolve(args[0]);
  const outputFilePath = path.resolve(args[1]);
  const imagePath = args[2];
  const sheetWidth = parseInt(args[3], 10);
  const sheetHeight = parseInt(args[4], 10);
  const framePrefix = args[5] || "frame";

  if (!fs.existsSync(inputFilePath)) {
    console.error(`Error: Input file not found: ${inputFilePath}`);
    process.exit(1);
  }
  if (
    isNaN(sheetWidth) ||
    isNaN(sheetHeight) ||
    sheetWidth <= 0 ||
    sheetHeight <= 0
  ) {
    console.error("Error: Invalid sheetWidth or sheetHeight.");
    process.exit(1);
  }

  try {
    const wildsJsonString = fs.readFileSync(inputFilePath, "utf-8");
    const baseData: WildsAtlasBaseData = JSON.parse(wildsJsonString);

    // --- ** NEW: DATA NORMALIZATION STEP ** ---
    let detailedData: WildsAtlasFrameData;

    // Check if it's the simple format (lacks 'regions' array)
    if (!("regions" in baseData) || !Array.isArray((baseData as any).regions)) {
      console.log("Simple atlas format detected. Generating detailed data...");
      detailedData = generateDetailedDataFromSimple(baseData, sheetWidth);
    } else {
      console.log("Detailed atlas format detected.");
      // It's already the complex format, just cast it after validation
      detailedData = baseData as WildsAtlasFrameData;
      if (typeof detailedData.rows !== "number") {
        // If rows is missing in a detailed format, we can calculate it
        const cols = Math.floor(sheetWidth / detailedData.width);
        detailedData.rows = Math.ceil(detailedData.frames / cols);
        console.log(`Calculated 'rows' property to be: ${detailedData.rows}`);
      }
    }
    // --- END NEW STEP ---

    // Choose conversion function based on flag
    const conversionFunction = isRowBased
      ? convertWildsToTexturePackerRowBased
      : convertWildsToTexturePackerStandard;

    const texturePackerData = conversionFunction(
      detailedData, // Use the normalized detailedData
      imagePath,
      sheetWidth,
      sheetHeight,
      framePrefix
    );

    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputJsonString = JSON.stringify(texturePackerData, null, 2);
    fs.writeFileSync(outputFilePath, outputJsonString, "utf-8");

    console.log(
      `Successfully converted ${path.basename(
        inputFilePath
      )} to ${path.basename(outputFilePath)}`
    );
  } catch (error: any) {
    console.error("Error during conversion:", error.message, error.stack);
    process.exit(1);
  }
}

// --- Run ---
// This check makes sure the script runs only when executed directly
if (
  import.meta.url.startsWith("file:") &&
  process.argv[1] === fileURLToPath(import.meta.url)
) {
  runConverter();
}

// --- Exports ---
export {
  convertWildsToTexturePackerStandard,
  convertWildsToTexturePackerRowBased,
  WildsAtlasFrameData,
  TexturePackerAtlas,
};
