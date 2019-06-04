const { ipcRenderer } = require("electron");

let logHandler;

ipcRenderer.on("log", (e, a) => {
  logHandler(a);
});

const Logs = p => {
  const [logs, setLogs] = React.useState([]);
  logHandler = a => {
    setLogs([...logs, a].slice(Math.max(-29 + logs.length, 0)));
  };

  return (
    <div className="logs">
      {logs.map(l => (
        <div className="section">
          <span className="timestamp">{l.timestamp}</span>
          <span className="action">{l.action}</span>
          <span className="location">{l.location}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * @param {{ host: string, inPort: number, outPort: number}[]} proxies
 */
function change(proxies) {
  ipcRenderer.send("proxies-change", proxies);
}

let loadHandler;
ipcRenderer.on("load", (e, a) => {
  loadHandler(a);
});

const Input = p => (
  <div className="input">
    <label>{p.children}</label>
    <input
      type="text"
      value={p.value}
      onChange={e => p.onChange(e.target.value)}
    />
  </div>
);

const Proxies = p => {
  const [proxies, setProxies] = React.useState([]);

  loadHandler = a => {
    setProxies(a);
  };

  return (
    <div className="proxies">
      {proxies.map(p => (
        <div key={p.id} className="section">
          <Input
            value={p.host}
            onChange={e =>
              setProxies(
                proxies.map(o => {
                  if (o !== p) {
                    return o;
                  }

                  return {
                    ...o,
                    host: e
                  };
                })
              )
            }
          >
            Target Host:
          </Input>
          <Input
            value={p.outPort}
            onChange={e =>
              setProxies(
                proxies.map(o => {
                  if (o !== p) {
                    return o;
                  }

                  return {
                    ...o,
                    outPort: parseInt(e)
                  };
                })
              )
            }
          >
            Target Port:
          </Input>
          <Input
            value={p.inPort}
            onChange={e =>
              setProxies(
                proxies.map(o => {
                  if (o !== p) {
                    return o;
                  }

                  return {
                    ...o,
                    inPort: parseInt(e)
                  };
                })
              )
            }
          >
            Listen Port:
          </Input>
        </div>
      ))}
      <div>
        <a
          className="button"
          onClick={() =>
            setProxies([
              ...proxies,
              { host: "", inPort: 0, outPort: 0, id: Math.random() }
            ])
          }
        >
          Add a proxy
        </a>
        <a className="button" onClick={() => change(proxies)}>
          Apply
        </a>
      </div>
    </div>
  );
};

ReactDOM.render(
  <div style={{ display: "flex" }}>
    <Proxies />
    <Logs />
  </div>,
  document.getElementById("react-start")
);

ipcRenderer.send("ready");
