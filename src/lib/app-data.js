  const CategoriesContext = createContext({ categories: [], categoryColors: {} });
  const { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell } = Recharts;
  const LOGO_SRC = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAdAAAABgBAMAAABfzj7yAAAAMFBMVEUAAAD6+/s6smdCtm4XKCabnqRgY2orckxEwXUdUDVFR053e4U9wXEsNjgpVUU4O0Rr6xbsAAAAEHRSTlMC/Pv4YN7W2vmgsdv8irOZulZcpgAAD9VJREFUeNrdnH1sFGd+xz+zzK5vDXhnLpA0kCoud4dO4SR84aW9gJIl2EQQCGsd60i8XNYnoNK9Beg1Vf+5a6VW1bWRwl3zIiCtNwoQyTZ4KSGn2KYMKsk1PRL51EKbXF6cKxeuYLGzgNfYO/b0j2ded2fWNvFJ2M8/3nlmdub5Pr/f8/t+f7951jDZtp5p2SKTvF7e9/H0BDprcpf/7H9+Nzow84E+xvtDtxKfzXTXlfcNtOVhYKa77ksXf6fnAFOf0UCfMC7WFJRbwOZ/n5ZA5YldNXYlkZcUgNrp6bkBQNfdP6CBvKbuZddr/6E1J6mQB4bqpydQqRzmbM2Zg8021D+5ouiSIoBKf6jNBKC7Or1HTVcEqEd1yZQQQPl4BlhU3lRmLXmJ6PjqiOW4SG0PT38JWIET40ISgA8yDqdEmfZAK3GCcQGAsaLdYe6b/kB3BEUZ424AnnvK7ihNe6BNucALSlsAhgsO8ukONHY+5IrTPslXq093oB1uX2NTekuje/gAUJewj1LTXBlFM3a0KT7UASC/1qKInhHgb/dbB0b9NLfoRts1G0ZETDLSsyzj9YLc5izZ3DQFagsGVfwZHKnQSdErEPkjxRYMH01vizaLP3EfTg7tBzYAi818XnQlmNZAo8Jdo+VVkqdSyFmo2QqSqSDBC9MbqFih8gMVp19NrgJ+mgVF11VTkiLTFegsgJiw5KbKQDP2m7v6kS/dglvENqz8lfLGVJfGaluXLfv6exO8+KOlxX1vfA56WdUHEM0GnC9q8LAQCQcf/jNTHw2/0/WnddTvNExyAEMdEy1zAEejt258nqgrQu4nSsg1XzIBpNH+miUjN/tDLhqcI74+smJyibmkgHy1ovvR8udE34dIPcx/5/bX6GwA6sJwRp5SAJR6htcYIcJIbr3P+nqsL/P7qHxwKKhzkkBXAvDXYZc884oOIGnw/M5gYSQfc5e3dGIqkJrlHZmgzkkCVXwasLzFe4SltgPDl4KF0Q7fl0/cicI/ArUawENhV3xDNxUgsQfgnwMXYHmGt+TOBDoEQJiGlXUToPYbAFwPZIjyDK+YuiOBZgHmhF1gfIqkQ2x/+D2erOg5m7wT07SMAiz735ALmrX+r+uY18JvEQtwBm1KBne38IxcibyS+tHnBTpXBgiLH1GNujySOrc/9BbbLKBmcnf0YK/4PP/qFNCL8ojIJB6ZihKOzK05rqqvbNtzSIqekMJNVGvhbLqSyzmVfnNKLPqTKV2jq+0qQiiKj6WxzvA7/LH4s7ZdA+g+mQR49g4MRvXVKkG/AJA++e8qBRShiOrsqTB6k1VIeVJNn1qgOkDICpRF9Ky7F/h1SCjSAORPnY4br4tk/Y6Luhoge5bg5oJ7YEeAfpBXBt9AZD6rPJG3lHrdkwc98QfEf+Vf4fK3N8SOv1wxkm+nuy5OKlrLL4xdvvt7E41utTVA3M0ym86zOetyi0haByA6Z2ngKE5kKE8/Yhsc2L9+RgNoavecPvI9cF9K2tnLhdUAr9pFurWfUPnibtb93uzlsQ8VwPyX+wDYF+1IjdlkH79XpDtWJtQQzUUiBkDRHeR5OGUf2O9KPwQ2ErhO5QyUv6cYyTk5zUpxh5673bOtwgbGsa0+FblaiOYtE7bnzwYx8/l8oe2HYuCdC87ea58bzii1cUfirDzbW+qPmACukLkKOLlYi8WlCsS04NggSivBskkedSxbmlepi3/u2SXgvCc4nZ1gSvNo4TNTB9VsEyr8P8xi/rh9MpnVY4YTd9rzefUeYVEnFZXrAd4SBwlrTBuAbSFqeMQ1a2VO48lwR61L6jy6uMaN9a5LPDMxe8aLOVWRVDUP2buSgKaiOAvoIVS9aK+0uIKkpyJJn0VE9DHEqB60wGdhbs4zG962Jlwe+HOabvHn3wKFYpN771L/hIA+XdLzhYSpK5DIDgNRU5ck2zOPkpecAs0YQF+k3mdRq74rClB9VlwFlhNS2akHhOaoaP6cZkgMwqf27fmN3efpXF7G0IGtphtFQddNXQXzyn4YhTxWwUpWnLofYOiYpuYvX9rRp5TBfbetW8+cHUrqqWp8b3qHbd2zMenz+GKuWhElqO3VdbNw725Vbc1LOsphMHQwrfvUpsBU7C1uSWAXkazXVi32h3/FeR0zS7OcbCjoiZpd5ghpTUv1/AoAzjm2H1za0WWk4Au+yJVOC2sbyfGVUbxHNXXzsYK6ICGZYD6XFGO3Qt7NrNd7VgDHiHitkXBm9kbSkjyCW6pleaHVylnA5nYNuvOOpeoBeUSDG22XWOa5eP3Vgwe7UuN5rBNszLykqDv+rvfkD76sgP7nDfBL4JuuDdGjliO3KzDg3/T4oPvxvzjkckv45MaqjMZIOdIjacc53Y2wsy95bho9CvDqRHPZfyqou6RCPcCbrcDIOfG1Q3Ys8tC5rICUEtawl0Wfhw7kPRa3ZAFSIU83aqqsqsOmTYo5BUha90hafuNd8+IpRkMfkNDtlf0XnvE86/Xnennxj5dYrrZ3aV7NZ84jZ7KS9YxV4sy8fuFYOok+n0V9O2s2udwyXvtCSH/J8DF9lZVsP+UdfLGgs6Mj3dHRkX68o8fyZ6VW3MX4+bD9GsPIYCqvJBnNYYqwKCeQFMeRS8JLvEA3BnDcqgmEwOK4V8S8LnkuYErsO+k+VjZFiGnJoGeF50mxNymmVVWN/sCl1Iwu0YCh24RVK2EWsHcrrNHhSUvCRT0JV1nLTUmO5LO5VFk5cyJi9TzWxKx7u3lhLzDn1fk7bRV6QiGuwVaJuAJwUxfvcfWkdW/lkAVU1Be2WcFyf1nknDq8IqIafRVI+ys+BDf1W7OdTZnGsZjFR00SMRl+gdRyNGeFvogEtQ2WKtEN7z6juRaYr+3y3Ll3IqMffwuv5AMiXfh+WNGwesQdW/PM2155cyFrqzNpK5wxM/NX5YCjJtLAHss8sgnSHohkyqRXnTbixh+biqpz263wIHM0nU6n0+k1+NancdjxO6oQcUWru+hXZ8aeDMB3gWGIZka66QcaUaKpHBR3WvSYyEEkZ1Ncn6PS3Zxwg3ckNWGCIbTkNzj3u729vb29vWfLEy3jWMtEHL02S3t7uzPT12sAmtIDn+3aogNIJ3YCZgpKMHrtbzRZAzmmUOo7oyDNEjMAGkT2W8O1uKU2C6VkWdQXzjkUlqWFlVyz9wWJCKv1LEyOXx0rZmhpaXHoM6rB4Jn2g19Z0jl7rTDHsS3O4oh/qnAViKbQ27QapETJCrovgZCAq1xuWQHQRRm33ArDY1SmJK7f7w3oPOKS0sVxgX7stg8t/tv0XgPyAmmBsvGQkNCnW5LRLt08zLqbGqYMDGdhDiXglSSkQXoSiGhi0VrcIucCucUMhZN0crWQSSh3geWeItokQ3ZMY/vh40BRGTqZonssCdDTt3nFlqbVzb9UoPFhGdagsxujYBbmN8DfW+wVkQWHbPMxd4OPW6wxK6FV3UDyiQYHsJ7nnY9vTRLoKrZH/+oUGJAfzkFBFMulnvaDB49rQO2wvkzAGgBNAVEuiNdbfPOsyy0N3pzZ5ZZsqEX3hEp7UeSTj6TT6bS3DrZthS3mjVzVqlBlSvifLyoiauiS0Q8YJ31OYb6/WC/BAfF2PgNX5hEHhvYAcpxoBpb3WdxiZWmFeog3+H04UPU2KIRsVs4owNrODQAJr9LslrdYZf2dkzJoovn+H9s47alqO+LWdc3U5rwkJbVYETMDZxogyhgw7yMgUuAhl6gdvrsribzYT+hyIJlHCSkxyAoQ7wwylHFoTBi1ZlJAC9mkM9dmSbP9w6GI/dm3dEVPxa0B16RQfoKhS0IURWjMOevJ3WlkdC27qvmlT3AyNgbA25XkGgFYF1IeKZjPu9KTCddR7BE1myK+AnSffOER4Oa3rmb4sqrH94+l4B6glDNpTb6AyWUxnqtAp10lDBZ/JRdSRWhNApT6fGXOnG3EcOm6LcttvPOU7FWhqP/ojGBrLr8sX/op8KcmxXmlnFWdLqJHU5ckpJQAqkEsE8AtnrYaQn9OqfskFEAst7vcBAFaY0s4AY9bwV6Knt/ufFeW6RX2zemmkr6oWzOogfz8UcXSfBG7PE+VH0AoVTIowRFDnrOPiyJiYDCV9epOOrEXyNGUSxAwtvTBL90PwBkJjh+SLC7YBkVDMTE1G6hc7+OWynCnhQZdGBEze8qZ4FYNznjlhLfEKy2eimRv9ASY73lKnwkxQTVPwUAXkgB6BviipCOysQgwio9bKsNd1QxD2Mi4YC3TXTngep+nvO28ZgW2l+Z6bafdHlBjEPitlTfXdJnoYlNNKSfppuMVNQqSrsMxB2iqjFvKW2tVp3rHjkqxRhqLzZ2WKSWA0+Lcu47n5pB3uOv+tnc6LAR4TVTBF0r2CsTQQZEw73FXYsIOLhFH5kbDymBCNa0OrRhZ8yTNfld9d6Fd6RNB+mYGoCnpXZivtySB2r6w2v94GQ3AuQyYA5eTsP5pTJCsoLBXTN1lAbuAaZXtBdCxSm7xtZvjlM2PBKiFnMU7J1q+s/vUeb8s7Olr2b1rCDtXnGTQVQCGcxKYxvVFiz7oAthp1Wa7QDctPhFxUpeKfTZQ6x1AKJKUnQqGtJFKXXTIWRA9r3VsL1PGSD0dnUpVLxm3qQnEz+pNJKg94KczKzRsE5OjOWs0V7VaIiCOVHnq8cDwv7Mim6uQirdfcjvrNbPyYr8bfwDTsu8Zr8NFgHjVpGljeRG/MiovL+voLmdlO+E77nObObdPMIbqoerC8fL6sDdR3OECLSb9VY4Ag8r11R7b85zvsK2hnJa/Zg/J9zLgJLcbjOB0wfVAd0OmoYNQuji0abhALRd6q4pBx/nVaMa7x2KtNWNnnGD7iLPARwY91zXcptQF4EUHqXKP27vXDboWbGmPB6jwISNIE6zRqoomJ/pccpbMN53tdG9aSNd71uLIoA1/fWc1KFKg6HxFcTqHPiuoAFLUK3SOtaqqWwZ4QlJVxRcIWlVVVVW18s4xcWLB+LM9d1ezqqrzW7w6fe4pVVXnfx84Qk/Ocjp5V7OqqlE7VsV6enq63efN7ul5AyB+4ED/X1bUdesOHLjkcthLixYtWvRD3xXxA9cu/8gZwhMHrl37vyA888uzCbk5bAYCW2MloTYGJSjBvb/fZvmKtUUs+oCPLu2ft9f+lmnfLKBRK9TXfsWDVB611ntbavoDjfhrrMULLs+v26R4+H+GWJSYI7DzO18GWFfrqI/N2RkElIJHEtxMlTwaq+5TZhJQZ0FWhMgl2kwA6lSWjbDXuY/PCJyeN96D5wIvWJudETh98rE1IG2KXpkZOH3bbwLocsbg9G+Rayvf6N00Y3CW15Ev+KobaztnDM7y//S45IZr1KalMwhnwJsB+TdPl3LRlPqBxkxq/w+Wg/PDNj+9gwAAAABJRU5ErkJggg==";
  const SCHEMA_VERSION = 7;
  const DEFAULT_ALERT_THRESHOLD = 1500;
  const APP_VERSION = CF_VERSION;
  function migrateData() {
    let storedVersion = 0;
    try {
      storedVersion = parseInt(localStorage.getItem("cf_schema_version") || "0");
    } catch (e) {
    }
    if (storedVersion >= SCHEMA_VERSION) return;
    // Fresh install: nothing to migrate — just stamp the schema version.
    // Running the steps anyway persists empty arrays (cf_categories = []),
    // which shadows the useLS defaults forever: a new user would get an empty
    // category list and couldn't fill the entry form's required Category field.
    let isFresh = false;
    try {
      isFresh = storedVersion === 0 && localStorage.getItem("cf_entries") == null && localStorage.getItem("cf_categories") == null;
    } catch (e) {
    }
    if (isFresh) {
      try {
        localStorage.setItem("cf_schema_version", String(SCHEMA_VERSION));
      } catch (e) {
      }
      return;
    }
    const readJSON = (key, fallback) => {
      try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
      } catch (e) {
        return fallback;
      }
    };
    const write = (key, val) => {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {
      }
    };
    if (storedVersion < 1) {
      const entries = readJSON("cf_entries", null);
      if (Array.isArray(entries)) {
        let uid = Date.now();
        const fixed = entries.map((e) => ({
          id: e.id != null ? e.id : ++uid,
          desc: typeof e.desc === "string" ? e.desc : "Untitled",
          type: e.type === "income" ? "income" : "expense",
          amount: isFinite(Number(e.amount)) ? Math.abs(Number(e.amount)) : 0,
          startDate: typeof e.startDate === "string" && e.startDate ? e.startDate : localDateStr(/* @__PURE__ */ new Date()),
          repeats: !!e.repeats,
          recurEvery: parseInt(e.recurEvery) > 0 ? parseInt(e.recurEvery) : 1,
          recurUnit: ["day", "week", "month", "year", "semimonth"].includes(e.recurUnit) ? e.recurUnit : "month",
          recurDays: Array.isArray(e.recurDays) ? e.recurDays : [],
          recurEnd: typeof e.recurEnd === "string" ? e.recurEnd : "",
          category: typeof e.category === "string" && e.category ? e.category : "Uncategorized",
          notes: typeof e.notes === "string" ? e.notes : "",
          monthlyAmounts: e.monthlyAmounts != null ? e.monthlyAmounts : null
        }));
        write("cf_entries", fixed);
      }
    }
    if (storedVersion < 2) {
      const entries = readJSON("cf_entries", []);
      const cats = readJSON("cf_categories", null);
      if (Array.isArray(entries) && (Array.isArray(cats) || entries.length > 0)) {
        const used = entries.map((e) => e.category).filter(Boolean);
        const merged = [.../* @__PURE__ */ new Set([...cats || [], ...used])].sort((a, b) => a.localeCompare(b));
        // never persist an empty list over the useLS default
        if (merged.length > 0) write("cf_categories", merged);
      }
    }
    if (storedVersion < 3) {
      const entries = readJSON("cf_entries", []);
      if (Array.isArray(entries)) {
        const fixed = entries.map((e) => __spreadProps(__spreadValues({}, e), {
          monthlyAmounts: e.monthlyAmounts != null ? e.monthlyAmounts : null
        }));
        write("cf_entries", fixed);
      }
      const ovr = readJSON("cf_overrides", {});
      if (ovr && typeof ovr === "object") {
        const cleaned = {};
        Object.keys(ovr).forEach((year) => {
          cleaned[year] = {};
          const yearOvr = ovr[year] || {};
          Object.keys(yearOvr).forEach((evId) => {
            var _a;
            const o = yearOvr[evId] || {};
            cleaned[year][evId] = {
              amount: isFinite(Number(o.amount)) ? Number(o.amount) : void 0,
              notes: typeof o.notes === "string" ? o.notes : void 0,
              _savedAt: (_a = o._savedAt) != null ? _a : null,
              _history: Array.isArray(o._history) ? o._history : []
            };
            Object.keys(cleaned[year][evId]).forEach((k) => {
              if (cleaned[year][evId][k] === void 0) delete cleaned[year][evId][k];
            });
          });
        });
        write("cf_overrides", cleaned);
      }
    }
    if (storedVersion < 4) {
      try {
        const correct = localStorage.getItem("cf_budgettargets");
        const typo = localStorage.getItem("cf_budgtargets");
        if (!correct && typo) {
          localStorage.setItem("cf_budgtargets", typo);
          localStorage.removeItem("cf_budgettargets");
        }
        const targets = readJSON("cf_budgtargets", null);
        if (targets && typeof targets !== "object") {
          write("cf_budgtargets", {});
        }
      } catch (e) {
      }
    }
    if (storedVersion < 6) {
      // GitHub Gist sync was removed — clear its stored credentials/state.
      try {
        localStorage.removeItem("cf_gist_token");
        localStorage.removeItem("cf_gist_id");
        localStorage.removeItem("cf_last_snapshot");
      } catch (e) {
      }
    }
    if (storedVersion < 7) {
      // Receipts are per-occurrence only now: move any entry-level attachment
      // onto the entry's start-date occurrence so the image is kept.
      const entries = readJSON("cf_entries", null);
      if (Array.isArray(entries) && entries.some((e) => e && e.attachment)) {
        const ovr = readJSON("cf_overrides", {});
        const res = moveEntryAttachmentsToOverrides(entries, ovr && typeof ovr === "object" ? ovr : {});
        write("cf_entries", res.entries);
        write("cf_overrides", res.overridesByYr);
      }
    }
    try {
      localStorage.setItem("cf_schema_version", String(SCHEMA_VERSION));
    } catch (e) {
    }
  }
  migrateData();
  let _lastStorageErrorToastAt = 0;
  function notifyStorageWriteFailure(err) {
    const now = Date.now();
    if (now - _lastStorageErrorToastAt < 5e3) return;
    _lastStorageErrorToastAt = now;
    const isQuota = err && (err.name === "QuotaExceededError" || err.code === 22 || err.code === 1014 || /quota/i.test(err.message || ""));
    toast(
      isQuota ? "Couldn't save \u2014 your browser's storage is full. Export a backup, then clear old data (Settings \u2192 Data Backup & Restore)." : "Couldn't save your changes. Please try again, or export a backup from Settings.",
      "error"
    );
  }
  function useLS(key, init) {
    const [val, setVal] = useState(() => {
      try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : typeof init === "function" ? init() : init;
      } catch (e) {
        return typeof init === "function" ? init() : init;
      }
    });
    const set = useCallback((v) => {
      setVal((prev) => {
        const next = typeof v === "function" ? v(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch (err) {
          notifyStorageWriteFailure(err);
        }
        return next;
      });
    }, [key]);
    return [val, set];
  }
  function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
      try {
        return window.matchMedia(query).matches;
      } catch (e) {
        return false;
      }
    });
    useEffect(() => {
      let mq;
      try {
        mq = window.matchMedia(query);
      } catch (e) {
        return;
      }
      const onChange = () => setMatches(mq.matches);
      onChange();
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else mq.addListener(onChange);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener("change", onChange);
        else mq.removeListener(onChange);
      };
    }, [query]);
    return matches;
  }
  const useIsMobile = () => useMediaQuery("(max-width: 768px)");
  const useIsPhone = () => useMediaQuery("(max-width: 480px)");
  const useIsCoarsePointer = () => useMediaQuery("(pointer: coarse)");

  // ── Biometric unlock (WebAuthn platform authenticator) ──────────────
  // This is a *local device unlock*, not a replacement for Supabase auth:
  // there's no relying-party server to verify the assertion against, so a
  // successful ceremony only proves "the same fingerprint/face that
  // registered this device is present right now." It gates re-entry after
  // the auto-lock timeout; it never signs anyone in or out of Supabase.
  function b64urlEncode(buf) {
    const bytes = new Uint8Array(buf);
    let str = "";
    for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    const bin = atob(str);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function randomChallenge() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return arr;
  }
  async function isBiometricAvailable() {
    try {
      if (!window.PublicKeyCredential || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false;
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  }
  function getBiometricCredId(userId) {
    try {
      return localStorage.getItem("cf_webauthn_" + userId);
    } catch (e) {
      return null;
    }
  }
  async function registerBiometric(userId, email, fullName) {
    const cred = await navigator.credentials.create({
      publicKey: {
        rp: { name: "CashFlow" },
        user: {
          id: new TextEncoder().encode(userId),
          name: email,
          displayName: fullName || email
        },
        challenge: randomChallenge(),
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
        timeout: 6e4,
        attestation: "none"
      }
    });
    if (!cred) throw new Error("No credential returned.");
    const credId = b64urlEncode(cred.rawId);
    try {
      localStorage.setItem("cf_webauthn_" + userId, credId);
    } catch (e) {
    }
    return credId;
  }
  function clearBiometric(userId) {
    try {
      localStorage.removeItem("cf_webauthn_" + userId);
    } catch (e) {
    }
  }
  async function verifyBiometric(userId) {
    const credId = getBiometricCredId(userId);
    if (!credId) throw new Error("No biometric unlock set up on this device.");
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: [{ id: b64urlDecode(credId), type: "public-key" }],
        userVerification: "required",
        timeout: 6e4
      }
    });
    if (!assertion) throw new Error("Verification failed.");
    return true;
  }
  const LIGHT = {
    navy: "#1C2B3A",
    navyMid: "#243447",
    navyLt: "#2D4057",
    bg: "#F7F4EF",
    bgCard: "#FFFFFF",
    green: "#2ECC8A",
    greenDk: "#27AE73",
    greenLt: "#EAFBF3",
    red: "#E85D4A",
    redLt: "#FFF0EE",
    amber: "#F5A623",
    amberLt: "#FFF8EC",
    text: "#1C2B3A",
    textMid: "#5A6A7A",
    textLt: "#66798C",
    border: "#E8E4DD",
    stripe: "#F7F4EF",
    headerBg: "#1C2B3A",
    headerText: "#ffffff",
    inputBg: "#F7F4EF",
    doneBg: "#EAFBF3",
    shadowSm: "0 1px 3px rgba(28,43,58,0.06), 0 1px 2px rgba(28,43,58,0.04)",
    shadowMd: "0 4px 12px rgba(28,43,58,0.08), 0 2px 4px rgba(28,43,58,0.04)",
    shadowLg: "0 12px 32px rgba(28,43,58,0.12), 0 4px 8px rgba(28,43,58,0.06)",
    shadowXl: "0 24px 60px rgba(28,43,58,0.18)",
    accent: "#2F6FED",
    accentLt: "#EAF1FE",
    // Chip text = category hue mixed toward white by (100% - chipKeep).
    // Light surfaces keep the full hue; dark surfaces lighten it so deep
    // hues (indigo, dark red) stay readable on dark cards.
    chipKeep: "100%",
    // Interactive fills (active pills, primary buttons, FAB). Same as the brand
    // navy in light mode; dark mode needs its own value because there the navy
    // doubles as a surface color and active states would vanish into it.
    primary: "#1C2B3A"
  };
  const DARK = {
    navy: "#0F1923",
    navyMid: "#162230",
    navyLt: "#1E3045",
    bg: "#111921",
    bgCard: "#1A2535",
    green: "#2ECC8A",
    greenDk: "#27AE73",
    greenLt: "#16291F",
    red: "#E85D4A",
    redLt: "#2A1515",
    amber: "#F5A623",
    amberLt: "#2A2010",
    text: "#E8EDF2",
    textMid: "#8FA3B8",
    textLt: "#7A93AC",
    border: "#243447",
    stripe: "#1E2D3E",
    headerBg: "#0F1923",
    headerText: "#ffffff",
    inputBg: "#162230",
    doneBg: "#16291F",
    shadowSm: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
    shadowMd: "0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.25)",
    shadowLg: "0 12px 32px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3)",
    shadowXl: "0 24px 60px rgba(0,0,0,0.6)",
    accent: "#5B8DEF",
    accentLt: "#1A2942",
    primary: "#4E729C",
    chipKeep: "60%"
  };
  const YEAR_COLORS = ["#2F5496", "#E85D4A", "#27AE73", "#F5A623", "#8E44AD", "#16A085"];
  const GLOBAL_STYLES = `
        @font-face{font-family:'Inter';font-style:normal;font-weight:400;font-display:swap;src:url('fonts/inter-var.woff2') format('woff2');}
        @font-face{font-family:'Inter';font-style:normal;font-weight:500;font-display:swap;src:url('fonts/inter-var.woff2') format('woff2');}
        @font-face{font-family:'Inter';font-style:normal;font-weight:600;font-display:swap;src:url('fonts/inter-var.woff2') format('woff2');}
        @font-face{font-family:'Inter';font-style:normal;font-weight:700;font-display:swap;src:url('fonts/inter-var.woff2') format('woff2');}
        @font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:400;font-display:swap;src:url('fonts/plexmono-400.woff2') format('woff2');}
        @font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:600;font-display:swap;src:url('fonts/plexmono-600.woff2') format('woff2');}
        @font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:700;font-display:swap;src:url('fonts/plexmono-700.woff2') format('woff2');}
        *{box-sizing:border-box;} html{scrollbar-gutter:stable;-webkit-text-size-adjust:100%;text-size-adjust:100%;}
        /* \u2500\u2500 Shared form primitives (replaces 4 near-duplicate inline lbl/inp objects) \u2500\u2500 */
        .field-label{font-family:Inter,sans-serif;font-size:12px;font-weight:600;color:var(--textMid);
          display:block;margin-bottom:6px;}
        .field-input{font-family:Inter,sans-serif;font-size:13px;padding:9px 12px;
          border:1.5px solid var(--border);border-radius:8px;
          background:var(--inputBg);color:var(--text);outline:none;width:100%;box-sizing:border-box;}
        .field-input:focus{border-color:var(--navy);}
        .field-input.field-error{border-color:var(--red);background:rgba(232,93,74,0.08);}
        .field-input--mono{font-family:'IBM Plex Mono',monospace;}
        .field-error-text{font-family:Inter,sans-serif;font-size:11px;color:var(--red);margin-top:4px;}
        .field-hint-text{font-family:Inter,sans-serif;font-size:10px;color:var(--textLt);margin-top:4px;}

        /* \u2500\u2500 Shared component classes (replaces repeated inline styles) \u2500\u2500 */
        .cf-card{background:var(--bgCard);border-radius:14px;border:1px solid var(--border);
          box-shadow:var(--shadowSm);padding:20px 24px;transition:box-shadow 0.2s ease, transform 0.2s ease;}
        .cf-card--flush{padding:0;overflow:hidden;}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:2000;
          display:flex;align-items:center;justify-content:center;padding:16px;}
        .skip-link{position:absolute;left:-9999px;top:0;z-index:3000;
          background:var(--primary);color:#fff;padding:10px 18px;border-radius:0 0 8px 0;
          font-family:Inter,sans-serif;font-size:13px;font-weight:600;text-decoration:none;}
        .skip-link:focus{left:0;}
        /* Typography */
        .cf-text-ui{font-family:Inter,sans-serif;}
        .cf-text-mono{font-family:'IBM Plex Mono',monospace;}
        .cf-text-mono-13{font-family:'IBM Plex Mono',monospace;font-size:13px;}
        .cf-section-title-text{margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--textLt);}
        .cf-text-label{font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:var(--textMid);
          letter-spacing:0.06em;text-transform:uppercase;}
        /* Buttons */
        .cf-btn{font-family:Inter,sans-serif;font-size:13px;font-weight:600;padding:9px 18px;
          border-radius:8px;border:none;cursor:pointer;transition:filter 0.15s;}
        .cf-btn--primary{background:var(--primary);color:#fff;}
        .cf-btn--secondary{background:transparent;color:var(--textMid);border:1px solid var(--border);}
        .cf-btn--danger{background:var(--redLt);color:var(--red);border:1px solid var(--redLt);}
        .cf-btn--danger-solid{background:var(--red);color:#fff;font-weight:700;padding:8px 18px;}
        .cf-btn:disabled{cursor:not-allowed;background:var(--border);color:var(--textMid);}
        .cf-btn--compact{font-size:11px;font-weight:600;padding:4px 10px;border-radius:5px;}
        .cf-btn--sm{font-size:11px;padding:6px 12px;}
        /* Layout helpers */
        .cf-row{display:flex;align-items:center;}
        .cf-row-between{display:flex;align-items:center;justify-content:space-between;}
        .cf-col{display:flex;flex-direction:column;}
        .cf-gap-6{gap:6px;}
        .cf-gap-8{gap:8px;}
        .cf-gap-10{gap:10px;}
        .cf-gap-12{gap:12px;}
        .cf-gap-14{gap:14px;}
        .cf-wrap{flex-wrap:wrap;}
        .flex-1{flex:1;}
        .min-w-0{min-width:0;}
        .cf-page{max-width:1160px;width:100%;margin:0 auto;}
        /* Spacing scale — dedupes the most repeated one-off margin/padding
           values found across components (audit round 6, inline-style pass) */
        .mb-0{margin-bottom:0;}
        .mb-5{margin-bottom:5px;}
        .mb-6{margin-bottom:6px;}
        .mb-8{margin-bottom:8px;}
        .mb-12{margin-bottom:12px;}
        .mb-14{margin-bottom:14px;}
        .mb-16{margin-bottom:16px;}
        .mb-20{margin-bottom:20px;}
        .mt-2{margin-top:2px;}
        .mt-4{margin-top:4px;}
        .pb-28{padding-bottom:28px;}
        .lh-15{line-height:1.5;}
        /* Bare text-color utilities — no font-size, so they compose safely
           with whatever type context they're used in */
        .c-text{color:var(--text);}
        .c-textMid{color:var(--textMid);}
        .c-textLt{color:var(--textLt);}
        .c-greenDk{color:var(--greenDk);}
        .c-red{color:var(--red);}
        .table-collapse{width:100%;border-collapse:collapse;}
        /* Compound type styles that recur as a unit (extends the existing
           .tx/.txm/.txl/.lbl/.hint scale from round 3) */
        .tx-sb{font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:var(--text);}
        .txm-11{font-family:Inter,sans-serif;font-size:11px;color:var(--textMid);}
        .text-9{font-size:9px;}
        /* Table header row (dark navy bg, used under .th cells) */
        .thead-row{background:var(--navy);}
        .kpi-tile{padding:12px 14px;}
        .today-line-strip{flex:1;height:2px;background:var(--amber);border-radius:1px;}
        .modal-title-lg{font-size:15px;font-weight:700;color:var(--text);margin-bottom:18px;}
        .hidden{display:none;}
        /* .cf-btn size modifiers beyond --sm/--compact, for the sizes that
           recurred as one-off style overrides */
        .cf-btn--xs{font-size:11px;padding:5px 12px;border-radius:6px;}
        .cf-btn--md{font-size:12px;padding:7px 14px;}
        .cf-btn--wide{font-size:12px;padding:10px 18px;}
        .cf-btn--action{font-size:12px;font-weight:700;padding:8px 18px;}
        /* Generic one-off utilities (page-by-page inline-style migration) */
        .fw-600{font-weight:600;}
        .justify-end{justify-content:flex-end;}
        .relative{position:relative;}
        .inline-block{display:inline-block;}
        /* ── primitives.js ── */
        .cat-chip{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;
          padding:2px 7px;border-radius:10px;white-space:nowrap;}
        .sparkline-svg{display:block;overflow:visible;}
        .fab-panel-title{font-size:14px;font-weight:700;color:var(--text);margin-bottom:16px;}
        .fab-menu-backdrop{position:fixed;inset:0;z-index:-1;}
        .template-picker-btn{font-size:11px;padding:5px 12px;display:flex;align-items:center;gap:5px;}
        .template-item{display:block;font-size:12px;}
        .template-item-amount{color:var(--textLt);margin-left:8px;}
        .empty-state-icon{font-size:26px;margin-bottom:8px;}
        .month-picker{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
        .chart-toggle-group{display:flex;gap:2px;}
        .chart-tip{background:var(--primary);border-radius:12px;padding:11px 15px;
          box-shadow:var(--shadowLg);min-width:160px;border:1px solid rgba(255,255,255,0.08);}
        .chart-tip-label{font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;font-weight:600;}
        .chart-tip-row{display:flex;justify-content:space-between;gap:16px;margin-bottom:2px;align-items:baseline;}
        .chart-tip-name{font-size:12px;color:rgba(255,255,255,0.6);}
        .chart-tip-value{font-weight:600;}
        .chart-tip-pct{font-size:11px;font-weight:400;color:rgba(255,255,255,0.45);}
        .confirm-dialog-card{padding:24px;width:min(400px,calc(100vw - 32px));}
        .confirm-dialog-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:12px;}
        .confirm-dialog-message{font-size:14px;color:var(--textMid);margin-bottom:24px;line-height:1.6;}
        .toggle-row{display:flex;align-items:center;gap:10px;user-select:none;}
        .toggle-label{font-size:13px;color:var(--text);font-weight:600;cursor:pointer;}
        .shrink-0{flex-shrink:0;}
        .fw-700{font-weight:700;}
        .cf-btn--tiny{font-size:12px;padding:5px 12px;}
        /* ── App.js ── */
        .app-scroll{background:var(--bg);min-height:100vh;color:var(--text);display:flex;flex-direction:column;}
        .tab-bar-outer{background:var(--headerBg);padding:0 24px;padding-bottom:0;line-height:0;font-size:0;}
        .header-inner{max-width:1160px;margin:0 auto;display:flex;align-items:center;
          justify-content:space-between;height:64px;font-size:initial;line-height:initial;}
        .logo-area{display:flex;align-items:center;gap:12px;min-width:0;flex-shrink:0;}
        .header-logo-img{height:33px;object-fit:contain;display:block;image-rendering:auto;flex-shrink:0;}
        .year-pills-mobile{display:flex;gap:4px;align-items:center;}
        .year-pill-btn{font-weight:700;padding:4px 12px;border-radius:16px;border:none;
          cursor:pointer;color:#fff;transition:all 0.15s;}
        .header-search{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.08);
          border-radius:20px;padding:5px 12px;border:1px solid rgba(255,255,255,0.12);}
        .header-search-icon{color:rgba(255,255,255,0.4);flex-shrink:0;}
        .header-search-input{font-size:13px;background:transparent;border:none;outline:none;
          color:#fff;width:130px;caret-color:var(--amber);}
        .header-search-clear{background:transparent;border:none;cursor:pointer;
          color:rgba(255,255,255,0.5);font-size:14px;padding:0;line-height:1;}
        .alert-bell-btn{position:relative;border:1px solid;border-radius:8px;width:36px;height:36px;
          cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;
          font-size:17px;transition:all 0.15s;}
        .alert-bell-badge{position:absolute;top:-5px;right:-5px;color:#fff;border-radius:50%;
          width:16px;height:16px;font-size:9px;font-weight:700;display:flex;align-items:center;
          justify-content:center;line-height:1;}
        .user-avatar-btn{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,0.3);
          cursor:pointer;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;transition:background 0.15s;}
        .user-menu-backdrop{position:fixed;inset:0;z-index:1400;}
        .user-menu-panel{position:fixed;top:58px;right:12px;z-index:1500;background:var(--bgCard);
          border-radius:12px;box-shadow:var(--shadowXl);border:1px solid var(--border);
          width:min(240px,calc(100vw - 24px));overflow:hidden;}
        .user-menu-header{padding:14px 16px 10px;border-bottom:1px solid var(--border);}
        .user-menu-name{font-size:13px;font-weight:700;color:var(--text);}
        .user-menu-email{font-size:11px;color:var(--textLt);margin-top:2px;overflow:hidden;
          text-overflow:ellipsis;white-space:nowrap;}
        .cf-menu-item--bordered{border-bottom:1px solid var(--border);}
        .profile-modal-card{padding:28px;max-width:400px;width:100%;}
        .form-note-text{font-size:12px;color:var(--textLt);margin-bottom:14px;}
        .form-err-text{color:var(--red);font-size:12px;margin-bottom:10px;}
        .form-ok-text{color:var(--greenDk);font-size:12px;margin-bottom:10px;}
        .mt-6{margin-top:6px;}
        .tab-bar{display:flex;gap:2px;font-size:initial;line-height:initial;}
        .tab-bar-btn{font-size:13px;font-weight:600;padding:12px 18px;border:none;cursor:pointer;
          background:transparent;transition:color 0.15s,border-color 0.15s;}
        .tab-alert-dot{margin-left:6px;color:#fff;border-radius:10px;padding:1px 6px;
          font-size:10px;font-weight:700;}
        .tab-search-dot{margin-left:5px;display:inline-flex;}
        .backup-nudge{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:1450;
          background:var(--bgCard);border:1px solid var(--amber);border-radius:14px;padding:16px 20px;
          max-width:340px;width:calc(100vw - 32px);box-shadow:var(--shadowLg);}
        .backup-nudge-title{font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px;
          display:flex;align-items:center;gap:6px;}
        .backup-nudge-msg{font-size:13px;color:var(--textMid);margin-bottom:14px;line-height:1.5;}
        .ptr-indicator{position:fixed;top:52px;left:50%;transform:translateX(-50%);z-index:3000;
          background:var(--primary);color:#fff;border-radius:20px;padding:6px 16px 6px 12px;
          font-size:12px;display:flex;align-items:center;gap:8px;transition:opacity 0.2s;
          pointer-events:none;box-shadow:var(--shadowLg);}
        .ptr-spinner{display:inline-block;font-size:14px;}
        .content-area{padding:28px 24px;margin-top:0;outline:none;}
        .low-balance-banner{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-radius:10px;
          padding:10px 14px;margin-bottom:18px;font-size:13px;color:var(--text);}
        .low-balance-msg{flex:1;min-width:200px;}
        .app-footer{text-align:center;padding:18px 16px 28px;font-size:11px;
          color:rgba(255,255,255,0.25);background:var(--headerBg);margin-top:auto;}
        .footer-sep{margin:0 10px;}
        .justify-center{justify-content:center;}
        .field-input--spaced{letter-spacing:0.05em;}
        /* ── misc-ui.js ── */
        .receipt-lightbox{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,0.85);
          display:flex;align-items:center;justify-content:center;padding:20px;
          touch-action:pinch-zoom;cursor:zoom-out;}
        .receipt-lightbox-img{max-width:100%;max-height:100%;border-radius:10px;box-shadow:var(--shadowXl);}
        .receipt-lightbox-close{position:fixed;top:calc(14px + env(safe-area-inset-top));right:16px;
          width:38px;height:38px;border-radius:50%;border:none;cursor:pointer;
          background:rgba(255,255,255,0.15);color:#fff;font-size:18px;}
        .bottomnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;
          padding:7px 0 4px;border:none;cursor:pointer;background:transparent;font-size:9px;}
        .bottomnav-icon-wrap{font-size:17px;line-height:1;position:relative;display:inline-flex;
          align-items:center;justify-content:center;width:36px;height:24px;border-radius:12px;
          transition:background 0.15s;}
        .bottomnav-alert-dot{position:absolute;top:-2px;right:-6px;width:8px;height:8px;
          border-radius:50%;background:var(--amber);border:2px solid var(--bgCard);}
        .collapse-header-btn{display:flex;justify-content:space-between;align-items:center;gap:10px;
          width:100%;border:none;background:transparent;padding:0;font:inherit;text-align:left;
          cursor:pointer;user-select:none;}
        .collapse-header-title-wrap{display:inline-flex;align-items:center;gap:8px;min-width:0;}
        .collapse-arrow{font-size:10px;color:var(--textLt);transition:transform 0.15s ease;display:inline-block;}
        .collapse-summary{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--textLt);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .oem-card{padding:24px 24px 20px;width:min(460px,calc(100vw - 32px));max-height:90vh;overflow-y:auto;}
        .oem-header-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;}
        .oem-title{font-size:15px;font-weight:700;color:var(--text);}
        .oem-hint{font-size:12px;color:var(--amber);margin-bottom:18px;}
        .flex-55{flex:1 1 55%;}
        .flex-45{flex:1 1 45%;}
        .oem-attach-img{height:56px;border-radius:8px;border:1px solid var(--border);cursor:pointer;}
        .oem-remove-btn{font-size:12px;padding:6px 12px;border-radius:7px;border:1px solid var(--red);
          cursor:pointer;background:transparent;color:var(--red);}
        .attach-label{display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:8px 14px;
          border-radius:8px;border:1px dashed var(--border);cursor:pointer;color:var(--textMid);
          background:var(--inputBg);}
        .oem-footer-row{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap;}
        .oem-reset-btn{font-size:13px;padding:9px 16px;border-radius:8px;border:1px solid var(--amber);
          cursor:pointer;background:transparent;color:var(--amber);margin-right:auto;}
        .oem-save-btn{font-weight:700;padding:9px 24px;}
        .household-onboard-wrap{min-height:100vh;background:var(--headerBg);display:flex;
          flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:Inter,sans-serif;}
        .household-onboard-inner{width:100%;max-width:420px;}
        .household-onboard-header{text-align:center;margin-bottom:28px;}
        .household-onboard-logo{height:48px;margin-bottom:10px;}
        .household-onboard-email{font-size:13px;color:rgba(255,255,255,0.45);margin-top:4px;}
        .household-onboard-card{background:var(--bgCard);border-radius:16px;padding:32px;
          box-shadow:0 24px 64px rgba(0,0,0,0.4);border:1px solid var(--border);}
        .household-onboard-title{font-size:17px;font-weight:700;color:var(--text);margin-bottom:8px;text-align:center;}
        .household-onboard-subtitle{font-size:13px;color:var(--textMid);text-align:center;
          margin-bottom:20px;line-height:1.5;}
        .household-mode-btn{font-size:12px;font-weight:600;padding:4px 10px;border-radius:6px;
          border:none;cursor:pointer;}
        .household-onboard-error{margin-top:8px;margin-bottom:8px;}
        .household-submit-btn{width:100%;font-family:Inter,sans-serif;font-size:15px;font-weight:700;
          padding:12px;border-radius:8px;border:none;background:var(--primary);color:#fff;
          transition:opacity 0.15s;margin-top:8px;}
        .household-signout-wrap{text-align:center;margin-top:20px;}
        .household-signout-btn{font-size:12px;color:rgba(255,255,255,0.4);background:transparent;
          border:none;cursor:pointer;text-decoration:underline;}
        .text-center{text-align:center;}
        /* ── auth-misc.js ── */
        .shortcuts-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;
          display:flex;align-items:center;justify-content:center;padding:20px;}
        .shortcuts-card{background:var(--bgCard);border-radius:16px;padding:24px;max-width:380px;
          width:100%;box-shadow:var(--shadowXl);}
        .shortcuts-title{font-size:16px;font-weight:700;color:var(--text);}
        .shortcuts-close{background:transparent;border:none;cursor:pointer;font-size:20px;color:var(--textLt);}
        .shortcut-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0;
          border-bottom:1px solid var(--border);}
        .shortcut-kbd{font-weight:600;padding:3px 10px;border-radius:6px;background:var(--stripe);
          border:1px solid var(--border);color:var(--text);}
        .shortcuts-footer{font-size:11px;color:var(--textLt);margin-top:14px;text-align:center;}
        .feedback-toast{position:fixed;left:50%;transform:translateX(-50%);
          bottom:calc(84px + env(safe-area-inset-bottom));z-index:3000;cursor:pointer;color:#fff;
          font-size:13px;font-weight:600;padding:10px 20px;border-radius:24px;box-shadow:var(--shadowLg);
          display:flex;align-items:center;gap:8px;max-width:calc(100vw - 40px);}
        .toast-count-badge{opacity:0.7;font-weight:400;flex-shrink:0;}
        .undo-toast{position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));left:50%;
          transform:translateX(-50%);z-index:2500;background:var(--primary);color:#fff;border-radius:12px;
          padding:12px 20px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadowLg);
          font-size:13px;white-space:nowrap;animation:slideUp 0.25s ease-out;}
        .undo-btn{font-size:12px;font-weight:700;padding:5px 14px;border-radius:8px;
          border:2px solid rgba(255,255,255,0.4);cursor:pointer;background:transparent;color:#fff;}
        .undo-countdown{font-family:IBM Plex Mono,monospace;font-size:11px;color:rgba(255,255,255,0.5);min-width:12px;}
        .login-notconfigured-logo{height:48px;margin-bottom:20px;}
        .login-notconfigured-title{color:#fff;font-size:15px;font-weight:600;margin-bottom:8px;}
        .login-notconfigured-desc{color:rgba(255,255,255,0.55);font-size:13px;max-width:360px;line-height:1.6;}
        .login-header{text-align:center;margin-bottom:36px;}
        .auth-field-label{display:block;font-size:12px;font-weight:600;color:var(--textMid);
          text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;}
        .auth-input{width:100%;font-family:Inter,sans-serif;font-size:15px;padding:10px 14px;
          border:1.5px solid var(--border);border-radius:8px;background:var(--inputBg);color:var(--text);
          outline:none;box-sizing:border-box;}
        .auth-input--pw{padding:10px 44px 10px 14px;}
        .auth-pw-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);
          background:transparent;border:none;cursor:pointer;color:var(--textLt);padding:4px;display:inline-flex;}
        .remember-checkbox{width:15px;height:15px;cursor:pointer;accent-color:var(--primary);}
        .remember-label{font-family:Inter,sans-serif;font-size:13px;color:var(--textMid);cursor:pointer;}
        .auth-submit-btn{width:100%;font-family:Inter,sans-serif;font-size:15px;font-weight:700;
          padding:12px;border-radius:8px;border:none;background:var(--primary);color:#fff;
          transition:opacity 0.15s;}
        .login-footer-note{text-align:center;margin-top:20px;font-size:11px;color:rgba(255,255,255,0.3);}
        .lockscreen-wrap{position:fixed;inset:0;z-index:5000;background:var(--headerBg);display:flex;
          flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:Inter,sans-serif;}
        .lockscreen-inner{width:100%;max-width:380px;}
        .lockscreen-logo{height:44px;margin-bottom:16px;}
        .lockscreen-welcome{font-size:16px;font-weight:700;color:#fff;}
        .lockscreen-card{background:var(--bgCard);border-radius:16px;padding:28px;
          box-shadow:0 24px 64px rgba(0,0,0,0.4);border:1px solid var(--border);}
        .lockscreen-bio-icon{width:64px;height:64px;border-radius:50%;background:var(--accentLt);
          display:flex;align-items:center;justify-content:center;color:var(--accent);margin:0 auto 16px;}
        .lockscreen-primary-btn{width:100%;font-size:15px;font-weight:700;padding:12px;border-radius:8px;
          border:none;background:var(--primary);color:#fff;}
        .lockscreen-secondary-btn{width:100%;font-size:13px;font-weight:600;padding:10px;border-radius:8px;
          border:none;background:transparent;color:var(--textMid);cursor:pointer;}
        .selftest-wrap{max-width:640px;margin:40px auto;padding:0 20px;}
        .selftest-h2{color:var(--text);font-size:18px;margin-bottom:6px;}
        .selftest-count{font-size:13px;margin-bottom:18px;font-weight:700;}
        .selftest-row{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;}
        .selftest-mark{font-weight:700;width:18px;}
        .selftest-detail{color:var(--textLt);font-size:11px;}
        .selftest-back-link{display:inline-block;margin-top:20px;font-size:13px;color:var(--primary);}
        .budget-subtabs-row{display:flex;gap:8px;max-width:1160px;margin:0 auto 16px;
          flex-wrap:nowrap;-webkit-overflow-scrolling:touch;}
        .budget-subtab-btn{font-size:12px;font-weight:600;padding:7px 14px;border-radius:20px;
          border:none;cursor:pointer;white-space:nowrap;flex-shrink:0;}
        /* ── forms.js ── */
        .entry-form-card{margin-bottom:20px;background:var(--stripe);}
        .required-mark{color:var(--red);margin-left:2px;}
        .entry-form-row2{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;}
        .recur-summary-chip{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--navyLt);background:var(--stripe);border-radius:6px;padding:3px 8px;border:1px solid var(--border);}
        .entry-form-date-row{display:flex;gap:16px;align-items:flex-end;margin-bottom:12px;flex-wrap:wrap;}
        .min-w-160{min-width:160px;}
        .repeats-toggle-row{display:flex;align-items:center;gap:12px;padding-bottom:2px;}
        .recur-panel{background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:12px;border:1px solid var(--border);}
        .recur-panel-heading{font-size:11px;font-weight:700;color:var(--textMid);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;}
        .recur-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}
        .mb-10{margin-bottom:10px;}
        .mt-8{margin-top:8px;}
        .mt-10{margin-top:10px;}
        .mt-12{margin-top:12px;}
        .weekday-btn-row{display:flex;gap:3px;flex-wrap:wrap;}
        .weekday-btn{font-size:11px;font-weight:700;flex:1 1 auto;min-width:34px;height:32px;border-radius:6px;}
        .recur-hint{font-size:10px;color:var(--textLt);margin-top:4px;}
        .recur-hint-amber{font-size:10px;color:var(--amber);margin-top:4px;}
        .recur-semimonth-desc{font-size:13px;color:var(--textMid);margin-bottom:10px;}
        .monthly-toggle-wrap{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);}
        .monthly-amounts-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;}
        .month-amt-label{font-size:10px;color:var(--textLt);text-align:center;margin-bottom:3px;}
        .month-amt-input{font-size:12px;padding:6px 6px;border:1px solid var(--border);border-radius:6px;background:var(--inputBg);color:var(--text);width:100%;box-sizing:border-box;outline:none;}
        .entry-form-save-btn{padding:9px 22px;}
        .ef-save-template{font-size:12px;font-weight:600;padding:9px 14px;border-radius:8px;border:1px dashed var(--border);cursor:pointer;margin-left:auto;background:transparent;color:var(--textMid);display:inline-flex;align-items:center;gap:6px;}
        .csv-importer-card{background:var(--bgCard);border-radius:14px;padding:20px;margin-bottom:16px;border:1px solid var(--border);max-width:600px;}
        .csv-title{font-size:15px;font-weight:700;color:var(--text);}
        .csv-instructions{font-size:13px;color:var(--textLt);margin-bottom:12px;line-height:1.5;}
        .cf-btn--upload{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;}
        .csv-success-text{font-size:12px;color:var(--greenDk);margin-bottom:8px;}
        .csv-applied-text{font-size:12px;color:var(--textMid);margin-bottom:8px;}
        .csv-forget-btn{font-size:11px;background:transparent;border:none;color:var(--red);cursor:pointer;padding:0 4px;}
        .csv-mapping-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;}
        .csv-select-input{font-size:12px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--inputBg);color:var(--text);outline:none;}
        .csv-select-input--full{width:100%;}
        .csv-name-input{flex:1 1 180px;min-width:140px;}
        .cf-btn--csvsave{font-size:12px;padding:6px 12px;}
        .csv-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;}
        .csv-error-text{font-size:12px;color:var(--red);margin-bottom:8px;}
        .csv-preview-btn{font-size:12px;font-weight:600;padding:7px 16px;border-radius:6px;border:none;cursor:pointer;background:var(--navyMid);color:#fff;}
        .csv-import-btn{font-size:12px;font-weight:600;padding:7px 16px;border-radius:6px;border:none;cursor:pointer;color:#fff;background:var(--greenDk);}
        .csv-preview-label{font-size:11px;color:var(--textLt);margin-bottom:6px;}
        .csv-preview-row{font-size:11px;padding:4px 0;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center;}
        .csv-preview-desc{flex:1;font-weight:600;color:var(--text);}
        .csv-preview-amt{font-family:IBM Plex Mono,monospace;}
        .csv-done-wrap{text-align:center;padding:20px 0;}
        .csv-done-icon{font-size:32px;margin-bottom:8px;}
        .csv-done-text{font-size:14px;font-weight:600;color:var(--text);}
        .csv-sel-label{font-size:11px;color:var(--textLt);margin-bottom:4px;display:block;}
        .ctx-menu-backdrop{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.35);}
        .ctx-menu-sheet{position:fixed;left:0;right:0;bottom:0;border-radius:20px 20px 0 0;padding:10px 0 calc(10px + env(safe-area-inset-bottom));box-shadow:0 -8px 32px rgba(0,0,0,0.25);user-select:none;}
        .ctx-menu-handle{width:36px;height:4px;border-radius:2px;background:var(--border);margin:2px auto 8px;}
        .ctx-menu-divider--touch{height:1px;background:var(--border);margin:4px 16px;}
        .ctx-menu-item--touch{display:flex;align-items:center;gap:14px;width:100%;padding:15px 22px;border:none;background:transparent;cursor:pointer;text-align:left;font-size:15px;}
        .ctx-menu-icon--touch{font-size:17px;width:22px;text-align:center;}
        .ctx-menu-desktop{position:fixed;z-index:9000;background:var(--bgCard);border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadowLg);min-width:180px;padding:4px 0;user-select:none;}
        .ctx-menu-divider{height:1px;background:var(--border);margin:3px 8px;}
        .ctx-menu-icon{font-size:15px;width:18px;text-align:center;}
        .filter-pill-btn{font-size:12px;padding:6px 14px;border-radius:20px;outline:none;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;}
        .filter-pill-chevron{font-size:9px;opacity:0.5;}
        .filter-pill-dropdown{position:absolute;top:calc(100% + 6px);left:0;z-index:500;background:var(--bgCard);border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadowLg);min-width:180px;max-height:260px;overflow-y:auto;padding:6px 0;}
        .filter-pill-all-row{display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text);border-bottom:1px solid var(--border);margin-bottom:4px;}
        .filter-pill-checkbox{cursor:pointer;accent-color:var(--primary);}
        .filter-pill-option-row{display:flex;align-items:center;gap:10px;padding:7px 14px;cursor:pointer;font-size:13px;color:var(--text);}
        /* ── register.js ── */
        .cf-gap-4{gap:4px;}
        .cursor-pointer{cursor:pointer;}
        .cf-btn--nowrap{white-space:nowrap;}
        .recur-onetime{color:var(--amber);font-size:13px;}
        .reg-col-type{padding:10px 12px;}
        .reg-type-badge{font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;text-transform:uppercase;}
        .reg-col-amount{font-weight:600;padding:10px 12px;}
        .reg-col-date{font-size:13px;padding:10px 12px;white-space:nowrap;}
        .reg-col-sched{font-size:13px;padding:10px 12px;white-space:nowrap;}
        .reg-col-until{font-size:13px;padding:10px 12px;white-space:nowrap;}
        .reg-col-cat{padding:10px 12px;}
        .reg-col-notes{font-size:13px;padding:10px 12px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .reg-actions{padding:10px 8px;}
        .reg-action-btn{font-size:11px;padding:4px 9px;border-radius:5px;}
        .historical-tag{margin-left:6px;font-size:11px;font-style:italic;}
        .reg-date-input{font-size:12px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bgCard);color:var(--text);outline:none;}
        .reg-clear-dates-btn{font-size:13px;color:var(--textLt);background:none;border:none;cursor:pointer;padding:4px;}
        .reg-toptools-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap;}
        .reg-filter-row{display:flex;justify-content:flex-start;align-items:center;margin-bottom:12px;gap:6px;flex-wrap:wrap;row-gap:8px;}
        .reg-mobile-filter-btn{font-size:13px;font-weight:600;padding:8px 14px;border-radius:20px;cursor:pointer;display:flex;align-items:center;gap:6px;}
        .reg-filter-count-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--navy);color:#fff;font-size:11px;font-weight:700;}
        .reg-allyears-label{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--textMid);cursor:pointer;white-space:nowrap;}
        .reg-search-input{font-size:13px;padding:6px 12px;border:1px solid var(--border);border-radius:20px;background:var(--bgCard);color:var(--text);outline:none;width:200px;}
        .reg-headersearch-banner{font-size:12px;color:var(--amber);padding:6px 10px;background:var(--amberLt);border-radius:6px;border:1px solid var(--amber);width:100%;margin-top:6px;}
        .reg-search-icon{margin-right:4px;vertical-align:-2px;}
        .reg-mobilefilters-card{padding:20px 20px 16px;width:min(480px,calc(100vw - 32px));max-height:80vh;overflow-y:auto;}
        .reg-mobilefilters-stack{display:flex;flex-direction:column;align-items:flex-start;gap:10px;}
        .reg-showresults-btn{width:100%;margin-top:18px;padding:12px;}
        .fab-panel-backdrop{position:fixed;inset:0;z-index:1499;background:rgba(0,0,0,0.25);}
        .fab-panel--sm{width:min(400px,calc(100vw - 32px));}
        .fab-panel--lg{width:min(680px,calc(100vw - 32px));}
        .fab-panel-title-sm{font-size:14px;font-weight:700;color:var(--text);}
        .fab-panel-close{background:transparent;border:none;cursor:pointer;font-size:18px;color:var(--textLt);padding:4px;line-height:1;}
        .reg-th--select{padding:10px 6px 10px 12px;width:34px;background:var(--navy);}
        .reg-selectall-btn{width:20px;height:20px;border-radius:5px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:11px;line-height:1;}
        .reg-th--col{font-size:11px;font-weight:700;color:#fff;padding:10px 12px;text-align:left;letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap;cursor:grab;user-select:none;transition:background 0.1s;}
        .reg-th-sort-label{cursor:pointer;display:inline-flex;align-items:center;gap:3px;user-select:none;}
        .reg-sort-arrow{font-size:9px;}
        .reg-tr{border-bottom:1px solid var(--border);cursor:context-menu;}
        .reg-td-checkbox{padding:8px 6px 8px 12px;width:34px;}
        .reg-row-checkbox{width:20px;height:20px;border-radius:5px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:12px;line-height:1;}
        .reg-empty-cell{padding:32px;text-align:center;color:var(--textLt);}
        .reg-mobile-card{padding:12px 14px;border-bottom:1px solid var(--border);background:var(--bgCard);cursor:context-menu;}
        .reg-mobile-card-toprow{display:flex;align-items:flex-start;gap:10px;margin-bottom:4px;}
        .reg-mobile-checkbox{width:22px;height:22px;border-radius:5px;cursor:pointer;padding:0;flex-shrink:0;margin-top:1px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px;line-height:1;}
        .reg-mobile-desc{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .reg-mobile-amount{font-weight:600;white-space:nowrap;flex-shrink:0;}
        .reg-mobile-actions-btn{width:26px;height:26px;flex-shrink:0;margin-top:-2px;border:none;border-radius:6px;cursor:pointer;background:transparent;color:var(--textLt);font-size:16px;line-height:1;display:inline-flex;align-items:center;justify-content:center;}
        .reg-mobile-date{font-size:11px;color:var(--textMid);}
        .reg-mobile-notes{font-size:11px;color:var(--textLt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;}
        .reg-bulkbar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom));z-index:1450;background:var(--navy);border-radius:26px;padding:8px 10px 8px 18px;box-shadow:var(--shadowXl);display:flex;align-items:center;gap:12px;max-width:calc(100vw - 24px);}
        .reg-bulkbar-count{font-size:13px;font-weight:700;color:#fff;white-space:nowrap;}
        .reg-bulk-markpaid-btn{font-size:12px;font-weight:700;padding:8px 14px;border-radius:18px;border:none;cursor:pointer;white-space:nowrap;background:var(--greenDk);color:#fff;}
        .reg-bulk-clear-btn{font-size:12px;font-weight:600;padding:8px 12px;border-radius:18px;border:1px solid rgba(255,255,255,0.35);cursor:pointer;background:transparent;color:#fff;}
        .fab-panel{position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));right:16px;z-index:1500;background:var(--bgCard);border-radius:16px;padding:20px;box-shadow:var(--shadowXl);border:1px solid var(--border);max-height:80vh;overflow-y:auto;}
        /* ── forecast-plan.js ── */
        .forecast-table{width:100%;border-collapse:collapse;min-width:360px;}
        .forecast-desc-cell{font-size:13px;padding:8px 14px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .forecast-col-cat{padding:8px 14px;}
        .forecast-conf-col{font-size:13px;padding:8px 8px;text-align:center;}
        .kpi-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;}
        .forecast-header-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:8px;}
        .forecast-label{font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--textLt);}
        .forecast-search-banner{font-size:12px;color:var(--amber);padding:6px 10px;background:var(--amberLt);border-radius:6px;border:1px solid var(--amber);margin-top:8px;}
        .forecast-danger-banner{background:var(--amberLt);border:1px solid var(--amber);border-radius:10px;padding:12px 16px;margin-bottom:16px;}
        .forecast-danger-title{font-size:13px;font-weight:700;color:var(--amber);margin-bottom:4px;}
        .forecast-lowest-value{font-family:'IBM Plex Mono',monospace;}
        .forecast-empty-text{text-align:center;color:var(--textLt);}
        .forecast-exportbar-row{display:flex;justify-content:flex-end;margin-bottom:8px;}
        .budget-toolbar-row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
        .yoy-toggle-active{background:var(--primary)!important;color:#fff!important;border-color:var(--primary)!important;}
        .yoy-card{margin-top:14px;margin-bottom:14px;}
        .yoy-header-row{padding:16px 18px 10px;}
        .yoy-title{font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--textLt);}
        .yoy-table{width:100%;border-collapse:collapse;min-width:420px;}
        .yoy-table th{background:var(--navy);color:#fff;font-size:11px;font-weight:600;padding:8px 14px;white-space:nowrap;text-align:left;}
        .yoy-th-num{text-align:right!important;}
        .yoy-table td{padding:8px 14px;font-size:13px;border-bottom:1px solid var(--border);vertical-align:middle;}
        .yoy-td-desc{color:var(--text);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .yoy-td-cat{white-space:nowrap;}
        .yoy-num{text-align:right;white-space:nowrap;}
        .yoy-delta-pos{color:var(--greenDk);}
        .yoy-delta-neg{color:var(--red);}
        .yoy-tag{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:1px 5px;border-radius:4px;margin-left:6px;vertical-align:1px;}
        .yoy-tag--new{background:rgba(46,204,138,0.15);color:var(--greenDk);}
        .yoy-tag--gone{background:var(--redLt);color:var(--red);}
        .yoy-foot td{font-weight:700;border-top:2px solid var(--border);border-bottom:none;color:var(--text);}
        .forecast-th{font-size:11px;font-weight:700;color:#fff;padding:10px 14px;letter-spacing:0.08em;text-transform:uppercase;}
        .forecast-tr{border-bottom:1px solid var(--border);}
        .forecast-td-date{font-size:13px;padding:8px 14px;color:var(--text);white-space:nowrap;}
        .forecast-td-income{padding:8px 14px;text-align:right;color:var(--greenDk);font-weight:600;}
        .forecast-td-expense{padding:8px 14px;text-align:right;color:var(--text);font-weight:600;}
        .forecast-td-amount-mobile{padding:8px 14px;text-align:right;font-weight:600;}
        .forecast-td-balance{padding:8px 14px;text-align:right;font-weight:700;}
        .forecast-conf-pct{font-weight:600;}
        .wizard-step-icon{display:flex;justify-content:center;margin-bottom:12px;}
        .wizard-icon--primary{color:var(--primary);}
        .wizard-icon--green{color:var(--greenDk);}
        .wizard-icon--red{color:var(--red);}
        .wizard-step-title{font-size:15px;font-weight:700;color:var(--text);text-align:center;margin-bottom:8px;}
        .wizard-step-subtitle{font-size:13px;color:var(--textMid);text-align:center;margin-bottom:20px;}
        .wizard-step-subtitle--lh{line-height:1.5;}
        .wizard-amount-row{display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:20px;}
        .wizard-dollar-lg{font-size:18px;color:var(--textMid);}
        .wizard-openbal-input{font-family:'IBM Plex Mono',monospace;font-size:16px;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;background:var(--inputBg);color:var(--text);outline:none;width:180px;}
        .wizard-btn-row{display:flex;justify-content:center;gap:10px;}
        .wizard-next-btn{font-size:13px;font-weight:700;padding:10px 28px;}
        .wizard-field-stack{display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto 20px;}
        .wizard-text-input{font-size:13px;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--inputBg);color:var(--text);outline:none;}
        .wizard-amount-input{flex:1;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--inputBg);color:var(--text);outline:none;}
        .wizard-finish-btn{font-size:13px;font-weight:700;padding:10px 28px;border-radius:8px;border:none;cursor:pointer;background:var(--greenDk);color:#fff;}
        .wizard-card{max-width:480px;margin:0 auto 24px;border:2px solid var(--primary);}
        .wizard-dots-row{display:flex;justify-content:center;gap:8px;margin-bottom:20px;}
        .wizard-dot{width:10px;height:10px;border-radius:50%;transition:background 0.2s;}
        .alert-banner-wrap{background:var(--redLt);border:1px solid var(--red);border-radius:10px;padding:12px 18px;margin-bottom:20px;display:flex;align-items:center;gap:16px;}
        .alert-banner-icon{color:var(--red);flex-shrink:0;}
        .alert-banner-title{font-size:13px;font-weight:700;color:var(--red);}
        .alert-banner-sub{font-size:13px;color:var(--textMid);margin-top:2px;}
        .alert-banner-strong{font-family:'IBM Plex Mono',monospace;color:var(--red);}
        .ai-header-row{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;}
        .ai-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:4px;}
        .ai-subtitle{font-size:13px;color:var(--textMid);line-height:1.5;}
        .ai-lastrun{font-size:11px;color:var(--textLt);white-space:nowrap;margin-top:4px;}
        .ai-noapikey-banner{margin-top:16px;padding:12px 16px;background:rgba(232,93,74,0.07);border-radius:10px;border:1px solid rgba(232,93,74,0.2);display:flex;align-items:center;gap:12px;}
        .ai-settings-link{font-size:13px;font-weight:700;color:var(--primary);background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;}
        .ai-disclaimer-row{font-size:11px;color:var(--textLt);margin-top:12px;display:flex;align-items:flex-start;gap:6px;}
        .ai-disclaimer-icon{flex-shrink:0;margin-top:1px;}
        .ai-actionrow{margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
        .ai-generate-btn{font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;border:none;transition:all 0.15s;display:flex;align-items:center;gap:10px;}
        .ai-spinner{display:inline-block;animation:spin 1s linear infinite;font-style:normal;}
        .ai-error-banner{font-size:13px;color:var(--red);margin-top:10px;padding:10px 14px;background:rgba(232,93,74,0.08);border-radius:8px;border:1px solid rgba(232,93,74,0.25);}
        .ai-skeleton-wrap{display:flex;flex-direction:column;gap:12px;}
        .ai-skeleton-title{height:18px;background:var(--border);border-radius:6px;width:40%;margin-bottom:16px;}
        .ai-skeleton-line{height:12px;background:var(--stripe);border-radius:4px;margin-bottom:10px;animation:pulse 1.5s ease-in-out infinite;}
        .ai-score-badge{display:flex;align-items:center;gap:16px;padding:16px 20px;margin-bottom:16px;background:var(--bgCard);border-radius:12px;}
        .ai-score-number{font-family:'IBM Plex Mono',monospace;font-size:32px;font-weight:700;line-height:1;}
        .ai-score-outof{font-size:16px;color:var(--textLt);}
        .ai-score-label{font-size:13px;font-weight:700;color:var(--text);}
        .ai-section-card{margin-bottom:0;}
        .ai-section-header{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border);}
        .ai-section-title{font-size:15px;font-weight:700;}
        .ai-hr{border:none;border-top:1px solid var(--border);margin:8px 0;}
        .ai-item-heading{font-size:13px;font-weight:700;color:var(--textMid);margin-bottom:6px;margin-top:10px;}
        .ai-item-bold{font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px;margin-top:8px;}
        .ai-numbered-row{display:flex;gap:10px;margin-bottom:10px;align-items:flex-start;}
        .ai-numbered-badge{min-width:22px;height:22px;border-radius:50%;background:var(--primary);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;}
        .ai-item-text{font-size:13px;color:var(--text);line-height:1.6;}
        .ai-bullet-row{display:flex;gap:10px;align-items:flex-start;}
        .ai-bullet-dot{border-radius:50%;flex-shrink:0;}
        .ai-plain-text{font-size:13px;color:var(--textMid);line-height:1.6;margin-bottom:6px;}
        .ai-footer-disclaimer{font-size:11px;color:var(--textLt);text-align:center;padding:12px 0 4px;line-height:1.5;}
        .ai-empty-wrap{text-align:center;padding:40px 20px;}
        .ai-empty-icon{display:flex;justify-content:center;margin-bottom:16px;color:var(--primary);}
        .ai-empty-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px;}
        .ai-empty-desc{font-size:13px;color:var(--textMid);line-height:1.6;max-width:480px;margin:0 auto;margin-bottom:24px;}
        .ai-empty-feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;max-width:600px;margin:0 auto;}
        .ai-feature-card{padding:14px 12px;background:var(--bg);border-radius:10px;border:1px solid var(--border);text-align:center;}
        .ai-feature-icon{display:flex;justify-content:center;margin-bottom:6px;color:var(--textMid);}
        .ai-feature-label{font-size:11px;font-weight:600;color:var(--textMid);}
        .vizrow-wrap{margin-bottom:9px;}
        .vizrow-toprow{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:3px;}
        .vizrow-label{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}
        .vizrow-value{font-size:12px;white-space:nowrap;}
        .vizrow-sub{color:var(--textLt);font-family:Inter,sans-serif;font-size:11px;}
        .vizrow-track{height:8px;border-radius:4px;background:var(--border);overflow:hidden;}
        .vizrow-fill{height:100%;border-radius:4px;}
        .cashflow-chart-label{font-size:11px;color:var(--textLt);margin-bottom:6px;}
        .cashflow-bars-row{display:flex;gap:3px;}
        .cashflow-bar-container{position:relative;height:56px;}
        .cashflow-zero-line{position:absolute;left:0;right:0;top:50%;border-top:1px solid var(--border);}
        .cashflow-bar{position:absolute;left:18%;right:18%;border-radius:2px;}
        .cashflow-month-label{font-size:9px;text-align:center;color:var(--textLt);margin-top:2px;}
        /* ── settings.js ── */
        .text-right{text-align:right;}
        .link-primary{color:var(--primary);}
        .cf-gap-16{gap:16px;}
        .mt-14{margin-top:14px;}
        .mt-16{margin-top:16px;}
        .alert-row-icon{flex-shrink:0;}
        .alert-row-balance{font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:700;}
        .caption-10{font-size:10px;color:var(--textLt);margin-top:2px;}
        .alert-row-cta{font-size:12px;color:var(--textLt);}
        .settings-header-row{display:flex;align-items:center;gap:12px;margin-bottom:20px;}
        .settings-header-title{font-size:20px;font-weight:700;color:var(--text);}
        .alerts-empty-wrap{text-align:center;padding:32px 16px;}
        .alerts-empty-icon{color:var(--greenDk);margin-bottom:12px;}
        .alerts-empty-title{font-size:16px;font-weight:600;color:var(--text);margin-bottom:6px;}
        .alert-section-label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;display:flex;align-items:center;gap:6px;}
        .settings-toprow{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:8px;}
        .settings-pill-btn{font-size:12px;font-weight:600;padding:8px 20px;border-radius:9px;border:none;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all 0.15s;display:inline-flex;align-items:center;gap:7px;}
        .build-version-tag{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--textLt);}
        .quicklink-pill{font-size:12px;font-weight:600;padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:var(--bgCard);color:var(--textMid);text-decoration:none;white-space:nowrap;flex-shrink:0;}
        .ai-key-input{flex:1;min-width:220px;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--inputBg);color:var(--text);outline:none;}
        .cf-btn--showhide{font-size:12px;padding:8px 14px;white-space:nowrap;}
        .clear-key-btn{font-size:12px;padding:8px 14px;border-radius:8px;border:1px solid var(--border);cursor:pointer;background:transparent;color:var(--red);white-space:nowrap;}
        .key-disclaimer-row{display:flex;align-items:flex-start;gap:6px;margin-top:10px;font-size:11px;color:var(--textLt);}
        .dollar-md{font-size:16px;color:var(--textMid);}
        .settings-input{font-size:13px;padding:8px 12px;border:1px solid var(--border);border-radius:6px;background:var(--inputBg);color:var(--text);outline:none;}
        .settings-label{font-size:11px;font-weight:700;color:var(--textMid);text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:8px;}
        .w-120{width:120px;}
        .year-row{display:flex;align-items:center;gap:10px;padding:8px 12px;flex-wrap:wrap;row-gap:8px;border-radius:8px;margin-bottom:6px;}
        .year-number{font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:700;color:var(--text);min-width:52px;}
        .openbal-label{font-size:11px;color:var(--textMid);white-space:nowrap;}
        .openbal-input{padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--inputBg);color:var(--text);outline:none;width:120px;max-width:100%;min-width:0;flex:0 1 120px;}
        .year-active-btn{font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);cursor:pointer;}
        .copy-year-btn{font-size:11px;color:var(--primary);background:none;border:1px solid var(--primary);cursor:pointer;padding:4px 10px;border-radius:6px;white-space:nowrap;}
        .cf-btn--yearremove{font-size:11px;padding:4px 10px;border-radius:6px;}
        .newyear-input{padding:7px 10px;border:1px solid var(--border);border-radius:6px;background:var(--inputBg);color:var(--text);outline:none;width:120px;}
        .cf-btn--iconrow{display:flex;align-items:center;gap:8px;}
        .backup-msg{font-size:12px;margin-top:10px;}
        .sync-status-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;}
        .sync-icon{font-size:20px;}
        .sync-msg{font-size:11px;}
        .cf-btn--iconrow-sm{display:inline-flex;align-items:center;gap:6px;}
        .cat-row{display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:8px 12px;border-radius:8px;margin-bottom:6px;cursor:grab;border:1px solid var(--border);transition:background 0.1s;}
        .drag-handle{color:var(--textLt);font-size:14px;cursor:grab;}
        .color-swatch{position:relative;width:22px;height:22px;border-radius:50%;flex-shrink:0;cursor:pointer;border:2px solid var(--bgCard);box-shadow:0 0 0 1px var(--border);}
        .color-swatch-input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;padding:0;border:none;}
        .cat-actions-row{display:flex;gap:6px;align-items:center;margin-left:auto;flex-shrink:0;}
        .reset-color-btn{font-size:10px;padding:3px 8px;border-radius:5px;border:1px solid var(--border);cursor:pointer;background:transparent;color:var(--textLt);}
        .error-text-mt8{font-size:12px;color:var(--red);margin-top:8px;}
        .error-text-mt10{font-size:12px;color:var(--red);margin-top:10px;}
        .autolock-select{font-size:13px;padding:7px 10px;border-radius:8px;border:1.5px solid var(--border);background:var(--inputBg);color:var(--text);outline:none;}
        .bio-section{margin-top:18px;padding-top:16px;border-top:1px solid var(--border);}
        .bio-busy-text{font-size:12px;color:var(--textLt);}
        .error-text-mt6{font-size:12px;color:var(--red);margin-top:6px;}
        .reset-targets-btn{font-size:13px;font-weight:600;padding:9px 20px;border-radius:8px;border:1px solid var(--primary);cursor:pointer;background:var(--primary);color:#fff;}
        .success-text-mt10{font-size:12px;color:var(--greenDk);margin-top:10px;}
        .danger-card{margin-bottom:20px;border:1px solid var(--redLt);}
        .cf-btn--dangerwide{padding:9px 20px;border:1px solid var(--red);display:inline-flex;align-items:center;gap:6px;}
        .member-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;}
        .flex-1-minw160{flex:1;min-width:160px;}
        .member-edit-input{max-width:260px;}
        .you-tag{color:var(--textLt);font-weight:400;}
        .invite-code-display{margin-top:14px;font-family:'IBM Plex Mono',monospace;font-size:20px;font-weight:700;letter-spacing:0.1em;text-align:center;padding:14px;border-radius:8px;background:var(--stripe);border:1px solid var(--border);color:var(--text);}
        .italic-hint{font-size:13px;color:var(--textLt);font-style:italic;}
        .template-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);}
        .audit-entry{padding:10px 0;border-bottom:1px solid var(--border);}
        .cf-btn--micro{font-size:11px;padding:4px 10px;border-radius:6px;}
        .revert-btn{font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--amberLt);cursor:pointer;background:var(--amberLt);color:var(--amber);}
        .history-list{margin-top:8px;padding-left:12px;border-left:2px solid var(--border);}
        .history-item-text{font-size:11px;color:var(--textLt);margin-bottom:4px;}
        .errorboundary-wrap{padding:40px 32px;max-width:560px;margin:0 auto;}
        .errorboundary-title{color:#E85D4A;font-size:18px;font-weight:700;margin-bottom:12px;}
        .errorboundary-pre{background:#f8f8f8;border:1px solid #eee;border-radius:6px;padding:14px;font-size:11px;overflow:auto;color:#555;white-space:pre-wrap;}
        .errorboundary-retry-btn{margin-top:16px;font-size:13px;font-weight:600;padding:8px 20px;border-radius:8px;border:none;cursor:pointer;background:#1C2B3A;color:#fff;}
        .alert-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:8px;margin-bottom:6px;cursor:pointer;width:100%;font:inherit;text-align:left;}
        .settings-page-pills{display:flex;gap:4px;padding:4px;background:var(--border);border-radius:12px;width:fit-content;max-width:100%;overflow-x:auto;}
        .settings-quicklinks{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:14px;margin-bottom:6px;}
        .year-openbal{display:flex;align-items:center;gap:6px;flex:1;min-width:0;}
        /* ── budget.js ── */
        .mt-20{margin-top:20px;}
        .budget-event-tr{cursor:pointer;}
        .budget-col-checkbox--cell{padding:8px 4px 8px 9px;width:30px;white-space:nowrap;text-align:center;}
        .budget-row-checkbtn{width:20px;height:20px;border-radius:5px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:12px;line-height:1;}
        .budget-card-checkbtn{flex-shrink:0;margin-top:2px;width:22px;height:22px;border-radius:6px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px;line-height:1;}
        .budget-day-cell{padding:8px 6px 8px 8px;white-space:nowrap;cursor:grab;touch-action:none;user-select:none;vertical-align:middle;}
        .drag-dots{opacity:0.3;font-size:9px;margin-left:2px;}
        .budget-desc-td{font-size:13px;padding:8px 14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .attach-indicator{margin-left:6px;display:inline-flex;}
        .override-mark{margin-left:6px;font-size:10px;color:var(--amber);font-weight:700;}
        .budget-amount-td{padding:8px 14px;text-align:right;font-weight:600;}
        .budget-balance-td{padding:8px 14px;text-align:right;font-weight:700;}
        .budget-spacer-td{width:30px;padding:0;box-shadow:inset 3px 0 0 0 transparent;}
        .period-hdr-td{background:var(--navyMid);padding:8px 14px;font-size:11px;font-weight:700;color:#fff;letter-spacing:0.1em;text-transform:uppercase;}
        .today-line-td{padding:0;background:transparent;box-shadow:inset 3px 0 0 0 transparent;}
        .today-line-wrap{display:flex;align-items:center;gap:8px;padding:4px 8px;}
        .today-label{font-size:10px;font-weight:700;color:var(--amber);white-space:nowrap;letter-spacing:0.1em;}
        .today-line-card-wrap{display:flex;align-items:center;gap:8px;padding:6px 14px;}
        .card-top-row{display:flex;align-items:center;gap:8px;justify-content:space-between;}
        .card-desc-span{font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}
        .card-bottom-row{display:flex;align-items:baseline;margin-top:4px;}
        .amounts-row-baseline{display:flex;gap:10px;align-items:baseline;}
        .card-signed-amt{font-weight:600;}
        .card-balance-amt{font-weight:700;min-width:74px;text-align:right;}
        .openbal-card-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--amberLt);border-bottom:1px solid var(--border);}
        .mno-700{font-weight:700;}
        .mno-700-green{font-weight:700;color:var(--green);}
        .mno-700-coral{font-weight:700;color:#FF8A7A;}
        .budget-empty-msg{padding:28px 14px;text-align:center;font-size:13px;color:var(--textLt);}
        .monthly-totals-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--navy);}
        .totals-label{font-size:12px;font-weight:700;color:#fff;letter-spacing:0.06em;text-transform:uppercase;}
        .totals-amounts-row{display:flex;gap:12px;align-items:baseline;}
        .swipe-coach{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12px;color:var(--textMid);background:var(--stripe);border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin-bottom:12px;}
        .gotit-btn{font-size:12px;font-weight:700;padding:10px 14px;border-radius:6px;border:none;cursor:pointer;background:transparent;color:var(--primary);white-space:nowrap;flex-shrink:0;}
        .budget-search-banner{font-size:12px;color:var(--amber);margin-bottom:8px;padding:6px 10px;background:var(--amberLt);border-radius:6px;border:1px solid var(--amber);}
        .budget-th-checkbox{width:30px;padding:10px 4px;text-align:center;}
        .budget-th-day{font-size:11px;font-weight:700;color:#fff;padding:10px 6px;text-align:left;letter-spacing:0.04em;text-transform:uppercase;}
        .budget-th-col{font-size:11px;font-weight:700;color:#fff;padding:10px 14px;letter-spacing:0.08em;text-transform:uppercase;cursor:grab;user-select:none;transition:background 0.1s;}
        .openbal-row{background:var(--amberLt);}
        .budget-day-spacer-td{width:40px;padding:0;}
        .budget-label-cell{font-size:12px;font-weight:700;padding:8px 14px;color:var(--textMid);letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;}
        .budget-totals-label{font-size:12px;font-weight:700;padding:10px 14px;color:#fff;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;}
        .pad-10-14{padding:10px 14px;}
        .pad-8-14{padding:8px 14px;}
        .budget-totals-amt{font-weight:700;padding:10px 14px;text-align:right;}
        .entryform-modal-card{padding:24px 24px 20px;width:min(680px,calc(100vw - 32px));max-height:90vh;overflow-y:auto;}
        .daily-today-wrap{display:flex;align-items:center;gap:8px;margin:4px 16px;}
        .daily-day-col{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 8px;border-right:1px solid var(--border);}
        .daily-day-number{font-family:'IBM Plex Mono',monospace;font-size:20px;font-weight:700;color:var(--primary);line-height:1;}
        .caption-10-nomargin{font-size:10px;color:var(--textLt);}
        .daily-events-pad{padding:10px 16px;}
        .daily-row-desc{font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .daily-row-amt{font-weight:700;min-width:90px;text-align:right;}
        .daily-balance-caption{font-size:11px;color:var(--textLt);text-align:right;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.08em;}
        .daily-balance-amt{font-weight:700;text-align:right;}
        .no-activity-msg{text-align:center;color:var(--textLt);padding:32px 24px;}
        .rollover-label{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--text);cursor:pointer;}
        .rollover-hint{display:block;font-size:11px;color:var(--textLt);margin-top:2px;}
        .btn-pad-24{padding:9px 24px;}
        .bva-card{margin-top:20px;margin-bottom:12px;padding:0;overflow:hidden;}
        .bva-header-row{padding:20px 24px;display:flex;justify-content:space-between;align-items:center;}
        .bva-header-label{font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--textLt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;}
        .bva-add-btn{font-size:11px;font-weight:700;padding:6px 12px;border-radius:7px;white-space:nowrap;}
        .bva-collapse-btn{font-size:11px;padding:6px 12px;border-radius:7px;flex-shrink:0;}
        .bva-body{display:flex;flex-direction:column;gap:10px;padding:0 24px 20px;}
        .bva-empty-wrap{font-size:13px;color:var(--textLt);text-align:center;padding:8px 0;}
        .context-menu-cursor{cursor:context-menu;}
        .bva-actual-amt{font-weight:600;white-space:nowrap;flex-shrink:1;overflow:hidden;text-overflow:ellipsis;}
        .carry-note{font-size:10px;color:var(--textLt);white-space:nowrap;flex-shrink:0;}
        .over-note{font-size:11px;white-space:nowrap;flex-shrink:0;}
        .bva-edit-btn{width:22px;height:22px;flex-shrink:0;border:none;border-radius:6px;cursor:pointer;background:transparent;color:var(--textLt);font-size:15px;line-height:1;display:inline-flex;align-items:center;justify-content:center;}
        .bva-progress-track{height:6px;background:var(--border);border-radius:3px;}
        .bva-progress-fill{height:100%;border-radius:3px;transition:width 0.4s ease;}
        .bva-totals-row{display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding-top:10px;border-top:2px solid var(--border);}
        .bva-total-label{font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--textMid);}
        .total-over-note{font-size:10px;}
        .budget-col-cat{padding:8px 14px;}
        .budget-card-row{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
        .daily-card{display:grid;grid-template-columns:60px 1fr 180px;border-bottom:1px solid var(--border);align-items:stretch;}
        .daily-row-btn{display:flex;align-items:center;gap:10px;margin-bottom:4px;cursor:pointer;border-radius:6px;padding:4px 6px;width:100%;border:none;background:transparent;font:inherit;text-align:left;}
        .daily-balance{display:flex;align-items:center;justify-content:flex-end;padding:12px 20px;border-left:1px solid var(--border);}
        .bva-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:6px;flex-wrap:nowrap;}
        .bva-amounts{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;flex:1;justify-content:flex-end;min-width:0;}
        .bva-target{color:var(--textMid);white-space:nowrap;flex-shrink:0;}
        /* ── plan-dashboard.js ── */
        .goal-header-row{display:flex;justify-content:space-between;align-items:center;}
        .goal-add-btn{font-size:11px;font-weight:700;padding:6px 14px;border-radius:7px;white-space:nowrap;}
        .goal-empty-wrap{text-align:center;padding:18px 10px;font-size:13px;color:var(--textLt);}
        .goal-title-row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:5px;flex-wrap:wrap;}
        .goal-target-date{font-size:11px;font-weight:400;color:var(--textLt);margin-left:8px;}
        .goal-amounts-row{display:flex;align-items:center;gap:4px;}
        .goal-amounts-text{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--textMid);}
        .goal-pct{font-weight:700;margin-left:8px;}
        .goal-menu-btn{width:24px;height:24px;flex-shrink:0;border:none;border-radius:6px;cursor:pointer;background:transparent;color:var(--textLt);font-size:16px;line-height:1;display:inline-flex;align-items:center;justify-content:center;}
        .goal-row-cursor{cursor:context-menu;}
        .progress-track{height:6px;border-radius:3px;background:var(--border);}
        .progress-track--clip{height:6px;border-radius:3px;background:var(--border);overflow:hidden;}
        .progress-track-8{height:8px;border-radius:4px;background:var(--border);overflow:hidden;}
        .progress-fill{height:100%;border-radius:3px;}
        .debtsnap-header-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;}
        .debtsnap-row-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;flex-wrap:wrap;gap:6px;}
        .debtsnap-apr-badge{font-size:11px;color:var(--textLt);background:var(--bg);padding:2px 6px;border-radius:4px;border:1px solid var(--border);}
        .debtsnap-amounts{display:flex;align-items:baseline;gap:8px;}
        .debtsnap-payoff{font-size:11px;color:var(--greenDk);}
        .debtsnap-progress-fill{height:100%;border-radius:3px;transition:width 0.4s;}
        .debtsnap-freq-note{font-size:10px;color:var(--textLt);margin-top:2px;}
        .goal-footer-row{display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:var(--textLt);}
        .entry-form-row2-12{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
        .grid-2-12{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .checkbox-16{width:16px;height:16px;accent-color:var(--primary);}
        .goal-checkbox-label{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--textMid);cursor:pointer;}
        .modal-btn-row-18{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;}
        .goalform-modal-card{padding:24px 24px 20px;width:min(440px,calc(100vw - 32px));max-height:90vh;overflow-y:auto;}
        .modal-card-360{padding:24px;width:min(360px,calc(100vw - 32px));}
        .fundform-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;}
        .fundform-subtitle{font-size:12px;color:var(--textLt);margin-bottom:16px;}
        .moneyinput-lg{font-family:'IBM Plex Mono',monospace;font-size:14px;padding:10px 12px;width:100%;box-sizing:border-box;border:1.5px solid var(--border);border-radius:8px;background:var(--inputBg);color:var(--text);outline:none;}
        .label-amt-row{display:flex;justify-content:space-between;margin-bottom:3px;}
        .amt-mid-600{font-weight:600;color:var(--textMid);}
        .strat-card{flex:1 1 220px;background:var(--stripe);border:1px solid var(--border);border-radius:10px;padding:14px 16px;}
        .strat-card-title{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px;}
        .strat-card-sub{font-size:10px;color:var(--textLt);margin-bottom:10px;}
        .strat-card-row{display:flex;justify-content:space-between;margin-bottom:4px;}
        .strat-card-row-tight{display:flex;justify-content:space-between;margin-bottom:8px;}
        .strat-value{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:700;color:var(--greenDk);}
        .strat-value-neutral{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:var(--text);}
        .strat-order{font-size:10px;color:var(--textLt);line-height:1.7;}
        .strat-section{margin-top:18px;padding-top:14px;border-top:1px solid var(--border);}
        .strat-section-header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;}
        .strat-extra-label{display:inline-flex;align-items:center;gap:8px;font-size:12px;color:var(--textMid);}
        .strat-extra-input{padding:5px 10px;width:90px;border:1.5px solid var(--border);border-radius:8px;background:var(--inputBg);color:var(--text);outline:none;}
        .strat-cards-row{display:flex;gap:12px;flex-wrap:wrap;}
        .strat-footnote{font-size:10px;color:var(--textLt);margin-top:8px;}
        .strat-error{font-size:12px;color:var(--red);margin-top:14px;}
        .debt-restore-btn{font-size:11px;padding:6px 12px;border-radius:7px;border:1px solid var(--amber);cursor:pointer;background:transparent;color:var(--amber);white-space:nowrap;}
        .debt-expand-btn{font-size:11px;padding:6px 12px;border-radius:7px;flex-shrink:0;}
        .debt-empty-wrap{font-size:13px;color:var(--textLt);text-align:center;padding:20px 0;}
        .debt-row{padding:12px 14px;background:var(--bg);border-radius:8px;border:1px solid var(--border);cursor:context-menu;}
        .debt-row-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;}
        .debt-row-name-col{flex:1;min-width:140px;}
        .debt-row-meta{font-size:11px;color:var(--textLt);margin-top:3px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
        .debt-row-bal-wrap{text-align:right;}
        .debt-row-bal-amt{font-weight:700;color:var(--red);}
        .debt-row-paid{color:var(--greenDk);font-weight:600;}
        .debt-row-interest{font-size:11px;color:var(--textLt);}
        .debt-stats-row{display:flex;gap:16px;margin-top:8px;flex-wrap:wrap;}
        .debt-stat-label{font-size:10px;color:var(--textLt);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;}
        .debtform-optional{font-weight:400;text-transform:none;letter-spacing:0;color:var(--textLt);}
        .debtform-hint{font-size:11px;color:var(--textLt);margin-top:5px;}
        .glance-tile{background:var(--bgCard);border:1px solid var(--border);border-radius:10px;padding:10px 12px;}
        .glance-tile-title{font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--textLt);margin-bottom:3px;}
        .glance-value{font-family:Inter,sans-serif;font-variant-numeric:tabular-nums;font-size:16px;font-weight:700;}
        .glance-value-sub{font-size:10px;font-weight:400;color:var(--textLt);margin-left:6px;display:inline-block;white-space:nowrap;}
        .ending-soon-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;}
        .ending-soon-chip{display:inline-flex;align-items:center;gap:8px;font-size:12px;border-radius:20px;padding:7px 14px;}
        .upcoming-header-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
        .upcoming-hdr-label{font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--textLt);}
        .upcoming-count{font-size:11px;color:var(--textLt);}
        .upcoming-list{display:flex;flex-direction:column;gap:8px;}
        .upcoming-item-mobile{margin-bottom:4px;}
        .upcoming-mobile-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px;}
        .upcoming-mobile-desc{font-size:13px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;}
        .upcoming-mobile-bottom{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:4px;}
        .upcoming-mobile-date{font-size:12px;color:var(--textMid);flex-shrink:0;}
        .upcoming-mobile-amts{display:flex;gap:10px;align-items:baseline;}
        .upcoming-desktop-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px;flex-wrap:wrap;}
        .upcoming-desktop-left{display:flex;align-items:center;gap:8px;min-width:0;flex:1;}
        .upcoming-desktop-date{font-size:13px;color:var(--textMid);white-space:nowrap;}
        .upcoming-desktop-desc{font-size:13px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .upcoming-desktop-amts{display:flex;align-items:center;gap:10px;flex-shrink:0;}
        .paid-btn{width:22px;height:22px;min-width:22px;border-radius:50%;color:var(--greenDk);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;line-height:1;padding:0;flex-shrink:0;}
        .insight-banner{display:flex;align-items:baseline;gap:8px;font-size:13px;color:var(--textMid);background:var(--stripe);border:1px solid var(--border);border-radius:8px;padding:9px 14px;margin-bottom:20px;line-height:1.5;}
        .kpi-spark-value{font-family:Inter,sans-serif;font-variant-numeric:tabular-nums;font-size:18px;font-weight:700;}
        .kpi-warn-note{font-size:11px;color:var(--red);margin-top:4px;}
        .kpi-sub-note{font-size:11px;color:var(--textLt);margin-top:4px;}
        .dash-cat-bar-wrap{height:220px;overflow-y:auto;padding-right:4px;display:flex;flex-direction:column;gap:8px;margin-top:4px;}
        .dash-cat-table{width:100%;border-collapse:collapse;margin-top:4px;}
        .dash-cat-table-hdr-row{background:var(--stripe);}
        .dash-cat-th{font-size:10px;font-weight:700;color:var(--textLt);padding:6px 8px;letter-spacing:0.08em;text-transform:uppercase;}
        .dash-cat-tr{border-bottom:1px solid var(--border);}
        .dash-cat-td{padding:6px 8px;display:flex;align-items:center;gap:6px;}
        .dash-cat-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0;}
        .dash-cat-amt-td{font-weight:600;padding:6px 8px;text-align:right;color:var(--textMid);}
        .dash-cat-pct-td{padding:6px 8px;text-align:right;color:var(--textLt);}
        .bva-subtitle{font-size:11px;color:var(--textLt);margin-top:-6px;margin-bottom:10px;}
        .text-10{font-size:10px;}
        .bva-empty-state{padding:32px 16px;text-align:center;height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;}
        .bva-empty-icon{margin-bottom:8px;color:var(--textLt);}
        .bva-empty-title{font-size:13px;color:var(--textMid);font-weight:600;margin-bottom:4px;}
        .bva-empty-body{font-size:13px;color:var(--textLt);line-height:1.5;}
        .bva-rows-wrap{height:220px;overflow-y:auto;padding-right:4px;display:flex;flex-direction:column;gap:10px;}
        .dash-bva-row-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px;flex-wrap:wrap;}
        .dash-bva-amounts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .dash-th-16{font-size:11px;font-weight:700;color:#fff;padding:10px 16px;letter-spacing:0.08em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .dash-td-13{font-size:13px;padding:9px 16px;color:var(--text);}
        .dash-amt-td-16{padding:9px 16px;text-align:right;}
        .dash-table-wide{width:100%;border-collapse:collapse;min-width:520px;white-space:nowrap;}
        .dash-annual-total-label{font-size:12px;font-weight:700;padding:10px 16px;color:#fff;text-transform:uppercase;letter-spacing:0.06em;}
        .dash-annual-total-amt{font-weight:700;padding:10px 16px;text-align:right;color:#fff;}
        .dash-th-14{font-size:11px;font-weight:700;color:#fff;padding:9px 14px;letter-spacing:0.08em;text-transform:uppercase;}
        .dash-td-14{padding:9px 14px;}
        .dash-amt-td-14{padding:9px 14px;text-align:right;}
        .dash-year-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0;}
        .dash-year-label{font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:700;color:var(--text);}
        .yoy-empty-wrap{background:var(--stripe);border:1px dashed var(--border);border-radius:10px;padding:14px;text-align:center;display:flex;align-items:center;justify-content:center;gap:8px;}
        .summary-toolbar-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
        .heat-inc-td{font-weight:600;color:var(--greenDk);}
        .heat-exp-td{font-weight:600;color:var(--red);}
        .dash-heat-bal-td{font-weight:700;padding:9px 16px;text-align:right;position:sticky;right:0;box-shadow:-6px 0 8px -6px rgba(0,0,0,0.25);}
        .dash-table-bal-td{font-weight:700;padding:9px 16px;text-align:right;position:sticky;right:0;box-shadow:-6px 0 8px -6px rgba(0,0,0,0.18);}
        .dash-table-row{border-bottom:1px solid var(--border);}
        .dash-total-amt-td{font-weight:700;padding:10px 16px;text-align:right;}
        .dash-total-spacer-td{padding:10px 16px;position:sticky;right:0;background:var(--navy);box-shadow:-6px 0 8px -6px rgba(0,0,0,0.25);}
        .card-flat{padding:0;overflow:hidden;margin-bottom:16px;}
        .step-badge{width:24px;height:24px;min-width:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
        .firstrun-card{margin-bottom:20px;padding:22px 24px;}
        .firstrun-title{font-size:17px;font-weight:700;color:var(--text);margin-bottom:4px;}
        .firstrun-subtitle{font-size:13px;color:var(--textMid);margin-bottom:18px;}
        .firstrun-step-text{font-size:13px;color:var(--text);flex:1 1 200px;}
        .firstrun-step-hint{display:block;font-size:11px;color:var(--textLt);}
        .firstrun-ob-input{width:130px;padding:7px 10px;font-size:13px;}
        .firstrun-footer{border-top:1px solid var(--border);margin-top:18px;padding-top:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
        .firstrun-footer-text{font-size:12px;color:var(--textLt);flex:1 1 220px;}
        .sample-banner{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--stripe);border:1px dashed var(--border);border-radius:10px;padding:8px 14px;margin-bottom:14px;font-size:12px;color:var(--textMid);}
        .sample-banner-text{flex:1;min-width:180px;}
        .dash-page{overflow-x:hidden;}
        .dash-customize-row{display:flex;justify-content:flex-end;margin-bottom:10px;}
        .customize-modal-card{padding:24px;width:min(400px,calc(100vw - 32px));max-height:85vh;overflow-y:auto;}
        .customize-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;}
        .customize-subtitle{font-size:12px;color:var(--textLt);margin-bottom:16px;}
        .customize-list{display:flex;flex-direction:column;gap:4px;}
        .customize-item{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:8px;font-size:13px;color:var(--text);}
        .customize-checkbox{width:16px;height:16px;accent-color:var(--primary);flex-shrink:0;}
        .customize-label{flex:1;min-width:0;}
        .wm-arrow{font-size:13px;width:34px;height:34px;line-height:32px;border-radius:6px;border:1px solid var(--border);cursor:pointer;background:transparent;color:var(--textMid);padding:0;}
        .customize-done-row{display:flex;justify-content:flex-end;margin-top:18px;}
        .glance-grid{display:grid;gap:8px;margin-bottom:14px;}
        .chart-grid{display:grid;gap:16px;margin-bottom:16px;max-width:100%;overflow:hidden;}
        /* Inline error/info banner (auth screens, forms) */
        .cf-error-banner{background:var(--redLt);border:1px solid var(--red);border-radius:8px;
          padding:10px 14px;font-size:13px;color:var(--red);font-weight:500;}
        .cf-info-banner{background:var(--greenLt);border:1px solid var(--green);border-radius:8px;
          padding:10px 14px;font-size:13px;color:var(--greenDk);font-weight:500;}
        /* Dropdown menu items (user menu, template picker) — CSS hover, no JS handlers */
        .cf-menu-item{width:100%;text-align:left;padding:12px 16px;font-size:13px;color:var(--text);
          background:transparent;border:none;cursor:pointer;display:flex;align-items:center;gap:10px;}
        .cf-menu-item:hover{background:var(--stripe);}
        .cf-menu-item--danger{color:var(--red);font-weight:600;}
        .cf-menu-item--danger:hover{background:var(--redLt);}
        .cf-modal-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:20px;}
        .cf-close-x{background:transparent;border:none;cursor:pointer;font-size:18px;
          color:var(--textLt);line-height:1;padding:0 0 0 8px;}
        /* Larger auth-screen variant of the shared input */
        .field-input--lg{font-size:15px;padding:10px 14px;}
        /* Footer legal links */
        .cf-footer-link{color:rgba(255,255,255,0.4);text-decoration:none;
          border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:1px;transition:color 0.15s;}
        .cf-footer-link:hover{color:rgba(255,255,255,0.7);}
        /* KPI stat card */
        .kpi-card{background:var(--bgCard);border:1px solid var(--border);border-radius:12px;
          padding:16px 20px;min-width:0;}
        .kpi-card .kpi-label{font-size:11px;color:var(--textMid);text-transform:uppercase;
          letter-spacing:0.1em;margin-bottom:6px;}
        .kpi-card .kpi-value{font-family:Inter,sans-serif;font-variant-numeric:tabular-nums;
          font-size:20px;font-weight:700;color:var(--text);line-height:1;}
        .kpi-card .kpi-sub{font-size:11px;color:var(--textLt);margin-top:4px;}
        /* Value + sparkline row inside the annual KPI tiles: wrap instead of
           squeezing the sparkline against the card edge on narrow phones */
        .kpi-spark-row{display:flex;align-items:flex-end;justify-content:space-between;
          gap:8px;flex-wrap:wrap;}
        /* Toggle switch */
        .cf-switch{position:relative;width:44px;height:24px;border-radius:12px;border:none;
          padding:0;cursor:pointer;background:var(--border);transition:background 0.2s;flex-shrink:0;}
        .cf-switch[aria-checked="true"]{background:var(--primary);}
        .cf-switch .cf-switch-knob{position:absolute;top:3px;left:3px;width:18px;height:18px;
          border-radius:9px;background:#fff;transition:left 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.2);}
        .cf-switch[aria-checked="true"] .cf-switch-knob{left:23px;}
        /* Pill segmented controls (month picker, view toggles) */
        .cf-pill{font-size:12px;font-weight:600;padding:6px 14px;border-radius:20px;border:none;
          cursor:pointer;flex-shrink:0;background:var(--border);color:var(--textMid);}
        .cf-pill[aria-pressed="true"],.cf-pill[data-active="true"]{background:var(--primary);color:#fff;}
        .cf-pill--dashed{font-size:11px;font-weight:700;padding:6px 12px;border-radius:20px;
          border:1.5px dashed var(--primary);cursor:pointer;flex-shrink:0;background:transparent;color:var(--primary);}
        /* Compact variant for pill toggles docked in a card header (YoY metric,
           shared-view) — was two near-duplicate inline-style overrides */
        .cf-pill--sm{font-size:11px;font-weight:600;padding:5px 13px;border-radius:18px;}
        /* Floating dropdown panel (template picker, similar popovers) */
        .cf-popover{position:absolute;top:100%;left:0;z-index:100;background:var(--bgCard);
          border:1px solid var(--border);border-radius:10px;padding:6px;min-width:200px;
          box-shadow:var(--shadowMd);margin-top:4px;}
        .cf-menu-item--compact{padding:8px 10px;border-radius:6px;}
        /* Month picker */
        .month-nav-arrow{font-size:14px;padding:2px 9px;border-radius:6px;border:1px solid var(--border);
          cursor:pointer;background:transparent;color:var(--textMid);line-height:1.2;flex-shrink:0;}
        .month-nav-arrow:disabled{cursor:default;color:var(--border);}
        .month-pill{position:relative;}
        .month-pill[data-match="true"]:not([data-active="true"]){background:var(--amberLt);
          color:var(--amber);outline:2px solid var(--amber);}
        .month-pill-dot{position:absolute;top:-3px;right:-3px;width:8px;height:8px;
          border-radius:50%;background:var(--amber);border:2px solid var(--bgCard);}
        /* Edge-scroll fade: hints that more months sit off-screen on the
           horizontally-scrolling mobile month strip. */
        .month-picker-fade{position:absolute;top:0;bottom:0;width:20px;pointer-events:none;z-index:1;}
        .month-picker-fade--left{left:0;background:linear-gradient(to right,var(--bg),transparent);}
        .month-picker-fade--right{right:0;background:linear-gradient(to left,var(--bg),transparent);}
        body{margin:0;background:var(--bg);scrollbar-gutter:stable;
          -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
        /* Stray horizontal overflow must never widen the mobile layout viewport —
           that zooms the page out and scales/displaces position:fixed chrome
           (bottom nav). Wide content belongs in an .hscroll container. */
        html,body{overflow-x:hidden;overflow-x:clip;}
        /* ── Mobile app-shell scrolling ─────────────────────────────────────
           On touch devices the page body must never scroll: a scrolling body
           collapses/expands the browser's URL bar, and position:fixed chrome
           (the bottom nav) shifts with that animation. Instead the app root
           (.app-scroll) is a fixed-height internal scroller — the browser bar
           never moves, so neither does the nav. Desktop keeps normal body
           scrolling for keyboard/scroll-wheel ergonomics. */
        @media (pointer:coarse){
          html,body{height:100%;overflow:hidden;}
          .app-scroll{height:100vh;height:100dvh;overflow-y:auto;overflow-x:clip;
            -webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;}
          /* The root is a column flexbox: with a fixed height its children
             would flex-shrink and crush the header/footer to nothing. */
          .app-scroll>*{flex-shrink:0;}
        }
        @media print{html,body{height:auto;overflow:visible;}.app-scroll{height:auto!important;overflow:visible!important;}}
        .settings-page-pills{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}
        .settings-page-pills::-webkit-scrollbar{display:none;}
        /* \u2500\u2500 Modern interaction polish (pointer devices) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        @media (hover:hover) and (pointer:fine){
          /* Cards lift subtly on hover for depth */
          .cf-card:hover{box-shadow:var(--shadowMd);}
          /* All buttons get a gentle press/hover feel */
          button{transition:filter 0.15s ease, transform 0.08s ease, box-shadow 0.15s ease, background 0.15s ease;}
          button:not(:disabled):hover{filter:brightness(1.06);}
          button:not(:disabled):active{transform:translateY(0.5px) scale(0.985);}
          /* Interactive rows highlight on hover */
          .reg-table tbody tr:hover,
          .hscroll table tbody tr:hover{background:var(--accentLt)!important;}
          /* Nav tabs + pills subtle hover */
          .tab-bar button:hover,.budget-subtab-pill:hover{filter:brightness(1.04);}
          .alert-row{transition:opacity 0.15s;}
          .alert-row:hover{opacity:0.8;}
          .daily-row-btn{transition:background 0.1s;}
          .daily-row-btn:hover{background:rgba(47,84,150,0.06);}
          .ctx-menu-item{font-size:13px;padding:9px 16px;border:none;width:100%;cursor:pointer;
            text-align:left;background:transparent;display:flex;align-items:center;gap:10px;
            transition:background 0.1s;}
          .ctx-menu-item:hover{background:var(--stripe);}
        }
        .chart-toggle-btn{font-size:10px;font-weight:700;min-width:34px;min-height:34px;
          padding:2px 8px;border-radius:5px;border:none;cursor:pointer;letter-spacing:0.04em;
          display:inline-flex;align-items:center;justify-content:center;
          background:var(--border);color:var(--textMid);}
        .chart-toggle-btn[aria-pressed="true"]{background:var(--primary);color:#fff;}
        /* Small check/menu buttons keep their compact visual but get a padded
           touch halo — the pseudo-element is part of the button's hit area. */
        .cf-checkbtn{position:relative;}
        .cf-checkbtn::after{content:'';position:absolute;inset:-10px;}
        @media (pointer:coarse){
          .chart-toggle-btn{min-width:44px!important;min-height:44px!important;}
          /* WCAG-ish touch minimums for the shared controls */
          .cf-btn{min-height:40px;}
          .cf-pill,.cf-pill--dashed{min-height:36px;}
          .cf-footer-link{display:inline-block;padding:10px 4px;}
          .settings-page-pills button{min-height:40px;}
          .settings-quicklinks a{min-height:40px;display:inline-flex;align-items:center;}
          .collapse-header-btn{min-height:36px;}
          .cf-switch::after{content:'';position:absolute;inset:-10px;}
        }
        /* Accessible focus ring \u2014 keyboard only, consistent everywhere */
        :focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px;}
        button:focus:not(:focus-visible){outline:none;}
        /* Text inputs/selects get a visible focus ring on ANY focus (mouse or keyboard) \u2014
           they have outline:none inline, so this restores feedback for pointer users. */
        input:focus,select:focus,textarea:focus{
          outline:2px solid var(--accent)!important;outline-offset:1px;
          border-color:var(--accent)!important;
        }
        /* \u2500\u2500 UI polish \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        /* Bottom navigation: touch devices only */
        .cf-bottomnav{display:none;position:fixed;left:0;right:0;bottom:0;z-index:1400;
          background:var(--bgCard);border-top:1px solid var(--border);
          padding-bottom:env(safe-area-inset-bottom);
          box-shadow:0 -2px 12px rgba(28,43,58,0.06);}
        @media (pointer:coarse){
          .cf-bottomnav{display:flex;}
          .tab-bar{display:none!important;}
          .content-area{padding-bottom:calc(64px + env(safe-area-inset-bottom))!important;}
          .content-area.content-area--fab{padding-bottom:calc(132px + env(safe-area-inset-bottom))!important;}
          .cf-fab{bottom:calc(66px + env(safe-area-inset-bottom))!important;}
          .cf-quickfab{bottom:calc(66px + env(safe-area-inset-bottom))!important;}
          .reg-bulkbar{bottom:calc(72px + env(safe-area-inset-bottom))!important;}
          .cf-quickfab-panel{bottom:calc(128px + env(safe-area-inset-bottom))!important;max-height:70vh!important;}
        }
        /* QuickAdd FAB + its panel/menu (base look; placement tweaks live in the
           pointer-specific blocks below) */
        .cf-quickfab-panel{position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));right:16px;
          z-index:1500;background:var(--bgCard);border-radius:16px;padding:20px;
          box-shadow:var(--shadowXl);border:1px solid var(--border);
          width:min(680px,calc(100vw - 32px));max-height:80vh;overflow-y:auto;}
        .cf-quickfab-menu{position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));right:16px;
          z-index:1500;display:flex;flex-direction:column;align-items:flex-end;gap:10px;}
        .cf-fab-menu-btn{font-size:12px;font-weight:600;padding:10px 18px;border-radius:20px;
          border:1px solid var(--border);cursor:pointer;background:var(--bgCard);color:var(--text);
          box-shadow:var(--shadowMd);white-space:nowrap;display:flex;align-items:center;gap:8px;}
        /* z-index above the panel/menu (1500) so the close "✕" stays tappable
           while they're open — the menu's backdrop otherwise swallows the tap. */
        .cf-quickfab{position:fixed;bottom:calc(20px + env(safe-area-inset-bottom));right:16px;
          z-index:1501;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
          background:var(--primary);color:#fff;font-size:24px;font-weight:300;line-height:1;
          box-shadow:var(--shadowLg);display:flex;align-items:center;justify-content:center;
          transition:background 0.2s,transform 0.2s,opacity 0.2s;}
        .cf-quickfab[data-active="true"]{background:var(--red);transform:rotate(45deg);}
        .cf-quickfab[data-scrolling="true"]:not([data-active="true"]){opacity:0.4;}
        /* QuickAdd FAB is a thumb-reach control: hide it on fine-pointer desktops,
           where the header and per-view buttons already cover add/import. */
        @media (hover:hover) and (pointer:fine){
          .cf-quickfab{display:none!important;}
          .cf-quickfab-panel{display:none!important;}
          .cf-quickfab-menu{display:none!important;}
        }
        /* Landscape phones: width-based breakpoints (≤768px) don't fire on a
           landscape phone (~740-900px wide), so KPI grids etc. keep their
           wide-layout column count — correctly, they fit. But the FAB is
           anchored to the viewport bottom by fixed pixels, and a ~390px-tall
           viewport is short enough that unscrolled content already reaches
           down to where it sits, permanently covering whatever's there (e.g.
           the last KPI card). Shrink + dim it so covered content stays
           legible; full opacity returns the moment it's opened. */
        @media (max-height:480px) and (pointer:coarse){
          /* Size/opacity only — leave the bottom-nav-clearance offset (set in
             the pointer:coarse block above) alone, or the FAB collides with
             the nav bar instead of just page content. */
          .cf-quickfab{width:44px!important;height:44px!important;font-size:20px!important;
            opacity:0.55;}
          .cf-quickfab[data-active="true"]{opacity:1;}
        }
        /* FAB: touch devices only, thumb-reach primary action */
        .cf-fab{display:none;position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom));
          width:56px;height:56px;border-radius:50%;background:var(--primary);color:#fff;
          font-size:28px;font-weight:400;line-height:1;border:none;cursor:pointer;
          box-shadow:0 6px 20px rgba(0,0,0,0.28);z-index:1500;}
        @media (pointer:coarse){.cf-fab{display:flex;align-items:center;justify-content:center;}}
        /* Camera capture: touch devices only \u2014 desktop shows gallery picker alone */
        .attach-camera{display:none!important;}
        @media (pointer:coarse){.attach-camera{display:inline-flex!important;}}
        html{-webkit-tap-highlight-color:transparent;}
        /* Touch/no-hover devices: simple press feedback (hover handled by the pointer:fine block above) */
        @media not (hover:hover){
          button:active:not(:disabled){transform:scale(0.97);}
        }
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
        input[type=number]{-moz-appearance:textfield;appearance:textfield;}
        .modal-card{overscroll-behavior:contain;}
        tr{transition:background 0.12s ease;}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}}
        input,select,button,textarea{font-family:Inter,sans-serif;}

        /* \u2500\u2500 Typography tokens \u2014 apply to all data content \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        /* Primary data text (descriptions, labels, names) */
        .tx  {font-family:Inter,sans-serif;font-size:13px;color:var(--text);}
        /* Secondary / metadata (categories, dates, schedule) */
        .txm {font-family:Inter,sans-serif;font-size:13px;color:var(--textMid);}
        /* Muted (notes, hints, historical, inactive) */
        .txl {font-family:Inter,sans-serif;font-size:13px;color:var(--textLt);}
        /* Monospace numbers (amounts, balances) */
        .mno {font-family:'IBM Plex Mono',monospace;font-size:13px;}
        /* Small caps section label (uppercase, letter-spaced) \u2014 intentionally 11px */
        .lbl {font-family:Inter,sans-serif;font-size:11px;font-weight:700;
              text-transform:uppercase;letter-spacing:0.1em;color:var(--textLt);}
        /* Hint / help text below fields \u2014 intentionally 11px */
        .hint{font-family:Inter,sans-serif;font-size:11px;color:var(--textLt);}

        /* Table header cells \u2014 standardized */
        .th  {font-family:Inter,sans-serif;font-size:11px;font-weight:700;
              text-transform:uppercase;letter-spacing:0.08em;color:#fff;padding:10px 14px;}
        /* Standard data table body cell */
        .td  {font-family:Inter,sans-serif;font-size:13px;color:var(--text);padding:9px 14px;}
        /* Mono table body cell (amounts) */
        .tdm {font-family:'IBM Plex Mono',monospace;font-size:13px;padding:9px 14px;text-align:right;}
        .reg-table tr:hover td span[style*="opacity:0"]{opacity:1!important;}
        /* \u2500\u2500 Budget Monthly grid columns \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
           Desktop: fixed layout + explicit widths so columns never shift
           between months. Mobile overrides live in the \u2264480px block below. */
        .budget-monthly-table{table-layout:fixed;}
        .budget-monthly-table .budget-col-day{width:38px;}
        .budget-monthly-table .budget-col-desc{width:auto;max-width:0;}
        .budget-monthly-table .budget-col-category{width:120px;}
        .budget-monthly-table .budget-col-income{width:105px;}
        .budget-monthly-table .budget-col-expense{width:105px;}
        .budget-monthly-table .budget-col-balance{width:120px;}
        @media(max-width:700px){span[style*="opacity:0"]{opacity:1!important;}}
        @keyframes slideUp{from{transform:translate(-50%,20px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
        @media(max-width:768px){
          .search-box input{width:100%!important;flex:1;}
          /* Hide header search on mobile \u2014 saves space for essential controls */
          .header-search{display:none!important;}
          /* Hide year pills on mobile \u2014 managed in Settings */
          .year-pills-mobile{display:none!important;}
        }
        @media(max-width:768px){.help-btn{display:none!important;}}
        @media print{[data-noprint]{display:none!important;}body{background:#fff!important;}.content-area{padding:0!important;}}

        /* \u2500\u2500 Mobile layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        @media(max-width:768px){
          /* Prevent iOS/Android auto-zoom on input focus (fires when font-size < 16px).
             Targets the entry/CSV form panels and search boxes. Narrow tabular inputs
             (monthly-amounts grid, budget targets) keep their compact size. */
          .fab-panel input:not([type=checkbox]), .fab-panel select,
          .search-box input, .header-search input { font-size: 16px !important; }
          /* Bottom-sheet modals \u2014 slide up from bottom edge, flush with it
             (the desktop overlay padding left a floating 16px gap under the
             sheet's straight bottom corners) */
          .modal-overlay{align-items:flex-end!important;padding:0!important;}
          .modal-card{
            border-radius:20px 20px 0 0!important;
            width:100%!important;max-width:100%!important;
            padding-bottom:calc(24px + env(safe-area-inset-bottom))!important;
            max-height:92vh!important;overflow-y:auto!important;
          }

          /* Entry form: stack 3-col row on tablet */
          .entry-form-row2{grid-template-columns:1fr!important;}
          /* Register: switch to cards on mobile \u2014 table hidden */
          .reg-cards{display:block!important;}
          /* Prevent focus zoom on Android/iOS: inputs must render \u226516px */
          input,select,textarea{font-size:16px!important;}
          .wm-arrow{width:44px!important;height:44px!important;line-height:42px!important;font-size:16px!important;}
          .reg-table-wrap{display:none!important;}
          /* Header: single fixed row \u2014 never wraps */
          .header-inner{flex-wrap:nowrap!important;height:56px!important;padding:0 12px!important;gap:8px;}
          .logo-area img{height:23px!important;}
          .year-pills{gap:3px!important;flex-wrap:wrap;}
          /* Tab bar: scrollable, no scrollbar visible */
          .tab-bar{gap:0!important;overflow-x:auto;-webkit-overflow-scrolling:touch;
            padding-bottom:0!important;scrollbar-width:none;}
          .tab-bar::-webkit-scrollbar{display:none;}
          .tab-bar button{padding:10px 10px!important;font-size:11px!important;white-space:nowrap;}
          /* Content padding */
          .content-area{padding:12px 8px!important;margin-top:0!important;}
          /* Kill any residual navy gap between tab-bar and content on mobile */
          .tab-bar-outer{padding-bottom:0!important;overflow:hidden!important;}
          /* KPI grids: 2-column on tablet/mobile */
          .kpi-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important;}
          .kpi-grid-4{grid-template-columns:repeat(2,1fr)!important;gap:8px!important;}
          /* Dashboard: charts stack, no overflow */
          .chart-grid{grid-template-columns:1fr!important;gap:10px!important;}
          /* Dashboard wrapper: no overflow */
          .dash-wrap{overflow:hidden!important;max-width:100%!important;}
          /* Month picker: tighter, arrows hidden (month pills are tappable) */
          .month-picker{gap:4px!important;flex-wrap:nowrap!important;overflow-x:auto!important;
            -webkit-overflow-scrolling:touch!important;scrollbar-width:none!important;
            padding-bottom:4px!important;margin-left:-6px!important;margin-right:-6px!important;
            padding-left:6px!important;padding-right:6px!important;}
          .month-picker::-webkit-scrollbar{display:none!important;}
          .glance-grid{gap:6px!important;}
          .bp-daily{display:none!important;}
          .ef-save-template{display:none!important;}
          .budget-subtab-pill .bp-label-full{display:none!important;}
          .budget-subtab-pill{width:40px!important;height:40px!important;padding:0!important;
            display:inline-flex!important;align-items:center!important;justify-content:center!important;
            flex-shrink:0!important;font-size:16px!important;}
          .budget-subtabs{margin-left:-4px!important;margin-right:-4px!important;padding-left:4px!important;padding-right:4px!important;}
          .year-openbal{flex-basis:100%!important;order:5;}
          .year-openbal input{flex:1 1 auto!important;width:auto!important;}
          .glance-grid [style*="IBM Plex Mono"]{font-size:14px!important;}
          /* Month pills: the strip scrolls horizontally, so pills can afford a
             real touch height (the old 4×6px padding made ~17px-tall targets) */
          .month-picker button{padding:9px 10px!important;font-size:11px!important;}
          .month-nav-arrow{display:none!important;}
          .month-today-pill{display:none!important;}
          /* Budget monthly table: hide category */
          .budget-col-cat{display:none!important;}
          /* Forecast table: hide category, tighten padding */
          .forecast-table td,.forecast-table th{padding:7px 8px!important;font-size:11px!important;}
          .forecast-col-cat{display:none!important;}
          .forecast-desc-cell{max-width:180px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;}
          /* Daily view: hide category label, shrink balance column */
          .daily-card{grid-template-columns:44px 1fr 88px!important;}
          .daily-cat{display:none!important;}
          /* Register: keep all columns, scroll horizontally */
          .reg-table{font-size:12px!important;}
          .reg-table td,.reg-table th{padding:8px 10px!important;}
          /* Action buttons: always visible, touch-friendly */
          .reg-actions{white-space:nowrap;}
          .reg-actions div{display:flex!important;gap:4px!important;}
          .reg-actions button{padding:6px 8px!important;font-size:12px!important;}
          /* Monthly amounts: 3 columns on mobile instead of 12 */
          .monthly-amounts-grid{grid-template-columns:repeat(3,1fr)!important;}
          /* FAB quick-add panel: near full-width, clear of the FAB close button
             (84px used to half-cover the 52px FAB above the bottom nav; the old
             rule also misspelled max-height so 78vh never applied) */
          .fab-panel{left:12px!important;right:12px!important;
            bottom:calc(128px + env(safe-area-inset-bottom))!important;
            width:auto!important;padding:16px!important;max-height:70vh!important;}
          /* Budget: hide daily toggle, add button; show mobile-only label */
          /* Register: hide add/import buttons \u2014 FAB handles these on mobile */
        }
        @media(max-width:480px){
          /* Phones (S25 Ultra ~480px CSS viewport): tightest layout */
          .kpi-grid{grid-template-columns:1fr 1fr!important;gap:6px!important;}
          .kpi-grid-4{grid-template-columns:1fr 1fr!important;gap:6px!important;}
          .monthly-amounts-grid{grid-template-columns:repeat(2,1fr)!important;}
          .month-picker button{padding:9px 10px!important;font-size:11px!important;}
          /* Hide \u2039 \u203A arrows on mobile \u2014 month buttons are tappable directly */
          .month-nav-arrow{display:none!important;}
          .month-today-pill{display:none!important;}
          .daily-card{grid-template-columns:36px 1fr 76px!important;}
          .daily-balance{min-width:72px!important;}
          .content-area{padding:10px 6px!important;margin-top:0!important;}
          .tab-bar-outer{padding-left:8px!important;padding-right:8px!important;padding-bottom:0!important;overflow:hidden!important;}
          .tab-bar{margin:0!important;padding:0!important;}
          .tab-bar button{padding:10px 8px!important;font-size:10px!important;}
          /* Cards: tighter padding on phone */
          [style*="padding:"20px 24px""]{padding:14px 12px!important;}
          /* Budget: description cell \u2014 ellipsis on overflow, no wrap */
          .budget-desc-cell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:none;}
          /* Budget Monthly grid on phone: keep every column (Category, Income, Expense,
             Balance) visible \u2014 matching Entries \u2014 by giving the table real intrinsic width
             so the .hscroll wrapper's overflow-x:auto produces a genuine horizontal swipe,
             the same way it always worked before. Nothing is hidden; Description gets a
             sensible minimum width instead of being crushed to nothing. */
          .budget-monthly-table{table-layout:fixed;min-width:640px!important;}
          .budget-monthly-table .budget-col-checkbox{width:26px!important;}
          .budget-monthly-table .budget-col-day{width:26px!important;}
          .budget-monthly-table .budget-col-desc{width:150px!important;max-width:150px!important;}
          /* Category is hidden at the 768px breakpoint above; bring it back here
             so the phone layout actually has all 7 columns the min-width assumes —
             otherwise the table is left with ~170px of unlabeled blank space. */
          .budget-monthly-table .budget-col-cat{display:table-cell!important;}
          .budget-monthly-table .budget-col-category{width:90px!important;}
          .budget-monthly-table .budget-col-income{width:85px!important;}
          .budget-monthly-table .budget-col-expense{width:85px!important;}
          .budget-monthly-table .budget-col-balance{width:95px!important;}
          /* BvA row \u2014 keep chip + amounts on one line on mobile */
          .bva-row{flex-wrap:nowrap!important;}
          .bva-amounts{flex-wrap:nowrap!important;}
          /* Hide / $target on mobile \u2014 it's already visible in the input field */
          .bva-target{display:none!important;}
          /* Forecast: description cell \u2014 truncate on mobile */
          .forecast-desc-cell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px!important;}
          /* Register filters: stack on phone */
          .reg-col-cat,.reg-col-sched,.reg-col-until,.reg-col-notes{display:none!important;}
          /* Register filter row: stack on phone */
          .reg-filter-row{flex-wrap:wrap!important;gap:6px!important;}
          /* Forecast confidence column: hide on phone to save width */
          .forecast-conf-col{display:none!important;}
        }


        /* \u2500\u2500 Bottom-sheet modals on mobile \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        @keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .modal-card{background:var(--bgCard);border-radius:14px;box-shadow:var(--shadowXl);animation:slideUp 0.2s ease-out;}

        /* \u2500\u2500 Two-column dashboard at \u22651400px \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        @media(min-width:1400px){
          .content-area{max-width:1400px!important;padding:28px 40px!important;}
        }

        /* \u2500\u2500 Register table: card view on mobile \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        /* Register: table on desktop, cards on mobile */
        .reg-cards{display:none;}
        /* Budget sub-tab labels: full text on desktop; icon-only, uniform size on mobile */
        /* \u2500\u2500 Unified scroll utility \u2014 every grid scrolls like the register \u2500\u2500
           hidden scrollbar (all engines) + vertical scrollport + horizontal overflow;
           direct-child thead cells stick to the top while scrolling. */
        .hscroll{display:block;max-height:72vh;overflow-y:auto;overflow-x:auto;
          scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}
        .hscroll::-webkit-scrollbar{display:none;}
        .hscroll>table>thead>tr>th{position:sticky;top:0;z-index:5;background:var(--navy);}
        /* Stripe-headed tables (e.g. income sources) keep their stripe when sticky */
        .hscroll>table>thead>tr[data-stripe="1"]>th{background:var(--stripe);}
        /* Register wrap is now just an alias of the shared utility */
        .reg-table-wrap{display:block;max-height:72vh;overflow-y:auto;overflow-x:auto;
          scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}
        .reg-table-wrap::-webkit-scrollbar{display:none;}
        .reg-table thead .reg-th{position:sticky;top:0;z-index:5;}
        .reg-table{width:100%;border-collapse:collapse;min-width:540px;}
        /* Register desc: fill available space, truncate */
        .reg-desc-cell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;padding:10px 12px;width:40%;min-width:120px;}
        /* Budget totals row sticky */
        .budget-totals-row{box-shadow:0 -2px 8px rgba(0,0,0,0.12);background:var(--navy);position:sticky;bottom:0;}

        /* \u2500\u2500 44px minimum tap targets \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        .reg-actions button{min-height:36px;min-width:36px;}

        /* AI report: two-column card grid on wide screens */
        .ai-report-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
        @media(max-width:900px){.ai-report-grid{grid-template-columns:1fr;}}

        /* Keyboard shortcut hint in search placeholder */
        #global-search::placeholder{color:var(--textLt);}


`;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function compressReceiptImage(file, cb) {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 800 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      const b64 = cv.toDataURL("image/jpeg", 0.6);
      if (b64.length > 3e5) {
        toast("Image too large even after compression \u2014 try a smaller photo.", "error");
        cb(null);
        return;
      }
      cb(b64);
    };
    img.onerror = () => {
      toast("Could not read that image \u2014 try a different photo.", "error");
      cb(null);
    };
    img.src = URL.createObjectURL(file);
  }
  // Receipts are strictly per-occurrence. Legacy data (old backups, old
  // localStorage) may still carry an entry-level `attachment`; this moves each
  // one onto the entry's start-date occurrence so the image survives.
  function moveEntryAttachmentsToOverrides(entries, overridesByYr) {
    let moved = 0;
    const ovs = {};
    Object.keys(overridesByYr || {}).forEach((y) => {
      ovs[y] = __spreadValues({}, overridesByYr[y] || {});
    });
    const cleaned = (entries || []).map((e) => {
      if (!e || !e.attachment) return e;
      const d = parseDate(e.startDate);
      if (d && !isNaN(d)) {
        const year = d.getFullYear();
        const occId = `${e.id}-${year}-${d.getMonth()}-${d.getDate()}`;
        ovs[year] = ovs[year] || {};
        const existing = ovs[year][occId] || {};
        if (existing.attachment === void 0) {
          ovs[year][occId] = __spreadProps(__spreadValues({}, existing), { attachment: e.attachment });
        }
      }
      moved++;
      const copy = __spreadValues({}, e);
      delete copy.attachment;
      return copy;
    });
    return { entries: cleaned, overridesByYr: ovs, moved };
  }
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DEFAULT_CATEGORIES = [
    "Income",
    "Housing",
    "Insurance",
    "Transportation",
    "Food",
    "Utilities",
    "Subscriptions",
    "Debt / Credit",
    "Savings / RRSP",
    "Medical",
    "Education",
    "Personal",
    "Farm / Animals",
    "Gifts / Events",
    "Other"
  ];
  // Validated categorical palette (OKLab lightness band, chroma floor, adjacent
  // CVD separation, 3:1 contrast on white — all pass). The old set had three
  // near-identical greens and two colors that read as gray. Hue families kept.
  const DEFAULT_CATEGORY_COLORS = {
    "Income": "#217F4C",
    "Housing": "#2F6FB8",
    "Insurance": "#5E70C4",
    "Transportation": "#C06722",
    "Food": "#6B8E23",
    "Utilities": "#0E9483",
    "Subscriptions": "#7E3FBF",
    "Debt / Credit": "#B03A30",
    "Savings / RRSP": "#1189B5",
    "Medical": "#A8309F",
    "Education": "#4348B8",
    "Personal": "#C22F6E",
    "Farm / Animals": "#96551C",
    "Gifts / Events": "#8E4585",
    "Other": "#8F8A26"
  };
  const DEFAULT_REG_COLS = ["desc", "type", "amount", "startDate", "schedule", "until", "category", "notes"];
  const DEFAULT_BUDGET_COLS = ["desc", "category", "income", "expense", "balance"];
  const BUDGET_COL_LABELS = { desc: "Description", category: "Category", income: "Income", expense: "Expense", balance: "Balance" };
  const REG_COL_LABELS = {
    desc: "Description",
    type: "Type",
    amount: "Amount",
    startDate: "Date",
    schedule: "Schedule",
    until: "Until",
    category: "Category",
    notes: "Notes",
    actions: ""
  };
  const roundMoney = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  // One negative-number convention app-wide: a minus sign, never parentheses
  // (parens + red was double-encoding, and mixed with signed amounts elsewhere).
  const fmt = (n, showSign = false) => {
    if (n === void 0 || n === null || isNaN(n)) return "\u2014";
    const abs = Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n < 0) return `-$${abs}`;
    if (showSign && n > 0) return `+$${abs}`;
    return `$${abs}`;
  };
  const fmtAxisK = (v) => (v < 0 ? "-$" : "$") + (Math.abs(v) / 1e3).toFixed(0) + "k";
  const isLeapYear = (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const daysInMonth = (m, y) => MONTH_DAYS[m] + (m === 1 && isLeapYear(y) ? 1 : 0);
  function parseDate(str) {
    if (!str) return null;
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function humanShortDate(str) {
    const d = parseDate(str);
    if (!d || isNaN(d)) return str;
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }
  const ROUTE_TABS = ["dashboard", "budget", "plan", "ai", "settings", "alerts"];
  const ROUTE_BUDGET_SUBS = ["monthly", "daily", "bva", "forecast", "entries"];
  function parseTabHash() {
    let raw = "";
    try {
      raw = (location.hash || "").replace(/^#\/?/, "");
    } catch (e) {
    }
    const [t, s] = raw.split("/");
    return {
      tab: ROUTE_TABS.includes(t) ? t : null,
      budgetSub: ROUTE_BUDGET_SUBS.includes(s) ? s : null
    };
  }
  function todayStr() {
    const t = /* @__PURE__ */ new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }
  function localDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function isArchived(e, year) {
    const yr = year || (/* @__PURE__ */ new Date()).getFullYear();
    const yearStart = `${yr}-01-01`;
    const yearEnd = `${yr}-12-31`;
    if (!e.repeats) {
      return e.startDate < yearStart || e.startDate > yearEnd;
    }
    if (e.startDate > yearEnd) return true;
    if (!e.recurEnd) return false;
    return e.recurEnd < yearStart;
  }
  function downloadCSV(filename, rows, headers) {
    const esc = (v) => {
      const s = v === null || v === void 0 ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function printView(title) {
    const prev = document.title;
    document.title = title;
    window.print();
    document.title = prev;
  }
  const ExportBar = ({ onCSV, onPrint, style = {} }) => /* @__PURE__ */ React.createElement("div", { "data-noprint": true, style: __spreadValues({ display: "flex", gap: 6 }, style) }, onCSV && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onCSV,
      title: "Export to CSV",
      className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "4px 12px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }
    },
    /* @__PURE__ */ React.createElement(Icon, { name: "download", size: 12 }),
    "CSV"
  ), onPrint && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onPrint,
      title: "Print / Save as PDF",
      className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "4px 12px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }
    },
    /* @__PURE__ */ React.createElement(Icon, { name: "printer", size: 12 }),
    "PDF"
  ));
  function expandEntries(entries, year, overrides = {}) {
    const events = [];
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    entries.forEach((e) => {
      const startD = parseDate(e.startDate) || new Date(year, 0, 1);
      const endD = e.repeats ? e.recurEnd ? parseDate(e.recurEnd) : new Date(9999, 11, 31) : startD;
      const every = Math.max(1, e.recurEvery || 1);
      const unit = e.recurUnit || "month";
      const wdays = e.recurDays || [];
      if (startD > yearEnd || endD < yearStart) return;
      const amtForMonth = (m) => {
        var _a;
        return ((_a = e.monthlyAmounts) == null ? void 0 : _a[m]) !== void 0 ? e.monthlyAmounts[m] : e.amount;
      };
      const addEv = (date) => {
        if (date.getFullYear() !== year) return;
        if (date < startD || date > endD) return;
        const m = date.getMonth(), d = date.getDate();
        const eid = `${e.id}-${year}-${m}-${d}`;
        const ov = overrides[eid] || {};
        const effM = ov.month !== void 0 ? Math.min(Math.max(0, ov.month), 11) : m;
        const effD = Math.min(Math.max(1, ov.day !== void 0 ? ov.day : d), daysInMonth(effM, year));
        const effDate = effM !== m || effD !== d ? new Date(year, effM, effD) : date;
        events.push({
          id: eid,
          entryId: e.id,
          desc: ov.desc !== void 0 ? ov.desc : e.desc,
          type: e.type,
          amount: ov.amount !== void 0 ? ov.amount : amtForMonth(m),
          category: e.category,
          notes: ov.notes !== void 0 ? ov.notes : e.notes || "",
          attachment: ov.attachment !== void 0 ? ov.attachment : null,
          isOverride: Object.keys(ov).length > 0,
          month: effM,
          day: effD,
          date: effDate,
          // Recurrence metadata — needed for monthly-equivalent calculations
          recurUnit: e.recurUnit || "month",
          recurEvery: e.recurEvery || 1,
          repeats: e.repeats || false
        });
      };
      if (!e.repeats) {
        addEv(new Date(startD));
        return;
      }
      if (unit === "semimonth") {
        const anchor = startD.getDate();
        const second = anchor <= 14 ? anchor + 14 : anchor - 14;
        for (let mi = 0; mi < 12; mi++) {
          const d1 = Math.min(anchor, daysInMonth(mi, year));
          const d2 = Math.min(second, daysInMonth(mi, year));
          addEv(new Date(year, mi, d1));
          addEv(new Date(year, mi, d2));
        }
      } else if (unit === "day") {
        let cur = new Date(startD);
        while (cur < yearStart) cur.setDate(cur.getDate() + every);
        cur.setDate(cur.getDate() - every);
        while (cur <= yearEnd) {
          if (cur >= yearStart) addEv(new Date(cur));
          cur.setDate(cur.getDate() + every);
        }
      } else if (unit === "week") {
        let cur = new Date(startD);
        while (cur < yearStart) cur.setDate(cur.getDate() + every * 7);
        cur.setDate(cur.getDate() - every * 7);
        while (cur <= yearEnd) {
          if (cur >= yearStart) {
            if (every === 1 && wdays.length > 1) {
              for (const wd of wdays) {
                const diff = (wd - cur.getDay() + 7) % 7;
                const c2 = new Date(cur);
                c2.setDate(c2.getDate() + diff);
                addEv(c2);
              }
            } else addEv(new Date(cur));
          }
          cur.setDate(cur.getDate() + every * 7);
        }
      } else if (unit === "month") {
        const anchorDay = startD.getDate();
        for (let mi = 0; mi < 12; mi++) {
          const startMi = startD.getFullYear() < year ? 0 : startD.getFullYear() === year ? startD.getMonth() : 999;
          if (mi < startMi) continue;
          const totalMo = (year - startD.getFullYear()) * 12 + mi - startD.getMonth();
          if (totalMo < 0 || totalMo % every !== 0) continue;
          addEv(new Date(year, mi, Math.min(anchorDay, daysInMonth(mi, year))));
        }
      } else if (unit === "year") {
        const sy = startD.getFullYear();
        if (year >= sy && (year - sy) % every === 0) {
          const mi = startD.getMonth();
          addEv(new Date(year, mi, Math.min(startD.getDate(), daysInMonth(mi, year))));
        }
      }
    });
    events.sort((a, b) => {
      const d = a.date - b.date;
      if (d !== 0) return d;
      if (a.type === "income" && b.type !== "income") return -1;
      if (b.type === "income" && a.type !== "income") return 1;
      return 0;
    });
    return events;
  }
  function computeFlow(events, openBal) {
    let bal = openBal;
    return events.map((ev) => {
      bal += ev.type === "income" ? ev.amount : -ev.amount;
      return __spreadProps(__spreadValues({}, ev), { balance: Math.round(bal * 100) / 100 });
    });
  }
  function getMonthSummaries(flow, openBal) {
    return MONTHS.map((m, i) => {
      const evs = flow.filter((ev) => ev.month === i);
      const prev = flow.filter((ev) => ev.month < i);
      const open = prev.length > 0 ? prev[prev.length - 1].balance : openBal;
      const income = evs.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const expense = evs.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      const close = evs.length > 0 ? evs[evs.length - 1].balance : open;
      return { month: m, monthIdx: i, income, expense, surplus: income - expense, open, close };
    });
  }
  function getCurrentBalance(flow, openBal, year) {
    const today = /* @__PURE__ */ new Date();
    if (today.getFullYear() < year) return openBal;
    if (today.getFullYear() > year) {
      return flow.length > 0 ? flow[flow.length - 1].balance : openBal;
    }
    const past = flow.filter((ev) => ev.date <= today);
    return past.length > 0 ? past[past.length - 1].balance : openBal;
  }
  function haptic() {
    try {
      navigator.vibrate && navigator.vibrate(8);
    } catch (err) {
    }
  }
  function fmtVarRange(monthlyAmounts) {
    try {
      const vals = (Array.isArray(monthlyAmounts) ? monthlyAmounts : Object.values(monthlyAmounts || {})).map(Number).filter((v) => !isNaN(v));
      if (!vals.length) return "Variable";
      const mn = Math.min(...vals), mx = Math.max(...vals);
      const k = (v) => v >= 1e3 ? "$" + (v / 1e3).toFixed(v % 1e3 === 0 ? 0 : 1) + "k" : "$" + Math.round(v);
      return mn === mx ? "\u2248 " + k(mn) : k(mn) + "\u2013" + k(mx);
    } catch (err) {
      return "Variable";
    }
  }
  function simulateDebtStrategy(debts, extra, order) {
    try {
      let ds = debts.filter((d2) => d2.bal > 0 && d2.pmt > 0).map((d2) => __spreadValues({}, d2));
      if (!ds.length) return null;
      const sortFn = order === "avalanche" ? (a, b) => b.rate - a.rate || a.bal - b.bal : (a, b) => a.bal - b.bal || b.rate - a.rate;
      let months = 0, totalInterest = 0;
      const payoffOrder = [];
      while (ds.length && months < 600) {
        months++;
        ds.forEach((d2) => {
          const i = d2.bal * (d2.rate / 100 / 12);
          d2.bal += i;
          totalInterest += i;
        });
        let freed = extra;
        ds.forEach((d2) => {
          const pay = Math.min(d2.pmt, d2.bal);
          d2.bal -= pay;
        });
        ds.sort(sortFn);
        if (ds[0] && freed > 0) {
          const pay = Math.min(freed, ds[0].bal);
          ds[0].bal -= pay;
        }
        ds = ds.filter((d2) => {
          if (d2.bal <= 5e-3) {
            payoffOrder.push(d2.label);
            extra += d2.pmt;
            return false;
          }
          return true;
        });
      }
      if (months >= 600) return null;
      const d = /* @__PURE__ */ new Date();
      d.setMonth(d.getMonth() + months);
      return {
        months,
        totalInterest: Math.round(totalInterest * 100) / 100,
        debtFreeDate: MONTHS[d.getMonth()] + " " + d.getFullYear(),
        payoffOrder
      };
    } catch (err) {
      return null;
    }
  }
  // One search predicate for every view: description, category, notes, and
  // amount (with >N / <N / exact operators). Empty query matches everything.
  function eventMatchesSearch(ev, q) {
    if (!q) return true;
    const amtMatch = matchesAmountQuery(q, ev.amount);
    if (amtMatch !== null) return amtMatch;
    return (ev.desc || "").toLowerCase().includes(q) || (ev.category || "").toLowerCase().includes(q) || (ev.notes || "").toLowerCase().includes(q);
  }
  function matchesAmountQuery(q, amount) {
    const s = (q || "").trim();
    if (/^>\s*[\d.]+$/.test(s)) return amount > parseFloat(s.slice(1));
    if (/^<\s*[\d.]+$/.test(s)) return amount < parseFloat(s.slice(1));
    if (/^[\d.]+$/.test(s)) {
      const n = parseFloat(s);
      return !isNaN(n) && (Math.abs(amount - n) < 5e-3 || String(amount).includes(s));
    }
    return null;
  }
  // Fallback palette for custom categories — same validated set, in an order
  // whose neighbours stay separable under CVD simulation.
  const CAT_PALETTE = [
    "#217F4C",
    "#2F6FB8",
    "#C06722",
    "#4348B8",
    "#0E9483",
    "#B03A30",
    "#1189B5",
    "#7E3FBF",
    "#6B8E23",
    "#C22F6E",
    "#5E70C4",
    "#96551C",
    "#A8309F",
    "#8F8A26",
    "#8E4585"
  ];
