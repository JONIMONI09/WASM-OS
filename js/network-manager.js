  // 5. NETWORK ADAPTER ENGINE (WS RELAY, FETCH SLIRP + CORS, LAN MESH)
  // ====================================================================
  let origWindowFetch = null;
  export function installFetchCorsFallback() {
    if (S.fetchPatched) return;
    S.fetchPatched = true;
    const origFetch = origWindowFetch || window.fetch.bind(window);
    origWindowFetch = origFetch;
    window.fetch = async function(input, init) {
      const url = typeof input === "string" ? input : (input && input.url ? input.url : "");
      if (location.protocol === "https:" && url.startsWith("http://")) {
        logNet(`Intercepted guest HTTP URL -> routing via HTTPS CORS proxy: ${url}`);
        for (const makeProxy of CORS_PROXIES) {
          try {
            const r = await origFetch(makeProxy(url), init);
            if (r.ok) return r;
          } catch (e) {}
        }
      }
      return origFetch(input, init);
    };
  }

  export function buildNetworkConfig() {
    const card = $("net-card").value;
    const mode = $("net-mode").value;
    if (card === "none") {
      setBadge("b-net", "OFFLINE (LOCAL)");
      $("net-status-pill").textContent = "LOCAL READY";
      return {};
    }

    let relayUrl = "wss://relay.widgetry.org/";
    let badgeLabel = `${card.toUpperCase()} · WS-RELAY`;

    if (mode === "fetch-slirp") {
      installFetchCorsFallback();
      relayUrl = "fetch";
      badgeLabel = `${card.toUpperCase()} · FETCH-SLIRP`;
    } else if (mode === "custom-ws") {
      relayUrl = ($("net-custom-url").value || "wss://relay.widgetry.org/").trim();
      badgeLabel = `${card.toUpperCase()} · CUSTOM-WS`;
    } else if (mode === "lan-mesh") {
      relayUrl = undefined;
      badgeLabel = `${card.toUpperCase()} · TAB-LAN`;
    }

    setBadge("b-net", badgeLabel);
    $("net-status-pill").textContent = badgeLabel;
    log(`Network configured: NIC=${card}, Mode=${mode}, Relay=${relayUrl || "BroadcastChannel"}`, "ok", "NET");

    if (mode === "fetch-slirp") {
      return {
        net_device: {
          type: card,
          relay_url: "fetch"
        }
      };
    }
    if (relayUrl) {
      return {
        network_relay_url: relayUrl
      };
    }
    return {
      net_device: {
        type: card
      }
    };
  }

  export function wireNetworkEvents(emu) {
    if (S.lanChannel) {
      try { S.lanChannel.close(); } catch (e) {}
      S.lanChannel = null;
    }
    const mode = $("net-mode").value;
    if (mode === "lan-mesh" && typeof BroadcastChannel === "function") {
      S.lanChannel = new BroadcastChannel("wasm-os-lan-mesh");
      S.lanChannel.onmessage = (ev) => {
        if (ev.data && S.emu && S.emu.bus) {
          S.g.rxBytes += ev.data.length || 0;
          S.emu.bus.send("net0-receive", ev.data);
        }
      };
      logNet("Joined BroadcastChannel('wasm-os-lan-mesh') virtual switch.");
    }

    emu.add_listener("net0-send", (frame) => {
      const len = frame ? frame.length : 0;
      S.g.txBytes += len;
      if (S.g.txBytes < 4096 || S.g.txBytes % 16384 < len) {
        logNet(`TX Ethernet Frame (${len} B) | Total TX: ${(S.g.txBytes / 1024).toFixed(1)} KB`);
      }
      if (S.lanChannel && frame) {
        S.lanChannel.postMessage(frame);
      }
      scheduleRender();
    });

    emu.add_listener("net0-receive", (frame) => {
      const len = frame ? frame.length : 0;
      S.g.rxBytes += len;
      if (S.g.rxBytes < 4096 || S.g.rxBytes % 16384 < len) {
        logNet(`RX Ethernet Frame (${len} B) | Total RX: ${(S.g.rxBytes / 1024).toFixed(1)} KB`);
      }
      scheduleRender();
    });
  }

  // ====================================================================