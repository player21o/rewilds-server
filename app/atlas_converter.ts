import * as fs from "fs";
import * as path from "path";
import { argv } from "process"; // Import argv for argument parsing
import { fileURLToPath } from "url";

// --- Interfaces (Keep as they are) ---
interface WildsAtlasFrameData {
  width: number;
  height: number;
  frames: number; // Frames per row
  rows: number;
  markers?: { [key: string]: [number, number] };
  trim: number[];
  regions: number[];
  srcX?: number;
  srcY?: number;
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

// --- Helper: Populate a single TexturePacker frame ---
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
      `Warning: Region data seems insufficient for frame index ${frameIndex} (expected ${totalFrames} frames). Skipping frame.`
    );
    return null;
  }
  if (trimIndex + 1 >= wildsData.trim.length) {
    console.warn(
      `Warning: Trim data seems insufficient for frame index ${frameIndex} (expected ${totalFrames} frames). Skipping frame.`
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

// --- Conversion Function (Standard: Markers > Default) ---
function convertWildsToTexturePackerStandard(
  wildsData: WildsAtlasFrameData,
  imagePath: string,
  sheetWidth: number,
  sheetHeight: number,
  frameNamePrefix: string = "frame"
): TexturePackerAtlas {
  const outputAtlas: TexturePackerAtlas = {
    frames: {},
    meta: {
      image: "/" + imagePath.split("/").slice(-1)[0],
      format: "RGBA8888",
      size: { w: sheetWidth, h: sheetHeight },
      scale: 1,
      app: "Wilds Atlas Converter (Standard)",
      version: "1.1",
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
      allFrameNames.push(frameName); // Collect only valid frame names
    } else {
      // Stop processing further frames if data is insufficient
      break;
    }
  }

  // --- Populate Animations ---
  let markersProcessed = false;
  if (wildsData.markers && Object.keys(wildsData.markers).length > 0) {
    for (const markerName in wildsData.markers) {
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
        // Use totalFrames based on JSON, but ensure we don't exceed generated frame names
        const clampedEnd = Math.min(allFrameNames.length - 1, endFrame);

        if (clampedStart > clampedEnd) {
          console.warn(
            `Warning: Invalid marker range for "${markerName}" [${startFrame}, ${endFrame}]. Skipping.`
          );
          continue;
        }

        for (let i = clampedStart; i <= clampedEnd; i++) {
          const frameName = `${frameNamePrefix}_${i}`;
          // Check against actually generated frames
          if (outputAtlas.frames[frameName]) {
            animationFrames.push(frameName);
          } else {
            console.warn(
              `Warning: Frame index ${i} referenced in marker "${markerName}" not found, though expected.`
            );
          }
        }
        if (animationFrames.length > 0) {
          outputAtlas.animations[markerName] = animationFrames;
          markersProcessed = true;
        }
      } else {
        console.warn(
          `Warning: Invalid marker data for "${markerName}". Expected [startFrame, endFrame]. Skipping.`
        );
      }
    }
  }

  // If no markers were processed OR markers object is empty/null, create a default animation
  if (!markersProcessed) {
    if (allFrameNames.length > 0) {
      const defaultAnimationName =
        frameNamePrefix === "frame" ? "default" : frameNamePrefix;
      outputAtlas.animations[defaultAnimationName] = allFrameNames;
    }
  }

  return outputAtlas;
}

// --- Conversion Function (Row-Based) ---
function convertWildsToTexturePackerRowBased(
  wildsData: WildsAtlasFrameData,
  imagePath: string,
  sheetWidth: number,
  sheetHeight: number,
  frameNamePrefix: string = "frame"
): TexturePackerAtlas {
  const outputAtlas: TexturePackerAtlas = {
    frames: {},
    meta: {
      image: "/" + imagePath.split("/").slice(-1)[0],
      format: "RGBA8888",
      size: { w: sheetWidth, h: sheetHeight },
      scale: 1,
      app: "Wilds Atlas Converter (Row-Based)",
      version: "1.1",
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

      // --- Populate Animations (Group by Row) ---
      const rowIndex = Math.floor(i / wildsData.frames);
      const animationName = `${frameNamePrefix}_row_${rowIndex}`; // Use prefix in animation name
      if (!outputAtlas.animations[animationName]) {
        outputAtlas.animations[animationName] = [];
      }
      outputAtlas.animations[animationName].push(frameName);
    } else {
      break; // Stop if data is insufficient
    }
  }

  return outputAtlas;
}

// --- Command Line Execution ---

function runConverter() {
  // Simple argument parsing
  const args = argv.slice(2);
  const rowBasedFlagIndex = args.findIndex(
    (arg) => arg === "--row-based" || arg === "-r"
  );
  const isRowBased = rowBasedFlagIndex !== -1;

  if (isRowBased) {
    args.splice(rowBasedFlagIndex, 1); // Remove the flag from args list
  }

  if (args.length < 5) {
    console.error("\nError: Missing arguments.");
    console.error(
      "Usage: ts-node convertAtlas.ts [--row-based|-r] <inputFile.json> <outputFile.json> <imagePath> <sheetWidth> <sheetHeight> [framePrefix]\n"
    );
    console.error("Options:");
    console.error(
      "  --row-based, -r : Create separate animations for each row."
    );
    console.error("\nExample (Standard):");
    console.error(
      "  ts-node convertAtlas.ts ./in/sprite.json ./out/sprite_tp.json images/sprite.png 512 256 sprite_"
    );
    console.error("\nExample (Row-Based):");
    console.error(
      "  ts-node convertAtlas.ts --row-based ./in/roll.json ./out/roll_tp.json images/roll.png 1024 512 roll"
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
    console.error(
      "Error: Invalid sheetWidth or sheetHeight provided. Must be positive numbers."
    );
    process.exit(1);
  }

  try {
    const wildsJsonString = fs.readFileSync(inputFilePath, "utf-8");
    const wildsData: WildsAtlasFrameData = JSON.parse(wildsJsonString);

    // --- Basic Validation ---
    if (
      typeof wildsData.width !== "number" ||
      typeof wildsData.height !== "number" ||
      typeof wildsData.frames !== "number" ||
      typeof wildsData.rows !== "number" ||
      !Array.isArray(wildsData.trim) ||
      !Array.isArray(wildsData.regions)
    ) {
      console.error(
        "Error: Input JSON data is missing required fields or has invalid types (width, height, frames, rows, trim, regions)."
      );
      process.exit(1);
    }
    const expectedTrimLength = wildsData.rows * wildsData.frames * 2;
    const expectedRegionsLength = wildsData.rows * wildsData.frames * 4;
    if (wildsData.trim.length < expectedTrimLength) {
      console.warn(
        `Warning: Trim data length (${wildsData.trim.length}) is less than expected (${expectedTrimLength}). Some frames might be skipped.`
      );
    }
    if (wildsData.regions.length < expectedRegionsLength) {
      console.warn(
        `Warning: Region data length (${wildsData.regions.length}) is less than expected (${expectedRegionsLength}). Some frames might be skipped.`
      );
    }
    // --- End Validation ---

    // Choose conversion function based on flag
    const conversionFunction = isRowBased
      ? convertWildsToTexturePackerRowBased
      : convertWildsToTexturePackerStandard;

    const texturePackerData = conversionFunction(
      wildsData,
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
      )} to ${path.basename(outputFilePath)} (${
        isRowBased ? "row-based animations" : "standard conversion"
      })`
    );
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      console.error(`Error: Failed to parse input JSON file: ${inputFilePath}`);
      console.error(error.message);
    } else {
      console.error("Error during conversion:", error.message);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// --- Run ---
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runConverter();
}

// --- Exports (optional, if used as a module) ---
export {
  convertWildsToTexturePackerStandard,
  convertWildsToTexturePackerRowBased,
  WildsAtlasFrameData,
  TexturePackerAtlas,
};
