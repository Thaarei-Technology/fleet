import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";

if (!process.stdin.isTTY || !process.stdout.isTTY)
  throw new Error("dev:clean requires an interactive terminal");
const terminal = createInterface({ input: process.stdin, output: process.stdout });
const answer = await terminal.question(
  "Type thaarei-fleet to delete this project's retained development volumes: ",
);
terminal.close();
if (answer !== "thaarei-fleet")
  throw new Error("Confirmation did not match; no volumes were deleted");
const child = spawn("docker", ["compose", "down", "--volumes", "--remove-orphans"], {
  stdio: "inherit",
});
const exitCode = await new Promise<number>((resolveExit) =>
  child.once("exit", (code) => resolveExit(code ?? 1)),
);
if (exitCode !== 0) process.exitCode = exitCode;
