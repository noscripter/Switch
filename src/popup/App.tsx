import React, { useEffect, useMemo, useState } from "react";
import { getManagement, getRuntimeOrigin, getRuntimeUrl } from "../shared/chrome";
import type { ExtensionInfo, IconInfo } from "../shared/types";

const NAME_LIMIT = 18;

const truncateName = (name: string) => {
  if (name.length > NAME_LIMIT) {
    return name.slice(0, NAME_LIMIT);
  }
  return name;
};

const getDisplayName = (extension: ExtensionInfo) => {
  return extension.shortName || extension.name || "Unknown";
};

const getIconUrl = (icons: IconInfo[] | undefined, runtimeOrigin: string | null) => {
  if (icons && icons[0] && icons[0].url) {
    const iconUrl = icons[0].url;
    if (iconUrl.startsWith("moz-extension://") && runtimeOrigin) {
      try {
        const iconOrigin = new URL(iconUrl).origin;
        if (iconOrigin !== runtimeOrigin) {
          return getRuntimeUrl("images/null.jpg");
        }
      } catch {
        return getRuntimeUrl("images/null.jpg");
      }
    }
    return iconUrl;
  }
  return getRuntimeUrl("images/null.jpg");
};

const escapeRegExp = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const renderHighlighted = (text: string, query: string) => {
  const trimmed = query.trim();
  if (!trimmed) {
    return text;
  }
  const regex = new RegExp(`(${escapeRegExp(trimmed)})`, "ig");
  const parts = text.split(regex);
  return parts.map((part, index) => {
    if (part.toLowerCase() === trimmed.toLowerCase()) {
      return (
        <span key={`${part}-${index}`} className="highlight">
          {part}
        </span>
      );
    }
    return part;
  });
};

const compareExtensions = (a: ExtensionInfo, b: ExtensionInfo) => {
  const enabledDiff = Number(b.enabled) - Number(a.enabled);
  if (enabledDiff !== 0) {
    return enabledDiff;
  }
  return getDisplayName(a).localeCompare(getDisplayName(b));
};

type AppProps = {
  managementOverride?: chrome.management.Static | null;
  initialExtensions?: ExtensionInfo[];
  disableAutoLoad?: boolean;
};

const App = ({ managementOverride, initialExtensions = [], disableAutoLoad = false }: AppProps) => {
  const management = managementOverride ?? getManagement();
  const [extensions, setExtensions] = useState<ExtensionInfo[]>(initialExtensions);
  const [loading, setLoading] = useState(!disableAutoLoad);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadExtensions = () => {
    if (!management) {
      setError("management api unavailable");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    management.getAll((items) => {
      setExtensions(items || []);
      setLoading(false);
      setQuery("");
    });
  };

  useEffect(() => {
    if (disableAutoLoad) {
      setLoading(false);
      return;
    }
    loadExtensions();
  }, [disableAutoLoad]);

  const enabledCount = useMemo(() => {
    return extensions.filter((extension) => extension.enabled).length;
  }, [extensions]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return [...extensions].sort(compareExtensions);
    }
    return extensions
      .filter((extension) =>
        getDisplayName(extension).toLowerCase().includes(keyword)
      )
      .sort(compareExtensions);
  }, [extensions, query]);

  const handleToggle = (extension: ExtensionInfo) => {
    if (!management) {
      return;
    }
    const nextEnabled = !extension.enabled;
    management.setEnabled(extension.id, nextEnabled, () => {
      setExtensions((prev) =>
        prev.map((item) =>
          item.id === extension.id ? { ...item, enabled: nextEnabled } : item
        )
      );
    });
  };

  const runtimeOrigin = getRuntimeOrigin();

  return (
    <>
      <div id="input-holder">
        <input
          id="search"
          type="text"
          placeholder={loading ? "Search.." : `Search ${extensions.length} extensions`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />
      </div>
      <div className="container">
        {loading ? <div className="loading">loading...</div> : null}
        {error ? <div className="loading">{error}</div> : null}
        {!loading && !error ? (
          <div className="summary">
            <span id="enabled">{enabledCount}</span>/<span id="total">{extensions.length}</span>
          </div>
        ) : null}
        {!loading && !error
          ? filtered.map((extension) => {
              const displayName = getDisplayName(extension);
              const shortenedName = truncateName(displayName);
              const iconUrl = getIconUrl(extension.icons, runtimeOrigin);
              const className = `${
                extension.enabled ? "shortNameChecked" : "shortName"
              } extNameSpan`;

              const label = (
                <span
                  className={className}
                  title={displayName}
                  id={`shortName${extension.id}`}
                >
                  {renderHighlighted(shortenedName, query)}@{extension.version}
                </span>
              );

              return (
                <div
                  key={extension.id}
                  className="extension"
                  data-extid={extension.id}
                  data-extname={displayName}
                  data-enabled={extension.enabled ? "true" : "false"}
                >
                  <input
                    type="checkbox"
                    className="isEnabled"
                    id={extension.id}
                    checked={extension.enabled}
                    onChange={() => handleToggle(extension)}
                  />
                  <img
                    className="icons"
                    id={`${displayName}_icon`}
                    src={iconUrl}
                    alt=""
                    onError={(event) => {
                      const target = event.currentTarget;
                      target.onerror = null;
                      target.src = getRuntimeUrl("images/null.jpg");
                    }}
                  />
                  {extension.homepageUrl ? (
                    <a className="link" href={extension.homepageUrl} target="_blank" rel="noreferrer">
                      {label}
                    </a>
                  ) : (
                    label
                  )}
                </div>
              );
            })
          : null}
      </div>
    </>
  );
};

export default App;
