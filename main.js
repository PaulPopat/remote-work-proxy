const httpProxy = require("http-proxy");
const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const setEtcHosts = require("./set-etc-hosts");

let updatedEtcHosts = false;

function create_window() {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile("index.html");

  win.on("closed", async () => {
    win = null;
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (win === null) {
      create_window();
    }
  });

  app.on("before-quit", e => {
    if (!updatedEtcHosts) {
      return;
    }

    e.preventDefault();
    setEtcHosts([]).then(() => {
      updatedEtcHosts = false;
      app.quit();
    });
  });

  function format(num, length) {
    var r = "" + num;
    while (r.length < length) {
      r = "0" + r;
    }
    return r;
  }

  function get_time_string() {
    const date = new Date();
    return `${format(date.getHours(), 2)}:${format(
      date.getMinutes(),
      2
    )}:${format(date.getSeconds(), 2)}.${format(date.getMilliseconds(), 3)}`;
  }

  /**
   * @param {string} outHost
   * @param {number} inPort
   * @param {number} outPort
   */
  function proxy(outHost, inPort, outPort) {
    const server = httpProxy
      .createProxyServer({
        target: { host: outHost, port: outPort },
        ws: true
      })
      .on("start", r => {
        win.webContents.send("log", {
          timestamp: get_time_string(),
          action: "TO " + inPort,
          location: r.url
        });
      })
      .on("end", r => {
        win.webContents.send("log", {
          timestamp: get_time_string(),
          action: "FROM " + outPort,
          location: r.url
        });
      })
      .on("error", (e, r) => {
        win.webContents.send("log", {
          timestamp: get_time_string(),
          action: e.name,
          location: r.url
        });
      })
      .on("proxyReqWs", (c, r) => {
        win.webContents.send("log", {
          timestamp: get_time_string(),
          action: "WS " + outPort,
          location: r.url
        });
      })
      .listen(inPort);

    console.log("Listening on port: " + inPort);
    return server;
  }

  /**
   * @param {{ inHost: string, outHost: string, inPort: number, outPort: number}[]} proxies
   */
  function start_proxies(proxies) {
    const hosts = [];
    const servers = [];
    for (const p of proxies) {
      hosts.push(p.inHost);
      servers.push(proxy(p.outHost, p.inPort, p.outPort));
    }

    setEtcHosts(hosts);
    updatedEtcHosts = true;
    return {
      stop: () => {
        for (const s of servers) {
          s.close();
        }
      },
      servers
    };
  }

  const savePath = path.join(app.getPath("userData"), "save.json");
  let servers;
  ipcMain.on("proxies-change", (e, a) => {
    if (servers) {
      servers.stop();
    }

    servers = start_proxies(a);
    fs.writeFileSync(savePath, JSON.stringify(a));
  });

  ipcMain.on("ready", () => {
    if (fs.existsSync(savePath)) {
      const proxies = JSON.parse(fs.readFileSync(savePath)).map(p => {
        if (p.host) {
          return {
            inHost: "localhost",
            outHost: p.host,
            inPort: p.inPort,
            outPort: p.outPort
          };
        }

        return p;
      });
      servers = start_proxies(proxies);
      win.webContents.send("load", proxies);
    }
  });
}

app.on("ready", create_window);
