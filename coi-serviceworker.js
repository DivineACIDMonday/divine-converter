/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
/*  Aangepast voor Divine Converter op GitHub Pages */

let coepCredentialless = false;

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

if (typeof window === "undefined") {
  // ===== SERVICE WORKER KANT =====
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("fetch", function(event) {
    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
      return;
    }
    if (event.request.url.startsWith("chrome-extension://")) return;
    if (event.request.url.startsWith("blob:")) return;

    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
          newHeaders.set(
            "Cross-Origin-Embedder-Policy",
            coepCredentialless ? "credentialless" : "require-corp"
          );
          newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch(function(e) {
          console.error(e);
        })
    );
  });

  self.addEventListener("message", function(event) {
    if (event.data && event.data.type === "deregister") {
      self.registration
        .unregister()
        .then(function() {
          return self.clients.matchAll();
        })
        .then(function(clients) {
          clients.forEach((client) => client.navigate(client.url));
        });
    }
    if (event.data && event.data.type === "coepCredentialless") {
      coepCredentialless = event.data.value;
    }
  });

} else {
  // ===== PAGINA KANT — registreert de SW =====

  const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
  window.sessionStorage.removeItem("coiReloadedBySelf");

  const coi = {
    shouldRegister: () => !reloadedBySelf,
    shouldDeregister: () => false,
    coepCredentialless: () => true,
    coepDegrade: () => true,
    doReload: () => window.location.reload(),
    quiet: false,
  };

  // Als al cross-origin geïsoleerd — niks doen
  if (window.crossOriginIsolated !== false) {
    // Al goed
  } else if (!window.isSecureContext) {
    !coi.quiet && console.log("COOP/COEP Service Worker niet geregistreerd — veilige context vereist (HTTPS).");
  } else {
    if (coi.shouldDeregister()) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => {
          r.active && r.active.postMessage({ type: "deregister" });
        });
      });
    } else if (coi.shouldRegister()) {
      if (!("serviceWorker" in navigator)) {
        !coi.quiet && console.log("COOP/COEP Service Worker niet geregistreerd — ServiceWorker API niet beschikbaar.");
      } else {
        navigator.serviceWorker
          .register(window.document.currentScript.src)
          .then(function(registration) {
            !coi.quiet && console.log("COOP/COEP Service Worker geregistreerd", registration.scope);

            registration.addEventListener("updatefound", () => {
              !coi.quiet && console.log("Pagina herladen voor bijgewerkte COOP/COEP Service Worker.");
              window.sessionStorage.setItem("coiReloadedBySelf", "updatefound");
              coi.doReload();
            });

            // Stuur coepCredentialless instelling naar de worker
            if (registration.active) {
              registration.active.postMessage({
                type: "coepCredentialless",
                value: coi.coepCredentialless(),
              });
            }

            // Wacht tot controller actief is, herlaad dan
            if (!navigator.serviceWorker.controller) {
              navigator.serviceWorker.addEventListener("controllerchange", () => {
                !coi.quiet && console.log("Pagina herladen voor COOP/COEP Service Worker.");
                window.sessionStorage.setItem("coiReloadedBySelf", "notcontrolling");
                coi.doReload();
              });
            }
          })
          .catch(function(e) {
            !coi.quiet && console.error("COOP/COEP Service Worker registratie mislukt:", e);
          });
      }
    }
  }
}
