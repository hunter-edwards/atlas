import { readFileSync } from "fs";
import { join } from "path";

const SKILLS_DIR = join(process.cwd(), "src/lib/skills");

export function loadSkill(filename: string): string {
  try {
    return readFileSync(join(SKILLS_DIR, filename), "utf-8");
  } catch {
    console.warn(`Skill file not found: ${filename}`);
    return "";
  }
}
