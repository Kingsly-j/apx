import { readFile } from "node:fs/promises";
import path from "node:path";
import ReferencePage from "./reference-page";

export default async function Home() {
  const html = await readFile(path.join(process.cwd(), "app/content/home.html"), "utf8");
  return <ReferencePage html={html} />;
}
