#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { Script } from "@opencode-ai/script"
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

async function published(name: string, version: string) {
  return (await $`npm view ${name}@${version} version`.nothrow()).exitCode === 0
}

async function publish(cwd: string, name: string, version: string) {
  if (process.platform !== "win32") await $`chmod -R 755 .`.cwd(cwd)
  if (await published(name, version)) {
    console.log(`already published ${name}@${version}`)
    return
  }
  await $`bun pm pack`.cwd(cwd)
  const tgz = [...new Bun.Glob("*.tgz").scanSync({ cwd })][0]
  if (!tgz) throw new Error(`no tarball in ${cwd}`)
  console.log(`publishing ${name}@${version} from ${tgz}`)
  await $`npm publish ${tgz} --access public --tag ${Script.channel}`.cwd(cwd)
}

const binaries: Record<string, string> = {}
for (const filepath of new Bun.Glob("*/package.json").scanSync({ cwd: "./dist" })) {
  if (filepath.split("/").length !== 2) continue
  const info = await Bun.file(`./dist/${filepath}`).json()
  if (!String(info.name ?? "").startsWith(`${pkg.name}-`)) continue
  binaries[info.name] = info.version
}
console.log("binaries", binaries)
const version = Object.values(binaries)[0]
if (!version) throw new Error("no binaries found in dist/")

await $`mkdir -p ./dist/${pkg.name}/bin`
await $`cp ./script/postinstall.mjs ./dist/${pkg.name}/postinstall.mjs`
await Bun.file(`./dist/${pkg.name}/LICENSE`).write(await Bun.file("../../LICENSE").text())
await Bun.file(`./dist/${pkg.name}/bin/${pkg.name}.exe`).write(
  [
    `echo "Error: ${pkg.name}-ai's postinstall script was not run." >&2`,
    "exit 1",
    "",
  ].join("\n"),
)

await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: `${pkg.name}-ai`,
      bin: {
        [pkg.name]: `./bin/${pkg.name}.exe`,
      },
      scripts: {
        postinstall: "node ./postinstall.mjs",
      },
      version,
      license: pkg.license,
      os: ["darwin", "linux", "win32"],
      cpu: ["arm64", "x64"],
      optionalDependencies: binaries,
    },
    null,
    2,
  ),
)

console.log(`Prepared meta package ${pkg.name}-ai@${version}`)

for (const name of Object.keys(binaries)) {
  await publish(`./dist/${name}`, name, binaries[name])
}
await publish(`./dist/${pkg.name}`, `${pkg.name}-ai`, version)
console.log("npm publish complete")
