import minimist from "minimist";
import conf from "./helper_config.json";
import { imageSizeFromFile } from "image-size/fromFile";
import { exec } from "child_process";
import { copyFile } from "fs/promises";

const args = minimist(process.argv) as any as { r?: boolean; f: string };

async function yes() {
  const original_json_path = conf.wilds + args.f + ".json";
  const new_json_path = conf.rewilds + args.f + ".json";
  const sprite_path = conf.wilds + args.f + ".png";
  const new_sprite_path = conf.rewilds + args.f + ".png";
  const dimensions = await imageSizeFromFile(sprite_path);

  exec(
    "tsx " +
      conf.converter +
      (args.r ? " -r " : " ") +
      original_json_path +
      " " +
      new_json_path +
      " " +
      sprite_path +
      " " +
      dimensions.width +
      " " +
      dimensions.height
  );

  await copyFile(sprite_path, new_sprite_path);
}

yes();
