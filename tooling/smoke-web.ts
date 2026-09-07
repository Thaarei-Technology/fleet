const response = await fetch("http://127.0.0.1:3000");
if (!response.ok) throw new Error(`web smoke failed: ${response.status}`);
process.stdout.write("web smoke passed\n");
