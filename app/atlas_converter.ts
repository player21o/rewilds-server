import * as fs from "fs";
import * as path from "path";

// --- Interfaces for Type Safety ---

interface WildsAtlasFrameData {
  width: number;
  height: number;
  frames: number; // Frames per row
  rows: number;
  markers?: { [key: string]: [number, number] }; // [startFrameIndex, endFrameIndex]
  trim: number[]; // Flat array [x1, y1, x2, y2, ...]
  regions: number[]; // Flat array [x1, y1, w1, h1, x2, y2, w2, h2, ...]
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
  animations: { [key: string]: string[] }; // Changed to always include animations
}

// ... (Keep interfaces and other parts of the script the same) ...

/**
 * Converts Wilds engine atlas format to TexturePacker format.
 * @param wildsData The parsed JSON data from the Wilds format file.
 * @param imagePath Relative path to the spritesheet image (for meta field).
 * @param sheetWidth Width of the entire spritesheet image.
 * @param sheetHeight Height of the entire spritesheet image.
 * @param frameNamePrefix Prefix for generated frame names.
 * @returns TexturePackerAtlas object.
 */
function convertWildsToTexturePacker(
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
      app: "Wilds Atlas Converter",
      version: "1.0",
    },
    animations: {},
  };

  const totalFrames = wildsData.rows * wildsData.frames;
  const srcOffsetX = wildsData.srcX || 0;
  const srcOffsetY = wildsData.srcY || 0;
  const allFrameNames: string[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const frameName = `${frameNamePrefix}_${i}`;
    allFrameNames.push(frameName);

    const regionIndex = i * 4;
    const trimIndex = i * 2;

    if (regionIndex + 3 >= wildsData.regions.length) {
      console.warn(
        `Warning: Region data seems insufficient for frame index ${i} (expected ${totalFrames} frames). Skipping remaining.`
      );
      break;
    }
    if (trimIndex + 1 >= wildsData.trim.length) {
      console.warn(
        `Warning: Trim data seems insufficient for frame index ${i} (expected ${totalFrames} frames). Skipping remaining.`
      );
      break;
    }

    const sourceX = wildsData.regions[regionIndex + 0] + srcOffsetX;
    const sourceY = wildsData.regions[regionIndex + 1] + srcOffsetY;
    const sourceW = wildsData.regions[regionIndex + 2];
    const sourceH = wildsData.regions[regionIndex + 3];

    const trimX = wildsData.trim[trimIndex + 0];
    const trimY = wildsData.trim[trimIndex + 1];

    // --- Calculate Pivot ---
    // Calculate the visual center of the trimmed sprite *within* the logical sourceSize
    const visualCenterX = trimX + sourceW / 2;
    const visualCenterY = trimY + sourceH / 2;
    // Normalize the pivot point (0 to 1) relative to the sourceSize
    const pivotX = wildsData.width > 0 ? visualCenterX / wildsData.width : 0.5;
    const pivotY =
      wildsData.height > 0 ? visualCenterY / wildsData.height : 0.5;

    // --- Populate TexturePacker frame ---
    const tpFrame: TexturePackerFrame = {
      frame: {
        x: sourceX,
        y: sourceY,
        w: sourceW,
        h: sourceH,
      },
      sourceSize: {
        w: wildsData.width,
        h: wildsData.height,
      },
      spriteSourceSize: {
        x: trimX,
        y: trimY,
        w: sourceW,
        h: sourceH,
      },
      rotated: false,
      trimmed:
        trimX !== 0 ||
        trimY !== 0 ||
        sourceW !== wildsData.width ||
        sourceH !== wildsData.height,
      // ***** ADDED PIVOT *****
      pivot: { x: pivotX, y: pivotY },
    };

    outputAtlas.frames[frameName] = tpFrame;
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
        const clampedEnd = Math.min(totalFrames - 1, endFrame);

        if (clampedStart > clampedEnd) {
          console.warn(
            `Warning: Invalid marker range for "${markerName}" [${startFrame}, ${endFrame}]. Skipping.`
          );
          continue;
        }

        for (let i = clampedStart; i <= clampedEnd; i++) {
          const frameName = `${frameNamePrefix}_${i}`;
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

  if (!markersProcessed) {
    if (allFrameNames.length > 0) {
      const defaultAnimationName =
        frameNamePrefix === "frame" ? "default" : frameNamePrefix;
      outputAtlas.animations[defaultAnimationName] = allFrameNames;
    }
  }

  return outputAtlas;
}

// --- Command Line Execution ---

function runConverter() {
  const args = process.argv.slice(2);

  if (args.length < 5) {
    console.error("\nError: Missing arguments.");
    console.error(
      "Usage: ts-node convertAtlas.ts <inputFile.json> <outputFile.json> <imagePath> <sheetWidth> <sheetHeight> [framePrefix]\n"
    );
    console.error("Example:");
    console.error(
      "  ts-node convertAtlas.ts ./in/sprite.json ./out/sprite_tp.json images/sprite.png 512 256 anim_"
    );
    process.exit(1);
  }

  const inputFilePath = path.resolve(args[0]);
  const outputFilePath = path.resolve(args[1]);
  const imagePath = args[2]; // Relative path as it will be stored in meta
  const sheetWidth = parseInt(args[3], 10);
  const sheetHeight = parseInt(args[4], 10);
  const framePrefix = args[5] || "frame"; // Optional prefix

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
    // Read input JSON
    const wildsJsonString = fs.readFileSync(inputFilePath, "utf-8");
    const wildsData: WildsAtlasFrameData = JSON.parse(wildsJsonString);

    // --- Basic Validation of Wilds Data ---
    if (
      typeof wildsData.width !== "number" ||
      wildsData.width <= 0 ||
      typeof wildsData.height !== "number" ||
      wildsData.height <= 0 ||
      typeof wildsData.frames !== "number" ||
      wildsData.frames <= 0 ||
      typeof wildsData.rows !== "number" ||
      wildsData.rows <= 0 ||
      !Array.isArray(wildsData.trim) ||
      !Array.isArray(wildsData.regions)
    ) {
      console.error(
        "Error: Input JSON data is missing required fields or has invalid types."
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

    // Perform conversion
    const texturePackerData = convertWildsToTexturePacker(
      wildsData,
      imagePath,
      sheetWidth,
      sheetHeight,
      framePrefix
    );

    // Ensure output directory exists
    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write output JSON
    const outputJsonString = JSON.stringify(texturePackerData, null, 2); // Pretty print JSON
    fs.writeFileSync(outputFilePath, outputJsonString, "utf-8");

    console.log(
      `Successfully converted ${path.basename(
        inputFilePath
      )} to ${path.basename(outputFilePath)}`
    );
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      console.error(`Error: Failed to parse input JSON file: ${inputFilePath}`);
      console.error(error.message);
    } else {
      console.error("Error during conversion:", error.message);
      console.error(error.stack); // Print stack for more details
    }
    process.exit(1);
  }
}

// Run if executed directly
runConverter();

// Export the conversion function if used as a module
export { convertWildsToTexturePacker, WildsAtlasFrameData, TexturePackerAtlas };
