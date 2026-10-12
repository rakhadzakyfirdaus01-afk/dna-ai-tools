import { ToolRegistry } from "../../lib/antigravity/tools/registry";
import { SecurityGate } from "../../lib/antigravity/security-gate";
import fs from "fs/promises";
import path from "path";

async function runEndToEndScenario() {
  console.log("====================================================");
  console.log("🧪 STARTING END-TO-END AUTONOMOUS WORKFLOW TEST");
  console.log("====================================================");

  const fixtureDir = "tests/fixtures_sandbox";
  const fullFixtureDir = path.resolve(SecurityGate.getWorkspaceRoot(), fixtureDir);
  await fs.mkdir(fullFixtureDir, { recursive: true });

  const dummyCodeFile = `${fixtureDir}/calculator.ts`;
  const initialBuggyCode = `
export function calculateDiscount(price: number, percent: number): number {
  // BUG: Mengurangi harga dengan persen langsung bukan perkalian
  return price - percent;
}
`.trim();

  // 1. SETUP: Tulis file yang memiliki bug
  console.log("\n[Step 1] Mempersiapkan file kode dengan bug sengaja...");
  const writeTool = ToolRegistry.getTool("write_file")!;
  const writeRes = await writeTool.execute({
    filePath: dummyCodeFile,
    content: initialBuggyCode,
  });
  console.log("  Write Result:", writeRes.success ? "File created" : writeRes.error);

  // 2. INSPEKSI: Agent membaca struktur dan mendeteksi bug
  console.log("\n[Step 2] Agent membaca kode untuk mendeteksi akar masalah...");
  const readTool = ToolRegistry.getTool("read_file")!;
  const readRes = await readTool.execute({ filePath: dummyCodeFile });
  console.log("  Code Read:", readRes.data.content.trim());

  // 3. PERBAIKAN: Agent memperbaiki bug menggunakan patch_file
  console.log("\n[Step 3] Agent mengoreksi bug dengan patch_file...");
  const patchTool = ToolRegistry.getTool("patch_file")!;
  const patchRes = await patchTool.execute({
    filePath: dummyCodeFile,
    targetText: "return price - percent;",
    replacementText: "return price - (price * (percent / 100));",
  });
  console.log("  Patch Result:", patchRes.success ? "Bug Fixed!" : patchRes.error);

  // 4. VERIFIKASI: Agent membaca kembali kode hasil perbaikan
  console.log("\n[Step 4] Agent memverifikasi hasil perbaikan...");
  const verifyRead = await readTool.execute({ filePath: dummyCodeFile });
  const fixedContent: string = verifyRead.data.content;
  console.log("  Verified Code:", fixedContent.trim());

  const isTrulyFixed = fixedContent.includes("price * (percent / 100)");

  // 5. CLEANUP
  try {
    await fs.rm(fullFixtureDir, { recursive: true, force: true });
  } catch {}

  console.log("\n====================================================");
  if (isTrulyFixed) {
    console.log("🎉 END-TO-END TEST SUCCESS: BUG DETECTED, FIXED, & VERIFIED!");
    console.log("====================================================");
  } else {
    console.error("❌ END-TO-END TEST FAILED: CODE WAS NOT FIXED PROPERLY");
    console.log("====================================================");
    process.exit(1);
  }
}

runEndToEndScenario().catch((err) => {
  console.error("Fatal error in E2E scenario:", err);
  process.exit(1);
});
