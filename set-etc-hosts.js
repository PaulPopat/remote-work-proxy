const sudofs = require("@mh-cbon/sudo-fs");
const path = require("path");
const fs = require("fs");

const etcHostsPath =
  process.platform === "win32"
    ? path.join("C:", "Windows", "System32", "drivers", "etc", "hosts")
    : path.join("etc", "hosts");

let originalEtcHosts = fs.readFileSync(etcHostsPath, "utf-8");
let previous = [];

module.exports = async hosts => {
  if (hosts === previous) {
    return;
  }

  previous = hosts;
  let contents = originalEtcHosts;
  for (const host of hosts) {
    if (host === "localhost") {
      continue;
    }

    contents += `\n127.0.0.1 ${host}`;
  }

  return new Promise((res, rej) => {
    sudofs.writeFile(etcHostsPath, contents, (err, data) => {
      if (err) {
        rej(err);
      }

      res();
    });
  });
};
