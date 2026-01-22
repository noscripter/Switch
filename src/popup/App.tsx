import React, { useEffect, useMemo, useState } from "react";
import { getManagement, getRuntimeUrl } from "../shared/chrome";
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

const getIconUrl = (icons?: IconInfo[]) => {
  if (icons && icons[0] && icons[0].url) {
    return icons[0].url;
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

const App = () => {
  const management = getManagement();
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
  const [loading, setLoading] = useState(true);
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
    loadExtensions();
  }, []);

  const enabledCount = useMemo(() => {
    return extensions.filter((extension) => extension.enabled).length;
  }, [extensions]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return extensions;
    }
    return extensions.filter((extension) =>
      getDisplayName(extension).toLowerCase().includes(keyword)
    );
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
              const iconUrl = getIconUrl(extension.icons);
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
                  extId={extension.id}
                  extName={displayName}
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
