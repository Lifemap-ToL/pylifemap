import esbuild from "esbuild"

let ctx = await esbuild.context({
    entryPoints: ["index.js"], // Your entry point
    bundle: true,
    outfile: "dist/lifemap.js",
    format: "iife",
    globalName: "Lifemap",
    minify: true,
    platform: "browser",
    sourcemap: true,
})

await ctx.rebuild().catch(() => process.exit(1))

if (process.env.WATCH === "true") {
    await ctx.watch()
    console.log("Watching...")
} else {
    ctx.dispose()
}
