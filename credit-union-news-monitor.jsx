"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  ExternalLink,
  Calendar,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

/**
 * Canvas / in-browser note:
 * - This preview runs fully client-side.
 * - Browser CORS rules prevent reliably fetching and scraping many external sites directly.
 *
 * This version is wired to a BACKEND endpoint (server-side) that does the fetching/parsing.
 * Default endpoint: /api/scan
 *
 * Expected response schema:
 * {
 *   "mode": "live",
 *   "verifiedUrls": ["https://..."],
 *   "invalidUrls": ["https://..."],
 *   "findings": [
 *     {
 *       "title": "...",
 *       "url": "https://...",
 *       "snippet": "...",
 *       "matchedKeywords": ["..."],
 *       "date": "...",
 *       "source": "domain.com",
 *       "sourceUrl": "https://source-index-url",
 *       "verified": true
 *     }
 *   ]
 * }
 */

export default function CreditUnionNewsMonitor() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [lastSearchDate, setLastSearchDate] = useState(null);
  const [verificationStats, setVerificationStats] = useState(null);
  const [scanMode, setScanMode] = useState("all"); // 'all' or 'custom'
  const [customUrls, setCustomUrls] = useState("");
  const [parsedUrlCount, setParsedUrlCount] = useState(0);

  // Backend endpoint (server-side scanner). Change this if your API lives elsewhere.
  const [apiEndpoint, setApiEndpoint] = useState("/api/scan");
  const [apiMethod, setApiMethod] = useState("POST"); // POST recommended
  const [apiError, setApiError] = useState(null);
  const [runMode, setRunMode] = useState("demo"); // 'demo' or 'live'

  const keywords = useMemo(
    () => [
      "difference",
      "member-first",
      "members",
      "cooperative",
      "cooperative principles",
      "not-for-profit",
      "relief",
      "emergency support",
      "community impact",
      "community service",
      "data",
      "quantitative evidence",
      "safety net",
      "mission",
      "mission-driven",
      "financial hardship",
      "crisis",
      "financial counseling",
      "coaching",
      "special loan",
      "emergency loan",
      "zero interest",
      "fee waiver",
      "paycheck advance",
      "underserved",
      "underserved populations",
      "volunteer",
      "volunteerism",
    ],
    []
  );

  // Parse custom URLs from textarea
  const parseCustomUrls = (text) => {
    if (!text.trim()) return [];

    const urls = text
      .split(/[\n,\s]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)
      .filter((url) => {
        try {
          // Basic URL validation
          new URL(url);
          return url.startsWith("http://") || url.startsWith("https://");
        } catch {
          return false;
        }
      });

    return [...new Set(urls)];
  };

  const handleCustomUrlsChange = (e) => {
    const text = e.target.value;
    setCustomUrls(text);
    const parsed = parseCustomUrls(text);
    setParsedUrlCount(parsed.length);
  };

  const urls = useMemo(
    () => [
      // Credit Union Associations & Industry News
      "https://www.americascreditunions.org/news-media",
      "https://www.americascreditunions.org/press",
      "https://creditunions.com/the-member-story-project/",
      "https://callahan.com/member-story-project/",
      "https://creditunions.com/press/",
      "https://www.cuinsight.com/press-releases/",
      "https://cunef.org/news/",
      "https://www.ncua.gov/news/press-releases",
      "https://alcua.org/news/",
      "https://www.azcreditunions.org/news/",
      "https://www.ccul.org/news/",
      "https://www.ccua.org/news/",
      "https://cornerstoneleague.coop/news/",
      "https://www.culct.coop/news/",
      "https://www.culmd.org/news/",
      "https://www.culm.org/news/",
      "https://www.culmt.org/news/",
      "https://culo.org/news/",
      "https://www.pacreditunions.com/news/",
      "https://www.culsc.org/news/",
      "https://www.cul.org/news/",
      "https://www.fcua.org/news/",
      "https://www.gcua.org/news/",
      "https://www.icul.com/news/",
      "https://www.icul.org/news/",
      "https://www.iowacreditunions.com/news/",
      "https://www.kscu.net/news/",
      "https://www.kycul.org/news/",
      "https://www.lcul.com/news/",
      "https://www.mncun.org/news/",
      "https://www.mocu.org/news/",
      "https://www.mwcua.com/news/",
      "https://www.nvcua.org/news/",
      "https://www.njcul.org/news/",
      "https://www.nycua.org/news/",
      "https://www.nwcua.org/news/",
      "https://www.scua.org/news/",
      "https://www.theleague.coop/news",

      // Individual Credit Unions (sample subset kept; original list was very large)
      "https://www.becu.org/news",
      "https://www.bethpagefcu.com/about-us/newsroom/",
      "https://www.dcu.org/about/news.html",
      "https://www.navyfederal.org/about/press-releases.html",
      "https://www.penfed.org/about/press-releases",
      "https://www.suncoast.com/about/press-room",
      "https://www.uwcu.org/news/press/",
      "https://www.wpcu.coop/about/press-room",
    ],
    []
  );

  const extractDomain = (url) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const scanForKeywords = (text) => {
    const lowerText = String(text || "").toLowerCase();
    return keywords.filter((k) => lowerText.includes(String(k).toLowerCase()));
  };

  // --- Demo scan (client-only) ---
  const demoScan = async (urlsToCheck) => {
    const demoFindings = [];
    const now = new Date();

    const pick = (arr, n) => {
      const copy = [...arr];
      const out = [];
      while (copy.length && out.length < n) {
        const i = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(i, 1)[0]);
      }
      return out;
    };

    for (let i = 0; i < urlsToCheck.length; i++) {
      setProgress({ current: i + 1, total: urlsToCheck.length });
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 15));

      // Randomly decide if this URL has a "match" (demo)
      if (Math.random() < 0.08) {
        const matched = pick(keywords, 2 + Math.floor(Math.random() * 3));
        demoFindings.push({
          title: `Sample item mentioning: ${matched[0]}`,
          url: urlsToCheck[i],
          snippet: `Demo result generated for preview. In production, this snippet would be extracted from the page and would include terms such as “${matched.join(
            "\", \""
          )}”.`,
          matchedKeywords: matched,
          date: now.toLocaleDateString(),
          source: extractDomain(urlsToCheck[i]),
          sourceUrl: urlsToCheck[i],
          verified: true,
        });
      }
    }

    return {
      findings: demoFindings,
      verifiedUrls: urlsToCheck,
      invalidUrls: [],
      mode: "demo",
    };
  };

  // --- Live scan via backend endpoint ---
  const liveScan = async (urlsToCheck) => {
    const payload = {
      urls: urlsToCheck,
      keywords,
      // Optional knobs the backend may use (safe to ignore if unsupported)
      maxItemsPerSource: 10,
      timeoutMs: 15000,
    };

    let endpoint = apiEndpoint;

    // If using GET, encode a compact payload in the query string.
    // NOTE: URLs can get long quickly; GET is best only for small custom lists.
    if (apiMethod === "GET") {
      const qp = new URLSearchParams();
      urlsToCheck.forEach((u) => qp.append("url", u));
      keywords.forEach((k) => qp.append("kw", k));
      qp.set("maxItemsPerSource", String(payload.maxItemsPerSource));
      qp.set("timeoutMs", String(payload.timeoutMs));
      endpoint = `${apiEndpoint}${apiEndpoint.includes("?") ? "&" : "?"}${qp.toString()}`;
    }

    const res = await fetch(endpoint, {
      method: apiMethod,
      headers: apiMethod === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: apiMethod === "POST" ? JSON.stringify(payload) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Scan API error (${res.status}) using ${apiMethod} ${endpoint}: ${text || res.statusText}`
      );
    }

    const data = await res.json();

    // If the backend didn't compute matchedKeywords/snippets, do a light client-side pass.
    const enrichedFindings = (data.findings || []).map((f) => {
      const snippet = f.snippet || "";
      const matched = Array.isArray(f.matchedKeywords) && f.matchedKeywords.length
        ? f.matchedKeywords
        : scanForKeywords(`${f.title || ""} ${snippet}`);
      return { ...f, snippet, matchedKeywords: matched };
    });

    return {
      findings: enrichedFindings,
      verifiedUrls: data.verifiedUrls || [],
      invalidUrls: data.invalidUrls || [],
      mode: data.mode || "live",
    };
  };

  const scanWebsites = async () => {
    setLoading(true);
    setResults([]);
    setApiError(null);

    let urlsToScan;
    if (scanMode === "custom") {
      urlsToScan = parseCustomUrls(customUrls);
      if (urlsToScan.length === 0) {
        alert("Please enter at least one valid URL in the custom URL field.");
        setLoading(false);
        return;
      }
    } else {
      urlsToScan = urls;
    }

    setProgress({ current: 0, total: urlsToScan.length });

    try {
      // Progress is best reported by the backend; here we just show start/end.
      setProgress({ current: 1, total: urlsToScan.length });

      const { findings, verifiedUrls, invalidUrls, mode } =
        runMode === "live" ? await liveScan(urlsToScan) : await demoScan(urlsToScan);

      setVerificationStats({
        verified: verifiedUrls.length,
        invalid: invalidUrls.length,
        total: urlsToScan.length,
        verifiedUrls,
        invalidUrls,
        mode,
      });

      setResults(findings);
      setLastSearchDate(new Date().toLocaleString());
      setProgress({ current: urlsToScan.length, total: urlsToScan.length });
    } catch (err) {
      setApiError(err?.message || String(err));
      setVerificationStats(null);
      setResults([]);
      setLastSearchDate(new Date().toLocaleString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Search className="text-indigo-600" size={32} />
            Credit Union News Monitor
          </h1>
          <p className="text-gray-600 mb-3">
            {scanMode === "all"
              ? `Scanning ${urls.length} sources (DEMO scan in canvas)`
              : `Custom scan mode: ${parsedUrlCount} URL${parsedUrlCount !== 1 ? "s" : ""} detected (DEMO scan in canvas)`}
          </p>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5" size={18} />
              <div className="w-full">
                <div className="font-semibold">Run Mode</div>
                <div className="text-blue-800 mt-1">
                  <span className="font-medium">Demo</span> works in canvas instantly. <span className="font-medium">Live</span> calls a backend endpoint that fetches/parses sources server-side.
                </div>

                <div className="mt-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRunMode("demo")}
                      disabled={loading}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        runMode === "demo"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-blue-900 border-blue-200 hover:bg-blue-100"
                      } disabled:opacity-50`}
                    >
                      Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => setRunMode("live")}
                      disabled={loading}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        runMode === "live"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-blue-900 border-blue-200 hover:bg-blue-100"
                      } disabled:opacity-50`}
                    >
                      Live
                    </button>
                  </div>

                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                        Live API Endpoint
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-blue-800">Method:</span>
                        <select
                          value={apiMethod}
                          onChange={(e) => setApiMethod(e.target.value)}
                          disabled={loading || runMode !== "live"}
                          className="text-[11px] px-2 py-1 rounded border border-blue-200 bg-white disabled:opacity-50"
                        >
                          <option value="POST">POST</option>
                          <option value="GET">GET</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                        disabled={loading || runMode !== "live"}
                        className="w-full sm:flex-1 px-3 py-2 rounded-lg border border-blue-200 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                        placeholder="/api/scan or https://your-domain.com/api/scan"
                      />
                      <button
                        type="button"
                        onClick={() => setApiEndpoint("/api/scan")}
                        disabled={loading || runMode !== "live"}
                        className="px-3 py-2 rounded-lg border border-blue-200 bg-white text-blue-900 text-xs hover:bg-blue-100 disabled:opacity-50"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {apiError && (
                  <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs">
                    <div className="font-semibold">Scan error</div>
                    <div className="mt-1 font-mono whitespace-pre-wrap">{apiError}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scan Mode Toggle */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Scan Mode:</label>
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setScanMode("all")}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  scanMode === "all"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Scan All {urls.length} Sources
              </button>
              <button
                onClick={() => setScanMode("custom")}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  scanMode === "custom"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Custom URL List
              </button>
            </div>
          </div>

          {/* Custom URL Input */}
          {scanMode === "custom" && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Paste URLs (one per line, or comma/space separated):
              </label>
              <textarea
                value={customUrls}
                onChange={handleCustomUrlsChange}
                disabled={loading}
                placeholder={
                  "https://the-league.coop/news/\nhttps://www.californiascreditunions.org/press-releases/\nhttps://www.icul.com/press-releases"
                }
                className="w-full h-40 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {parsedUrlCount > 0 ? (
                    <span className="text-green-600 font-medium">
                      ✓ {parsedUrlCount} valid URL{parsedUrlCount !== 1 ? "s" : ""} detected
                    </span>
                  ) : (
                    <span className="text-gray-500">No URLs detected yet</span>
                  )}
                </p>
                <button
                  onClick={() => {
                    setCustomUrls("");
                    setParsedUrlCount(0);
                  }}
                  disabled={loading || !customUrls}
                  className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={scanWebsites}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Scanning... ({progress.current}/{progress.total})
                </>
              ) : (
                <>
                  <Search size={20} />
                  Scan for News
                </>
              )}
            </button>

            {lastSearchDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                Last scan: {lastSearchDate}
              </div>
            )}
          </div>

          {loading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Monitoring Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                Tracking Keywords:
              </h2>
              <div className="flex flex-wrap gap-2">
                {keywords.slice(0, 12).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                  +{keywords.length - 12} more
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertCircle size={20} className="text-blue-600" />
                {scanMode === "all"
                  ? `Monitoring ${urls.length} Sources`
                  : `Custom Mode: ${parsedUrlCount} Source${parsedUrlCount !== 1 ? "s" : ""}`}
              </h2>
              <p className="text-sm text-gray-600">
                {scanMode === "all"
                  ? "Includes associations, leagues, individual credit unions, and industry news sites"
                  : "Scanning your custom list of URLs"}
              </p>
              {verificationStats && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Last Scan Results:</p>
                  <p className="text-xs text-blue-700 mt-1">
                    ✓ {verificationStats.verified} URLs included
                  </p>
                  <p className="text-xs text-blue-700">✗ {verificationStats.invalid} URLs invalid</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Success rate: {(
                      (verificationStats.verified / verificationStats.total) *
                      100
                    ).toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-blue-700 mt-1">Mode: {verificationStats.mode}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-600" size={28} />
              Found {results.length} Relevant {results.length === 1 ? "Item" : "Items"}
            </h2>

            {results.map((article, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-all p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-xl font-semibold text-gray-800 flex-1">{article.title}</h3>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                    {article.source}
                  </span>
                </div>

                {article.date && (
                  <div className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                    <Calendar size={14} />
                    {article.date}
                  </div>
                )}

                {article.snippet && <p className="text-gray-600 mb-3">{article.snippet}</p>}

                {article.matchedKeywords && article.matchedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {article.matchedKeywords.map((kw, i) => (
                      <span key={i} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                        ✓ {kw}
                      </span>
                    ))}
                  </div>
                )}

                <a
                  href={article.url || article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 text-sm"
                >
                  Open source URL
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && lastSearchDate && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <XCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Matches Found</h3>
            <p className="text-gray-600">
              Demo scan produced zero matches. Try again; demo results are randomized.
            </p>
          </div>
        )}

        {!loading && !lastSearchDate && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Search className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Scan</h3>
            <p className="text-gray-600">
              {scanMode === "all"
                ? `Click “Scan for News” to demo-scan ${urls.length} sources`
                : scanMode === "custom" && parsedUrlCount > 0
                ? `Click “Scan for News” to demo-scan your ${parsedUrlCount} custom URL${
                    parsedUrlCount !== 1 ? "s" : ""
                  }`
                : "Paste URLs in custom mode, then click “Scan for News”"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
