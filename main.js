const httpProxy = require("http-proxy");
const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

function create_window() {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadFile("index.html");

  win.on("closed", () => {
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
   * @param {string} host
   * @param {string} port
   */
  function proxy(host, inPort, outPort) {
    const server = httpProxy
      .createProxyServer({
        target: { host, port: outPort },
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
   * @param {{ host: string, inPort: number, outPort: number}[]} proxies
   */
  function start_proxies(proxies) {
    const servers = proxies.map(p => proxy(p.host, p.inPort, p.outPort));
    return {
      stop: () => {
        for (const s of servers) {
          s.close();
        }
      },
      servers
    };
  }

  const savePath = path.join(app.getAppPath());
  let servers;
  ipcMain.on("proxies-change", (e, a) => {
    if (servers) {
      servers.stop();
    }

    servers = start_proxies(a);
    fs.writeFileSync("save.json", JSON.stringify(a));
  });

  ipcMain.on("ready", () => {
    if (fs.existsSync("save.json")) {
      const proxies = JSON.parse(fs.readFileSync("save.json"));
      servers = start_proxies(proxies);
      win.webContents.send("load", proxies);
    }
  });
}

app.on("ready", create_window);
