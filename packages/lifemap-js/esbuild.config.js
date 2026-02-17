import esbuild from "esbuild"

esbuild
    .build({
        entryPoints: ["index.js"], // Your entry point
        bundle: true,
        outfile: "dist/lifemap.js",
        format: "iife",
        globalName: "Lifemap",
        minify: true,
        platform: "browser",
        sourcemap: true,
    })
    .catch(() => process.exit(1))
